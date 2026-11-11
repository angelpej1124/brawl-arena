// =====================================================================
//  난투 아레나 서버 — 실행: node server.js
//  - public 폴더의 게임 화면을 웹사이트로 보여주고
//  - /api/... 로 회원가입·로그인·랭킹을 처리하고
//  - /ws 로 실시간 게임 연결을 받습니다.
// =====================================================================
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { handleUpgrade } = require('./ws');
const { Sim, CONFIG, SKILL_IDS, BOT_NAMES, validSkill, cleanInput, conflicts } = require('./game');
const accounts = require('./accounts');
const chess = require('./chess/core');   // 미니게임: 럭키 체스 (/chess/)
const CHESS_DIR = path.join(__dirname, 'chess', 'public');
const cards = require('./cards/core');   // 미니게임: 레인보우 원카드 · 인디언포커 (/cards/)
const CARDS_DIR = path.join(__dirname, 'cards', 'public');

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
      const body = await readBody(req).catch(() => ({}));
      return sendJson(res, 200, accounts.gacha(key, body && Number(body.count) === 10 ? 10 : 1));
    }
    if (req.method === 'POST' && (urlPath === '/api/patch/seen' || urlPath === '/api/patch/claim')) {
      const key = accounts.fromToken(bearer(req));
      if (!key) return sendJson(res, 401, { error: '로그인이 필요해요.' });
      if (limited(ip, 'patch', 20, 60000)) return sendJson(res, 429, { error: '잠시 후 다시 해 주세요.' });
      return sendJson(res, 200, urlPath === '/api/patch/claim' ? accounts.patchClaim(key) : accounts.patchSeen(key));
    }
    if (req.method === 'GET' && urlPath === '/api/shop') {
      return sendJson(res, 200, accounts.shopInfo(accounts.fromToken(bearer(req))));
    }
    if (req.method === 'POST' && (urlPath === '/api/shop/daily' || urlPath === '/api/shop/buy')) {
      const key = accounts.fromToken(bearer(req));
      if (!key) return sendJson(res, 401, { error: '로그인이 필요해요.' });
      if (limited(ip, 'shop', 40, 60000)) return sendJson(res, 429, { error: '잠시 후 다시 해 주세요.' });
      if (urlPath === '/api/shop/daily') return sendJson(res, 200, accounts.shopDaily(key));
      const b = await readBody(req);
      const r = accounts.shopBuy(key, String(b.kind || ''), String(b.id || ''));
      for (const room of rooms.values()) for (const [cid, c] of room.clients) if (c.accountKey === key) { const p = room.sim.players.get(cid); if (p) p.skins = accounts.skinsOf(key); }
      return sendJson(res, 200, r);
    }
    if (req.method === 'POST' && urlPath === '/api/skill/buy') {
      const key = accounts.fromToken(bearer(req));
      if (!key) return sendJson(res, 401, { error: '로그인이 필요해요.' });
      if (limited(ip, 'gacha', 60, 60000)) return sendJson(res, 429, { error: '너무 빨리 요청하고 있어요. 잠시 후 다시 해 주세요.' });
      const b = await readBody(req);
      return sendJson(res, 200, accounts.buySkill(key, String(b.skill || '')));
    }
    if (req.method === 'POST' && urlPath === '/api/nick') {
      const key = accounts.fromToken(bearer(req));
      if (!key) return sendJson(res, 401, { error: '로그인이 필요해요.' });
      const b = await readBody(req);
      const r = accounts.changeNick(key, b.nick);
      // 방에 있으면 이름도 바뀜
      for (const room of rooms.values()) for (const [cid, c] of room.clients) if (c.accountKey === key) {
        c.accountKey = r.key; c.name = r.profile.nick;
        const p = room.sim.players.get(cid); if (p) p.name = r.profile.nick;
      }
      return sendJson(res, 200, { profile: r.profile });
    }
    if (req.method === 'POST' && (urlPath === '/api/skin/buy' || urlPath === '/api/skin/equip')) {
      const key = accounts.fromToken(bearer(req));
      if (!key) return sendJson(res, 401, { error: '로그인이 필요해요.' });
      const b = await readBody(req);
      const r = urlPath === '/api/skin/buy' ? accounts.buySkin(key, String(b.skin || '')) : accounts.equipSkin(key, String(b.skill || ''), b.skin ? String(b.skin) : null);
      // 지금 게임 중이면 바로 모습이 바뀜
      for (const room of rooms.values()) for (const [cid, c] of room.clients) if (c.accountKey === key) { const p = room.sim.players.get(cid); if (p) p.skins = accounts.skinsOf(key); }
      return sendJson(res, 200, r);
    }
    // 버그 제보: 로그인 안 해도 보낼 수 있음. 접속 중인 관리자에게 바로 알림
    if (req.method === 'POST' && urlPath === '/api/report') {
      const key = accounts.fromToken(bearer(req));
      const b = await readBody(req);
      const r = accounts.addReport({ key, name: b.name, text: b.text, ctx: b.ctx, who: key || 'ip:' + clientIp(req) });
      if (r.error) return sendJson(res, 400, { error: r.error });
      console.log(`[버그 제보] ${r.report.nick || r.report.guest + ' (게스트)'}: ${r.report.text.slice(0, 80).replace(/\n/g, ' ')}`);
      for (const room of rooms.values()) for (const c of room.clients.values()) {
        if (c.accountKey && accounts.isAdmin(c.accountKey)) c.socket.send(JSON.stringify({ t: 'report', report: r.report }));
      }
      return sendJson(res, 200, { ok: true });
    }
    if (urlPath.startsWith('/api/admin/')) {
      const key = accounts.fromToken(bearer(req));
      if (!key || !accounts.isAdmin(key)) return sendJson(res, 403, { error: '관리자만 쓸 수 있어요.' });
      if (req.method === 'GET' && urlPath === '/api/admin/users') {
        const q = new URL(req.url, 'http://x').searchParams.get('q') || '';
        return sendJson(res, 200, { users: accounts.adminList(q) });
      }
      if (req.method === 'POST' && urlPath === '/api/admin/warn') {
        const b = await readBody(req);
        const profile = accounts.adminWarn(b.nick, !!b.on, b.reason);
        console.log(`[관리자] ${accounts.nickOf(key)} → ${profile.nick}: 닉네임 경고 ${b.on ? '켬 (' + profile.nickWarn + ')' : '끔'}`);
        for (const r of rooms.values()) for (const c of r.clients.values()) {
          if (c.accountKey && accounts.nickOf(c.accountKey) === profile.nick) c.socket.send(JSON.stringify({ t: 'profile', profile }));
        }
        return sendJson(res, 200, { profile });
      }
      if (req.method === 'POST' && urlPath === '/api/admin/user') {
        const b = await readBody(req);
        const profile = accounts.adminUpdate(b.nick, { gems: b.gems, owned: b.owned, skins: b.skins });
        console.log(`[관리자] ${accounts.nickOf(key)} → ${profile.nick}: 보석 ${profile.gems}, 스킬 ${profile.owned.join(',')}, 스킨 ${profile.skins.join(',') || '없음'}`);
        // 접속 중이면 바로 알려주고, 게임 중인 캐릭터의 스킨도 바로 바뀜
        const tkey = accounts.keyOf(profile.nick);
        for (const r of rooms.values()) for (const [cid, c] of r.clients) {
          if (c.accountKey !== tkey) continue;
          c.socket.send(JSON.stringify({ t: 'profile', profile }));
          const p = r.sim.players.get(cid); if (p) p.skins = accounts.skinsOf(tkey);
        }
        return sendJson(res, 200, { profile });
      }
      // 버그 제보 목록 · 처리 표시 · 삭제
      if (req.method === 'GET' && urlPath === '/api/admin/reports') return sendJson(res, 200, { reports: accounts.adminReports() });
      if (req.method === 'POST' && urlPath === '/api/admin/report') {
        const b = await readBody(req);
        const r = accounts.adminReportSet(String(b.id || ''), { done: !!b.done, del: !!b.del });
        if (r.error) return sendJson(res, 404, { error: r.error });
        return sendJson(res, 200, { ok: true });
      }
      // 방 목록 (공개·비공개 전부)
      if (req.method === 'GET' && urlPath === '/api/admin/rooms') {
        const list = [...rooms.values()].sort((a, b) => b.humans() - a.humans() || a.createdAt - b.createdAt)
          .map((r) => ({ ...r.summary(), isPublic: r.isPublic, names: [...r.clients.values()].map((c) => c.name) }));
        return sendJson(res, 200, { rooms: list });
      }
      // 방 삭제: 안에 있던 사람은 로비로 돌아가고 안내를 받음
      if (req.method === 'POST' && urlPath === '/api/admin/room/delete') {
        const b = await readBody(req);
        const r = rooms.get(String(b.code || ''));
        if (!r) return sendJson(res, 404, { error: '그 방은 이미 없어요.' });
        console.log(`[관리자] ${accounts.nickOf(key)} → 방 삭제 ${r.name} (${r.title || '비공개'}) · ${r.humans()}명`);
        r.close('관리자가 이 방을 삭제했어요.');
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 404, { error: '없는 주소예요.' });
    }
    if (req.method === 'GET' && urlPath === '/api/rooms') {
      return sendJson(res, 200, { rooms: publicRooms(), online: onlineCount() });
    }
    // ----- 미니게임: 럭키 체스 -----
    if (req.method === 'GET' && urlPath === '/api/chess/ranking') {
      return sendJson(res, 200, { ranking: accounts.chessRanking(10), online: chess.onlineCount() });
    }
    if (req.method === 'GET' && (urlPath === '/api/cards/rooms' || urlPath === '/api/cards/ranking')) {
      const game = new URL(req.url, 'http://x').searchParams.get('game');
      if (!cards.GAMES[game]) return sendJson(res, 404, { error: '없는 게임이에요.' });
      if (urlPath === '/api/cards/rooms') return sendJson(res, 200, { rooms: cards.publicRooms(game), online: cards.onlineCount(game) });
      return sendJson(res, 200, { ranking: game === 'onecard' ? accounts.onecardRanking(10) : accounts.pokerRanking(10), online: cards.onlineCount(game) });
    }
    if (req.method === 'GET' && urlPath === '/api/chess/rooms') {
      return sendJson(res, 200, { rooms: chess.publicRooms(), online: chess.onlineCount() });
    }
    if (req.method === 'GET' && urlPath === '/api/ranking') {
      return sendJson(res, 200, { ranking: accounts.ranking(10), online: onlineCount() });
    }
    return sendJson(res, 404, { error: '없는 주소예요.' });
  } catch (e) {
    return sendJson(res, 400, { error: e.message || '요청을 처리하지 못했어요.' });
  }
}

