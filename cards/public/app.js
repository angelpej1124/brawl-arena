// =====================================================================
//  레인보우 카드 화면 — 로비 · 레인보우 원카드 · 레인보우 인디언포커
//  주소: /cards/?game=onecard  또는  /cards/?game=poker   (난투 아레나 미니게임 메뉴에서 열림)
//  규칙 판정은 서버(cards/core.js)가 하고, 화면은 보여 주기·입력만 함
// =====================================================================
'use strict';
const D = window.RainbowDeck;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} },
};
const params = new URLSearchParams(location.search);
const GAME = params.get('game') === 'poker' ? 'poker' : 'onecard';
const embedded = window.parent !== window;
function backToBrawl() { if (embedded) window.parent.postMessage({ t: 'closeMini' }, location.origin); else location.href = '/'; }

// ---------------- 모바일: 두 번 탭해도 확대되지 않게 ----------------
{
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now(), quick = now - lastTap < 400;
    lastTap = now;
    if (!quick || e.touches.length || e.target.closest('input, textarea, select')) return;
    e.preventDefault();
    const btn = e.target.closest('button, a[href], [data-card]');
    if (btn && !btn.disabled) btn.click();
  }, { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}

// ---------------- 게임 소개 ----------------
const INFO = {
  onecard: {
    name: '원카드', sub: '색이나 숫자가 같은 카드를 내서 먼저 다 털면 승리!',
    rules: `카드: A~K 13장 × 무지개 7색 + 색깔 조커 7장 (모두 한 장씩)<br>
      ① 5장씩 받고, 가운데 카드 한 장으로 시작<br>
      ② 맨 위 카드와 <b>색이나 숫자가 같은 카드</b>를 한 장 내요. 낼 게 없으면 한 장 받아요<br>
      ③ <b>조커</b>는 아무 때나 낼 수 있고, 색이 조커 색으로 바뀌어요<br>
      ④ <b>A</b>: 다음 사람 4장 · <b>2</b>: 2장 — 받는 사람은 A로 막을 수 있어요(장수가 쌓임). 2로는 A를 못 막아요. 조커를 내면 장수를 그대로 다음 사람에게 넘겨요<br>
      ⑤ 손에 든 카드를 먼저 다 내면 승리 · 최대 4명 (봇 넣기 가능)<br>
      💎 사람 2명 이상: 1등 +100 · 참가 +20 / 봇전: 1등 이지 +10 · 미들 +25 · 하드 +50 · 참가 +5`,
    rank: '원카드 랭킹 (1등 많은 순)',
  },
  poker: {
    name: '인디언포커', sub: '내 카드만 못 봐요! 다른 사람 카드를 보고 베팅',
    rules: `카드: A~K 13장 × 무지개 7색 + 색깔 조커 7장 (모두 한 장씩)<br>
      ① 모두 보석 <b>1개</b>를 기본으로 걸고 카드 한 장씩 머리 위에 — 남의 카드는 보이고 내 카드는 안 보여요<br>
      ② 랜덤한 사람부터 차례로 <b>콜(따라가기)·올리기·폴드(포기)</b><br>
      ③ 안 접은 사람이 모두 같은 만큼 걸면 카드를 공개해서 <b>가장 높은 사람이 판돈을 다</b> 가져가요<br>
      ④ 점수: A(1) < 2 … K(13) < 조커(14), 숫자가 같으면 <b>빨강에 가까울수록</b> 높아요 (보라 A가 가장 낮고 빨강 조커가 가장 높음)<br>
      💎 앉은 사람이 <b>모두 로그인한 사람</b>이면 진짜 보석을 걸어요 (가진 보석까지, 가장 적게 가진 사람 기준). 봇·게스트가 끼면 연습 칩(보석 안 바뀜)`,
    rank: '인디언포커 랭킹 (진짜 보석으로 번 보석)',
  },
};
document.title = '레인보우 ' + INFO[GAME].name;
$('titleSub').textContent = INFO[GAME].name;
$('subtitle').textContent = INFO[GAME].sub;
$('rulesBox').innerHTML = INFO[GAME].rules;
$('rankLbl').textContent = INFO[GAME].rank;
$('botHint').textContent = GAME === 'poker' ? '봇전은 연습 칩으로 해요 (보석이 안 바뀌어요).' : '봇전 보석: 1등 이지 +10 · 미들 +25 · 하드 +50, 참가 +5';
$('guestHint').textContent = GAME === 'poker' ? '게스트는 연습 칩으로만 해요.' : '게스트는 보석을 받지 않아요.';

