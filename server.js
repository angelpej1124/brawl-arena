// =====================================================================
//  난투 아레나 서버 — 실행: node server.js
//  - public 폴더의 게임 화면을 웹사이트로 보여주고
//  - /api/... 로 회원가입·로그인·랭킹을 처리하고
//  - /ws 로 실시간 게임 연결을 받습니다.
// =====================================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleUpgrade } = require('./ws');
const { Sim, CONFIG, SKILL_IDS, BOT_NAMES, validSkill, cleanInput } = require('./game');
const accounts = require('./accounts');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};

// ---------- 간단한 요청 횟수 제한 (로그인 무차별 시도 방지) ----------
const hits = new Map();
function limited(ip, bucket, max, perMs) {
  const k = bucket + ':' + ip;
  const now = Date.now();
  let h = hits.get(k);
  if (!h || h.reset < now) { h = { n: 0, reset: now + perMs }; hits.set(k, h); }
  return ++h.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (h.reset < now) hits.delete(k); }, 60000).unref();
const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 4096) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
const bearer = (req) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

async function api(req, res, urlPath) {
  const ip = clientIp(req);
  try {
    if (req.method === 'POST' && urlPath === '/api/signup') {
      if (limited(ip, 'signup', 10, 3600000)) return sendJson(res, 429, { error: '가입 시도가 너무 많아요. 잠시 후 다시 해 주세요.' });
      const b = await readBody(req);
      return sendJson(res, 200, await accounts.signup(b.nick, b.pw));
    }
    if (req.method === 'POST' && urlPath === '/api/login') {
      if (limited(ip, 'login', 20, 600000)) return sendJson(res, 429, { error: '로그인 시도가 너무 많아요. 10분 뒤에 다시 해 주세요.' });
      const b = await readBody(req);
      return sendJson(res, 200, await accounts.login(b.nick, b.pw));
    }
    if (req.method === 'POST' && urlPath === '/api/logout') {
      accounts.logout(bearer(req));
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'GET' && urlPath === '/api/me') {
      const key = accounts.fromToken(bearer(req));
      if (!key) return sendJson(res, 401, { error: '로그인이 필요해요.' });
      return sendJson(res, 200, { profile: accounts.profileOf(key) });
    }
    if (req.method === 'POST' && urlPath === '/api/gacha') {
      const key = accounts.fromToken(bearer(req));
      if (!key) return sendJson(res, 401, { error: '로그인이 필요해요.' });
      if (limited(ip, 'gacha', 60, 60000)) return sendJson(res, 429, { error: '너무 빨리 뽑고 있어요. 잠시 후 다시 해 주세요.' });
      return sendJson(res, 200, accounts.gacha(key));
    }
    if (urlPath.startsWith('/api/admin/')) {
      const key = accounts.fromToken(bearer(req));
      if (!key || !accounts.isAdmin(key)) return sendJson(res, 403, { error: '관리자만 쓸 수 있어요.' });
      if (req.method === 'GET' && urlPath === '/api/admin/users') {
        const q = new URL(req.url, 'http://x').searchParams.get('q') || '';
        return sendJson(res, 200, { users: accounts.adminList(q) });
      }
      if (req.method === 'POST' && urlPath === '/api/admin/user') {
        const b = await readBody(req);
        const profile = accounts.adminUpdate(b.nick, { gems: b.gems, owned: b.owned });
        console.log(`[관리자] ${accounts.nickOf(key)} → ${profile.nick}: 보석 ${profile.gems}, 스킬 ${profile.owned.join(',')}`);
        // 접속 중이면 바로 알려줌
        for (const r of rooms.values()) for (const c of r.clients.values()) {
          if (c.accountKey && accounts.nickOf(c.accountKey) === profile.nick) c.socket.send(JSON.stringify({ t: 'profile', profile }));
        }
        return sendJson(res, 200, { profile });
      }
      return sendJson(res, 404, { error: '없는 주소예요.' });
    }
    if (req.method === 'GET' && urlPath === '/api/rooms') {
      return sendJson(res, 200, { rooms: publicRooms(), online: onlineCount() });
    }
    if (req.method === 'GET' && urlPath === '/api/ranking') {
      return sendJson(res, 200, { ranking: accounts.ranking(10), online: onlineCount() });
    }
    return sendJson(res, 404, { error: '없는 주소예요.' });
  } catch (e) {
    return sendJson(res, 400, { error: e.message || '요청을 처리하지 못했어요.' });
  }
}

