// =====================================================================
//  계정 (회원가입 · 로그인 · 전적 · 랭킹)
//  - 비밀번호는 원문을 저장하지 않고 scrypt 해시로만 저장합니다.
//  - 저장 위치
//      DATABASE_URL 환경변수가 있으면 → Postgres 데이터베이스 (온라인 서비스용, 영구 보관)
//      없으면 → data/accounts.json 파일 (내 컴퓨터에서 테스트할 때)
// =====================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'accounts.json');
const SESSION_DAYS = 30;

let store = { accounts: {}, sessions: {} };
let pool = null;          // Postgres 연결 (있을 때만)
let storageName = '파일 (' + FILE + ')';

function normalize() {
  store = store && typeof store === 'object' ? store : {};
  store.accounts = store.accounts || {};
  store.sessions = store.sessions || {};
  store.reports = Array.isArray(store.reports) ? store.reports : [];   // 버그 제보
}

async function init() {
  await initStore();
  upgradeAll();
}
async function initStore() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false },
        max: 3,
      });
      await pool.query('CREATE TABLE IF NOT EXISTS brawl_store (k text PRIMARY KEY, v jsonb NOT NULL)');
      const r = await pool.query("SELECT v FROM brawl_store WHERE k = 'store'");
      if (r.rows[0]) store = r.rows[0].v;
      normalize();
      storageName = 'Postgres 데이터베이스';
      return;
    } catch (e) {
      console.error('!!! 데이터베이스에 연결하지 못했어요. 파일에 저장합니다 (재시작하면 사라질 수 있어요):', e.message);
      pool = null;
    }
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(FILE)) store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    console.error('계정 파일을 읽지 못했어요:', e.message);
  }
  normalize();
}

let saveTimer = null;
let saving = Promise.resolve();
let dirty = false;   // 아직 저장 안 된 변경이 있는지
function save() {
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(flush, 500);
}
function flush() {
  clearTimeout(saveTimer); saveTimer = null;
  dirty = false;
  const json = JSON.stringify(store);
  if (pool) {
    saving = saving.then(() => pool.query(
      "INSERT INTO brawl_store (k, v) VALUES ('store', $1::jsonb) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v", [json],
    )).catch((e) => console.error('데이터베이스에 저장하지 못했어요:', e.message));
    return saving;
  }
  try {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, FILE);
  } catch (e) {
    console.error('계정 파일을 저장하지 못했어요:', e.message);
  }
  return Promise.resolve();
}
// 서버가 꺼질 때는 '저장 안 된 변경'이 있을 때만 저장
// (새 서버로 바뀌는 순간 예전 서버가 오래된 데이터로 덮어쓰지 않게)
// 서버가 꺼지기 직전에 할 일 (예: 인디언포커 판돈 돌려주기). 저장하기 전에 먼저 실행됨
const shutdownHooks = [];
function onShutdown(fn) { shutdownHooks.push(fn); }
async function shutdown() {
  for (const fn of shutdownHooks) { try { fn(); } catch (e) { console.error('종료 준비 실패:', e.message); } }
  if (dirty) await flush();
  else await saving;
  if (pool) await pool.end().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function cleanNick(s) {
  return String(s || '').normalize('NFC')
    .replace(/[<>&"'\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .trim().slice(0, 12);
}
const keyOf = (nick) => cleanNick(nick).toLowerCase();

function scrypt(pw, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (err, buf) => (err ? reject(err) : resolve(buf)));
  });
}

