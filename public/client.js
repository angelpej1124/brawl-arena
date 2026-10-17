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
// 스킬 정보 (실제 판정은 서버의 game.js가 함)
const SKILLS = {
  slow:     { name: '둔화', desc: '주변 적의 이동·공격 속도를 5초간 절반으로', cd: '쿨 6초' },
  blink:    { name: '점멸', desc: '누른 방향으로 순간이동. 떨어질 때 복귀용', cd: '쿨 9초' },
  stealth:  { name: '은신', desc: '5초간 상대 화면에서 사라짐. 맞히면 맞음', cd: '쿨 11초' },
  clone:    { name: '분신', desc: '나와 똑같은 분신이 곁에서 지켜줌. 5대 맞으면 사라짐', cd: '쿨 10초' },
  swap:     { name: '전환', desc: '랜덤한 상대·분신·터렛과 위치를 바꿈. 강공격 맞고 1초간 불가', cd: '쿨 17초' },
  fly:      { name: '비행', desc: '5초간 비행. 점프 키 누르면 올라가고 떼면 내려감', cd: '쿨 15초' },
  explode:  { name: '폭파', desc: '주변을 폭파해 넉백 + 0.5초 스턴. 3초간 짙은 연기로 가려짐. 공중이면 3단 점프', cd: '쿨 9초' },
  freeze:   { name: '정지', desc: '나 빼고 모두 1초 정지. 정지 중엔 공격이 안 맞음', cd: '쿨 8초' },
  rock:     { name: '바위', desc: '6초간 넉백 없음. 대신 아주 느려지고 점프도 낮아짐', cd: '쿨 10초' },
  magnet:   { name: '자석', desc: 'Q로 주변을 끌어당기고 E로 밀어냄', cd: '각 쿨 9초', two: true },
  empower:  { name: '강화', desc: '가만히 있는 시간이 8초 쌓이면 충전 (움직여도 유지). 6초간 넉백↓ 사거리·속도·점프↑', cd: '충전식' },
  quake:    { name: '지진', desc: '나를 뺀 모두의 화면이 3초간 격하게 흔들림', cd: '쿨 12초' },
  giant:    { name: '거인', desc: '9초간 2배로 커짐. 넉백·속도 조금↓, 사거리↑', cd: '쿨 14초' },
  rubber:   { name: '고무', desc: '7초간 사거리 2배, 점프가 더 높아짐', cd: '쿨 13초' },
  engine:   { name: '엔진', desc: '6초간 빨라짐. 빠를수록 때릴 때 넉백이 커짐', cd: '쿨 12초' },
  parasite: { name: '기생', desc: '3번 때린 상대 몸에 들어가 7초 조종. 다시 Q로 나옴', cd: '3번 때리면 준비' },
  sword:    { name: '검사', desc: '공격이 검으로 바뀌고 사거리↑. 약공격은 돌진 베기, 강공격은 주변 부채꼴 베기, Q는 날아가는 참격', cd: '쿨 12초' },
  blackflash: { name: '흑섬', desc: '공격이 맞는 순간에 맞춰 Q를 누르면 넉백↑ (강공격은 0.7초 스턴까지). 타이밍이 틀리면 아무 일도 없음', cd: '쿨타임 없음' },
  lightning: { name: '번개', desc: '가까운 적 3명에게 번개를 내리쳐 3초 스턴', cd: '쿨 11초' },
  undying:  { name: '불사', desc: '목숨이 5개가 됨 (패시브)', cd: '패시브' },
  hulk:     { name: '헐크', desc: '퍼센트가 오를수록 몸·사거리·힘↑, 속도·받는 넉백↓. 퍼센트가 내려가면 다시 작아짐 (패시브)', cd: '패시브' },
  fire:     { name: '화염', desc: '공격에 불이 붙어 맞은 상대가 2번 더 밀림. Q는 불태우며 돌진 (맞으면 4번 더 밀림)', cd: '쿨 9초' },
  ice:      { name: '얼음', desc: '때리면 상대 얼음 게이지가 참. 가득 차면 2초 얼어붙음. Q는 5초 눈보라 (모두의 게이지가 계속 참)', cd: '쿨 11초' },
  error:    { name: '에러', desc: '나를 뺀 모두의 화면이 5초간 끊기고 조작이 제멋대로 됨', cd: '쿨 10초' },
  sun:      { name: '태양', desc: '6초간 태양의 힘: 빨라지고, 평타에 불이 붙고, 넉백이 세짐', cd: '쿨 11초' },
  turret:   { name: '터렛', desc: '적을 자동으로 쏘는 터렛 설치 (최대 3개, 4번 맞으면 부서짐)', cd: '쿨 12초' },
};
const SKILL_COLOR = {
  slow: '#7fb8ff', blink: '#c77dff', stealth: '#7fe0c8', clone: '#ff9ecf', swap: '#b48cff', fly: '#9ad7ff',
  explode: '#ff8a3d', freeze: '#d5ecff', rock: '#b5aca2', magnet: '#ff5d73', empower: '#4f8bff', parasite: '#7be36f',
  quake: '#d6a45c', giant: '#ff6b4a', rubber: '#ff9ff3', engine: '#ffb000',
  sword: '#cfe3ff', blackflash: '#c0263a', lightning: '#ffe94a', undying: '#ffd27a',
  hulk: '#5fd35a', fire: '#ff5a1f', ice: '#8fdcff', turret: '#a7b2c4', error: '#39ff88', sun: '#ffc21a',
};
const SKILL_IDS = Object.keys(SKILLS);
const MAPS = window.BRAWL_MAPS;   // maps.js (서버와 같은 맵 정보)
let STAGE = MAPS[0];               // 지금 판의 맵
const COLORS = ['#ff5a5f', '#3fa7ff', '#ffc93c', '#4cd97b', '#c77dff', '#ff8c42'];
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 바둑이', '봇 민수', '봇 지수'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const EMPTY_INPUT = () => ({ l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, s: 0, e: 0, x: 0 });
const TEAMS = [null, { name: '빨강팀', color: '#ff4d4d' }, { name: '파랑팀', color: '#3f8cff' }, { name: '초록팀', color: '#3ccf6e' }, { name: '노랑팀', color: '#ffd23f' }];
// 키 배치 (서버와 같은 규칙): Q=스킬1, E=스킬2 / 자석이 있으면 Q·E 자석, R 나머지
function slotsOf(p) {
  if (!p.sk2) return { s: p.sk, e: p.sk === 'magnet' ? 'magnet2' : null, x: null };
  if (p.sk === 'magnet' || p.sk2 === 'magnet') return { s: 'magnet', e: 'magnet2', x: p.sk === 'magnet' ? p.sk2 : p.sk };
  return { s: p.sk, e: p.sk2, x: null };
}
// 그 슬롯 스킬의 남은 쿨타임
const hasK = (p, k) => p.sk === k || p.sk2 === k;   // 더블 모드면 두 스킬 중 하나라도
const cdOf = (p, k) => (k === 'magnet2' ? p.cd2 : k === p.sk ? p.cd : p.cdB);
const cleanInput = (i) => ({ l: i.l ? 1 : 0, r: i.r ? 1 : 0, u: i.u ? 1 : 0, d: i.d ? 1 : 0, a: i.a ? 1 : 0, h: i.h ? 1 : 0, s: i.s ? 1 : 0 });
const validSkill = (s) => (Object.prototype.hasOwnProperty.call(SKILLS, s) ? s : 'slow');

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
  account.token = null; account.profile = null; adminLoaded = false; adminSel = null; $('admEdit').hidden = true;
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
    : authTab === 'guest' ? '게스트는 기록이 저장되지 않고 둔화·점멸만 쓸 수 있어요'
    : '로그인하면 기록이 저장되고 보석으로 스킬을 뽑을 수 있어요';
  // 보석
  $('gemCount').textContent = p ? p.gems : '-';
  $('gachaBtn').disabled = !p || p.gems < GACHA_COST;
  if (!p) $('gachaMsg').textContent = '가입하면 보석을 모아 은신·분신을 뽑을 수 있어요.';
  else if ($('gachaMsg').dataset.keep !== '1') $('gachaMsg').textContent = p.gems < GACHA_COST ? `뽑기까지 보석 ${GACHA_COST - p.gems}개 더 필요해요.` : '';
  // 스킬 잠금
  const owned = p ? p.owned : BASE_SKILLS;
  document.querySelectorAll('.skill').forEach((b) => {
    const locked = !owned.includes(b.dataset.skill);
    b.classList.toggle('locked', locked);
    b.disabled = locked;
    b.title = locked ? (p ? '스킬 뽑기로 얻을 수 있어요' : '가입하고 뽑기로 얻을 수 있어요') : '';
  });
  if (!owned.includes(account.skill)) account.skill = 'slow';
  selectSkill(account.skill, false);
  // 관리자
  $('adminCard').hidden = !(p && p.admin);
  if (p && p.admin && !adminLoaded) { adminLoaded = true; adminSearch(); }
}

