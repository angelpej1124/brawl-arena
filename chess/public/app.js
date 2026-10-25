// =====================================================================
//  럭키 체스 — 화면 (로비 · 체스판 · 입력)
//  규칙 계산은 rules.js (서버와 같은 코드), 진짜 판정은 서버가 함
// =====================================================================
'use strict';
const R = window.ChessRules;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} },
  sget(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } },
  sset(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

// ---------------- 기물 그림 (직접 그린 SVG) ----------------
const SHAPES = {
  p: '<circle cx="50" cy="30" r="13"/><path d="M36 80 C38 62 41 52 44 46 L56 46 C59 52 62 62 64 80Z"/><ellipse cx="50" cy="46" rx="15" ry="5"/>',
  r: '<path d="M27 20 h10 v8 h8 v-8 h10 v8 h8 v-8 h10 v19 H27Z"/><path d="M33 39 H67 L64 78 H36Z"/><rect x="29" y="38" width="42" height="6" rx="2"/>',
  n: '<path d="M34 80 C32 64 38 55 47 48 C40 51 31 55 27 51 C23 47 27 40 33 34 C38 28 42 21 51 18 L54 10 L59 18 C72 24 77 42 72 80Z"/><circle class="dt" cx="47" cy="30" r="3.2"/><path class="ln" d="M28 49 L33 46" fill="none"/>',
  b: '<circle cx="50" cy="12" r="5.5"/><path d="M50 17 C63 28 67 42 61 56 L39 56 C33 42 37 28 50 17Z"/><path class="ln" d="M55 29 L46 41" fill="none"/><ellipse cx="50" cy="58" rx="15" ry="5"/><path d="M41 60 C40 68 38 74 36 80 L64 80 C62 74 60 68 59 60Z"/>',
  q: '<circle cx="21" cy="31" r="5"/><circle cx="35" cy="22" r="5"/><circle cx="50" cy="18" r="5"/><circle cx="65" cy="22" r="5"/><circle cx="79" cy="31" r="5"/><path d="M29 76 L21 34 L36 54 L35 25 L46 50 L50 22 L54 50 L65 25 L64 54 L79 34 L71 76Z"/><ellipse cx="50" cy="70" rx="21" ry="4.5"/>',
  k: '<path d="M46 10 h8 v8 h8 v7 h-8 v13 h-8 v-13 h-8 v-7 h8Z"/><path d="M30 76 C24 56 32 42 50 44 C68 42 76 56 70 76Z"/><ellipse cx="50" cy="70" rx="21" ry="4.5"/>',
};
function pieceSvg(p) {
  const white = p === p.toUpperCase();
  const fill = white ? '#fffaf0' : '#231c3d', stroke = white ? '#2a2240' : '#d9d2f2', detail = white ? '#2a2240' : '#d9d2f2';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${fill}" stroke="${stroke}" stroke-width="3.2" stroke-linejoin="round">`
    + SHAPES[p.toLowerCase()].replace(/class="dt"/g, `fill="${detail}" stroke="none"`).replace(/class="ln"/g, `stroke="${detail}"`)
    + `<rect x="24" y="78" width="52" height="11" rx="4"/></g></svg>`;
}
const PIECE_NAME = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' };

// ---------------- 소리 (파일 없이 직접 만듦) ----------------
let sndOn = store.get('chess_snd') !== 'off';
let actx = null;
function beep(freq, dur, type = 'sine', vol = 0.15, at = 0) {
  if (!sndOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + at, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
const SFX = {
  move: () => { beep(520, 0.08, 'triangle', 0.18); },
  cap: () => { beep(220, 0.12, 'square', 0.12); beep(150, 0.14, 'triangle', 0.15, 0.03); },
  check: () => { beep(880, 0.1, 'square', 0.1); beep(1100, 0.12, 'square', 0.08, 0.1); },
  start: () => { [523, 659, 784].forEach((f, i) => beep(f, 0.14, 'triangle', 0.14, i * 0.1)); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.2, 'triangle', 0.16, i * 0.12)); },
  lose: () => { [392, 330, 262].forEach((f, i) => beep(f, 0.22, 'sine', 0.14, i * 0.15)); },
  draw: () => { [440, 440].forEach((f, i) => beep(f, 0.15, 'sine', 0.12, i * 0.18)); },
  tick: () => { beep(1200, 0.03, 'square', 0.05); },
  coin: () => { [1568, 2093, 1568, 2349].forEach((f, i) => beep(f, 0.06, 'sine', 0.08, i * 0.12)); },
  heads: () => { beep(1319, 0.12, 'triangle', 0.14); beep(1760, 0.2, 'triangle', 0.14, 0.1); },
  tails: () => { beep(330, 0.18, 'sine', 0.12); },
  dice: () => { for (let i = 0; i < 6; i++) beep(180 + Math.random() * 220, 0.04, 'square', 0.07, i * 0.09); },
  rps: () => { [660, 660, 880].forEach((f, i) => beep(f, 0.08, 'square', 0.08, i * 0.14)); },
};

// ---------------- 계정 ----------------
const account = { token: store.get('chess_token'), profile: null };
let authMode = 'login';
async function api(p, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (account.token) headers.Authorization = 'Bearer ' + account.token;
  const r = await fetch(p, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let j = {};
  try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const e = new Error(j.error || '서버와 연결하지 못했어요.'); e.status = r.status; throw e; }
  return j;
}
function setAuthMode(m) {
  authMode = m;
  for (const [id, mode] of [['tabLogin', 'login'], ['tabSignup', 'signup'], ['tabGuest', 'guest']]) $(id).setAttribute('aria-selected', String(m === mode));
  $('authForm').hidden = m === 'guest';
  $('guestBox').hidden = m !== 'guest';
  $('pw2Wrap').hidden = m !== 'signup';
  $('pwWarn').hidden = m !== 'signup';
  $('authBtn').textContent = m === 'signup' ? '가입하기' : '로그인';
  $('aPw').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
  $('authMsg').textContent = '';
}
$('tabLogin').onclick = () => setAuthMode('login');
$('tabSignup').onclick = () => setAuthMode('signup');
$('tabGuest').onclick = () => setAuthMode('guest');
$('gNick').value = store.get('chess_guest') || '';
$('authForm').onsubmit = async (e) => {
  e.preventDefault();
  const nick = $('aNick').value.trim(), pw = $('aPw').value;
  if (authMode === 'signup' && pw !== $('aPw2').value) { $('authMsg').textContent = '비밀번호 확인이 달라요.'; return; }
  $('authBtn').disabled = true;
  $('authMsg').textContent = '계정 서버에 연결하는 중… (처음엔 최대 1분 걸릴 수 있어요)';
  try {
    const r = await api('/api/' + authMode, { method: 'POST', body: { nick, pw } });
    account.token = r.token; store.set('chess_token', r.token);
    setProfile(r.profile);
    $('aPw').value = ''; $('aPw2').value = '';
    $('authMsg').textContent = '';
  } catch (err) { $('authMsg').textContent = err.message; }
  $('authBtn').disabled = false;
};
$('logoutBtn').onclick = () => {
  api('/api/logout', { method: 'POST' }).catch(() => {});
  account.token = null; account.profile = null; store.set('chess_token', null);
  setProfile(null);
};
function setProfile(p) {
  account.profile = p;
  $('authBox').hidden = !!p;
  $('meBox').hidden = !p;
  if (p) $('meNick').textContent = p.nick;
  const c = (p && p.chess) || null;
  $('stW').textContent = c ? c.w : '-'; $('stL').textContent = c ? c.l : '-';
  $('stD').textContent = c ? c.d : '-'; $('stG').textContent = c ? c.g : '-';
  $('gemCount').textContent = p ? p.gems.toLocaleString() : '-';
  $('acctText').textContent = p ? `${p.nick} 님의 체스 기록이에요.` : '로그인하면 기록과 보석이 저장돼요.';
  if (p && p.nickWarn) $('acctText').textContent = `닉네임 경고: ${p.nickWarn} — 난투 아레나에서 닉네임을 바꿔야 게임을 할 수 있어요.`;
}
async function loadMe() {
  if (!account.token) return setProfile(null);
  $('acctText').textContent = '계정 확인 중… (처음엔 최대 1분 걸릴 수 있어요)';
  try { setProfile((await api('/api/me')).profile); }
  catch (e) {
    if (e.status === 401) { account.token = null; store.set('chess_token', null); setProfile(null); }
    else $('acctText').textContent = e.message;
  }
}

// ---------------- 로비: 방 고르기 ----------------
let roomTab = 'list', pickedRoom = null;
function setRoomTab(t) {
  roomTab = t;
  for (const [id, k] of [['rtList', 'list'], ['rtCreate', 'create'], ['rtCode', 'code']]) $(id).setAttribute('aria-selected', String(t === k));
  $('rpList').hidden = t !== 'list'; $('rpCreate').hidden = t !== 'create'; $('rpCode').hidden = t !== 'code';
  $('playBtn').textContent = t === 'list' ? '빠른 입장' : t === 'create' ? '방 만들기' : '입장하기';
}
$('rtList').onclick = () => setRoomTab('list');
$('rtCreate').onclick = () => setRoomTab('create');
$('rtCode').onclick = () => setRoomTab('code');
$('roomcode').value = store.get('chess_room') || '';
const timeLabel = (m) => (m ? m + '분' : '무제한');
async function loadRooms() {
  if (!$('lobby').hidden) {
    try {
      const r = await api('/api/rooms');
      $('onlineNow').textContent = r.online;
      if (r.brawl && /^https?:\/\//.test(r.brawl)) $('brawlLink').href = r.brawl;
      const ul = $('roomList');
      ul.innerHTML = r.rooms.map((x) => `<li><button type="button" data-code="${esc(x.code)}" ${x.full ? 'disabled' : ''}>
        <span class="rt">${esc(x.title)}</span>
        <small>${x.phase === 'playing' ? '대국 중 · 구경' : x.players === 2 ? '2/2 · 구경' : x.players + '/2 · 대기'} · ${timeLabel(x.time)}</small></button></li>`).join('');
      $('roomEmpty').hidden = r.rooms.length > 0;
      for (const b of ul.querySelectorAll('button')) b.onclick = () => go('listed', { room: b.dataset.code });
    } catch (e) {}
  }
}
async function loadRanking() {
  try {
    const r = await api('/api/ranking');
    $('rank').innerHTML = (r.ranking || []).map((x, i) => `<li><span>${i + 1}. ${esc(x.nick)}</span><small>${x.w}승 ${x.l}패 ${x.d}무</small></li>`).join('');
    $('rankEmpty').textContent = (r.ranking || []).length ? '' : '아직 기록이 없어요. 첫 승리의 주인공이 되어 보세요!';
  } catch (e) { $('rankEmpty').textContent = '랭킹을 불러오지 못했어요.'; }
}
$('playBtn').onclick = () => {
  if (roomTab === 'list') go('quick');
  else if (roomTab === 'create') go('create', { title: $('roomTitle').value.trim() });
  else {
    const code = $('roomcode').value.trim().toLowerCase();
    if (!code) { $('err').textContent = '초대 코드를 써 주세요.'; return; }
    store.set('chess_room', code);
    go('code', { room: code });
  }
};

// ---------------- 연결 ----------------
let ws = null, myId = null, room = null, joinMsg = null, leaving = false, reconnectUntil = 0;
function identity() {
  if (account.profile) return { token: account.token };
  if (authMode !== 'guest') return null;
  const g = $('gNick').value.trim();
  store.set('chess_guest', g);
  return { guest: g };
}
function go(mode, extra = {}) {
  $('err').textContent = '';
  const who = identity();
  if (!who) { $('err').textContent = '로그인하거나, 게스트 탭에서 닉네임을 써 주세요.'; return; }
  if (account.profile && account.profile.nickWarn) { $('err').textContent = '닉네임 경고를 받았어요. 난투 아레나에서 닉네임을 바꿔 주세요.'; return; }
  connect({ t: 'join', mode, ...extra, ...who });
}
function connect(msg) {
  joinMsg = msg; leaving = false;
  $('playBtn').disabled = true;
  if (!msg.resumeOnly) $('err').textContent = '';
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const s = new WebSocket(`${proto}//${location.host}/ws`);
  ws = s;
  s.onopen = () => s.send(JSON.stringify(msg));
  s.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } onMsg(m); };
  s.onclose = () => {
    if (ws !== s) return;
    ws = null;
    $('playBtn').disabled = false;
    if (leaving || !room) return;
    // 대국 중에 끊기면 같은 자리로 다시 연결 (1분 안에)
    const res = store.sget('chess_resume');
    if (res && room.phase === 'playing' && room.you >= 0) {
      if (!reconnectUntil) reconnectUntil = Date.now() + 55000;
      if (Date.now() < reconnectUntil) {
        toast('연결이 끊겼어요. 다시 연결하는 중…');
        setTimeout(() => connect({ t: 'join', room: res.room, resume: res.secret, resumeOnly: true }), 2000);
        return;
      }
    }
    toast('연결이 끊겼어요.');
    backToLobby();
  };
}
function onMsg(m) {
  if (m.t === 'welcome') {
    myId = m.id; reconnectUntil = 0;
    $('playBtn').disabled = false;
    $('lobby').hidden = true; $('play').hidden = false;
    $('roomName').innerHTML = m.isPublic ? `<b>${esc(m.title)}</b>` : `초대 코드 <b>${esc(m.room)}</b>`;
    resultSeen = false; gemsMsg = null; flipped = false;
  } else if (m.t === 'state') {
    onState(m.room);
  } else if (m.t === 'error') {
    $('playBtn').disabled = false;
    if (room) toast(m.msg); else $('err').textContent = m.msg;
    if (ws) { leaving = true; ws.close(); }
  } else if (m.t === 'notice') {
    toast(m.msg);
  } else if (m.t === 'noresume') {
    store.sset('chess_resume', null);
    leaving = true; if (ws) ws.close();
    if (room) { toast('그 판은 이미 끝났어요.'); backToLobby(); }
  } else if (m.t === 'gems') {
    gemsMsg = m;
    if (m.profile) setProfile(m.profile);
    renderResult();
  }
}
function backToLobby() {
  room = null; myId = null; sel = null; promoAsk = null;
  $('play').hidden = true; $('lobby').hidden = false;
  $('playBtn').disabled = false;
  loadRooms(); loadRanking(); loadMe();
}
$('exitBtn').onclick = () => {
  if (room && room.phase === 'playing' && room.you >= 0) {
    if (!confirm('지금 나가면 기권으로 져요. 나갈까요?')) return;
    send({ t: 'resign' });
  }
  leaving = true;
  store.sset('chess_resume', null);
  if (ws) ws.close();
  backToLobby();
};
function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }

// ---------------- 판 상태 ----------------
let myRpsPick = null, stageKey = '', stageAt = 0;
let sel = null, promoAsk = null, flipped = false, resultSeen = false, gemsMsg = null, gotAt = 0, lastMoveCount = -1;
function myColor() { return room && room.you >= 0 && room.seats[room.you] ? room.seats[room.you].color : null; }
function onState(r) {
  const prev = room;
  room = r; gotAt = performance.now();
  if (r.secret && r.phase === 'playing') store.sset('chess_resume', { room: r.code, secret: r.secret });
  else if (r.phase !== 'playing') store.sset('chess_resume', null);
  const n = r.game ? r.game.moves.length : 0;
  if (!prev || r.phase !== 'playing' || n !== lastMoveCount || (r.game && r.game.lucky && r.game.stage !== 'move')) { sel = null; promoAsk = null; }
  // 단계가 바뀐 순간을 기억 (애니메이션이 다시 그려져도 처음부터 안 하게)
  const sk = r.game && r.game.lucky ? r.game.turns.length + ':' + r.game.stage : '';
  if (sk !== stageKey) { stageKey = sk; stageAt = performance.now(); if (r.game && r.game.stage === 'rps') myRpsPick = null; }
  lastMoveCount = n;
  // 소리 · 알림
  const ev = r.ev;
  if (ev) {
    if (ev.k === 'start') { SFX.start(); resultSeen = false; gemsMsg = null; flipped = false; toast(`흑백 추첨! 백 ${ev.w} · 흑 ${ev.b}`); }
    else if (ev.k === 'move') { if (ev.chk) SFX.check(); else if (ev.cap) SFX.cap(); else SFX.move(); }
    else if (ev.k === 'over') {
      const mc = myColor();
      if (!ev.winner) SFX.draw(); else if (mc && ev.winner === mc) SFX.win(); else if (mc) SFX.lose(); else SFX.win();
    }
    else if (ev.k === 'coin') SFX.coin();
    else if (ev.k === 'dice') SFX.dice();
    else if (ev.k === 'rps') { SFX.rps(); myRpsPick = null; }
    else if (ev.k === 'rpsres') { if (ev.res === 'tie') SFX.draw(); else { const mc = myColor(), g = r.game; const iWon = mc && ((g.rps.atk === mc) === (ev.res === 'win')); if (!mc || iWon) SFX.win(); else SFX.lose(); } }
    else if (ev.k === 'rpslost') SFX.cap();
    else if (ev.k === 'drawoffer') toast(`${ev.n} 님이 무승부를 제안했어요.`);
    else if (ev.k === 'drawno') toast(`${ev.n} 님이 무승부를 거절했어요.`);
    else if (ev.k === 'away') toast(`${ev.n} 님의 연결이 끊겼어요. 1분 안에 안 돌아오면 패배예요.`);
    else if (ev.k === 'back') toast(`${ev.n} 님이 돌아왔어요.`);
    else if (ev.k === 'join' && prev) toast(`${ev.n} 님이 들어왔어요.`);
    else if (ev.k === 'leave') toast(`${ev.n} 님이 나갔어요.`);
  }
  render();
}

