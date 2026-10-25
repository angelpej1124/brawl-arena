// =====================================================================
//  럭키 체스 서버 — 실행: node chess/server.js
//  - 난투 아레나와 다른 주소(사이트)로 열리지만, 계정·보석은 난투 아레나 서버와 같이 씀
//      로그인·가입 → 난투 아레나 서버에 그대로 전달 (같은 닉네임·비밀번호로 양쪽 다 됨)
//      판이 끝나면 → 난투 아레나 서버에 결과를 보내서 보석 지급 (이기면 100, 지거나 비기면 20)
//  - 환경 변수
//      BRAWL_URL     난투 아레나 주소 (예: https://brawl-arena-uiea.onrender.com)
//      CHESS_SECRET  두 서버가 똑같이 가진 비밀 값 (보석 지급 요청이 진짜 체스 서버에서 온 건지 확인)
// =====================================================================
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleUpgrade } = require('../ws');
const R = require('./public/rules.js');

const PORT = process.env.PORT || 3100;
const BRAWL_URL = String(process.env.BRAWL_URL || 'http://localhost:3000').replace(/\/+$/, '');
const CHESS_SECRET = process.env.CHESS_SECRET || '';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};

const CONFIG = {
  MAX_MEMBERS: 12,            // 한 방에 들어올 수 있는 사람 (두는 사람 2 + 구경 10)
  TIME_OPTIONS: [3, 5, 10, 0], // 한 사람 시간 (분), 0 = 시간 제한 없음
  DEFAULT_TIME: 10,
  AWAY_MS: 60000,             // 게임 중 연결이 끊기면 이 시간 안에 돌아와야 함 (아니면 패배)
  MIN_PLIES_FOR_GEMS: 4,      // 둘 다 최소 2수씩 둬야 보석 지급 (바로 기권해서 보석 모으기 방지)
};

// ---------- 공통 ----------
const hits = new Map();
function limited(ip, bucket, max, perMs) {
  const k = bucket + ':' + ip, now = Date.now();
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
const clean = (s, n) => String(s || '').normalize('NFC')
  .replace(/[<>&"'\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').trim().slice(0, n);

// ---------- 난투 아레나 서버와 통신 ----------
// 무료 서버는 자고 있으면 깨어나는 데 1분쯤 걸려서 넉넉히 기다림
async function brawl(p, { method = 'GET', body, token, ip } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Chess-Key': CHESS_SECRET };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (ip) headers['X-Client-Ip'] = ip;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 90000);
  try {
    const r = await fetch(BRAWL_URL + p, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal });
    let json = {};
    try { json = await r.json(); } catch (_) {}
    return { status: r.status, json };
  } catch (e) {
    return { status: 503, json: { error: '계정 서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.' } };
  } finally { clearTimeout(t); }
}
// 누가 체스 사이트를 열면 난투 아레나 서버도 미리 깨워 둠 (로그인이 빨라지게)
let lastWake = 0;
function wakeBrawl() {
  if (Date.now() - lastWake < 5 * 60000) return;
  lastWake = Date.now();
  fetch(BRAWL_URL + '/health').catch(() => {});
}
// 로그인 토큰 → 계정 닉네임 (잠깐 기억해 둠)
const tokenCache = new Map();
async function profileFromToken(token) {
  const c = tokenCache.get(token);
  if (c && c.exp > Date.now()) return c.profile;
  const r = await brawl('/api/me', { token });
  if (r.status === 401) return null;
  if (r.status !== 200 || !r.json.profile) throw new Error(r.json.error || '계정 서버에 연결하지 못했어요.');
  tokenCache.set(token, { profile: r.json.profile, exp: Date.now() + 60000 });
  return r.json.profile;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of tokenCache) if (v.exp < now) tokenCache.delete(k); }, 60000).unref();

