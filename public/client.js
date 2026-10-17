// =====================================================================
//  난투 아레나 — 브라우저 화면 (서버가 판정, 여기서는 그리기와 입력만)
// =====================================================================
(() => {
'use strict';
const CONFIG = {
  TICK_RATE: 60, SEND_EVERY: 2, MAX_PLAYERS: 6, STOCKS: 3,
  COUNTDOWN: 3, RESULT_TIME: 5, RESPAWN_INVINCIBLE: 2,
  GRAVITY: 2300, MAX_FALL: 1300, RUN_SPEED: 400, GROUND_ACCEL: 4200, AIR_ACCEL: 1800,
  JUMP_SPEED: 860, DOUBLE_JUMP_SPEED: 760, EXTRA_JUMPS: 1, PLAYER_W: 40, PLAYER_H: 60,
};
const ATTACKS = {
  light: { startup: 0.06, active: 0.10, total: 0.28, reach: 58, height: 40, damage: 6,  baseKB: 280, growthKB: 9,  lift: 0.45 },
  heavy: { startup: 0.24, active: 0.10, total: 0.62, reach: 72, height: 50, damage: 13, baseKB: 420, growthKB: 15, lift: 0.65 },
};
// 스킬 (Q) — 숫자를 바꿔서 밸런스를 조절하세요
const SKILLS = {
  slow:  { name: '둔화', cd: 6, radius: 230, duration: 5, moveMul: 0.5, attackMul: 0.5 },
  blink: { name: '점멸', cd: 12, distance: 230 },
};
const STAGE = {
  width: 1280, height: 720,
  solids: [{ x: 240, y: 520, w: 800, h: 70 }],
  platforms: [{ x: 320, y: 385, w: 200 }, { x: 760, y: 385, w: 200 }, { x: 540, y: 255, w: 200 }],
  blast: { left: -260, right: 1540, top: -520, bottom: 980 },
  spawns: [{ x: 340, y: 520 }, { x: 940, y: 520 }, { x: 640, y: 255 }, { x: 420, y: 385 }, { x: 860, y: 385 }, { x: 640, y: 520 }],
};
const COLORS = ['#ff5a5f', '#3fa7ff', '#ffc93c', '#4cd97b', '#c77dff', '#ff8c42'];
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 바둑이', '봇 민수', '봇 지수'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const EMPTY_INPUT = () => ({ l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, s: 0 });
const cleanInput = (i) => ({ l: i.l ? 1 : 0, r: i.r ? 1 : 0, u: i.u ? 1 : 0, d: i.d ? 1 : 0, a: i.a ? 1 : 0, h: i.h ? 1 : 0, s: i.s ? 1 : 0 });
const validSkill = (s) => (s === 'blink' ? 'blink' : 'slow');

// =====================================================================
//  계정 (서버에 회원가입 · 로그인)
// =====================================================================
const $ = (id) => document.getElementById(id);
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let isHost = false;   // 내가 방장인지 (서버가 알려줌)
let hostLive = null;  // 지금 방장의 id

const account = { token: null, profile: null, skill: 'slow' };
let authTab = 'login';
try { account.skill = validSkill(localStorage.getItem('brawl_skill')); } catch (e) {}
try { account.token = localStorage.getItem('brawl_token'); } catch (e) {}

async function api(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (account.token) headers.Authorization = 'Bearer ' + account.token;
  const res = await fetch(path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || '서버에 연결하지 못했어요.'); err.status = res.status; throw err; }
  return data;
}
function cleanNick(s) {
  return String(s || '').normalize('NFC').replace(/[<>&"'\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').trim().slice(0, 12);
}

function setTab(tab) {
  authTab = tab;
  for (const [t, id] of [['login', 'tabLogin'], ['signup', 'tabSignup'], ['guest', 'tabGuest']]) $(id).setAttribute('aria-selected', String(t === tab));
  $('authForm').hidden = tab === 'guest';
  $('guestBox').hidden = tab !== 'guest';
  $('pw2Wrap').hidden = tab !== 'signup';
  $('pwWarn').hidden = tab !== 'signup';
  $('authBtn').textContent = tab === 'signup' ? '가입하기' : '로그인';
  $('aPw').setAttribute('autocomplete', tab === 'signup' ? 'new-password' : 'current-password');
  $('authMsg').textContent = '';
  renderAccount();
}
$('tabLogin').addEventListener('click', () => setTab('login'));
$('tabSignup').addEventListener('click', () => setTab('signup'));
$('tabGuest').addEventListener('click', () => setTab('guest'));

function authMsg(text, ok) {
  $('authMsg').textContent = text;
  $('authMsg').style.color = ok ? 'var(--ok)' : 'var(--danger)';
}

$('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nick = cleanNick($('aNick').value);
  const pw = $('aPw').value;
  if (nick.length < 2) { authMsg('닉네임은 2~12자로 써 주세요.'); return; }
  if (pw.length < 4) { authMsg('비밀번호는 4자 이상으로 써 주세요.'); return; }
  if (authTab === 'signup' && pw !== $('aPw2').value) { authMsg('비밀번호 확인이 달라요.'); return; }
  $('authBtn').disabled = true;
  authMsg(authTab === 'signup' ? '가입하는 중…' : '확인하는 중…', true);
  try {
    account.token = null;
    const r = await api(authTab === 'signup' ? '/api/signup' : '/api/login', { nick, pw });
    loginWith(r.token, r.profile);
    authMsg('');
  } catch (err) {
    authMsg(err.message);
  } finally {
    $('authBtn').disabled = false;
  }
});

function loginWith(token, profile) {
  account.token = token; account.profile = profile;
  try { localStorage.setItem('brawl_token', token); } catch (e) {}
  if (profile.skill) selectSkill(profile.skill, true);
  $('aPw').value = ''; $('aPw2').value = '';
  renderAccount();
  loadRanking();
}
$('logoutBtn').addEventListener('click', () => {
  api('/api/logout', {}).catch(() => {});
  account.token = null; account.profile = null;
  try { localStorage.removeItem('brawl_token'); } catch (e) {}
  setTab('login');
  loadRanking();
});

function renderAccount() {
  const p = account.profile;
  const loggedIn = !!p;
  $('authBox').hidden = loggedIn;
  $('meBox').hidden = !loggedIn;
  if (loggedIn) $('meNick').textContent = p.nick;
  $('stWins').textContent = p ? p.wins : '-';
  $('stGames').textContent = p ? p.games : '-';
  $('stKos').textContent = p ? p.kos : '-';
  $('acctDot').className = 'dot' + (loggedIn ? ' ok' : '');
  $('acctText').textContent = loggedIn ? '로그인됨 · 판이 끝날 때마다 서버에 기록돼요'
    : authTab === 'guest' ? '게스트는 기록이 저장되지 않아요'
    : '로그인하면 기록이 저장되고 랭킹에 올라가요';
  selectSkill(account.skill, false);
}

function renderRanking(rows) {
  const ol = $('rank');
  ol.textContent = '';
  rows.forEach((r, i) => {
    const li = document.createElement('li');
    const mine = account.profile && r.nick === account.profile.nick;
    if (mine) li.className = 'me';
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = i + 1;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.nick + (mine ? ' (나)' : '');
    const sc = document.createElement('span'); sc.className = 'sc';
    const em = document.createElement('em'); em.textContent = `${r.wins}승`;
    sc.append(em, ` · ${r.games}판 · KO ${r.kos}`);
    li.append(pos, nm, sc);
    ol.append(li);
  });
  $('rankEmpty').hidden = rows.length > 0;
}
async function loadRanking() {
  try {
    const r = await api('/api/ranking');
    renderRanking(r.ranking || []);
    $('onlineNow').textContent = r.online;
  } catch (e) {}
}
setInterval(() => { if (!$('lobby').hidden) loadRanking(); }, 15000);

(async () => {
  renderAccount();
  loadRanking();
  if (account.token) {
    try { const r = await api('/api/me'); account.profile = r.profile; if (r.profile.skill) selectSkill(r.profile.skill, true); }
    catch (e) { if (e.status === 401) { account.token = null; try { localStorage.removeItem('brawl_token'); } catch (_) {} } }
    renderAccount();
  }
})();

// ---------------- 스킬 선택 ----------------
function selectSkill(skill, save) {
  skill = validSkill(skill);
  $('skSlow').setAttribute('aria-pressed', String(skill === 'slow'));
  $('skBlink').setAttribute('aria-pressed', String(skill === 'blink'));
  account.skill = skill;
  $('tSkillName').textContent = SKILLS[skill].name;
  $('tSkill').style.borderColor = skill === 'slow' ? 'var(--slow)' : 'var(--blink)';
  if (save) { try { localStorage.setItem('brawl_skill', skill); } catch (e) {} }
}
$('skSlow').addEventListener('click', () => selectSkill('slow', true));
$('skBlink').addEventListener('click', () => selectSkill('blink', true));

// =====================================================================
//  서버 연결
// =====================================================================
let ws = null, myId = null, online = false, inGame = false;
let snapshots = [], latest = null, lastEvSeen = 0, pingMs = null;

try { $('roomcode').value = localStorage.getItem('brawl_room') || ''; } catch (e) {}
if (isTouch) { $('keysPc').hidden = true; $('keysTouch').hidden = false; }
$('playBtn').addEventListener('click', () => enter());
['gNick', 'roomcode', 'roomTitle'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') enter(); }));
$('exitBtn').addEventListener('click', () => { location.reload(); });

// ---------------- 방 고르기 (공개 방 목록 · 방 만들기 · 초대 코드) ----------------
let roomTab = 'list';
function setRoomTab(tab) {
  roomTab = tab;
  for (const [t, id] of [['list', 'rtList'], ['create', 'rtCreate'], ['code', 'rtCode']]) $(id).setAttribute('aria-selected', String(t === tab));
  $('rpList').hidden = tab !== 'list';
  $('rpCreate').hidden = tab !== 'create';
  $('rpCode').hidden = tab !== 'code';
  $('playBtn').textContent = tab === 'list' ? '빠른 입장' : tab === 'create' ? '공개 방 만들기' : '코드로 입장';
  $('err').textContent = '';
  if (tab === 'list') loadRooms();
}
$('rtList').addEventListener('click', () => setRoomTab('list'));
$('rtCreate').addEventListener('click', () => setRoomTab('create'));
$('rtCode').addEventListener('click', () => setRoomTab('code'));

const PHASE_KO = { waiting: '대기 중', countdown: '곧 시작', playing: '게임 중', ended: '결과 화면' };
async function loadRooms() {
  try {
    const r = await api('/api/rooms');
    $('onlineNow').textContent = r.online;
    const ul = $('roomList');
    ul.textContent = '';
    for (const room of r.rooms || []) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'room-btn';
      const full = room.players >= room.max;
      b.disabled = full;
      const t = document.createElement('span'); t.className = 't'; t.textContent = room.title;
      const c = document.createElement('span'); c.className = 'c'; c.textContent = full ? '꽉 참' : `${room.players}/${room.max}명`;
      const st = document.createElement('span'); st.className = 's';
      st.textContent = `방장 ${room.host || '-'} · ${PHASE_KO[room.phase] || ''}${room.bots ? ` · 봇 ${room.bots}` : ''}`;
      b.append(t, c, st);
      b.addEventListener('click', () => enter({ mode: 'listed', room: room.code }));
      li.append(b);
      ul.append(li);
    }
    $('roomEmpty').hidden = (r.rooms || []).length > 0;
  } catch (e) {}
}
loadRooms();
setInterval(() => { if (!$('lobby').hidden && roomTab === 'list') loadRooms(); }, 5000);

function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

function enter(pick) {
  if (ws) return;
  if (!account.profile && authTab !== 'guest') { $('err').textContent = '먼저 로그인하거나, 게스트 탭에서 닉네임을 정해 주세요.'; return; }
  const guest = cleanNick($('gNick').value);
  if (!account.profile && guest.length < 2) { $('err').textContent = '닉네임은 2~12자로 써 주세요.'; return; }

  let join;
  if (pick) join = pick;
  else if (roomTab === 'create') join = { mode: 'create', title: $('roomTitle').value.trim().slice(0, 20) };
  else if (roomTab === 'code') {
    const code = $('roomcode').value.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{0,19}$/.test(code)) { $('err').textContent = '초대 코드는 영어 소문자와 숫자로 써 주세요.'; return; }
    try { localStorage.setItem('brawl_room', code); } catch (e) {}
    join = { mode: 'code', room: code };
  } else join = { mode: 'quick' };

  $('err').textContent = '연결 중…';
  $('playBtn').disabled = true;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => send({ t: 'join', ...join, skill: account.skill, ...(account.profile ? { token: account.token } : { guest }) });
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  ws.onclose = () => {
    online = false;
    if (inGame) $('net').textContent = '서버와 연결이 끊겼어요 · 오른쪽 위 "나가기"를 눌러 다시 들어와 주세요';
    else {
      ws = null;
      if ($('err').textContent === '연결 중…') $('err').textContent = '서버에 연결할 수 없어요. 잠시 후 다시 해 주세요.';
      $('playBtn').disabled = false;
    }
  };
}

function onMessage(m) {
  if (m.t === 'welcome') {
    myId = m.id; online = true; inGame = true;
    $('lobby').hidden = true; $('bar').hidden = false; $('net').hidden = false;
    $('roomLabel').textContent = m.isPublic ? `공개 · ${m.title}` : `초대 코드: ${m.room}`;
    if (isTouch) $('touch').hidden = false;
    resize();
    setInterval(() => send({ t: 'ping', c: performance.now() }), 2000);
  } else if (m.t === 'error') {
    $('err').textContent = m.msg;
    $('playBtn').disabled = false;
    if (!inGame && ws) { const w = ws; ws = null; w.onclose = null; w.close(); loadRooms(); }
  } else if (m.t === 'pong') {
    pingMs = Math.round(performance.now() - m.c);
  } else if (m.t === 'profile') {
    account.profile = m.profile;
    renderAccount();
  } else if (m.t === 's') {
    m.time = performance.now();
    snapshots.push(m);
    if (snapshots.length > 30) snapshots.shift();
    latest = m;
    // 방장만 봇 추가/빼기 버튼이 보임
    if (m.host !== hostLive || isHost !== (m.host === myId)) {
      hostLive = m.host;
      isHost = m.host === myId;
      $('botAdd').hidden = !isHost;
      $('botDel').hidden = !isHost;
    }
    for (const e of m.ev || []) if (e.i > lastEvSeen) { lastEvSeen = e.i; onEvent(e); }
  }
}

$('botAdd').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: true }); });
$('botDel').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: false }); });