// 아래쪽에 올 자리: 내가 앉았으면 나, 아니면 첫 번째 자리
function bottomSeat() { const b = room.you >= 0 ? room.you : 0; return flipped ? 1 - b : b; }
function orientation() {
  const s = room.seats[bottomSeat()];
  if (s && s.color) return s.color;
  const o = room.seats[1 - bottomSeat()];
  if (o && o.color) return R.other(o.color);
  return flipped ? 'b' : 'w';
}
function render() {
  if (!room) return;
  renderBoard(); renderStrips(); renderPanel(); renderMoves(); renderResult();
}
function legalFrom(sq) {
  const g = room.game;
  if (!g || room.phase !== 'playing' || myColor() !== g.st.turn) return [];
  if (g.lucky) return g.stage === 'move' ? R.luckyMoves(g.st).filter((m) => m.from === sq) : [];
  return R.legalMoves(g.st).filter((m) => m.from === sq);
}
function renderBoard() {
  const g = room.game, st = g ? g.st : R.initial(), o = orientation();
  const board = $('board');
  const chk = g && g.lucky ? -1 : g && room.phase === 'playing' && R.inCheck(st) ? R.kingSq(st.b, st.turn)
    : g && room.result && room.result.reason === 'checkmate' ? R.kingSq(st.b, st.turn) : -1;
  const targets = sel != null ? legalFrom(sel) : [];
  let html = '';
  for (let i = 0; i < 64; i++) {
    const sq = o === 'w' ? i : 63 - i;
    const f = sq & 7, rk = sq >> 3;
    const cls = ['sq', (f + rk) % 2 === 0 ? 'l' : 'd'];
    if (g && g.last && (sq === g.last.from || sq === g.last.to)) cls.push('last');
    if (sq === sel) cls.push('sel');
    if (g && g.lucky && g.rps && (sq === g.rps.from || sq === g.rps.victim)) cls.push(sq === g.rps.from ? 'atk' : 'vic');
    if (sq === chk) cls.push('chk');
    if (dragFrom === sq && dragging) cls.push('drag-from');
    let inner = st.b[sq] ? pieceSvg(st.b[sq]) : '';
    const t = targets.find((m) => m.to === sq);
    if (t) inner += `<i class="tgt${st.b[sq] || t.flag === 'e' ? ' cap' : ''}"></i>`;
    const col = i % 8, row = (i / 8) | 0;
    if (row === 7) inner += `<span class="co f">${'abcdefgh'[f]}</span>`;
    if (col === 0) inner += `<span class="co r">${8 - rk}</span>`;
    const label = R.sqName(sq) + (st.b[sq] ? ' ' + (st.b[sq] === st.b[sq].toUpperCase() ? '백 ' : '흑 ') + PIECE_NAME[st.b[sq].toLowerCase()] : '');
    html += `<div class="${cls.join(' ')}" data-sq="${sq}" aria-label="${label}">${inner}</div>`;
  }
  // 프로모션 고르기 · 결과 창은 판 위에 띄움
  html += '<div class="board-msg" id="boardMsg" hidden></div>';
  board.innerHTML = html;
  if (promoAsk) {
    const c = myColor();
    $('boardMsg').hidden = false;
    $('boardMsg').innerHTML = `<div><div class="small">어떤 기물로 바꿀까요?</div><div class="promo">${['q', 'r', 'b', 'n'].map((p) =>
      `<button type="button" data-p="${p}" aria-label="${PIECE_NAME[p]}">${pieceSvg(c === 'w' ? p.toUpperCase() : p)}</button>`).join('')}</div>
      <button class="link" type="button" id="promoCancel">취소</button></div>`;
    for (const b of $('boardMsg').querySelectorAll('[data-p]')) b.onclick = () => { send({ t: 'move', from: promoAsk.from, to: promoAsk.to, promo: b.dataset.p }); promoAsk = null; sel = null; render(); };
    $('promoCancel').onclick = () => { promoAsk = null; render(); };
  } else if (g && g.lucky && room.phase === 'playing') renderLuckyOverlay();
}
function material(st) {
  // 처음 기물 수와 비교해서 잡힌 기물 계산
  const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }, val = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const cnt = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const p of st.b) if (p && p.toLowerCase() !== 'k') cnt[R.colorOf(p)][p.toLowerCase()]++;
  const out = { w: [], b: [], score: { w: 0, b: 0 } };
  for (const c of ['w', 'b']) {
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const lost = Math.max(0, start[t] - cnt[c][t]);
      for (let i = 0; i < lost; i++) out[R.other(c)].push(c === 'w' ? t.toUpperCase() : t);   // 상대가 잡은 것
      out.score[c] += cnt[c][t] * val[t];
    }
  }
  return out;
}
function fmtClock(ms) {
  if (ms == null) return '';
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000);
  if (ms < 10000) return (ms / 1000).toFixed(1);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function clockOf(c) {
  const g = room.game;
  if (!g || !g.clock) return null;
  let v = g.clock[c];
  if (room.phase === 'playing' && g.st.turn === c) v -= performance.now() - gotAt;
  return v;
}
function renderStrips() {
  const g = room.game, mat = g ? material(g.st) : null;
  for (const [el, i] of [[$('stripBot'), bottomSeat()], [$('stripTop'), 1 - bottomSeat()]]) {
    const s = room.seats[i];
    const c = s && s.color ? s.color : (el.id === 'stripBot' ? orientation() : R.other(orientation()));
    if (!s) { el.innerHTML = `<div class="who"><span class="colorchip ${c}"></span><span class="nm" style="color:var(--muted)">빈자리 — 상대를 기다리는 중</span></div>`; continue; }
    const tags = [];
    if (s.host) tags.push('<span class="tag">방장</span>');
    if (s.guest) tags.push('<span class="tag">게스트</span>');
    if (s.away) tags.push('<span class="tag away">연결 끊김</span>');
    else if (room.phase === 'waiting' && s.ready) tags.push('<span class="tag rdy">준비 완료</span>');
    if (i === room.you) tags.push('<span class="tag">나</span>');
    if (g && g.lucky && room.phase === 'playing' && s.color === g.st.turn) tags.push(`<span class="tag turn">${g.stage === 'move' ? '🎲 ' + g.left + '번 남음' : '차례'}</span>`);
    let caps = '';
    if (mat && s.color) {
      const diff = mat.score[s.color] - mat.score[R.other(s.color)];
      caps = `<div class="caps">${mat[s.color].map(pieceSvg).join('')}${diff > 0 ? `<span class="adv">+${diff}</span>` : ''}</div>`;
    }
    const showClock = g && g.clock && s.color;
    el.innerHTML = `<div class="who"><span class="colorchip ${s.color || c}"></span><div style="min-width:0"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="nm">${esc(s.name)}</span>${tags.join('')}</div>${caps}</div></div>`
      + (showClock ? `<div class="clock" data-c="${s.color}"></div>` : '');
  }
  updateClocks();
}
let lastTickSec = -1;
function updateClocks() {
  if (!room || !room.game) return;
  for (const el of document.querySelectorAll('.clock')) {
    const c = el.dataset.c, v = clockOf(c);
    el.textContent = fmtClock(v);
    const run = room.phase === 'playing' && room.game.st.turn === c;
    el.classList.toggle('run', run && v >= 20000);
    el.classList.toggle('low', run && v < 20000);
    if (run && v < 10000 && c === myColor()) { const sec = Math.ceil(v / 1000); if (sec !== lastTickSec) { lastTickSec = sec; SFX.tick(); } }
  }
}
setInterval(updateClocks, 100);