// =====================================================================
//  보석 · 스킬 뽑기 · 관리자
//  숫자를 바꾸면 보석 획득량과 뽑기 확률이 바뀌어요.
// =====================================================================
const ALL_SKILLS = ['slow', 'blink', 'stealth', 'clone', 'swap', 'fly', 'explode', 'freeze', 'rock', 'magnet', 'empower', 'parasite', 'quake', 'giant', 'rubber', 'engine', 'sword', 'blackflash', 'lightning', 'undying', 'hulk', 'fire', 'ice', 'turret', 'error', 'sun', 'wind', 'archer', 'time', 'combo', 'reflect', 'invert', 'atom', 'mine', 'ninja', 'gamble', 'starlight', 'shield', 'tentacle', 'ghost', 'flash', 'flood', 'wave', 'dope', 'portal', 'charge', 'dash', 'hop', 'gem', 'shotgun', 'venom', 'ambush', 'mark', 'hook', 'leech', 'disc', 'cloud', 'barrier', 'hammer', 'whip', 'curse', 'guard', 'thorns', 'wall', 'volcano', 'shrink'];
const BASE_SKILLS = ['slow', 'blink'];          // 게스트·새 계정 기본 스킬
// 운영 보상 (자동 지급, 계정마다 한 번)
const GRANTS = [
  { id: 'server-down-2026-11', gems: 10000, why: '서버 중지 보상', before: '2026-11-01T13:00:00+09:00' },
];
const GEMS = {
  START: 200,          // 가입 선물
  PLAY: 25,           // 사람 2명 이상인 판에 참가
  PLAY_BOT: 10,        // 봇이랑만 한 판
  WIN: 40,            // 사람 2명 이상인 판에서 우승
  KILL: 12,            // 사람을 장외로 보냄
  KILL_BOT: 5,        // 봇을 장외로 보냄
  CHESS_WIN: 100,     // 럭키 체스에서 이김
  CHESS_PLAY: 20,     // 럭키 체스 한 판 끝까지 둠 (지거나 비김)
  // 럭키 체스 봇전 (난이도별 이기면 받는 보석 · 지거나 비기면 PLAY). 체스 랭킹·전적에는 안 들어감
  CHESS_BOT: { easy: 10, medium: 25, hard: 50, PLAY: 5 },
  // 레인보우 원카드 (사람 2명 이상: 1등 / 참가) · 봇전은 CHESS_BOT과 같음 (가장 어려운 봇 기준)
  ONECARD_WIN: 100,
  ONECARD_PLAY: 20,
};
const GACHA = {
  COST: 200,          // 뽑기 1회 가격
  DUP_REFUND: 40,     // 이미 가진 스킬이 나오면 돌려주는 보석
  TEN: 10,           // 10회 뽑기
  BUY: 1000,         // 원하는 스킬 바로 사기
  // 뽑기 확률 (가중치): 기본 스킬(둔화·점멸)은 8, 나머지 스킬은 전부 12 — 새 스킬을 추가하면 ALL_SKILLS만 고치면 자동으로 들어감
  POOL: ALL_SKILLS.map((skill) => ({ skill, weight: skill === 'slow' || skill === 'blink' ? 8 : 12 })),
};
// 관리자 닉네임 (환경 변수 ADMIN_NICKS, 쉼표로 여러 명). 이미 가입된 계정에만 적용돼요.
const ADMIN_NICKS = String(process.env.ADMIN_NICKS || '').split(',').map((n) => n.trim().toLowerCase()).filter(Boolean);

// 예전 계정에 새 항목 채워 넣기
function upgrade(a, key) {
  let changed = false;
  if (!Array.isArray(a.skins)) { a.skins = []; changed = true; }          // 산 스킨
  // 치장품 시스템 삭제: 뽑았던 치장품 1개당 보석 70개를 돌려주고 기록을 지움
  if ('cosm' in a || 'cosmSel' in a) {
    if (Array.isArray(a.cosm) && a.cosm.length) a.gems = (Number.isFinite(a.gems) ? a.gems : GEMS.START) + a.cosm.length * 70;
    delete a.cosm; delete a.cosmSel; changed = true;
  }
  if (!a.skinSel || typeof a.skinSel !== 'object') { a.skinSel = {}; changed = true; }   // 능력별 장착 스킨
  if (!Number.isFinite(a.gems)) { a.gems = GEMS.START; changed = true; }
  if (!Array.isArray(a.owned)) { a.owned = [...BASE_SKILLS]; changed = true; }
  for (const b of BASE_SKILLS) if (!a.owned.includes(b)) { a.owned.push(b); changed = true; }
  a.owned = a.owned.filter((k) => ALL_SKILLS.includes(k));
  if (!hasSkill(a, a.skill)) { a.skill = 'slow'; changed = true; }
  const shouldAdmin = ADMIN_NICKS.includes(key);
  if (shouldAdmin && !a.admin) { a.admin = true; changed = true; }
  // 운영 보상: 계정마다 한 번 자동으로 지급 (before 전에 만든 계정만)
  if (!Array.isArray(a.grants)) { a.grants = []; changed = true; }
  for (const g of GRANTS) {
    if (a.grants.includes(g.id) || (g.before && (a.createdAt || 0) >= Date.parse(g.before))) continue;
    a.gems += g.gems; a.grants.push(g.id); changed = true;
  }
  return changed;
}
function upgradeAll() {
  let changed = false;
  for (const [key, a] of Object.entries(store.accounts)) if (upgrade(a, key)) changed = true;
  if (changed) save();
}

// 실제로 가진 스킬·스킨 (관리자는 지급하지 않아도 전부 — 출시 전 한정판 스킨까지)
//  저장된 a.owned / a.skins 는 그대로 두고, 관리자일 때만 전부 가진 걸로 봄
//  → 새 스킬·스킨을 추가해도 자동으로 생기고, 관리자에서 빠지면 원래 가진 것만 남음
const skillsOf = (a) => (a && a.admin ? [...ALL_SKILLS] : [...(a.owned || [])]);
const skinIdsOf = (a) => (a && a.admin ? Object.keys(SKINS) : [...(a.skins || [])]);
const hasSkill = (a, k) => !!a && (a.admin ? ALL_SKILLS.includes(k) : (a.owned || []).includes(k));
const hasSkin = (a, id) => !!a && (a.admin ? !!SKINS[id] : (a.skins || []).includes(id));