// ---------- 잠들지 않게 (Render 무료 서버) ----------
// Render 무료 서버는 15분 동안 요청이 없으면 잠들고, 다음 요청이 오면 깨어나야 함.
// 2026-11-07 오후부터 잠든 뒤 다시 깨어나지 못해 사이트가 흰 화면으로 멈추는 문제가 생김 (같은 계정의 다른 서비스도 똑같음)
// → 공개 주소로 4분마다 /health 를 불러서 잠들지 않게 함. 환경 변수 KEEP_AWAKE=off 로 끌 수 있음
const KEEP_EVERY = (Number(process.env.KEEP_EVERY_SEC) || 240) * 1000;
function keepAwake(base) {
  if (!base || process.env.KEEP_AWAKE === 'off') return;
  let fails = 0;
  setInterval(() => {
    const t0 = Date.now();
    const rq = (base.startsWith('https') ? https : http).get(base + '/health', { headers: { 'user-agent': 'brawl-keepawake' } }, (rs) => {
      rs.resume();
      rs.on('end', () => {
        if (rs.statusCode !== 200) console.log(`[깨어 있기] /health → ${rs.statusCode}`);
        else if (fails) { console.log(`[깨어 있기] 다시 정상 (${fails}번 실패 뒤)`); fails = 0; }
      });
    });
    rq.setTimeout(20000, () => rq.destroy(new Error('20초 안에 응답 없음')));
    rq.on('error', (e) => { fails++; console.log(`[깨어 있기] 실패 ${fails}번째 · ${e.message} · ${Date.now() - t0}ms`); });
  }, KEEP_EVERY);
}