// ---------------- 스킬 뽑기 ----------------
const GACHA_COST = 100;
const BASE_SKILLS = ['slow', 'blink'];
$('gachaBtn').addEventListener('click', async () => {
  const btn = $('gachaBtn');
  btn.disabled = true;
  const msg = $('gachaMsg');
  msg.dataset.keep = '1';
  msg.style.color = 'var(--muted)';
  msg.textContent = '뽑는 중…';
  try {
    const r = await api('/api/gacha', {});
    account.profile = r.profile;
    const name = SKILLS[r.skill].name;
    msg.style.color = r.dup ? 'var(--muted)' : SKILL_COLOR[r.skill];
    msg.textContent = r.dup ? `${name}! 이미 가진 스킬이라 보석 ${r.refund}개를 돌려받았어요.` : `새 스킬 ${name} 획득! 스킬 선택에서 골라 보세요.`;
    if (!r.dup) selectSkill(r.skill, true);
  } catch (err) {
    msg.style.color = 'var(--danger)';
    msg.textContent = err.message;
  }
  renderAccount();
  setTimeout(() => { msg.dataset.keep = ''; }, 4000);
});

// ---------------- 관리자 ----------------
let adminLoaded = false, adminSel = null;
async function adminSearch() {
  try {
    const r = await api('/api/admin/users?q=' + encodeURIComponent($('admQ').value.trim()));
    const ul = $('admList');
    ul.textContent = '';
    for (const u of r.users) {
      const li = document.createElement('li');
      if (adminSel && adminSel.nick === u.nick) li.className = 'sel';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = u.nick + (u.admin ? ' (관리자)' : '');
      const sc = document.createElement('span'); sc.className = 'sc';
      sc.textContent = `보석 ${u.gems} · 스킬 ${u.owned.length}/${SKILL_IDS.length}`;
      li.style.gridTemplateColumns = 'minmax(0,1fr) auto';
      li.append(nm, sc);
      li.addEventListener('click', () => adminPick(u));
      ul.append(li);
    }
    if (!r.users.length) { const li = document.createElement('li'); li.textContent = '찾는 계정이 없어요.'; ul.append(li); }
  } catch (e) {
    $('admMsg').textContent = e.message;
  }
}
function adminPick(u) {
  adminSel = u;
  $('admEdit').hidden = false;
  $('admName').textContent = `${u.nick} 관리 중`;
  $('admGems').value = u.gems;
  for (const k of SKILL_IDS) if (k !== 'slow' && k !== 'blink') $('admSk' + k).checked = u.owned.includes(k);
  $('admMsg').textContent = '';
  document.querySelectorAll('#admList li').forEach((li) => li.classList.toggle('sel', li.firstChild && li.firstChild.textContent.startsWith(u.nick)));
}
let admTimer = null;
$('admQ').addEventListener('input', () => { clearTimeout(admTimer); admTimer = setTimeout(adminSearch, 300); });
$('admSave').addEventListener('click', async () => {
  if (!adminSel) return;
  const owned = [...document.querySelectorAll('.adm-skills input')].filter((c) => c.checked).map((c) => c.dataset.skill);
  $('admSave').disabled = true;
  try {
    const r = await api('/api/admin/user', { nick: adminSel.nick, gems: Number($('admGems').value), owned });
    adminSel = r.profile;
    $('admMsg').style.color = 'var(--ok)';
    $('admMsg').textContent = `${r.profile.nick} 저장했어요 · 보석 ${r.profile.gems}`;
    if (account.profile && r.profile.nick === account.profile.nick) { account.profile = r.profile; renderAccount(); }
    adminSearch();
  } catch (e) {
    $('admMsg').style.color = 'var(--danger)';
    $('admMsg').textContent = e.message;
  } finally {
    $('admSave').disabled = false;
  }
});

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
// 로비 스킬 버튼 만들기
(function buildSkillButtons() {
  const box = $('skillBox');
  box.textContent = '';
  for (const k of SKILL_IDS) {
    const b = document.createElement('button');
    b.className = 'skill'; b.dataset.skill = k; b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    const t = document.createElement('b');
    const dot = document.createElement('i'); dot.style.background = SKILL_COLOR[k];
    t.append(dot, SKILLS[k].name);
    const d = document.createElement('span'); d.textContent = `${SKILLS[k].desc}. ${SKILLS[k].cd}`;
    b.append(t, d);
    box.append(b);
  }
  // 관리자 스킬 체크박스
  const adm = $('admSkills');
  adm.textContent = '';
  for (const k of SKILL_IDS) {
    const l = document.createElement('label'); l.className = 'chk';
    const c = document.createElement('input'); c.type = 'checkbox'; c.dataset.skill = k; c.id = 'admSk' + k;
    if (k === 'slow' || k === 'blink') { c.checked = true; c.disabled = true; }
    l.append(c, ' ' + SKILLS[k].name + (c.disabled ? ' (기본)' : ''));
    adm.append(l);
  }
})();

function selectSkill(skill, save) {
  skill = validSkill(skill);
  document.querySelectorAll('.skill').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skill === skill)));
  account.skill = skill;
  $('tSkillName').textContent = SKILLS[skill].name;
  $('tSkill').style.borderColor = SKILL_COLOR[skill];
  $('tSkill2').hidden = !SKILLS[skill].two;
  $('skillLbl').textContent = SKILLS[skill].two ? '스킬 선택 (Q · E)' : '스킬 선택 (Q)';
  if (save) { try { localStorage.setItem('brawl_skill', skill); } catch (e) {} }
}
document.querySelectorAll('.skill').forEach((b) => b.addEventListener('click', () => selectSkill(b.dataset.skill, true)));
renderAccount(); // 스킬 버튼을 만든 뒤 잠금 상태 반영

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
  } else if (m.t === 'notice') {
    banners.push({ text: m.msg, life: 2, max: 2, small: true, color: '#ff9b9b' });
  } else if (m.t === 'profile') {
    account.profile = m.profile;
    renderAccount();
    if (m.gained) banners.push({ text: `보석 +${m.gained}`, life: 2.2, max: 2.2, small: true, color: '#5ef2ff' });
  } else if (m.t === 's') {
    m.time = performance.now();
    snapshots.push(m);
    if (snapshots.length > 30) snapshots.shift();
    latest = m;
    if (m.mp && m.mp !== STAGE.id) STAGE = MAPS.find((x) => x.id === m.mp) || STAGE;
    updateRoomPanel(m);
    // 방장만 봇 추가/빼기 버튼이 보임
    if (m.host !== hostLive || isHost !== (m.host === myId)) {
      hostLive = m.host;
      isHost = m.host === myId;
      $('botAdd').hidden = !isHost;
      $('botDel').hidden = !isHost;
      $('dumAdd').hidden = !isHost;
      $('dumDel').hidden = !isHost;
    }
    for (const e of m.ev || []) if (e.i > lastEvSeen) { lastEvSeen = e.i; onEvent(e); }
  }
}

$('botAdd').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: true }); });
$('botDel').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: false }); });
$('dumAdd').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: true, dummy: true }); });
$('dumDel').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: false, dummy: true }); });