function publicProfile(a) {
  return {
    nick: a.nick, wins: a.wins, games: a.games, kos: a.kos, skill: a.skill,
    gems: a.gems, owned: skillsOf(a), admin: !!a.admin,
    skins: skinIdsOf(a), skinSel: { ...(a.skinSel || {}) },
    nickWarn: a.nickWarn || null,   // 닉네임 경고 (사유). 있으면 닉네임을 바꿔야 게임 가능
    mustChangePw: !!a.mustChangePw,   // 관리자가 임시 비밀번호를 줬으면 로그인 후 바꿔야 함
    patchSeen: a.patchSeen || null,   // 마지막으로 본 패치 내역
    patchClaimed: patchRewardsFor(a).every((r) => (a.patchClaimed || []).includes(r.id)),   // 받을 수 있는 보상을 다 받았는지
    patchLeft: patchRewardsFor(a).filter((r) => !(a.patchClaimed || []).includes(r.id)).reduce((n, r) => n + r.gems, 0),   // 아직 안 받은 보석
    patchElig: patchRewardsFor(a).map((r) => r.id),   // 이 계정이 받을 수 있는 보상
    chess: { ...CHESS0, ...(a.chess || {}) },   // 럭키 체스 전적 (판·승·패·무)
    onecard: { g: 0, w: 0, ...(a.onecard || {}) },   // 레인보우 원카드 (판·1등)
    poker: { g: 0, net: 0, ...(a.poker || {}) },     // 레인보우 인디언포커 (진짜 보석 판 수 · 번 보석)
  };
}

function newSession(key) {
  const token = crypto.randomBytes(32).toString('hex');
  store.sessions[token] = { key, exp: Date.now() + SESSION_DAYS * 86400000 };
  save();
  return token;
}

async function signup(nickRaw, pw) {
  const nick = cleanNick(nickRaw);
  if (nick.length < 2) throw new Error('닉네임은 2~12자로 써 주세요.');
  if (typeof pw !== 'string' || pw.length < 4 || pw.length > 64) throw new Error('비밀번호는 4~64자로 써 주세요.');
  const key = keyOf(nick);
  if (store.accounts[key]) throw new Error('이미 있는 닉네임이에요. 다른 닉네임을 써 주세요.');
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(pw, salt);
  if (store.accounts[key]) throw new Error('이미 있는 닉네임이에요. 다른 닉네임을 써 주세요.');
  store.accounts[key] = {
    nick, salt: salt.toString('hex'), hash: hash.toString('hex'),
    wins: 0, games: 0, kos: 0, skill: 'slow', createdAt: Date.now(),
    gems: GEMS.START, owned: [...BASE_SKILLS], admin: false,
    skins: [], skinSel: {},
  };
  upgrade(store.accounts[key], key);   // 빠진 항목 채우기 (새 계정도 예전 계정과 똑같은 모양)
  save();
  return { token: newSession(key), profile: publicProfile(store.accounts[key]) };
}

async function login(nickRaw, pw) {
  const key = keyOf(nickRaw);
  const a = store.accounts[key];
  // 없는 계정이어도 같은 시간을 쓰게 해서 닉네임 존재 여부를 덜 드러냄
  const salt = a ? Buffer.from(a.salt, 'hex') : crypto.randomBytes(16);
  const hash = await scrypt(String(pw || ''), salt);
  if (!a || !crypto.timingSafeEqual(hash, Buffer.from(a.hash, 'hex'))) {
    throw new Error('닉네임이나 비밀번호가 맞지 않아요.');
  }
  return { token: newSession(key), profile: publicProfile(a) };
}

function fromToken(token) {
  if (typeof token !== 'string') return null;
  const s = store.sessions[token];
  if (!s) return null;
  if (s.exp < Date.now() || !store.accounts[s.key]) { delete store.sessions[token]; save(); return null; }
  return s.key;
}

function logout(token) {
  if (store.sessions[token]) { delete store.sessions[token]; save(); }
}

function profileOf(key) {
  const a = store.accounts[key];
  return a ? publicProfile(a) : null;
}
function nickOf(key) {
  const a = store.accounts[key];
  return a ? a.nick : null;
}
function isTaken(nick) {
  return !!store.accounts[keyOf(nick)];
}

function ownedOf(key) {
  const a = store.accounts[key];
  return a ? skillsOf(a) : [...BASE_SKILLS];
}
function owns(key, skill) {
  const a = store.accounts[key];
  return hasSkill(a, skill);
}
function setSkill(key, skill) {
  const a = store.accounts[key];
  if (a && a.skill !== skill && hasSkill(a, skill)) { a.skill = skill; save(); }
}