// ---------------- 카드 그리기 ----------------
function cardHtml(id, cls = '', attrs = '') {
  if (id === null || id === undefined) return `<div class="rc back ${cls}" ${attrs} aria-label="뒷면"></div>`;
  const c = D.COLORS[D.colorOf(id)], ink = D.colorOf(id) === 2 ? '#3a2a00' : '#fff';
  const lab = D.label(id);
  if (D.isJoker(id)) {
    return `<div class="rc joker ${cls}" style="--c:${c.hex};--ink:${ink}" ${attrs} aria-label="${c.name} 조커"><div class="mid"><i>★</i>JOKER</div><span class="cn">${c.short}</span></div>`;
  }
  return `<div class="rc ${cls}" style="--c:${c.hex};--ink:${ink}" ${attrs} aria-label="${c.name} ${lab}"><span class="r1">${lab}</span><div class="mid">${lab}</div><span class="r2">${lab}</span><span class="cn">${c.short}</span></div>`;
}

// ---------------- 소리 ----------------
let sndOn = store.get('cards_snd') !== 'off', actx = null;
function beep(f, d, type = 'sine', v = 0.12, at = 0) {
  if (!sndOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + at, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) {}
}
const SFX = {
  card: () => { beep(700, 0.05, 'triangle', 0.12); beep(1000, 0.05, 'triangle', 0.08, 0.04); },
  draw: () => beep(420, 0.08, 'sine', 0.1),
  atk: () => { beep(260, 0.12, 'square', 0.1); beep(200, 0.16, 'square', 0.1, 0.1); },
  myturn: () => { beep(880, 0.08, 'sine', 0.1); beep(1320, 0.1, 'sine', 0.1, 0.09); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'triangle', 0.14, i * 0.11)),
  lose: () => [392, 330, 262].forEach((f, i) => beep(f, 0.2, 'sine', 0.12, i * 0.14)),
  chip: () => { beep(1500, 0.04, 'square', 0.06); beep(1800, 0.05, 'square', 0.05, 0.05); },
};
function updSnd() { $('sndBtn').classList.toggle('off', !sndOn); $('sndBtn').textContent = sndOn ? '소리 켬' : '소리 끔'; }
$('sndBtn').onclick = () => { sndOn = !sndOn; store.set('cards_snd', sndOn ? 'on' : 'off'); updSnd(); };
updSnd();

// ---------------- 계정 (난투 아레나와 같이 씀) ----------------
const account = { token: store.get('brawl_token'), profile: null };
let authMode = 'login';
async function api(p, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (account.token) headers.Authorization = 'Bearer ' + account.token;
  const r = await fetch(p, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const e = new Error(j.error || '서버와 연결하지 못했어요.'); e.status = r.status; throw e; }
  return j;
}
function setAuthMode(m) {
  authMode = m;
  for (const [id, k] of [['tabLogin', 'login'], ['tabSignup', 'signup'], ['tabGuest', 'guest']]) $(id).setAttribute('aria-selected', String(m === k));
  $('authForm').hidden = m === 'guest'; $('guestBox').hidden = m !== 'guest'; $('pw2Wrap').hidden = m !== 'signup';
  $('authBtn').textContent = m === 'signup' ? '가입하기' : '로그인'; $('authMsg').textContent = '';
}
$('tabLogin').onclick = () => setAuthMode('login');
$('tabSignup').onclick = () => setAuthMode('signup');
$('tabGuest').onclick = () => setAuthMode('guest');
$('gNick').value = params.get('guest') || store.get('cards_guest') || '';
$('authForm').onsubmit = async (e) => {
  e.preventDefault();
  if (authMode === 'signup' && $('aPw').value !== $('aPw2').value) { $('authMsg').textContent = '비밀번호 확인이 달라요.'; return; }
  $('authBtn').disabled = true;
  try {
    const r = await api('/api/' + authMode, { method: 'POST', body: { nick: $('aNick').value.trim(), pw: $('aPw').value } });
    account.token = r.token; store.set('brawl_token', r.token); setProfile(r.profile);
    $('aPw').value = ''; $('aPw2').value = '';
  } catch (err) { $('authMsg').textContent = err.message; }
  $('authBtn').disabled = false;
};
$('logoutBtn').onclick = () => { api('/api/logout', { method: 'POST' }).catch(() => {}); account.token = null; store.set('brawl_token', null); setProfile(null); };
function setProfile(p) {
  account.profile = p;
  $('authBox').hidden = !!p; $('meBox').hidden = !p;
  if (p) $('meNick').textContent = p.nick;
  $('gemCount').textContent = p ? p.gems.toLocaleString() : '-';
  const st = p && (GAME === 'poker' ? p.poker : p.onecard);
  $('myStat').textContent = !st ? '' : GAME === 'poker' ? `진짜 보석 ${st.g}판 · ${st.net >= 0 ? '+' : ''}${st.net}` : `${st.g}판 · 1등 ${st.w}번`;
}
async function loadMe() {
  if (!account.token) return setProfile(null);
  try { setProfile((await api('/api/me')).profile); }
  catch (e) { if (e.status === 401) { account.token = null; store.set('brawl_token', null); } setProfile(null); }
}