function renderPanel() {
  const g = room.game, you = room.you, me = you >= 0 ? room.seats[you] : null, mc = myColor();
  const opp = you >= 0 ? room.seats[1 - you] : null;
  let status = '', sub = '';
  const btns = [];
  if (room.phase === 'playing') {
    const turnSeat = room.seats.find((s) => s && s.color === g.st.turn);
    const inChk = !g.lucky && R.inCheck(g.st);
    if (g.lucky) {
      const L = luckyStatusText(g, mc, turnSeat);
      status = L.status; sub = L.sub;
      for (const b of L.btns) btns.push(b);
    }
    if (mc && g.lucky) {
      sub = sub || `나는 ${mc === 'w' ? '백(흰색)' : '흑(검은색)'}`;
      if (g.draw && g.draw !== mc) {
        sub = '상대가 무승부를 제안했어요';
        btns.push('<button class="btn ok" data-a="drawyes">무승부 받기</button>', '<button class="btn" data-a="drawno">거절</button>');
      } else btns.push(`<button class="btn" data-a="drawoffer" ${g.draw === mc ? 'disabled' : ''}>${g.draw === mc ? '제안 보냄…' : '무승부 제안'}</button>`);
      btns.push(`<button class="btn warn${g.draw && g.draw !== mc ? ' wide' : ''}" data-a="resign">기권</button>`);
    } else if (g.lucky) {
      sub = '구경하는 중이에요 · ' + sub;
    } else if (mc) {
      status = mc === g.st.turn ? (inChk ? '체크! 왕을 지키세요' : '내 차례예요') : `${turnSeat ? esc(turnSeat.name) : '상대'} 님 차례`;
      sub = `나는 ${mc === 'w' ? '백(흰색)' : '흑(검은색)'} · 백이 먼저 둬요`;
      if (g.draw && g.draw !== mc) {
        sub = '상대가 무승부를 제안했어요';
        btns.push('<button class="btn ok" data-a="drawyes">무승부 받기</button>', '<button class="btn" data-a="drawno">거절</button>');
      } else {
        btns.push(`<button class="btn" data-a="drawoffer" ${g.draw === mc ? 'disabled' : ''}>${g.draw === mc ? '제안 보냄…' : '무승부 제안'}</button>`);
      }
      btns.push(`<button class="btn warn${g.draw && g.draw !== mc ? ' wide' : ''}" data-a="resign">기권</button>`);
    } else {
      status = `대국 중 — ${turnSeat ? esc(turnSeat.name) : ''} 님 차례${inChk ? ' (체크)' : ''}`;
      sub = '구경하는 중이에요';
    }
  } else {
    const both = room.seats[0] && room.seats[1];
    if (me) {
      if (!both) { status = '상대를 기다리는 중…'; sub = room.isPublic ? '공개 방 목록에 보여요. 빠른 입장으로도 들어와요.' : `친구에게 초대 코드 <b>${esc(room.code)}</b> 를 알려 주세요.`; }
      else if (me.ready && !(opp && opp.ready)) { status = '준비 완료! 상대를 기다려요'; sub = '둘 다 준비하면 흑백을 랜덤으로 정하고 바로 시작해요.'; }
      else { status = '준비를 누르면 시작해요'; sub = '둘 다 준비하면 흑백을 랜덤으로 정하고 바로 시작해요.'; }
      btns.push(`<button class="btn ${me.ready ? 'ok' : 'main'} wide" data-a="ready" ${both ? '' : 'disabled'}>${me.ready ? '준비 취소' : (room.result ? '한 판 더! 준비' : '준비')}</button>`);
      btns.push('<button class="btn wide" data-a="stand">일어나서 구경하기</button>');
    } else {
      status = both ? '두 사람이 준비하고 있어요' : '빈자리가 있어요';
      sub = '구경하는 중이에요';
      if (!both) btns.push('<button class="btn main wide" data-a="sit">앉아서 두기</button>');
    }
  }
  $('status').innerHTML = `${status}<small>${sub}</small>`;
  $('btns').innerHTML = btns.join('');
  for (const b of $('btns').querySelectorAll('button')) b.onclick = () => act(b.dataset.a, b);
  // 규칙 · 시간 (방장만 바꿈)
  $('timeBox').hidden = room.phase === 'playing';
  $('timeWho').textContent = room.hostMe ? '(방장이 정해요)' : '(방장만 바꿀 수 있어요)';
  $('times').innerHTML = [3, 5, 10, 0].map((m) => `<button type="button" data-m="${m}" aria-pressed="${room.time === m}" ${room.hostMe ? '' : 'disabled'}>${timeLabel(m)}</button>`).join('');
  for (const b of $('times').querySelectorAll('button')) b.onclick = () => send({ t: 'time', min: Number(b.dataset.m) });
  const specs = room.specs;
  $('specs').hidden = !specs.length;
  $('specs').innerHTML = `구경 중 ${specs.length}명: ${specs.map((s) => esc(s.name) + (s.host ? ' (방장)' : '')).join(', ')}`;
}
let resignArm = 0;
function act(a, btn) {
  if (a === 'ready') send({ t: 'ready', on: !room.seats[room.you].ready });
  else if (a === 'stand') send({ t: 'stand' });
  else if (a === 'sit') send({ t: 'sit' });
  else if (a === 'coin') send({ t: 'coin' });
  else if (a === 'dice') send({ t: 'dice' });
  else if (a === 'drawoffer') send({ t: 'draw', act: 'offer' });
  else if (a === 'drawyes') send({ t: 'draw', act: 'accept' });
  else if (a === 'drawno') send({ t: 'draw', act: 'decline' });
  else if (a === 'resign') {
    // 실수로 누르지 않게 두 번 눌러야 기권
    if (Date.now() - resignArm < 3000) { send({ t: 'resign' }); resignArm = 0; }
    else { resignArm = Date.now(); btn.textContent = '한 번 더 누르면 기권'; setTimeout(() => { if (room) renderPanel(); }, 3000); }
  }
}
function renderMoves() {
  if (room.game && room.game.lucky) return renderLuckyLog();
  $('moves').classList.remove('lucky');
  const mv = room.game ? room.game.moves : [];
  let html = '';
  for (let i = 0; i < mv.length; i += 2) html += `<span class="n">${i / 2 + 1}.</span><span>${esc(mv[i])}</span><span>${mv[i + 1] ? esc(mv[i + 1]) : ''}</span>`;
  const box = $('moves');
  box.innerHTML = html;
  // 마지막 수만 강조
  box.querySelectorAll('span:not(.n)').forEach((s) => (s.style.cssText = ''));
  const all = [...box.querySelectorAll('span:not(.n)')].filter((s) => s.textContent);
  if (all.length) all[all.length - 1].style.cssText = 'color:var(--accent);font-weight:700';
  $('movesEmpty').hidden = mv.length > 0;
  box.scrollTop = box.scrollHeight;
}
function renderResult() {
  const box = $('boardMsg');
  if (!box || promoAsk || !room || room.phase !== 'waiting' || !room.result || resultSeen) return;
  const r = room.result, mc = myColor();
  const name = (c) => { const s = room.seats.find((x) => x && x.color === c); return s ? s.name : (c === 'w' ? '백' : '흑'); };
  let big;
  if (!r.winner) big = '무승부';
  else if (mc) big = r.winner === mc ? '승리! ☘' : '패배';
  else big = `${esc(name(r.winner))} 승리`;
  let gems = '';
  if (gemsMsg) gems = gemsMsg.gained ? `<div class="gems">보석 +${gemsMsg.gained}</div>` : `<div class="small">${esc(gemsMsg.why || '')}</div>`;
  else if (mc && room.you >= 0 && !room.seats[room.you].guest && r.enough) gems = '<div class="small">보석 받는 중…</div>';
  else if (mc && room.seats[room.you] && room.seats[room.you].guest) gems = '<div class="small">게스트는 보석을 받지 않아요. 가입하면 이기면 +100!</div>';
  box.hidden = false;
  box.innerHTML = `<div><div class="big">${big}</div><div class="small">${esc(r.text)}${r.winner ? ` · ${esc(name(r.winner))} (${r.winner === 'w' ? '백' : '흑'})` : ''}</div>${gems}
    <button class="btn" type="button" id="resultClose" style="margin-top:12px">판 보기</button></div>`;
  $('resultClose').onclick = () => { resultSeen = true; box.hidden = true; };
}