// 판이 끝날 때 서버가 호출 (counted = 사람 2명 이상인 판이라 전적에 기록)
function record(key, { counted, win, kills, botKills, gemHits }) {
  const a = store.accounts[key];
  if (!a) return null;
  let gems = 0;
  if (counted) {
    a.games += 1;
    if (win) a.wins += 1;
    a.kos += Math.max(0, kills | 0);
    gems += GEMS.PLAY + (win ? GEMS.WIN : 0);
  } else {
    gems += GEMS.PLAY_BOT;
  }
  gems += GEMS.KILL * Math.max(0, kills | 0) + GEMS.KILL_BOT * Math.max(0, botKills | 0);
  gems += Math.max(0, Math.min(60, gemHits | 0));   // 보석 스킬로 때려서 모은 보석 (한 판 최대 60)
  a.gems += gems;
  save();
  return { profile: publicProfile(a), gained: gems };
}

// ---------- 럭키 체스 (다른 사이트의 체스 서버가 판이 끝날 때 호출) ----------
const CHESS0 = { g: 0, w: 0, l: 0, d: 0 };
function chessRecord(key, result) {
  const a = store.accounts[key];
  if (!a) return null;
  if (!['win', 'loss', 'draw'].includes(result)) throw new Error('잘못된 결과예요.');
  a.chess = { ...CHESS0, ...(a.chess || {}) };
  a.chess.g += 1;
  a.chess[result === 'win' ? 'w' : result === 'loss' ? 'l' : 'd'] += 1;
  const gems = result === 'win' ? GEMS.CHESS_WIN : GEMS.CHESS_PLAY;
  a.gems += gems;
  save();
  return { profile: publicProfile(a), gained: gems };
}
function chessBotRecord(key, result, diff) {
  const a = store.accounts[key];
  if (!a) return null;
  if (!['win', 'loss', 'draw'].includes(result) || !['easy', 'medium', 'hard'].includes(diff)) throw new Error('잘못된 결과예요.');
  const gems = result === 'win' ? GEMS.CHESS_BOT[diff] : GEMS.CHESS_BOT.PLAY;
  a.chessBot = a.chessBot || {};
  const k = diff + (result === 'win' ? 'W' : 'G');
  a.chessBot[k] = (a.chessBot[k] || 0) + 1;
  a.gems += gems;
  save();
  return { profile: publicProfile(a), gained: gems };
}
// ---------- 레인보우 원카드 ----------
//  result: 'win' | 'play' · bot: 봇전이면 가장 어려운 봇 난이도 (보석만, 전적·랭킹엔 안 들어감)
function onecardRecord(key, result, bot) {
  const a = store.accounts[key];
  if (!a) return null;
  if (!['win', 'play'].includes(result)) throw new Error('잘못된 결과예요.');
  let gems;
  if (bot) {
    if (!['easy', 'medium', 'hard'].includes(bot)) throw new Error('잘못된 결과예요.');
    gems = result === 'win' ? GEMS.CHESS_BOT[bot] : GEMS.CHESS_BOT.PLAY;
  } else {
    a.onecard = { g: 0, w: 0, ...(a.onecard || {}) };
    a.onecard.g += 1; if (result === 'win') a.onecard.w += 1;
    gems = result === 'win' ? GEMS.ONECARD_WIN : GEMS.ONECARD_PLAY;
  }
  a.gems += gems;
  save();
  return { profile: publicProfile(a), gained: gems };
}
// ---------- 레인보우 인디언포커: 진짜 보석 걸기 ----------
//  베팅할 때 바로 빼 두고(takeGems), 판이 끝나면 이긴 사람에게 판돈을 줌(giveGems)
//  → 보석은 사람끼리 옮겨 다닐 뿐 새로 생기지 않음
function gemsOf(key) { const a = store.accounts[key]; return a ? a.gems : 0; }
function takeGems(key, n) {
  const a = store.accounts[key];
  n = Math.floor(n);
  if (!a || !(n > 0) || a.gems < n) return false;
  a.gems -= n; save();
  return true;
}
function giveGems(key, n) {
  const a = store.accounts[key];
  n = Math.floor(n);
  if (!a || !(n > 0)) return false;
  a.gems += n; save();
  return true;
}
function pokerStat(key, net) {
  const a = store.accounts[key];
  if (!a) return;
  a.poker = { g: 0, net: 0, ...(a.poker || {}) };
  a.poker.g += 1; a.poker.net += Math.round(net);
  save();
}
function onecardRanking(limit = 10) {
  return Object.values(store.accounts).filter((a) => a.onecard && a.onecard.g > 0)
    .sort((x, y) => y.onecard.w - x.onecard.w || x.onecard.g - y.onecard.g)
    .slice(0, limit).map((a) => ({ nick: a.nick, g: a.onecard.g, w: a.onecard.w }));
}
function pokerRanking(limit = 10) {
  return Object.values(store.accounts).filter((a) => a.poker && a.poker.g > 0)
    .sort((x, y) => y.poker.net - x.poker.net || y.poker.g - x.poker.g)
    .slice(0, limit).map((a) => ({ nick: a.nick, g: a.poker.g, net: a.poker.net }));
}

