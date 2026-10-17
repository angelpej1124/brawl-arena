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
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(flush, 500);
}
function flush() {
  clearTimeout(saveTimer); saveTimer = null;
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
async function shutdown() {
  await flush();
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

function publicProfile(a) {
  return { nick: a.nick, wins: a.wins, games: a.games, kos: a.kos, skill: a.skill };
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

function setSkill(key, skill) {
  const a = store.accounts[key];
  if (a && a.skill !== skill) { a.skill = skill; save(); }
}

function record(key, { win, kos }) {
  const a = store.accounts[key];
  if (!a) return null;
  a.games += 1;
  if (win) a.wins += 1;
  a.kos += Math.max(0, kos | 0);
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

module.exports = { init, storage: () => storageName, signup, login, logout, fromToken, profileOf, nickOf, isTaken, setSkill, record, ranking, cleanNick };
