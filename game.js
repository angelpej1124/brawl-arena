// =====================================================================
//  게임 규칙 — 서버가 모든 판정을 합니다 (해킹 방지)
//  CONFIG / ATTACKS / SKILLS 숫자를 바꾸면 밸런스가 바뀌어요.
// =====================================================================
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

// 스킬 — 숫자를 바꿔서 밸런스를 조절하세요 (cd = 쿨타임 초)
const SKILLS = {
  slow:     { name: '둔화', cd: 6, radius: 320, duration: 7, moveMul: 0.5, attackMul: 0.5 },
  blink:    { name: '점멸', cd: 9, distance: 230 },
  stealth:  { name: '은신', cd: 12, duration: 5 },
  clone:    { name: '분신', cd: 10, hits: 5 },
  swap:     { name: '전환', cd: 19, heavyLock: 1 },                       // 강공격 맞고 1초 동안은 못 씀
  fly:      { name: '비행', cd: 15, duration: 5, up: 380, down: 260, hitDrop: 0.6 },
  explode:  { name: '폭파', cd: 10, radius: 270, power: 900, damage: 8, stun: 0.5, smoke: 3, smokeR: 270 },
  freeze:   { name: '정지', cd: 7, duration: 1 },
  rock:     { name: '바위', cd: 10, duration: 6, moveMul: 0.32, jumpMul: 0.7 },
  magnet:   { name: '자석', cd: 9, cd2: 9, radius: 330, power: 720 },     // Q 끌어당김, E 밀어냄
  empower:  { name: '강화', charge: 8, duration: 6, kbMul: 0.35, reachMul: 1.3, speedMul: 1.35, jumpMul: 1.2 },
  parasite: { name: '기생', hitsNeeded: 3, duration: 5 },
  quake:    { name: '지진', cd: 12, duration: 3 },                        // 시전자 빼고 모두의 화면이 흔들림
  giant:    { name: '거인', cd: 14, duration: 9, size: 2, kbMul: 0.8, speedMul: 0.85, reachMul: 1.6 },
  rubber:   { name: '고무', cd: 13, duration: 7, reachMul: 2, jumpMul: 1.25 },
  engine:   { name: '엔진', cd: 12, duration: 6, speedMul: 1.6, kbPerSpeed: 0.8, kbMax: 2.2 },
  // 검사: 공격이 검으로 바뀜 (사거리 1.25배). 약공격은 앞으로 돌진하며 베기, 강공격은 주변 부채꼴 베기, Q는 참격 발사
  sword:    { name: '검사', cd: 12, reachMul: 1.25, lunge: 620, fanR: 125, slashSpeed: 950, slashLife: 0.65, slashDmg: 9, slashKB: 380, slashGrowth: 12 },
  // 흑섬: Q 자체는 이펙트만. 공격이 맞는 순간과 같은 타이밍(±window초)이면 넉백 강화
  blackflash: { name: '흑섬', cd: 0, window: 0.1, heavyKbMul: 1.45, stun: 0.7 },
  lightning: { name: '번개', cd: 13, radius: 480, count: 3, damage: 10, stun: 3 },
  undying:  { name: '불사', lives: 5 },                                   // 목숨 5개 (패시브)
  // 헐크: 퍼센트(맞은 정도)가 높을수록 커지고 강해짐 (패시브). maxAt% 에서 최대
  hulk:     { name: '헐크', maxAt: 150, size: 0.9, reach: 0.6, power: 1.0, slow: 0.3, tough: 0.45, grow: 0.8 },
  // 화염: 공격에 불이 붙어 맞은 뒤 burnHits번 더 살짝 밀림. Q는 불태우며 돌진 (맞으면 dashBurn번)
  fire:     { name: '화염', cd: 9, burnHits: 2, dashBurn: 4, burnEvery: 0.4, burnKB: 170, burnDmg: 1,
              dashSpeed: 950, dashTime: 0.32, dashDmg: 8, dashKB: 420, dashGrowth: 10 },
  // 얼음: 때리면 상대 얼음 게이지가 참. 100이 되면 2초 얼어붙음 (얼어도 공격은 맞음). Q는 5초 눈보라
  ice:      { name: '얼음', cd: 12, blizzard: 4, fillLight: 20, fillHeavy: 34, blizRate: 24, freeze: 2, decay: 6 },
  // 터렛: 최대 3개. 가까운 적에게 총알 발사, 4번 맞으면 부서짐
  // 에러: 나를 뺀 모두의 화면이 끊기고 조작이 제멋대로 (5초)
  error:    { name: '에러', cd: 12, duration: 5 },             // 랜덤한 적 1명
  // 태양: 6초간 빨라지고, 평타에 불이 붙고(화염처럼 2번 더 밀림), 넉백이 세짐
  sun:      { name: '태양', cd: 11, duration: 6, speedMul: 1.35, kbMul: 1.3, burnHits: 2 },
  // 바람: 공격 넉백 1.3배. Q는 앞으로 나아가며 휩쓸어 가는 소용돌이
  wind:     { name: '바람', cd: 10, kbMul: 1.3, speed: 520, life: 1.6, w: 70, h: 170, dmg: 5, throwKB: 720 },
  // 궁수: 강공격을 누르고 있으면 시위를 당김 (full초면 최대), 놓으면 발사. Q는 다음 화살을 유도 화살로
  archer:   { name: '궁수', cd: 13, full: 1, minSpeed: 650, maxSpeed: 1400, gravity: 520, homingSpeed: 760, homingLife: 3, turn: 7 },
  // 시간: 모든 것을 10초 전으로 (시간 스킬 쿨타임은 제외)
  time:     { name: '시간', cd: 20 },                                   // 첫 Q 저장, 두 번째 Q 되돌림 → 쿨 20
  // 콤보: 때릴 때마다 스택. Q로 스택만큼 강한 스매시 (범위도 커짐)
  combo:    { name: '콤보', maxStack: 30, baseR: 90, perR: 16, maxR: 520 },
  // 반사: Q를 누르고 window초 안에 들어온 공격을 되돌려 보냄
  reflect:  { name: '반사', cd: 3, window: 0.22 },
  // 반전: 나를 뺀 상대의 절반(올림)이 7초간 좌우 키가 반대로
  invert:   { name: '반전', cd: 13, duration: 7 },
  // 원자: 때릴 때마다 주위를 도는 전자 +1 (최대 5). 3초 안 때리면 1초에 1개씩 사라짐. 전자에 닿아야만 피해
  atom:     { name: '원자', cd: 13, max: 5, radius: 62, spin: 4, boost: 5, decayAfter: 3, decayEvery: 1, dmg: 3, baseKB: 170, growthKB: 4, hitEvery: 0.5 },
  // 지뢰: 최대 10개, 밟으면 폭발 (주인·팀원은 안 터짐)
  mine:     { name: '지뢰', cd: 8, max: 10, arm: 0.6, radius: 110, dmg: 10, power: 620 },
  turret:   { name: '터렛', cd: 12, max: 3, hp: 4, range: 560, fireEvery: 0.9, bulletSpeed: 820, bulletLife: 0.9, dmg: 3, baseKB: 210, growthKB: 5 },
};
const SKILL_IDS = Object.keys(SKILLS);

const MAPS = require('./public/maps.js');   // 맵 목록 (판마다 랜덤)
const COLORS = MAPS.COLORS.map((c) => c.hex);   // 빨강 파랑 노랑 초록 보라 검정 흰색 주황 핑크
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 바둑이', '봇 민수', '봇 지수'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const EMPTY_INPUT = () => ({ l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, s: 0, e: 0, x: 0 });
// s = Q키, e = E키, x = R키
const cleanInput = (i) => ({
  l: i.l ? 1 : 0, r: i.r ? 1 : 0, u: i.u ? 1 : 0, d: i.d ? 1 : 0,
  a: i.a ? 1 : 0, h: i.h ? 1 : 0, s: i.s ? 1 : 0, e: i.e ? 1 : 0, x: i.x ? 1 : 0,
});
// 팀 (팀 모드)
const TEAMS = [null, { name: '빨강팀', color: '#ff4d4d' }, { name: '파랑팀', color: '#3f8cff' }, { name: '초록팀', color: '#3ccf6e' }, { name: '노랑팀', color: '#ffd23f' }];
// 시간 되돌리기로 되돌리는 값들
// 시간 되돌리기 때 그대로 두는 것 (나머지 상태는 전부 되돌림)
const TIME_SKIP = new Set(['id', 'name', 'color', 'bot', 'dummy', 'team', 'skins', 'skill', 'skill2', 'wins', 'ready', 'mapMid',
  'input', 'prevInput', 'rawInput', 'attack', 'errHold', 'kos', 'botKos']);
// 스킨: 지금 쓰는 능력에 장착된 스킨만
const SKIN_DB = require('./public/skins.js').SKINS;
const activeSkins = (p) => [p.skill, p.skill2].map((k) => k && p.skins && p.skins[k]).filter(Boolean);
const skinOn = (p, id) => activeSkins(p).includes(id);
const iceSkin = (p) => (skinOn(p, 'sand') ? 'sand' : skinOn(p, 'aurora') ? 'aurora' : skinOn(p, 'shadowice') ? 'shadow' : null);
const skinFx = (p) => { for (const id of activeSkins(p)) if (SKIN_DB[id] && SKIN_DB[id].fx) return SKIN_DB[id].fx; return undefined; };
// 더블 모드에서 같이 쓸 수 없는 조합 (둘 다 무기를 바꾸는 스킬)
const CONFLICTS = [['sword', 'archer']];
// 빗면 { x1, y1, x2, y2 }: 윗면이 기울어진 땅 (아래로는 큰 쪽 y까지 꽉 참)
const slopeY = (sl, x) => sl.y1 + ((sl.y2 - sl.y1) * (x - sl.x1)) / (sl.x2 - sl.x1);
const slopeBase = (sl) => Math.max(sl.y1, sl.y2);
const conflicts = (a, b) => CONFLICTS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
// 이 스킬을 가지고 있는지 (더블 모드면 두 번째 스킬도)
const has = (p, k) => !!p && (p.skill === k || p.skill2 === k);
// 키 배치: 보통 Q=스킬1, E=스킬2. 자석이 있으면 자석이 Q·E를 쓰고 나머지 스킬은 R
function slotsOf(p) {
  if (!p.skill2) return { s: p.skill, e: p.skill === 'magnet' ? 'magnet2' : null, x: null };
  if (p.skill === 'magnet' || p.skill2 === 'magnet') return { s: 'magnet', e: 'magnet2', x: p.skill === 'magnet' ? p.skill2 : p.skill };
  return { s: p.skill, e: p.skill2, x: null };
}
const validSkill = (s) => (Object.prototype.hasOwnProperty.call(SKILLS, s) ? s : 'slow');
const r0 = Math.round;
// 몸 크기 (거인이면 2배)
const sizeOf = (p) => (!p ? 1 : p.giantT > 0 ? SKILLS.giant.size : p.hulkS > 1 ? p.hulkS : 1);
// 헐크 강해진 정도 0~1 (지금 몸 크기 기준이라 서서히 변함)
const hulkF = (p) => (p && has(p, 'hulk') && p.hulkS > 1 ? (p.hulkS - 1) / SKILLS.hulk.size : 0);
const bw = (p) => CONFIG.PLAYER_W * sizeOf(p);
const bh = (p) => CONFIG.PLAYER_H * sizeOf(p);

class Player {
  constructor(id, name, color, bot, skill) {
    this.id = id; this.name = name; this.color = color; this.bot = !!bot; this.skill = validSkill(skill);
    this.skill2 = null; this.team = 1;
    this.skins = {};              // 장착 스킨 (능력 -> 스킨 id), 보이는 것만 바뀜
    this.input = EMPTY_INPUT(); this.prevInput = EMPTY_INPUT();
    this.inMatch = false; this.wins = 0; this.stocks = 0; this.kos = 0; this.botKos = 0;
    this.hulkS = 1;
    this.reset(0, 0); this.alive = false;
    this.botCd = 0;
  }
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.facing = x < (this.mapMid || 640) ? 1 : -1;
    this.grounded = false; this.jumpsLeft = CONFIG.EXTRA_JUMPS;
    this.damage = 0; this.hitstun = 0; this.invincible = 0;
    this.attack = null; this.dropThrough = 0; this.alive = true;
    this.lastHitBy = null; this.lastHitAt = 0; this.heavyHitAt = -999;
    this.skillCd = 0; this.skillCd2 = 0; this.skillCdB = 0;
    this.slow = 0; this.stealth = 0; this.frozen = 0;
    this.flyT = 0; this.flyDownT = 0; this.rockT = 0; this.buffT = 0;
    this.giantT = 0; this.rubberT = 0; this.engineT = 0;
    this.stunT = 0; this.quakeT = 0; this.bfAt = -999;
    this.burnN = 0; this.burnT = 0; this.burnDir = 1; this.burnBy = null; this.fdashT = 0; this.fdashHit = null;
    this.iceG = 0; this.iceT = 0; this.iceHitAt = -999;
    this.errT = 0; this.sunT = 0; this.parryT = 0; this.invT = 0;
    this.stillT = 0; this.charged = false;
    this.combo = 0;               // 콤보 스택 (죽으면 초기화)
    this.electrons = 0; this.eLast = -999; this.eDecayT = 0; this.ePhase = 0; this.eBoostT = 0; this.eHit = {};   // 원자
    this.drawT = 0;               // 궁수: 시위 당긴 정도 (0이면 안 당김)
    this.parHits = {};            // 기생: 내가 때린 횟수 (상대 id -> 횟수)
    this.parHost = null;          // 기생 중인 숙주 id
    this.parT = 0; this.parOrigin = null;
    this.inside = false;          // 기생 중이라 몸이 사라진 상태
    this.controller = null;       // 나를 조종 중인 기생자 id
  }
}