// ---------- 웹사이트 · API ----------
async function api(req, res, urlPath) {
  const ip = clientIp(req);
  if (req.method === 'POST' && (urlPath === '/api/signup' || urlPath === '/api/login')) {
    const signup = urlPath === '/api/signup';
    if (limited(ip, urlPath, signup ? 10 : 20, signup ? 3600000 : 600000)) return sendJson(res, 429, { error: '시도가 너무 많아요. 잠시 후 다시 해 주세요.' });
    const b = await readBody(req);
    const r = await brawl(urlPath, { method: 'POST', body: { nick: b.nick, pw: b.pw }, ip });
    return sendJson(res, r.status, r.json);
  }
  if (req.method === 'POST' && urlPath === '/api/logout') {
    const token = bearer(req);
    tokenCache.delete(token);
    brawl('/api/logout', { method: 'POST', token });
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'GET' && urlPath === '/api/me') {
    const r = await brawl('/api/me', { token: bearer(req) });
    return sendJson(res, r.status, r.json);
  }
  if (req.method === 'GET' && urlPath === '/api/ranking') {
    const r = await brawl('/api/chess/ranking');
    return sendJson(res, r.status, { ...r.json, online: onlineCount() });
  }
  if (req.method === 'GET' && urlPath === '/api/rooms') {
    wakeBrawl();
    return sendJson(res, 200, { rooms: publicRooms(), online: onlineCount(), brawl: BRAWL_URL });
  }
  return sendJson(res, 404, { error: '없는 주소예요.' });
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (urlPath === '/health') { res.writeHead(200); return res.end('ok'); }
  if (urlPath.startsWith('/api/')) return api(req, res, urlPath).catch((e) => sendJson(res, 400, { error: e.message || '요청을 처리하지 못했어요.' }));
  const file = path.normalize(path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- 체스 방 ----------
const rooms = new Map();
let nextId = 1;
const onlineCount = () => [...rooms.values()].reduce((n, r) => n + r.members.size, 0);
const REASON = {
  checkmate: '체크메이트', stalemate: '스테일메이트', material: '기물 부족', fifty: '50수 규칙',
  repetition: '같은 수 3번 반복', resign: '기권', timeout: '시간 초과', abandon: '나감', agreed: '서로 무승부 합의',
};

class ChessRoom {
  constructor(code, { isPublic = false, title = '' } = {}) {
    this.code = code;
    this.isPublic = isPublic;
    this.title = title || code;
    this.createdAt = Date.now();
    this.members = new Map();   // cid -> { socket, name, nick(계정이면 닉네임, 게스트면 null) } (들어온 순서)
    this.seats = [null, null];  // { cid, name, nick, ready, secret, away }
    this.host = null;
    this.time = CONFIG.DEFAULT_TIME;
    this.phase = 'waiting';
    this.game = null;           // { st, history, moves, last, color: [seat0색, seat1색], clock: {w,b}, turnAt, draw }
    this.result = null;         // 마지막 판 결과
    this.timer = setInterval(() => this.tick(), 250);
  }
  isFull() { return this.members.size >= CONFIG.MAX_MEMBERS; }
  seatOf(cid) { return this.seats.findIndex((s) => s && s.cid === cid); }
  seatByColor(c) { return this.game ? this.game.color.indexOf(c) : -1; }

  join(cid, socket, name, nick) {
    if (this.isFull()) return false;
    this.members.set(cid, { socket, name, nick });
    if (!this.host) this.host = cid;
    if (this.phase === 'waiting') this.sit(cid, true);
    this.event({ k: 'join', n: name });
    return true;
  }
  // 빈자리에 앉기 (같은 계정이 양쪽에 앉는 건 막음)
  sit(cid, quiet) {
    const m = this.members.get(cid);
    if (!m || this.phase !== 'waiting' || this.seatOf(cid) >= 0) return null;
    const i = this.seats.findIndex((s) => !s);
    if (i < 0) return quiet ? null : '빈자리가 없어요.';
    const o = this.seats[1 - i];
    if (m.nick && o && o.nick && o.nick.toLowerCase() === m.nick.toLowerCase()) return quiet ? null : '같은 계정으로 양쪽에 앉을 수 없어요.';
    this.seats[i] = { cid, name: m.name, nick: m.nick, ready: false, secret: crypto.randomBytes(12).toString('hex'), away: null };
    return null;
  }
  stand(cid) {
    const i = this.seatOf(cid);
    if (i < 0) return;
    if (this.phase === 'playing') return '게임 중에는 일어날 수 없어요. 기권을 눌러 주세요.';
    this.seats[i] = null;
    for (const s of this.seats) if (s) s.ready = false;
  }
  setReady(cid, on) {
    const i = this.seatOf(cid);
    if (i < 0 || this.phase !== 'waiting') return;
    this.seats[i].ready = !!on;
    if (this.seats[0] && this.seats[1] && this.seats[0].ready && this.seats[1].ready) this.start();
  }
  setTime(cid, min) {
    if (cid !== this.host) return '시간은 방장만 정할 수 있어요.';
    if (this.phase !== 'waiting') return '게임 중에는 시간을 바꿀 수 없어요.';
    if (!CONFIG.TIME_OPTIONS.includes(min)) return '고를 수 없는 시간이에요.';
    this.time = min;
    for (const s of this.seats) if (s) s.ready = false;
  }

  // 흑·백은 매 판 랜덤
  start() {
    const whiteSeat = crypto.randomInt(2);
    const color = whiteSeat === 0 ? ['w', 'b'] : ['b', 'w'];
    const st = R.initial();
    const ms = this.time * 60000;
    this.game = { st, history: [R.posKey(st)], moves: [], last: null, color, clock: { w: ms, b: ms }, turnAt: Date.now(), draw: null };
    this.phase = 'playing';
    this.result = null;
    for (const s of this.seats) s.ready = false;
    this.event({ k: 'start', w: this.seats[whiteSeat].name, b: this.seats[1 - whiteSeat].name });
  }
  // 지금 차례인 사람의 남은 시간
  left(c) {
    const g = this.game;
    if (!g || !this.time) return null;
    return g.clock[c] - (this.phase === 'playing' && g.st.turn === c ? Date.now() - g.turnAt : 0);
  }
  move(cid, from, to, promo) {
    const g = this.game, i = this.seatOf(cid);
    if (this.phase !== 'playing' || i < 0) return;
    if (g.color[i] !== g.st.turn) return '상대 차례예요.';
    if (![from, to].every((x) => Number.isInteger(x) && x >= 0 && x < 64)) return '잘못된 수예요.';
    const m = R.findMove(g.st, from, to, promo);
    if (!m) return '둘 수 없는 수예요.';
    const c = g.st.turn;
    if (this.time) {
      g.clock[c] -= Date.now() - g.turnAt;
      if (g.clock[c] <= 0) { g.clock[c] = 0; return this.flag(c); }
    }
    const sanTxt = R.san(g.st, m);
    g.st = R.apply(g.st, m);
    g.turnAt = Date.now();
    g.moves.push(sanTxt);
    g.last = { from: m.from, to: m.to };
    g.history.push(R.posKey(g.st));
    if (g.draw && g.draw !== c) g.draw = null;   // 상대가 무승부를 제안했는데 수를 두면 거절한 걸로
    const s = R.status(g.st, g.history);
    this.event({ k: 'move', san: sanTxt, cap: m.flag === 'c' || m.flag === 'e', chk: R.inCheck(g.st) });
    if (s.over) this.end(s.winner, s.reason);
  }
  flag(c) {
    // 시간이 끝났는데 상대가 체크메이트를 만들 기물이 없으면 무승부
    if (R.cannotMate(this.game.st.b, R.other(c))) this.end(null, 'timeout');
    else this.end(R.other(c), 'timeout');
  }
  resign(cid) {
    const i = this.seatOf(cid);
    if (this.phase !== 'playing' || i < 0) return;
    this.end(R.other(this.game.color[i]), 'resign');
  }
  drawAction(cid, act) {
    const g = this.game, i = this.seatOf(cid);
    if (this.phase !== 'playing' || i < 0) return;
    const c = g.color[i];
    if (act === 'offer') {
      if (g.draw === R.other(c)) return this.end(null, 'agreed');   // 서로 제안하면 바로 합의
      if (g.moves.length < 2) return '최소 한 수씩 둔 다음에 제안할 수 있어요.';
      g.draw = c;
      this.event({ k: 'drawoffer', n: this.seats[i].name });
    } else if (act === 'accept' && g.draw === R.other(c)) this.end(null, 'agreed');
    else if (act === 'decline' && g.draw === R.other(c)) { g.draw = null; this.event({ k: 'drawno', n: this.seats[i].name }); }
  }
  tick() {
    if (this.phase !== 'playing') return;
    const g = this.game;
    if (this.time && this.left(g.st.turn) <= 0) { g.clock[g.st.turn] = 0; this.flag(g.st.turn); return; }
    // 연결이 끊긴 채 오래 안 돌아오면 패배
    for (let i = 0; i < 2; i++) {
      const s = this.seats[i];
      if (s && s.away && Date.now() - s.away > CONFIG.AWAY_MS) return this.end(R.other(g.color[i]), 'abandon');
    }
  }
  end(winner, reason) {
    if (this.phase !== 'playing') return;
    const g = this.game;
    if (this.time) { g.clock[g.st.turn] = Math.max(0, this.left(g.st.turn)); }
    this.phase = 'waiting';
    g.draw = null;
    const enough = g.moves.length >= CONFIG.MIN_PLIES_FOR_GEMS;
    this.result = { winner, reason, text: REASON[reason] || reason, enough };
    this.event({ k: 'over', winner, reason });
    // 보석 지급 (계정이 있는 사람만)
    for (let i = 0; i < 2; i++) {
      const s = this.seats[i];
      if (!s || !s.nick) continue;
      const res = winner === null ? 'draw' : winner === g.color[i] ? 'win' : 'loss';
      if (!enough) { this.tell(s.cid, { t: 'gems', gained: 0, why: '너무 일찍 끝난 판은 보석을 받지 못해요 (둘 다 2수 이상 둬야 해요).' }); continue; }
      const nick = s.nick, cid = s.cid;
      brawl('/api/chess/internal/result', { method: 'POST', body: { nick, result: res } }).then((r) => {
        if (r.status === 200) this.tell(cid, { t: 'gems', gained: r.json.gained, profile: r.json.profile });
        else { console.error('보석 지급 실패', nick, r.status, r.json.error); this.tell(cid, { t: 'gems', gained: 0, why: '보석을 지급하지 못했어요: ' + (r.json.error || '계정 서버 오류') }); }
      });
    }
    // 나간 사람 자리는 비움
    for (let i = 0; i < 2; i++) if (this.seats[i] && this.seats[i].away) this.seats[i] = null;
  }

  tell(cid, msg) { const m = this.members.get(cid); if (m) try { m.socket.send(JSON.stringify(msg)); } catch (_) {} }
  event(e) { this.lastEvent = e; this.broadcast(); }
  // 방 상태를 모두에게 (사람마다 "나"가 다름)
  broadcast() {
    const g = this.game;
    const base = {
      code: this.code, title: this.title, isPublic: this.isPublic, time: this.time, phase: this.phase,
      seats: this.seats.map((s, i) => s && { name: s.name, guest: !s.nick, ready: s.ready, away: !!s.away, color: g ? g.color[i] : null, host: s.cid === this.host }),
      specs: [...this.members.entries()].filter(([cid]) => this.seatOf(cid) < 0).map(([cid, m]) => ({ id: cid, name: m.name, host: cid === this.host })),
      game: g && {
        st: g.st, moves: g.moves, last: g.last, draw: g.draw,
        clock: this.time ? { w: this.left('w'), b: this.left('b') } : null,
      },
      result: this.result, ev: this.lastEvent || null,
    };
    for (const [cid, m] of this.members) {
      const seat = this.seatOf(cid);
      const msg = { t: 'state', room: { ...base, you: seat, hostMe: cid === this.host, secret: seat >= 0 ? this.seats[seat].secret : null } };
      try { m.socket.send(JSON.stringify(msg)); } catch (_) {}
    }
    this.lastEvent = null;
  }
  // 게임 중에 끊겼다가 돌아옴 (같은 자리로)
  resume(cid, socket, secret) {
    const i = this.seats.findIndex((s) => s && s.away && s.secret === secret);
    if (i < 0 || this.isFull()) return false;
    const s = this.seats[i];
    this.members.set(cid, { socket, name: s.name, nick: s.nick });
    s.cid = cid; s.away = null;
    if (!this.host) this.host = cid;
    this.event({ k: 'back', n: s.name });
    return true;
  }
  leave(cid) {
    const m = this.members.get(cid);
    if (!m) return;
    this.members.delete(cid);
    const i = this.seatOf(cid);
    if (i >= 0) {
      if (this.phase === 'playing') { this.seats[i].away = Date.now(); this.seats[i].cid = null; }
      else { this.seats[i] = null; for (const s of this.seats) if (s) s.ready = false; }
    }
    if (this.host === cid) this.host = this.members.keys().next().value || null;
    if (this.members.size === 0 && !(this.phase === 'playing' && this.seats.some((s) => s && s.away))) return this.close();
    if (this.members.size === 0) return;   // 게임 중 둘 다 끊김: 돌아올 시간 동안 방을 남겨 둠
    this.event({ k: i >= 0 && this.phase === 'playing' ? 'away' : 'leave', n: m.name });
  }
  close() {
    clearInterval(this.timer);
    if (rooms.get(this.code) === this) rooms.delete(this.code);
  }
  summary() {
    const h = this.members.get(this.host);
    return {
      code: this.code, title: this.title, players: this.seats.filter(Boolean).length, specs: this.members.size - this.seats.filter((s) => s && s.cid).length,
      phase: this.phase, host: h ? h.name : '', time: this.time, full: this.isFull(),
    };
  }
}
// 둘 다 끊긴 채 돌아오지 않은 방 정리
setInterval(() => {
  for (const r of rooms.values()) if (r.members.size === 0 && r.phase !== 'playing') r.close();
}, 5000).unref();

function publicRooms() {
  return [...rooms.values()].filter((r) => r.isPublic && r.members.size > 0)
    .sort((a, b) => (a.summary().players === 2) - (b.summary().players === 2) || b.members.size - a.members.size || a.createdAt - b.createdAt)
    .slice(0, 30).map((r) => r.summary());
}
function newPublicCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code;
  do { code = 'pub-' + Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)]).join(''); } while (rooms.has(code));
  return code;
}