// ---------- 진단 ----------
// 첫 화면 접속 · 오류 · 느린 응답 · 끊긴 응답만 기록, 서버가 1초 넘게 멈추면 기록, 30분마다 상태 기록. DIAG=off 로 끌 수 있음
const DIAG = process.env.DIAG !== 'off';
const diag = { reqs: 0, logged: 0, maxLag: 0 };
const QUIET_UA = /^brawl-(keepawake|selfcheck)/;
function diagRequest(req, res) {
  if (!DIAG) return;
  const t0 = Date.now();
  diag.reqs++;
  const p = String(req.url || '').split('?')[0].slice(0, 60);
  const ua = String(req.headers['user-agent'] || '').slice(0, 60);
  if (QUIET_UA.test(ua)) return;
  let done = false;
  const log = (what) => { if (diag.logged++ < 60) console.log(`[요청] ${req.method} ${p} → ${what} · ${Date.now() - t0}ms · ${ua}`); };
  res.on('finish', () => {
    done = true;
    if (p === '/' || res.statusCode >= 500 || Date.now() - t0 > 2000) log(res.statusCode);
  });
  res.on('close', () => { if (!done) log('응답 끝나기 전에 끊김'); });
}
function startDiag() {
  const base = process.env.RENDER_EXTERNAL_URL;   // Render가 넣어 주는 공개 주소
  keepAwake(base);
  if (!DIAG) return;
  let last = Date.now();
  setInterval(() => {   // 서버가 멈췄는지: 0.5초마다 재서 1초 넘게 늦으면 기록
    const now = Date.now(), lag = now - last - 500;
    last = now;
    if (lag > diag.maxLag) diag.maxLag = lag;
    if (lag > 1000) console.log(`[진단] 서버가 ${(lag / 1000).toFixed(1)}초 동안 멈춰 있었어요`);
  }, 500);
  setInterval(() => {
    console.log(`[상태] 살아있음 · 30분간 요청 ${diag.reqs}건 · 방 ${rooms.size}개 · 접속 ${onlineCount()}명 · 최대 지연 ${diag.maxLag}ms · 메모리 ${Math.round(process.memoryUsage().rss / 1048576)}MB`);
    diag.reqs = 0; diag.logged = 0; diag.maxLag = 0;
  }, 30 * 60 * 1000);
  setInterval(() => { diag.logged = 0; }, 60000);
  if (base) setTimeout(() => selfCheck(base, 15), 15000);
  // 확인용: 평소라면 잠들었을 시간(25분 뒤)에 한국에서 열리는지 한 번 점검
  if (base && process.env.KR_CHECK !== 'off') setTimeout(() => krCheck(base), 25 * 60 * 1000);
}
// 한국 안에서 이 사이트가 열리는지: 공개 측정망(Globalping)의 한국 측정 장비로 페이지 접속을 해 보고 로그로 남김
function krCheck(base) {
  const host = new URL(base).hostname;
  const call = (method, url, body) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const rq = https.request(url, { method, headers: { 'content-type': 'application/json', 'user-agent': 'brawl-arena-diag', ...(data ? { 'content-length': Buffer.byteLength(data) } : {}) } }, (rs) => {
      let b = '';
      rs.setEncoding('utf8');
      rs.on('data', (c) => { b += c; });
      rs.on('end', () => { try { resolve({ code: rs.statusCode, body: JSON.parse(b) }); } catch (e) { reject(new Error(`응답 ${rs.statusCode}: ${b.slice(0, 120)}`)); } });
    });
    rq.setTimeout(20000, () => rq.destroy(new Error('20초 안에 응답 없음')));
    rq.on('error', reject);
    if (data) rq.write(data);
    rq.end();
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const one = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const run = async (label, m) => {
    const c = await call('POST', 'https://api.globalping.io/v1/measurements', m);
    if (c.code >= 300 || !c.body.id) { console.log(`[진단] 한국 점검 ${label} 시작 못 함 · ${c.code} ${one(JSON.stringify(c.body)).slice(0, 200)}`); return; }
    let r = {};
    for (let i = 0; i < 45; i++) {
      await wait(2000);
      r = (await call('GET', 'https://api.globalping.io/v1/measurements/' + c.body.id)).body;
      if (r.status !== 'in-progress') break;
    }
    if (!(r.results || []).length) console.log(`[진단] 한국 점검 ${label} · 결과 없음 (${r.status})`);
    for (const t of r.results || []) {
      const p = t.probe || {}, x = t.result || {}, tm = x.timings || {};
      const where = `${p.country} ${p.city} · ${p.network} (AS${p.asn})`;
      let what;
      if (m.type === 'http') {
        what = x.status === 'finished'
          ? `${x.statusCode} · 총 ${tm.total}ms (dns ${tm.dns} · 연결 ${tm.tcp} · 암호화 ${tm.tls} · 첫 바이트 ${tm.firstByte} · 받기 ${tm.download}) · IP ${x.resolvedAddress}`
          : `${x.status} · ${one(x.rawOutput).slice(0, 160)}`;
      } else if (m.type === 'dns') {
        what = `${x.status} · ${(x.answers || []).map((a) => `${a.type} ${a.value}`).join(', ') || one(x.rawOutput).slice(0, 120)} · 리졸버 ${x.resolver}`;
      } else {
        what = `${x.status} · ${x.stats ? `손실 ${x.stats.loss}% · 평균 ${x.stats.avg}ms · IP ${x.resolvedAddress}` : one(x.rawOutput).slice(-140)}`;
      }
      console.log(`[진단] 한국 점검 ${label} · ${where} → ${what}`);
    }
  };
  const page = (path, method) => ({ request: { path, method }, protocol: 'HTTPS' });
  (async () => {
    const steps = [
      ['첫 화면', { type: 'http', target: host, locations: [{ country: 'KR', limit: 6 }], measurementOptions: page('/', 'GET') }],
      ['/health', { type: 'http', target: host, locations: [{ country: 'KR', limit: 3 }], measurementOptions: page('/health', 'GET') }],
    ];
    for (const [label, m] of steps) {
      try { await run(label, m); } catch (e) { console.log(`[진단] 한국 점검 ${label} 실패 · ${e.message}`); }
    }
    console.log('[진단] 한국 점검 끝');
  })();
}
function selfCheck(base, s) {
  const lib = base.startsWith('https') ? https : http;
  for (const p of ['/health', '/', '/client.js']) {
    const t0 = Date.now();
    const rq = lib.get(base + p, { headers: { 'user-agent': 'brawl-selfcheck' } }, (rs) => {
      let n = 0;
      rs.on('data', (c) => { n += c.length; });
      rs.on('end', () => console.log(`[진단] 자체 접속(${s}초) ${p} → ${rs.statusCode} · ${n}바이트 · ${Date.now() - t0}ms`));
    });
    rq.setTimeout(30000, () => rq.destroy(new Error('30초 안에 응답 없음')));
    rq.on('error', (e) => console.log(`[진단] 자체 접속(${s}초) ${p} 실패 · ${e.message} · ${Date.now() - t0}ms`));
  }
}