function chessRanking(limit = 10) {
  return Object.values(store.accounts)
    .filter((a) => a.chess && a.chess.g > 0)
    .sort((x, y) => y.chess.w - x.chess.w || x.chess.l - y.chess.l || y.chess.g - x.chess.g)
    .slice(0, limit)
    .map((a) => ({ nick: a.nick, ...CHESS0, ...a.chess }));
}

// ---------- 스킨 ----------
const { SKINS, priceOf: skinPrice } = require('./public/skins.js');
const saleOf = (id) => Math.round(skinPrice(id) * SHOP.SKIN_SALE);   // 오늘의 상점 할인가
const { PATCH } = require('./public/patch.js');
// 패치 내역: 봤다고 표시 / 보상 받기 (패치마다 한 번)
// 이 계정이 받을 수 있는 패치 보상 (버그를 고친 뒤에 가입한 계정은 그 보상 없음)
function patchRewardsFor(a) {
  return (PATCH.rewards || []).filter((r) => !r.before || (a.createdAt || 0) < Date.parse(r.before));
}
function patchSeen(key) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  if (a.patchSeen !== PATCH.id) { a.patchSeen = PATCH.id; save(); }
  return { profile: publicProfile(a) };
}
function patchClaim(key) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  a.patchClaimed = a.patchClaimed || [];
  const elig = patchRewardsFor(a);
  if (!elig.length) throw new Error('버그를 고친 뒤에 만든 계정이라 이번 보상은 없어요.');
  const left = elig.filter((r) => !a.patchClaimed.includes(r.id));
  if (!left.length) throw new Error('이미 받은 보상이에요.');
  let gained = 0;
  for (const r of left) { a.patchClaimed.push(r.id); gained += r.gems; }
  a.gems += gained; a.patchSeen = PATCH.id;
  save();
  return { gained, profile: publicProfile(a) };
}
// 원하는 스킬을 보석으로 바로 사기
function buySkill(key, skill) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  if (!ALL_SKILLS.includes(skill)) throw new Error('없는 스킬이에요.');
  if (hasSkill(a, skill)) throw new Error('이미 가진 스킬이에요.');
  if (a.gems < GACHA.BUY) throw new Error(`보석이 모자라요. 스킬 사기는 ${GACHA.BUY}개예요.`);
  a.gems -= GACHA.BUY; a.owned.push(skill);
  save();
  return { skill, profile: publicProfile(a) };
}
// ---------------- 상점 ----------------
const SHOP = require('./shop.js');
// 한국 시간 날짜 'YYYY-MM-DD' (상점·일일 보상은 한국 자정에 바뀜)
const kstDay = (t = Date.now()) => new Date(t + 9 * 3600000).toISOString().slice(0, 10);
// 날짜로 정해지는 난수 → 모든 유저에게 같은 상품
function seededPick(list, n, seedStr) {
  let h = 2166136261; for (const ch of seedStr) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
const NORMAL_SKINS = Object.keys(SKINS).filter((id) => !SKINS[id].limited);   // 한정판은 오늘의 상점·일반 구매에 안 나옴
function todayShop(day = kstDay()) {
  return {
    day,
    skins: seededPick(NORMAL_SKINS, SHOP.SKINS_PER_DAY, 'skin:' + day),
    skills: seededPick(ALL_SKILLS.filter((k) => !BASE_SKILLS.includes(k)), SHOP.SKILLS_PER_DAY, 'skill:' + day),
  };
}
// 지금 하는 한정판 이벤트
function activeEvents(day = kstDay()) {
  return (SHOP.EVENTS || []).filter((e) => day >= e.from && day <= e.until);
}
// 지금 파는 패키지 (from 00:00 ~ until 23:59, 한국 시간)
function activePackages(day = kstDay()) {
  return SHOP.PACKAGES.filter((p) => (!p.from || day >= p.from) && (!p.until || day <= p.until));
}
function shopInfo(key) {
  const a = key && store.accounts[key];
  if (a) upgrade(a, key);
  const t = todayShop();
  const nextReset = Date.parse(t.day + 'T00:00:00+09:00') + 86400000;
  return {
    day: t.day, nextReset, daily: SHOP.DAILY, dailyDone: !!a && a.dailyAt === t.day,
    skins: t.skins.map((id) => ({ id, price: saleOf(id), normal: skinPrice(id), owned: hasSkin(a, id) })),
    skills: t.skills.map((id) => ({ id, price: SHOP.SKILL_PRICE, owned: hasSkill(a, id) })),
    events: activeEvents(t.day).map((e) => ({
      id: e.id, name: e.name, desc: e.desc, ends: Date.parse(e.until + 'T00:00:00+09:00') + 86400000,
      skins: e.skins.filter((id) => SKINS[id]).map((id) => ({ id, price: skinPrice(id), owned: hasSkin(a, id) })),
    })),
    packages: activePackages(t.day).map((p) => ({
      id: p.id, name: p.name, desc: p.desc, price: p.price, skills: p.skills || [], skins: p.skins || [],
      ends: Date.parse(p.until + 'T00:00:00+09:00') + 86400000,
      owned: !!a && (p.skills || []).every((k) => hasSkill(a, k)) && (p.skins || []).every((k) => hasSkin(a, k)),
    })),
  };
}
function shopDaily(key) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  const day = kstDay();
  if (a.dailyAt === day) throw new Error('오늘 보상은 이미 받았어요. 내일 다시 와요!');
  a.dailyAt = day; a.gems += SHOP.DAILY; save();
  return { gained: SHOP.DAILY, profile: publicProfile(a), shop: shopInfo(key) };
}
function shopBuy(key, kind, id) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  upgrade(a, key);
  const t = todayShop();
  const pay = (price) => { if (a.gems < price) throw new Error(`보석이 모자라요. ${price}개가 필요해요.`); a.gems -= price; };
  if (kind === 'skin') {
    if (!t.skins.includes(id)) throw new Error('오늘 상점에 없는 스킨이에요. (상점이 바뀌었을 수 있어요)');
    if (hasSkin(a, id)) throw new Error('이미 가진 스킨이에요.');
    pay(saleOf(id)); a.skins.push(id); a.skinSel[SKINS[id].skill] = id;
  } else if (kind === 'skill') {
    if (!t.skills.includes(id)) throw new Error('오늘 상점에 없는 스킬이에요. (상점이 바뀌었을 수 있어요)');
    if (hasSkill(a, id)) throw new Error('이미 가진 스킬이에요.');
    pay(SHOP.SKILL_PRICE); a.owned.push(id);
  } else if (kind === 'event') {
    // 한정판: 이벤트 기간에만
    const ev = activeEvents().find((e) => e.skins.includes(id));
    if (!ev || !SKINS[id]) throw new Error('지금은 살 수 없는 한정판 스킨이에요.');
    if (hasSkin(a, id)) throw new Error('이미 가진 스킨이에요.');
    pay(skinPrice(id)); a.skins.push(id); a.skinSel[SKINS[id].skill] = id;
  } else if (kind === 'pkg') {
    const p = activePackages().find((x) => x.id === id);
    if (!p) throw new Error('지금 팔지 않는 패키지예요.');
    const sk = (p.skills || []).filter((k) => ALL_SKILLS.includes(k) && !hasSkill(a, k));
    const sn = (p.skins || []).filter((k) => SKINS[k] && !hasSkin(a, k));
    if (!sk.length && !sn.length) throw new Error('패키지에 든 걸 이미 다 가지고 있어요.');
    pay(p.price); a.owned.push(...sk); a.skins.push(...sn);
  } else throw new Error('잘못된 상품이에요.');
  save();
  return { profile: publicProfile(a), shop: shopInfo(key) };
}
function buySkin(key, id) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  upgrade(a, key);
  const sk = SKINS[id];
  if (!sk) throw new Error('없는 스킨이에요.');
  if (sk.limited) throw new Error('한정판 스킨은 이벤트 기간에 상점에서만 살 수 있어요.');
  if (hasSkin(a, id)) throw new Error('이미 가진 스킨이에요.');
  const price = skinPrice(id);
  if (a.gems < price) throw new Error(`보석이 모자라요. 이 스킨은 ${price}개예요.`);
  a.gems -= price; a.skins.push(id);
  a.skinSel[sk.skill] = id;                 // 사면 바로 장착
  save();
  return { profile: publicProfile(a) };
}
function equipSkin(key, skill, id) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  upgrade(a, key);
  if (!id) { delete a.skinSel[skill]; save(); return { profile: publicProfile(a) }; }   // 기본 스킨
  const sk = SKINS[id];
  if (!sk || sk.skill !== skill) throw new Error('이 능력의 스킨이 아니에요.');
  if (!hasSkin(a, id)) throw new Error('아직 사지 않은 스킨이에요.');
  a.skinSel[skill] = id; save();
  return { profile: publicProfile(a) };
}
// 게임에 쓸 장착 스킨 (능력 -> 스킨 id)
function skinsOf(key) {
  const a = key && store.accounts[key];
  if (!a) return {};
  const out = {};
  for (const [skill, id] of Object.entries(a.skinSel || {})) if (SKINS[id] && SKINS[id].skill === skill && hasSkin(a, id)) out[skill] = id;
  return out;
}

