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
const { Sim, CONFIG, BOT_NAMES, validSkill, cleanInput } = require('./game');
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

class GameRoom {
  constructor(name) {
    this.name = name;
    this.sim = new Sim();
    this.clients = new Map(); // id -> { socket, accountKey }
    this.tickN = 0;
    this.sim.onEvent = (e) => { if (e.k === 'win') this.recordRound(); };
    this.timer = setInterval(() => this.step(), 1000 / CONFIG.TICK_RATE);
  }
  step() {
    this.sim.tick(1 / CONFIG.TICK_RATE);
    if (++this.tickN % CONFIG.SEND_EVERY === 0) {
      const msg = JSON.stringify({ t: 's', ...this.sim.snapshot() });
      for (const c of this.clients.values()) c.socket.send(msg);
    }
  }
  // 사람이 2명 이상 참가한 판만 서버가 직접 기록 (조작 불가)
  recordRound() {
    const parts = this.sim.list().filter((p) => p.inMatch && !p.bot);
    if (parts.length < 2) return;
    for (const p of parts) {
      const c = this.clients.get(p.id);
      if (!c || !c.accountKey) continue;
      const profile = accounts.record(c.accountKey, { win: p.id === this.sim.winnerId, kos: p.kos });
      if (profile) c.socket.send(JSON.stringify({ t: 'profile', profile }));
    }
  }
  join(id, socket, name, accountKey, skill) {
    if (this.sim.players.size >= CONFIG.MAX_PLAYERS) {
      const bot = this.sim.list().reverse().find((p) => p.bot);
      if (!bot) return false;
      this.sim.removePlayer(bot.id);
    }
    this.clients.set(id, { socket, accountKey });
    this.sim.addPlayer(id, name, false, skill);
    return true;
  }
  leave(id) {
    this.clients.delete(id);
    this.sim.removePlayer(id);
    if (this.clients.size === 0) { clearInterval(this.timer); rooms.delete(this.name); }
  }
  bot(add) {
    if (add) {
      if (this.sim.players.size >= CONFIG.MAX_PLAYERS) return;
      const used = new Set(this.sim.list().map((p) => p.name));
      const name = BOT_NAMES.find((n) => !used.has(n)) || '봇';
      this.sim.addPlayer('bot' + nextId++, name, true, Math.random() < 0.5 ? 'slow' : 'blink');
    } else {
      const bot = this.sim.list().reverse().find((p) => p.bot);
      if (bot) this.sim.removePlayer(bot.id);
    }
  }
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

    socket.on('message', (text) => {
      if (++msgCount > 120) return socket.close();
      let m;
      try { m = JSON.parse(text); } catch (e) { return; }
      if (!m || typeof m !== 'object') return;

      if (m.t === 'join' && !room) {
        const code = String(m.room || 'lobby').toLowerCase();
        if (!/^[a-z0-9][a-z0-9_.-]{0,19}$/.test(code)) return fail('방 코드는 영어 소문자와 숫자로 써 주세요.');
        const skill = validSkill(m.skill);
        let name, accountKey = null;
        if (m.token) {
          accountKey = accounts.fromToken(m.token);
          if (!accountKey) return fail('로그인이 만료됐어요. 다시 로그인해 주세요.');
          name = accounts.nickOf(accountKey);
          accounts.setSkill(accountKey, skill);
        } else {
          name = accounts.cleanNick(m.guest);
          if (name.length < 2) return fail('닉네임은 2~12자로 써 주세요.');
          if (accounts.isTaken(name)) return fail('가입된 닉네임이에요. 로그인하거나 다른 닉네임을 써 주세요.');
        }
        if (!rooms.has(code)) rooms.set(code, new GameRoom(code));
        const r = rooms.get(code);
        if (!r.join(id, socket, name, accountKey, skill)) return fail('방이 가득 찼어요. 다른 방 코드를 써 주세요.');
        room = r;
        socket.send(JSON.stringify({ t: 'welcome', id, room: code }));
      } else if (m.t === 'input' && room) {
        const p = room.sim.players.get(id);
        if (p) p.input = cleanInput(m);
      } else if (m.t === 'bot' && room) {
        room.bot(!!m.add);
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