// ---------------- 입력 ----------------
const input = EMPTY_INPUT();
const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', Space: 'u', ArrowDown: 'd', KeyS: 'd',
  KeyJ: 'a', KeyZ: 'a', KeyK: 'h', KeyX: 'h', KeyQ: 's', KeyL: 's',
};
// 아주 짧게 눌러도 놓치지 않도록 최소 90ms는 눌린 상태로 유지
const downAt = {}, releaseTimers = {};
function setKey(k, v) {
  if (v) { clearTimeout(releaseTimers[k]); if (!input[k]) downAt[k] = performance.now(); }
  else if (input[k]) {
    const held = performance.now() - (downAt[k] || 0);
    if (held < 90) { clearTimeout(releaseTimers[k]); releaseTimers[k] = setTimeout(() => applyKey(k, 0), 90 - held); return; }
  }
  applyKey(k, v);
}
function applyKey(k, v) {
  if (input[k] === v) return;
  input[k] = v;
  send({ t: 'input', ...input });
}
addEventListener('keydown', (e) => {
  if (!$('lobby').hidden) return;
  const k = KEYMAP[e.code];
  if (k) { e.preventDefault(); setKey(k, 1); }
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) setKey(k, 0); });
addEventListener('blur', () => Object.keys(input).forEach((k) => setKey(k, 0)));

