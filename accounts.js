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
async function shutdown() {
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
const ALL_SKILLS = ['slow', 'blink', 'stealth', 'clone', 'swap', 'fly', 'explode', 'freeze', 'rock', 'magnet', 'empower', 'parasite', 'quake', 'giant', 'rubber', 'engine', 'sword', 'blackflash', 'lightning', 'undying', 'hulk', 'fire', 'ice', 'turret', 'error', 'sun'];
const BASE_SKILLS = ['slow', 'blink'];          // 게스트·새 계정 기본 스킬
const GEMS = {
  START: 100,          // 가입 선물
  PLAY: 25,           // 사람 2명 이상인 판에 참가
  PLAY_BOT: 10,        // 봇이랑만 한 판
  WIN: 40,            // 사람 2명 이상인 판에서 우승
  KILL: 12,            // 사람을 장외로 보냄
  KILL_BOT: 5,        // 봇을 장외로 보냄
};
const GACHA = {
  COST: 100,          // 뽑기 1회 가격
  DUP_REFUND: 40,     // 이미 가진 스킬이 나오면 돌려주는 보석
  // 뽑기 확률 (가중치)
  POOL: [
    // 새 스킬 24개는 각 4%, 기본 스킬(둔화·점멸)은 각 2%  (가중치 합 100)
    ...['stealth', 'clone', 'swap', 'fly', 'explode', 'freeze', 'rock', 'magnet', 'empower', 'parasite', 'quake', 'giant', 'rubber', 'engine',
      'sword', 'blackflash', 'lightning', 'undying', 'hulk', 'fire', 'ice', 'turret', 'error', 'sun']
      .map((skill) => ({ skill, weight: 4 })),
    { skill: 'slow', weight: 2 },
    { skill: 'blink', weight: 2 },
  ],
};
// 관리자 닉네임 (환경 변수 ADMIN_NICKS, 쉼표로 여러 명). 이미 가입된 계정에만 적용돼요.
const ADMIN_NICKS = String(process.env.ADMIN_NICKS || '').split(',').map((n) => n.trim().toLowerCase()).filter(Boolean);

// 예전 계정에 새 항목 채워 넣기
function upgrade(a, key) {
  let changed = false;
  if (!Number.isFinite(a.gems)) { a.gems = GEMS.START; changed = true; }
  if (!Array.isArray(a.owned)) { a.owned = [...BASE_SKILLS]; changed = true; }
  for (const b of BASE_SKILLS) if (!a.owned.includes(b)) { a.owned.push(b); changed = true; }
  a.owned = a.owned.filter((k) => ALL_SKILLS.includes(k));
  if (!a.owned.includes(a.skill)) { a.skill = 'slow'; changed = true; }
  const shouldAdmin = ADMIN_NICKS.includes(key);
  if (shouldAdmin && !a.admin) { a.admin = true; changed = true; }
  return changed;
}
function upgradeAll() {
  let changed = false;
  for (const [key, a] of Object.entries(store.accounts)) if (upgrade(a, key)) changed = true;
  if (changed) save();
}

function publicProfile(a) {
  return {
    nick: a.nick, wins: a.wins, games: a.games, kos: a.kos, skill: a.skill,
    gems: a.gems, owned: [...a.owned], admin: !!a.admin,
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
  };
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
  return a ? [...a.owned] : [...BASE_SKILLS];
}
function owns(key, skill) {
  const a = store.accounts[key];
  return !!a && a.owned.includes(skill);
}
function setSkill(key, skill) {
  const a = store.accounts[key];
  if (a && a.skill !== skill && a.owned.includes(skill)) { a.skill = skill; save(); }
}

// 판이 끝날 때 서버가 호출 (counted = 사람 2명 이상인 판이라 전적에 기록)
function record(key, { counted, win, kills, botKills }) {
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
  a.gems += gems;
  save();
  return { profile: publicProfile(a), gained: gems };
}

function gacha(key) {
  const a = store.accounts[key];
  if (!a) throw new Error('로그인이 필요해요.');
  if (a.gems < GACHA.COST) throw new Error(`보석이 모자라요. 뽑기는 ${GACHA.COST}개가 필요해요.`);
  a.gems -= GACHA.COST;
  const total = GACHA.POOL.reduce((n, x) => n + x.weight, 0);
  let r = crypto.randomInt(total);
  let skill = GACHA.POOL[0].skill;
  for (const x of GACHA.POOL) { if (r < x.weight) { skill = x.skill; break; } r -= x.weight; }
  const dup = a.owned.includes(skill);
  if (dup) a.gems += GACHA.DUP_REFUND;
  else a.owned.push(skill);
  save();
  return { skill, dup, refund: dup ? GACHA.DUP_REFUND : 0, profile: publicProfile(a) };
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
function adminUpdate(targetNick, { gems, owned }) {
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
    if (!a.owned.includes(a.skill)) a.skill = 'slow';
  }
  save();
  return publicProfile(a);
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

module.exports = {
  init, storage: () => storageName, signup, login, logout, fromToken, profileOf, nickOf, isTaken,
  owns, ownedOf, setSkill, record, ranking, cleanNick, gacha, isAdmin, adminList, adminUpdate,
  GEMS, GACHA, BASE_SKILLS, ALL_SKILLS,
};