// ---------------- 입력 ----------------
const input = EMPTY_INPUT();
const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', Space: 'u', ArrowDown: 'd', KeyS: 'd',
  KeyJ: 'a', KeyZ: 'a', KeyK: 'h', KeyX: 'h', KeyQ: 's', KeyL: 's', KeyE: 'e', KeyI: 'e', KeyR: 'x', KeyO: 'x',
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
    const n = ev.p === 2 ? 22 : ev.p === 0 ? 6 : 12;
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
  } else if (ev.k === 'stealth' || ev.k === 'clone' || ev.k === 'poof') {
    // 연기 퍼프
    const col = ev.k === 'stealth' ? '#9fe8d6' : ev.k === 'clone' ? '#ffc4e1' : '#d9d3f0';
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.5, max: 0.5, c: col, r: 7, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 60, c: '255,255,255' });
  } else if (ev.k === 'swap') {
    for (const [x, y] of [[ev.x, ev.y], [ev.x2, ev.y2]]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        particles.push({ x: x + Math.cos(a) * 34, y: y + Math.sin(a) * 34, vx: -Math.sin(a) * 260, vy: Math.cos(a) * 260, life: 0.45, max: 0.45, c: '#b48cff', r: 5, nograv: true });
      }
    }
  } else if (ev.k === 'fly') {
    for (let i = 0; i < 12; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 40, y: ev.y - 20, vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 80, life: 0.6, max: 0.6, c: '#eaf6ff', r: 5, nograv: true });
  } else if (ev.k === 'explode') {
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 520;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: i % 3 ? '#ff8a3d' : '#ffd36b', r: 7, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.r, c: '255,160,80' });
    shake = Math.max(shake, 18);
    if (ev.h > 0) banners.push({ text: `폭파! ${ev.h}명`, life: 1, max: 1, small: true, color: '#ff8a3d' });
  } else if (ev.k === 'freeze') {
    freezeFlash = 0.35;
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 900, c: '210,236,255' });
    banners.push({ text: '정지!', life: 1, max: 1, small: true, color: '#d5ecff' });
  } else if (ev.k === 'rock') {
    for (let i = 0; i < 14; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 40, y: ev.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, life: 0.5, max: 0.5, c: '#9b938a', r: 6 });
  } else if (ev.k === 'pull' || ev.k === 'push') {
    const c = ev.k === 'pull' ? '255,93,115' : '90,150,255';
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: ev.r, c, grow: ev.k === 'push', shrink: ev.k === 'pull' });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, d = ev.k === 'pull' ? ev.r : 30, sp = ev.k === 'pull' ? -520 : 520;
      particles.push({ x: ev.x + Math.cos(a) * d, y: ev.y + Math.sin(a) * d, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, max: 0.45, c: `rgb(${c})`, r: 4, nograv: true });
    }
  } else if (ev.k === 'empower') {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 260;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.6, max: 0.6, c: '#6fa4ff', r: 5, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 90, c: '80,140,255' });
  } else if (ev.k === 'charged') {
    banners.push({ text: '강화 충전 완료! Q를 눌러요', life: 2, max: 2, small: true, color: '#6fa4ff' });
  } else if (ev.k === 'infest' || ev.k === 'unfest') {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 200;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, max: 0.55, c: '#7be36f', r: 6, nograv: true });
    }
    if (ev.k === 'infest') banners.push({ text: `${ev.n} → ${ev.n2} 기생!`, life: 1.6, max: 1.6, small: true, color: '#7be36f' });
  } else if (ev.k === 'deny') {
    banners.push({ text: ev.msg, life: 1.6, max: 1.6, small: true, color: '#ff9b9b' });
  } else if (ev.k === 'quake') {
    if (ev.by !== myId) { quakeT = ev.d || 3; banners.push({ text: '지진!', life: 1.2, max: 1.2, small: true, color: '#d6a45c' }); }
    for (let i = 0; i < 20; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 120, y: ev.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 400, life: 0.6, max: 0.6, c: '#a3825a', r: 6 });
  } else if (ev.k === 'giant' || ev.k === 'rubber' || ev.k === 'engine') {
    const col = ev.k === 'giant' ? '255,107,74' : ev.k === 'rubber' ? '255,159,243' : '255,176,0';
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.k === 'giant' ? 120 : 70, c: col });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 220;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, max: 0.45, c: `rgb(${col})`, r: 5, nograv: true });
    }
  } else if (ev.k === 'bfq') {
    // 흑섬 발동: 검붉은 번쩍임 (이것만으로는 아무 일도 없음)
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 70, c: '150,10,30' });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, c: i % 2 ? '#1a0508' : '#b0142c', r: 5, nograv: true });
    }
  } else if (ev.k === 'bflash') {
    // 흑섬 적중: 검은 번개 + 붉은 폭발
    for (let i = 0; i < 6; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 90 + Math.random() * 90, life: 0.3, max: 0.3, c: i % 2 ? '#14040a' : '#e0203f' });
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 600;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: i % 3 ? '#c0263a' : '#120307', r: 6, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.p === 2 ? 150 : 110, c: '200,20,50' });
    shake = Math.max(shake, ev.p === 2 ? 20 : 14);
    banners.push({ text: '흑섬!', life: 1, max: 1, small: true, color: '#ff3355' });
  } else if (ev.k === 'bolt') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 60, c: '255,233,74' });
    for (const [x, y] of ev.pts || []) {
      particles.push({ strike: true, x, y, life: 0.45, max: 0.45, seed: Math.random() * 1000 });
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 300;
        particles.push({ x, y: y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: i % 2 ? '#fff6a8' : '#ffe94a', r: 4, nograv: true });
      }
    }
    if (ev.pts && ev.pts.length) { shake = Math.max(shake, 14); lightFlash = 0.25; }
    if (ev.h > 0) banners.push({ text: `번개! ${ev.h}명 스턴`, life: 1.2, max: 1.2, small: true, color: '#ffe94a' });
  } else if (ev.k === 'slash') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x, y: ev.y + (Math.random() - 0.5) * 50, vx: ev.f * (200 + Math.random() * 200), vy: (Math.random() - 0.5) * 80, life: 0.3, max: 0.3, c: '#e6f1ff', r: 4, nograv: true });
  } else if (ev.k === 'fdash') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 60, c: '255,120,40' });
  } else if (ev.k === 'burn') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, life: 0.4, max: 0.4, c: i % 2 ? '#ffb02e' : '#ff4d1a', r: 5, nograv: true });
  } else if (ev.k === 'iced') {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 240;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: i % 2 ? '#e8f8ff' : '#8fdcff', r: 5, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 70, c: '170,225,255' });
  } else if (ev.k === 'blizzard') {
    banners.push({ text: `${ev.n}의 눈보라!`, life: 1.4, max: 1.4, small: true, color: '#bfeaff' });
  } else if (ev.k === 'turret') {
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y - 10, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, life: 0.4, max: 0.4, c: '#c8d0dc', r: 4 });
  } else if (ev.k === 'tbreak') {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 360;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.6, max: 0.6, c: i % 2 ? '#7d8796' : '#ffb02e', r: 5 });
    }
  } else if (ev.k === 'error') {
    if (ev.by !== myId) banners.push({ text: `${ev.n}: 시스템 에러!`, life: 1.4, max: 1.4, small: true, color: '#39ff88' });
  } else if (ev.k === 'sun') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.6, max: 0.6, r: 140, c: '255,200,40', grow: true });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      particles.push({ x: ev.x + Math.cos(a) * 30, y: ev.y + Math.sin(a) * 30, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.5, max: 0.5, c: i % 2 ? '#fff3a0' : '#ffb21a', r: 5, nograv: true });
    }
  } else if (ev.k === 'map') {
    banners.push({ text: `맵: ${ev.n}`, life: 2.5, max: 2.5, small: true, color: '#ffcf3f' });
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

function interpolatedPlayers(key = 'p') {
  if (!snapshots.length) return [];
  const t = performance.now() - INTERP_DELAY;
  let a = snapshots[0], b = snapshots[snapshots.length - 1];
  for (let i = snapshots.length - 1; i > 0; i--) {
    if (snapshots[i - 1].time <= t) { a = snapshots[i - 1]; b = snapshots[i]; break; }
  }
  const span = b.time - a.time;
  const k = span > 0 ? Math.min(1, Math.max(0, (t - a.time) / span)) : 1;
  const prev = new Map((a[key] || []).map((p) => [p.id, p]));
  return (b[key] || []).map((p) => {
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
  const th = STAGE.theme;
  ctx.fillStyle = '#0b0a16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(offX, offY); ctx.scale(scale * STAGE.zoom, scale * STAGE.zoom);
  const W = STAGE.width, H = STAGE.height, sx0 = W / 1280;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (th.stars) {
    for (const s of stars) {
      ctx.globalAlpha = reduceMotion ? 0.5 : 0.35 + 0.35 * Math.sin(time / 700 + s.x);
      ctx.fillStyle = '#fff'; ctx.fillRect(s.x * sx0, s.y * sx0, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  } else {
    // 낮 하늘: 구름
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 290 * sx0 + time / 60) % (W + 300)) - 150, cy = (90 + (i % 3) * 55) * sx0;
      ctx.beginPath(); ctx.ellipse(cx, cy, 70, 22, 0, 0, Math.PI * 2); ctx.ellipse(cx + 45, cy - 12, 45, 20, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = th.orb + '0.14)'; ctx.beginPath(); ctx.arc(1040 * sx0, 150 * sx0, 110 * sx0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = th.orb + '0.3)'; ctx.beginPath(); ctx.arc(1040 * sx0, 150 * sx0, 70 * sx0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = th.hill; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 80) ctx.lineTo(x, (470 + Math.sin(x * 0.011 + STAGE.left) * 50 + Math.sin(x * 0.03) * 18) * sx0);
  ctx.lineTo(W, H); ctx.fill();
  if (th.water) {
    // 바다
    ctx.fillStyle = th.water; ctx.fillRect(0, H - 110, W, 110);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - 95 + k * 30 + Math.sin(x * 0.03 + time / 500 + k) * 5);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function drawStage() {
  const th = STAGE.theme;
  for (const s of STAGE.solids) {
    const thin = s.w < 80; // 성벽 기둥
    ctx.fillStyle = th.dirt; roundRect(s.x, s.y, s.w, s.h + (thin ? 0 : 40), thin ? 6 : 14); ctx.fill();
    ctx.fillStyle = th.grass; roundRect(s.x - (thin ? 2 : 6), s.y - 4, s.w + (thin ? 4 : 12), thin ? 14 : 22, thin ? 5 : 10); ctx.fill();
    ctx.fillStyle = th.grassHi; ctx.fillRect(s.x + 4, s.y - 2, s.w - 8, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    if (thin) { for (let y = s.y + 20; y < s.y + s.h - 8; y += 22) ctx.fillRect(s.x + 6, y, s.w - 12, 6); }
    else for (let x = s.x + 30; x < s.x + s.w - 20; x += 70) ctx.fillRect(x, s.y + 35, 28, 8);
  }
  for (const p of STAGE.platforms) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(p.x + 4, p.y + 6, p.w, 14, 7); ctx.fill();
    ctx.fillStyle = th.plat; roundRect(p.x, p.y, p.w, 14, 7); ctx.fill();
    ctx.fillStyle = th.platHi; ctx.fillRect(p.x + 8, p.y + 2, p.w - 16, 3);
  }
}
function drawPlayer(p, time) {
  if (!p.al || p.hid) return;       // 은신 중인 상대는 서버가 위치를 안 보내줌
  const isClone = !!p.ow;
  const ownerId = p.ow || p.id;
  // 은신 중인 나: 반투명 / 내 분신: 연하게 / 상대 분신: 진짜와 똑같이
  let baseAlpha = 1;
  if (p.stl) baseAlpha = 0.35;
  const light = isClone && p.ow === myId; // 내 분신은 연한 색으로
  ctx.globalAlpha = baseAlpha * (p.inv && Math.floor(time / 80) % 2 === 0 ? 0.45 : 1);
  const x = p.x, y = p.y, f = p.f || 1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const G = p.sz || (p.gt ? 2 : 1);
  ctx.beginPath(); ctx.ellipse(x, y + 2, 22 * G, 5 * G, 0, 0, Math.PI * 2); ctx.fill();
  if (latest && latest.md && latest.md[0] && !isClone && TEAMS[p.tm]) {
    // 팀 모드: 발밑에 팀 색 고리
    ctx.strokeStyle = TEAMS[p.tm].color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y + 2, 28 * G, 8 * G, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // 둔화 상태: 발밑에 파란 고리
  if (p.sl) {
    ctx.strokeStyle = 'rgba(127,184,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 30, 8, 0, 0, Math.PI * 2); ctx.stroke();
  }
  let sx = 1, sy = 1;
  if (!p.g) { sy = p.vy < 0 ? 1.08 : 0.95; sx = 2 - sy; }
  ctx.save(); ctx.translate(x, y);
  if (p.hs && !reduceMotion) ctx.rotate(Math.sin(time / 30) * 0.25);
  ctx.scale(sx * G, sy * G);
  if (p.at === 2 && p.ap === 1) {
    ctx.fillStyle = 'rgba(255,207,63,0.35)';
    ctx.beginPath(); ctx.arc(0, -PH / 2, 44 + Math.sin(time / 30) * 4, 0, Math.PI * 2); ctx.fill();
  }
  if (p.en) {
    // 엔진: 뒤쪽 불꽃
    const len = 18 + Math.min(40, Math.abs(p.vx || 0) / 14) + Math.sin(time / 40) * 5;
    const back = -f * PW / 2;
    const g2 = ctx.createLinearGradient(back, 0, back - f * len, 0);
    g2.addColorStop(0, 'rgba(255,220,90,0.95)'); g2.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(back, -PH * 0.62); ctx.lineTo(back - f * len, -PH * 0.45); ctx.lineTo(back, -PH * 0.28); ctx.closePath(); ctx.fill();
  }
  if (p.rb) {
    // 고무: 말랑하게 출렁임
    const wob = 1 + Math.sin(time / 70) * 0.06;
    ctx.scale(2 - wob, wob);
  }
  if (p.bf) {
    // 강화: 파란 오라
    const pulse = 1 + Math.sin(time / 90) * 0.08;
    ctx.fillStyle = 'rgba(80,140,255,0.28)';
    ctx.beginPath(); ctx.ellipse(0, -PH / 2, 36 * pulse, 46 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,170,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
  }
  if (p.fly) {
    // 비행: 날개
    const flap = Math.sin(time / 60) * 0.5;
    ctx.fillStyle = 'rgba(240,248,255,0.92)';
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * PW / 2, -PH * 0.62); ctx.rotate(sd * (0.5 + flap));
      ctx.beginPath(); ctx.ellipse(sd * 16, 0, 18, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  if (p.sun) {
    // 태양: 뒤에서 빛나는 햇살
    ctx.save(); ctx.translate(0, -PH / 2); ctx.rotate(time / 900);
    ctx.fillStyle = 'rgba(255,200,40,0.35)';
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(-6, 30); ctx.lineTo(0, 54 + Math.sin(time / 120 + i) * 6); ctx.lineTo(6, 30); ctx.fill(); }
    const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 44);
    sg.addColorStop(0, 'rgba(255,230,120,0.55)'); sg.addColorStop(1, 'rgba(255,170,30,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (p.fd) {
    // 화염 돌진: 뒤로 긴 불꽃
    const g3 = ctx.createLinearGradient(0, 0, -f * 120, 0);
    g3.addColorStop(0, 'rgba(255,200,60,0.9)'); g3.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g3; ctx.beginPath(); ctx.ellipse(-f * 50, -PH / 2, 80, 30, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = p.hs ? '#ffffff' : p.c;
  roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
  if (hasK(p, 'hulk') && G > 1.02) {
    // 헐크: 커질수록 초록빛 + 근육 줄
    const hf = (G - 1) / 0.9;
    ctx.fillStyle = `rgba(80,200,70,${0.15 + hf * 0.4})`; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
    ctx.strokeStyle = `rgba(20,60,20,${0.2 + hf * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -PH + 30); ctx.quadraticCurveTo(0, -PH + 36, 10, -PH + 30); ctx.stroke();
  }
  if (p.c === '#26252e' || p.c === '#f4f4f6') { ctx.strokeStyle = p.c === '#26252e' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke(); }
  if (p.rk) {
    // 바위: 딱딱한 돌 모양
    ctx.fillStyle = 'rgba(128,122,116,0.88)';
    ctx.beginPath(); ctx.moveTo(-PW / 2 - 3, -PH + 8); ctx.lineTo(-6, -PH - 4); ctx.lineTo(PW / 2 + 3, -PH + 4);
    ctx.lineTo(PW / 2 + 2, -4); ctx.lineTo(4, 2); ctx.lineTo(-PW / 2 - 2, -2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,56,52,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -PH + 6); ctx.lineTo(-2, -PH / 2); ctx.lineTo(-12, -14); ctx.moveTo(8, -PH + 14); ctx.lineTo(12, -24); ctx.stroke();
  }
  if (p.brn) {
    // 불붙음: 몸 위로 흔들리는 불꽃
    for (let i = 0; i < 3; i++) {
      const fx2 = -12 + i * 12, h2 = 16 + Math.sin(time / 50 + i * 2) * 6;
      ctx.fillStyle = i % 2 ? 'rgba(255,180,40,0.85)' : 'rgba(255,80,20,0.85)';
      ctx.beginPath(); ctx.moveTo(fx2 - 7, -PH + 10); ctx.quadraticCurveTo(fx2, -PH - h2, fx2 + 7, -PH + 10); ctx.fill();
    }
  }
  if (p.icd) {
    // 얼음에 갇힘
    ctx.fillStyle = 'rgba(150,215,255,0.6)'; ctx.beginPath();
    ctx.moveTo(-PW / 2 - 8, -4); ctx.lineTo(-PW / 2 - 10, -PH + 6); ctx.lineTo(-6, -PH - 10); ctx.lineTo(PW / 2 + 9, -PH - 2); ctx.lineTo(PW / 2 + 8, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,250,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -PH + 2); ctx.lineTo(-4, -PH / 2); ctx.moveTo(8, -PH + 8); ctx.lineTo(14, -20); ctx.stroke();
  }
  if (p.frz) {
    ctx.fillStyle = 'rgba(214,238,255,0.55)'; roundRect(-PW / 2 - 4, -PH - 4, PW + 8, PH + 8, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (p.ctl) {
    // 기생당함: 초록 눈
    ctx.fillStyle = 'rgba(123,227,111,0.9)';
    ctx.beginPath(); ctx.arc(0, -PH - 14, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#163a12'; ctx.beginPath(); ctx.arc(0, -PH - 14, 3, 0, Math.PI * 2); ctx.fill();
  }
  if (light) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill(); }
  if (p.sl) { ctx.fillStyle = 'rgba(127,184,255,0.45)'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; roundRect(-PW / 2, -PH * 0.35, PW, PH * 0.35, 10); ctx.fill();
  if (p.dm) {
    // 더미: 몸에 과녁
    for (const [r, c] of [[13, '#ffffff'], [9, '#ff4d4d'], [5, '#ffffff'], [2, '#ff4d4d']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -PH * 0.42, r, 0, Math.PI * 2); ctx.fill(); }
  } else if (p.b) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-2, -PH - 10, 4, 10); ctx.beginPath(); ctx.arc(0, -PH - 12, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fff';
  ctx.fillRect(f * 4 - 2, -PH + 14, 8, 11); ctx.fillRect(f * 4 + 10 * f - 2, -PH + 14, 8, 11);
  ctx.fillStyle = '#1a1030';
  ctx.fillRect(f * 4 + f * 2, -PH + 17, 4, 6); ctx.fillRect(f * 4 + 10 * f + f * 2, -PH + 17, 4, 6);
  // 사거리 버프 (몸 크기 기준): 거인은 몸이 2배라 1.6/2, 헐크도 몸 크기로 나눔
  const hf = hasK(p, 'hulk') && G > 1 ? (G - 1) / 0.9 : 0;
  const otherM = (p.gt ? 1.6 / 2 : 1) * (p.bf ? 1.3 : 1) * (hf ? (1 + 0.6 * hf) / G : 1);
  let reach = 0;
  if (p.at) {
    // 사거리 늘어나는 스킬은 팔도 길어짐 (거인은 몸이 2배라 그만큼 나눔)
    const mult = (p.rb ? 2 : 1) * otherM;
    const full = (p.at === 2 ? 60 : 46) * mult + (p.rb ? 40 : 0);
    reach = p.ap === 1 ? -6 : p.ap === 2 ? full : full * 0.4;
  }
  const fx = f * (PW / 2 + 4 + reach), fy = -PH / 2 - 2;
  if (hasK(p, 'sword')) {
    drawSword(p, f, time, p.rb ? 2 : 1, otherM);
    ctx.restore();
    finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time);
    return;
  }
  if (p.rb && p.at && p.ap !== 1) {
    ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, -PH / 2 - 2); ctx.lineTo(f * (PW / 2 + 4 + reach), -PH / 2 - 2); ctx.stroke();
  }
  if (p.ap === 2) {
    ctx.strokeStyle = p.at === 2 ? 'rgba(255,207,63,0.8)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = p.at === 2 ? 10 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, fy); ctx.lineTo(fx, fy); ctx.stroke();
  }
  if (hasK(p, 'fire') || hasK(p, 'ice') || p.sun) {
    // 주먹에 불꽃 / 냉기
    const fr = (p.at === 2 ? 20 : 16) + Math.sin(time / 60) * 3;
    const gl = ctx.createRadialGradient(fx, fy, 2, fx, fy, fr);
    const hot = hasK(p, 'fire') || p.sun;
    gl.addColorStop(0, hot ? 'rgba(255,220,90,0.95)' : 'rgba(235,250,255,0.95)');
    gl.addColorStop(1, hot ? 'rgba(255,60,20,0)' : 'rgba(120,200,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(fx, fy, p.at === 2 ? 13 : 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (light) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(fx, fy, 10, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time);
}
// 검사: 손에 든 검 + 베기 궤적 (몸 좌표계 안에서 그림)
//  rubM: 고무(팔이 늘어남), otherM: 강화·거인·헐크 (검이 길어짐)
function drawSword(p, f, time, rubM = 1, otherM = 1) {
  const swinging = p.at && p.ap !== 1;
  // 고무: 휘두를 때 팔이 쭉 늘어나고 그 끝에서 검을 휘두름
  const ext = swinging && rubM > 1 && !(p.at === 2 && p.ap === 2) ? 72 * otherM * (rubM - 1) + 40 : 0;
  const hx = f * (PW / 2 + 2 + ext), hy = -PH / 2 - 2;
  if (ext) {
    ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, hy); ctx.lineTo(hx, hy); ctx.stroke();
  }
  let ang;                         // 0 = 앞으로 수평
  const L = 64 * otherM;           // 검 길이 (사거리 버프만큼 길어짐)
  if (p.at === 1) ang = p.ap === 1 ? -1.3 : p.ap === 2 ? 0.15 : 0.6;
  else if (p.at === 2) ang = p.ap === 1 ? -2.4 : p.ap === 2 ? (time / 40) % (Math.PI * 2) : 0.9;
  else ang = -0.9 + Math.sin(time / 400) * 0.05;
  // 불(화염·태양) / 얼음이면 검날이 빛남
  const hot = hasK(p, 'fire') || p.sun, cold = hasK(p, 'ice');
  const glow = hot ? 'rgba(255,120,30,0.95)' : cold ? 'rgba(140,220,255,0.95)' : null;
  // 베기 궤적
  if (p.ap === 2 && p.at === 1) {
    ctx.fillStyle = hot ? 'rgba(255,170,80,0.45)' : cold ? 'rgba(170,230,255,0.45)' : 'rgba(220,235,255,0.45)';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L + 18, f > 0 ? -1.2 : Math.PI - 0.3, f > 0 ? 0.3 : Math.PI + 1.2); ctx.closePath(); ctx.fill();
  }
  if (p.ap === 2 && p.at === 2) {
    // 부채꼴: 머리 위로 크게 반원 (사거리 버프만큼 커짐)
    const R = 125 * 1.25 * otherM * rubM;
    const g = ctx.createRadialGradient(0, -PH / 2, 20, 0, -PH / 2, R);
    g.addColorStop(0, 'rgba(220,235,255,0)');
    g.addColorStop(0.75, hot ? 'rgba(255,170,80,0.25)' : cold ? 'rgba(170,230,255,0.25)' : 'rgba(220,235,255,0.25)');
    g.addColorStop(1, hot ? 'rgba(255,200,120,0.75)' : cold ? 'rgba(200,240,255,0.75)' : 'rgba(240,248,255,0.75)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -PH / 2); ctx.arc(0, -PH / 2, R, Math.PI + 0.05, -0.05 + Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -PH / 2, R, Math.PI + 0.05, Math.PI * 2 - 0.05); ctx.stroke();
    if (rubM > 1) {
      // 고무: 늘어난 팔 끝의 검이 반원을 따라 돎
      const a2 = Math.PI + ((time / 60) % Math.PI), r2 = Math.max(20, R - L - 16);
      const ex = Math.cos(a2) * r2, ey = -PH / 2 + Math.sin(a2) * r2;
      ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -PH / 2); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a2);
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
      ctx.fillStyle = hot ? '#ffe2b0' : cold ? '#dff5ff' : '#e8f0ff'; ctx.strokeStyle = '#5a6a88'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(6 + L, -2); ctx.lineTo(12 + L, 0); ctx.lineTo(6 + L, 3); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill();
      return;
    }
  }
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f, 1); ctx.rotate(ang);
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
  ctx.fillStyle = hot ? '#ffe2b0' : cold ? '#dff5ff' : '#e8f0ff'; ctx.strokeStyle = '#5a6a88'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10 + L, -2); ctx.lineTo(16 + L, 0); ctx.lineTo(10 + L, 3); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(6, -10, 5, 20);         // 코등이
  ctx.fillStyle = '#4a2f1e'; ctx.fillRect(-6, -3, 12, 6);         // 손잡이
  ctx.restore();
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
function finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time) {
  if (p.ig > 0 && !p.icd) {
    // 얼음 게이지
    const bw2 = 46, bx = x - bw2 / 2, by2 = y - PH * G - 42 - (p.b ? 12 : 0);
    ctx.fillStyle = 'rgba(10,20,40,0.7)'; roundRect(bx - 2, by2 - 2, bw2 + 4, 10, 4); ctx.fill();
    ctx.fillStyle = '#8fdcff'; roundRect(bx, by2, bw2 * Math.min(1, p.ig / 100), 6, 3); ctx.fill();
  }
  if (p.stn) {
    // 스턴: 머리 위에 빙글빙글 별
    for (let i = 0; i < 3; i++) {
      const a = time / 180 + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 20 * G, sy = y - PH * G - 8 + Math.sin(a) * 6;
      ctx.fillStyle = '#ffe94a'; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 7, t = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(sx + Math.cos(t) * r, sy + Math.sin(t) * r); }
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = baseAlpha;
  const lift = (p.b ? 12 : 0) + PH * (G - 1);
  ctx.font = '700 15px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
  const isMe = p.id === myId || p.ctl === myId;
  const label = light ? '내 분신' : (isMe ? '▼ ' : '') + (ownerId === hostLive ? '♛ ' : '') + p.n
    + (p.stl && p.id === myId ? ' (은신)' : '') + (p.ctl ? (p.ctl === myId ? ' (조종 중)' : ' (기생당함)') : '');
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(label, x + 1, y - PH - 13 - lift - (p.ctl ? 14 : 0));
  ctx.fillStyle = isMe ? '#ffcf3f' : p.ctl ? '#9ef08f' : '#fff'; ctx.fillText(label, x, y - PH - 14 - lift - (p.ctl ? 14 : 0));
  ctx.globalAlpha = 1;
  if (!isClone && (x < 0 || x > STAGE.width || y < 0)) {
    const ax = Math.max(24, Math.min(STAGE.width - 24, x)), ay = Math.max(24, y);
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ax, ay, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
}
function drawParticles(dt) {
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.ring) {
      const rad = p.shrink ? p.r * a : p.grow ? p.r * (1 - a * 0.6) : p.r * (1 - a) + 8;
      if (p.fill) { ctx.fillStyle = `rgba(${p.c},${a * 0.18})`; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = `rgba(${p.c},${a})`; ctx.lineWidth = 4 * a + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.stroke();
    } else if (p.bolt) {
      // 짧은 지그재그 번개 줄기
      ctx.strokeStyle = p.c; ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      for (let k = 1; k <= 4; k++) {
        const d = (p.len * k) / 4, off = (k % 2 ? 1 : -1) * 12;
        ctx.lineTo(p.x + Math.cos(p.a) * d - Math.sin(p.a) * off, p.y + Math.sin(p.a) * d + Math.cos(p.a) * off);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    } else if (p.strike) {
      // 하늘에서 내리치는 번개
      const top = -60;
      let x = p.x, seed = p.seed;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, col] of [[14, `rgba(255,240,120,${a * 0.35})`], [5, `rgba(255,255,230,${a})`]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x + (rnd() - 0.5) * 60, top);
        seed = p.seed;
        for (let y = top; y <= p.y - 30; y += 40) { x = p.x + (rnd() - 0.5) * 50; ctx.lineTo(x, y); }
        ctx.lineTo(p.x, p.y - 30); ctx.stroke();
      }
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
function skillStatus(p) {
  const k = validSkill(p.sk);
  const t = (v) => (v > 0 ? v.toFixed(1) + 's' : '준비');
  if (k === 'magnet') return { ready: !(p.cd > 0) || !(p.cd2 > 0), text: `Q ${t(p.cd)} E ${t(p.cd2)}` };
  if (k === 'empower') return p.bf ? { ready: true, text: `강화 중 ${p.bt}s` } : { ready: p.chg >= 100, text: p.chg >= 100 ? '충전 완료!' : `충전 ${p.chg || 0}%` };
  if (k === 'undying' || k === 'hulk') return { ready: true, text: '패시브' };
  if (k === 'parasite') return p.ins ? { ready: true, text: `기생 중 ${p.pt}s` } : { ready: p.pr > 0, text: p.pr > 0 ? `가능 ${p.pr}명` : '3번 때리기' };
  return { ready: !(p.cd > 0), text: t(p.cd) };
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
    if (state.ph === 'waiting') {
      const host = p.id === state.host, bot = p.b;
      ctx.font = '700 11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'right';
      ctx.fillStyle = host ? '#ffcf3f' : (p.rd || bot) ? '#6fe39a' : '#a39fc4';
      ctx.fillText(host ? '방장' : p.dm ? '더미' : bot ? '봇' : p.rd ? '준비 ✓' : '대기', x0 + cw - 12, y0 + 22);
      ctx.textAlign = 'left';
    }
    if (state.ph === 'playing' || state.ph === 'ended') {
      const ms = p.ms || CONFIG.STOCKS, gap2 = ms > 3 ? 11 : 16, rr = ms > 3 ? 4.5 : 6;
      for (let i = 0; i < ms; i++) {
        ctx.fillStyle = i < p.st ? p.c : 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(x0 + cw - 16 - i * gap2, y0 + 18, rr, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 스킬 쿨타임
    const sk = SKILLS[validSkill(p.sk)];
    const skColor = SKILL_COLOR[validSkill(p.sk)];
    const st = skillStatus(p);
    const ready = st.ready;
    ctx.font = '700 11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = ready ? skColor : '#6d6893';
    if (p.dm) { ctx.fillStyle = '#a39fc4'; ctx.fillText('가만히 있음', x0 + 18, y0 + 76, cw - 60); }
    else if (p.sk2) {
      // 더블: 두 스킬을 짧게
      const st2 = skillStatus({ ...p, sk: p.sk2, cd: p.cdB });
      const short = (t) => t.replace('준비', '✓');
      ctx.fillText(`${sk.name} ${short(st.text)}`, x0 + 18, y0 + 69, cw - 60);
      ctx.fillStyle = st2.ready ? SKILL_COLOR[validSkill(p.sk2)] : '#6d6893';
      ctx.fillText(`${SKILLS[validSkill(p.sk2)].name} ${short(st2.text)}`, x0 + 18, y0 + 81, cw - 60);
    } else ctx.fillText(`${sk.name} ${st.text}`, x0 + 18, y0 + 76, cw - 60);
    if (state.md && state.md[0] && TEAMS[p.tm]) { ctx.fillStyle = TEAMS[p.tm].color; roundRect(x0 + 10, y0, cw - 10, 5, 2); ctx.fill(); }
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
    smallText(isHost ? '모두 준비되면 위의 "게임 시작"을 눌러요 · 그동안 연습할 수 있어요' : '준비를 누르고 방장(♛)이 시작하길 기다려요 · 그동안 연습할 수 있어요', 330);
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


// 폭파 연기: 짙은 연기가 물리적으로 덮어서 안이 안 보임 (캐릭터 위에 그림)
function drawSmoke(list, time) {
  for (const s of list) {
    const a = Math.min(1, s.a * 2.2);
    // 바깥쪽 몽글몽글한 가장자리
    for (let i = 0; i < 16; i++) {
      const ang = i * 2.399 + time / 2600, rr = s.r * (0.55 + (i % 4) * 0.12);
      const x = s.x + Math.cos(ang) * rr * 0.75, y = s.y + Math.sin(ang) * rr * 0.6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 0.5);
      g.addColorStop(0, `rgba(104,100,122,${0.95 * a})`);
      g.addColorStop(1, 'rgba(104,100,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, s.r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    // 가운데는 완전히 불투명
    ctx.fillStyle = `rgba(92,88,108,${a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(120,116,136,${0.5 * a})`;
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.05 + time / 1800;
      ctx.beginPath(); ctx.arc(s.x + Math.cos(ang) * s.r * 0.35, s.y + Math.sin(ang) * s.r * 0.3, s.r * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }
}
let freezeFlash = 0, lightFlash = 0, errHold = 0;
function drawGlitch() {
  // 화면 위에 어긋난 색 띠와 노이즈
  for (let i = 0; i < 6; i++) {
    const y = Math.random() * H, h = 4 + Math.random() * 30;
    ctx.fillStyle = ['rgba(57,255,136,0.25)', 'rgba(255,40,120,0.22)', 'rgba(40,160,255,0.22)'][i % 3];
    ctx.fillRect((Math.random() - 0.5) * 60, y, W, h);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 40, 2);
  ctx.font = '700 20px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(57,255,136,0.85)';
  if (Math.random() < 0.5) ctx.fillText('ERR0R: INPUT_STREAM CORRUPTED', W / 2 + (Math.random() - 0.5) * 20, 160);
}
// 터렛 + 총알
function drawTurrets(state, now) {
  for (const t of state.tr || []) {
    const x = t.x, y = t.y;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
    // 다리
    ctx.strokeStyle = '#4b5361'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 6, y - 18); ctx.moveTo(x + 16, y); ctx.lineTo(x + 6, y - 18); ctx.stroke();
    // 몸통 (주인 색 띠)
    ctx.fillStyle = '#8994a6'; ctx.beginPath(); ctx.arc(x, y - 30, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.c; ctx.fillRect(x - 17, y - 32, 34, 5);
    // 포신
    ctx.save(); ctx.translate(x, y - 30); ctx.rotate(t.a);
    ctx.fillStyle = '#3c4350'; ctx.fillRect(4, -5, 26, 10); ctx.fillStyle = '#ffb02e'; ctx.fillRect(28, -3, 4, 6);
    ctx.restore();
    ctx.fillStyle = '#c8d0dc'; ctx.beginPath(); ctx.arc(x, y - 30, 7, 0, Math.PI * 2); ctx.fill();
    // 체력
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i < t.hp ? '#6fe39a' : 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 17 + i * 9, y - 56, 7, 4); }
  }
  const age = Math.max(-0.07, (now - state.time - INTERP_DELAY) / 1000);
  for (const b of state.bl || []) {
    const x = b.x + b.vx * age, y = b.y + b.vy * age;
    ctx.strokeStyle = 'rgba(255,200,80,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * 0.025, y - b.vy * 0.025); ctx.stroke();
    ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
}
// 눈보라: 화면 가득 눈이 옆으로 날림
let snow = [];
function drawBlizzard(state, dt, now) {
  const on = state.bz > 0;
  if (on && snow.length < 160) for (let i = 0; i < 8; i++) snow.push({ x: Math.random() * (STAGE.width + 400) - 300, y: -20 - Math.random() * 100, vx: 260 + Math.random() * 200, vy: 160 + Math.random() * 140, r: 2 + Math.random() * 3 });
  if (!snow.length) return;
  if (on) { ctx.fillStyle = 'rgba(200,230,255,0.12)'; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); }
  ctx.fillStyle = 'rgba(245,250,255,0.9)';
  for (const f of snow) {
    f.x += f.vx * dt; f.y += f.vy * dt;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
  }
  snow = snow.filter((f) => f.y < STAGE.height + 40 && f.x < STAGE.width + 60 && (on || Math.random() > 0.002));
}
// 검사 참격: 초승달 모양으로 날아감
function drawSlashes(state, now) {
  const age = (now - state.time - INTERP_DELAY) / 1000;
  for (const s of state.pj || []) {
    const x = s.x + s.vx * Math.max(-0.07, age), y = s.y, f = s.vx > 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    const g = ctx.createLinearGradient(-60, 0, 30, 0);
    g.addColorStop(0, 'rgba(200,225,255,0)'); g.addColorStop(1, 'rgba(240,248,255,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-10, -46); ctx.quadraticCurveTo(46, 0, -10, 46); ctx.quadraticCurveTo(18, 0, -10, -46); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -46); ctx.quadraticCurveTo(46, 0, -10, 46); ctx.stroke();
    ctx.restore();
  }
}
let quakeT = 0;   // 지진: 남은 흔들림 시간 (시전자는 0)

// ---------------- 대기실 패널 (준비 · 시작 · 색 · 스킬) ----------------
const PALETTE = MAPS.COLORS;
let panelKey = '';
let myReady = false;
(function buildPanel() {
  const sw = $('swatches');
  for (const c of PALETTE) {
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.dataset.hex = c.hex;
    b.style.background = c.hex; b.title = c.name; b.setAttribute('aria-label', c.name);
    b.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'color', color: c.hex }); });
    sw.append(b);
  }
  $('readyBtn').addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (isHost) send({ t: 'start' });
    else { myReady = !myReady; send({ t: 'ready', on: myReady }); }
  });
  for (const [segId, field] of [['segTeam', 0], ['segDbl', 1]]) {
    $(segId).querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
      e.currentTarget.blur();
      if (!latest || !latest.md) return;
      const md = [...latest.md]; md[field] = +b.dataset.v;
      send({ t: 'mode', team: !!md[0], dbl: !!md[1] });
    }));
  }
  $('rpFold').addEventListener('click', (e) => {
    const folded = $('roomPanel').classList.toggle('folded');
    e.currentTarget.textContent = folded ? '펼치기' : '접기';
    e.currentTarget.setAttribute('aria-expanded', String(!folded));
  });
})();
function renderSkillChips(current, boxId = 'skillChips', msg = 'skill', other = null) {
  const box = $(boxId);
  const owned = account.profile ? account.profile.owned : BASE_SKILLS;
  box.textContent = '';
  for (const k of SKILL_IDS) {
    if (!owned.includes(k)) continue;
    const b = document.createElement('button');
    b.className = 'chip' + (k === current ? ' on' : ''); b.type = 'button';
    const dot = document.createElement('i'); dot.style.background = SKILL_COLOR[k];
    b.append(dot, SKILLS[k].name);
    b.title = `${SKILLS[k].desc}. ${SKILLS[k].cd}` + (k === other ? ' (다른 칸에서 쓰는 중 · 누르면 서로 바뀜)' : '');
    if (k === other) b.style.opacity = '.5';
    b.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: msg, skill: k }); });
    box.append(b);
  }
}
function updateRoomPanel(m) {
  const show = inGame && m.ph === 'waiting';
  $('roomPanel').hidden = !show;
  if (!show) { myReady = false; return; }
  const me = m.p.find((p) => p.id === myId);
  if (!me) return;
  if (me.sk !== account.skill) selectSkill(me.sk, true);
  myReady = !!me.rd;
  const taken = new Set(m.p.filter((p) => p.id !== myId).map((p) => p.c));
  const [ready, need] = m.rdy || [0, 0];
  const host = m.host === myId;
  const md = m.md || [0, 0];
  const key = [me.c, me.sk, me.sk2, me.rd, host, ready, need, m.p.length, [...taken].join(), (account.profile && account.profile.owned.join()) || '',
    md.join(), m.p.map((p) => p.id + ':' + p.tm + ':' + p.n).join()].join('|');
  if (key === panelKey) return;
  panelKey = key;
  document.querySelectorAll('.sw').forEach((b) => {
    b.classList.toggle('on', b.dataset.hex === me.c);
    b.disabled = taken.has(b.dataset.hex);
    const name = PALETTE.find((c) => c.hex === b.dataset.hex).name;
    b.title = b.disabled ? `${name} (다른 사람이 사용 중)` : name;
  });
  renderSkillChips(me.sk, 'skillChips', 'skill', md[1] ? me.sk2 : null);
  // 모드 (방장만 바꿀 수 있음)
  for (const [segId, field] of [['segTeam', 0], ['segDbl', 1]]) {
    $(segId).querySelectorAll('button').forEach((b) => { b.classList.toggle('on', +b.dataset.v === md[field]); b.disabled = !host; b.setAttribute('aria-pressed', String(+b.dataset.v === md[field])); });
  }
  $('modeNote').textContent = host ? '' : '방장이 정해요';
  // 팀 나누기 (팀 모드)
  $('teamRow').hidden = !md[0];
  const tl = $('teamList'); tl.textContent = '';
  if (md[0]) {
    for (const p of m.p) {
      const pill = document.createElement('div'); pill.className = 'tp';
      const nm = document.createElement('span'); nm.textContent = (p.dm ? '🎯 ' : p.b ? '🤖 ' : '') + p.n; nm.style.color = p.id === myId ? '#ffcf3f' : '';
      pill.append(nm);
      for (let t = 1; t <= 4; t++) {
        const d = document.createElement('button'); d.type = 'button';
        d.className = 'tdot' + (p.tm === t ? ' on' : ''); d.style.background = TEAMS[t].color;
        d.title = `${p.n} → ${TEAMS[t].name}`; d.setAttribute('aria-label', d.title); d.disabled = !host;
        d.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'team', id: p.id, team: t }); });
        pill.append(d);
      }
      tl.append(pill);
    }
  }
  // 두 번째 스킬 (더블 모드)
  $('chip2Row').hidden = !md[1];
  if (md[1]) renderSkillChips(me.sk2, 'skillChips2', 'skill2', me.sk);
  const sl = slotsOf(me);
  $('keysNote').hidden = !md[1];
  if (md[1]) $('keysNote').textContent = sl.x ? `자석 당기기 Q · 밀기 E · ${SKILLS[validSkill(sl.x)].name} R` : `${SKILLS[validSkill(me.sk)].name} Q · ${me.sk2 ? SKILLS[validSkill(me.sk2)].name : '?'} E`;
  const btn = $('readyBtn');
  if (host) {
    const teamsOk = !md[0] || new Set(m.p.map((p) => p.tm)).size >= 2;
    const canStart = m.p.length >= 2 && ready === need && teamsOk;
    btn.textContent = '게임 시작';
    btn.classList.remove('on');
    btn.disabled = !canStart;
    $('rpStatus').textContent = m.p.length < 2 ? '방장 · 2명 이상 필요 (봇 추가 가능)'
      : !teamsOk ? '방장 · 팀을 2개 이상으로 나눠 주세요'
      : need === 0 ? '방장 · 바로 시작할 수 있어요' : `방장 · 준비 ${ready}/${need}명`;
  } else {
    btn.disabled = false;
    btn.textContent = me.rd ? '준비 완료 (취소하려면 누르기)' : '준비';
    btn.classList.toggle('on', !!me.rd);
    $('rpStatus').textContent = `준비 ${ready}/${need}명 · 방장이 시작하면 게임이 시작돼요`;
  }
}

// ---------------- 메인 루프 ----------------
let last = performance.now(), barCounter = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;

  if (latest && isTouch) {
    const meS = latest.p.find((p) => p.id === myId);
    if (meS) {
      const sl = slotsOf(meS);
      const btn = (el, nameEl, cdEl, k, keyName) => {
        el.hidden = !k;
        if (!k) return;
        const kk = k === 'magnet2' ? 'magnet' : validSkill(k), cd = cdOf(meS, k);
        let ready = !(cd > 0), txt = cd > 0 ? cd.toFixed(1) : keyName;
        if (kk === 'empower') { ready = meS.chg >= 100 || meS.bf; txt = meS.bf ? '강화' : `${meS.chg || 0}%`; }
        if (kk === 'parasite') { ready = meS.pr > 0 || meS.ins; txt = meS.ins ? '나가기' : `${meS.pr || 0}명`; }
        if (kk === 'undying' || kk === 'hulk') { ready = true; txt = '패시브'; }
        const nm = k === 'magnet2' ? '밀기' : sl.e === 'magnet2' && k === 'magnet' ? '당기기' : SKILLS[kk].name;
        if (nameEl.textContent !== nm) nameEl.textContent = nm;
        el.style.borderColor = SKILL_COLOR[kk];
        cdEl.textContent = txt;
        el.classList.toggle('cool', !ready);
      };
      btn($('tSkill'), $('tSkillName'), $('tSkillCd'), sl.s, 'Q');
      btn($('tSkill2'), $('tSkill2Name'), $('tSkill2Cd'), sl.e, 'E');
      btn($('tSkill3'), $('tSkill3Name'), $('tSkill3Cd'), sl.x, 'R');
    }
  }
  if (online && latest && ++barCounter % 30 === 0) {
    const people = latest.p.filter((p) => !p.b).length;
    $('net').textContent = `같은 방 ${people}명${pingMs != null ? ` · 핑 ${pingMs}ms` : ''}`;
  }

  // 에러: 내 화면이 끊김 (가끔 그리기를 멈추고, 깨진 줄무늬가 지나감)
  const meE = latest && latest.p.find((p) => p.id === myId);
  if (meE && meE.er && !reduceMotion) {
    if (errHold > 0) { errHold -= dt; requestAnimationFrame(frame); return; }
    if (Math.random() < 0.06) errHold = 0.08 + Math.random() * 0.35;
  } else errHold = 0;
  drawBackground(now);
  if (latest) {
    const players = interpolatedPlayers();
    ctx.save();
    shake *= Math.pow(0.002, dt);
    let sx = (Math.random() - 0.5) * shake * scale, sy = (Math.random() - 0.5) * shake * scale;
    let rot = 0;
    if (quakeT > 0) {
      quakeT -= dt;
      const q = reduceMotion ? 6 : 34 * Math.min(1, quakeT + 0.3);
      sx += (Math.random() - 0.5) * q * 2 * scale; sy += (Math.random() - 0.5) * q * 2 * scale;
      rot = reduceMotion ? 0 : (Math.random() - 0.5) * 0.05;
    }
    ctx.translate(offX + sx, offY + sy);
    if (rot) { ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rot); ctx.translate(-canvas.width / 2, -canvas.height / 2); }
    ctx.scale(scale * STAGE.zoom, scale * STAGE.zoom);
    drawStage();
    drawSlashes(latest, now);
    drawTurrets(latest, now);
    interpolatedPlayers('cl').forEach((c) => drawPlayer(c, now));
    players.filter((p) => p.id !== myId).forEach((p) => drawPlayer(p, now));
    players.filter((p) => p.id === myId).forEach((p) => drawPlayer(p, now));
    drawParticles(dt);
    drawSmoke(latest.sm || [], now);
    drawBlizzard(latest, dt, now);
    if (freezeFlash > 0) { ctx.fillStyle = `rgba(210,236,255,${Math.min(0.35, freezeFlash)})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); freezeFlash -= dt; }
    if (lightFlash > 0) { ctx.fillStyle = `rgba(255,250,200,${Math.min(0.3, lightFlash)})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); lightFlash -= dt; }
    ctx.restore();
    ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale);
    if (meE && meE.er) drawGlitch();
    drawHUD(latest, players);
    drawPhase(latest, players, dt);
    ctx.restore();
  } else if ($('lobby').hidden) {
    ctx.save(); ctx.translate(offX, offY); ctx.scale(scale * STAGE.zoom, scale * STAGE.zoom);
    drawStage(); ctx.restore(); ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale); smallText('방에 연결하는 중…', 200); ctx.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