// ---------------- 입력: 누르기 · 끌어 놓기 ----------------
let dragFrom = null, dragging = false, downXY = null;
function sqAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const s = el && el.closest && el.closest('.sq');
  return s ? Number(s.dataset.sq) : null;
}
function tryMove(from, to) {
  const list = legalFrom(from).filter((m) => m.to === to);
  if (!list.length) return false;
  if (list[0].promo) { promoAsk = { from, to }; render(); return true; }
  send({ t: 'move', from, to });
  const g = room.game;
  if (g.lucky) { sel = null; render(); return true; }
  // 서버 확인 전에 미리 움직여 보여 줌
  g.st = R.apply(g.st, list[0]); g.last = { from, to };
  sel = null; render();
  return true;
}
$('board').addEventListener('pointerdown', (e) => {
  if (!room || promoAsk || e.target.closest('.board-msg')) return;
  const sq = sqAt(e.clientX, e.clientY);
  if (sq == null) return;
  const g = room.game, mc = myColor();
  if (sel != null && sel !== sq && tryMove(sel, sq)) return;
  const p = g && g.st.b[sq];
  if (p && R.colorOf(p) === mc && room.phase === 'playing') {
    sel = sq; dragFrom = sq; dragging = false; downXY = [e.clientX, e.clientY];
    $('board').setPointerCapture(e.pointerId);
    render();
  } else { sel = null; render(); }
});
$('board').addEventListener('pointermove', (e) => {
  if (dragFrom == null) return;
  if (!dragging && Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 6) {
    dragging = true;
    const size = $('board').getBoundingClientRect().width / 8 * 1.1;
    const gh = $('ghost');
    gh.style.width = gh.style.height = size + 'px';
    gh.innerHTML = pieceSvg(room.game.st.b[dragFrom]);
    gh.hidden = false;
    render();
  }
  if (dragging) { $('ghost').style.left = e.clientX + 'px'; $('ghost').style.top = e.clientY + 'px'; }
});
function endDrag(e) {
  if (dragFrom == null) return;
  const from = dragFrom, wasDrag = dragging;
  dragFrom = null; dragging = false; $('ghost').hidden = true;
  if (wasDrag) {
    const to = sqAt(e.clientX, e.clientY);
    if (to != null && to !== from && tryMove(from, to)) return;
    render();
  }
}
$('board').addEventListener('pointerup', endDrag);
$('board').addEventListener('pointercancel', () => { dragFrom = null; dragging = false; $('ghost').hidden = true; if (room) render(); });

