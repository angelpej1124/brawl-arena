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
  slow:     { name: '둔화', desc: '넓은 범위의 적 이동·공격 속도를 7초간 절반으로', cd: '쿨 6초' },
  blink:    { name: '점멸', desc: '누른 방향으로 순간이동. 떨어질 때 복귀용', cd: '쿨 9초' },
  stealth:  { name: '은신', desc: '5초간 상대 화면에서 사라짐. 맞히면 맞음', cd: '쿨 12초' },
  clone:    { name: '분신', desc: '나와 똑같은 분신이 곁에서 지켜줌. 5대 맞으면 사라짐', cd: '쿨 10초' },
  swap:     { name: '전환', desc: '랜덤한 상대·분신·터렛과 위치를 바꿈. 강공격 맞고 1초간 불가', cd: '쿨 19초' },
  fly:      { name: '비행', desc: '5초간 비행. 점프 키 누르면 올라가고 떼면 내려감', cd: '쿨 15초' },
  explode:  { name: '폭파', desc: '넓게 폭파해 크게 날리고 0.5초 스턴. 3초간 반투명 연기. 공중이면 3단 점프', cd: '쿨 10초' },
  freeze:   { name: '정지', desc: '나 빼고 모두 1초 정지. 정지 중엔 공격이 안 맞음', cd: '쿨 7초' },
  rock:     { name: '바위', desc: '6초간 넉백 없음. 대신 아주 느려지고 점프도 낮아짐', cd: '쿨 10초' },
  magnet:   { name: '자석', desc: 'Q로 주변을 끌어당기고 E로 밀어냄', cd: '각 쿨 9초', two: true },
  empower:  { name: '강화', desc: '가만히 있는 시간이 8초 쌓이면 충전 (움직여도 유지). 6초간 넉백↓ 사거리·속도·점프↑', cd: '충전식' },
  quake:    { name: '지진', desc: '나를 뺀 모두의 화면이 3초간 격하게 흔들림', cd: '쿨 12초' },
  giant:    { name: '거인', desc: '9초간 2배로 커짐. 넉백·속도 조금↓, 사거리↑', cd: '쿨 14초' },
  rubber:   { name: '고무', desc: '7초간 사거리 2배, 점프가 더 높아짐', cd: '쿨 13초' },
  engine:   { name: '엔진', desc: '6초간 빨라짐. 빠를수록 때릴 때 넉백이 커짐', cd: '쿨 12초' },
  parasite: { name: '기생', desc: '3번 때린 상대 몸에 들어가 5초 조종. 다시 Q로 나옴', cd: '3번 때리면 준비' },
  sword:    { name: '검사', desc: '공격이 검으로 바뀌고 사거리↑. 약공격은 돌진 베기, 강공격은 주변 부채꼴 베기, Q는 날아가는 참격', cd: '쿨 12초' },
  blackflash: { name: '흑섬', desc: '공격이 맞는 순간에 맞춰 Q를 누르면 넉백↑ (강공격은 0.7초 스턴까지). 타이밍이 틀리면 아무 일도 없음', cd: '쿨타임 없음' },
  lightning: { name: '번개', desc: '가까운 적 3명에게 번개를 내리쳐 3초 스턴', cd: '쿨 13초' },
  undying:  { name: '불사', desc: '목숨이 5개가 됨 (패시브)', cd: '패시브' },
  hulk:     { name: '헐크', desc: '퍼센트가 오를수록 몸·사거리↑, 날리는 힘 최대 2배, 속도·받는 넉백↓. 퍼센트가 내려가면 다시 작아짐 (패시브)', cd: '패시브' },
  fire:     { name: '화염', desc: '공격에 불이 붙어 맞은 상대가 2번 더 밀림. Q는 불태우며 돌진 (맞으면 4번 더 밀림)', cd: '쿨 9초' },
  ice:      { name: '얼음', desc: '때리면 상대 얼음 게이지가 참. 가득 차면 2초 얼어붙음. Q는 4초 눈보라 (모두의 게이지가 계속 참)', cd: '쿨 12초' },
  error:    { name: '에러', desc: '랜덤한 적 1명의 화면이 5초간 끊기고 조작이 제멋대로 됨 (걸린 사람은 깨진 화면 효과)', cd: '쿨 12초' },
  sun:      { name: '태양', desc: '6초간 태양의 힘: 빨라지고, 평타에 불이 붙고, 넉백이 세짐', cd: '쿨 11초' },
  wind:     { name: '바람', desc: '공격에 바람이 붙어 더 날아감. Q는 앞으로 나아가며 휩쓸어 가는 소용돌이', cd: '쿨 10초' },
  archer:   { name: '궁수', desc: '강공격을 누르고 있으면 시위를 당김(1초면 최대), 놓으면 발사. Q는 다음 화살이 벽을 피해 쫓아가는 유도 화살', cd: '쿨 13초' },
  time:     { name: '시간', desc: '첫 Q로 지금 순간을 저장, 다시 Q를 누르면 모두 그 순간으로 되돌림 (위치·퍼센트·목숨·상대 쿨타임·맞은 효과 등, 내 쿨타임만 그대로). 탈락하면 못 씀', cd: '되돌린 뒤 쿨 20초' },
  combo:    { name: '콤보', desc: '때릴 때마다 콤보가 쌓임. Q는 콤보만큼 강하고 넓은 스매시 (죽어도 유지, 스매시하면 초기화)', cd: '콤보 1 이상' },
  reflect:  { name: '반사', desc: '상대 공격이 들어오는 순간에 맞춰 Q를 누르면 반사. 돌진·검 돌진은 반대로 날려 보내고, 화살(유도 포함)·참격·총알·바람은 되돌려 보냄', cd: '쿨 3초' },
  invert:   { name: '반전', desc: '나를 뺀 상대 절반(올림)의 좌우 키가 7초간 반대로. 머리 위에 악마 표시', cd: '쿨 13초' },
  atom:     { name: '원자', desc: '때릴 때마다 주위를 도는 전자 +1 (최대 5). 3초 안 때리면 1초에 1개씩 사라짐. 링은 무해, 도는 전자에 닿아야 피해. Q는 5초간 전자 2배 속도 + 링 2줄', cd: '쿨 13초' },
  mine:     { name: '지뢰', desc: '발밑에 지뢰 설치 (최대 10개). 적이 밟으면 폭발. 나와 팀원은 안 터짐', cd: '쿨 8초' },
  turret:   { name: '터렛', desc: '적을 자동으로 쏘는 터렛 설치 (최대 3개, 4번 맞으면 부서짐)', cd: '쿨 12초' },
};
const SKILL_COLOR = {
  slow: '#7fb8ff', blink: '#c77dff', stealth: '#7fe0c8', clone: '#ff9ecf', swap: '#b48cff', fly: '#9ad7ff',
  explode: '#ff8a3d', freeze: '#d5ecff', rock: '#b5aca2', magnet: '#ff5d73', empower: '#4f8bff', parasite: '#7be36f',
  quake: '#d6a45c', giant: '#ff6b4a', rubber: '#ff9ff3', engine: '#ffb000',
  sword: '#cfe3ff', blackflash: '#c0263a', lightning: '#ffe94a', undying: '#ffd27a',
  hulk: '#5fd35a', fire: '#ff5a1f', ice: '#8fdcff', turret: '#a7b2c4', error: '#39ff88', sun: '#ffc21a',
  wind: '#b8f2e6', archer: '#c98b4a', time: '#7c9cff', combo: '#ff5fa2', reflect: '#e0f0ff', invert: '#c2185b', atom: '#5ad8ff', mine: '#8a8f6a',
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
// 스킨 (보이는 것만 바뀜)
const SKIN_INFO = window.BRAWL_SKINS;
const skinOn = (p, id) => !!(p && p.sn && p.sn.includes(id));
const fxOf = (p) => { for (const id of (p && p.sn) || []) if (SKIN_INFO.SKINS[id] && SKIN_INFO.SKINS[id].fx) return SKIN_INFO.SKINS[id].fx; return null; };
// 공격 이펙트 색 (스킨) — 무지개는 시간에 따라 색이 돎
function fxColor(fx, a, time) {
  if (fx === 'venom') return `rgba(20,16,26,${a})`;
  if (fx === 'carnage') return `rgba(200,20,30,${a})`;
  if (fx === 'redwind') return `rgba(255,70,40,${a})`;
  if (fx === 'rainbow') return `hsla(${Math.floor((time || performance.now()) / 4) % 360},95%,62%,${a})`;
  return null;
}
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
// ---------------- 스킨 창 ----------------
function renderSkins() {
  const skill = validSkill(account.skill);
  const p = account.profile;
  const list = Object.entries(SKIN_INFO.SKINS).filter(([, s]) => s.skill === skill);
  $('skinTitle').textContent = `${SKILLS[skill].name} 스킨`;
  $('skinGems').textContent = p ? `보석 ${p.gems}` : '';
  $('skinSub').textContent = '스킨은 보이는 모습만 바뀌고 능력은 그대로예요. 기본 스킨은 모두 가지고 있어요.';
  const box = $('skinList'); box.textContent = '';
  const equipped = p && p.skinSel ? p.skinSel[skill] || null : null;
  const card = (id, name, desc, color, owned) => {
    const c = document.createElement('div'); c.className = 'skin-card' + (equipped === id ? ' on' : '');
    const sw = document.createElement('div'); sw.className = 'skin-sw'; sw.style.background = color;
    const t = document.createElement('div'); t.className = 'skin-txt';
    const b = document.createElement('b'); b.textContent = name; const sm = document.createElement('small'); sm.textContent = desc; t.append(b, sm);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'skin-act';
    if (!p) { btn.textContent = id ? `보석 ${SKIN_INFO.PRICE}` : '기본'; btn.disabled = true; }
    else if (equipped === id) { btn.textContent = '장착 중'; btn.disabled = true; btn.classList.add('ghost'); }
    else if (owned) { btn.textContent = '장착'; btn.onclick = () => skinAction('/api/skin/equip', { skill, skin: id }); }
    else { btn.textContent = `구매 · 보석 ${SKIN_INFO.PRICE}`; btn.disabled = p.gems < SKIN_INFO.PRICE; btn.onclick = () => skinAction('/api/skin/buy', { skin: id }); }
    c.append(sw, t, btn); box.append(c);
  };
  card(null, '기본', `${SKILLS[skill].name} 기본 모습`, SKILL_COLOR[skill], true);
  for (const [id, s] of list) card(id, s.name, s.desc, s.color, !!(p && p.skins && p.skins.includes(id)));
  if (!list.length) { const e = document.createElement('p'); e.className = 'hint'; e.textContent = '이 능력은 아직 스킨이 없어요.'; box.append(e); }
  if (!p) $('skinMsg').textContent = '가입하고 로그인하면 보석으로 스킨을 살 수 있어요.';
  const others = [...new Set(Object.values(SKIN_INFO.SKINS).map((s) => s.skill))].filter((k) => k !== skill).map((k) => SKILLS[k].name);
  $('skinOther').textContent = `스킨이 있는 능력: ${others.concat(list.length ? [SKILLS[skill].name] : []).join(' · ')} — 로비에서 능력을 고른 뒤 다시 열어 보세요.`;
}
async function skinAction(path, body) {
  $('skinMsg').textContent = '';
  try {
    const r = await api(path, body);
    account.profile = r.profile; renderAccount(); renderSkins();
    $('skinMsg').textContent = path.endsWith('buy') ? '구매 완료! 바로 장착했어요.' : '장착했어요.';
  } catch (e) { $('skinMsg').textContent = e.message; }
}
// ---------------- 치장품 창 ----------------
const COSM = window.BRAWL_COSM;
let cosmPrev = null;   // 미리보기에서 보고 있는 것 { hat, outfit }
function renderCosm() {
  const p = account.profile;
  $('cosmGems').textContent = p ? `보석 ${p.gems}` : '';
  $('cosmGacha').disabled = !p || p.gems < COSM.COST;
  const sel = (p && p.cosmSel) || {};
  const owned = new Set((p && p.cosm) || []);
  const box = $('cosmCats'); box.textContent = '';
  for (const [cat, c] of Object.entries(COSM.COSMETICS)) {
    const wrap = document.createElement('div'); wrap.className = 'cosm-cat';
    const t = document.createElement('b'); t.textContent = c.name; wrap.append(t);
    const items = document.createElement('div'); items.className = 'cosm-items';
    const mk = (id, name, have) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + ((sel[cat] || null) === id ? ' on' : '');
      b.textContent = have ? name : `🔒 ${name}`; b.disabled = !p || !have;
      b.title = have ? (id ? `${name} 장착` : '벗기') : '뽑기로 얻을 수 있어요';
      b.addEventListener('click', async () => {
        try { const r = await api('/api/cosm/equip', { cat, item: id }); account.profile = r.profile; renderAccount(); renderCosm(); } catch (e) { $('cosmMsg').textContent = e.message; }
      });
      items.append(b);
    };
    mk(null, '없음', true);
    for (const [id, it] of Object.entries(c.items)) mk(id, it.name, owned.has(cat + ':' + id));
    wrap.append(items); box.append(wrap);
  }
  cosmPrev = { hat: sel.hat || null, outfit: sel.outfit || null };
  if (!p) $('cosmMsg').textContent = '가입하고 로그인하면 보석으로 치장품을 뽑을 수 있어요.';
}
$('cosmGacha').addEventListener('click', async () => {
  const btn = $('cosmGacha'); btn.disabled = true;
  try {
    const r = await api('/api/cosm/gacha', {});
    account.profile = r.profile; renderAccount(); renderCosm();
    const name = COSM.COSMETICS[r.cat].items[r.item].name;
    $('cosmMsg').textContent = r.dup ? `${name}! 이미 가진 거라 보석 ${r.refund}개를 돌려받았어요.` : `새 치장품 ${name} 획득! 눌러서 장착해 보세요.`;
  } catch (e) { $('cosmMsg').textContent = e.message; renderCosm(); }
});
$('cosmBtn').addEventListener('click', () => { $('cosmMsg').textContent = ''; renderCosm(); $('cosmModal').hidden = false; $('cosmClose').focus(); });
$('cosmClose').addEventListener('click', () => { $('cosmModal').hidden = true; $('cosmBtn').focus(); });
$('cosmModal').addEventListener('click', (e) => { if (e.target === $('cosmModal')) $('cosmModal').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('cosmModal').hidden) $('cosmModal').hidden = true; });
(function previewLoop() {
  if (!$('cosmModal').hidden && cosmPrev) drawPreview($('cosmPreview'), cosmPrev.hat, cosmPrev.outfit, '#3f8cff');
  requestAnimationFrame(previewLoop);
})();
$('skinBtn').addEventListener('click', () => { $('skinMsg').textContent = ''; renderSkins(); $('skinModal').hidden = false; $('skinClose').focus(); });
$('skinClose').addEventListener('click', () => { $('skinModal').hidden = true; $('skinBtn').focus(); });
$('skinModal').addEventListener('click', (e) => { if (e.target === $('skinModal')) $('skinModal').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('skinModal').hidden) $('skinModal').hidden = true; });

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
      const c = ev.fx === 'carnage' ? (i % 3 ? '#c4161c' : '#3a0408') : ev.fx === 'venom' ? (i % 3 ? '#14101a' : '#5a5466') : ev.fx === 'redwind' ? (i % 2 ? '#ff4a26' : '#ffb08a') : ev.fx === 'rainbow' ? `hsl(${(i * 37) % 360},95%,62%)` : ev.p === 2 ? '#ffcf3f' : '#ffffff';
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, c, r: ev.p === 2 ? 5 : 3.5 });
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
    const mud = !!ev.m;   // 늪 스킨: 갈색 늪이 퍼짐
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: mud ? 0.8 : 0.55, max: mud ? 0.8 : 0.55, r: ev.r, c: mud ? '110,80,40' : '127,184,255', grow: true });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      particles.push({ x: ev.x + Math.cos(a) * 30, y: ev.y + Math.sin(a) * 30, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380 + (mud ? 120 : 0), life: 0.45, max: 0.45, c: mud ? (i % 2 ? '#6b4a22' : '#9a7a44') : '#7fb8ff', r: mud ? 6 : 4, nograv: !mud });
    }
    if (ev.h > 0) banners.push({ text: mud ? `늪! ${ev.h}명` : `둔화! ${ev.h}명`, life: 1, max: 1, small: true, color: mud ? '#c49a5a' : '#7fb8ff' });
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
  } else if ((ev.k === 'pull' || ev.k === 'push') && ev.tj) {
    // 태극: 커다란 태극 무늬가 돌며 퍼지거나 모임
    particles.push({ taiji: true, x: ev.x, y: ev.y, life: 0.7, max: 0.7, r: ev.r * 0.55, dir: ev.k === 'pull' ? -1 : 1 });
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: ev.r, c: ev.k === 'pull' ? '216,50,60' : '40,80,200', grow: ev.k === 'push', shrink: ev.k === 'pull' });
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
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, max: 0.55, c: ev.v === 2 ? (i % 2 ? '#c4161c' : '#3a0408') : ev.v === 1 ? (i % 2 ? '#141018' : '#5a5466') : '#7be36f', r: 6, nograv: true });
    }
    if (ev.k === 'infest') banners.push({ text: `${ev.n} → ${ev.n2} 기생!`, life: 1.6, max: 1.6, small: true, color: '#7be36f' });
  } else if (ev.k === 'deny') {
    banners.push({ text: ev.msg, life: 1.6, max: 1.6, small: true, color: '#ff9b9b' });
  } else if (ev.k === 'quake') {
    if (ev.by !== myId) banners.push({ text: '지진!', life: 1.2, max: 1.2, small: true, color: '#d6a45c' });
    for (let i = 0; i < 20; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 120, y: ev.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 400, life: 0.6, max: 0.6, c: '#a3825a', r: 6 });
  } else if (ev.k === 'giant' || ev.k === 'rubber' || ev.k === 'engine') {
    const col = ev.k === 'giant' ? '255,107,74' : ev.k === 'rubber' ? '255,159,243' : '255,176,0';
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.k === 'giant' ? 120 : 70, c: col });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 220;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, max: 0.45, c: `rgb(${col})`, r: 5, nograv: true });
    }
  } else if (ev.k === 'bfq' && ev.g) {
    // 원포올: 초록 번개가 몸을 휘감음
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 80, c: '60,255,140' });
    for (let i = 0; i < 5; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 50 + Math.random() * 50, life: 0.25, max: 0.25, c: i % 2 ? '#d8ffe6' : '#3dff8a' });
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = 140 + Math.random() * 280; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, c: i % 2 ? '#3dff8a' : '#eaffef', r: 4, nograv: true }); }
  } else if (ev.k === 'bflash' && ev.g) {
    // 원포올 적중: 초록 번개 폭풍 + 겹겹의 충격파
    for (let i = 0; i < 14; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 120 + Math.random() * 160, life: 0.45, max: 0.45, c: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#3dff8a' : '#0f8a3c' });
    if (ev.ax !== undefined) for (let i = 0; i < 4; i++) particles.push({ bolt: true, x: ev.ax, y: ev.ay, a: Math.random() * Math.PI * 2, len: 70 + Math.random() * 60, life: 0.35, max: 0.35, c: '#3dff8a' });
    for (let i = 0; i < 55; i++) {
      const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 800;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, max: 0.6, c: i % 3 ? '#3dff8a' : '#f2fff6', r: 6, nograv: true });
    }
    for (const [r, l] of [[ev.p === 2 ? 200 : 150, 0.5], [ev.p === 2 ? 130 : 95, 0.35], [60, 0.25]]) particles.push({ ring: true, x: ev.x, y: ev.y, life: l, max: l, r, c: '60,255,140' });
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 120, c: '200,255,220', grow: true });
    shake = Math.max(shake, ev.p === 2 ? 26 : 18); lightFlash = 0.15;
    banners.push({ text: '원 포 올!', life: 1.2, max: 1.2, small: true, color: '#3dff8a' });
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
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 60, c: ev.b ? '60,140,255' : '255,120,40' });
  } else if (ev.k === 'burn') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, life: 0.4, max: 0.4, c: ev.b ? (i % 2 ? '#9fd8ff' : '#2a6dff') : (i % 2 ? '#ffb02e' : '#ff4d1a'), r: 5, nograv: true });
  } else if (ev.k === 'iced') {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 240;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: ev.au ? ['#2af598', '#3ae0d0', '#a66bff'][i % 3] : ev.dk ? (i % 2 ? '#140c20' : '#7a3cc0') : ev.sand ? (i % 2 ? '#f0d49a' : '#b88a45') : (i % 2 ? '#e8f8ff' : '#8fdcff'), r: 5, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 70, c: ev.sand ? '217,178,106' : '170,225,255' });
  } else if (ev.k === 'blizzard') {
    banners.push({ text: ev.sand ? `${ev.n}의 모래바람!` : ev.au ? `${ev.n}의 오로라!` : ev.dk ? `${ev.n}의 어둠!` : `${ev.n}의 눈보라!`, life: 1.4, max: 1.4, small: true, color: ev.sand ? '#e8c27a' : ev.au ? '#5af0c0' : ev.dk ? '#b48cff' : '#bfeaff' });
  } else if (ev.k === 'turret') {
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y - 10, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, life: 0.4, max: 0.4, c: '#c8d0dc', r: 4 });
  } else if (ev.k === 'tbreak') {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 360;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.6, max: 0.6, c: i % 2 ? '#7d8796' : '#ffb02e', r: 5 });
    }
  } else if (ev.k === 'error') {
    banners.push({ text: `${ev.n} → ${ev.n2} 시스템 에러!`, life: 1.6, max: 1.6, small: true, color: '#39ff88' });
    if (ev.x !== undefined) for (let i = 0; i < 20; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 60, y: ev.y + (Math.random() - 0.5) * 70, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 100, life: 0.5, max: 0.5, c: ['#39ff88', '#ff2a78', '#28a0ff'][i % 3], r: 6, nograv: true });
  } else if (ev.k === 'sun') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.6, max: 0.6, r: 140, c: ev.b ? '80,170,255' : '255,200,40', grow: true });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      particles.push({ x: ev.x + Math.cos(a) * 30, y: ev.y + Math.sin(a) * 30, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.5, max: 0.5, c: ev.b ? (i % 2 ? '#d8f0ff' : '#3f8cff') : (i % 2 ? '#fff3a0' : '#ffb21a'), r: 5, nograv: true });
    }
  } else if (ev.k === 'wind') {
    for (let i = 0; i < 14; i++) particles.push({ x: ev.x + ev.f * 30, y: ev.y + (Math.random() - 0.5) * 60, vx: ev.f * (250 + Math.random() * 300), vy: (Math.random() - 0.5) * 100, life: 0.4, max: 0.4, c: '#d8fff5', r: 4, nograv: true });
  } else if (ev.k === 'windend') {
    for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 300; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: '#d8fff5', r: 4, nograv: true }); }
  } else if (ev.k === 'homing') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 55, c: '150,130,255' });
  } else if (ev.k === 'thunk') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160, life: 0.3, max: 0.3, c: '#b59a74', r: 3 });
  } else if (ev.k === 'tsave') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 70, c: ev.g ? '47,224,122' : '124,156,255' });
    banners.push({ text: `${ev.n}: 시간 저장!`, life: 1.2, max: 1.2, small: true, color: ev.g ? '#5cf09a' : '#aebfff' });
  } else if (ev.k === 'rewind') {
    rewindT = 0.9; rewindG = !!ev.g; banners.push({ text: `${ev.n}: 시간 되돌리기!`, life: 1.6, max: 1.6, small: true, color: ev.g ? '#5cf09a' : '#aebfff' });
  } else if (ev.k === 'smash') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: ev.r, c: '255,95,162', grow: true });
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 500; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, max: 0.45, c: i % 2 ? '#ff5fa2' : '#ffe0ef', r: 6, nograv: true }); }
    shake = Math.max(shake, Math.min(26, 8 + ev.n));
    banners.push({ text: `${ev.n}콤보 스매시!`, life: 1.2, max: 1.2, small: true, color: '#ff5fa2' });
  } else if (ev.k === 'parryq') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.22, max: 0.22, r: 48, c: '220,240,255' });
  } else if (ev.k === 'parry') {
    // 반사 성공: 번쩍 + 튕겨 나가는 빛
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 90, c: '235,245,255', grow: true });
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 400; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, c: ev.fx === 'rainbow' ? `hsl(${i * 20},95%,62%)` : i % 2 ? '#ffffff' : '#9fd0ff', r: 4, nograv: true }); }
    shake = Math.max(shake, 10);
    banners.push({ text: '반사!', life: 0.9, max: 0.9, small: true, color: '#cfe8ff' });
  } else if (ev.k === 'invert') {
    banners.push({ text: `${ev.n}의 반전! ${(ev.names || []).join(', ')}`, life: 1.8, max: 1.8, small: true, color: '#ff4f8b' });
  } else if (ev.k === 'atomq') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 80, c: '90,216,255' });
  } else if (ev.k === 'mineset') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 20, y: ev.y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 0.3, max: 0.3, c: '#9a8a6a', r: 3 });
  } else if (ev.k === 'boom') {
    for (let i = 0; i < 34; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 500; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.5, max: 0.5, c: i % 3 === 0 ? ev.c : i % 2 ? '#ff8a3d' : '#ffd36b', r: 6, nograv: true }); }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.r, c: '255,160,80' });
    shake = Math.max(shake, 14);
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
  // 베놈·카니지에게 기생당한 몸: 온몸(주먹까지)이 검은색/빨간색으로 뒤덮임
  if (p.ctl && latest) {
    const cp2 = latest.p.find((q) => q.id === p.ctl);
    if (skinOn(cp2, 'carnage')) p = { ...p, c: '#b3121b', vnm: 2 };
    else if (skinOn(cp2, 'venom')) p = { ...p, c: '#141018', vnm: 1 };
  }
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
  if (p.sl && p.slm) {
    // 늪: 발밑에 진흙 웅덩이
    ctx.fillStyle = 'rgba(95,68,32,0.8)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
  } else if (p.sl) {
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
    const flap = Math.sin(time / 60) * 0.5;
    if (skinOn(p, 'angel') || skinOn(p, 'demon')) {
      // 천사 날개(하얀 깃털) / 악마 날개(박쥐 모양) — 더 크게
      const angel = skinOn(p, 'angel');
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * PW / 2, -PH * 0.62); ctx.rotate(sd * (0.35 + flap * 0.8)); ctx.scale(sd, 1);
        if (angel) {
          ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = 'rgba(210,200,160,0.9)'; ctx.lineWidth = 1.5;
          for (let k = 3; k >= 0; k--) { ctx.beginPath(); ctx.ellipse(16 + k * 7, -8 - k * 6, 28 - k * 3, 9, -0.45 - k * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        } else {
          ctx.fillStyle = 'rgba(110,10,35,0.95)'; ctx.strokeStyle = '#2a0010'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(50, -22); ctx.lineTo(44, 4); ctx.lineTo(36, 0); ctx.lineTo(30, 14); ctx.lineTo(20, 8); ctx.lineTo(12, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      if (angel) {
        ctx.strokeStyle = 'rgba(255,225,90,0.95)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, -PH - 14 + Math.sin(time / 200) * 2, 15, 5, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#8b1030';
        ctx.beginPath(); ctx.moveTo(-14, -PH + 4); ctx.quadraticCurveTo(-20, -PH - 10, -12, -PH - 18); ctx.lineTo(-7, -PH + 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(14, -PH + 4); ctx.quadraticCurveTo(20, -PH - 10, 12, -PH - 18); ctx.lineTo(7, -PH + 2); ctx.fill();
      }
    } else {
      // 비행: 날개
      ctx.fillStyle = 'rgba(240,248,255,0.92)';
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * PW / 2, -PH * 0.62); ctx.rotate(sd * (0.5 + flap));
        ctx.beginPath(); ctx.ellipse(sd * 16, 0, 18, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
  }
  if (p.sun) {
    // 태양: 뒤에서 빛나는 햇살 (초신성 스킨이면 파란 태양)
    const nova = skinOn(p, 'supernova');
    ctx.save(); ctx.translate(0, -PH / 2); ctx.rotate(time / 900);
    ctx.fillStyle = nova ? 'rgba(80,170,255,0.4)' : 'rgba(255,200,40,0.35)';
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(-6, 30); ctx.lineTo(0, 54 + Math.sin(time / 120 + i) * 6); ctx.lineTo(6, 30); ctx.fill(); }
    const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 44);
    sg.addColorStop(0, nova ? 'rgba(200,235,255,0.65)' : 'rgba(255,230,120,0.55)'); sg.addColorStop(1, nova ? 'rgba(40,110,255,0)' : 'rgba(255,170,30,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (p.fd) {
    // 화염 돌진: 뒤로 긴 불꽃
    const g3 = ctx.createLinearGradient(0, 0, -f * 120, 0);
    if (skinOn(p, 'bluefire')) { g3.addColorStop(0, 'rgba(140,210,255,0.95)'); g3.addColorStop(1, 'rgba(30,90,255,0)'); }
    else { g3.addColorStop(0, 'rgba(255,200,60,0.9)'); g3.addColorStop(1, 'rgba(255,60,20,0)'); }
    ctx.fillStyle = g3; ctx.beginPath(); ctx.ellipse(-f * 50, -PH / 2, 80, 30, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = p.hs ? '#ffffff' : p.c;
  roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
  if (p.gt && skinOn(p, 'titan')) {
    // 근육이 드러난 거대한 모습: 붉은 근섬유 + 이를 드러낸 입
    ctx.fillStyle = '#a8423a'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(90,20,18,0.75)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) { const xx = -PW / 2 + 4 + i * 5.5; ctx.beginPath(); ctx.moveTo(xx, -PH + 4); ctx.quadraticCurveTo(xx + 3, -PH / 2, xx - 1, -6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(230,150,130,0.55)';
    ctx.beginPath(); ctx.ellipse(-8, -PH * 0.42, 7, 6, 0, 0, Math.PI * 2); ctx.ellipse(8, -PH * 0.42, 7, 6, 0, 0, Math.PI * 2); ctx.fill();   // 가슴
    for (const yy of [-PH * 0.25, -PH * 0.14]) { ctx.beginPath(); ctx.ellipse(-5, yy, 4, 3, 0, 0, Math.PI * 2); ctx.ellipse(5, yy, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); }   // 복근
    ctx.fillStyle = '#f2ead8'; ctx.fillRect(-11, -PH + 28, 22, 5);   // 이빨
    ctx.strokeStyle = '#5a1a14'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-11 + i * 4.4, -PH + 28); ctx.lineTo(-11 + i * 4.4, -PH + 33); ctx.stroke(); }
  }
  if (p.cs && p.cs[1] && !p.vnm) drawOutfit(ctx, p.cs[1], f, time);   // 치장품: 옷
  if (hasK(p, 'hulk') && G > 1.02) {
    // 헐크: 커질수록 초록빛 + 근육 줄
    const hf = (G - 1) / 0.9;
    const red = skinOn(p, 'redhulk');
    ctx.fillStyle = red ? `rgba(225,40,35,${0.2 + hf * 0.5})` : `rgba(80,200,70,${0.15 + hf * 0.4})`; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
    ctx.strokeStyle = red ? `rgba(70,10,10,${0.2 + hf * 0.4})` : `rgba(20,60,20,${0.2 + hf * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -PH + 30); ctx.quadraticCurveTo(0, -PH + 36, 10, -PH + 30); ctx.stroke();
  }
  if (p.c === '#26252e' || p.c === '#f4f4f6') { ctx.strokeStyle = p.c === '#26252e' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke(); }
  if (p.rk && skinOn(p, 'tree')) {
    // 나무: 나무껍질 몸통 + 머리 위 잎사귀
    ctx.fillStyle = '#7a4e26'; roundRect(-PW / 2 - 2, -PH, PW + 4, PH + 2, 6); ctx.fill();
    ctx.strokeStyle = '#4e3016'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const xx = -PW / 2 + 4 + i * 8; ctx.beginPath(); ctx.moveTo(xx, -PH + 6); ctx.bezierCurveTo(xx + 3, -PH * 0.6, xx - 3, -PH * 0.3, xx + 1, -2); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(6, -PH * 0.45, 4, 6, 0, 0, Math.PI * 2); ctx.stroke();   // 옹이
    for (const [lx, ly, lr, lc] of [[-14, -PH - 6, 13, '#3f9a3a'], [12, -PH - 8, 14, '#4caf3c'], [0, -PH - 18, 15, '#5cc84a'], [-4, -PH - 4, 10, '#6fd65a']]) { ctx.fillStyle = lc; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill(); }
  } else if (p.rk && skinOn(p, 'crystal')) {
    // 크리스탈: 보랏빛 투명 결정 (면이 반짝임)
    const cg = ctx.createLinearGradient(-PW / 2, -PH, PW / 2, 0);
    cg.addColorStop(0, 'rgba(235,215,255,0.85)'); cg.addColorStop(0.5, 'rgba(170,120,255,0.75)'); cg.addColorStop(1, 'rgba(110,200,255,0.8)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(0, -PH - 14); ctx.lineTo(PW / 2 + 6, -PH + 12); ctx.lineTo(PW / 2 + 3, -4); ctx.lineTo(0, 4); ctx.lineTo(-PW / 2 - 3, -4); ctx.lineTo(-PW / 2 - 6, -PH + 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -PH - 14); ctx.lineTo(0, 4); ctx.moveTo(-PW / 2 - 6, -PH + 12); ctx.lineTo(PW / 2 + 3, -4); ctx.moveTo(PW / 2 + 6, -PH + 12); ctx.lineTo(-PW / 2 - 3, -4); ctx.stroke();
    const tw = (Math.sin(time / 150) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`;
    for (const [sx2, sy2] of [[-8, -PH + 4], [10, -PH / 2], [-4, -14]]) { ctx.beginPath(); ctx.moveTo(sx2, sy2 - 5); ctx.lineTo(sx2 + 2, sy2); ctx.lineTo(sx2, sy2 + 5); ctx.lineTo(sx2 - 2, sy2); ctx.fill(); }
  } else if (p.rk && skinOn(p, 'steel')) {
    // 강철: 반짝이는 금속판 + 리벳
    const sg = ctx.createLinearGradient(-PW / 2, -PH, PW / 2, 0);
    sg.addColorStop(0, 'rgba(225,235,245,0.95)'); sg.addColorStop(0.5, 'rgba(140,155,175,0.95)'); sg.addColorStop(1, 'rgba(90,100,118,0.95)');
    ctx.fillStyle = sg; roundRect(-PW / 2 - 3, -PH - 3, PW + 6, PH + 5, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(50,58,72,0.9)'; ctx.lineWidth = 2; roundRect(-PW / 2 - 3, -PH - 3, PW + 6, PH + 5, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-PW / 2 - 3, -PH / 2); ctx.lineTo(PW / 2 + 3, -PH / 2); ctx.stroke();
    ctx.fillStyle = '#4b5568'; for (const [rx, ry] of [[-15, -PH + 5], [15, -PH + 5], [-15, -6], [15, -6], [-15, -PH / 2 + 6], [15, -PH / 2 + 6]]) { ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2); ctx.fill(); }
    const sh = 22 + ((time / 6) % 110);
    if (sh < PH + 4) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-PW / 2, -PH + sh); ctx.lineTo(PW / 2, -PH + sh - 18); ctx.stroke(); }
  } else if (p.rk) {
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
      ctx.fillStyle = p.bb ? (i % 2 ? 'rgba(150,215,255,0.9)' : 'rgba(40,110,255,0.85)') : (i % 2 ? 'rgba(255,180,40,0.85)' : 'rgba(255,80,20,0.85)');
      ctx.beginPath(); ctx.moveTo(fx2 - 7, -PH + 10); ctx.quadraticCurveTo(fx2, -PH - h2, fx2 + 7, -PH + 10); ctx.fill();
    }
  }
  if (p.icd && p.iau) {
    // 오로라에 갇힘: 몸을 감싼 빛의 기둥 안에서 초록·청록·보라 띠가 일렁임
    const cg = ctx.createLinearGradient(-PW, 0, PW, 0);
    cg.addColorStop(0, 'rgba(42,245,152,0.15)'); cg.addColorStop(0.5, 'rgba(58,224,208,0.55)'); cg.addColorStop(1, 'rgba(166,107,255,0.15)');
    ctx.fillStyle = cg; roundRect(-PW / 2 - 12, -PH - 26, PW + 24, PH + 30, 16); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const yy = -PH - 18 + i * 20, ph = time / 260 + i * 1.3;
      const col = ['rgba(42,245,152,0.9)', 'rgba(58,224,208,0.85)', 'rgba(120,160,255,0.85)', 'rgba(190,120,255,0.85)'][i];
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath();
      for (let x = -PW / 2 - 10; x <= PW / 2 + 10; x += 4) ctx.lineTo(x, yy + Math.sin(x / 7 + ph) * 5);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(220,255,245,0.9)'; ctx.lineWidth = 2; roundRect(-PW / 2 - 12, -PH - 26, PW + 24, PH + 30, 16); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 6; i++) { const sx = Math.sin(time / 300 + i * 2.1) * (PW / 2 + 6), sy = -PH - 20 + ((time / 9 + i * 17) % (PH + 20)); ctx.fillRect(sx - 1, sy - 1, 2.5, 2.5); }
  } else if (p.icd && p.idk) {
    // 어둠에 잠식: 검은 기운이 온몸을 휘감고 촉수가 꿈틀거림
    ctx.fillStyle = 'rgba(12,8,20,0.88)'; roundRect(-PW / 2 - 6, -PH - 6, PW + 12, PH + 8, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(120,60,190,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a2 = (i / 6) * Math.PI * 2 + time / 500, r1 = 24, r2 = 40 + Math.sin(time / 120 + i) * 6; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * r1, -PH / 2 + Math.sin(a2) * r1); ctx.quadraticCurveTo(Math.cos(a2 + 0.4) * (r2 - 6), -PH / 2 + Math.sin(a2 + 0.4) * (r2 - 6), Math.cos(a2) * r2, -PH / 2 + Math.sin(a2) * r2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(200,120,255,0.95)'; ctx.fillRect(-10, -PH + 16, 6, 3); ctx.fillRect(4, -PH + 16, 6, 3);
  } else if (p.icd && p.isd) {
    // 모래에 갇힘: 모래 더미가 몸을 덮음
    ctx.fillStyle = 'rgba(214,174,100,0.92)'; ctx.beginPath();
    ctx.moveTo(-PW / 2 - 14, 2); ctx.quadraticCurveTo(-PW / 2 - 6, -PH * 0.7, -4, -PH - 4); ctx.quadraticCurveTo(PW / 2 + 6, -PH * 0.7, PW / 2 + 14, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,110,55,0.7)';
    for (let i = 0; i < 10; i++) { const ang = i * 2.4, r = 6 + (i % 4) * 5; ctx.fillRect(Math.cos(ang) * r - 1, -PH / 2 + Math.sin(ang) * r * 1.3, 3, 3); }
  } else if (p.icd) {
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
  if (p.vnm) {
    // 베놈(검정)·카니지(빨강): 머리 위 표시 + 몸을 덮은 끈적한 무늬
    const carn = p.vnm === 2;
    ctx.fillStyle = carn ? 'rgba(190,18,28,0.95)' : 'rgba(15,12,20,0.95)';
    ctx.beginPath(); ctx.arc(0, -PH - 14, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-4, -PH - 16); ctx.lineTo(4, -PH - 14); ctx.lineTo(-4, -PH - 12); ctx.fill();
    ctx.strokeStyle = carn ? 'rgba(80,0,8,0.85)' : 'rgba(70,64,90,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const yy = -PH + 30 + i * 8, ph = time / 200 + i; ctx.beginPath(); ctx.moveTo(-PW / 2 + 2, yy); ctx.quadraticCurveTo(0, yy + Math.sin(ph) * 6, PW / 2 - 2, yy - 2); ctx.stroke(); }
  } else if (p.ctl) {
    // 기생당함: 초록 눈
    ctx.fillStyle = 'rgba(123,227,111,0.9)';
    ctx.beginPath(); ctx.arc(0, -PH - 14, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#163a12'; ctx.beginPath(); ctx.arc(0, -PH - 14, 3, 0, Math.PI * 2); ctx.fill();
  }
  if (light) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill(); }
  if (p.sl && p.slm) {
    // 진흙을 뒤집어씀: 머리부터 흘러내리는 갈색 진흙
    ctx.fillStyle = 'rgba(105,74,36,0.92)';
    ctx.beginPath(); ctx.moveTo(-PW / 2, -PH + 12); ctx.quadraticCurveTo(-PW / 2, -PH, -8, -PH - 2); ctx.quadraticCurveTo(PW / 2, -PH - 2, PW / 2, -PH + 12);
    for (let i = 0; i < 5; i++) { const dx2 = PW / 2 - i * (PW / 4), dl = 14 + ((i * 7 + Math.floor(time / 300)) % 4) * 6; ctx.lineTo(dx2, -PH + 12 + dl); ctx.lineTo(dx2 - PW / 8, -PH + 12); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(140,105,60,0.7)'; ctx.beginPath(); ctx.arc(-8, -PH + 4, 4, 0, Math.PI * 2); ctx.arc(10, -PH + 8, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.sl) { ctx.fillStyle = 'rgba(127,184,255,0.45)'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; roundRect(-PW / 2, -PH * 0.35, PW, PH * 0.35, 10); ctx.fill();
  if (p.dm) {
    // 더미: 몸에 과녁
    for (const [r, c] of [[13, '#ffffff'], [9, '#ff4d4d'], [5, '#ffffff'], [2, '#ff4d4d']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -PH * 0.42, r, 0, Math.PI * 2); ctx.fill(); }
  } else if (p.b) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-2, -PH - 10, 4, 10); ctx.beginPath(); ctx.arc(0, -PH - 12, 4, 0, Math.PI * 2); ctx.fill(); }
  if (p.vnm) {
    // 원래 눈 대신 크고 찢어진 흰 눈만
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(-18, -PH + 10); ctx.quadraticCurveTo(-8, -PH + 12, -3, -PH + 26); ctx.quadraticCurveTo(-13, -PH + 23, -18, -PH + 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -PH + 10); ctx.quadraticCurveTo(8, -PH + 12, 3, -PH + 26); ctx.quadraticCurveTo(13, -PH + 23, 18, -PH + 10); ctx.fill();
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(f * 4 - 2, -PH + 14, 8, 11); ctx.fillRect(f * 4 + 10 * f - 2, -PH + 14, 8, 11);
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(f * 4 + f * 2, -PH + 17, 4, 6); ctx.fillRect(f * 4 + 10 * f + f * 2, -PH + 17, 4, 6);
  }
  if (p.cs && p.cs[0] && !(p.fly && (skinOn(p, 'angel') || skinOn(p, 'demon')))) drawHat(ctx, p.cs[0], f, time);   // 치장품: 모자
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
  if (hasK(p, 'archer') && !hasK(p, 'sword')) {
    drawBow(p, f, time, p.rb ? 2 : 1, otherM);
    ctx.restore();
    finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time);
    return;
  }
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
  const fxs = fxOf(p);
  if (p.ap === 2) {
    ctx.strokeStyle = fxs ? fxColor(fxs, 0.85, time) : p.at === 2 ? 'rgba(255,207,63,0.8)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = p.at === 2 ? 10 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, fy); ctx.lineTo(fx, fy); ctx.stroke();
  }
  if (fxs && p.at) {
    // 스킨 공격 이펙트: 주먹 주변 기운
    const fr2 = (p.at === 2 ? 26 : 20) + Math.sin(time / 50) * 3;
    const gl2 = ctx.createRadialGradient(fx, fy, 2, fx, fy, fr2);
    gl2.addColorStop(0, fxColor(fxs, 0.9, time)); gl2.addColorStop(1, fxColor(fxs, 0, time + 300));
    ctx.fillStyle = gl2; ctx.beginPath(); ctx.arc(fx, fy, fr2, 0, Math.PI * 2); ctx.fill();
  }
  if (hasK(p, 'fire') || hasK(p, 'ice') || p.sun) {
    // 주먹에 불꽃 / 냉기 (청염 스킨이면 파란 불)
    const fr = (p.at === 2 ? 20 : 16) + Math.sin(time / 60) * 3;
    const gl = ctx.createRadialGradient(fx, fy, 2, fx, fy, fr);
    const blue = (hasK(p, 'fire') && skinOn(p, 'bluefire') && !p.sun) || (p.sun && skinOn(p, 'supernova') && (!hasK(p, 'fire') || skinOn(p, 'bluefire')));
    const hot = hasK(p, 'fire') || p.sun;
    gl.addColorStop(0, blue ? 'rgba(170,225,255,0.95)' : hot ? 'rgba(255,220,90,0.95)' : 'rgba(235,250,255,0.95)');
    gl.addColorStop(1, blue ? 'rgba(30,90,255,0)' : hot ? 'rgba(255,60,20,0)' : 'rgba(120,200,255,0)');
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
  const fxs = fxOf(p);
  const dark = skinOn(p, 'darkness');   // 어둠의 검사 스킨
  const holy = skinOn(p, 'holyknight'); // 빛의 기사 스킨
  const blueHot = (hasK(p, 'fire') && skinOn(p, 'bluefire') && !p.sun) || (p.sun && skinOn(p, 'supernova') && (!hasK(p, 'fire') || skinOn(p, 'bluefire')));
  const glow = blueHot ? 'rgba(60,140,255,0.95)' : hot ? 'rgba(255,120,30,0.95)' : cold ? 'rgba(140,220,255,0.95)' : fxs ? fxColor(fxs, 0.95, time) : null;
  // 베기 궤적 (어둠의 검사: 검보라 초승달이 여러 겹)
  if (p.ap === 2 && p.at === 1) {
    if (holy) {
      ctx.fillStyle = 'rgba(255,236,150,0.55)';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L + 24, f > 0 ? -1.3 : Math.PI - 0.4, f > 0 ? 0.4 : Math.PI + 1.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,230,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, L + 24, f > 0 ? -1.3 : Math.PI - 0.4, f > 0 ? 0.4 : Math.PI + 1.3); ctx.stroke();
    } else if (dark) {
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k % 2 ? 'rgba(40,10,60,0.55)' : 'rgba(150,60,230,0.45)';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L + 26 - k * 10, f > 0 ? -1.3 + k * 0.1 : Math.PI - 0.4, f > 0 ? 0.4 : Math.PI + 1.3 - k * 0.1); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = hot ? 'rgba(255,170,80,0.45)' : cold ? 'rgba(170,230,255,0.45)' : 'rgba(220,235,255,0.45)';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L + 18, f > 0 ? -1.2 : Math.PI - 0.3, f > 0 ? 0.3 : Math.PI + 1.2); ctx.closePath(); ctx.fill();
    }
  }
  if (p.ap === 2 && p.at === 2) {
    // 부채꼴: 머리 위로 크게 반원 (사거리 버프만큼 커짐)
    const R = 125 * 1.25 * otherM * rubM;
    const g = ctx.createRadialGradient(0, -PH / 2, 20, 0, -PH / 2, R);
    g.addColorStop(0, 'rgba(220,235,255,0)');
    g.addColorStop(0.75, holy ? 'rgba(255,230,140,0.35)' : dark ? 'rgba(60,15,90,0.45)' : hot ? 'rgba(255,170,80,0.25)' : cold ? 'rgba(170,230,255,0.25)' : 'rgba(220,235,255,0.25)');
    g.addColorStop(1, holy ? 'rgba(255,250,210,0.9)' : dark ? 'rgba(170,80,255,0.85)' : hot ? 'rgba(255,200,120,0.75)' : cold ? 'rgba(200,240,255,0.75)' : 'rgba(240,248,255,0.75)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -PH / 2); ctx.arc(0, -PH / 2, R, Math.PI + 0.05, -0.05 + Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = holy ? 'rgba(255,220,90,0.95)' : dark ? 'rgba(200,130,255,0.95)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -PH / 2, R, Math.PI + 0.05, Math.PI * 2 - 0.05); ctx.stroke();
    if (rubM > 1) {
      // 고무: 늘어난 팔 끝의 검이 반원을 따라 돎
      const a2 = Math.PI + ((time / 60) % Math.PI), r2 = Math.max(20, R - L - 16);
      const ex = Math.cos(a2) * r2, ey = -PH / 2 + Math.sin(a2) * r2;
      ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -PH / 2); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a2);
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
      ctx.fillStyle = holy ? '#fffbe6' : dark ? '#1a0f26' : hot ? '#ffe2b0' : cold ? '#dff5ff' : '#e8f0ff'; ctx.strokeStyle = holy ? '#e8b830' : dark ? '#b46bff' : '#5a6a88'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(6 + L, -2); ctx.lineTo(12 + L, 0); ctx.lineTo(6 + L, 3); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill();
      return;
    }
  }
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f, 1); ctx.rotate(ang);
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; } else if (dark) { ctx.shadowColor = 'rgba(160,70,255,0.95)'; ctx.shadowBlur = 14; }
  else if (holy) { ctx.shadowColor = 'rgba(255,230,120,1)'; ctx.shadowBlur = 22; }
  ctx.fillStyle = holy ? '#fffbe6' : dark ? '#1a0f26' : hot ? '#ffe2b0' : cold ? '#dff5ff' : '#e8f0ff'; ctx.strokeStyle = holy ? '#e8b830' : dark ? '#b46bff' : '#5a6a88'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10 + L, -2); ctx.lineTo(16 + L, 0); ctx.lineTo(10 + L, 3); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = dark ? '#6a2aa8' : holy ? '#ffd23f' : '#c9a24a'; ctx.fillRect(6, -10, 5, 20);         // 코등이
  if (holy) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(14, -1, L - 2, 2); }   // 칼날 가운데 빛줄기
  ctx.fillStyle = '#4a2f1e'; ctx.fillRect(-6, -3, 12, 6);         // 손잡이
  ctx.restore();
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
function finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time) {
  if (p.el && !isClone) {
    // 원자: 링(무해) + 도는 전자 — 서버와 같은 식 (화면 지연만큼 각도를 앞당김)
    const [n, ph0, boost] = p.el, R = 62 * G, cx = x, cy = y - PH * G / 2;
    const age = latest ? Math.max(0, (performance.now() - latest.time) / 1000) : 0;
    const ph = ph0 + 4 * (boost ? 2 : 1) * age;
    const rings = boost ? [-0.6, 0.6] : [null];
    ctx.strokeStyle = 'rgba(90,216,255,0.45)'; ctx.lineWidth = 1.5;
    for (const t of rings) { ctx.beginPath(); if (t === null) ctx.arc(cx, cy, R, 0, Math.PI * 2); else ctx.ellipse(cx, cy, R, R * 0.4, t, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < n; i++) {
      let ex, ey;
      if (boost) { const ring = i % 2, cnt = Math.ceil(n / 2) || 1, j = Math.floor(i / 2), a = (ring ? -ph : ph) + (j * Math.PI * 2) / cnt, t = ring ? 0.6 : -0.6, rx = Math.cos(a) * R, ry = Math.sin(a) * R * 0.4; ex = cx + rx * Math.cos(t) - ry * Math.sin(t); ey = cy + rx * Math.sin(t) + ry * Math.cos(t); }
      else { const a = ph + (i * Math.PI * 2) / n; ex = cx + Math.cos(a) * R; ey = cy + Math.sin(a) * R; }
      const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 11); eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.4, '#5ad8ff'); eg.addColorStop(1, 'rgba(90,216,255,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 11, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (p.er && !isClone) {
    // 에러 걸림: 몸이 어긋난 색으로 겹쳐 보이고 깨진 조각이 튐 (모두에게 보임)
    const jit = () => (Math.random() - 0.5) * 10;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ff2a78'; roundRect(x - PW * G / 2 + jit() - 5, y - PH * G + jit(), PW * G, PH * G, 10); ctx.fill();
    ctx.fillStyle = '#28a0ff'; roundRect(x - PW * G / 2 + jit() + 5, y - PH * G + jit(), PW * G, PH * G, 10); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#39ff88';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + (Math.random() - 0.5) * 70 * G, y - Math.random() * PH * G * 1.2, 6 + Math.random() * 18, 3 + Math.random() * 4);
    ctx.font = '700 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(57,255,136,0.95)';
    if (Math.floor(time / 120) % 2) ctx.fillText('ERROR', x + jit(), y - PH * G - 30 - (p.b ? 12 : 0));
  }
  if (p.pa && skinOn(p, 'rainbow')) {
    // 무지개 반사: 몸 앞에 세운 무지개 아치
    const f2 = p.f || 1, cx2 = x + f2 * (PW / 2 + 6) * G, cy2 = y - PH * G / 2;
    const cols = ['#ff3b3b', '#ff9a2e', '#ffe14a', '#3ccf6e', '#3f8cff', '#7a5cff', '#c86bff'];
    ctx.lineWidth = 5 * G; ctx.lineCap = 'round';
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx2 - f2 * 30 * G, cy2, (44 - i * 5) * G, -1.1, 1.1, false); if (f2 < 0) { ctx.beginPath(); ctx.arc(cx2 - f2 * 30 * G, cy2, (44 - i * 5) * G, Math.PI - 1.1, Math.PI + 1.1, false); } ctx.stroke(); });
  } else if (p.pa) {
    // 반사 대기: 몸 앞에 세운 거울 (은색 테두리 + 비치는 유리 + 반짝임)
    const f2 = p.f || 1, mw = 16 * G, mh = 84 * G;
    const mx = x + f2 * (PW / 2 + 12) * G - mw / 2, my = y - PH * G / 2 - mh / 2;
    const gl = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    gl.addColorStop(0, 'rgba(200,225,255,0.85)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.55, 'rgba(160,190,230,0.8)'); gl.addColorStop(1, 'rgba(220,235,255,0.85)');
    ctx.fillStyle = gl; roundRect(mx, my, mw, mh, 6 * G); ctx.fill();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; roundRect(mx, my, mw, mh, 6 * G); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2;
    const sh = ((time / 3) % (mh + 30)) - 15;
    ctx.beginPath(); ctx.moveTo(mx + 2, my + sh); ctx.lineTo(mx + mw - 2, my + sh - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx + 3, my + sh + 12); ctx.lineTo(mx + mw - 3, my + sh + 4); ctx.stroke();
  }
  if (p.rv) {
    // 반전: 머리 위 악마 표시 (빨간 얼굴 + 뿔)
    const dx = x, dy = y - PH * G - 50 - (p.b ? 12 : 0) - (p.cb > 0 ? 22 : 0) + Math.sin(time / 200) * 2;
    ctx.fillStyle = '#d81b4a';
    ctx.beginPath(); ctx.moveTo(dx - 11, dy - 6); ctx.lineTo(dx - 15, dy - 20); ctx.lineTo(dx - 4, dy - 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dx + 11, dy - 6); ctx.lineTo(dx + 15, dy - 20); ctx.lineTo(dx + 4, dy - 10); ctx.fill();
    ctx.beginPath(); ctx.arc(dx, dy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath(); ctx.moveTo(dx - 8, dy - 4); ctx.lineTo(dx - 2, dy - 1); ctx.lineTo(dx - 8, dy + 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dx + 8, dy - 4); ctx.lineTo(dx + 2, dy - 1); ctx.lineTo(dx + 8, dy + 1); ctx.fill();
    ctx.strokeStyle = '#2a0010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy + 3, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  if (p.cb > 0 && !isClone) {
    // 콤보 스택
    ctx.font = '400 20px "Black Han Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(`${p.cb} COMBO`, x + 1, y - PH * G - 46 - (p.b ? 12 : 0));
    ctx.fillStyle = p.cb >= 10 ? '#ff5fa2' : '#ffd0e6'; ctx.fillText(`${p.cb} COMBO`, x, y - PH * G - 47 - (p.b ? 12 : 0));
  }
  if (p.ig > 0 && !p.icd) {
    // 얼음 게이지
    const bw2 = 46, bx = x - bw2 / 2, by2 = y - PH * G - 42 - (p.b ? 12 : 0);
    ctx.fillStyle = 'rgba(10,20,40,0.7)'; roundRect(bx - 2, by2 - 2, bw2 + 4, 10, 4); ctx.fill();
    if (p.idk) ctx.fillStyle = '#1a1424';
    else if (p.iau) {
      const ag = ctx.createLinearGradient(bx, 0, bx + bw2, 0);
      ag.addColorStop(0, '#2af598'); ag.addColorStop(0.5, '#3ae0d0'); ag.addColorStop(1, '#a66bff');
      ctx.fillStyle = ag;
    } else if (!p.idk) ctx.fillStyle = p.isd ? '#d9b26a' : '#8fdcff';
    roundRect(bx, by2, bw2 * Math.min(1, p.ig / 100), 6, 3); ctx.fill();
    if (p.idk) { ctx.strokeStyle = 'rgba(160,100,220,0.8)'; ctx.lineWidth = 1; roundRect(bx, by2, bw2 * Math.min(1, p.ig / 100), 6, 3); ctx.stroke(); }
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
  const HAT_H = { bunny: 34, tophat: 30, cowboy: 18, horns: 20, brain: 14, cap: 12, straw: 14 };
  const lift = (p.b ? 12 : 0) + PH * (G - 1) + (p.cs && p.cs[0] ? (HAT_H[p.cs[0]] || 0) * G : 0);
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
    } else if (p.taiji) {
      // 태극 무늬 (빨강·파랑, 회전)
      const R = p.r * (p.dir > 0 ? 0.5 + (1 - a) * 0.6 : 0.6 + a * 0.5), rot = (1 - a) * Math.PI * 2 * p.dir;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot); ctx.globalAlpha = Math.min(1, a * 1.6) * 0.55;
      ctx.fillStyle = '#2350b8'; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8323c'; ctx.beginPath();
      ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);          // 오른쪽 반원
      ctx.arc(0, R / 2, R / 2, Math.PI / 2, Math.PI * 1.5, false); // 아래 작은 원 (왼쪽으로 볼록)
      ctx.arc(0, -R / 2, R / 2, Math.PI / 2, -Math.PI / 2, true);  // 위 작은 원 (오른쪽으로 오목)
      ctx.fill();
      ctx.fillStyle = '#2350b8'; ctx.beginPath(); ctx.arc(0, R / 2, R / 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8323c'; ctx.beginPath(); ctx.arc(0, -R / 2, R / 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
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
  if (k === 'time' && p.ts) return { ready: !(p.cd > 0), text: '저장됨' };
  if (k === 'combo') return { ready: p.cb > 0, text: `콤보 ${p.cb || 0}` };
  if (k === 'archer' && p.hm) return { ready: true, text: '유도 준비' };
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
    const a = Math.min(1, s.a * 2.2) * 0.42;   // 반투명 연기
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
// ---------------- 치장품 그리기 (몸 좌표계: 발 = (0,0), 머리 꼭대기 = (0,-PH)) ----------------
function drawOutfit(g, id, f, time) {
  const top = -PH + 30;   // 눈 아래부터
  if (id === 'suit') {
    g.fillStyle = '#23263a'; roundRect2(g, -PW / 2, top, PW, PH - 30, 6); g.fill();
    g.fillStyle = '#f4f4f6'; g.beginPath(); g.moveTo(-7, top); g.lineTo(7, top); g.lineTo(0, top + 14); g.closePath(); g.fill();
    g.fillStyle = '#c4161c'; g.beginPath(); g.moveTo(-2.5, top + 2); g.lineTo(2.5, top + 2); g.lineTo(3.5, top + 16); g.lineTo(0, top + 20); g.lineTo(-3.5, top + 16); g.closePath(); g.fill();
    g.strokeStyle = '#3a3f5c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, top); g.lineTo(-2, top + 18); g.moveTo(7, top); g.lineTo(2, top + 18); g.stroke();
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(0, top + 24, 1.6, 0, Math.PI * 2); g.fill();
  } else if (id === 'beggar') {
    g.fillStyle = '#8a6a44'; g.beginPath(); g.moveTo(-PW / 2, top);
    g.lineTo(PW / 2, top); g.lineTo(PW / 2, -6);
    for (let x = PW / 2; x >= -PW / 2; x -= 6) g.lineTo(x - 3, (x / 6) % 2 ? -1 : -8);
    g.closePath(); g.fill();
    g.fillStyle = '#6b5030'; g.fillRect(-12, top + 6, 8, 7); g.fillStyle = '#a07a50'; g.fillRect(6, top + 12, 7, 6);
    g.strokeStyle = '#4a3418'; g.lineWidth = 1; g.strokeRect(-12, top + 6, 8, 7); g.strokeRect(6, top + 12, 7, 6);
    g.beginPath(); g.moveTo(-4, top + 16); g.lineTo(0, top + 20); g.lineTo(-3, top + 24); g.stroke();
  } else if (id === 'doctor') {
    g.fillStyle = '#f7f9fb'; roundRect2(g, -PW / 2 - 1, top, PW + 2, PH - 30, 6); g.fill();
    g.strokeStyle = '#cfd6de'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, top); g.lineTo(0, -2); g.stroke();
    g.fillStyle = '#8fd0e8'; g.beginPath(); g.moveTo(-6, top); g.lineTo(6, top); g.lineTo(0, top + 8); g.closePath(); g.fill();
    g.strokeStyle = '#555c66'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, top); g.quadraticCurveTo(-10, top + 14, -2, top + 16); g.moveTo(8, top); g.quadraticCurveTo(10, top + 14, 4, top + 16); g.stroke();
    g.fillStyle = '#a0a8b2'; g.beginPath(); g.arc(1, top + 17, 2.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3f8cff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, top + 6); g.lineTo(10, top + 12); g.stroke();
    g.strokeStyle = '#cfd6de'; g.strokeRect(7, top + 9, 8, 7);
  } else if (id === 'uniform') {
    g.fillStyle = '#1f2f5a'; roundRect2(g, -PW / 2, top, PW, PH - 30, 6); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-9, top); g.lineTo(0, top + 9); g.lineTo(9, top); g.closePath(); g.fill();
    g.fillStyle = '#b8323c'; g.fillRect(-2, top + 3, 4, 14);
    g.strokeStyle = '#e8c860'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-2, top + 6 + k * 4); g.lineTo(2, top + 4 + k * 4); g.stroke(); }
    g.fillStyle = '#e8c860'; g.beginPath(); g.arc(f * 11, top + 9, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a3c6e'; g.fillRect(-PW / 2, -10, PW, 10);
  } else if (id === 'baby') {
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-PW / 2, -14); g.quadraticCurveTo(0, -20, PW / 2, -14); g.lineTo(PW / 2, -2); g.quadraticCurveTo(0, 3, -PW / 2, -2); g.closePath(); g.fill();
    g.strokeStyle = '#dcdcdc'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#ffb3d1'; g.beginPath(); g.moveTo(-10, top - 2); g.quadraticCurveTo(0, top + 18, 10, top - 2); g.closePath(); g.fill();
    g.fillStyle = '#fff'; for (const [dx, dy] of [[-4, top + 4], [3, top + 7]]) { g.beginPath(); g.arc(dx, dy, 1.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#7fd0ff'; g.beginPath(); g.arc(f * 6, -PH + 28, 4, 0, Math.PI * 2); g.fill();   // 쪽쪽이
    g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath(); g.arc(f * 6, -PH + 28, 6, 0, Math.PI * 2); g.stroke();
  }
}
function drawHat(g, id, f, time) {
  const t = -PH;   // 머리 꼭대기
  if (id === 'bunny') {
    for (const sx of [-9, 9]) {
      g.save(); g.translate(sx, t + 4); g.rotate(sx * 0.02 + Math.sin(time / 400 + sx) * 0.06);
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -16, 6, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffb3cf'; g.beginPath(); g.ellipse(0, -15, 3, 13, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  } else if (id === 'tophat') {
    g.fillStyle = '#16151c'; g.fillRect(-13, t - 28, 26, 28); g.beginPath(); g.ellipse(0, t, 21, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b8323c'; g.fillRect(-13, t - 8, 26, 5);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-10, t - 26, 4, 18);
  } else if (id === 'cowboy') {
    g.fillStyle = '#8a5a2b'; g.beginPath(); g.moveTo(-28, t - 2); g.quadraticCurveTo(0, t + 8, 28, t - 2); g.quadraticCurveTo(0, t + 2, -28, t - 2); g.fill();
    g.beginPath(); g.moveTo(-14, t); g.quadraticCurveTo(-14, t - 22, -4, t - 18); g.quadraticCurveTo(0, t - 14, 4, t - 18); g.quadraticCurveTo(14, t - 22, 14, t); g.closePath(); g.fill();
    g.fillStyle = '#5a3a18'; g.fillRect(-14, t - 6, 28, 4);
  } else if (id === 'horns') {
    g.fillStyle = '#efe6d2'; g.strokeStyle = '#b8a888'; g.lineWidth = 1.5;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 8, t + 3); g.quadraticCurveTo(sd * 22, t - 2, sd * 20, t - 20); g.quadraticCurveTo(sd * 16, t - 8, sd * 15, t + 4); g.closePath(); g.fill(); g.stroke(); }
  } else if (id === 'brain') {
    g.fillStyle = '#f29ab8'; g.beginPath(); g.ellipse(0, t - 4, 17, 11, 0, Math.PI, Math.PI * 2); g.lineTo(17, t + 1); g.lineTo(-17, t + 1); g.closePath(); g.fill();
    g.strokeStyle = '#c4587e'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, t - 14); g.lineTo(0, t); g.stroke();
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 3, t - 10); g.quadraticCurveTo(sd * 9, t - 13, sd * 8, t - 6); g.quadraticCurveTo(sd * 13, t - 4, sd * 12, t - 1); g.stroke(); }
  } else if (id === 'cap') {
    g.fillStyle = '#d8323c'; g.beginPath(); g.ellipse(0, t + 2, 18, 14, 0, Math.PI, Math.PI * 2); g.fill();
    g.fillStyle = '#b02028'; g.beginPath(); g.ellipse(f * 18, t + 2, 14, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, t - 11, 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = '700 9px sans-serif'; g.textAlign = 'center'; g.fillText('B', f * 4, t - 2);
  } else if (id === 'straw') {
    g.fillStyle = '#e8c65a'; g.beginPath(); g.ellipse(0, t, 30, 6, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(0, t - 6, 15, 10, 0, Math.PI, Math.PI * 2); g.lineTo(15, t); g.lineTo(-15, t); g.closePath(); g.fill();
    g.fillStyle = '#c4161c'; g.fillRect(-15, t - 5, 30, 4);
    g.strokeStyle = 'rgba(150,110,30,0.6)'; g.lineWidth = 1; for (let k = -24; k <= 24; k += 8) { g.beginPath(); g.moveTo(k, t - 3); g.lineTo(k * 1.1, t + 4); g.stroke(); }
  }
}
function roundRect2(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// 미리보기용 캐릭터 (로비 치장품 창)
function drawPreview(cv, hat, outfit, color) {
  const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
  g.save(); g.translate(cv.width / 2, cv.height - 14); g.scale(1.6, 1.6);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 2, 22, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = color; roundRect2(g, -PW / 2, -PH, PW, PH, 12); g.fill();
  if (outfit) drawOutfit(g, outfit, 1, performance.now());
  g.fillStyle = '#fff'; g.fillRect(2, -PH + 14, 8, 11); g.fillRect(12, -PH + 14, 8, 11);
  g.fillStyle = '#1a1030'; g.fillRect(6, -PH + 17, 4, 6); g.fillRect(16, -PH + 17, 4, 6);
  if (hat) drawHat(g, hat, 1, performance.now());
  g.fillStyle = color; g.strokeStyle = '#1a1030'; g.lineWidth = 3; g.beginPath(); g.arc(PW / 2 + 4, -PH / 2 - 2, 10, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}
let freezeFlash = 0, lightFlash = 0, errHold = 0, rewindT = 0, rewindG = false;
// 화살 + 바람 소용돌이
function drawArrowsWinds(state, now) {
  const age = Math.max(-0.07, (now - state.time - INTERP_DELAY) / 1000);
  for (const a of state.ar || []) {
    const x = a.x + a.vx * age, y = a.y + a.vy * age, ang = Math.atan2(a.vy, a.vx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (a.s) ctx.scale(a.s, a.s);
    // 불화살·얼음 화살·스킨 화살: 꼬리에 빛나는 자국
    const tc = a.el === 'fire' ? 'rgba(255,120,30,' : a.el === 'blue' ? 'rgba(60,140,255,' : a.el === 'ice' ? 'rgba(150,220,255,' : a.el === 'sand' ? 'rgba(215,175,100,' : a.el === 'wind' ? 'rgba(210,250,240,' : null;
    const fc = a.el && !tc ? fxColor(a.el, 0.7, now) : null;
    if (tc || fc) {
      const tg = ctx.createLinearGradient(-60, 0, 10, 0);
      tg.addColorStop(0, tc ? tc + '0)' : 'rgba(0,0,0,0)'); tg.addColorStop(1, tc ? tc + '0.85)' : fc);
      ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(-22, 0, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (a.h) { ctx.strokeStyle = 'rgba(160,140,255,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(0, 0); ctx.stroke(); }
    if (a.de) { ctx.strokeStyle = 'rgba(150,60,230,0.45)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(4, 0); ctx.stroke(); }
    if (a.lf) { ctx.strokeStyle = 'rgba(110,230,90,0.45)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(4, 0); ctx.stroke(); }
    ctx.strokeStyle = a.de ? '#1c1028' : a.lf ? '#3f9a3a' : '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = a.de ? '#b46bff' : a.lf ? '#7be36f' : a.h ? '#b9a8ff' : '#d8dde6'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(4, -5); ctx.lineTo(4, 5); ctx.fill();
    ctx.fillStyle = a.de ? '#5b2a8c' : a.lf ? '#5cc84a' : a.h ? '#8f7bff' : '#e8e2d0'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-36, -5); ctx.lineTo(-24, 0); ctx.lineTo(-36, 5); ctx.fill();
    ctx.restore();
  }
  for (const w of state.wd || []) {
    const x = w.x + w.vx * age, y = w.y;
    // 아래는 좁고 위는 넓은 소용돌이 (가로 줄이 빙글빙글)
    for (let i = 0; i < 9; i++) {
      const t = i / 8, yy = y - t * 170, rx = 18 + t * 62, ph = now / 70 + i * 0.9;
      ctx.strokeStyle = w.r ? `rgba(${255},${Math.round(70 + 120 * t)},${30},${0.45 + 0.4 * (1 - t)})` : `rgba(210,250,240,${0.35 + 0.4 * (1 - t)})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(ph) * 8, yy, rx, 9 + t * 6, 0, ph % (Math.PI * 2), ph % (Math.PI * 2) + Math.PI * 1.4); ctx.stroke();
    }
  }
}
// 활 (몸 좌표계): 시위를 당기면 줄이 뒤로 가고 화살이 걸림
//  rubM: 고무(때릴 때 팔이 늘어남), otherM: 강화·거인·헐크 (활이 커지고 휘두르는 범위도 커짐)
function drawBow(p, f, time, rubM = 1, otherM = 1) {
  // 약공격: 활을 앞으로 휘둘러 때림
  const swing = p.at === 1 ? (p.ap === 1 ? -0.6 : p.ap === 2 ? 0.5 : 0.2) : 0;
  const ext = p.at === 1 && p.ap !== 1 && rubM > 1 ? 58 * otherM * (rubM - 1) + 30 : 0;   // 고무: 팔이 쭉
  const push = (p.at === 1 ? (p.ap === 1 ? -4 : p.ap === 2 ? 26 : 10) : 0) * otherM + ext;
  const hx = f * (PW / 2 + 8 + push), hy = -PH / 2 - 2;
  if (ext) { ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * PW / 2, hy); ctx.lineTo(hx, hy); ctx.stroke(); }
  const fxs = fxOf(p);
  // 불(화염·태양)·얼음이면 활이 빛남, 스킨 이펙트도 반영
  const blueHot = (hasK(p, 'fire') && skinOn(p, 'bluefire') && !p.sun) || (p.sun && skinOn(p, 'supernova') && (!hasK(p, 'fire') || skinOn(p, 'bluefire')));
  const glow = blueHot ? 'rgba(60,140,255,0.95)' : (hasK(p, 'fire') || p.sun) ? 'rgba(255,120,30,0.95)' : hasK(p, 'ice') ? 'rgba(140,220,255,0.95)' : fxs ? fxColor(fxs, 0.95, time) : null;
  if (p.at === 1 && p.ap === 2) {
    ctx.fillStyle = fxs ? fxColor(fxs, 0.4, time) : 'rgba(255,240,210,0.4)';
    ctx.beginPath(); ctx.moveTo(hx - f * 20, hy); ctx.arc(hx - f * 20, hy, 62 * otherM, f > 0 ? -0.9 : Math.PI - 0.5, f > 0 ? 0.5 : Math.PI + 0.9); ctx.closePath(); ctx.fill();
  }
  const pull = p.dr || 0;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f * otherM, otherM); ctx.rotate(swing);
  const elf = skinOn(p, 'darkelf');   // 다크 엘프: 검보라 활
  const leaf = skinOn(p, 'elf');      // 엘프: 덩굴 감긴 초록·갈색 활
  if (p.hm) { ctx.shadowColor = 'rgba(150,130,255,0.95)'; ctx.shadowBlur = 14; }
  else if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
  else if (elf) { ctx.shadowColor = 'rgba(170,80,255,0.9)'; ctx.shadowBlur = 12; }
  else if (leaf) { ctx.shadowColor = 'rgba(120,230,100,0.8)'; ctx.shadowBlur = 10; }
  ctx.strokeStyle = elf ? '#1c1028' : leaf ? '#6b4423' : '#8a5a2b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-14, 0, 30, -1.1, 1.1); ctx.stroke();
  if (leaf) {
    // 활대에 감긴 덩굴과 잎
    ctx.shadowBlur = 0; ctx.strokeStyle = '#3f9a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let t = -1.05; t <= 1.05; t += 0.07) { const r = 30 + Math.sin(t * 14) * 3; ctx.lineTo(-14 + Math.cos(t) * r, Math.sin(t) * r); } ctx.stroke();
    ctx.fillStyle = '#5cc84a';
    for (const t of [-0.9, -0.4, 0.15, 0.6, 1.0]) { const lx = -14 + Math.cos(t) * 33, ly = Math.sin(t) * 33; ctx.beginPath(); ctx.ellipse(lx, ly, 5, 2.6, t + 0.8, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.shadowBlur = 0;
  const tx = -14 + Math.cos(1.1) * 30, ty = Math.sin(1.1) * 30, sx = tx - pull * 26;
  if (elf) { ctx.strokeStyle = '#b46bff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-14, 0, 33, -1.0, 1.0); ctx.stroke(); }
  ctx.strokeStyle = elf ? '#c08aff' : leaf ? '#cfe8b0' : '#efe6d2'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(tx, -ty); ctx.lineTo(sx, 0); ctx.lineTo(tx, ty); ctx.stroke();
  if (pull > 0) {
    ctx.strokeStyle = elf ? '#1c1028' : leaf ? '#3f9a3a' : '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 44, 0); ctx.stroke();
    ctx.fillStyle = p.hm ? '#b9a8ff' : elf ? '#b46bff' : leaf ? '#7be36f' : '#d8dde6'; ctx.beginPath(); ctx.moveTo(sx + 50, 0); ctx.lineTo(sx + 40, -5); ctx.lineTo(sx + 40, 5); ctx.fill();
    if (pull >= 1) { ctx.strokeStyle = 'rgba(255,230,120,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + 46, 0, 9 + Math.sin(time / 60) * 2, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(hx + f * otherM * (-14 + Math.cos(1.1) * 30 - pull * 26) * (pull > 0 ? 1 : 0), hy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
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
  for (const m of state.mn || []) {
    // 지뢰: 주인 색 고리 + 깜빡이는 불빛 (설치 직후엔 흐림)
    ctx.globalAlpha = m.a ? 1 : 0.5;
    ctx.fillStyle = '#4a4d3a'; ctx.beginPath(); ctx.ellipse(m.x, m.y - 4, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6a6e52'; ctx.beginPath(); ctx.ellipse(m.x, m.y - 7, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = m.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(m.x, m.y - 4, 17, 7, 0, 0, Math.PI * 2); ctx.stroke();
    const on = Math.floor(now / 350) % 2 === 0;
    ctx.fillStyle = on ? m.c : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(m.x, m.y - 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const t of state.tr || []) {
    const x = t.x, y = t.y;
    if (t.fg) {
      // 개구리: 쪼그려 앉은 초록 몸 + 툭 튀어나온 눈 + 보는 방향의 입
      const fx3 = Math.cos(t.a) >= 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4caf3c'; ctx.beginPath(); ctx.ellipse(x, y - 18, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8be06a'; ctx.beginPath(); ctx.ellipse(x + fx3 * 4, y - 12, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d9030'; for (const sx3 of [-20, 20]) { ctx.beginPath(); ctx.ellipse(x + sx3, y - 3, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      for (const ex of [-11, 11]) {
        ctx.fillStyle = '#4caf3c'; ctx.beginPath(); ctx.arc(x + ex, y - 34, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + ex, y - 35, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + ex + fx3 * 2, y - 35, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#1d4a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + fx3 * 6, y - 22, 10, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = t.c; ctx.fillRect(x - 12, y - 4, 24, 5);   // 주인 색 목걸이
      ctx.strokeStyle = t.c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y - 18, 28, 20, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i < t.hp ? '#6fe39a' : 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 17 + i * 9, y - 52, 7, 4); }
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
    // 다리
    ctx.strokeStyle = '#4b5361'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 6, y - 18); ctx.moveTo(x + 16, y); ctx.lineTo(x + 6, y - 18); ctx.stroke();
    // 몸통 (주인 색 테두리 + 띠 + 깃발로 누구 건지 구별)
    ctx.fillStyle = '#8994a6'; ctx.beginPath(); ctx.arc(x, y - 30, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = t.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 30, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = t.c; ctx.fillRect(x - 17, y - 32, 34, 5);
    ctx.strokeStyle = '#3c4350'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 12, y - 44); ctx.lineTo(x - 12, y - 62); ctx.stroke();
    ctx.fillStyle = t.c; ctx.beginPath(); ctx.moveTo(x - 12, y - 62); ctx.lineTo(x + 2, y - 57); ctx.lineTo(x - 12, y - 52); ctx.fill();
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
    if (b.tg) {
      // 개구리 혀
      ctx.strokeStyle = '#ff6f8f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.ox, b.oy); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = '#ff4f78'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const x = b.x + b.vx * age, y = b.y + b.vy * age;
    ctx.strokeStyle = 'rgba(255,200,80,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * 0.025, y - b.vy * 0.025); ctx.stroke();
    ctx.fillStyle = b.c || '#fff2b0'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}
// 눈보라: 화면 가득 눈이 옆으로 날림
let snow = [];
function drawBlizzard(state, dt, now) {
  const on = state.bz > 0;
  if (on && state.bzd) {
    // 어둠: 화면 가장자리부터 검게 잠기고, 검은 연기가 흘러다님
    const W2 = STAGE.width, H2 = STAGE.height;
    const vg = ctx.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.15, W2 / 2, H2 / 2, W2 * 0.75);
    vg.addColorStop(0, 'rgba(10,5,20,0.25)'); vg.addColorStop(1, 'rgba(5,2,12,0.85)');
    ctx.fillStyle = vg; ctx.fillRect(-400, -400, W2 + 800, H2 + 800);
    for (let i = 0; i < 9; i++) {
      const x = ((i * 397 + now / 9) % (W2 + 400)) - 200, y = (i * 173) % H2, r = 90 + (i % 3) * 40;
      const sg = ctx.createRadialGradient(x, y, 0, x, y, r); sg.addColorStop(0, 'rgba(30,15,50,0.55)'); sg.addColorStop(1, 'rgba(30,15,50,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (on && state.bza && !state.bzs) {
    // 오로라: 밤하늘처럼 어두워지고, 진한 초록·청록·보라 빛의 커튼이 세로 빛줄기와 함께 일렁임
    const W2 = STAGE.width, H2 = STAGE.height;
    ctx.fillStyle = 'rgba(5,15,35,0.45)'; ctx.fillRect(-400, -400, W2 + 800, H2 + 800);
    const cols = [[42, 245, 152], [58, 224, 208], [90, 255, 170], [166, 107, 255], [70, 200, 255]];
    for (let band = 0; band < 5; band++) {
      const [r, g, bl] = cols[band], top = 10 + band * 45, depth = 260 + band * 30;
      const grad = ctx.createLinearGradient(0, top, 0, top + depth);
      grad.addColorStop(0, `rgba(${r},${g},${bl},0)`); grad.addColorStop(0.25, `rgba(${r},${g},${bl},0.65)`); grad.addColorStop(0.6, `rgba(${r},${g},${bl},0.3)`); grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, top);
      for (let x = 0; x <= W2; x += 30) ctx.lineTo(x, top + Math.sin(x / 130 + now / 500 + band * 1.7) * 45);
      for (let x = W2; x >= 0; x -= 30) ctx.lineTo(x, top + depth + Math.sin(x / 110 + now / 450 + band * 2.3) * 40);
      ctx.closePath(); ctx.fill();
    }
    // 세로로 내리꽂는 빛줄기
    for (let i = 0; i < 26; i++) {
      const x = ((i * 113 + now / 25) % (W2 + 100)) - 50, h = 180 + ((i * 53) % 140), a2 = 0.18 + 0.18 * Math.sin(now / 200 + i);
      const rg = ctx.createLinearGradient(0, 20, 0, 20 + h);
      rg.addColorStop(0, `rgba(200,255,230,0)`); rg.addColorStop(0.4, `rgba(150,255,210,${a2})`); rg.addColorStop(1, 'rgba(150,255,210,0)');
      ctx.fillStyle = rg; ctx.fillRect(x, 20 + Math.sin(i) * 30, 6 + (i % 3) * 3, h);
    }
    // 반짝이는 별가루
    ctx.fillStyle = 'rgba(230,255,245,0.9)';
    for (let i = 0; i < 40; i++) { const x = (i * 211) % W2, y = (i * 97) % (H2 * 0.6); if ((Math.floor(now / 180) + i) % 4 === 0) ctx.fillRect(x, y, 2.5, 2.5); }
    return;
  }
  const sand = !!state.bzs;   // 모래 스킨이면 모래바람
  if (on && snow.length < 160) for (let i = 0; i < 8; i++) {
    // 눈은 위에서 내리고, 모래바람은 화면 왼쪽 전체 높이에서 옆으로 불어 옴
    if (sand) snow.push({ x: -40 - Math.random() * 200, y: Math.random() * STAGE.height, vx: 520 + Math.random() * 300, vy: 20 + Math.random() * 40, r: 2 + Math.random() * 3, sand: 1 });
    else snow.push({ x: Math.random() * (STAGE.width + 400) - 300, y: -20 - Math.random() * 100, vx: 260 + Math.random() * 200, vy: 160 + Math.random() * 140, r: 2 + Math.random() * 3 });
  }
  if (!snow.length) return;
  if (on) { ctx.fillStyle = sand ? 'rgba(210,170,100,0.22)' : 'rgba(200,230,255,0.12)'; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); }
  ctx.fillStyle = sand ? 'rgba(200,155,80,0.85)' : 'rgba(245,250,255,0.9)';
  for (const f of snow) {
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (sand) ctx.fillRect(f.x, f.y, f.r * 2.2, f.r * 0.8);
    else { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
  }
  snow = snow.filter((f) => f.y < STAGE.height + 40 && f.x < STAGE.width + 60 && (on || Math.random() > 0.002) && (!!f.sand === sand || !on));
}
// 검사 참격: 초승달 모양으로 날아감
function drawSlashes(state, now) {
  const age = (now - state.time - INTERP_DELAY) / 1000;
  for (const s of state.pj || []) {
    const x = s.x + s.vx * Math.max(-0.07, age), y = s.y, f = s.vx > 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    const g = ctx.createLinearGradient(-60, 0, 30, 0);
    if (s.ho) { g.addColorStop(0, 'rgba(255,240,170,0)'); g.addColorStop(1, 'rgba(255,248,210,0.98)'); }
    else if (s.d) { g.addColorStop(0, 'rgba(40,10,60,0)'); g.addColorStop(1, 'rgba(30,8,45,0.95)'); }
    else { g.addColorStop(0, 'rgba(200,225,255,0)'); g.addColorStop(1, 'rgba(240,248,255,0.95)'); }
    ctx.fillStyle = g;
    if (s.d) { ctx.shadowColor = 'rgba(170,80,255,0.95)'; ctx.shadowBlur = 18; }
    if (s.ho) { ctx.shadowColor = 'rgba(255,220,90,1)'; ctx.shadowBlur = 22; }
    ctx.beginPath(); ctx.moveTo(-10, -46); ctx.quadraticCurveTo(46, 0, -10, 46); ctx.quadraticCurveTo(18, 0, -10, -46); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = s.ho ? 'rgba(255,215,80,0.95)' : s.d ? 'rgba(190,110,255,0.95)' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
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
    // 더블 모드: 검사와 궁수는 같이 못 씀
    if (other && ((k === 'sword' && other === 'archer') || (k === 'archer' && other === 'sword'))) { b.disabled = true; b.style.opacity = '.35'; b.title = '검사와 궁수는 같이 쓸 수 없어요'; }
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
        if (kk === 'combo') { ready = meS.cb > 0; txt = `${meS.cb || 0}콤보`; }
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
    // 지진: 서버가 알려 주는 내 흔들림 상태를 따름 (시간 되돌리기에도 맞게)
    const meQ = latest.p.find((q) => q.id === myId);
    quakeT = meQ && meQ.qk ? Math.max(quakeT, 0.4) : Math.max(0, quakeT - dt * 3);
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
    for (const q of latest.p) if (q.ts) {
      // 시간 저장 위치: 반투명 시계
      const [tx, ty] = q.ts, cy3 = ty - 34;
      ctx.globalAlpha = 0.55 + Math.sin(now / 250) * 0.15;
      ctx.strokeStyle = skinOn(q, 'timestone') ? '#3cf08a' : '#9fb3ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tx, cy3, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, cy3); ctx.lineTo(tx, cy3 - 15); ctx.moveTo(tx, cy3); ctx.lineTo(tx + 10 * Math.cos(now / 400), cy3 + 10 * Math.sin(now / 400)); ctx.stroke();
      ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(tx, cy3 + 32, 5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawArrowsWinds(latest, now);
    interpolatedPlayers('cl').forEach((c) => drawPlayer(c, now));
    players.filter((p) => p.id !== myId).forEach((p) => drawPlayer(p, now));
    players.filter((p) => p.id === myId).forEach((p) => drawPlayer(p, now));
    drawParticles(dt);
    drawSmoke(latest.sm || [], now);
    drawBlizzard(latest, dt, now);
    if (freezeFlash > 0) { ctx.fillStyle = `rgba(210,236,255,${Math.min(0.35, freezeFlash)})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); freezeFlash -= dt; }
    if (rewindT > 0) {
      // 시간 되돌리기: 푸른 화면 + 거꾸로 도는 시계
      const k = rewindT / 0.9;
      ctx.fillStyle = rewindG ? `rgba(40,210,110,${0.33 * k})` : `rgba(90,120,255,${0.35 * k})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800);
      ctx.save(); ctx.translate(STAGE.width / 2, STAGE.height / 2 - 60); ctx.globalAlpha = k;
      ctx.strokeStyle = rewindG ? '#c8ffdc' : '#dfe6ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(-(1 - k) * Math.PI * 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.moveTo(0, 0); ctx.lineTo(45, 0); ctx.stroke();
      ctx.restore(); rewindT -= dt;
    }
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