// ---------------- 로비 ----------------
let roomTab = 'list', botDiff = store.get('cards_bot') || 'medium', botN = Number(store.get('cards_botn') || (GAME === 'poker' ? 2 : 3));
const DIFF_KO = { easy: '이지', medium: '미들', hard: '하드' };
function setRoomTab(t) {
  roomTab = t;
  for (const [id, k] of [['rtList', 'list'], ['rtCreate', 'create'], ['rtCode', 'code'], ['rtBot', 'bot']]) $(id).setAttribute('aria-selected', String(t === k));
  $('rpList').hidden = t !== 'list'; $('rpCreate').hidden = t !== 'create'; $('rpCode').hidden = t !== 'code'; $('rpBot').hidden = t !== 'bot';
  $('playBtn').textContent = t === 'list' ? '빠른 입장' : t === 'create' ? '방 만들기' : t === 'bot' ? `봇 ${botN}명이랑 시작 (${DIFF_KO[botDiff]})` : '입장하기';
}
$('rtList').onclick = () => setRoomTab('list'); $('rtCreate').onclick = () => setRoomTab('create');
$('rtCode').onclick = () => setRoomTab('code'); $('rtBot').onclick = () => setRoomTab('bot');
function setBot(d, n) {
  botDiff = DIFF_KO[d] ? d : 'medium'; botN = [1, 2, 3].includes(n) ? n : 1;
  store.set('cards_bot', botDiff); store.set('cards_botn', String(botN));
  for (const b of $('diffs').children) b.setAttribute('aria-pressed', String(b.dataset.d === botDiff));
  for (const b of $('botN').children) b.setAttribute('aria-pressed', String(Number(b.dataset.n) === botN));
  if (roomTab === 'bot') setRoomTab('bot');
}
for (const b of $('diffs').children) b.onclick = () => setBot(b.dataset.d, botN);
for (const b of $('botN').children) b.onclick = () => setBot(botDiff, Number(b.dataset.n));
setBot(botDiff, botN);
$('roomcode').value = store.get('cards_room') || '';
async function loadRooms() {
  if ($('lobby').hidden) return;
  try {
    const r = await api('/api/cards/rooms?game=' + GAME);
    $('onlineNow').textContent = r.online;
    $('roomList').innerHTML = r.rooms.map((x) => `<li><button type="button" data-code="${esc(x.code)}" ${x.full ? 'disabled' : ''}>
      <span class="rt">${esc(x.title)}</span><small>${x.phase === 'playing' ? '게임 중 · 구경' : `${x.players}/4 · 대기`}${x.bots ? ` · 봇 ${x.bots}` : ''}</small></button></li>`).join('');
    $('roomEmpty').hidden = r.rooms.length > 0;
    for (const b of $('roomList').querySelectorAll('button')) b.onclick = () => go('listed', { room: b.dataset.code });
  } catch (e) {}
}
async function loadRanking() {
  try {
    const r = await api('/api/cards/ranking?game=' + GAME);
    $('rank').innerHTML = (r.ranking || []).map((x, i) => `<li><span>${i + 1}. ${esc(x.nick)}</span><small>${GAME === 'poker' ? `${x.net >= 0 ? '+' : ''}${x.net}개 · ${x.g}판` : `1등 ${x.w}번 · ${x.g}판`}</small></li>`).join('');
    $('rankEmpty').textContent = (r.ranking || []).length ? '' : '아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!';
  } catch (e) {}
}
$('playBtn').onclick = () => {
  if (roomTab === 'list') go('quick');
  else if (roomTab === 'create') go('create', { title: $('roomTitle').value.trim() });
  else if (roomTab === 'bot') go('bot', { diff: botDiff, bots: botN });
  else {
    const code = $('roomcode').value.trim().toLowerCase();
    if (!code) { $('err').textContent = '초대 코드를 써 주세요.'; return; }
    store.set('cards_room', code); go('code', { room: code });
  }
};
$('backBtn').onclick = backToBrawl;