class Sim {
  constructor() {
    this.players = new Map();
    this.clones = new Map(); // 주인 id -> 분신
    this.smokes = [];        // 폭파 연기
    this.slashes = [];       // 검사 참격 (날아가는 공격)
    this.turrets = [];       // 터렛
    this.bullets = [];       // 터렛 총알
    this.blizzards = [];     // 얼음 눈보라 { by, t }
    this.arrows = [];        // 궁수 화살
    this.mines = [];         // 지뢰
    this.winds = [];         // 바람 소용돌이
    this.timeSaves = new Map(); // 시간: 저장해 둔 순간 (시전자 id -> 상태)
    this.stage = MAPS[Math.floor(Math.random() * MAPS.length)];
    this.phase = 'waiting'; this.timer = 0; this.winner = null; this.winnerId = null;
    this.teamMode = false;   // 팀 모드 (같은 팀끼리는 공격·스킬이 안 통함)
    this.doubleMode = false; // 더블 모드 (스킬 2개)
    this.winTeam = 0;
    this.tickCount = 0; this.time = 0; this.evSeq = 0; this.recent = [];
    this.onEvent = () => {};
  }
  list() { return [...this.players.values()]; }
  // 주인 id (분신·터렛·총알은 주인을 따라감)
  ownerOf(o) { return o.ownerId || o.owner || o.id; }
  teamOf(o) { const p = this.players.get(this.ownerOf(o)); return p ? p.team : 0; }
  // a 입장에서 b가 적인지: 자기 자신·자기 분신/터렛은 적 아님, 팀 모드면 같은 팀도 적 아님
  foe(a, b) {
    if (this.ownerOf(a) === this.ownerOf(b)) return false;
    return !this.teamMode || this.teamOf(a) !== this.teamOf(b);
  }
  // ---------------- 방 모드 (방장이 설정) ----------------
  setMode(team, dbl) {
    if (this.phase !== 'waiting') return '모드는 게임 시작 전에만 바꿀 수 있어요.';
    if (team && !this.teamMode) this.list().forEach((p, i) => { p.team = (i % 2) + 1; });
    this.teamMode = !!team;
    if (!!dbl !== this.doubleMode) {
      this.doubleMode = !!dbl;
      for (const p of this.list()) {
        p.skill2 = null; p.skillCdB = 0;
        if (this.doubleMode && p.bot) p.skill2 = this.randomOther(p.skill);
      }
    }
    return null;
  }
  randomOther(k) { const c = SKILL_IDS.filter((x) => x !== k && !conflicts(x, k)); return c[Math.floor(Math.random() * c.length)]; }
  setTeam(id, team) {
    const p = this.players.get(id);
    if (!p || this.phase !== 'waiting' || !this.teamMode) return;
    team = team | 0;
    if (team >= 1 && team <= 4) p.team = team;
  }
  ev(e) {
    e.i = ++this.evSeq;
    this.recent.push(e);
    if (this.recent.length > 12) this.recent.shift();
    this.onEvent(e);
  }
  deny(p, msg) { if (!p.bot) this.ev({ k: 'deny', only: p.id, msg }); }
  freeColor() {
    const used = new Set(this.list().map((p) => p.color));
    return COLORS.find((c) => !used.has(c)) || COLORS[this.players.size % COLORS.length];
  }
  addPlayer(id, name, bot, skill) {
    if (this.players.has(id) || this.players.size >= CONFIG.MAX_PLAYERS) return null;
    const p = new Player(id, name, this.freeColor(), bot, skill);
    p.ready = !!bot; p.mapMid = this.stage.width / 2;
    if (this.teamMode) {
      // 사람이 가장 적은 팀에 넣음
      const cnt = [0, 0, 0, 0, 0];
      for (const o of this.players.values()) cnt[o.team]++;
      p.team = cnt[1] <= cnt[2] ? 1 : 2;
    }
    if (this.doubleMode && bot) p.skill2 = this.randomOther(p.skill);
    this.players.set(id, p);
    this.ev({ k: 'join', n: name });
    return p;
  }
  // ---------------- 대기실: 준비 · 색 · 스킬 ----------------
  setReady(id, on) {
    const p = this.players.get(id);
    if (!p || this.phase !== 'waiting') return;
    p.ready = !!on;
  }
  setColor(id, hex) {
    const p = this.players.get(id);
    if (!p) return '없는 플레이어예요.';
    if (this.phase !== 'waiting') return '색은 게임 시작 전에만 바꿀 수 있어요.';
    if (!COLORS.includes(hex)) return '고를 수 없는 색이에요.';
    if (this.list().some((o) => o !== p && o.color === hex)) return '다른 사람이 쓰고 있는 색이에요.';
    p.color = hex;
    return null;
  }
  setSkill(id, skill) {
    const p = this.players.get(id);
    if (!p) return '없는 플레이어예요.';
    if (this.phase !== 'waiting') return '스킬은 게임 시작 전에만 바꿀 수 있어요.';
    if (p.parHost) this.endParasite(p, true);
    skill = validSkill(skill);
    if (p.skill2 && p.skill2 !== skill && conflicts(skill, p.skill2)) return '검사와 궁수는 같이 쓸 수 없어요.';
    if (p.skill2 === skill) p.skill2 = p.skill;   // 두 스킬을 서로 바꾼 것
    p.skill = skill;
    p.skillCd = 0; p.skillCdB = 0; p.skillCd2 = 0; p.charged = false; p.stillT = 0; p.parHits = {};
    p.flyT = 0; p.rockT = 0; p.buffT = 0; p.stealth = 0; p.giantT = 0; p.rubberT = 0; p.engineT = 0; p.stunT = 0; p.hulkS = 1; p.sunT = 0;
    this.clones.delete(id);
    this.removeTurrets(id);
    return null;
  }
  setSkill2(id, skill) {
    const p = this.players.get(id);
    if (!p) return '없는 플레이어예요.';
    if (this.phase !== 'waiting') return '스킬은 게임 시작 전에만 바꿀 수 있어요.';
    if (!this.doubleMode) return '더블 모드에서만 두 번째 스킬을 고를 수 있어요.';
    skill = validSkill(skill);
    if (skill === p.skill) return '첫 번째 스킬과 다른 스킬을 골라 주세요.';
    if (conflicts(skill, p.skill)) return '검사와 궁수는 같이 쓸 수 없어요.';
    if (p.parHost) this.endParasite(p, true);
    p.skill2 = skill; p.skillCd = 0; p.skillCdB = 0; p.skillCd2 = 0; p.charged = false; p.stillT = 0; p.parHits = {};
    p.flyT = 0; p.rockT = 0; p.buffT = 0; p.stealth = 0; p.giantT = 0; p.rubberT = 0; p.engineT = 0; p.sunT = 0;
    this.clones.delete(id); this.removeTurrets(id);
    return null;
  }
  // 방장이 시작 가능한지: 2명 이상(봇 포함), 방장 빼고 사람은 모두 준비
  startStatus(hostId) {
    const humans = this.list().filter((p) => !p.bot && p.id !== hostId);
    const ready = humans.filter((p) => p.ready).length;
    const teams = new Set(this.list().map((p) => p.team)).size;
    const teamsOk = !this.teamMode || teams >= 2;
    const doubleOk = !this.doubleMode || this.list().every((p) => p.skill2);
    return { ok: this.phase === 'waiting' && this.players.size >= 2 && ready === humans.length && teamsOk && doubleOk, ready, need: humans.length, count: this.players.size, teamsOk, doubleOk };
  }
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.parHost) this.endParasite(p, true);
    if (p.controller) { const c = this.players.get(p.controller); if (c) this.endParasite(c, true); }
    this.players.delete(id);
    this.clones.delete(id);
    this.removeTurrets(id);
    this.ev({ k: 'leave', n: p.name });
    if (this.phase === 'playing') this.checkWinner();
    if (this.phase === 'countdown' && this.players.size < 2) this.phase = 'waiting';
  }
  // 방장이 '게임 시작'을 누르면 호출
  checkStart() {
    if (this.players.size >= 2) {
      this.phase = 'countdown'; this.timer = CONFIG.COUNTDOWN;
      this.pickMap();
    }
  }
  // 판마다 다른 맵을 랜덤으로 (직전 맵은 제외)
  pickMap() {
    const others = MAPS.filter((m) => m !== this.stage);
    this.stage = others[Math.floor(Math.random() * others.length)] || MAPS[0];
    this.clearField();
    this.list().forEach((p, i) => {
      p.mapMid = this.stage.width / 2; p.hulkS = 1;
      if (p.parHost) this.endParasite(p, true);
      const sp = this.stage.spawns[i % this.stage.spawns.length];
      const keep = { wins: p.wins, inMatch: p.inMatch, stocks: p.stocks };
      p.reset(sp.x, sp.y); Object.assign(p, keep);
      p.invincible = 0.5;
    });
    this.ev({ k: 'map', n: this.stage.name });
  }
  clearField() {
    this.clones.clear(); this.smokes = []; this.slashes = [];
    this.turrets = []; this.bullets = []; this.blizzards = []; this.arrows = []; this.winds = []; this.timeSaves = new Map(); this.mines = [];
  }
  removeTurrets(id) {
    this.turrets = this.turrets.filter((t) => t.owner !== id);
    this.bullets = this.bullets.filter((b) => b.owner !== id);
    this.mines = this.mines.filter((m) => m.owner !== id);
  }
  // x 위치 아래(또는 같은 높이)에 있는 가장 가까운 땅/발판
  surfaceBelow(x, y) {
    let best = null;
    for (const s of [...this.stage.solids, ...this.stage.platforms]) {
      if (x >= s.x - 4 && x <= s.x + s.w + 4 && s.y >= y - 4 && (!best || s.y < best.y)) best = s;
    }
    return best;
  }
  nearestSurfaceX(x) {
    let best = null, bd = 1e9;
    for (const s of [...this.stage.solids, ...this.stage.platforms]) {
      const cx = clamp(x, s.x + 30, s.x + s.w - 30);
      const d = Math.abs(cx - x) + (this.stage.solids.includes(s) ? 0 : 40);
      if (d < bd) { bd = d; best = cx; }
    }
    return best == null ? this.stage.width / 2 : best;
  }
  startRound() {
    this.phase = 'playing'; this.winner = null; this.winnerId = null; this.winTeam = 0;
    this.clearField();
    this.list().forEach((p, i) => {
      const s = this.stage.spawns[i % this.stage.spawns.length];
      p.mapMid = this.stage.width / 2; p.hulkS = 1;
      p.reset(s.x, s.y); p.stocks = has(p, 'undying') ? SKILLS.undying.lives : CONFIG.STOCKS; p.kos = 0; p.botKos = 0; p.inMatch = true;
    });
    this.ev({ k: 'start' });
  }
  checkWinner() {
    const alive = this.list().filter((p) => p.inMatch && p.alive);
    if (this.teamMode) {
      const teams = new Set(alive.map((p) => p.team));
      if (teams.size > 1) return;
      const t = alive.length ? alive[0].team : 0;
      this.phase = 'ended'; this.timer = CONFIG.RESULT_TIME;
      this.winTeam = t; this.winnerId = null;
      this.winner = t ? TEAMS[t].name : null;
      for (const p of this.list()) if (t && p.inMatch && p.team === t) p.wins++;
      this.ev({ k: 'win', n: this.winner });
      return;
    }
    if (alive.length <= 1) {
      this.phase = 'ended'; this.timer = CONFIG.RESULT_TIME;
      this.winner = alive[0] ? alive[0].name : null;
      this.winnerId = alive[0] ? alive[0].id : null;
      if (alive[0]) alive[0].wins++;
      this.ev({ k: 'win', n: this.winner });
    }
  }

  tick(dt) {
    this.tickCount++;
    this.time += dt;
    if (this.phase === 'waiting') {
      // 방장이 시작할 때까지 대기 (연습은 가능)
    } else if (this.phase === 'countdown') {
      this.timer -= dt;
      if (this.players.size < 2) this.phase = 'waiting';
      else if (this.timer <= 0) this.startRound();
    } else if (this.phase === 'ended') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.list().forEach((p) => { p.inMatch = false; p.ready = !!p.bot; });
        this.phase = 'waiting';
      }
    }
    for (const s of this.smokes) s.t -= dt;
    this.smokes = this.smokes.filter((s) => s.t > 0);
    for (const b of this.blizzards) b.t -= dt;
    this.blizzards = this.blizzards.filter((b) => b.t > 0 && this.players.has(b.by));

    const list = this.list();
    list.forEach((p, idx) => {
      if (this.phase !== 'playing' && !p.alive) {
        const s = this.stage.spawns[idx % this.stage.spawns.length];
        p.reset(s.x, s.y);
        if (this.phase !== 'ended') p.inMatch = false;
      }
      // 사람: 받은 입력에서 매 틱 새로 시작 (에러·반전으로 바꾼 입력이 쌓이지 않게)
      if (!p.bot && p.rawInput) p.input = { ...p.rawInput };
      if (p.dummy) p.input = EMPTY_INPUT();           // 더미: 가만히 있음
      else if (p.bot) p.input = botThink(this, p);
    });
    // 기생당한 몸은 기생자의 입력으로 움직임 (숙주 스킬은 못 씀)
    for (const p of list) {
      if (!p.controller) continue;
      const c = this.players.get(p.controller);
      if (!c || c.parHost !== p.id) { p.controller = null; continue; }
      p.input = { ...c.input, s: 0, e: 0 };
      p.lastHitBy = c.id; p.lastHitAt = this.tickCount; // 조종해서 떨어뜨리면 기생자 킬
    }
    // 에러: 입력이 제멋대로 (좌우 반대 / 멈춤 / 안 먹힘 / 아무 키)
    for (const p of list) {
      if (!(p.errT > 0)) continue;
      if (!p.errModeT || p.errModeT <= 0) {
        p.errMode = [0, 2, 3, 4][Math.floor(Math.random() * 4)]; p.errModeT = 8 + Math.floor(Math.random() * 22);
        p.errHold = { ...p.input };
      }
      p.errModeT--;
      const i = p.input;
      if (p.errMode === 2) p.input = { ...p.errHold };                    // 예전 입력에 멈춤
      else if (p.errMode === 3) p.input = EMPTY_INPUT();                       // 안 먹힘
      else if (p.errMode === 4) p.input = { ...i, l: Math.random() < 0.5 ? 1 : 0, r: Math.random() < 0.5 ? 1 : 0, u: Math.random() < 0.06 ? 1 : 0, a: Math.random() < 0.05 ? 1 : 0 };
    }
    // 반전: 좌우 키가 반대로
    for (const p of list) if (p.invT > 0) p.input = { ...p.input, l: p.input.r, r: p.input.l };
    for (const p of [...list, ...this.clones.values()]) if (p.alive && !p.inside) this.updateElements(p, dt);
    for (const p of list) {
      if (!p.alive) continue;
      if (p.inside) { this.updateParasite(p, dt); continue; }
      if (p.frozen > 0) { this.updateFrozen(p, dt); continue; }
      this.updatePlayer(p, dt);
    }
    for (const c of [...this.clones.values()]) {
      const owner = this.players.get(c.ownerId);
      if (!owner || !owner.alive) { this.clones.delete(c.ownerId); continue; }
      if (c.frozen > 0) { c.frozen -= dt; continue; }
      // 분신은 주인과 똑같은 모습 (거인·고무·엔진·비행·바위·강화·태양·헐크 크기). 은신은 제외
      c.giantT = owner.giantT; c.rubberT = owner.rubberT; c.engineT = owner.engineT; c.flyT = owner.flyT;
      c.rockT = owner.rockT; c.buffT = owner.buffT; c.sunT = owner.sunT; c.hulkS = owner.hulkS;
      c.input = cloneThink(this, c, owner);
      this.updatePlayer(c, dt);
    }
    const targets = list.concat([...this.clones.values()]);
    for (const p of list) if (p.alive && !p.inside && !(p.frozen > 0)) this.updateAttack(p, targets, dt);
    this.updateSlashes(targets, dt);
    this.updateTurrets(targets, dt);
    this.updateAtoms(targets, dt);
    this.updateMines(targets, dt);
    this.updateArrows(targets, dt);
    this.updateWinds(targets, dt);
    for (const p of list) if (p.alive && !p.inside) this.checkBlast(p);
    for (const c of this.clones.values()) this.checkCloneBounds(c);
    for (const p of targets) p.prevInput = { ...p.input };
  }

  // ---------------- 시간: 첫 Q = 지금을 저장, 두 번째 Q = 저장한 순간으로 되돌림 ----------------
  // 되돌릴 때 모든 것(위치·퍼센트·목숨·쿨타임·맞은 효과·분신·터렛·날아가던 것)을 그때로. 시전자 쿨타임만 그대로
  captureWorld() {
    const cp = (o) => {
      const out = {};
      for (const [k, v] of Object.entries(o)) if (!TIME_SKIP.has(k)) out[k] = typeof v === 'object' && v !== null ? structuredClone(v) : v;
      return out;
    };
    return {
      players: new Map([...this.players.values()].map((p) => [p.id, cp(p)])),
      clones: [...this.clones.values()].map((c) => structuredClone({ ...c, attack: null })),
      mines: structuredClone(this.mines), turrets: structuredClone(this.turrets), bullets: structuredClone(this.bullets), slashes: structuredClone(this.slashes),
      arrows: structuredClone(this.arrows), winds: structuredClone(this.winds), smokes: structuredClone(this.smokes),
      blizzards: structuredClone(this.blizzards),
    };
  }
  restoreWorld(snap, caster) {
    const keepCd = { skillCd: caster.skillCd, skillCd2: caster.skillCd2, skillCdB: caster.skillCdB };
    for (const p of this.players.values()) {
      const o = snap.players.get(p.id);
      if (!o) continue;                     // 저장한 뒤에 들어온 사람은 그대로
      Object.assign(p, structuredClone(o));
      p.attack = null; p.prevInput = { ...p.input };
    }
    Object.assign(caster, keepCd);          // 시전자 쿨타임만 지금 그대로
    // 기생 연결이 깨졌으면 정리
    for (const p of this.players.values()) {
      if (p.parHost && !this.players.has(p.parHost)) { p.inside = false; p.parHost = null; }
      if (p.controller && !this.players.has(p.controller)) p.controller = null;
    }
    this.clones = new Map();
    for (const c of snap.clones) {
      if (!this.players.has(c.ownerId)) continue;
      const n = new Player(c.id, c.name, c.color, c.bot, c.skill);
      Object.assign(n, structuredClone(c));
      this.clones.set(c.ownerId, n);
    }
    const alive = (x) => this.players.has(x.owner);
    this.turrets = structuredClone(snap.turrets).filter(alive);
    this.mines = structuredClone(snap.mines || []).filter(alive);
    this.bullets = structuredClone(snap.bullets).filter(alive);
    this.slashes = structuredClone(snap.slashes).filter(alive);
    this.arrows = structuredClone(snap.arrows).filter(alive);
    this.winds = structuredClone(snap.winds).filter(alive);
    this.smokes = structuredClone(snap.smokes);
    this.blizzards = structuredClone(snap.blizzards).filter((z) => this.players.has(z.by));
  }

  tickTimers(p, dt) {
    if (p.skillCd > 0) p.skillCd = Math.max(0, p.skillCd - dt);
    if (p.skillCdB > 0) p.skillCdB = Math.max(0, p.skillCdB - dt);
    if (p.skillCd2 > 0) p.skillCd2 = Math.max(0, p.skillCd2 - dt);
    if (p.invincible > 0) p.invincible -= dt;
  }
  // 정지당한 사람: 그 자리에 고정 (쿨타임은 계속 돌아감)
  updateFrozen(p, dt) {
    p.frozen -= dt;
    this.tickTimers(p, dt);
    if (p.frozen <= 0) { p.frozen = 0; p.vx *= 0.3; p.vy = Math.min(p.vy, 0) * 0.3; }
  }

  updatePlayer(p, dt) {
    const inp = p.input, prev = p.prevInput;
    const pressed = (k) => inp[k] && !prev[k];
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    this.tickTimers(p, dt);
    if (p.dropThrough > 0) p.dropThrough -= dt;
    if (p.slow > 0) p.slow = Math.max(0, p.slow - dt);
    if (p.stealth > 0) p.stealth = Math.max(0, p.stealth - dt);
    if (p.flyT > 0) p.flyT = Math.max(0, p.flyT - dt);
    if (p.flyDownT > 0) p.flyDownT = Math.max(0, p.flyDownT - dt);
    if (p.rockT > 0) p.rockT = Math.max(0, p.rockT - dt);
    if (p.buffT > 0) p.buffT = Math.max(0, p.buffT - dt);
    if (p.giantT > 0) p.giantT = Math.max(0, p.giantT - dt);
    if (p.rubberT > 0) p.rubberT = Math.max(0, p.rubberT - dt);
    if (p.engineT > 0) p.engineT = Math.max(0, p.engineT - dt);
    if (p.stunT > 0) p.stunT = Math.max(0, p.stunT - dt);
    if (p.quakeT > 0) p.quakeT = Math.max(0, p.quakeT - dt);
    if (p.iceT > 0) p.iceT = Math.max(0, p.iceT - dt);
    if (p.errT > 0) p.errT = Math.max(0, p.errT - dt);
    if (p.invT > 0) p.invT = Math.max(0, p.invT - dt);
    if (p.parryT > 0) p.parryT = Math.max(0, p.parryT - dt);
    if (p.sunT > 0) p.sunT = Math.max(0, p.sunT - dt);
    // 헐크: 퍼센트에 따라 몸 크기가 서서히 변함
    if (p.clone) { /* 분신은 주인 크기를 따라감 */ } else if (has(p, 'hulk')) {
      const h = SKILLS.hulk;
      const target = 1 + h.size * clamp(p.damage / h.maxAt, 0, 1);
      p.hulkS = approach(p.hulkS || 1, target, h.grow * dt);
    } else p.hulkS = 1;

    // 강화 충전: 아무것도 안 하고 가만히 서 있는 시간
    if (has(p, 'empower') && !p.clone && !p.charged && p.buffT <= 0) {
      // 가만히 있는 동안만 쌓이고, 움직여도 쌓인 양은 그대로 유지
      const idle = !inp.l && !inp.r && !inp.u && !inp.d && !inp.a && !inp.h && p.grounded && Math.abs(p.vx) < 20 && p.hitstun <= 0;
      if (idle) p.stillT += dt;
      if (p.stillT >= SKILLS.empower.charge) { p.charged = true; p.stillT = 0; this.ev({ k: 'charged', only: p.id }); }
    }

    let moveMul = p.slow > 0 ? SKILLS.slow.moveMul : 1;
    let jumpMul = 1;
    if (p.rockT > 0) { moveMul = Math.min(moveMul, SKILLS.rock.moveMul); jumpMul = SKILLS.rock.jumpMul; }
    if (p.buffT > 0) { moveMul *= SKILLS.empower.speedMul; jumpMul *= SKILLS.empower.jumpMul; }
    if (p.giantT > 0) moveMul *= SKILLS.giant.speedMul;
    if (p.rubberT > 0) jumpMul *= SKILLS.rubber.jumpMul;
    if (p.engineT > 0) moveMul *= SKILLS.engine.speedMul;
    if (has(p, 'hulk')) moveMul *= 1 - SKILLS.hulk.slow * hulkF(p);
    if (p.sunT > 0) moveMul *= SKILLS.sun.speedMul;
    if (p.drawT > 0) moveMul *= 0.45;                     // 시위 당기는 중엔 느림
    const canFight = this.phase === 'playing' || this.phase === 'waiting';
    const flying = p.flyT > 0;

    if (p.hitstun > 0 || p.stunT > 0 || p.iceT > 0) {
      if (p.hitstun > 0) p.hitstun -= dt;
      p.vx = approach(p.vx, 0, 500 * dt);
      p.drawT = 0;
    } else {
      const attacking = p.attack !== null;
      const heavyLock = attacking && p.attack.type === 'heavy';
      const speed = CONFIG.RUN_SPEED * moveMul * (heavyLock && p.grounded ? 0.25 : 1);
      p.vx = approach(p.vx, dir * speed, (p.grounded ? CONFIG.GROUND_ACCEL : CONFIG.AIR_ACCEL) * Math.min(1, moveMul) * dt);
      if (dir !== 0 && !attacking) p.facing = dir;
      if (pressed('u') && !flying) {
        if (p.grounded) {
          p.vy = -CONFIG.JUMP_SPEED * jumpMul; p.grounded = false;
          this.ev({ k: 'jump', x: r0(p.x), y: r0(p.y), pid: p.ownerId || p.id });
        } else if (p.jumpsLeft > 0) {
          p.vy = -CONFIG.DOUBLE_JUMP_SPEED * jumpMul; p.jumpsLeft--;
          this.ev({ k: 'jump2', x: r0(p.x), y: r0(p.y), pid: p.ownerId || p.id });
        }
      }
      if (p.grounded && pressed('d') && this.onPlatform(p)) { p.dropThrough = 0.25; p.grounded = false; p.y += 2; }
      if (canFight && !p.clone) {
        for (const key of ['s', 'e', 'x']) if (pressed(key)) this.useSlot(p, key);
      }
      if (canFight && !attacking && !(p.drawT > 0)) {
        if (pressed('a')) p.attack = { type: 'light', t: 0, hit: new Set(), victims: [] };
        else if (pressed('h')) {
          // 궁수: 강공격 = 활 시위 당기기
          if (has(p, 'archer') && !p.clone) p.drawT = 0.001;
          else p.attack = { type: 'heavy', t: 0, hit: new Set(), victims: [] };
        }
      } else if (p.drawT > 0) {
        if (inp.h && canFight) p.drawT = Math.min(1, p.drawT + dt / SKILLS.archer.full);
        else this.fireArrow(p);
      }
    }

    if (p.fdashT > 0) {
      // 화염 돌진: 수평으로 쭉 (중력 없음)
      p.fdashT -= dt;
      p.vx = p.facing * SKILLS.fire.dashSpeed; p.vy = 0;
    } else if (flying) {
      // 비행: 점프 키를 누르고 있으면 올라가고, 떼면 천천히 내려감
      const s = SKILLS.fly;
      const target = inp.u && p.flyDownT <= 0 && p.hitstun <= 0 ? -s.up : s.down;
      p.vy = approach(p.vy, target, 2600 * dt);
    } else {
      p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    }
    this.moveAndCollide(p, dt);
  }

  // 눌린 키(s=Q, e=E, x=R)에 배치된 스킬을 씀
  useSlot(p, key) {
    const k = slotsOf(p)[key];
    if (!k) return;
    const second = !!p.skill2 && (k === p.skill2 || (k === 'magnet2' && p.skill2 === 'magnet'));
    if (second) this.swapSkills(p);   // 두 번째 스킬은 잠깐 첫 번째 자리로 바꿔서 실행
    try { if (k === 'magnet2') this.useSkill2(p); else this.useSkill(p); } finally { if (second) this.swapSkills(p); }
  }
  swapSkills(p) {
    [p.skill, p.skill2] = [p.skill2, p.skill];
    [p.skillCd, p.skillCdB] = [p.skillCdB, p.skillCd];
  }
  // ---------------- 스킬 (Q) ----------------
  useSkill(p) {
    const k = p.skill;
    if (k === 'empower') return this.useEmpower(p);
    if (k === 'parasite') return this.startParasite(p);
    if (p.skillCd > 0) return;
    const cx = p.x, cy = p.y - bh(p) / 2;
    const others = () => [...this.players.values(), ...this.clones.values()].filter(
      (o) => this.foe(p, o) && o.alive && !o.inside && !(o.frozen > 0));

    if (k === 'slow') {
      const s = SKILLS.slow;
      let hits = 0;
      for (const o of others()) {
        if (o.invincible > 0) continue;
        if (Math.hypot(o.x - cx, o.y - bh(o) / 2 - cy) <= s.radius) { o.slow = s.duration; o.slowMud = skinOn(p, 'swamp'); if (!o.clone) hits++; }
      }
      p.skillCd = s.cd;
      this.ev({ k: 'slow', x: r0(cx), y: r0(cy), r: s.radius, h: hits, pid: p.id, m: skinOn(p, 'swamp') ? 1 : 0 });
    } else if (k === 'blink') {
      const s = SKILLS.blink;
      const inp = p.input;
      let dx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      let dy = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
      if (!dx && !dy) dx = p.facing;
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      const x0 = p.x, y0 = p.y;
      let bx = p.x, by = p.y;
      for (let t = 10; t <= s.distance; t += 10) {
        const nx = x0 + dx * t, ny = y0 + dy * t;
        if (this.insideSolid(nx, ny)) break;
        bx = nx; by = ny;
      }
      p.x = bx; p.y = by;
      p.vy = dy < 0 ? -200 : 0;
      p.vx = dx * 150;
      p.grounded = false;
      p.invincible = Math.max(p.invincible, 0.15);
      p.skillCd = s.cd;
      if (dx) p.facing = dx > 0 ? 1 : -1;
      this.ev({ k: 'blink', x: r0(x0), y: r0(y0), x2: r0(bx), y2: r0(by), pid: p.id });
    } else if (k === 'stealth') {
      const s = SKILLS.stealth;
      p.stealth = s.duration;
      p.skillCd = s.cd;
      this.ev({ k: 'stealth', x: r0(p.x), y: r0(cy) });
    } else if (k === 'clone') {
      const s = SKILLS.clone;
      const old = this.clones.get(p.id);
      if (old) this.ev({ k: 'poof', x: r0(old.x), y: r0(old.y - bh(old) / 2) });
      const c = new Player('c-' + p.id + '-' + this.tickCount, p.name, p.color, p.bot, p.skill);
      c.clone = true; c.ownerId = p.id; c.hitsTaken = 0; c.skill2 = p.skill2; c.skins = p.skins;
      let x = p.x - p.facing * 60;
      if (this.insideSolid(x, p.y)) x = p.x;
      c.reset(x, p.y);
      c.facing = p.facing; c.vx = p.vx; c.vy = p.vy;
      c.patrol = -p.facing; c.patrolT = 0;
      this.clones.set(p.id, c);
      p.skillCd = s.cd;
      this.ev({ k: 'clone', x: r0(x), y: r0(cy), pid: p.id });
    } else if (k === 'swap') {
      const s = SKILLS.swap;
      if (this.time - p.heavyHitAt < s.heavyLock) return this.deny(p, '강공격을 맞은 직후엔 전환할 수 없어요');
      // 다른 플레이어·봇, 분신(내 것 포함), 터렛(내 것 포함) 중 랜덤
      const cands = [
        ...[...this.players.values()].filter((o) => this.foe(p, o) && o.alive && !o.inside && (this.phase !== 'playing' || o.inMatch)),
        ...[...this.clones.values()].filter((c) => c.alive && (c.ownerId === p.id || this.foe(p, c))),
        ...this.turrets.filter((t) => t.owner === p.id || this.foe(p, t)),
      ];
      if (!cands.length) return this.deny(p, '바꿀 대상이 없어요');
      const o = cands[Math.floor(Math.random() * cands.length)];
      const isTurret = this.turrets.includes(o);
      const a = { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
      p.x = o.x; p.y = o.y; p.vx = isTurret ? 0 : o.vx; p.vy = isTurret ? 0 : o.vy;
      o.x = a.x; o.y = a.y;
      if (isTurret) o.vy = 0; else { o.vx = a.vx; o.vy = a.vy; o.grounded = false; }
      p.grounded = false;
      p.skillCd = s.cd;
      this.ev({ k: 'swap', x: r0(a.x), y: r0(a.y - 30), x2: r0(p.x), y2: r0(p.y - 30), pid: p.id, pid2: o.clone || isTurret ? undefined : o.id });
    } else if (k === 'fly') {
      const s = SKILLS.fly;
      p.flyT = s.duration; p.flyDownT = 0;
      p.skillCd = s.cd;
      if (p.vy > 0) p.vy = 0;
      this.ev({ k: 'fly', x: r0(p.x), y: r0(p.y), pid: p.id });
    } else if (k === 'explode') {
      const s = SKILLS.explode;
      let hits = 0;
      for (const o of others()) {
        if (o.invincible > 0) continue;
        const ox = o.x, oy = o.y - bh(o) / 2;
        const d = Math.hypot(ox - cx, oy - cy);
        if (d > s.radius) continue;
        const nx = d < 1 ? (Math.random() < 0.5 ? -1 : 1) : (ox - cx) / d;
        const ny = d < 1 ? -0.5 : (oy - cy) / d;
        o.damage = Math.min(o.damage + s.damage, 999);
        if (o.rockT <= 0) {
          const kb = s.power * (o.buffT > 0 ? SKILLS.empower.kbMul : 1);
          o.vx = nx * kb; o.vy = Math.min(ny * kb, 0) - 320 * (o.buffT > 0 ? SKILLS.empower.kbMul : 1);
          o.grounded = false;
        }
        o.hitstun = Math.max(o.hitstun, s.stun);  // 0.5초 스턴
        o.attack = null;
        o.lastHitBy = p.id; o.lastHitAt = this.tickCount;
        if (o.clone) this.hitClone(o);
        if (!o.clone) hits++;
      }
      // 공중에서 쓰면 한 번 더 점프 가능 (3단 점프)
      if (!p.grounded) p.jumpsLeft = Math.min(p.jumpsLeft + 1, CONFIG.EXTRA_JUMPS + 1);
      this.smokes.push({ x: cx, y: cy, r: s.smokeR, t: s.smoke, max: s.smoke });
      p.skillCd = s.cd;
      this.ev({ k: 'explode', x: r0(cx), y: r0(cy), r: s.radius, h: hits });
    } else if (k === 'freeze') {
      const s = SKILLS.freeze;
      for (const o of [...this.players.values(), ...this.clones.values()]) {
        if (!this.foe(p, o) || !o.alive || o.inside) continue;
        o.frozen = s.duration;
        o.vx = 0; o.vy = 0;
      }
      p.skillCd = s.cd;
      this.ev({ k: 'freeze', x: r0(cx), y: r0(cy) });
    } else if (k === 'rock') {
      const s = SKILLS.rock;
      p.rockT = s.duration;
      p.skillCd = s.cd;
      this.ev({ k: 'rock', x: r0(p.x), y: r0(cy), pid: p.id });
    } else if (k === 'quake') {
      const s = SKILLS.quake;
      p.skillCd = s.cd;
      // 시전자 빼고 모두 흔들림 (봇은 움직임과 공격이 엉망이 됨)
      for (const o of this.players.values()) if (this.foe(p, o) && o.alive) o.quakeT = s.duration;
      this.ev({ k: 'quake', by: p.id, d: s.duration, x: r0(p.x), y: r0(p.y) });
    } else if (k === 'giant') {
      const s = SKILLS.giant;
      // 커질 자리가 천장에 막히지 않게 살짝 확인
      p.giantT = s.duration; p.skillCd = s.cd;
      this.ev({ k: 'giant', x: r0(p.x), y: r0(cy), pid: p.id });
    } else if (k === 'rubber') {
      const s = SKILLS.rubber;
      p.rubberT = s.duration; p.skillCd = s.cd;
      this.ev({ k: 'rubber', x: r0(p.x), y: r0(cy), pid: p.id });
    } else if (k === 'engine') {
      const s = SKILLS.engine;
      p.engineT = s.duration; p.skillCd = s.cd;
      this.ev({ k: 'engine', x: r0(p.x), y: r0(p.y), f: p.facing, pid: p.id });
    } else if (k === 'sword') {
      const s = SKILLS.sword;
      const x = p.x + p.facing * (bw(p) / 2 + 10);
      this.slashes.push({ id: ++this.evSeq, owner: p.id, x, y: cy, vx: p.facing * s.slashSpeed, t: s.slashLife, hit: new Set() });
      p.skillCd = s.cd;
      this.ev({ k: 'slash', x: r0(x), y: r0(cy), f: p.facing, pid: p.id });
    } else if (k === 'blackflash') {
      this.useBlackFlash(p);
    } else if (k === 'lightning') {
      const s = SKILLS.lightning;
      const cands = others().filter((o) => !(o.invincible > 0))
        .map((o) => ({ o, d: Math.hypot(o.x - cx, o.y - bh(o) / 2 - cy) }))
        .filter((e) => e.d <= s.radius).sort((a, b) => a.d - b.d).slice(0, s.count);
      const pts = [];
      for (const { o } of cands) {
        o.damage = Math.min(o.damage + s.damage, 999);
        o.stunT = Math.max(o.stunT || 0, s.stun);
        o.attack = null; o.vx = 0; if (o.vy < 0) o.vy = 0;
        o.lastHitBy = p.id; o.lastHitAt = this.tickCount;
        if (o.clone) this.hitClone(o);
        pts.push([r0(o.x), r0(o.y)]);
      }
      p.skillCd = s.cd;
      this.ev({ k: 'bolt', x: r0(cx), y: r0(cy), pts, h: cands.filter((e) => !e.o.clone).length, pid: p.id });
    } else if (k === 'fire') {
      const s = SKILLS.fire;
      const inp = p.input;
      const d = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      if (d) p.facing = d;
      p.fdashT = s.dashTime; p.fdashHit = new Set(); p.attack = null;
      p.skillCd = s.cd;
      this.ev({ k: 'fdash', x: r0(p.x), y: r0(cy), f: p.facing, pid: p.id, b: skinOn(p, 'bluefire') ? 1 : 0 });
    } else if (k === 'ice') {
      const s = SKILLS.ice;
      this.blizzards.push({ by: p.id, t: s.blizzard, sand: skinOn(p, 'sand'), skin: iceSkin(p) });
      p.skillCd = s.cd;
      this.ev({ k: 'blizzard', x: r0(p.x), y: r0(cy), d: s.blizzard, n: p.name, sand: skinOn(p, 'sand') ? 1 : 0, au: skinOn(p, 'aurora') ? 1 : 0, dk: skinOn(p, 'shadowice') ? 1 : 0 });
    } else if (k === 'turret') {
      const s = SKILLS.turret;
      const mine = this.turrets.filter((t) => t.owner === p.id);
      if (mine.length >= s.max) {
        const old = mine[0];
        this.turrets = this.turrets.filter((t) => t !== old);
        this.ev({ k: 'poof', x: r0(old.x), y: r0(old.y - 20) });
      }
      let tx = p.x + p.facing * 46;
      if (this.insideSolid(tx, p.y) || !this.surfaceBelow(tx, p.y)) tx = p.x;
      const t = { id: ++this.evSeq, owner: p.id, x: tx, y: p.y, vy: 0, hp: s.hp, cd: 0.5, aim: p.facing > 0 ? 0 : Math.PI, color: p.color, hitBy: null };
      this.turrets.push(t);
      p.skillCd = s.cd;
      this.ev({ k: 'turret', x: r0(t.x), y: r0(t.y), pid: p.id });
    } else if (k === 'error') {
      const s = SKILLS.error;
      // 랜덤한 적 한 명만
      const cands = [...this.players.values()].filter((o) => this.foe(p, o) && o.alive && (this.phase !== 'playing' || o.inMatch));
      if (!cands.length) return this.deny(p, '에러를 걸 상대가 없어요');
      const o = cands[Math.floor(Math.random() * cands.length)];
      o.errT = s.duration; o.errModeT = 0;
      p.skillCd = s.cd;
      this.ev({ k: 'error', by: p.id, d: s.duration, n: p.name, n2: o.name, x: r0(o.x), y: r0(o.y - bh(o) / 2) });
    } else if (k === 'sun') {
      const s = SKILLS.sun;
      p.sunT = s.duration; p.skillCd = s.cd;
      this.ev({ k: 'sun', x: r0(p.x), y: r0(cy), pid: p.id, b: skinOn(p, 'supernova') ? 1 : 0 });
    } else if (k === 'wind') {
      const s = SKILLS.wind;
      this.winds.push({ id: ++this.evSeq, owner: p.id, x: p.x + p.facing * 40, y: p.y, vx: p.facing * s.speed, t: s.life, caught: new Set() });
      p.skillCd = s.cd;
      this.ev({ k: 'wind', x: r0(p.x), y: r0(cy), f: p.facing, pid: p.id });
    } else if (k === 'archer') {
      if (p.homingNext) return this.deny(p, '이미 유도 화살이 준비돼 있어요');
      p.homingNext = true; p.skillCd = SKILLS.archer.cd;
      this.ev({ k: 'homing', x: r0(p.x), y: r0(cy), pid: p.id });
    } else if (k === 'time') {
      const saved = this.timeSaves.get(p.id);
      if (!saved) {
        // 첫 번째: 지금 이 순간을 저장
        this.timeSaves.set(p.id, { snap: this.captureWorld(), x: p.x, y: p.y });
        p.skillCd = 0.5;
        this.ev({ k: 'tsave', x: r0(p.x), y: r0(cy), n: p.name, pid: p.id, g: skinOn(p, 'timestone') ? 1 : 0 });
      } else {
        // 두 번째: 저장한 순간으로 되돌림 (내 쿨타임만 빼고)
        this.timeSaves.delete(p.id);
        this.restoreWorld(saved.snap, p);
        p.skillCd = SKILLS.time.cd;
        this.ev({ k: 'rewind', n: p.name, g: skinOn(p, 'timestone') ? 1 : 0 });
      }
    } else if (k === 'combo') {
      return this.smash(p);
    } else if (k === 'atom') {
      const s = SKILLS.atom;
      p.eBoostT = s.boost; p.skillCd = s.cd;
      this.ev({ k: 'atomq', x: r0(p.x), y: r0(cy), pid: p.id });
    } else if (k === 'mine') {
      const s = SKILLS.mine;
      const mine = this.mines.filter((m) => m.owner === p.id);
      if (mine.length >= s.max) this.mines = this.mines.filter((m) => m !== mine[0]);   // 가장 오래된 것 제거
      this.mines.push({ id: ++this.evSeq, owner: p.id, x: p.x, y: p.y, vy: 0, arm: s.arm, color: p.color });
      p.skillCd = s.cd;
      this.ev({ k: 'mineset', x: r0(p.x), y: r0(p.y), pid: p.id });
    } else if (k === 'reflect') {
      p.parryT = SKILLS.reflect.window; p.skillCd = SKILLS.reflect.cd;
      this.ev({ k: 'parryq', x: r0(p.x), y: r0(cy), pid: p.id });
    } else if (k === 'invert') {
      const s = SKILLS.invert;
      const cands = [...this.players.values()].filter((o) => this.foe(p, o) && o.alive && (this.phase !== 'playing' || o.inMatch));
      if (!cands.length) return this.deny(p, '반전시킬 상대가 없어요');
      for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
      const pick = cands.slice(0, Math.ceil(cands.length / 2));
      for (const o of pick) o.invT = s.duration;
      p.skillCd = s.cd;
      this.ev({ k: 'invert', n: p.name, h: pick.length, names: pick.map((o) => o.name) });
    } else if (k === 'hulk') {
      return this.deny(p, '헐크는 퍼센트가 오를수록 커지는 패시브 스킬이에요');
    } else if (k === 'undying') {
      return this.deny(p, '불사는 목숨이 5개가 되는 패시브 스킬이에요');
    } else if (k === 'magnet') {
      this.magnet(p, 1);
      p.skillCd = SKILLS.magnet.cd;
    }
  }
  // ---------------- 반사 ----------------
  parrying(o) { return !o.clone && o.parryT > 0 && o.alive && !o.inside; }
  parried(o, x, y) {
    o.parryT = 0; o.invincible = Math.max(o.invincible, 0.3);
    this.ev({ k: 'parry', x: r0(x), y: r0(y), fx: skinOn(o, 'rainbow') ? 'rainbow' : null });
  }
  // 근접 공격·돌진을 반사: 공격한 쪽이 반대 방향으로 날아감
  reflectHit(attacker, target, def, type, dir) {
    this.parried(target, target.x, target.y - bh(target) / 2);
    attacker.attack = null; attacker.fdashT = 0;
    this.applyHit(target, attacker, def, type, { dir: -dir, reflect: true });
  }
  // 날아오는 것(화살·참격·총알·바람)을 반사: 주인이 바뀌고 방향이 반대로
  reflectShot(o, shot) {
    this.parried(o, shot.x, shot.y);
    shot.owner = o.id; shot.vx = -shot.vx;
    // 일반 화살은 왔던 포물선을 거꾸로 (위로 다시 띄움), 나머지는 수평으로 되돌림
    if (shot.c !== undefined && !shot.homing) shot.vy = -Math.abs(shot.vy) - 40;
    else if (shot.vy !== undefined) shot.vy = -shot.vy;
    if (shot.hit) shot.hit = new Set();
    if (shot.caught) shot.caught = new Set();
    shot.x += Math.sign(shot.vx) * 20;
  }
  // ---------------- 원자: 전자 위치 (서버·화면이 같은 식으로 계산) ----------------
  electronPos(p) {
    const s = SKILLS.atom, n = p.electrons || 0, out = [];
    const R = s.radius * sizeOf(p), cx = p.x, cy = p.y - bh(p) / 2;
    for (let i = 0; i < n; i++) {
      if (p.eBoostT > 0) {
        // 강화: 기울어진 링 2줄, 반반 나눠 돎
        const ring = i % 2, cnt = Math.ceil(n / 2) || 1, j = Math.floor(i / 2);
        const a = (ring ? -p.ePhase : p.ePhase) + (j * Math.PI * 2) / cnt;
        const ex = Math.cos(a) * R, ey = Math.sin(a) * R * 0.4, t = ring ? 0.6 : -0.6;
        out.push([cx + ex * Math.cos(t) - ey * Math.sin(t), cy + ex * Math.sin(t) + ey * Math.cos(t)]);
      } else {
        const a = p.ePhase + (i * Math.PI * 2) / n;
        out.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
      }
    }
    return out;
  }
  updateAtoms(list, dt) {
    const s = SKILLS.atom;
    for (const p of this.players.values()) {
      if (!p.alive || p.inside || !(p.electrons > 0)) { if (p.eBoostT > 0) p.eBoostT -= dt; continue; }
      if (p.eBoostT > 0) p.eBoostT = Math.max(0, p.eBoostT - dt);
      p.ePhase = (p.ePhase + s.spin * (p.eBoostT > 0 ? 2 : 1) * dt) % (Math.PI * 2);
      // 3초 동안 안 때리면 1초에 1개씩 사라짐
      if (this.time - p.eLast > s.decayAfter) { p.eDecayT += dt; if (p.eDecayT >= s.decayEvery) { p.eDecayT = 0; p.electrons--; } }
      if (this.phase === 'countdown' || this.phase === 'ended') continue;
      const def = { damage: s.dmg, baseKB: s.baseKB, growthKB: s.growthKB, lift: 0.35 };
      for (const [ex, ey] of this.electronPos(p)) {
        for (const o of list) {
          if (!this.foe(p, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
          if ((p.eHit[o.id] || -9) > this.time - s.hitEvery) continue;
          const ow = bw(o), oh = bh(o);
          if (ex > o.x - ow / 2 - 9 && ex < o.x + ow / 2 + 9 && ey > o.y - oh - 9 && ey < o.y + 9) {
            p.eHit[o.id] = this.time;
            if (this.parrying(o)) { this.parried(o, ex, ey); continue; }
            this.applyHit(p, o, def, 'light', { dir: Math.sign(o.x - p.x) || p.facing, small: true, electron: true });
            if (o.clone) this.hitClone(o);
          }
        }
      }
    }
  }
  // ---------------- 지뢰 ----------------
  updateMines(list, dt) {
    if (!this.mines.length) return;
    const s = SKILLS.mine;
    for (const m of [...this.mines]) {
      if (!this.players.has(m.owner)) { this.mines = this.mines.filter((x) => x !== m); continue; }
      if (m.arm > 0) m.arm -= dt;
      const prevY = m.y;
      m.vy = Math.min(m.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL); m.y += m.vy * dt;
      { const ly = this.landingY(m.x, prevY, m.y); if (ly != null) { m.y = ly; m.vy = 0; } }
      if (m.y > this.stage.blast.bottom) { this.mines = this.mines.filter((x) => x !== m); continue; }
      if (m.arm > 0 || this.phase === 'countdown' || this.phase === 'ended') continue;
      const stepped = list.some((o) => this.foe(m, o) && o.alive && !o.inside && !(o.frozen > 0) && Math.abs(o.x - m.x) < bw(o) / 2 + 12 && o.y >= m.y - 14 && o.y - bh(o) < m.y);
      if (!stepped) continue;
      // 펑! 주변을 날려 버림 (주인·팀원은 안 맞음)
      this.mines = this.mines.filter((x) => x !== m);
      const owner = this.players.get(m.owner);
      for (const o of list) {
        if (!this.foe(m, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
        const ox = o.x, oy = o.y - bh(o) / 2, d = Math.hypot(ox - m.x, oy - (m.y - 10));
        if (d > s.radius) continue;
        o.damage = Math.min(o.damage + s.dmg, 999);
        if (o.rockT <= 0) {
          const kb = s.power * (o.buffT > 0 ? SKILLS.empower.kbMul : 1) * (1 - SKILLS.hulk.tough * hulkF(o)) * (0.6 + 0.4 * (1 + o.damage / 150));
          const nx = d < 1 ? 0 : (ox - m.x) / d;
          o.vx = nx * kb; o.vy = -kb * 0.8; o.grounded = false; o.hitstun = Math.max(o.hitstun, 0.3);
        }
        o.attack = null; o.lastHitBy = m.owner; o.lastHitAt = this.tickCount;
        if (o.clone) this.hitClone(o);
      }
      this.ev({ k: 'boom', x: r0(m.x), y: r0(m.y - 10), r: s.radius, c: owner ? owner.color : '#fff' });
    }
  }
  // ---------------- 콤보 스매시 ----------------
  smash(p) {
    const s = SKILLS.combo, n = Math.min(p.combo || 0, s.maxStack);
    if (n < 1) return this.deny(p, '때려서 콤보를 쌓아야 쓸 수 있어요');
    const R = Math.min(s.maxR, s.baseR + s.perR * n);
    const cx = p.x, cy = p.y - bh(p) / 2;
    const def = { damage: 3 + 2 * n, baseKB: 300 + 45 * n, growthKB: 10, lift: 0.6 };
    let hits = 0;
    for (const o of [...this.players.values(), ...this.clones.values()]) {
      if (!this.foe(p, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
      if (Math.hypot(o.x - cx, o.y - bh(o) / 2 - cy) > R + bw(o) / 2) continue;
      this.applyHit(p, o, def, 'heavy', { dir: Math.sign(o.x - cx) || p.facing, smash: true });
      if (n >= 10) o.stunT = Math.max(o.stunT || 0, 0.3);
      if (o.clone) this.hitClone(o); else hits++;
    }
    for (const t of [...this.turrets]) if (this.foe(p, t) && Math.hypot(t.x - cx, t.y - 22 - cy) <= R) this.hitTurret(t, p);
    p.combo = 0;
    this.ev({ k: 'smash', x: r0(cx), y: r0(cy), r: r0(R), n, h: hits });
  }
  // ---------------- 궁수 화살 ----------------
  fireArrow(p) {
    const s = SKILLS.archer, c = Math.min(1, p.drawT);
    p.drawT = 0;
    const homing = !!p.homingNext; p.homingNext = false;
    const speed = homing ? s.homingSpeed : s.minSpeed + (s.maxSpeed - s.minSpeed) * c;
    const y = p.y - bh(p) / 2 - 4;
    const x = p.x + p.facing * (bw(p) / 2 + 6);
    let vx = p.facing * speed, vy = homing ? 0 : -40;
    if (homing) {
      // 처음부터 막히지 않는 방향으로 출발
      const tg = this.homingTarget({ owner: p.id, x, y }, [...this.players.values(), ...this.clones.values()]);
      const want = tg ? Math.atan2(tg.y - bh(tg) / 2 - y, tg.x - x) : (p.facing > 0 ? 0 : Math.PI);
      const d = this.clearDir(x, y, want).ang;
      vx = Math.cos(d) * speed; vy = Math.sin(d) * speed;
    }
    // 화살 겉모습: 화염·태양(불화살, 스킨이면 파랑), 얼음(얼음 화살), 바람·스킨 이펙트
    const el = (has(p, 'fire') || p.sunT > 0) ? ((has(p, 'fire') ? skinOn(p, 'bluefire') : skinOn(p, 'supernova')) ? 'blue' : 'fire') : has(p, 'ice') ? (skinOn(p, 'sand') ? 'sand' : 'ice') : skinFx(p) || (has(p, 'wind') ? 'wind' : '');
    this.arrows.push({ id: ++this.evSeq, owner: p.id, x, y, vx, vy, c, homing, t: homing ? s.homingLife : 2, el, big: sizeOf(p), de: skinOn(p, 'darkelf'), lf: skinOn(p, 'elf') });
    this.ev({ k: 'shoot', x: r0(p.x), y: r0(y), pid: p.id });
  }
  // 유도 화살: 목표 방향(want)에서 앞이 땅으로 막혀 있으면 조금씩 돌려서 빈 방향을 찾음
  clearDir(x, y, want) {
    for (const off of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.25, -1.25, 1.6, -1.6, 2.1, -2.1, 2.6, -2.6]) {
      const t2 = want + off;
      if (![25, 55, 90, 130].some((d) => this.solidAt(x + Math.cos(t2) * d, y + Math.sin(t2) * d))) return { ang: t2, blocked: off !== 0 };
    }
    return { ang: want, blocked: true };
  }
  homingTarget(a, list) {
    let target = null, best = 1e9;
    for (const o of list) {
      if (!this.foe(a, o) || !o.alive || o.inside || o.frozen > 0 || o.stealth > 0) continue;
      const d = Math.hypot(o.x - a.x, o.y - bh(o) / 2 - a.y);
      if (d < best) { best = d; target = o; }
    }
    return target;
  }
  solidAt(x, y) {
    if ((this.stage.slopes || []).some((sl) => x > sl.x1 && x < sl.x2 && y > slopeY(sl, x) && y < slopeBase(sl))) return true;
    return this.stage.solids.some((sf) => x > sf.x && x < sf.x + sf.w && y > sf.y && y < sf.y + sf.h);
  }
  updateArrows(list, dt) {
    if (!this.arrows.length) return;
    const s = SKILLS.archer;
    for (const a of this.arrows) {
      a.t -= dt;
      const owner = this.players.get(a.owner);
      if (!owner) { a.t = 0; continue; }
      if (a.homing) {
        // 유도: 가장 가까운 적을 향해 꺾고, 앞에 땅이 있으면 비켜 감
        const target = this.homingTarget(a, list);
        let ang = Math.atan2(a.vy, a.vx);
        // 바로 앞이 막혔으면 우선 비켜 가고, 아니면 목표 쪽으로 꺾음
        const ahead = this.clearDir(a.x, a.y, ang);
        let pick = ahead.blocked ? ahead.ang : ang, turn = ahead.blocked ? s.turn * 2.5 : s.turn;
        if (target && !ahead.blocked) {
          const want = Math.atan2(target.y - bh(target) / 2 - a.y, target.x - a.x);
          pick = this.clearDir(a.x, a.y, want).ang;
        }
        let diff = Math.atan2(Math.sin(pick - ang), Math.cos(pick - ang));
        diff = clamp(diff, -turn * dt, turn * dt);
        ang += diff;
        a.vx = Math.cos(ang) * s.homingSpeed; a.vy = Math.sin(ang) * s.homingSpeed;
      } else {
        a.vy += s.gravity * dt;
      }
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (this.solidAt(a.x, a.y)) { a.t = 0; this.ev({ k: 'thunk', x: r0(a.x), y: r0(a.y) }); continue; }
      if (this.phase === 'countdown' || this.phase === 'ended') continue;
      const def = { damage: 4 + Math.round(9 * a.c) + (a.homing ? 3 : 0), baseKB: 200 + 420 * a.c + (a.homing ? 120 : 0), growthKB: 6 + 8 * a.c, lift: 0.35 };
      for (const o of list) {
        if (!this.foe(a, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
        const ow = bw(o), oh = bh(o);
        if (a.x > o.x - ow / 2 - 8 && a.x < o.x + ow / 2 + 8 && a.y > o.y - oh - 6 && a.y < o.y + 6) {
          const dir = Math.sign(a.vx) || 1;
          if (this.parrying(o)) { this.reflectShot(o, a); a.t = Math.max(a.t, 1.5); break; }   // 유도 화살은 유도 그대로
          this.applyHit(owner, o, def, a.c > 0.8 || a.homing ? 'heavy' : 'light', { dir });
          this.elementHit(owner, o, 'light', dir);
          if (o.clone) this.hitClone(o);
          a.t = 0; break;
        }
      }
      if (a.t > 0) for (const t of [...this.turrets]) {
        if (!this.foe(a, t)) continue;
        if (Math.abs(t.x - a.x) < 24 && a.y > t.y - 50 && a.y < t.y) { this.hitTurret(t, owner); a.t = 0; break; }
      }
    }
    this.arrows = this.arrows.filter((a) => a.t > 0 && a.y < this.stage.blast.bottom);
  }
  // ---------------- 바람 소용돌이 ----------------
  updateWinds(list, dt) {
    if (!this.winds.length) return;
    const s = SKILLS.wind;
    for (const w of this.winds) {
      w.t -= dt; w.x += w.vx * dt;
      const owner = this.players.get(w.owner);
      if (!owner || this.solidAt(w.x + Math.sign(w.vx) * s.w, w.y - 40)) w.t = Math.min(w.t, 0);
      const inside = (o) => Math.abs(o.x - w.x) < s.w + bw(o) / 2 && o.y > w.y - s.h && o.y - bh(o) < w.y + 20;
      if (w.t > 0 && owner && this.phase !== 'countdown' && this.phase !== 'ended') {
        for (const o of list) {
          if (!this.foe(w, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0 || o.rockT > 0) continue;
          if (!inside(o)) continue;
          if (this.parrying(o)) { this.reflectShot(o, w); w.t = Math.max(w.t, 0.8); break; }
          if (!w.caught.has(o.id)) {
            w.caught.add(o.id);
            o.damage = Math.min(o.damage + s.dmg, 999);
            if (o.clone) this.hitClone(o);
          }
          // 휩쓸려 감: 소용돌이 가운데로 끌려와서 같이 이동, 위로 빙글빙글
          o.x += (w.x - o.x) * 0.15; o.vx = w.vx; o.vy = approach(o.vy, -260, 4000 * dt);
          o.grounded = false; o.hitstun = Math.max(o.hitstun, 0.12); o.attack = null; o.drawT = 0;
          o.lastHitBy = owner.id; o.lastHitAt = this.tickCount;
        }
        for (const t of this.turrets) {
          if (!this.foe(w, t) || Math.abs(t.x - w.x) > s.w + 20 || t.y < w.y - s.h || t.y - 44 > w.y + 20) continue;
          t.x += w.vx * dt; t.vy = Math.min(t.vy, -120); t.y -= 2;
        }
      }
      if (w.t <= 0 && owner) {
        // 끝나면 휩쓸린 상대를 앞으로 날려 버림
        for (const o of list) {
          if (!w.caught.has(o.id) || !o.alive || o.inside || !inside(o)) continue;
          const kb = s.throwKB * (o.buffT > 0 ? SKILLS.empower.kbMul : 1) * (1 - SKILLS.hulk.tough * hulkF(o));
          o.vx = Math.sign(w.vx) * kb; o.vy = -kb * 0.75; o.hitstun = Math.max(o.hitstun, 0.35);
        }
        this.ev({ k: 'windend', x: r0(w.x), y: r0(w.y - 60) });
      }
    }
    this.winds = this.winds.filter((w) => w.t > 0);
  }
  // ---------------- 두 번째 스킬 (E) — 자석 밀어내기 ----------------
  useSkill2(p) {
    if (p.skill !== 'magnet' || p.skillCd2 > 0) return;
    this.magnet(p, -1);
    p.skillCd2 = SKILLS.magnet.cd2;
  }
  magnet(p, sign) {
    const s = SKILLS.magnet;
    const cx = p.x, cy = p.y - bh(p) / 2;
    let hits = 0;
    for (const o of [...this.players.values(), ...this.clones.values()]) {
      if (!this.foe(p, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
      const ox = o.x, oy = o.y - bh(o) / 2;
      const d = Math.hypot(ox - cx, oy - cy);
      if (d > s.radius || d < 1) continue;
      if (o.rockT > 0) continue; // 바위는 안 움직임
      const nx = (ox - cx) / d, ny = (oy - cy) / d;
      const pow = s.power * (o.buffT > 0 ? SKILLS.empower.kbMul : 1);
      if (sign > 0) {
        // 끌어당김: 가까울수록 약하게 (겹치지 않도록)
        const f = pow * Math.min(1, d / 220);
        o.vx = -nx * f; o.vy = -ny * f * 0.6 - 120;
      } else {
        o.vx = nx * pow; o.vy = Math.min(ny * pow, 0) - 260;
      }
      o.grounded = false;
      o.hitstun = Math.max(o.hitstun, 0.25);
      o.attack = null;
      o.lastHitBy = p.id; o.lastHitAt = this.tickCount;
      if (!o.clone) hits++;
    }
    this.ev({ k: sign > 0 ? 'pull' : 'push', x: r0(cx), y: r0(cy), r: s.radius, h: hits, tj: skinOn(p, 'taiji') ? 1 : skinOn(p, 'yinyang') ? 2 : 0 });
  }
  useEmpower(p) {
    if (p.buffT > 0) return;
    if (!p.charged) return this.deny(p, `가만히 ${SKILLS.empower.charge}초 서 있으면 강화가 충전돼요`);
    p.charged = false; p.stillT = 0;
    p.buffT = SKILLS.empower.duration;
    this.ev({ k: 'empower', x: r0(p.x), y: r0(p.y - bh(p) / 2), pid: p.id });
  }

  // ---------------- 흑섬 ----------------
  // Q 자체로는 아무 일도 없음. 공격이 맞는 순간(활성 구간)과 타이밍이 맞으면 그 공격이 흑섬이 됨
  useBlackFlash(p) {
    const s = SKILLS.blackflash;
    p.skillCd = s.cd;
    p.bfAt = this.time;
    this.ev({ k: 'bfq', x: r0(p.x), y: r0(p.y - bh(p) / 2), pid: p.id, g: skinOn(p, 'oneforall') ? 1 : 0 });
    const atk = p.attack;
    if (!atk || atk.black) return;
    const def = ATTACKS[atk.type];
    // 공격이 막 맞기 시작했거나 맞는 중이면 → 이번 공격이 흑섬 (이미 맞은 상대도 바로 강화)
    if (atk.t >= def.startup - s.window && atk.t <= def.startup + def.active + s.window * 0.5) {
      atk.black = true;
      for (const t of atk.victims) if (t.alive) this.launch(p, t, def, atk.type, { black: true, dir: atk.dirs && atk.dirs.get(t.id) });
    }
  }

  // ---------------- 기생 ----------------
  startParasite(p) {
    const s = SKILLS.parasite;
    const cands = [...this.players.values()].filter((o) => this.foe(p, o) && o.alive && !o.inside && !o.controller
      && (p.parHits[o.id] || 0) >= s.hitsNeeded);
    if (!cands.length) return this.deny(p, `같은 상대를 ${s.hitsNeeded}번 때려야 기생할 수 있어요`);
    const h = cands[Math.floor(Math.random() * cands.length)];
    p.parOrigin = { x: p.x, y: p.y };
    p.inside = true; p.parHost = h.id; p.parT = s.duration;
    p.attack = null; p.vx = 0; p.vy = 0;
    h.controller = p.id; h.attack = null;
    if (this.clones.has(p.id)) this.clones.delete(p.id);
    this.ev({ k: 'infest', x: r0(h.x), y: r0(h.y - bh(h) / 2), n: p.name, n2: h.name, v: skinOn(p, 'carnage') ? 2 : skinOn(p, 'venom') ? 1 : 0 });
  }
  updateParasite(p, dt) {
    this.tickTimers(p, dt);
    p.parT -= dt;
    const h = this.players.get(p.parHost);
    const sl = slotsOf(p), key = ['s', 'e', 'x'].find((k) => sl[k] === 'parasite') || 's';
    const pressedQ = p.input[key] && !p.prevInput[key];
    if (!h || !h.alive || p.parT <= 0 || (pressedQ && p.parT < SKILLS.parasite.duration - 0.2)) this.endParasite(p);
  }
  endParasite(p, silent) {
    const h = this.players.get(p.parHost);
    if (h) { h.controller = null; h.input = EMPTY_INPUT(); h.prevInput = EMPTY_INPUT(); }
    p.inside = false; p.parHost = null; p.parT = 0;
    if (p.parOrigin) { p.x = p.parOrigin.x; p.y = p.parOrigin.y; }
    p.vx = 0; p.vy = 0; p.grounded = false;
    p.invincible = Math.max(p.invincible, 0.8);
    p.parHits = {};   // 다시 3번 때려야 함
    p.parOrigin = null;
    if (!silent) this.ev({ k: 'unfest', x: r0(p.x), y: r0(p.y - bh(p) / 2) });
  }

  insideSolid(x, y) {
    const hw = CONFIG.PLAYER_W / 2, h = CONFIG.PLAYER_H;
    if ((this.stage.slopes || []).some((sl) => x >= sl.x1 && x <= sl.x2 && y > slopeY(sl, x) + 2 && y - h < slopeBase(sl))) return true;
    return this.stage.solids.some((s) => x + hw > s.x && x - hw < s.x + s.w && y > s.y + 1 && y - h < s.y + s.h);
  }
  // 떨어지는 물건(터렛·지뢰)이 이번 틱에 땅/발판/빗면에 닿았으면 그 높이
  landingY(x, prevY, y) {
    let best = null;
    for (const sf of [...this.stage.solids, ...this.stage.platforms]) if (x >= sf.x && x <= sf.x + sf.w && prevY <= sf.y && y >= sf.y && (best == null || sf.y < best)) best = sf.y;
    for (const sl of this.stage.slopes || []) { if (x < sl.x1 || x > sl.x2) continue; const sy = slopeY(sl, x); if (prevY <= sy + 2 && y >= sy && (best == null || sy < best)) best = sy; }
    return best;
  }
  onPlatform(p) {
    return this.stage.platforms.some((pl) => Math.abs(p.y - pl.y) < 1 && p.x > pl.x && p.x < pl.x + pl.w);
  }
  moveAndCollide(p, dt) {
    const hw = bw(p) / 2, h = bh(p), slopes = this.stage.slopes || [];
    const wasGrounded = p.grounded, prevX = p.x;
    p.x += p.vx * dt;
    // 빗면의 높은 쪽 절벽면: 빗면 땅속으로 옆에서 파고들면 막음
    for (const sl of slopes) {
      // 빗면 높은 쪽 끝이 절벽이면 몸 옆면으로 막힘
      if (sl.wallL && p.x < sl.x1 && p.x + hw > sl.x1 && p.y > sl.y1 + 6 && p.y - h < slopeBase(sl)) { p.x = sl.x1 - hw; p.vx = Math.min(p.vx, 0); }
      if (sl.wallR && p.x > sl.x2 && p.x - hw < sl.x2 && p.y > sl.y2 + 6 && p.y - h < slopeBase(sl)) { p.x = sl.x2 + hw; p.vx = Math.max(p.vx, 0); }
      if (p.x < sl.x1 || p.x > sl.x2) continue;
      const sy = slopeY(sl, p.x), lim = 14 + Math.abs(((sl.y2 - sl.y1) / (sl.x2 - sl.x1)) * (p.x - prevX));
      if (p.y > sy + lim && p.y - h < slopeBase(sl) && !(prevX >= sl.x1 && prevX <= sl.x2 && p.y > slopeY(sl, prevX) + 14)) { p.x = prevX; p.vx = 0; }
    }
    for (const s of this.stage.solids) {
      if (p.y > s.y && p.y - h < s.y + s.h && p.x + hw > s.x && p.x - hw < s.x + s.w) {
        // 낮은 턱(빗면 끝 등)은 걸어서 넘어감
        if (wasGrounded && p.y - s.y <= 18 && !this.stage.solids.some((o) => o !== s && p.x + hw > o.x && p.x - hw < o.x + o.w && s.y > o.y && s.y - h < o.y + o.h)) { p.y = s.y; continue; }
        if (p.vx > 0 || p.x < s.x + s.w / 2) p.x = s.x - hw; else p.x = s.x + s.w + hw;
        p.vx = 0;
      }
    }
    const prevY = p.y;
    p.y += p.vy * dt; p.grounded = false;
    for (const s of this.stage.solids) {
      if (p.x + hw <= s.x || p.x - hw >= s.x + s.w) continue;
      if (p.vy >= 0 && prevY <= s.y && p.y >= s.y) { p.y = s.y; p.vy = 0; p.grounded = true; }
      else if (p.vy < 0 && prevY - h >= s.y + s.h && p.y - h < s.y + s.h) { p.y = s.y + s.h + h; p.vy = 0; }
    }
    // 빗면: 위에서 내려오거나 걸어 올라가면 표면에 섬, 내리막에선 표면에 붙어서 걸음, 아래에서 올라오면 막힘
    for (const sl of slopes) {
      if (p.x < sl.x1 || p.x > sl.x2) continue;
      const sy = slopeY(sl, p.x), grad = Math.abs((sl.y2 - sl.y1) / (sl.x2 - sl.x1));
      const tol = grad * Math.abs(p.x - prevX) + 8;
      const prevDepth = prevY - slopeY(sl, clamp(prevX, sl.x1, sl.x2));
      if (p.y >= sy && prevDepth <= 6) {
        // 위에서 닿았거나 비탈을 따라 밀려 올라감 (위로 날아가는 중이면 표면을 타고 미끄러져 올라감)
        p.y = sy;
        if (p.vy >= 0) { p.vy = 0; p.grounded = true; }
      }
      else if (wasGrounded && p.vy >= 0 && p.y < sy && sy - p.y <= tol + 4) { p.y = sy; p.vy = 0; p.grounded = true; }
      else if (p.vy < 0 && prevY - h >= slopeBase(sl) && p.y - h < slopeBase(sl)) { p.y = slopeBase(sl) + h; p.vy = 0; }
    }
    if (p.dropThrough <= 0 && p.hitstun <= 0.05) {
      for (const pl of this.stage.platforms) {
        if (p.x + hw * 0.5 <= pl.x || p.x - hw * 0.5 >= pl.x + pl.w) continue;
        if (p.vy >= 0 && prevY <= pl.y && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.grounded = true; }
      }
    }
    if (p.grounded) p.jumpsLeft = Math.max(p.jumpsLeft, CONFIG.EXTRA_JUMPS);
    if (p.grounded && p.jumpsLeft > CONFIG.EXTRA_JUMPS) p.jumpsLeft = CONFIG.EXTRA_JUMPS;
  }

  updateAttack(p, list, dt) {
    if (p.fdashT > 0) this.fireDashHits(p, list);
    if (!p.attack) return;
    const atk = p.attack, def = ATTACKS[atk.type];
    atk.t += dt * (p.slow > 0 ? SKILLS.slow.attackMul : 1);
    if (p.hitstun > 0 || p.stunT > 0 || p.iceT > 0) { p.attack = null; return; }
    const sword = has(p, 'sword') && !p.clone;
    // 검사 약공격: 보는 방향으로 돌진하며 벰
    if (sword && atk.type === 'light' && atk.t < def.startup + def.active) {
      p.vx = p.facing * SKILLS.sword.lunge * (p.slow > 0 ? SKILLS.slow.moveMul : 1);
    }
    if (atk.t >= def.startup && atk.t < def.startup + def.active && this.phase !== 'countdown' && this.phase !== 'ended') {
      // 흑섬: Q를 누른 직후에 공격이 맞기 시작하면 흑섬
      if (has(p, 'blackflash') && !atk.black && !atk.bfChecked) {
        atk.bfChecked = true;
        if (this.time - p.bfAt <= SKILLS.blackflash.window) atk.black = true;
      }
      const hb = this.hitbox(p, def);
      const fan = sword && atk.type === 'heavy';
      const cx = p.x, cy = p.y - bh(p) / 2, R = SKILLS.sword.fanR * SKILLS.sword.reachMul * this.reachBuff(p);
      const overlaps = (o) => {
        const ow = bw(o), oh = bh(o);
        const ox = o.x - ow / 2, oy = o.y - oh;
        if (fan) {
          // 부채꼴: 내 주변 반원(위쪽 + 양옆) 안에 몸이 닿으면 맞음
          const nx = clamp(cx, ox, ox + ow), ny = clamp(cy, oy, oy + oh);
          return Math.hypot(nx - cx, ny - cy) <= R && ny <= p.y + 10;
        }
        return hb.x < ox + ow && hb.x + hb.w > ox && hb.y < oy + oh && hb.y + hb.h > oy;
      };
      const hittable = (o) => this.foe(p, o) && o.alive && !o.inside && !(o.frozen > 0) && !(o.invincible > 0);
      // 분신과 주인이 한 공격에 같이 걸리면 분신만 맞음 (분신이 지켜줌)
      const shielded = new Set();
      for (const o of list) if (o.clone && hittable(o) && overlaps(o)) shielded.add(o.ownerId);
      for (const o of list) {
        if (!hittable(o) || atk.hit.has(o.id)) continue;
        if (!o.clone && shielded.has(o.id)) continue;
        if (overlaps(o)) {
          atk.hit.add(o.id);
          const dir = fan ? (Math.sign(o.x - p.x) || p.facing) : p.facing;
          if (this.parrying(o)) { this.reflectHit(p, o, def, atk.type, dir); return; }
          if (!atk.dirs) atk.dirs = new Map();
          atk.dirs.set(o.id, dir);
          atk.victims.push(o);
          this.applyHit(p, o, def, atk.type, { dir, black: !!atk.black });
          this.elementHit(p, o, atk.type, dir);
          if (o.clone) this.hitClone(o);
        }
      }
      // 터렛도 때릴 수 있음 (넉백 없음, 4번 맞으면 부서짐)
      for (const t of this.turrets) {
        if (!this.foe(p, t) || atk.hit.has('t' + t.id)) continue;
        if (overlaps({ x: t.x, y: t.y })) { atk.hit.add('t' + t.id); this.hitTurret(t, p); }
      }
    }
    if (atk.t >= def.total) p.attack = null;
  }
  // 화염·얼음: 근접 공격이 맞았을 때 추가 효과
  elementHit(a, t, type, dir) {
    if (a.clone) return;
    if (has(a, 'fire')) this.ignite(t, a, SKILLS.fire.burnHits, dir);
    if (a.sunT > 0) this.ignite(t, a, SKILLS.sun.burnHits, dir);
    if (has(a, 'ice')) this.chill(t, type === 'heavy' ? SKILLS.ice.fillHeavy : SKILLS.ice.fillLight, iceSkin(a));
  }
  ignite(t, a, n, dir) {
    // 화염 + 태양을 같이 쓰는 중이면 불 피해 2배
    t.burnMul = has(a, 'fire') && a.sunT > 0 ? 2 : 1;
    // 청염(화염)·초신성(태양) 스킨이면 파란 불
    t.burnBlue = (has(a, 'fire') && skinOn(a, 'bluefire')) || (a.sunT > 0 && skinOn(a, 'supernova') && !has(a, 'fire')) || (a.sunT > 0 && skinOn(a, 'supernova') && skinOn(a, 'bluefire'));
    t.burnN = Math.max(t.burnN || 0, n); t.burnT = SKILLS.fire.burnEvery; t.burnDir = dir || a.facing; t.burnBy = a.id;
  }
  chill(t, amount, sand) {
    if (t.iceT > 0) return;
    t.iceG = (t.iceG || 0) + amount; t.iceHitAt = this.time;
    t.iceSand = sand === 'sand' || sand === true;           // 모래 스킨이면 모래 게이지·모래에 갇힘
    t.iceAur = sand === 'aurora';                           // 오로라 스킨이면 오로라 게이지
    t.iceDark = sand === 'shadow';                          // 어둠 스킨이면 검은 게이지·어둠에 잠식
    if (t.iceG >= 100) {
      t.iceG = 0; t.iceT = SKILLS.ice.freeze; t.attack = null;
      this.ev({ k: 'iced', x: r0(t.x), y: r0(t.y - bh(t) / 2), sand: t.iceSand ? 1 : 0, dk: t.iceDark ? 1 : 0, au: t.iceAur ? 1 : 0 });
    }
  }
  // 불 붙은 상태(조금씩 밀림) · 얼음 게이지 (눈보라면 계속 참, 아니면 서서히 줄어듦)
  updateElements(p, dt) {
    if (p.burnN > 0) {
      p.burnT -= dt;
      if (p.burnT <= 0) {
        const s = SKILLS.fire;
        p.burnN--; p.burnT = s.burnEvery;
        p.damage = Math.min(p.damage + s.burnDmg * (p.burnMul || 1), 999);
        if (p.burnBy) { p.lastHitBy = p.burnBy; p.lastHitAt = this.tickCount; }
        if (p.rockT <= 0 && !(p.frozen > 0)) {
          const kb = s.burnKB * (p.buffT > 0 ? SKILLS.empower.kbMul : 1) * (1 - SKILLS.hulk.tough * hulkF(p));
          p.vx = p.burnDir * kb; p.vy = Math.min(p.vy, -kb * 0.8); p.grounded = false;
          p.hitstun = Math.max(p.hitstun, 0.08);
        }
        this.ev({ k: 'burn', x: r0(p.x), y: r0(p.y - bh(p) / 2), b: p.burnBlue ? 1 : 0 });
      }
    }
    const bz = this.blizzards.find((b) => this.foe({ id: b.by }, p));
    if (bz && !(p.frozen > 0)) this.chill(p, SKILLS.ice.blizRate * dt, bz.skin);
    else if (p.iceG > 0 && this.time - p.iceHitAt > 2) p.iceG = Math.max(0, p.iceG - SKILLS.ice.decay * dt);
  }
  // 화염 돌진: 몸 주변에 닿은 상대를 한 번씩 날리고 불붙임
  fireDashHits(p, list) {
    const s = SKILLS.fire;
    const def = { damage: s.dashDmg, baseKB: s.dashKB, growthKB: s.dashGrowth, lift: 0.4 };
    const cx = p.x, cy = p.y - bh(p) / 2;
    for (const o of list) {
      if (!this.foe(p, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0 || p.fdashHit.has(o.id)) continue;
      if (Math.abs(o.x - cx) < bw(o) / 2 + 46 && Math.abs(o.y - bh(o) / 2 - cy) < bh(o) / 2 + 40) {
        p.fdashHit.add(o.id);
        if (this.parrying(o)) { this.reflectHit(p, o, def, 'heavy', p.facing); return; }
        this.applyHit(p, o, def, 'heavy', { dir: p.facing });
        this.ignite(o, p, s.dashBurn, p.facing);
        if (o.clone) this.hitClone(o);
      }
    }
    for (const t of this.turrets) {
      if (!this.foe(p, t) || p.fdashHit.has('t' + t.id)) continue;
      if (Math.abs(t.x - cx) < 66 && Math.abs(t.y - 22 - cy) < 70) { p.fdashHit.add('t' + t.id); this.hitTurret(t, p); }
    }
  }
  hitTurret(t, by) {
    t.hp--;
    this.ev({ k: 'hit', x: r0(t.x), y: r0(t.y - 22), p: 1, rk: 1 });
    if (t.hp <= 0) {
      this.turrets = this.turrets.filter((x) => x !== t);
      this.ev({ k: 'tbreak', x: r0(t.x), y: r0(t.y - 22) });
    }
  }
  // 터렛: 떨어져서 땅에 붙고, 가까운 적을 조준해서 총알 발사
  updateTurrets(list, dt) {
    const s = SKILLS.turret;
    const firing = this.phase === 'playing' || this.phase === 'waiting';
    for (const t of [...this.turrets]) {
      const owner = this.players.get(t.owner);
      if (!owner || !owner.alive) { this.turrets = this.turrets.filter((x) => x !== t); continue; }
      // 중력 (땅이나 발판 위에 멈춤)
      const prevY = t.y;
      t.vy = Math.min(t.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL); t.y += t.vy * dt;
      { const ly = this.landingY(t.x, prevY, t.y); if (ly != null) { t.y = ly; t.vy = 0; } }
      if (t.y > this.stage.blast.bottom) { this.turrets = this.turrets.filter((x) => x !== t); continue; }
      t.cd -= dt;
      const mx = t.x, my = t.y - 30;
      let target = null, best = s.range;
      for (const o of list) {
        if (!this.foe(t, o) || !o.alive || o.inside || o.frozen > 0 || o.stealth > 0) continue;
        if (this.inSmoke(o)) continue;
        const d = Math.hypot(o.x - mx, o.y - bh(o) / 2 - my);
        if (d < best) { best = d; target = o; }
      }
      if (!target) continue;
      t.aim = Math.atan2(target.y - bh(target) / 2 - my, target.x - mx);
      if (t.cd <= 0 && firing) {
        t.cd = s.fireEvery;
        if (skinOn(owner, 'frog')) {
          // 개구리: 혀를 쭉 내밀었다가 다시 감아 들임 (뻗는 동안 혀 끝만 맞음)
          const ox = mx + Math.cos(t.aim) * 14, oy = my + Math.sin(t.aim) * 14;
          this.bullets.push({ owner: t.owner, tg: 1, ox, oy, dx: Math.cos(t.aim), dy: Math.sin(t.aim), len: 0, ext: true, max: s.bulletSpeed * s.bulletLife, x: ox, y: oy, vx: Math.cos(t.aim) * s.bulletSpeed, vy: Math.sin(t.aim) * s.bulletSpeed, t: 3 });
        } else this.bullets.push({ owner: t.owner, x: mx + Math.cos(t.aim) * 24, y: my + Math.sin(t.aim) * 24, vx: Math.cos(t.aim) * s.bulletSpeed, vy: Math.sin(t.aim) * s.bulletSpeed, t: s.bulletLife });
      }
    }
    const def = { damage: s.dmg, baseKB: s.baseKB, growthKB: s.growthKB, lift: 0.3 };
    for (const b of this.bullets) {
      if (b.tg) {
        // 혀: 뻗을 때는 앞으로, 다 뻗거나 맞히면 되돌아옴
        const sp = SKILLS.turret.bulletSpeed;
        if (b.ext) { b.len += sp * dt; if (b.len >= b.max) b.ext = false; }
        else { b.len -= sp * 1.4 * dt; if (b.len <= 0) { b.t = 0; continue; } }
        b.x = b.ox + b.dx * b.len; b.y = b.oy + b.dy * b.len;
        if (b.ext && this.solidAt(b.x, b.y)) b.ext = false;
        if (!b.ext) continue;                  // 감아 들일 때는 공격 안 됨
      } else {
        b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      }
      if (this.solidAt(b.x, b.y)) { b.t = 0; continue; }
      const owner = this.players.get(b.owner);
      if (!owner) { b.t = 0; continue; }
      for (const o of list) {
        if (!this.foe(b, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
        const ow = bw(o), oh = bh(o);
        if (b.x > o.x - ow / 2 - 6 && b.x < o.x + ow / 2 + 6 && b.y > o.y - oh - 6 && b.y < o.y + 6) {
          if (b.tg) {
            // 혀 끝에 맞음 → 혀는 되돌아감 (반사하면 그냥 되돌아감)
            b.ext = false;
            if (this.parrying(o)) { this.parried(o, b.x, b.y); break; }
            this.applyHit(owner, o, def, 'light', { dir: Math.sign(b.dx) || 1, small: true });
            if (o.clone) this.hitClone(o);
            break;
          }
          if (this.parrying(o)) { this.reflectShot(o, b); break; }
          this.applyHit(owner, o, def, 'light', { dir: Math.sign(b.vx) || 1, small: true });
          if (o.clone) this.hitClone(o);
          b.t = 0; break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.t > 0);
  }
  hitClone(o) {
    if (++o.hitsTaken >= SKILLS.clone.hits && this.clones.get(o.ownerId) === o) {
      this.clones.delete(o.ownerId);
      this.ev({ k: 'poof', x: r0(o.x), y: r0(o.y - bh(o) / 2) });
    }
  }
  // 사거리를 늘려 주는 버프들 (강화·거인·고무·헐크) — 검사 검에도 똑같이 적용
  reachBuff(p) {
    let m = 1;
    if (p.buffT > 0) m *= SKILLS.empower.reachMul;
    if (p.giantT > 0) m *= SKILLS.giant.reachMul;
    if (p.rubberT > 0) m *= SKILLS.rubber.reachMul;
    if (has(p, 'hulk')) m *= 1 + SKILLS.hulk.reach * hulkF(p);
    return m;
  }
  hitbox(p, def) {
    const hw = bw(p) / 2, size = sizeOf(p);
    let reach = def.reach * this.reachBuff(p);
    if (has(p, 'sword') && !p.clone) reach *= SKILLS.sword.reachMul;
    const h = def.height * size;
    const x = p.facing > 0 ? p.x + hw - 6 : p.x - hw + 6 - reach;
    return { x, y: p.y - bh(p) / 2 - h / 2 - 4 * size, w: reach, h };
  }
  applyHit(a, t, def, type, opt = {}) {
    t.damage = Math.min(t.damage + def.damage, 999);
    t.attack = null;
    t.lastHitBy = a.ownerId || a.id; t.lastHitAt = this.tickCount;
    if (type === 'heavy') t.heavyHitAt = this.time;
    // 기생 준비: 같은 상대를 때린 횟수
    // 콤보: 때릴 때마다 스택 (스매시 자체는 제외)
    // 원자: 때릴 때마다 전자 +1 (전자 자체로 맞힌 건 제외)
    if (has(a, 'atom') && !a.clone && !opt.electron) { a.electrons = Math.min(SKILLS.atom.max, (a.electrons || 0) + 1); a.eLast = this.time; a.eDecayT = 0; }
    if (has(a, 'combo') && !a.clone && !opt.smash) a.combo = Math.min(SKILLS.combo.maxStack, (a.combo || 0) + 1);
    if (!t.clone && has(a, 'parasite') && !a.clone) a.parHits[t.id] = (a.parHits[t.id] || 0) + 1;
    // 비행 중 올라가다 맞으면 잠시 내려감
    if (t.flyT > 0 && t.vy < 0) t.flyDownT = SKILLS.fly.hitDrop;
    this.launch(a, t, def, type, opt);
  }
  // 맞은 상대를 날려 보냄 (흑섬이면 더 세게 + 강공격은 스턴)
  launch(a, t, def, type, opt = {}) {
    const black = !!opt.black;
    if (black) {
      const s = SKILLS.blackflash;
      if (type === 'heavy') t.stunT = Math.max(t.stunT || 0, s.stun);
      this.ev({ k: 'bflash', x: r0(t.x), y: r0(t.y - bh(t) / 2), p: type === 'heavy' ? 2 : 1, g: skinOn(a, 'oneforall') ? 1 : 0, ax: r0(a.x), ay: r0(a.y - bh(a) / 2) });
    }
    if (t.rockT > 0) {
      // 바위: 넉백과 경직 없음
      this.ev({ k: 'hit', x: r0(t.x), y: r0(t.y - bh(t) / 2), p: type === 'heavy' ? 2 : 1, rk: 1 });
      return;
    }
    // 흑섬 약공격은 강공격만큼, 흑섬 강공격은 그보다 더 세게
    const kdef = black ? ATTACKS.heavy : def;
    let kb = (kdef.baseKB + kdef.growthKB * t.damage) * (t.buffT > 0 ? SKILLS.empower.kbMul : 1);
    if (black && type === 'heavy') kb *= SKILLS.blackflash.heavyKbMul;
    if (has(a, 'hulk')) kb *= 1 + SKILLS.hulk.power * hulkF(a);
    if (a.sunT > 0 && !opt.small) kb *= SKILLS.sun.kbMul;
    if (has(a, 'wind') && !opt.small) kb *= SKILLS.wind.kbMul;               // 바람: 더 날아감                      // 태양: 세게 침          // 헐크: 세게 침
    if (has(t, 'hulk')) kb *= 1 - SKILLS.hulk.tough * hulkF(t);          // 헐크: 덜 날아감
    if (t.giantT > 0) kb *= SKILLS.giant.kbMul;                       // 거인은 덜 날아감
    if (a.engineT > 0) {                                               // 엔진: 빠를수록 세게
      const e = SKILLS.engine;
      kb *= Math.min(e.kbMax, 1 + (Math.abs(a.vx) / CONFIG.RUN_SPEED) * e.kbPerSpeed);
    }
    const dir = opt.dir || a.facing;
    t.vx = dir * kb * 0.85; t.vy = -kb * (black ? kdef.lift : def.lift) - 120;
    t.grounded = false; t.hitstun = 0.15 + kb * 0.00025;
    this.ev({ k: 'hit', x: r0(t.x), y: r0(t.y - bh(t) / 2), p: opt.small ? 0 : type === 'heavy' || black ? 2 : 1, fx: skinFx(a) });
  }
  // 검사 참격: 앞으로 날아가며 닿는 상대를 한 번씩 벰 (벽에 막히면 사라짐)
  updateSlashes(list, dt) {
    if (!this.slashes.length) return;
    const s = SKILLS.sword;
    const def = { damage: s.slashDmg, baseKB: s.slashKB, growthKB: s.slashGrowth, lift: 0.42 };
    for (const sl of this.slashes) {
      sl.t -= dt; sl.x += sl.vx * dt;
      const owner = this.players.get(sl.owner);
      if (!owner || this.insideSolid(sl.x, sl.y + 30)) { sl.t = 0; continue; }
      if (this.phase === 'countdown' || this.phase === 'ended') continue;
      for (const t of this.turrets) {
        if (!this.foe(sl, t) || sl.hit.has('t' + t.id)) continue;
        if (Math.abs(t.x - sl.x) < 46 && Math.abs(t.y - 22 - sl.y) < 60) { sl.hit.add('t' + t.id); this.hitTurret(t, owner); }
      }
      for (const o of list) {
        if (!this.foe(sl, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0 || sl.hit.has(o.id)) continue;
        const ow = bw(o), oh = bh(o);
        if (Math.abs(o.x - sl.x) < ow / 2 + 26 && sl.y > o.y - oh - 30 && sl.y < o.y + 30) {
          if (this.parrying(o)) { this.reflectShot(o, sl); sl.hit.add(o.id); break; }
          sl.hit.add(o.id);
          this.applyHit(owner, o, def, 'light', { dir: Math.sign(sl.vx) });
          if (o.clone) this.hitClone(o);
        }
      }
    }
    this.slashes = this.slashes.filter((sl) => sl.t > 0);
  }
  // 분신이 무대 밖으로 날아가면 주인 옆으로 돌아옴 (KO 아님)
  checkCloneBounds(c) {
    const b = this.stage.blast;
    if (c.x > b.left && c.x < b.right && c.y > b.top && c.y < b.bottom) return;
    const owner = this.players.get(c.ownerId);
    if (!owner) return;
    const ox = owner.inside && owner.parOrigin ? owner.parOrigin.x : owner.x;
    const oy = owner.inside && owner.parOrigin ? owner.parOrigin.y : owner.y;
    c.x = ox; c.y = oy; c.vx = 0; c.vy = 0; c.hitstun = 0; c.damage = 0;
  }
  checkBlast(p) {
    const b = this.stage.blast;
    if (p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom) return;
    this.ev({ k: 'ko', x: r0(clamp(p.x, 0, this.stage.width)), y: r0(clamp(p.y, 0, this.stage.height)), n: p.name });
    if (p.controller) { const c = this.players.get(p.controller); if (c) this.endParasite(c); }
    if (p.lastHitBy && this.tickCount - p.lastHitAt < CONFIG.TICK_RATE * 5 && this.phase === 'playing') {
      const killer = this.players.get(p.lastHitBy);
      if (killer && killer !== p) { if (p.dummy) { /* 더미는 보석 없음 */ } else if (p.bot) killer.botKos = (killer.botKos || 0) + 1; else killer.kos++; }
    }
    const keep = { wins: p.wins, skill: p.skill };
    // 전환·시간: 죽어도 쿨타임이 초기화되지 않음
    if (p.skill === 'swap' || p.skill === 'time') keep.skillCd = p.skillCd;
    if (p.skill2 === 'swap' || p.skill2 === 'time') keep.skillCdB = p.skillCdB;
    // 콤보: 죽어도 콤보 수 유지
    if (has(p, 'combo')) keep.combo = p.combo || 0;
    if (this.phase !== 'playing' || !p.inMatch) {
      // 연습 중(대기실)에 떨어져도 콤보·전환·시간 쿨타임은 그대로
      p.reset(this.stage.respawn.x, this.stage.respawn.y); Object.assign(p, keep); p.invincible = CONFIG.RESPAWN_INVINCIBLE; return;
    }
    p.stocks--;
    if (p.stocks > 0) { p.reset(this.stage.respawn.x, this.stage.respawn.y); Object.assign(p, keep); p.invincible = CONFIG.RESPAWN_INVINCIBLE; }
    else { p.alive = false; this.clones.delete(p.id); this.removeTurrets(p.id); this.checkWinner(); }
  }

  inSmoke(o) {
    const x = o.x, y = o.y - bh(o) / 2;
    return this.smokes.some((s) => Math.hypot(x - s.x, y - s.y) < s.r * 0.9);
  }
  snapshot() {
    const ap = (p) => {
      if (!p.attack) return 0;
      const d = ATTACKS[p.attack.type];
      return p.attack.t < d.startup ? 1 : p.attack.t < d.startup + d.active ? 2 : 3;
    };
    const ten = (v) => Math.ceil(v * 10) / 10;
    const status = (p) => ({
      sl: p.slow > 0 ? 1 : 0, stl: p.stealth > 0 ? 1 : 0, frz: p.frozen > 0 ? 1 : 0,
      fly: p.flyT > 0 ? 1 : 0, rk: p.rockT > 0 ? 1 : 0, bf: p.buffT > 0 ? 1 : 0,
      gt: p.giantT > 0 ? 1 : 0, rb: p.rubberT > 0 ? 1 : 0, en: p.engineT > 0 ? 1 : 0,
      stn: p.stunT > 0 ? 1 : 0, qk: p.quakeT > 0 ? 1 : 0,
      sz: Math.round(sizeOf(p) * 100) / 100, ig: Math.round(p.iceG || 0), icd: p.iceT > 0 ? 1 : 0,
      brn: p.burnN > 0 ? 1 : 0, fd: p.fdashT > 0 ? 1 : 0,
      er: p.errT > 0 ? 1 : 0, sun: p.sunT > 0 ? 1 : 0,
      rv: p.invT > 0 ? 1 : 0, pa: p.parryT > 0 ? 1 : 0,
      el: p.electrons > 0 ? [p.electrons, Math.round(p.ePhase * 100) / 100, p.eBoostT > 0 ? 1 : 0] : 0,
      ts: this.timeSaves.has(p.id) ? [r0(this.timeSaves.get(p.id).x), r0(this.timeSaves.get(p.id).y)] : 0,
      dr: p.drawT > 0 ? Math.round(p.drawT * 100) / 100 : 0, cb: p.combo || 0, hm: p.homingNext ? 1 : 0,
      smk: this.inSmoke(p) ? 1 : 0,
    });
    return {
      ph: this.phase, tm: Math.ceil(this.timer), w: this.winner, wi: this.winnerId, wt: this.winTeam,
      md: [this.teamMode ? 1 : 0, this.doubleMode ? 1 : 0], s: this.tickCount, mp: this.stage.id,
      ev: this.recent.slice(-10),
      ar: this.arrows.map((a) => ({ x: r0(a.x), y: r0(a.y), vx: r0(a.vx), vy: r0(a.vy), h: a.homing ? 1 : 0, de: a.de ? 1 : undefined, lf: a.lf ? 1 : undefined, el: a.el || undefined, s: a.big > 1 ? Math.round(a.big * 10) / 10 : undefined })),
      wd: this.winds.map((w) => { const o = this.players.get(w.owner); return { i: w.id, x: r0(w.x), y: r0(w.y), vx: w.vx, r: o && skinOn(o, 'firetornado') ? 1 : 0 }; }),
      mn: this.mines.map((m) => ({ x: r0(m.x), y: r0(m.y), c: m.color, a: m.arm > 0 ? 0 : 1 })),
      tr: this.turrets.map((t) => { const o = this.players.get(t.owner); return { i: t.id, x: r0(t.x), y: r0(t.y), a: Math.round(t.aim * 100) / 100, hp: t.hp, c: t.color, o: t.owner, fg: o && skinOn(o, 'frog') ? 1 : 0 }; }),
      bl: this.bullets.map((b) => { const o = this.players.get(b.owner), c = o ? o.color : '#fff'; return b.tg ? { tg: 1, ox: r0(b.ox), oy: r0(b.oy), x: r0(b.x), y: r0(b.y), vx: 0, vy: 0, c } : { x: r0(b.x), y: r0(b.y), vx: r0(b.vx), vy: r0(b.vy), c }; }),
      bz: this.blizzards.length ? Math.ceil(Math.max(...this.blizzards.map((b) => b.t)) * 10) / 10 : 0,
      bzs: this.blizzards.some((b) => b.sand) ? 1 : 0,
      bza: this.blizzards.some((b) => b.skin === 'aurora') ? 1 : 0,
      bzd: this.blizzards.some((b) => b.skin === 'shadow') ? 1 : 0,
      pj: this.slashes.map((sl) => { const o = this.players.get(sl.owner); return { i: sl.id, x: r0(sl.x), y: r0(sl.y), vx: sl.vx, o: sl.owner, d: o && skinOn(o, 'darkness') ? 1 : 0, ho: o && skinOn(o, 'holyknight') ? 1 : 0 }; }),
      sm: this.smokes.map((s) => ({ x: r0(s.x), y: r0(s.y), r: s.r, a: Math.round((s.t / s.max) * 100) / 100 })),
      p: this.list().map((p) => ({
        id: p.id, n: p.name, c: p.color, x: r0(p.x), y: r0(p.y), f: p.facing,
        g: p.grounded ? 1 : 0, vx: r0(p.vx), vy: r0(p.vy), dmg: p.damage, st: p.stocks,
        al: p.alive ? 1 : 0, im: p.inMatch ? 1 : 0, at: p.attack ? (p.attack.type === 'heavy' ? 2 : 1) : 0,
        ap: ap(p), inv: p.invincible > 0 ? 1 : 0, hs: p.hitstun > 0 || p.stunT > 0 ? 1 : 0, ms: has(p, 'undying') ? SKILLS.undying.lives : CONFIG.STOCKS, ko: p.kos, wn: p.wins, b: p.bot ? 1 : 0, dm: p.dummy ? 1 : 0,
        sk: p.skill, cd: ten(p.skillCd), cd2: ten(p.skillCd2), sk2: p.skill2, cdB: ten(p.skillCdB), tm: p.team,
        ...status(p),
        ft: ten(p.flyT), rt: ten(p.rockT), bt: ten(p.buffT),
        chg: has(p, 'empower') ? (p.charged ? 100 : Math.floor((p.stillT / SKILLS.empower.charge) * 100)) : 0,
        pr: has(p, 'parasite') ? Object.values(p.parHits).filter((n) => n >= SKILLS.parasite.hitsNeeded).length : 0,
        isd: p.iceSand ? 1 : 0, iau: p.iceAur ? 1 : 0, idk: p.iceDark ? 1 : 0, slm: p.slow > 0 && p.slowMud ? 1 : 0, sn: activeSkins(p), bb: p.burnN > 0 && p.burnBlue ? 1 : 0,
        ins: p.inside ? 1 : 0, phost: p.parHost, pt: ten(p.parT), ctl: p.controller, rd: p.ready ? 1 : 0,
      })),
      cl: [...this.clones.values()].map((c) => ({
        id: c.id, ow: c.ownerId, n: c.name, c: c.color, x: r0(c.x), y: r0(c.y), f: c.facing,
        g: c.grounded ? 1 : 0, vx: r0(c.vx), vy: r0(c.vy), al: 1, at: 0, ap: 0,
        sk: c.skill, sk2: c.skill2, sn: this.players.get(c.ownerId) ? activeSkins(this.players.get(c.ownerId)) : [],
        hs: c.hitstun > 0 || c.stunT > 0 ? 1 : 0, b: c.bot ? 1 : 0, inv: 0, ...status(c),
      })),
    };
  }
}

// ---------------- 봇 ----------------
function botThink(sim, b) {
  const inp = EMPTY_INPUT();
  if (!b.alive || b.hitstun > 0 || b.stunT > 0 || b.iceT > 0 || b.fdashT > 0 || b.inside || b.frozen > 0) {
    // 기생 중인 봇: 3~5초 뒤 빠져나옴
    if (b.inside && b.parT < 3 && Math.random() < 0.02) {
      const sl = slotsOf(b), key = ['s', 'e', 'x'].find((q) => sl[q] === 'parasite') || 's';
      if (!b.prevInput[key]) inp[key] = 1;
    }
    return inp;
  }
  let wantJump = false;
  const st = sim.stage;
  // 지진에 흔들리는 봇: 방향을 마구 바꾸고, 아무 데나 휘두름
  // 반전에 걸린 봇: 헷갈려서 이상하게 움직임 (방향을 자꾸 바꾸고, 엉뚱한 데 휘두르고, 괜히 점프)
  if (b.invT > 0 && Math.random() < 0.45) {
    if (!b.cfT || b.cfT <= 0) { b.cfDir = Math.random() < 0.5 ? -1 : 1; b.cfT = 10 + Math.floor(Math.random() * 25); }
    b.cfT--;
    if (b.cfDir > 0) inp.r = 1; else inp.l = 1;
    if (Math.random() < 0.06 && !b.prevInput.u) inp.u = 1;
    if (!b.attack && Math.random() < 0.06) { if (Math.random() < 0.4) inp.h = 1; else inp.a = 1; }
    return inp;
  }
  if (b.quakeT > 0) {
    if (!b.qDirT || b.qDirT <= 0) { b.qDir = [-1, 0, 1][Math.floor(Math.random() * 3)]; b.qDirT = 6 + Math.floor(Math.random() * 18); }
    b.qDirT--;
    if (b.qDir > 0) inp.r = 1; else if (b.qDir < 0) inp.l = 1;
    if (Math.random() < 0.05 && !b.prevInput.u) inp.u = 1;
    if (!b.attack && Math.random() < 0.08) { if (Math.random() < 0.35) inp.h = 1; else inp.a = 1; }
    if (b.grounded && Math.random() < 0.02 && sim.onPlatform(b)) inp.d = 1;
    return inp;
  }
  const offstage = !sim.surfaceBelow(b.x, b.y) || b.y > st.floor + 30;
  const sk = b.skill;
  // 스킬을 쓰고 싶으면 그 스킬이 배치된 키(Q/E/R)를 누름
  const use = (k) => { const sl = slotsOf(b); const key = ['s', 'e', 'x'].find((q) => sl[q] === k); if (key) inp[key] = 1; };
  const skillList = [[b.skill, b.skillCd <= 0]];
  if (b.skill2) skillList.push([b.skill2, b.skillCdB <= 0]);
  // 땅 끝에서 멈추기 (건너편에 갈 땅이 가까우면 점프)
  const edgeGuard = () => {
    if (!b.grounded) return;
    const dir = inp.r ? 1 : inp.l ? -1 : 0;
    if (!dir || sim.surfaceBelow(b.x + dir * 34, b.y)) return;
    const gapLand = [...st.solids, ...st.platforms].some((s) => (dir > 0 ? s.x > b.x && s.x - b.x < 260 : b.x > s.x + s.w && b.x - (s.x + s.w) < 260) && s.y <= b.y + 40);
    if (gapLand && Math.random() < 0.5) wantJump = true;
    else { inp.l = 0; inp.r = 0; }
  };
  if (offstage) {
    const home = sim.nearestSurfaceX(b.x);
    if (home > b.x) inp.r = 1; else inp.l = 1;
    if (b.vy > 100 || b.grounded) wantJump = true;
    for (const [k, rd] of skillList) {
      if (k === 'blink' && rd && b.jumpsLeft === 0 && b.vy > 0) { inp.u = 1; use(k); }
      if (k === 'fly' && rd && b.jumpsLeft === 0 && b.vy > 0) use(k);
    }
    if (b.flyT > 0) inp.u = 1;
  } else {
    let target = null, best = 1e9;
    for (const o of [...sim.players.values(), ...sim.clones.values()]) {
      if (!sim.foe(b, o) || !o.alive || o.inside || o.invincible > 0 || o.frozen > 0) continue;
      if (o.stealth > 0) continue;
      // 연기 속에 있는 상대는 봇도 볼 수 없음
      if (sim.smokes.some((s) => Math.hypot(o.x - s.x, o.y - bh(o) / 2 - s.y) < s.r * 0.75)) continue;
      const d = Math.abs(o.x - b.x) + Math.abs(o.y - b.y);
      if (d < best) { best = d; target = o; }
    }
    // 연기가 있으면 그 안에 누가 있는지 모른 채 아무 데나 때려 봄
    const smoke = sim.smokes.length ? sim.smokes.reduce((m, s) => (Math.abs(s.x - b.x) < Math.abs(m.x - b.x) ? s : m)) : null;
    if (smoke && (!target || Math.abs(smoke.x - b.x) + 60 < best) && Math.random() < 0.985) {
      if (!b.pokeT || b.pokeT <= 0 || !b.pokeX) {
        b.pokeX = clamp(smoke.x + (Math.random() - 0.5) * smoke.r * 1.4, st.left + 30, st.right - 30);
        b.pokeT = 30 + Math.floor(Math.random() * 40);
      }
      b.pokeT--;
      const pdx = b.pokeX - b.x;
      if (Math.abs(pdx) > 20) { if (pdx > 0) inp.r = 1; else inp.l = 1; }
      else if (Math.random() < 0.3) { inp.l = 0; inp.r = 0; if (Math.random() < 0.5) inp.r = 1; else inp.l = 1; }
      if (b.botCd > 0) b.botCd--;
      if (Math.abs(b.x - smoke.x) < smoke.r && !b.attack && b.botCd <= 0 && Math.random() < 0.25) {
        if (Math.random() < 0.3) inp.h = 1; else inp.a = 1;
        b.botCd = 10 + Math.floor(Math.random() * 20);
      }
      if (b.grounded && smoke.y < b.y - 150 && Math.random() < 0.05) wantJump = true;
      edgeGuard();
      if (wantJump && !b.prevInput.u) inp.u = 1;
      return inp;
    }
    if (target) {
      const dx = target.x - b.x, dy = target.y - b.y;
      const side = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > 55) { if (side > 0) inp.r = 1; else inp.l = 1; }
      else if (b.facing !== side && !b.attack) { if (side > 0) inp.r = 1; else inp.l = 1; }
      if (dy < -90 && b.grounded) wantJump = true;
      if (b.flyT > 0 && dy < -40) inp.u = 1;
      if (dy > 60 && b.grounded && sim.onPlatform(b)) inp.d = 1;
      if (b.botCd > 0) b.botCd--;
      const R = Math.random();
      for (const [sk, ready] of skillList) {
        if (sk === 'slow' && ready && best < 170 && R < 0.05) use(sk);
        if (sk === 'stealth' && ready && best < 260 && R < 0.03) use(sk);
        if (sk === 'clone' && ready && !sim.clones.has(b.id) && best < 320 && R < 0.04) use(sk);
        if (sk === 'swap' && ready && R < 0.008) use(sk);
        if (sk === 'fly' && ready && dy < -120 && R < 0.03) use(sk);
        if (sk === 'explode' && ready && best < 140 && R < 0.06) use(sk);
        if (sk === 'freeze' && ready && best < 160 && R < 0.04) use(sk);
        if (sk === 'rock' && ready && b.damage > 60 && best < 220 && R < 0.04) use(sk);
        if (sk === 'magnet' && ready && best > 120 && best < 300 && R < 0.03) use(sk);
        if (sk === 'magnet' && b.skillCd2 <= 0 && best < 110 && (target.x < st.left + 90 || target.x > st.right - 90) && R < 0.08) inp.e = 1;
        if (sk === 'sword' && ready && Math.abs(dy) < 50 && b.facing === side && Math.abs(dx) > 120 && Math.abs(dx) < 600 && R < 0.05) use(sk);
        if (sk === 'lightning' && ready && best < 380 && R < 0.04) use(sk);
        if (sk === 'fire' && ready && Math.abs(dy) < 50 && b.facing === side && Math.abs(dx) < 300 && R < 0.05) use(sk);
        if (sk === 'ice' && ready && best < 500 && R < 0.02) use(sk);
        if (sk === 'error' && ready && best < 450 && R < 0.02) use(sk);
        if (sk === 'sun' && ready && best < 280 && R < 0.04) use(sk);
        if (sk === 'turret' && ready && b.grounded && best < 520 && R < 0.03) use(sk);
        if (sk === 'wind' && ready && b.facing === side && Math.abs(dx) < 420 && Math.abs(dy) < 90 && R < 0.04) use(sk);
        if (sk === 'archer' && ready && !b.homingNext && best > 250 && R < 0.03) use(sk);
        if (sk === 'time' && ready) {
          // 봇: 다쳤을 때 저장해 두지 않고, 멀쩡할 때 저장 → 많이 맞으면 되돌림
          const sv = sim.timeSaves.get(b.id);
          if (!sv && b.damage < 20 && R < 0.02) use(sk);
          else if (sv && (b.damage > 90 || b.stocks < sv.snap.players.get(b.id).stocks) && R < 0.05) use(sk);
        }
        if (sk === 'invert' && ready && best < 500 && R < 0.02) use(sk);
        if (sk === 'atom' && ready && b.electrons >= 3 && best < 140 && R < 0.06) use(sk);
        if (sk === 'mine' && ready && b.grounded && R < 0.03) use(sk);
        if (sk === 'reflect' && ready) {
          // 가까운 적이 공격 중이거나 화살·참격·총알이 날아오면 가끔 반사 시도
          const near = [...sim.players.values()].some((o) => sim.foe(b, o) && o.attack && Math.abs(o.x - b.x) < 130 && Math.abs(o.y - b.y) < 80)
            || [...sim.arrows, ...sim.slashes, ...sim.bullets].some((q) => sim.foe(q, b) && Math.abs(q.x - b.x) < 110 && Math.abs(q.y - (b.y - 30)) < 60);
          if (near && R < 0.25) use(sk);
        }
        if (sk === 'combo' && b.combo >= 5 && best < SKILLS.combo.baseR + SKILLS.combo.perR * b.combo && R < 0.08) use(sk);
        if (sk === 'blackflash' && ready && b.attack && !b.attack.black) {
          // 봇은 가끔 타이밍을 맞춤
          const d = ATTACKS[b.attack.type];
          if (b.attack.t >= d.startup - 0.05 && b.attack.t <= d.startup + d.active && R < 0.35) use(sk);
        }
        if (sk === 'empower' && b.charged && best < 250) use(sk);
        if (sk === 'quake' && ready && best < 400 && R < 0.01) use(sk);
        if ((sk === 'giant' || sk === 'rubber') && ready && best < 200 && R < 0.04) use(sk);
        if (sk === 'engine' && ready && best > 200 && R < 0.03) use(sk);
        if (sk === 'parasite' && Object.values(b.parHits).some((n) => n >= SKILLS.parasite.hitsNeeded) && R < 0.03) use(sk);
      }
      // 궁수 봇: 멀리 있으면 시위를 당겼다가 쏨
      if (has(b, 'archer')) {
        if (b.archHold > 0) { b.archHold--; inp.h = 1; inp.l = 0; inp.r = 0; if (b.facing !== side) { if (side > 0) inp.r = 1; else inp.l = 1; } }
        else if (Math.abs(dx) > 140 && Math.abs(dy) < 120 && b.facing === side && !b.attack && b.botCd <= 0 && Math.random() < 0.05) { b.archHold = 20 + Math.floor(Math.random() * 45); inp.h = 1; }
      }
      if (b.archHold > 0) { /* 시위 당기는 중 */ } else if (Math.abs(dx) < 80 && Math.abs(dy) < 50 && b.facing === side && !b.attack && b.botCd <= 0) {
        if (target.damage > 70 && Math.random() < 0.5) inp.h = 1; else inp.a = 1;
        b.botCd = 14 + Math.floor(Math.random() * 18);
      }
    }
    edgeGuard();
    // 벽에 막혀 못 가면 점프
    if (b.grounded && (inp.l || inp.r) && Math.abs(b.vx) < 30) { b.stuckT = (b.stuckT || 0) + 1; if (b.stuckT > 12) { wantJump = true; b.stuckT = 0; } }
    else b.stuckT = 0;
  }
  if (wantJump && !b.prevInput.u) inp.u = 1;
  if (inp.s && b.prevInput.s) inp.s = 0;
  if (inp.e && b.prevInput.e) inp.e = 0;
  if (inp.x && b.prevInput.x) inp.x = 0;
  return inp;
}

// ---------------- 분신 움직임 ----------------
// 주인 근처를 왔다 갔다 하다가, 적이 다가오면 주인과 적 사이를 막아섬. 공격은 안 함.
function cloneThink(sim, c, owner) {
  const inp = EMPTY_INPUT();
  if (c.hitstun > 0 || c.stunT > 0 || c.iceT > 0) return inp;
  const ox = owner.inside && owner.parOrigin ? owner.parOrigin.x : owner.x;
  const oy = owner.inside && owner.parOrigin ? owner.parOrigin.y : owner.y;
  let targetX;
  let enemy = null, best = 1e9;
  for (const o of sim.players.values()) {
    if (!sim.foe(owner, o) || !o.alive || o.inside) continue;
    const d = Math.abs(o.x - ox) + Math.abs(o.y - oy);
    if (d < best) { best = d; enemy = o; }
  }
  if (enemy && best < 320) {
    const side = enemy.x >= ox ? 1 : -1;
    targetX = ox + side * 55;
    c.faceTo = side;
  } else {
    if (--c.patrolT <= 0) { c.patrol = -c.patrol || 1; c.patrolT = 60 + Math.floor(Math.random() * 60); }
    targetX = ox + c.patrol * 75;
    c.faceTo = owner.facing;
  }
  const st = sim.stage;
  targetX = clamp(targetX, st.left + 20, st.right - 20);
  if (!sim.surfaceBelow(targetX, c.y)) targetX = sim.nearestSurfaceX(targetX);
  const dx = targetX - c.x;
  if (Math.abs(dx) > 14) { if (dx > 0) inp.r = 1; else inp.l = 1; }
  else if (c.facing !== c.faceTo) { if (c.faceTo > 0) inp.r = 1; else inp.l = 1; }
  const dy = oy - c.y;
  let wantJump = false;
  if (dy < -80 && c.grounded) wantJump = true;
  const lost = !sim.surfaceBelow(c.x, c.y) || c.y > st.floor + 30;
  if (!c.grounded && c.vy > 200 && lost) wantJump = true;
  if (dy > 60 && c.grounded && sim.onPlatform(c)) inp.d = 1;
  if (lost) { const home = sim.nearestSurfaceX(c.x); inp.r = home > c.x ? 1 : 0; inp.l = home > c.x ? 0 : 1; }
  if (wantJump && !c.prevInput.u) inp.u = 1;
  return inp;
}

module.exports = { Sim, MAPS, COLORS, CONFIG, SKILLS, SKILL_IDS, BOT_NAMES, TEAMS, validSkill, cleanInput, EMPTY_INPUT, slotsOf };