$('flipBtn').onclick = () => { flipped = !flipped; render(); };
function updSnd() { $('sndBtn').classList.toggle('off', !sndOn); $('sndBtn').textContent = sndOn ? '소리 켬' : '소리 끔'; }
$('sndBtn').onclick = () => { sndOn = !sndOn; store.set('chess_snd', sndOn ? 'on' : 'off'); updSnd(); if (sndOn) SFX.move(); };
updSnd();

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

// ---------------- 시작 ----------------
setAuthMode('login');
setRoomTab('list');
loadMe(); loadRooms(); loadRanking();
setInterval(loadRooms, 4000);
setInterval(() => { if (!$('lobby').hidden) loadRanking(); }, 30000);
// 새로고침해도 진행 중이던 판으로 돌아가기
const pending = store.sget('chess_resume');
if (pending) connect({ t: 'join', room: pending.room, resume: pending.secret, resumeOnly: true });

// =====================================================================
//  럭키 룰 화면: 동전 · 주사위 · 가위바위보
// =====================================================================
const HAND = { s: { e: '✌️', t: '가위' }, r: { e: '✊', t: '바위' }, p: { e: '✋', t: '보' } };
const colorName = (c) => (c === 'w' ? '백' : '흑');
function seatName(c) { const s = room.seats.find((x) => x && x.color === c); return s ? s.name : colorName(c); }
function waitLeft() { const g = room.game; return Math.max(0, (g.wait || 0) - (performance.now() - gotAt)); }
// 받침에 맞는 조사 (나이트가 / 비숍이, 나이트를 / 룩을)
function josa(w, withB, without) { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c < 11172 && c % 28 ? withB : without); }
function pieceKo(sq) { const p = room.game.st.b[sq]; return p ? PIECE_NAME[p.toLowerCase()] : '기물'; }