// ---------------- 연결 ----------------
let ws = null, myId = null, room = null, leaving = false, gotAt = 0, gemsMsg = null, raiseTo = 0, lastTurnKey = '';
function go(mode, extra = {}) {
  $('err').textContent = '';
  let who;
  if (account.profile) who = { token: account.token };
  else if (authMode === 'guest') { const g = $('gNick').value.trim(); store.set('cards_guest', g); who = { guest: g }; }
  else { $('err').textContent = '로그인하거나, 게스트 탭에서 닉네임을 써 주세요.'; return; }
  $('playBtn').disabled = true;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const s = new WebSocket(`${proto}//${location.host}/cards-ws`);
  ws = s; leaving = false;
  s.onopen = () => s.send(JSON.stringify({ t: 'join', game: GAME, mode, ...extra, ...who }));
  s.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } onMsg(m); };
  s.onclose = () => { if (ws !== s) return; ws = null; $('playBtn').disabled = false; if (!leaving && room) { toast('연결이 끊겼어요.'); toLobby(); } };
}
function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
function onMsg(m) {
  if (m.t === 'welcome') {
    myId = m.id; $('playBtn').disabled = false;
    $('lobby').hidden = true; $('table').hidden = false;
    $('roomName').innerHTML = m.isPublic || m.room.startsWith('bot-') ? `<b>${esc(m.title)}</b>` : `초대 코드 <b>${esc(m.room)}</b>`;
    gemsMsg = null;
  } else if (m.t === 'state') { onState(m.room); }
  else if (m.t === 'error') { $('playBtn').disabled = false; if (room) toast(m.msg); else $('err').textContent = m.msg; leaving = true; if (ws) ws.close(); }
  else if (m.t === 'notice') toast(m.msg);
  else if (m.t === 'gems') { gemsMsg = m; if (m.profile) setProfile(m.profile); if (room) render(); }
  else if (m.t === 'profile') { setProfile(m.profile); }
}
function toLobby() {
  room = null; $('table').hidden = true; $('lobby').hidden = false; $('playBtn').disabled = false;
  loadRooms(); loadRanking(); loadMe();
}
$('exitBtn').onclick = () => {
  if (room && room.phase === 'playing' && room.you >= 0 && !confirm(GAME === 'poker' ? '지금 나가면 이번 판은 폴드(포기)돼요. 나갈까요?' : '지금 나가면 이번 판은 져요. 나갈까요?')) return;
  leaving = true; if (ws) ws.close(); toLobby();
};