// ---------- 웹사이트 ----------
let simJs = null;   // /sim.js (game.js를 브라우저용으로 감싼 것)
const server = http.createServer((req, res) => {
  diagRequest(req, res);
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/health') { res.writeHead(200); return res.end('ok'); }
  // 스킬 상세 창의 영상: 브라우저에서 진짜 게임 규칙(game.js)을 그대로 돌려 보여줌
  if (urlPath === '/sim.js') {
    if (!simJs) simJs = '(function(){var module={exports:{}};var require=function(p){return p.indexOf("skins")>=0?window.BRAWL_SKINS:window.BRAWL_MAPS;};\n'
      + fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8') + '\nwindow.BRAWL_SIM=module.exports;})();';
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(simJs);
  }
  if (urlPath.startsWith('/api/')) return api(req, res, urlPath);
  // 미니게임 화면: /chess/ → chess/public
  if (urlPath === '/chess' || urlPath === '/cards') { res.writeHead(301, { Location: urlPath + '/' }); return res.end(); }
  const isChess = urlPath.startsWith('/chess/'), isCards = urlPath.startsWith('/cards/');
  const base = isChess ? CHESS_DIR : isCards ? CARDS_DIR : PUBLIC_DIR;
  const rel = isChess ? urlPath.slice('/chess'.length) : isCards ? urlPath.slice('/cards'.length) : urlPath;
  const file = path.normalize(path.join(base, rel === '/' ? 'index.html' : rel));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// 스냅샷 줄이기: 꼭 있어야 하는 값 말고는 0·false·빈 값이면 뺌