// 터치: 여러 손가락 동시 입력, 버튼 사이로 미끄러져도 따라감
const touchMap = new Map(); // pointerId -> key
function keyAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const b = el && el.closest && el.closest('.tbtn');
  return b ? b.dataset.k : null;
}
function refreshTouch() {
  const held = new Set(touchMap.values());
  document.querySelectorAll('.tbtn').forEach((b) => {
    const on = held.has(b.dataset.k);
    b.classList.toggle('on', on);
    setKey(b.dataset.k, on ? 1 : 0);
  });
}
const touchEl = $('touch');
touchEl.addEventListener('pointerdown', (e) => {
  const k = keyAt(e.clientX, e.clientY);
  if (!k) return;
  e.preventDefault();
  touchMap.set(e.pointerId, k); refreshTouch();
});
addEventListener('pointermove', (e) => {
  if (!touchMap.has(e.pointerId)) return;
  const k = keyAt(e.clientX, e.clientY);
  const prev = touchMap.get(e.pointerId);
  // 이동 버튼끼리만 미끄러져 바꿀 수 있음 (공격 연타 방지)
  if (k && k !== prev && 'lrd'.includes(k) && 'lrd'.includes(prev)) { touchMap.set(e.pointerId, k); refreshTouch(); }
});
const endTouch = (e) => { if (touchMap.delete(e.pointerId)) refreshTouch(); };
addEventListener('pointerup', endTouch);
addEventListener('pointercancel', endTouch);
touchEl.addEventListener('contextmenu', (e) => e.preventDefault());