function onState(r) {
  const prev = room;
  room = r; gotAt = performance.now();
  for (const e of r.ev || []) {
    if (e.k === 'start' || e.k === 'deal') { gemsMsg = null; raiseTo = 0; }
    if (e.k === 'play') { e.atk ? SFX.atk() : SFX.card(); }
    else if (e.k === 'draw') SFX.draw();
    else if (e.k === 'bet') SFX.chip();
    else if (e.k === 'win' || e.k === 'potwin') { const meName = r.you >= 0 ? r.seats[r.you].name : null; (e.n === meName ? SFX.win : r.you >= 0 ? SFX.lose : SFX.win)(); }
    else if (e.k === 'join' && prev) toast(`${e.n} 님이 들어왔어요.`);
    else if (e.k === 'leave') toast(`${e.n} 님이 나갔어요.`);
  }
  // 내 차례가 되면 알림 소리
  const myTurn = isMyTurn();
  const key = myTurn ? (r.oc ? 'oc' + r.oc.pile + ':' + r.oc.deck : 'pk' + (r.pk && r.pk.log.length)) : '';
  if (myTurn && key !== lastTurnKey) SFX.myturn();
  lastTurnKey = key;
  render();
}
function isMyTurn() {
  if (!room || room.phase !== 'playing' || room.you < 0) return false;
  if (room.oc) return room.oc.turn === room.you;
  if (room.pk) { const me = room.pk.players.find((p) => p.me); return !!(me && me.turn); }
  return false;
}
const leftMs = (ms) => Math.max(0, ms - (performance.now() - gotAt));