// ---------- 웹사이트 ----------
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/health') { res.writeHead(200); return res.end('ok'); }
  if (urlPath.startsWith('/api/')) return api(req, res, urlPath);
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- 게임 방 ----------
const rooms = new Map();
let nextId = 1;
const onlineCount = () => [...rooms.values()].reduce((n, r) => n + r.clients.size, 0);

function cleanTitle(t) {
  return String(t || '').normalize('NFC')
    .replace(/[<>&"'\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .trim().slice(0, 20);
}
function newPublicCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code;
  do { code = 'pub-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

class GameRoom {
  constructor(code, { isPublic = false, title = '' } = {}) {
    this.name = code;
    this.isPublic = isPublic;
    this.title = title || code;
    this.createdAt = Date.now();
    this.sim = new Sim();
    this.clients = new Map(); // id -> { socket, accountKey, name } (들어온 순서대로 저장됨)
    this.hostId = null;       // 방장: 이 방에 가장 먼저 들어온 사람
    this.tickN = 0;
    this.sim.onEvent = (e) => { if (e.k === 'win') this.recordRound(); };
    this.timer = setInterval(() => this.step(), 1000 / CONFIG.TICK_RATE);
  }
  humans() { return this.clients.size; }
  isFull() { return this.clients.size >= CONFIG.MAX_PLAYERS; }
  step() {
    this.sim.tick(1 / CONFIG.TICK_RATE);
    if (++this.tickN % CONFIG.SEND_EVERY === 0) {
      const ss = this.sim.startStatus(this.hostId);
      const snap = { t: 's', host: this.hostId, rdy: [ss.ready, ss.need], ...this.sim.snapshot() };
      // 보이면 안 되는 정보는 서버에서 빼고 보냄 (화면을 조작해도 못 봄)
      //  - 기생 중인 몸: 모두에게 안 보임
      //  - 은신: 본인만 보임 (정지당하면 모두에게 반투명하게 드러남)
      const hideFor = (q, cid) => q.ins || (q.stl && !q.frz && q.id !== cid);
      const needCustom = snap.p.some((q) => q.ins || q.stl) || snap.ev.some((e) => e.only);
      if (!needCustom) {
        const msg = JSON.stringify(snap);
        for (const c of this.clients.values()) c.socket.send(msg);
        return;
      }
      const blank = { x: 0, y: 0, vx: 0, vy: 0, at: 0, ap: 0, hid: 1 };
      for (const [cid, c] of this.clients) {
        const hidden = new Set(snap.p.filter((q) => hideFor(q, cid)).map((q) => q.id));
        const view = {
          ...snap,
          p: snap.p.map((q) => (hidden.has(q.id) ? { ...q, ...blank } : q)),
          ev: snap.ev.filter((e) => !(e.only && e.only !== cid)
            && !(e.pid && hidden.has(e.pid) && e.pid !== cid)
            && !(e.pid2 && hidden.has(e.pid2) && e.pid2 !== cid)),
        };
        c.socket.send(JSON.stringify(view));
      }
    }
  }
  // 사람이 2명 이상 참가한 판만 서버가 직접 기록 (조작 불가)
  // 사람 2명 이상인 판은 전적에도 기록, 봇이랑만 한 판은 보석만 조금
  recordRound() {
    const parts = this.sim.list().filter((p) => p.inMatch && !p.bot);
    const counted = parts.length >= 2;
    for (const p of parts) {
      const c = this.clients.get(p.id);
      if (!c || !c.accountKey) continue;
      const r = accounts.record(c.accountKey, {
        counted, win: counted && (this.sim.teamMode ? !!this.sim.winTeam && p.team === this.sim.winTeam : p.id === this.sim.winnerId),
        kills: p.kos, botKills: p.botKos || 0,
      });
      if (r) c.socket.send(JSON.stringify({ t: 'profile', profile: r.profile, gained: r.gained }));
    }
  }
  join(id, socket, name, accountKey, skill) {
    if (this.isFull()) return false;
    if (this.sim.players.size >= CONFIG.MAX_PLAYERS) {
      const bot = this.sim.list().reverse().find((p) => p.bot);
      if (bot) this.sim.removePlayer(bot.id);
    }
    this.clients.set(id, { socket, accountKey, name });
    this.sim.addPlayer(id, name, false, skill);
    if (!this.hostId) this.hostId = id;
    if (this.sim.doubleMode) this.giveSkill2(id);
    return true;
  }
  // 더블 모드: 두 번째 스킬이 없는 사람에게 가진 스킬 중 하나를 넣어 줌
  giveSkill2(id) {
    const p = this.sim.players.get(id), c = this.clients.get(id);
    if (!p || !c || p.skill2) return;
    const owned = c.accountKey ? accounts.ownedOf(c.accountKey) : accounts.BASE_SKILLS;
    const k = owned.find((x) => x !== p.skill);
    if (k) this.sim.setSkill2(id, k);
  }
  leave(id) {
    this.clients.delete(id);
    this.sim.removePlayer(id);
    if (this.clients.size === 0) { clearInterval(this.timer); rooms.delete(this.name); return; }
    // 방장이 나가면 그다음으로 먼저 들어온 사람이 방장
    if (this.hostId === id) {
      this.hostId = this.clients.keys().next().value;
      this.sim.ev({ k: 'host', n: this.clients.get(this.hostId).name });
    }
  }
  bot(byId, add) {
    if (byId !== this.hostId) return; // 봇은 방장만
    if (add) {
      if (this.sim.players.size >= CONFIG.MAX_PLAYERS) return;
      const used = new Set(this.sim.list().map((p) => p.name));
      const name = BOT_NAMES.find((n) => !used.has(n)) || '봇';
      this.sim.addPlayer('bot' + nextId++, name, true, SKILL_IDS[Math.floor(Math.random() * SKILL_IDS.length)]);
    } else {
      const bot = this.sim.list().reverse().find((p) => p.bot);
      if (bot) this.sim.removePlayer(bot.id);
    }
  }
  summary() {
    const host = this.clients.get(this.hostId);
    return {
      code: this.name, title: this.title, players: this.humans(),
      bots: this.sim.list().filter((p) => p.bot).length, max: CONFIG.MAX_PLAYERS,
      phase: this.sim.phase, host: host ? host.name : '',
    };
  }
}

function publicRooms() {
  return [...rooms.values()].filter((r) => r.isPublic)
    .sort((a, b) => (a.isFull() - b.isFull()) || b.humans() - a.humans() || a.createdAt - b.createdAt)
    .slice(0, 30).map((r) => r.summary());
}

// ---------- 실시간 연결 ----------
server.on('upgrade', (req, sock) => {
  if (!req.url.startsWith('/ws')) return sock.destroy();
  handleUpgrade(req, sock, (socket) => {
    const id = 'p' + nextId++;
    let room = null;
    let msgCount = 0;
    const counter = setInterval(() => { msgCount = 0; }, 1000);
    const fail = (msg) => socket.send(JSON.stringify({ t: 'error', msg }));
    const notice = (msg) => socket.send(JSON.stringify({ t: 'notice', msg }));

    socket.on('message', (text) => {
      if (++msgCount > 120) return socket.close();
      let m;
      try { m = JSON.parse(text); } catch (e) { return; }
      if (!m || typeof m !== 'object') return;

      if (m.t === 'join' && !room) {
        const skill = validSkill(m.skill);
        let name, accountKey = null;
        if (m.token) {
          accountKey = accounts.fromToken(m.token);
          if (!accountKey) return fail('로그인이 만료됐어요. 다시 로그인해 주세요.');
          name = accounts.nickOf(accountKey);
          if (!accounts.owns(accountKey, skill)) return fail('아직 뽑지 않은 스킬이에요. 다른 스킬을 골라 주세요.');
          accounts.setSkill(accountKey, skill);
        } else {
          if (!accounts.BASE_SKILLS.includes(skill)) return fail('게스트는 둔화와 점멸만 쓸 수 있어요. 가입하고 보석으로 뽑아 보세요.');
          name = accounts.cleanNick(m.guest);
          if (name.length < 2) return fail('닉네임은 2~12자로 써 주세요.');
          if (accounts.isTaken(name)) return fail('가입된 닉네임이에요. 로그인하거나 다른 닉네임을 써 주세요.');
        }

        let r;
        if (m.mode === 'create') {
          // 공개 방 만들기
          const code = newPublicCode();
          r = new GameRoom(code, { isPublic: true, title: cleanTitle(m.title) || `${name}의 방` });
          rooms.set(code, r);
        } else if (m.mode === 'quick') {
          // 빠른 입장: 사람이 가장 많은 빈자리 공개 방, 없으면 새로 만들기
          r = [...rooms.values()].filter((x) => x.isPublic && !x.isFull())
            .sort((a, b) => b.humans() - a.humans() || a.createdAt - b.createdAt)[0];
          if (!r) {
            const code = newPublicCode();
            r = new GameRoom(code, { isPublic: true, title: `${name}의 방` });
            rooms.set(code, r);
          }
        } else {
          // 목록에서 고른 공개 방, 또는 초대 코드 방 (없으면 비공개 방으로 새로 만듦)
          const code = String(m.room || '').toLowerCase();
          if (!/^[a-z0-9][a-z0-9_.-]{0,19}$/.test(code)) return fail('초대 코드는 영어 소문자와 숫자로 써 주세요.');
          r = rooms.get(code);
          if (!r) {
            if (m.mode === 'listed') return fail('그 방은 방금 사라졌어요. 목록을 새로 보고 다른 방을 골라 주세요.');
            if (code.startsWith('pub-')) return fail('pub- 로 시작하는 코드는 쓸 수 없어요. 다른 초대 코드를 써 주세요.');
            r = new GameRoom(code, { isPublic: false });
            rooms.set(code, r);
          }
        }
        if (!r.join(id, socket, name, accountKey, skill)) {
          if (r.clients.size === 0) { clearInterval(r.timer); rooms.delete(r.name); }
          return fail('방이 가득 찼어요. 다른 방을 골라 주세요.');
        }
        room = r;
        socket.send(JSON.stringify({ t: 'welcome', id, room: r.name, title: r.title, isPublic: r.isPublic }));
      } else if (m.t === 'input' && room) {
        const p = room.sim.players.get(id);
        if (p) p.input = cleanInput(m);
      } else if (m.t === 'bot' && room) {
        room.bot(id, !!m.add);
      } else if (m.t === 'ready' && room) {
        room.sim.setReady(id, !!m.on);
      } else if (m.t === 'start' && room) {
        if (id !== room.hostId) return notice('게임은 방장만 시작할 수 있어요.');
        const st = room.sim.startStatus(id);
        if (room.sim.phase !== 'waiting') return;
        if (st.count < 2) return notice('2명 이상 있어야 해요. 봇을 추가하거나 친구를 기다려 주세요.');
        if (!st.teamsOk) return notice('팀 모드는 2팀 이상이어야 해요. 팀을 나눠 주세요.');
        if (!st.doubleOk) return notice('더블 모드: 두 번째 스킬이 없는 사람이 있어요. (게스트는 둔화·점멸 두 개를 같이 써요)');
        if (!st.ok) return notice(`아직 준비 안 한 사람이 있어요 (${st.ready}/${st.need})`);
        room.sim.checkStart();
      } else if (m.t === 'color' && room) {
        const err = room.sim.setColor(id, String(m.color || ''));
        if (err) notice(err);
      } else if (m.t === 'skill' && room) {
        const skill = validSkill(m.skill);
        const c = room.clients.get(id);
        if (c.accountKey ? !accounts.owns(c.accountKey, skill) : !accounts.BASE_SKILLS.includes(skill)) {
          return notice(c.accountKey ? '아직 뽑지 않은 스킬이에요.' : '게스트는 둔화와 점멸만 쓸 수 있어요.');
        }
        const err = room.sim.setSkill(id, skill);
        if (err) return notice(err);
        if (c.accountKey) accounts.setSkill(c.accountKey, skill);
      } else if (m.t === 'skill2' && room) {
        const skill = validSkill(m.skill);
        const c = room.clients.get(id);
        if (c.accountKey ? !accounts.owns(c.accountKey, skill) : !accounts.BASE_SKILLS.includes(skill)) {
          return notice(c.accountKey ? '아직 뽑지 않은 스킬이에요.' : '게스트는 둔화와 점멸만 쓸 수 있어요.');
        }
        const err = room.sim.setSkill2(id, skill);
        if (err) return notice(err);
      } else if (m.t === 'mode' && room) {
        if (id !== room.hostId) return notice('모드는 방장만 바꿀 수 있어요.');
        const err = room.sim.setMode(!!m.team, !!m.dbl);
        if (err) return notice(err);
        if (room.sim.doubleMode) for (const cid of room.clients.keys()) room.giveSkill2(cid);
      } else if (m.t === 'team' && room) {
        if (id !== room.hostId) return notice('팀은 방장만 정할 수 있어요.');
        room.sim.setTeam(String(m.id || ''), m.team);
      } else if (m.t === 'ping') {
        socket.send(JSON.stringify({ t: 'pong', c: m.c }));
      }
    });

    socket.on('close', () => {
      clearInterval(counter);
      if (room) room.leave(id);
    });
  });
});

accounts.init().then(() => {
  server.listen(PORT, () => {
    console.log(`난투 아레나 서버 실행 중!  http://localhost:${PORT}`);
    console.log(`계정 저장 위치: ${accounts.storage()}`);
  });
});