function gacha(key, count = 1) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  const n = count === GACHA.TEN ? GACHA.TEN : 1, cost = GACHA.COST * n;
  if (a.gems < cost) throw new Error(`보석이 모자라요. ${n === 1 ? '뽑기는' : `${n}회 뽑기는`} ${cost}개가 필요해요.`);
  a.gems -= cost;
  const total = GACHA.POOL.reduce((m, x) => m + x.weight, 0);
  const results = [];
  for (let k = 0; k < n; k++) {
    let r = crypto.randomInt(total);
    let skill = GACHA.POOL[0].skill;
    for (const x of GACHA.POOL) { if (r < x.weight) { skill = x.skill; break; } r -= x.weight; }
    const dup = hasSkill(a, skill);   // 같은 10회 안에서 두 번째로 나온 것도 중복
    if (dup) a.gems += GACHA.DUP_REFUND;
    else a.owned.push(skill);
    results.push({ skill, dup, refund: dup ? GACHA.DUP_REFUND : 0 });
  }
  save();
  return { ...results[0], results, profile: publicProfile(a) };
}

// ---------- 관리자 ----------
function isAdmin(key) {
  const a = store.accounts[key];
  return !!(a && a.admin);
}
function adminList(q) {
  const query = cleanNick(q).toLowerCase();
  return Object.entries(store.accounts)
    .filter(([k]) => !query || k.includes(query))
    .sort((x, y) => (y[1].createdAt || 0) - (x[1].createdAt || 0))
    .slice(0, 50)
    .map(([, a]) => publicProfile(a));
}
function adminUpdate(targetNick, { gems, owned, skins }) {
  const key = keyOf(targetNick);
  const a = store.accounts[key];
  if (!a) throw new Error('그런 닉네임의 계정이 없어요.');
  if (gems !== undefined) {
    const n = Math.floor(Number(gems));
    if (!Number.isFinite(n) || n < 0 || n > 1000000) throw new Error('보석은 0 ~ 1,000,000 사이 숫자로 써 주세요.');
    a.gems = n;
  }
  if (owned !== undefined) {
    if (!Array.isArray(owned)) throw new Error('스킬 목록이 잘못됐어요.');
    const set = new Set(owned.filter((k) => ALL_SKILLS.includes(k)));
    for (const b of BASE_SKILLS) set.add(b);       // 기본 스킬은 항상 유지
    a.owned = ALL_SKILLS.filter((k) => set.has(k));
    if (!hasSkill(a, a.skill)) a.skill = 'slow';
  }
  if (skins !== undefined) {
    // 스킨 지급·회수: 없는 스킨 id는 버리고, 회수한 스킨을 장착 중이었으면 장착도 해제
    if (!Array.isArray(skins)) throw new Error('스킨 목록이 잘못됐어요.');
    const set = new Set(skins.filter((id) => SKINS[id]));
    a.skins = Object.keys(SKINS).filter((id) => set.has(id));
    for (const [sk, id] of Object.entries(a.skinSel || {})) if (!set.has(id)) delete a.skinSel[sk];
  }
  save();
  return publicProfile(a);
}