// ---------------- 그리기 ----------------
function render() {
  if (!room) return;
  renderSeats(); renderWait(); renderResult();
  if (room.game === 'onecard') renderOnecard(); else renderPoker();
}
function renderSeats() {
  const r = room, oc = r.oc, pk = r.pk;
  $('seats').innerHTML = r.seats.map((s, i) => {
    const tags = [];
    if (i === r.you) tags.push('<span class="tag me">나</span>');
    if (s.bot) tags.push('<span class="tag bot">봇</span>');
    if (s.guest) tags.push('<span class="tag">게스트</span>');
    if (s.host) tags.push('<span class="tag">방장</span>');
    if (r.result && r.result.winner === s.name && r.phase !== 'playing') tags.push('<span class="tag win">승리</span>');
    let body = '', turn = false, cls = '';
    if (oc && r.phase === 'playing') {
      turn = oc.turn === i;
      if (s.out) cls = ' out';
      const n = oc.counts[i] || 0;
      body = `<div class="backs">${Array.from({ length: Math.min(n, 8) }, () => cardHtml(null, 'small')).join('')}<b>${n}장</b></div>`;
    } else if (pk) {
      const p = pk.players.find((x) => x.seat === i);
      if (p) {
        turn = p.turn; if (p.folded) cls = ' folded';
        const unit = pk.real ? '💎' : '🪙';
        body = `<div class="fh">${p.me && !pk.done ? cardHtml(null) : p.card === null ? cardHtml(null) : cardHtml(p.card)}
          <div class="chipline">${p.folded ? '폴드' : `건 것 <b>${p.in}</b>`} · 가진 ${unit} <b>${p.stack}</b>${p.me && !pk.done ? '<br>내 카드는 안 보여요' : ''}</div></div>`;
      } else body = `<div class="meta">${r.phase === 'playing' ? '이번 판은 쉬어요' : ''}${!pk.real && s.chips !== undefined ? ` · 🪙 ${s.chips}` : ''}</div>`;
    } else {
      body = `<div class="meta">${r.game === 'poker' ? (r.pkWait && i === r.you ? `${r.pkWait.real ? '💎 보석' : '🪙 칩'} ${r.pkWait.myStack}` : s.bot || s.guest ? `🪙 칩 ${s.chips}` : '') : '대기 중'}</div>`;
    }
    const tl = turn ? `<div class="timer"><i data-left="1" style="width:100%"></i></div>` : '';
    const kick = r.hostMe && s.bot && r.phase !== 'playing' ? `<button class="kick" data-kick="${i}" type="button" aria-label="봇 빼기">빼기</button>` : '';
    return `<div class="seat${turn ? ' turn' : ''}${i === r.you ? ' me' : ''}${cls}">${kick}<div class="nm"><span>${esc(s.name)}</span>${tags.join('')}</div>${body}${tl}</div>`;
  }).join('') + (r.specs.length ? `<div class="seat" style="opacity:.7"><div class="meta">구경 ${r.specs.length}명: ${r.specs.map(esc).join(', ')}</div></div>` : '');
  for (const b of $('seats').querySelectorAll('[data-kick]')) b.onclick = () => send({ t: 'kickbot', i: Number(b.dataset.kick) });
}
function renderWait() {
  const r = room, box = $('waitBox');
  const waiting = r.phase === 'waiting';
  box.hidden = !waiting;
  if (!waiting) return;
  const n = r.seats.length, seated = r.you >= 0;
  let html = `<div class="status">${n < 2 ? '2명 이상 모이면 시작할 수 있어요' : r.hostMe ? '준비됐으면 시작을 눌러요' : '방장이 시작하기를 기다려요'}<small>${r.isPublic ? '공개 방 목록에 보여요' : r.botRoom ? '봇전' : `친구에게 초대 코드 <b>${esc(r.code)}</b> 를 알려 주세요`} · 최대 4명</small></div>`;
  if (r.hostMe) {
    html += `<div class="bot-add"><span>봇 넣기:</span>${['easy', 'medium', 'hard'].map((d) => `<button type="button" data-addbot="${d}" ${n >= 4 ? 'disabled' : ''}>${DIFF_KO[d]}</button>`).join('')}</div>`;
  }
  html += `<div class="actions">${r.hostMe ? `<button class="btn main" data-a="start" ${n < 2 ? 'disabled' : ''}>${r.result ? '한 판 더!' : '시작'}</button>` : ''}
    ${seated ? (r.botRoom ? '' : '<button class="btn" data-a="stand">일어나서 구경</button>') : `<button class="btn" data-a="sit" ${n >= 4 ? 'disabled' : ''}>앉기</button>`}</div>`;
  if (r.game === 'poker' && r.pkWait) html += `<p class="hint" style="text-align:center">${r.pkWait.real ? '💎 지금 앉은 사람이 모두 로그인한 사람이라 <b>진짜 보석</b>을 걸어요.' : '🪙 봇이나 게스트가 있어서 <b>연습 칩</b>으로 해요 (보석 안 바뀜).'}</p>`;
  box.innerHTML = html;
  for (const b of box.querySelectorAll('[data-addbot]')) b.onclick = () => send({ t: 'addbot', diff: b.dataset.addbot });
  for (const b of box.querySelectorAll('[data-a]')) b.onclick = () => send({ t: b.dataset.a });
}
function renderResult() {
  const r = room, box = $('resultBox');
  const show = r.result && r.phase !== 'playing' && r.game === 'onecard';
  box.hidden = !show;
  if (!show) return;
  const meName = r.you >= 0 && r.seats[r.you] ? r.seats[r.you].name : null;
  let gems = '';
  if (gemsMsg) gems = gemsMsg.gained ? `<div class="gems">보석 +${gemsMsg.gained}</div>` : `<div class="hint">${esc(gemsMsg.why || '')}</div>`;
  const lefts = (r.result.left || []).filter((x) => x.cards.length).map((x) => `<div class="left-cards"><span>${esc(x.name)} · ${x.cards.length}장</span>${x.cards.map((c) => cardHtml(c, 'small')).join('')}</div>`).join('');
  box.innerHTML = `<div class="result-banner"><div class="big">${r.result.winner === meName ? '이겼어요! 🌈' : `${esc(r.result.winner)} 님 승리`}</div>${gems}${lefts ? `<div class="hint">남은 카드</div>${lefts}` : ''}</div>`;
}