// =====================================================================
//  화면 그리기
// =====================================================================
const canvas = $('game');
const ctx = canvas.getContext('2d');
const W = 1280, H = 720, PW = 40, PH = 60, INTERP_DELAY = 70;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let particles = [], shake = 0, banners = [];

function onEvent(ev) {
  if (ev.k === 'hit') {
    const n = ev.p === 2 ? 22 : 12;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 150 + Math.random() * (ev.p === 2 ? 520 : 320);
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, c: ev.p === 2 ? '#ffcf3f' : '#ffffff', r: ev.p === 2 ? 5 : 3.5 });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.25, max: 0.25, r: ev.p === 2 ? 70 : 42, c: '255,255,255' });
    shake = Math.max(shake, ev.p === 2 ? 12 : 5);
  } else if (ev.k === 'ko') {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = 200 + Math.random() * 700;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7, max: 0.7, c: i % 2 ? '#ff5a5f' : '#ffcf3f', r: 6 });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 220, c: '255,255,255' });
    shake = 22;
    banners.push({ text: `${ev.n} 장외!`, life: 1.2, max: 1.2, small: true });
  } else if (ev.k === 'jump' || ev.k === 'jump2') {
    for (let i = 0; i < 6; i++) {
      particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 60, life: 0.3, max: 0.3, c: ev.k === 'jump2' ? '#9fd8ff' : '#d8cfa8', r: 4 });
    }
  } else if (ev.k === 'slow') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.55, max: 0.55, r: ev.r, c: '127,184,255', grow: true });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      particles.push({ x: ev.x + Math.cos(a) * 30, y: ev.y + Math.sin(a) * 30, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: 0.45, max: 0.45, c: '#7fb8ff', r: 4, nograv: true });
    }
    if (ev.h > 0) banners.push({ text: `둔화! ${ev.h}명`, life: 1, max: 1, small: true, color: '#7fb8ff' });
  } else if (ev.k === 'blink') {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      particles.push({ ghost: true, x: ev.x + (ev.x2 - ev.x) * t, y: ev.y + (ev.y2 - ev.y) * t, life: 0.15 + t * 0.25, max: 0.4, c: '199,125,255' });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 200;
      particles.push({ x: ev.x2, y: ev.y2 - PH / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, c: '#e2b8ff', r: 4, nograv: true });
    }
  } else if (ev.k === 'host') {
    banners.push({ text: `${ev.n} 님이 새 방장이에요`, life: 2, max: 2, small: true, color: '#ffcf3f' });
  } else if (ev.k === 'start') {
    banners.push({ text: '싸워라!', life: 1, max: 1 });
  } else if (ev.k === 'join') {
    banners.push({ text: `${ev.n} 입장`, life: 1.5, max: 1.5, small: true });
  } else if (ev.k === 'leave') {
    banners.push({ text: `${ev.n} 퇴장`, life: 1.5, max: 1.5, small: true });
  }
  if (reduceMotion) shake = 0;
  if (particles.length > 500) particles.splice(0, particles.length - 500);
}