function luckyStatusText(g, mc, turnSeat) {
  const mine = mc && mc === g.st.turn, who = turnSeat ? esc(turnSeat.name) + ' 님' : '상대';
  const out = { status: '', sub: '', btns: [] };
  if (g.stage === 'coin') {
    out.status = mine ? '내 차례! 동전을 던져요' : `${who}이 동전을 던질 차례`;
    out.sub = '앞면이면 주사위, 뒷면이면 차례가 넘어가요';
    if (mine) out.btns.push('<button class="btn main wide" data-a="coin">🪙 동전 던지기</button>');
  } else if (g.stage === 'coinShow') {
    out.status = '동전이 돌아가요…';
  } else if (g.stage === 'dice') {
    out.status = mine ? '앞면! 주사위를 굴려요' : `앞면! ${who}이 주사위를 굴릴 차례`;
    out.sub = '나온 수만큼 꼭 다 움직여요 (같은 기물을 여러 번 움직여도 돼요)';
    if (mine) out.btns.push('<button class="btn main wide" data-a="dice">🎲 주사위 굴리기</button>');
  } else if (g.stage === 'diceShow') {
    out.status = '주사위가 굴러가요…';
  } else if (g.stage === 'move') {
    out.status = mine ? `🎲 ${g.dice} — 남은 이동 ${g.left}번` : `${who}이 움직이는 중 (남은 ${g.left}번)`;
    out.sub = '상대 기물을 잡으려면 가위바위보! 킹을 잡으면 승리';
  } else if (g.stage === 'rps' || g.stage === 'rpsShow') {
    out.status = '✊ 가위바위보 중!';
    out.sub = `${esc(seatName(g.rps.atk))} 님의 ${pieceKo(g.rps.from)} → ${esc(seatName(R.other(g.rps.atk)))} 님의 ${pieceKo(g.rps.victim)}`;
  }
  return out;
}