// ---- 원카드 ----
function renderOnecard() {
  const r = room, oc = r.oc, playing = r.phase === 'playing';
  if (!oc || !playing) {   // 게임 전·끝난 뒤에는 테이블 대신 대기·결과 화면만
    $('center').innerHTML = ''; $('status').innerHTML = ''; $('mine').innerHTML = ''; $('actions').innerHTML = '';
    $('log').hidden = !(oc && oc.log.length); if (oc) $('log').innerHTML = oc.log.map((t) => `<div>${esc(t)}</div>`).join('');
    return;
  }
  const c = D.COLORS[oc.color];
  $('center').innerHTML = `
    ${playing && oc.attack ? `<div class="attack-row"><div class="attack">⚠ 공격 ${oc.attack}장! ${oc.atkKind === 'A' ? 'A·조커로만 막아요' : 'A·2·조커로 막아요'}</div></div>` : ''}
    <div class="pile"><button type="button" id="deckBtn" aria-label="카드 받기" ${isMyTurn() ? '' : 'disabled'}>${cardHtml(null, 'big')}</button><span>남은 카드 ${oc.deck}장</span></div>
    <div class="pile">${cardHtml(oc.top, 'big')}<span>맨 위 카드</span></div>
    <div class="now-color"><div class="swatch" style="background:${c.hex};--sw:${c.hex}"></div><b>지금 색: ${c.name}</b></div>`;
  const mine = isMyTurn();
  const s = { top: oc.top, color: oc.color, attack: oc.attack, atkKind: oc.atkKind };
  const turnName = r.seats[oc.turn] ? r.seats[oc.turn].name : '';
  if (!playing) $('status').innerHTML = '';
  else if (r.you < 0) $('status').innerHTML = `${esc(turnName)} 님 차례<small>구경하는 중이에요</small>`;
  else $('status').innerHTML = mine ? (oc.attack ? `공격을 받았어요! 막거나 ${oc.attack}장 받기` : '내 차례예요! 낼 카드를 누르세요') + `<small data-left-text="1"></small>`
    : `${esc(turnName)} 님 차례`;
  if (oc.hand) {
    const hand = [...oc.hand].sort((a, b) => D.colorOf(a) - D.colorOf(b) || D.rankOf(a) - D.rankOf(b));
    $('mine').innerHTML = `<div class="hand" aria-label="내 카드">${hand.map((id) => {
      const can = mine && D.canPlay(id, s);
      return cardHtml(id, can ? 'can' : mine ? 'no' : '', `data-card="${id}" role="button" tabindex="0"`);
    }).join('')}</div>`;
    for (const el of $('mine').querySelectorAll('[data-card]')) el.onclick = () => { if (isMyTurn()) send({ t: 'play', card: Number(el.dataset.card) }); };
  } else $('mine').innerHTML = '';
  $('actions').innerHTML = mine ? `<button class="btn ${oc.hand.some((id) => D.canPlay(id, s)) ? '' : 'main'}" data-a="draw">${oc.attack ? `${oc.attack}장 받기` : '카드 1장 받기'}<small>${oc.hand.some((id) => D.canPlay(id, s)) ? '낼 수 있어도 받을 수 있어요' : '낼 카드가 없어요'}</small></button>` : '';
  for (const b of $('actions').querySelectorAll('[data-a]')) b.onclick = () => send({ t: 'draw' });
  const deckBtn = $('deckBtn'); if (deckBtn) deckBtn.onclick = () => { if (isMyTurn()) send({ t: 'draw' }); };
  $('log').hidden = !oc.log.length;
  $('log').innerHTML = oc.log.map((t) => `<div>${esc(t)}</div>`).join('');
  $('log').scrollTop = 1e6;
}