function interpolatedPlayers() {
  if (!snapshots.length) return [];
  const t = performance.now() - INTERP_DELAY;
  let a = snapshots[0], b = snapshots[snapshots.length - 1];
  for (let i = snapshots.length - 1; i > 0; i--) {
    if (snapshots[i - 1].time <= t) { a = snapshots[i - 1]; b = snapshots[i]; break; }
  }
  const span = b.time - a.time;
  const k = span > 0 ? Math.min(1, Math.max(0, (t - a.time) / span)) : 1;
  const prev = new Map(a.p.map((p) => [p.id, p]));
  return b.p.map((p) => {
    const q = prev.get(p.id);
    if (!q || Math.abs(q.x - p.x) > 120 || Math.abs(q.y - p.y) > 120) return p;
    return { ...p, x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k };
  });
}

let scale = 1, offX = 0, offY = 0, portrait = false;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  portrait = innerHeight > innerWidth * 1.1;
  const inGame = $('lobby').hidden;
  if (portrait && isTouch && inGame) {
    // 세로 화면: 게임은 위, 버튼은 아래
    // 무대 부분만 확대해서 보여줌 (월드 x 140~1140)
    scale = canvas.width / 1000;
    offX = -140 * scale;
    offY = Math.max(64 * dpr, (canvas.height * 0.54 - H * scale) * 0.5);
  } else {
    scale = Math.min(canvas.width / W, canvas.height / H);
    offX = (canvas.width - W * scale) / 2; offY = (canvas.height - H * scale) / 2;
  }
  $('rotate').hidden = !(portrait && isTouch && inGame);
}
addEventListener('resize', resize); resize();