// ---------- 실시간 연결 ----------
server.on('upgrade', (req, sock) => {
  if (!req.url.startsWith('/ws')) return sock.destroy();
  const ip = clientIp(req);
  handleUpgrade(req, sock, (socket) => {
    const id = 'c' + nextId++;
    let room = null, joining = false, msgCount = 0;
    const counter = setInterval(() => { msgCount = 0; }, 1000);
    const fail = (msg) => socket.send(JSON.stringify({ t: 'error', msg }));
    const notice = (msg) => socket.send(JSON.stringify({ t: 'notice', msg }));

    async function join(m) {
      // 게임 중 끊겼던 자리로 돌아오기
      if (m.resume && m.room) {
        const r = rooms.get(String(m.room).toLowerCase());
        if (r && r.resume(id, socket, String(m.resume))) {
          room = r;
          socket.send(JSON.stringify({ t: 'welcome', id, room: r.code, title: r.title, isPublic: r.isPublic }));
          return;
        }
        if (m.resumeOnly) return socket.send(JSON.stringify({ t: 'noresume' }));
      }
      let name, nick = null;
      if (m.token) {
        let p;
        try { p = await profileFromToken(String(m.token)); } catch (e) { return fail(e.message); }
        if (!p) return fail('로그인이 만료됐어요. 다시 로그인해 주세요.');
        if (p.nickWarn) return fail('닉네임 경고를 받았어요. 난투 아레나에서 닉네임을 바꿔야 게임을 할 수 있어요.');
        name = nick = p.nick;
      } else {
        name = clean(m.guest, 12);
        if (name.length < 2) return fail('닉네임은 2~12자로 써 주세요.');
        if (limited(ip, 'guestcheck', 30, 60000)) return fail('잠시 후 다시 해 주세요.');
        const r = await brawl('/api/chess/internal/taken?nick=' + encodeURIComponent(name));
        if (r.status !== 200) return fail(r.json.error || '계정 서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.');
        if (r.json.taken) return fail('가입된 닉네임이에요. 로그인하거나 다른 닉네임을 써 주세요.');
      }
      if (!socket.open) return;
      let r;
      if (m.mode === 'create') {
        const code = newPublicCode();
        r = new ChessRoom(code, { isPublic: true, title: clean(m.title, 20) || `${name}의 방` });
        rooms.set(code, r);
      } else if (m.mode === 'quick') {
        // 빠른 입장: 한 명이 기다리는 공개 방 → 없으면 새 공개 방
        r = [...rooms.values()].filter((x) => x.isPublic && x.phase === 'waiting' && x.seats.filter(Boolean).length === 1 && !x.isFull())
          .sort((a, b) => a.createdAt - b.createdAt)[0];
        if (!r) {
          const code = newPublicCode();
          r = new ChessRoom(code, { isPublic: true, title: `${name}의 방` });
          rooms.set(code, r);
        }
      } else {
        const code = String(m.room || '').toLowerCase();
        if (!/^[a-z0-9][a-z0-9_.-]{0,19}$/.test(code)) return fail('초대 코드는 영어 소문자와 숫자로 써 주세요.');
        r = rooms.get(code);
        if (!r) {
          if (m.mode === 'listed') return fail('그 방은 방금 사라졌어요. 목록을 새로 보고 다른 방을 골라 주세요.');
          if (code.startsWith('pub-')) return fail('pub- 로 시작하는 코드는 쓸 수 없어요. 다른 초대 코드를 써 주세요.');
          r = new ChessRoom(code, { isPublic: false });
          rooms.set(code, r);
        }
      }
      if (!r.join(id, socket, name, nick)) {
        if (r.members.size === 0) r.close();
        return fail('방이 가득 찼어요. 다른 방을 골라 주세요.');
      }
      room = r;
      socket.send(JSON.stringify({ t: 'welcome', id, room: r.code, title: r.title, isPublic: r.isPublic }));
    }

    socket.on('message', (text) => {
      if (++msgCount > 40) return socket.close();
      let m;
      try { m = JSON.parse(text); } catch (e) { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'ping') return socket.send(JSON.stringify({ t: 'pong', c: m.c }));
      if (m.t === 'join') {
        if (room || joining) return;
        joining = true;
        join(m).catch((e) => fail(e.message || '들어가지 못했어요.')).finally(() => { joining = false; });
        return;
      }
      if (!room) return;
      let err = null;
      if (m.t === 'move') err = room.move(id, m.from, m.to, m.promo);
      else if (m.t === 'ready') room.setReady(id, !!m.on);
      else if (m.t === 'sit') err = room.sit(id, false);
      else if (m.t === 'stand') err = room.stand(id);
      else if (m.t === 'time') err = room.setTime(id, Number(m.min));
      else if (m.t === 'resign') room.resign(id);
      else if (m.t === 'draw') err = room.drawAction(id, String(m.act || ''));
      else return;
      if (err) notice(err);
      room.broadcast();
    });

    socket.on('close', () => {
      clearInterval(counter);
      if (room) room.leave(id);
    });
  });
});

server.listen(PORT, () => {
  console.log(`럭키 체스 서버 실행 중!  http://localhost:${PORT}`);
  console.log(`계정 서버(난투 아레나): ${BRAWL_URL}`);
  if (!CHESS_SECRET) console.log('!!! CHESS_SECRET 이 없어서 보석 지급·게스트 닉네임 확인이 안 돼요. 난투 아레나 서버와 같은 값을 넣어 주세요.');
});