const SLIM_KEEP = new Set(['id', 'n', 'c', 'x', 'y', 'f', 'dmg', 'st', 'ms', 'ko', 'wn', 'cd', 'cd2', 'cdB', 'tm', 'sk', 'sk2', 'vx', 'vy', 'am', 'bd', 'br', 'ow']);
function slim(q) {
  const o = {};
  for (const k in q) {
    const v = q[k];
    if (SLIM_KEEP.has(k) || !(v === 0 || v === false || v == null || (Array.isArray(v) && !v.length))) o[k] = v;
  }
  return o;
}
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
    this.tickN = 0; this.evSent = 0;
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
      // 데이터 줄이기: ① 이벤트는 새로 생긴 것만 (예전엔 최근 10개를 매번 다시 보냄)
      //               ② 사람·분신 정보에서 0·false·빈 값은 빼고 보냄 (화면에선 없으면 0으로 봄)
      snap.ev = snap.ev.filter((e) => e.i > this.evSent);
      if (snap.ev.length) this.evSent = snap.ev[snap.ev.length - 1].i;
      snap.p = snap.p.map(slim); snap.cl = snap.cl.map(slim);
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
        kills: p.kos, botKills: p.botKos || 0, gemHits: p.gemEarn || 0,
      });
      if (r) c.socket.send(JSON.stringify({ t: 'profile', profile: r.profile, gained: r.gained }));
    }
  }
  join(id, socket, name, accountKey, skill, mob) {
    if (this.isFull()) return false;
    if (this.sim.players.size >= CONFIG.MAX_PLAYERS) {
      const bot = this.sim.list().reverse().find((p) => p.bot);
      if (bot) this.sim.removePlayer(bot.id);
    }
    this.clients.set(id, { socket, accountKey, name });
    const p = this.sim.addPlayer(id, name, false, skill);
    if (p) { p.skins = accounts.skinsOf(accountKey); p.mob = mob; }   // mob: 모바일(터치)
    if (!this.hostId) this.hostId = id;
    if (this.sim.doubleMode) this.giveSkill2(id);
    return true;
  }
  // 더블 모드: 두 번째 스킬이 없는 사람에게 가진 스킬 중 하나를 넣어 줌
  giveSkill2(id) {
    const p = this.sim.players.get(id), c = this.clients.get(id);
    if (!p || !c || p.skill2) return;
    const owned = c.accountKey ? accounts.ownedOf(c.accountKey) : accounts.BASE_SKILLS;
    const k = owned.find((x) => x !== p.skill && !conflicts(x, p.skill));
    if (k) this.sim.setSkill2(id, k);
  }
  // 방 닫기 (관리자 삭제): 모두에게 알리고 연결을 끊음
  close(msg) {
    this.closed = true;
    clearInterval(this.timer);
    if (rooms.get(this.name) === this) rooms.delete(this.name);
    for (const c of this.clients.values()) {
      try { c.socket.send(JSON.stringify({ t: 'kicked', msg })); c.socket.close(); } catch (_) {}
    }
    this.clients.clear();
  }
  leave(id) {
    if (this.closed) return;
    this.clients.delete(id);
    this.sim.removePlayer(id);
    if (this.clients.size === 0) { clearInterval(this.timer); rooms.delete(this.name); return; }
    // 방장이 나가면 그다음으로 먼저 들어온 사람이 방장
    if (this.hostId === id) {
      this.hostId = this.clients.keys().next().value;
      this.sim.ev({ k: 'host', n: this.clients.get(this.hostId).name });
    }
  }
  bot(byId, add, dummy) {
    if (byId !== this.hostId) return; // 봇·더미는 방장만
    if (add) {
      if (this.sim.players.size >= CONFIG.MAX_PLAYERS) return;
      const used = new Set(this.sim.list().map((p) => p.name));
      let name;
      if (dummy) { let i = 1; while (used.has('더미 ' + i)) i++; name = '더미 ' + i; }
      else name = BOT_NAMES.find((n) => !used.has(n)) || '봇';
      const p = this.sim.addPlayer((dummy ? 'dum' : 'bot') + nextId++, name, true, dummy ? 'slow' : SKILL_IDS[Math.floor(Math.random() * SKILL_IDS.length)]);
      if (p && dummy) p.dummy = true;
    } else {
      // 봇 빼기는 봇만, 더미 빼기는 더미만
      const bot = this.sim.list().reverse().find((p) => p.bot && !!p.dummy === !!dummy);
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
// ---------- 미니게임: 럭키 체스 (계정·보석은 이 서버의 accounts 를 그대로 씀) ----------
chess.init({
  profileFromToken: (token) => { const k = accounts.fromToken(token); return k ? accounts.profileOf(k) : null; },
  isTaken: (nick) => accounts.isTaken(nick),
  record: (nick, result, bot) => {
    const nk = accounts.keyOf(String(nick || ''));
    // 봇전이면 보석만 (난이도별), 사람끼리면 체스 전적·랭킹도
    const r = bot ? accounts.chessBotRecord(nk, result, bot) : accounts.chessRecord(nk, result);
    // 난투 아레나 방에도 들어가 있으면 보석이 바로 바뀌어 보임
    if (r) for (const room of rooms.values()) for (const c of room.clients.values()) if (c.accountKey === nk) c.socket.send(JSON.stringify({ t: 'profile', profile: r.profile }));
    return r;
  },
});

// ---------- 미니게임: 레인보우 카드 ----------
cards.init({
  accounts,
  // 보석이 바뀌면 난투 아레나 방에 있는 같은 계정 화면에도 바로 반영
  pushProfile: (key, profile) => {
    if (!key || !profile) return;
    for (const room of rooms.values()) for (const c of room.clients.values()) if (c.accountKey === key) c.socket.send(JSON.stringify({ t: 'profile', profile }));
  },
});

server.on('upgrade', (req, sock) => {
  if (req.url.startsWith('/cards-ws')) return handleUpgrade(req, sock, (socket) => cards.handleSocket(socket, req));
  if (req.url.startsWith('/chess-ws')) return handleUpgrade(req, sock, (socket) => chess.handleSocket(socket, req));
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
          if (accounts.profileOf(accountKey).nickWarn) return fail('닉네임 경고를 받았어요. 로비에서 닉네임을 바꿔야 게임을 할 수 있어요.');
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
        if (!r.join(id, socket, name, accountKey, skill, !!m.mob)) {
          if (r.clients.size === 0) { clearInterval(r.timer); rooms.delete(r.name); }
          return fail('방이 가득 찼어요. 다른 방을 골라 주세요.');
        }
        room = r;
        socket.send(JSON.stringify({ t: 'welcome', id, room: r.name, title: r.title, isPublic: r.isPublic }));
      } else if (m.t === 'input' && room) {
        const p = room.sim.players.get(id);
        if (p) { p.rawInput = cleanInput(m); p.input = { ...p.rawInput }; }
      } else if (m.t === 'bot' && room) {
        room.bot(id, !!m.add, !!m.dummy);
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
      } else if ((m.t === 'skill' || m.t === 'skill2') && room && m.skill === 'random') {
        // 랜덤: 내가 가진 스킬 중에서 매 판 새로 뽑음
        const c = room.clients.get(id);
        const pool = c.accountKey ? accounts.ownedOf(c.accountKey) : accounts.BASE_SKILLS;
        const err = room.sim.setRandom(id, m.t === 'skill2' ? 2 : 1, [...pool]);
        if (err) return notice(err);
      } else if (m.t === 'skill' && room) {
        const skill = validSkill(m.skill);
        const c = room.clients.get(id);
        if (c.accountKey ? !accounts.owns(c.accountKey, skill) : !accounts.BASE_SKILLS.includes(skill)) {
          return notice(c.accountKey ? '아직 뽑지 않은 스킬이에요.' : '게스트는 둔화와 점멸만 쓸 수 있어요.');
        }
        const err = room.sim.setSkill(id, skill);
        if (err) return notice(err);
        if (c.accountKey) accounts.setSkill(c.accountKey, skill);
      } else if (m.t === 'kick' && room) {
        // 방장이 플레이어를 내보냄 (영구 추방 아님: 다시 들어올 수 있음)
        if (id !== room.hostId) return notice('추방은 방장만 할 수 있어요.');
        const tid = String(m.id || ''), tc = room.clients.get(tid);
        if (!tc || tid === id) return notice('추방할 수 없는 대상이에요.');
        room.sim.ev({ k: 'kickout', n: tc.name });
        try { tc.socket.send(JSON.stringify({ t: 'kicked', msg: '방장이 방에서 내보냈어요. 다시 들어갈 수는 있어요.' })); tc.socket.close(); } catch (_) {}
        room.leave(tid);
      } else if (m.t === 'botdiff' && room) {
        if (id !== room.hostId) return notice('봇 난이도는 방장만 정할 수 있어요.');
        const err = room.sim.setBotDiff(String(m.id || ''), String(m.diff || ''));
        if (err) return notice(err);
      } else if (m.t === 'botskill' && room) {
        if (id !== room.hostId) return notice('봇 스킬은 방장만 정할 수 있어요.');
        const err = room.sim.setBotSkill(String(m.id || ''), m.skill ? String(m.skill) : null, m.skill2 ? String(m.skill2) : null);
        if (err) return notice(err);
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
        const err = room.sim.setMode(!!m.team, !!m.dbl, m.item === undefined ? undefined : !!m.item);
        if (err) return notice(err);
        if (room.sim.doubleMode) for (const cid of room.clients.keys()) room.giveSkill2(cid);
      } else if (m.t === 'pickmap' && room) {
        // 맵은 항상 방장이 고름 (투표 없음)
        if (id !== room.hostId) return notice('맵은 방장만 고를 수 있어요.');
        const err = room.sim.pickHostMap(String(m.map || ''));
        if (err) return notice(err);
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

// 이상한 요청(잘린 요청 등)이 오면 기록만 하고 연결을 닫음
server.on('clientError', (err, socket) => {
  if (DIAG) console.log(`[진단] 잘못된 요청 · ${err.code || err.message}`);
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); else socket.destroy();
});

accounts.init().then(() => {
  server.listen(PORT, () => {
    console.log(`난투 아레나 서버 실행 중!  http://localhost:${PORT}`);
    console.log(`계정 저장 위치: ${accounts.storage()}`);
    startDiag();
  });
});