const stars = Array.from({ length: 70 }, (_, i) => ({ x: (i * 397) % W, y: (i * 211) % 420, r: (i % 3) + 1 }));
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawBackground(time) {
  ctx.fillStyle = '#0b0a16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b1640'); g.addColorStop(0.6, '#3a2560'); g.addColorStop(1, '#6b3459');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    ctx.globalAlpha = reduceMotion ? 0.5 : 0.35 + 0.35 * Math.sin(time / 700 + s.x);
    ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,207,63,0.12)'; ctx.beginPath(); ctx.arc(1040, 150, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,120,0.22)'; ctx.beginPath(); ctx.arc(1040, 150, 70, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1c48'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 80) ctx.lineTo(x, 470 + Math.sin(x * 0.011) * 50 + Math.sin(x * 0.03) * 18);
  ctx.lineTo(W, H); ctx.fill();
  ctx.restore();
}
function drawStage() {
  for (const s of STAGE.solids) {
    ctx.fillStyle = '#4d3b2a'; roundRect(s.x, s.y, s.w, s.h + 40, 14); ctx.fill();
    ctx.fillStyle = '#5ec46a'; roundRect(s.x - 6, s.y - 4, s.w + 12, 22, 10); ctx.fill();
    ctx.fillStyle = '#8be38f'; ctx.fillRect(s.x + 4, s.y - 2, s.w - 8, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let x = s.x + 30; x < s.x + s.w - 20; x += 70) ctx.fillRect(x, s.y + 35, 28, 8);
  }
  for (const p of STAGE.platforms) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(p.x + 4, p.y + 6, p.w, 14, 7); ctx.fill();
    ctx.fillStyle = '#c9b6ff'; roundRect(p.x, p.y, p.w, 14, 7); ctx.fill();
    ctx.fillStyle = '#efe8ff'; ctx.fillRect(p.x + 8, p.y + 2, p.w - 16, 3);
  }
}
function drawPlayer(p, time) {
  if (!p.al) return;
  if (p.inv && Math.floor(time / 80) % 2 === 0) ctx.globalAlpha = 0.45;
  const x = p.x, y = p.y, f = p.f || 1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
  // 둔화 상태: 발밑에 파란 고리
  if (p.sl) {
    ctx.strokeStyle = 'rgba(127,184,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 30, 8, 0, 0, Math.PI * 2); ctx.stroke();
  }
  let sx = 1, sy = 1;
  if (!p.g) { sy = p.vy < 0 ? 1.08 : 0.95; sx = 2 - sy; }
  ctx.save(); ctx.translate(x, y);
  if (p.hs && !reduceMotion) ctx.rotate(Math.sin(time / 30) * 0.25);
  ctx.scale(sx, sy);
  if (p.at === 2 && p.ap === 1) {
    ctx.fillStyle = 'rgba(255,207,63,0.35)';
    ctx.beginPath(); ctx.arc(0, -PH / 2, 44 + Math.sin(time / 30) * 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = p.hs ? '#ffffff' : p.c;
  roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
  if (p.sl) { ctx.fillStyle = 'rgba(127,184,255,0.45)'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; roundRect(-PW / 2, -PH * 0.35, PW, PH * 0.35, 10); ctx.fill();
  if (p.b) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-2, -PH - 10, 4, 10); ctx.beginPath(); ctx.arc(0, -PH - 12, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff';
  ctx.fillRect(f * 4 - 2, -PH + 14, 8, 11); ctx.fillRect(f * 4 + 10 * f - 2, -PH + 14, 8, 11);
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(f * 4 + f * 2, -PH + 17, 4, 6); ctx.fillRect(f * 4 + 10 * f + f * 2, -PH + 17, 4, 6);
  let reach = 0;
  if (p.at) { const full = p.at === 2 ? 60 : 46; reach = p.ap === 1 ? -6 : p.ap === 2 ? full : full * 0.4; }
  const fx = f * (PW / 2 + 4 + reach), fy = -PH / 2 - 2;
  if (p.ap === 2) {
    ctx.strokeStyle = p.at === 2 ? 'rgba(255,207,63,0.8)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = p.at === 2 ? 10 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, fy); ctx.lineTo(fx, fy); ctx.stroke();
  }
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(fx, fy, p.at === 2 ? 13 : 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  const lift = p.b ? 12 : 0;
  ctx.font = '700 15px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
  const label = (p.id === myId ? '▼ ' : '') + (p.id === hostLive ? '♛ ' : '') + p.n;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(label, x + 1, y - PH - 13 - lift);
  ctx.fillStyle = p.id === myId ? '#ffcf3f' : '#fff'; ctx.fillText(label, x, y - PH - 14 - lift);
  if (x < 0 || x > W || y < 0) {
    const ax = Math.max(24, Math.min(W - 24, x)), ay = Math.max(24, y);
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ax, ay, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
}
function drawParticles(dt) {
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.ring) {
      const rad = p.grow ? p.r * (1 - a * 0.6) : p.r * (1 - a) + 8;
      if (p.fill) { ctx.fillStyle = `rgba(${p.c},${a * 0.18})`; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = `rgba(${p.c},${a})`; ctx.lineWidth = 4 * a + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.stroke();
    } else if (p.ghost) {
      ctx.fillStyle = `rgba(${p.c},${a * 0.45})`;
      roundRect(p.x - PW / 2, p.y - PH, PW, PH, 12); ctx.fill();
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.nograv) p.vy += 900 * dt; else { p.vx *= 0.92; p.vy *= 0.92; }
      ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); ctx.globalAlpha = 1;
    }
  }
}
function dmgColor(d) {
  const t = Math.min(d / 150, 1);
  return `rgb(255,${Math.round(255 - 200 * t)},${Math.round(255 - 230 * t)})`;
}
function drawHUD(state, players) {
  const list = players.filter((p) => p.im || state.ph !== 'playing');
  const n = list.length;
  const cw = n > 4 ? 132 : 156, gap = 10, total = n * cw + (n - 1) * gap;
  let x0 = (W - total) / 2;
  for (const p of list) {
    const y0 = H - 96;
    ctx.globalAlpha = p.al || state.ph !== 'playing' ? 1 : 0.4;
    ctx.fillStyle = 'rgba(14,12,28,0.8)'; roundRect(x0, y0, cw, 84, 12); ctx.fill();
    ctx.fillStyle = p.c; roundRect(x0, y0, 8, 84, 4); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = '700 14px "Noto Sans KR", sans-serif';
    ctx.fillStyle = p.id === myId ? '#ffcf3f' : '#d8d4f0';
    ctx.fillText(p.n, x0 + 18, y0 + 22, cw - 70);
    ctx.font = '400 32px "Black Han Sans", sans-serif'; ctx.fillStyle = dmgColor(p.dmg);
    ctx.fillText(p.al ? `${p.dmg}%` : 'OUT', x0 + 18, y0 + 58);
    if (state.ph === 'playing' || state.ph === 'ended') {
      for (let i = 0; i < CONFIG.STOCKS; i++) {
        ctx.fillStyle = i < p.st ? p.c : 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(x0 + cw - 18 - i * 16, y0 + 18, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 스킬 쿨타임
    const sk = SKILLS[validSkill(p.sk)];
    const skColor = validSkill(p.sk) === 'slow' ? '#7fb8ff' : '#c77dff';
    const ready = !(p.cd > 0);
    ctx.font = '700 11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = ready ? skColor : '#6d6893';
    ctx.fillText(`Q ${sk.name} ${ready ? '준비' : p.cd.toFixed(1) + 's'}`, x0 + 18, y0 + 76);
    ctx.fillStyle = '#a39fc4'; ctx.textAlign = 'right';
    ctx.fillText(`${p.wn}승`, x0 + cw - 12, y0 + 76);
    ctx.globalAlpha = 1;
    x0 += cw + gap;
  }
}
function bigText(text, y, size, color) {
  ctx.textAlign = 'center'; ctx.font = `400 ${size}px "Black Han Sans", sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(text, W / 2 + 4, y + 5, W - 40);
  ctx.fillStyle = color; ctx.fillText(text, W / 2, y, W - 40);
}
function smallText(text, y) {
  ctx.font = '500 18px "Noto Sans KR", sans-serif'; ctx.fillStyle = '#d8d4f0'; ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y, W - 40);
}
function drawPhase(state, players, dt) {
  const ph = state.ph;
  if (ph === 'waiting') {
    bigText('상대를 기다리는 중', 130, 42, '#ffffff');
    smallText(isHost ? '방장이에요 · 다른 사람이 들어오거나, 오른쪽 위 "봇 추가"로 바로 시작할 수 있어요' : '방장(♛)이 봇을 추가하거나 다른 사람이 들어오면 시작해요', 168);
  } else if (ph === 'countdown') {
    bigText(String(state.tm), 300, 140, '#ffcf3f');
  } else if (ph === 'ended') {
    bigText(state.w ? `${state.w} 승리!` : '무승부', 260, 90, '#ffcf3f');
    smallText(`${state.tm}초 후 다음 라운드`, 305);
  } else if (ph === 'playing') {
    const me = players.find((p) => p.id === myId);
    if (me && !me.im) bigText('관전 중 · 다음 라운드에 참가합니다', 120, 30, '#ffffff');
    else if (me && !me.al) bigText('탈락! 관전 중', 120, 36, '#ff7b7b');
  }
  banners = banners.filter((b) => (b.life -= dt) > 0);
  let by = 220;
  for (const b of banners) {
    ctx.globalAlpha = Math.min(1, b.life / 0.3);
    if (b.small) {
      ctx.font = '700 22px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = b.color || '#fff'; ctx.fillText(b.text, W / 2, by); by += 32;
    } else {
      const s = reduceMotion ? 1 : 1 + (1 - b.life / b.max) * 0.3;
      ctx.save(); ctx.translate(W / 2, 330); ctx.scale(s, s); ctx.translate(-W / 2, -330);
      bigText(b.text, 330, 110, '#ff5a5f'); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}


// ---------------- 메인 루프 ----------------
let last = performance.now(), barCounter = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;

  if (latest && isTouch) {
    const meS = latest.p.find((p) => p.id === myId);
    const cd = meS ? meS.cd : 0;
    $('tSkillCd').textContent = cd > 0 ? cd.toFixed(1) : 'Q';
    $('tSkill').classList.toggle('cool', cd > 0);
  }
  if (online && latest && ++barCounter % 30 === 0) {
    const people = latest.p.filter((p) => !p.b).length;
    $('net').textContent = `같은 방 ${people}명${pingMs != null ? ` · 핑 ${pingMs}ms` : ''}`;
  }

  drawBackground(now);
  if (latest) {
    const players = interpolatedPlayers();
    ctx.save();
    shake *= Math.pow(0.002, dt);
    const sx = (Math.random() - 0.5) * shake * scale, sy = (Math.random() - 0.5) * shake * scale;
    ctx.translate(offX + sx, offY + sy); ctx.scale(scale, scale);
    drawStage();
    players.filter((p) => p.id !== myId).forEach((p) => drawPlayer(p, now));
    players.filter((p) => p.id === myId).forEach((p) => drawPlayer(p, now));
    drawParticles(dt);
    ctx.restore();
    ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale);
    drawHUD(latest, players);
    drawPhase(latest, players, dt);
    ctx.restore();
  } else if ($('lobby').hidden) {
    ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale);
    drawStage(); smallText('방에 연결하는 중…', 200); ctx.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
