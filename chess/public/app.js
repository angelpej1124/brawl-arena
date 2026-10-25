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
let sel = null, promoAsk = null, flipped = false, resultSeen = false, gemsMsg = null, gotAt = 0, lastMoveCount = -1;
function myColor() { return room && room.you >= 0 && room.seats[room.you] ? room.seats[room.you].color : null; }
function onState(r) {
  const prev = room;
  room = r; gotAt = performance.now();
  if (r.secret && r.phase === 'playing') store.sset('chess_resume', { room: r.code, secret: r.secret });
  else if (r.phase !== 'playing') store.sset('chess_resume', null);
  const n = r.game ? r.game.moves.length : 0;
  if (!prev || r.phase !== 'playing' || n !== lastMoveCount) { sel = null; promoAsk = null; }
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
  return R.legalMoves(g.st).filter((m) => m.from === sq);
}
function renderBoard() {
  const g = room.game, st = g ? g.st : R.initial(), o = orientation();
  const board = $('board');
  const chk = g && room.phase === 'playing' && R.inCheck(st) ? R.kingSq(st.b, st.turn)
    : g && room.result && room.result.reason === 'checkmate' ? R.kingSq(st.b, st.turn) : -1;
  const targets = sel != null ? legalFrom(sel) : [];
  let html = '';
  for (let i = 0; i < 64; i++) {
    const sq = o === 'w' ? i : 63 - i;
    const f = sq & 7, rk = sq >> 3;
    const cls = ['sq', (f + rk) % 2 === 0 ? 'l' : 'd'];
    if (g && g.last && (sq === g.last.from || sq === g.last.to)) cls.push('last');
    if (sq === sel) cls.push('sel');
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
  }
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
    const inChk = R.inCheck(g.st);
    if (mc) {
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
  // 시간 (방장만 바꿈)
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
  // 서버 확인 전에 미리 움직여 보여 줌
  const g = room.game;
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