// ---- 인디언포커 ----
function renderPoker() {
  const r = room, pk = r.pk;
  if (!pk) { $('center').innerHTML = ''; $('status').innerHTML = ''; $('mine').innerHTML = ''; $('actions').innerHTML = ''; $('log').hidden = true; return; }
  const me = pk.players.find((p) => p.me);
  const unit = pk.real ? '💎' : '🪙';
  $('center').innerHTML = `
    <div class="pot"><span class="mode-badge ${pk.real ? 'real' : 'chip'}">${pk.real ? '💎 진짜 보석' : '🪙 연습 칩'}</span>
      <b>${pk.real ? '<i class="gem-ico"></i>' : '🪙'} ${pk.pot}</b><small>판돈 · 지금 최고 ${pk.bet}개</small></div>
    ${me ? `<div class="forehead">${pk.done ? cardHtml(me.card, 'big') : cardHtml(null, 'big')}<span class="who">${pk.done ? '내 카드' : '내 카드 (나만 못 봐요)'}</span></div>` : ''}`;
  const turnP = pk.players.find((p) => p.turn);
  if (pk.done) {
    const res = r.result;
    const meWon = res && me && res.winner === r.seats[r.you]?.name;
    $('status').innerHTML = res ? `${meWon ? '이겼어요! ' : ''}${esc(res.winner)} 님이 ${unit} ${res.pot}개를 가져가요<small>${res.showdown ? '카드 공개!' : '모두 접었어요'} · <span data-next="1"></span></small>` : '';
  } else if (!me) $('status').innerHTML = `${turnP ? esc(turnP.name) + ' 님 차례' : ''}<small>${r.you >= 0 ? '이번 판은 쉬어요' : '구경하는 중이에요'}${pk.real && r.you < 0 ? ' · 진짜 보석 판은 끝날 때까지 카드가 안 보여요' : ''}</small>`;
  else if (me.folded) $('status').innerHTML = `폴드했어요<small>${turnP ? esc(turnP.name) + ' 님 차례' : ''}</small>`;
  else if (me.turn) $('status').innerHTML = `내 차례예요!<small data-left-text="1"></small>`;
  else $('status').innerHTML = `${turnP ? esc(turnP.name) + ' 님 차례' : ''}`;
  $('mine').innerHTML = '';
  let acts = '';
  if (me && me.turn && !pk.done) {
    const toCall = pk.bet - me.in;
    const minTo = pk.bet + 1, cap = pk.cap;
    if (!(raiseTo >= minTo && raiseTo <= cap)) raiseTo = Math.min(cap, minTo);
    acts = `<button class="btn warn" data-p="fold">폴드<small>포기 (건 ${me.in}개 잃음)</small></button>
      <button class="btn ok" data-p="call">${toCall > 0 ? `콜 +${toCall}` : '체크'}<small>${toCall > 0 ? `${pk.bet}개 맞추기` : '그대로 넘기기'}</small></button>
      ${cap > pk.bet ? `<div style="flex-basis:100%"></div>
      <div class="raise-row"><button type="button" data-r="-1">−1</button><output id="raiseOut">${raiseTo}</output><button type="button" data-r="1">+1</button><button type="button" data-r="5">+5</button><button type="button" data-r="max">최대 ${cap}</button>
      <button class="btn main" data-p="raise">올리기<small>총 ${raiseTo}개로</small></button></div>` : `<div class="hint" style="flex-basis:100%;text-align:center">더 올릴 수 없어요 (최대 ${cap}개)</div>`}`;
  }
  $('actions').innerHTML = acts;
  for (const b of $('actions').querySelectorAll('[data-p]')) b.onclick = () => send(b.dataset.p === 'raise' ? { t: 'raise', to: raiseTo } : { t: b.dataset.p });
  for (const b of $('actions').querySelectorAll('[data-r]')) b.onclick = () => {
    const cap = pk.cap, minTo = pk.bet + 1;
    raiseTo = b.dataset.r === 'max' ? cap : Math.max(minTo, Math.min(cap, raiseTo + Number(b.dataset.r)));
    renderPoker();
  };
  $('log').hidden = !pk.log.length;
  $('log').innerHTML = pk.log.map((t) => `<div>${esc(t)}</div>`).join('');
  $('log').scrollTop = 1e6;
}

// 남은 시간 표시
setInterval(() => {
  if (!room) return;
  const left = room.oc ? room.oc.left : room.pk ? room.pk.left : 0;
  const total = room.oc ? 20000 : 25000;
  const l = leftMs(left);
  for (const el of document.querySelectorAll('[data-left]')) el.style.width = (l / total * 100) + '%';
  for (const el of document.querySelectorAll('[data-left-text]')) el.textContent = `${Math.ceil(l / 1000)}초 남음 · 시간이 지나면 ${room.oc ? (room.oc.attack ? '공격을 받아요' : '카드를 받아요') : '체크, 낼 게 있으면 폴드'}`;
  if (room.pk && room.phase === 'between') for (const el of document.querySelectorAll('[data-next]')) el.textContent = `${Math.ceil(leftMs(room.pk.nextIn) / 1000)}초 뒤 다음 판`;
}, 200);

let toastTimer = null;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }

// ---------------- 시작 ----------------
setAuthMode(!account.token && params.get('guest') ? 'guest' : 'login');
setRoomTab('list');
loadMe(); loadRooms(); loadRanking();
setInterval(loadRooms, 4000);