const auto = (txt) => `<div class="small auto" data-wait="1">${txt}</div>`;
function renderLuckyOverlay() {
  const g = room.game, box = $('boardMsg'), mc = myColor();
  const mine = mc && mc === g.st.turn;
  let html = '';
  if (g.stage === 'coin' || g.stage === 'coinShow') {
    const face = g.stage === 'coinShow' ? (g.coin === 'H' ? 'h' : 't') : '';
    const res = g.stage === 'coinShow'
      ? `<div class="big reveal">${g.coin === 'H' ? '앞면!' : '뒷면…'}</div><div class="small reveal">${g.coin === 'H' ? '주사위를 굴려요' : `${esc(seatName(R.other(g.st.turn)))} 님 차례로 넘어가요`}</div>`
      : `<div class="small">${mine ? '눌러서 동전을 던지세요' : `${esc(seatName(g.st.turn))} 님이 던질 차례`}</div>`;
    html = `<div class="lk"><div class="lk-who">${colorName(g.st.turn)} · ${esc(seatName(g.st.turn))}</div>
      <button type="button" class="coin ${face ? 'spin-' + face : ''}" data-a="coin" ${mine && g.stage === 'coin' ? '' : 'disabled'} aria-label="동전 던지기">
        <span class="cf front">☘<small>앞</small></span><span class="cf back">✕<small>뒤</small></span></button>
      ${res}${g.stage === 'coin' ? auto('') : ''}</div>`;
  } else if (g.stage === 'dice' || g.stage === 'diceShow') {
    html = `<div class="lk"><div class="lk-who">${colorName(g.st.turn)} · ${esc(seatName(g.st.turn))}</div>
      <button type="button" class="die ${g.stage === 'diceShow' ? 'rolling' : ''}" id="die" data-a="dice" data-final="${g.dice || 0}" ${mine && g.stage === 'dice' ? '' : 'disabled'} aria-label="주사위 굴리기">${dieSvg(g.dice || 6)}</button>
      ${g.stage === 'diceShow' ? `<div class="big reveal">${g.dice}! ${g.dice}번 움직여요</div>` : `<div class="small">${mine ? '눌러서 주사위를 굴리세요' : `${esc(seatName(g.st.turn))} 님이 굴릴 차례`}</div>${auto('')}`}</div>`;
  } else if (g.stage === 'rps' || g.stage === 'rpsShow') {
    html = rpsHtml(g, mc);
  }
  if (!html) return;
  box.hidden = false;
  box.classList.add('lucky-msg');
  box.innerHTML = html;
  for (const b of box.querySelectorAll('[data-a]')) b.onclick = () => { if (!b.disabled) act(b.dataset.a, b); };
  for (const b of box.querySelectorAll('[data-pick]')) b.onclick = () => { myRpsPick = b.dataset.pick; send({ t: 'rps', pick: b.dataset.pick }); renderBoard(); };
  if (g.stage === 'diceShow') animateDie();
  updateWaits();
}
function rpsHtml(g, mc) {
  const r = g.rps, atk = r.atk, def = R.other(atk);
  const amIn = !!mc, myRole = mc === atk ? 'atk' : 'def';
  const head = `<div class="lk-who">✊✌️✋ 가위바위보!</div>
    <div class="small">${esc(seatName(atk))} 님의 <b>${josa(pieceKo(r.from), '이', '가')}</b> ${esc(seatName(def))} 님의 <b>${josa(pieceKo(r.victim), '을', '를')}</b> 노려요</div>`;
  if (g.stage === 'rps') {
    const iPicked = mc && r.picked[mc];
    if (amIn && !iPicked) {
      return `<div class="lk">${head}<div class="small" style="color:var(--text)">${myRole === 'atk' ? '이기면 잡고, 지면 내 기물이 죽어요' : '이기면 막고 상대 기물이 죽어요'}</div>
        <div class="hands">${['s', 'r', 'p'].map((k) => `<button type="button" class="hand" data-pick="${k}"><span>${HAND[k].e}</span>${HAND[k].t}</button>`).join('')}</div>${auto('초 뒤엔 랜덤으로 골라요')}</div>`;
    }
    const waitTxt = amIn ? `<div class="hands"><div class="hand chosen"><span>${HAND[myRpsPick] ? HAND[myRpsPick].e : '❔'}</span>내가 고름</div><div class="hand hidden-hand"><span>❔</span>상대 고르는 중…</div></div>`
      : `<div class="small">${['w', 'b'].map((c) => `${esc(seatName(c))}: ${r.picked[c] ? '골랐어요 ✔' : '고르는 중…'}`).join(' · ')}</div>`;
    return `<div class="lk">${head}${waitTxt}${auto('')}</div>`;
  }
  // 공개
  const sh = r.show;
  const leftC = amIn ? mc : atk, rightC = R.other(leftC);
  const pick = (c) => (c === atk ? sh.a : sh.d);
  let msg;
  if (sh.res === 'tie') msg = '비겼어요! 다시 한 번';
  else {
    const atkWon = sh.res === 'win';
    if (!amIn) msg = atkWon ? `${esc(seatName(atk))} 님이 잡았어요!` : `${esc(seatName(def))} 님이 막았어요! 공격한 ${josa(pieceKo(r.from), '이', '가')} 죽었어요`;
    else if (mc === atk) msg = atkWon ? '이겼어요! 잡았어요 ☘' : `졌어요… 내 ${josa(pieceKo(r.from), '이', '가')} 죽었어요`;
    else msg = atkWon ? `졌어요… 내 ${josa(pieceKo(r.victim), '이', '가')} 잡혔어요` : `이겼어요! 막아 내고 상대 ${josa(pieceKo(r.from), '을', '를')} 없앴어요 ☘`;
  }
  const autoNote = sh.auto ? `<div class="small">(${[...sh.auto].map((c) => esc(seatName(c))).join(', ')} 님은 시간이 지나 랜덤)</div>` : '';
  return `<div class="lk">${head}<div class="hands reveal">
      <div class="hand show"><span>${HAND[pick(leftC)].e}</span>${amIn ? '나' : esc(seatName(leftC))}</div>
      <div class="vs">VS</div>
      <div class="hand show"><span>${HAND[pick(rightC)].e}</span>${amIn ? '상대' : esc(seatName(rightC))}</div></div>
    <div class="big reveal">${msg}</div>${autoNote}</div>`;
}
// 주사위 눈 (SVG)
function dieSvg(n) {
  const P = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]] };
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="6" width="88" height="88" rx="18" fill="#fffaf0" stroke="#2a2240" stroke-width="4"/>${P[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="${n === 1 ? '#d23c3c' : '#231c3d'}"/>`).join('')}</svg>`;
}
// 굴러가는 동안 눈을 바꾸다가 마지막에 진짜 수에 멈춤
function animateDie() {
  const ROLL = 750;
  const step = () => {
    const el = document.getElementById('die');
    if (!el || !el.classList.contains('rolling')) return;
    const t = performance.now() - stageAt;
    if (t >= ROLL) { el.innerHTML = dieSvg(Number(el.dataset.final)); el.classList.remove('rolling'); el.classList.add('landed'); return; }
    el.innerHTML = dieSvg(1 + Math.floor(Math.random() * 6));
    setTimeout(step, 70);
  };
  step();
}
function updateWaits() {
  if (!room || !room.game || !room.game.lucky) return;
  for (const el of document.querySelectorAll('[data-wait]')) {
    const sec = Math.ceil(waitLeft() / 1000);
    const g = room.game;
    el.textContent = g.stage === 'rps' ? `${sec}초 남음` + (el.closest('.lk') && el.closest('.lk').querySelector('[data-pick]') ? ' · 안 고르면 랜덤' : '') : `${sec}초 뒤 자동으로 던져요`;
  }
}
setInterval(updateWaits, 250);
function renderLuckyLog() {
  const box = $('moves');
  box.classList.add('lucky');
  const turns = room.game.turns.filter((t) => t.coin);
  box.innerHTML = turns.map((t) => {
    const coin = t.coin === 'H' ? '<span class="lg-h">앞</span>' : '<span class="lg-t">뒤</span>';
    const body = t.coin === 'T' ? '<span class="lg-x">넘어감</span>'
      : (t.dice ? `🎲${t.dice} ` : '') + t.moves.map((m) => `<b class="${m.endsWith('✗') ? 'lg-lost' : m.includes('x') ? 'lg-cap' : ''}">${esc(m)}</b>`).join(' ');
    return `<div class="lg"><span class="lg-c ${t.c}"></span>${coin}<span class="lg-m">${body}</span></div>`;
  }).join('');
  $('movesEmpty').hidden = turns.length > 0;
  box.scrollTop = box.scrollHeight;
}