// ---------- 임시 비밀번호 (관리자가 발급, 다음 로그인 때 본인이 바꿈) ----------
// 원문은 저장하지 않음: 임시 비밀번호도 해시로만 저장하고, 발급 직후 한 번만 관리자 화면에 보여 줌
async function adminTempPw(targetNick) {
  const key = keyOf(String(targetNick || ''));
  const a = store.accounts[key];
  if (!a) throw new Error('그런 닉네임의 계정이 없어요.');
  const tempPw = crypto.randomBytes(9).toString('base64url');   // 12자
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(tempPw, salt);
  a.salt = salt.toString('hex');
  a.hash = hash.toString('hex');
  a.mustChangePw = true;
  // 기존 로그인은 모두 끊음
  for (const [tk, s] of Object.entries(store.sessions)) if (s.key === key) delete store.sessions[tk];
  save();
  return { nick: a.nick, tempPw };
}
// 본인이 새 비밀번호를 정함 (임시 비밀번호를 바꾼 뒤 플래그 해제)
async function changePw(key, pw) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  if (typeof pw !== 'string' || pw.length < 4 || pw.length > 64) throw new Error('비밀번호는 4~64자로 써 주세요.');
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(pw, salt);
  a.salt = salt.toString('hex');
  a.hash = hash.toString('hex');
  delete a.mustChangePw;
  save();
  return { ok: true, profile: publicProfile(a) };
}
// ---------- 닉네임 경고 ----------
function adminWarn(targetNick, on, reason) {
  const a = store.accounts[keyOf(targetNick)];
  if (!a) throw new Error('그런 닉네임의 계정이 없어요.');
  if (on) a.nickWarn = String(reason || '').normalize('NFC').replace(/[<>&"'\u0000-\u001f]/g, '').trim().slice(0, 40) || '부적절한 닉네임';
  else delete a.nickWarn;
  save();
  return publicProfile(a);
}
// 경고받은 사람이 닉네임을 바꿈 (계정 키·로그인 세션도 같이 옮김)
function changeNick(key, newRaw) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  if (!a.nickWarn) throw new Error('닉네임 경고를 받은 경우에만 바꿀 수 있어요.');
  const nick = cleanNick(newRaw);
  if (nick.length < 2) throw new Error('닉네임은 2~12자로 써 주세요.');
  const nk = keyOf(nick);
  if (nk === key) throw new Error('지금과 다른 닉네임을 써 주세요.');
  if (store.accounts[nk]) throw new Error('이미 있는 닉네임이에요. 다른 닉네임을 써 주세요.');
  delete store.accounts[key];
  a.nick = nick; delete a.nickWarn;
  store.accounts[nk] = a;
  for (const s of Object.values(store.sessions)) if (s.key === key) s.key = nk;
  save();
  return { key: nk, profile: publicProfile(a) };
}

function ranking(limit = 10) {
  return Object.values(store.accounts)
    .filter((a) => a.games > 0)
    .sort((x, y) => y.wins - x.wins || y.kos - x.kos || x.games - y.games)
    .slice(0, limit)
    .map((a) => ({ nick: a.nick, wins: a.wins, games: a.games, kos: a.kos }));
}

// 오래된 로그인 정보 정리
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [t, s] of Object.entries(store.sessions)) if (s.exp < now) { delete store.sessions[t]; changed = true; }
  if (changed) save();
}, 3600000).unref();

// ---------------- 버그 제보 ----------------
// 누구나(게스트도) 보낼 수 있음. 30초에 1번 · 하루 20번까지. 최근 300개만 보관. 관리자 화면에서 확인·처리·삭제
const REPORT_KEEP = 300, reportRate = new Map();
function addReport({ key, name, text, ctx, who }) {
  text = String(text || '').replace(/\r/g, '').trim();
  if (text.length < 5) return { error: '5글자 이상 써 주세요.' };
  if (text.length > 1000) return { error: '1000글자까지 쓸 수 있어요.' };
  const now = Date.now(), hist = (reportRate.get(who) || []).filter((t) => now - t < 86400000);
  if (hist.length && now - hist[hist.length - 1] < 30000) return { error: `${Math.ceil((30000 - (now - hist[hist.length - 1])) / 1000)}초 뒤에 다시 보낼 수 있어요.` };
  if (hist.length >= 20) return { error: '오늘은 제보를 더 보낼 수 없어요. 내일 다시 보내 주세요.' };
  hist.push(now); reportRate.set(who, hist);
  const c = ctx && typeof ctx === 'object' ? ctx : {};
  const clean = {};
  for (const k of ['room', 'map', 'mode', 'skill', 'phase', 'screen', 'ua']) if (c[k] != null) clean[k] = String(c[k]).slice(0, k === 'ua' ? 160 : 40);
  const r = { id: now.toString(36) + Math.random().toString(36).slice(2, 6), at: now, nick: key ? nickOf(key) : null, guest: key ? null : String(name || '게스트').slice(0, 12), text, ctx: clean, done: false };
  store.reports.unshift(r);
  if (store.reports.length > REPORT_KEEP) store.reports.length = REPORT_KEEP;
  save();
  return { ok: true, report: r };
}
function adminReports() { return store.reports; }
function adminReportSet(id, { done, del }) {
  const i = store.reports.findIndex((r) => r.id === id);
  if (i < 0) return { error: '이미 지워진 제보예요.' };
  if (del) store.reports.splice(i, 1); else store.reports[i].done = !!done;
  save();
  return { ok: true };
}
module.exports = {
  adminTempPw, changePw, addReport, adminReports, adminReportSet, isAdminKey: (k) => isAdmin(k),
  onShutdown, onecardRecord, gemsOf, takeGems, giveGems, pokerStat, onecardRanking, pokerRanking,
  init, storage: () => storageName, signup, login, logout, fromToken, profileOf, nickOf, isTaken,
  keyOf, owns, ownedOf, chessRecord, chessBotRecord, chessRanking, setSkill, record, buySkin, equipSkin, skinsOf, adminWarn, changeNick, ranking, cleanNick, gacha, buySkill, shopInfo, shopDaily, shopBuy, todayShop, patchSeen, patchClaim, isAdmin, adminList, adminUpdate,
  GEMS, GACHA, BASE_SKILLS, ALL_SKILLS,
};
