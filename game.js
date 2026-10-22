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
  sword:    { name: '검사', cd: 12, heavyGap: 0.3, reachMul: 1.25, lunge: 620, fanR: 125, slashSpeed: 950, slashLife: 0.65, slashDmg: 9, slashKB: 380, slashGrowth: 12 },
  // 흑섬: Q 자체는 이펙트만. 공격이 맞는 순간과 같은 타이밍(±window초)이면 넉백 강화
  blackflash: { name: '흑섬', cd: 0, window: 0.1, mobWindow: 0.17, heavyKbMul: 1.45, stun: 0.7 },
  lightning: { name: '번개', cd: 13, radius: 480, count: 3, damage: 10, stun: 3 },
  undying:  { name: '불사', lives: 5 },                                   // 목숨 5개 (패시브)
  // 헐크: 퍼센트(맞은 정도)가 높을수록 커지고 강해짐 (패시브). maxAt% 에서 최대
  hulk:     { name: '헐크', maxAt: 110, size: 0.9, reach: 0.8, power: 1.8, slow: 0.25, tough: 0.5, grow: 1.1 },
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
  wind:     { name: '바람', cd: 11, kbMul: 1.3, speed: 520, life: 1.6, w: 70, h: 170, dmg: 5, throwKB: 720 },
  // 궁수: 강공격을 누르고 있으면 시위를 당김 (full초면 최대), 놓으면 발사. Q는 다음 화살을 유도 화살로
  archer:   { name: '궁수', heavyGap: 0.5, cd: 13, full: 1, minSpeed: 650, maxSpeed: 1400, gravity: 520, homingSpeed: 760, homingLife: 3, turn: 7 },
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
  // 닌자: 쿠나이를 듦. 강공격 = 바로 직선으로 쿠나이 던지기(중력 X, 던진 뒤 0.4초 뒤 다시). Q = 통나무 남기고 랜덤한 안전한 곳으로 순간이동
  ninja:    { name: '닌자', cd: 13, heavyGap: 0.4, speed: 1150, life: 0.75, dmg: 6, baseKB: 240, growthKB: 7, logLife: 3 },
  // 도박: 판 시작하면 자동으로 굴림. 사거리·주는 넉백·받는 넉백·점프·속도·크기가 각각 0.0~2.0배 (쿨 20초)
  gamble:   { name: '도박', cd: 20, minSize: 0.3 },
  // 별빛: 별 카운트(시작 1, 10초마다 +1, 죽을 때마다 +1, 최대 5)를 모두 써서 하늘에서 사선으로 별비. 카운트가 많을수록 별이 많고 크고 세게 밀어냄
  starlight: { name: '별빛', cd: 1, every: 10, max: 5, start: 1, spawnTime: 1.1, fallVX: 330, fallVY: 760 },
  // 방패: 약공격 = 방패 막기(앞에서 오는 공격), 강공격 = 방패 휘두르기(넉백↑). Q를 누르고 있다 놓으면 던짐(오래 누를수록 멀리).
  //       맞거나 벽에 부딪히면 살짝 튕겨 돌아옴. 내가 가까이 가면 주움. 장외로 떨어지면 10초 뒤 다시 생김
  shield:   { name: '방패', blockTime: 0.45, blockGap: 0.2, bashKB: 1.25, full: 1, minSpeed: 520, maxSpeed: 1300, flyMin: 0.22, flyMax: 0.75,
              gravity: 1500, dmg: 9, baseKB: 360, growthKB: 9, back: 0.35, respawn: 10, pickR: 60 },
  // 촉수: 등 뒤 촉수 4개. 약공격(J)=위 촉수 2개, 강공격(K)=아래 촉수 2개를 번갈아 뻗어 공격. Q = 아래 촉수 2개(K·L)로 땅을 짚고 8초간 중력 없이 이동 (맨 밑 바닥까지만, 넉백 거의 없음)
  tentacle: { name: '촉수', cd: 18, anchor: 8, reach: 150, out: 0.13, hold: 0.07, back: 0.16, gap: 1.5, dmg: 6, baseKB: 250, growthKB: 9, anchorKB: 0.2, speed: 360 },
  // 귀신: 목숨이 다 없어지면 5초간 귀신(중력·벽 무시, WASD 이동, 안 맞음). 한 명을 3번 때리면 그 사람도 장외
  ghost:    { name: '귀신', time: 5, marks: 3, speed: 430 },
  // 섬광: 내 자리에서 섬광이 터짐 → 주변을 살짝 밀고, 가까울수록 오래 화면이 하얘짐. 터진 자리엔 몇 초간 (나 말고는) 안이 안 보이는 빛 자국
  wave:     { name: '파동', cd: 13, duration: 7, radius: 230, kb: 460, kbMul: 1.45, speedMul: 1.3, jumpMul: 1.25, reachMul: 2 },
  dope:     { name: '도핑', max: 3, every: 7, buff: 5, debuff: 3, amt: 0.35, grab: 50 },
  flash:    { name: '섬광', cd: 10, radius: 210, zoneTime: 4, kbR: 260, kb: 300, blindR: 700, blindMax: 3 },
  // 홍수: Q마다 아래에서 물이 참 (여러 번 쓰면 더 높이). 홍수 사용자는 헤엄치고, 다른 사람은 느려지고 숨이 참
  flood:    { name: '홍수', cd: 12, rise: 120, riseSpeed: 140, hold: 15, recede: 22, fullHold: 10, drainTime: 5, breath: 10,
              moveMul: 0.55, jumpMul: 0.7, atkMul: 0.6, swim: 1.15, proj: 0.45, dash: 0.5, stunMul: 1.6, iceMul: 1.6 },
  turret:   { name: '터렛', cd: 12, max: 3, hp: 4, range: 560, fireEvery: 0.9, bulletSpeed: 820, bulletLife: 0.9, dmg: 3, baseKB: 210, growthKB: 5 },
};
const SKILL_IDS = Object.keys(SKILLS);

const MAPS = require('./public/maps.js');   // 맵 목록 (판마다 랜덤)
const COLORS = MAPS.COLORS.map((c) => c.hex);   // 빨강 파랑 노랑 초록 보라 검정 흰색 주황 핑크
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 바둑이', '봇 민수', '봇 지수'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const EMPTY_INPUT = () => ({ l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, s: 0, e: 0, x: 0, t1: 0, t2: 0, t3: 0, t4: 0 });
// s = Q키, e = E키, x = R키
const cleanInput = (i) => ({
  l: i.l ? 1 : 0, r: i.r ? 1 : 0, u: i.u ? 1 : 0, d: i.d ? 1 : 0,
  a: i.a ? 1 : 0, h: i.h ? 1 : 0, s: i.s ? 1 : 0, e: i.e ? 1 : 0, x: i.x ? 1 : 0,
  t1: i.t1 ? 1 : 0, t2: i.t2 ? 1 : 0, t3: i.t3 ? 1 : 0, t4: i.t4 ? 1 : 0,   // 촉수 H·J·K·L
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
const WEAPONS = ['sword', 'archer', 'ninja', 'shield', 'tentacle'];   // 공격 방식을 바꾸는 스킬끼리는 더블 모드에서 같이 못 씀
const CONFLICTS = [...WEAPONS.flatMap((a, i) => WEAPONS.slice(i + 1).map((b) => [a, b])), ['tentacle', 'fly']];
// 빗면 { x1, y1, x2, y2 }: 윗면이 기울어진 땅 (아래로는 큰 쪽 y까지 꽉 참)
const slopeY = (sl, x) => sl.y1 + ((sl.y2 - sl.y1) * (x - sl.x1)) / (sl.x2 - sl.x1);
const slopeBase = (sl) => Math.max(sl.y1, sl.y2);
const conflicts = (a, b) => CONFLICTS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
// 이 스킬을 가지고 있는지 (더블 모드면 두 번째 스킬도)
// 도핑 물약: 이속(하늘) · 공속(빨강) · 힘(초록) · 방어(노랑)
const DOPE_KINDS = ['spd', 'atk', 'pow', 'def'];
// 도핑 효과 배율: 강화면 1+amt, 끝난 뒤 약화면 1-amt (방어는 받는 넉백이라 반대)
const dopeMul = (p, kind) => {
  const d = p && p.dope; if (!d || d.k !== kind) return 1;
  const up = d.bad ? -SKILLS.dope.amt : SKILLS.dope.amt;
  return kind === 'def' ? 1 - up : 1 + up;
};
// 불 색 스킨: 화염(청염 파랑 · 흑염 검보라) / 태양(초신성 파랑 · 블랙홀 검보라) → 'fire' | 'blue' | 'dark'
const fireTint = (p) => (skinOn(p, 'bluefire') ? 'blue' : skinOn(p, 'blackfire') ? 'dark' : 'fire');
const sunTint = (p) => (skinOn(p, 'supernova') ? 'blue' : skinOn(p, 'blackhole') ? 'dark' : 'fire');
const tintNum = (t) => (t === 'blue' ? 1 : t === 'dark' ? 2 : 0);
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
const sizeOf = (p) => (!p ? 1 : (p.giantT > 0 ? SKILLS.giant.size : p.hulkS > 1 ? p.hulkS : 1) * (p.gam ? Math.max(SKILLS.gamble.minSize, p.gam.size) : 1));
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
    this.starN = SKILLS.starlight.start; this.starT = 0;   // 별빛: 별 카운트
    this.randS1 = false; this.randS2 = false; this.randPool = null;   // 랜덤 스킬: 매 판 시작할 때 새로 뽑음 (pool = 고를 수 있는 스킬, 없으면 전부)
    this.gam = null;              // 도박: 굴린 배율 { reach, kbOut, kbIn, jump, speed, size }
    this.reset(0, 0); this.alive = false;
    this.botCd = 0;
    this.diff = 'mid';            // 봇 난이도: easy · mid · hard (기본 미들, 방장이 바꿈)
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
    this.breath = 10; this.blindT = 0;
    this.shieldHeld = true; this.shieldBack = 0; this.blockT = 0; this.blockGapT = 0; this.shCharge = 0;   // 방패
    this.tents = [0, 1, 2, 3].map(() => ({ t: 0, cd: 0, ang: 0, hit: null })); this.anchorT = 0; this.anchorFloor = 0;   // 촉수
    this.ghostT = 0; this.gMarks = {};   // 귀신
    this.breath = SKILLS.flood.breath; this.blindT = 0;   // 홍수 숨 · 섬광에 눈부심
    this.boingAt = -9;
    this.waveT = 0; this.dope = null; this.dopeSpawn = 0;   // 파동 · 도핑 (먹은 물약 { k, t, bad })
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
    this.logs = [];          // 닌자 통나무(눈사람)
    this.shields = [];       // 던진 방패
    this.flashes = [];       // 섬광 자국 { owner, x, y, r, t }
    this.water = null;       // 홍수 물 { y, target, lastFill, lava }
    this.potions = [];       // 도핑 물약 { owner, kind, x, y, gy, vy, landed }
    this.starRain = [];      // 별빛: 내리는 중인 별비 { owner, n, left, timer, dir, cx }
    this.starBits = [];      // 별빛: 떨어지는 별 하나하나
    this.winds = [];         // 바람 소용돌이
    this.timeSaves = new Map(); // 시간: 저장해 둔 순간 (시전자 id -> 상태)
    this.stage = MAPS[Math.floor(Math.random() * MAPS.length)];
    this.phase = 'waiting'; this.timer = 0; this.winner = null; this.winnerId = null;
    this.teamMode = false;   // 팀 모드 (같은 팀끼리는 공격·스킬이 안 통함)
    this.doubleMode = false; // 더블 모드 (스킬 2개)
    this.winTeam = 0;
    this.tickCount = 0; this.time = 0; this.evSeq = 0; this.recent = [];
    this.onEvent = () => {};
    this.rollVote();
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
    this.skillPicked(p);
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
    if (p.skill2 && p.skill2 !== skill && conflicts(skill, p.skill2)) return '검사·궁수·닌자·방패·촉수는 공격 방식이 바뀌는 스킬이라 같이 쓸 수 없어요. (촉수와 비행도 불가)';
    if (p.skill2 === skill) p.skill2 = p.skill;   // 두 스킬을 서로 바꾼 것
    p.skill = skill; p.randS1 = false;
    p.skillCd = 0; p.skillCdB = 0; p.skillCd2 = 0; p.charged = false; p.stillT = 0; p.parHits = {};
    p.flyT = 0; p.rockT = 0; p.buffT = 0; p.stealth = 0; p.giantT = 0; p.rubberT = 0; p.engineT = 0; p.stunT = 0; p.hulkS = 1; p.sunT = 0; p.waveT = 0; p.dope = null;
    this.clones.delete(id);
    this.removeTurrets(id);
    this.skillPicked(p);
    return null;
  }
  setSkill2(id, skill) {
    const p = this.players.get(id);
    if (!p) return '없는 플레이어예요.';
    if (this.phase !== 'waiting') return '스킬은 게임 시작 전에만 바꿀 수 있어요.';
    if (!this.doubleMode) return '더블 모드에서만 두 번째 스킬을 고를 수 있어요.';
    skill = validSkill(skill);
    if (skill === p.skill) return '첫 번째 스킬과 다른 스킬을 골라 주세요.';
    if (conflicts(skill, p.skill)) return '검사·궁수·닌자·방패·촉수는 공격 방식이 바뀌는 스킬이라 같이 쓸 수 없어요. (촉수와 비행도 불가)';
    if (p.parHost) this.endParasite(p, true);
    p.skill2 = skill; p.randS2 = false; p.skillCd = 0; p.skillCdB = 0; p.skillCd2 = 0; p.charged = false; p.stillT = 0; p.parHits = {};
    p.flyT = 0; p.rockT = 0; p.buffT = 0; p.stealth = 0; p.giantT = 0; p.rubberT = 0; p.engineT = 0; p.sunT = 0; p.waveT = 0; p.dope = null;
    this.clones.delete(id); this.removeTurrets(id);
    this.skillPicked(p);
    return null;
  }
  // 방장이 봇(더미 포함)의 스킬을 정함. 'random'이면 랜덤 (더블 모드면 두 번째도)
  // 랜덤 스킬 뽑기 (고를 수 있는 스킬 중에서, 더블이면 두 스킬이 겹치거나 충돌하지 않게)
  pickSkill(p, avoid) {
    const pool = (p.randPool && p.randPool.length ? p.randPool : SKILL_IDS).filter((x) => x !== avoid && !(avoid && conflicts(x, avoid)));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : validSkill(avoid ? 'blink' : 'slow');
  }
  rollRandomSkills(p) {
    if (p.randS1) { const k = this.pickSkill(p, this.doubleMode && !p.randS2 ? p.skill2 : null); p.skill = k; }
    if (this.doubleMode && p.randS2) p.skill2 = this.pickSkill(p, p.skill);
    if (p.skill2 && (p.skill2 === p.skill || conflicts(p.skill, p.skill2))) p.skill2 = this.pickSkill(p, p.skill);
  }
  // 랜덤으로 정하기 (slot 1 = 첫 스킬, 2 = 두 번째). 지금 바로 한 번 뽑고, 판마다 다시 뽑음
  setRandom(id, slot, pool) {
    const p = this.players.get(id);
    if (!p) return '없는 플레이어예요.';
    if (this.phase !== 'waiting') return '스킬은 게임 시작 전에만 바꿀 수 있어요.';
    if (slot === 2 && !this.doubleMode) return '더블 모드에서만 두 번째 스킬을 고를 수 있어요.';
    p.randPool = pool || null;
    if (slot === 2) { const k2 = this.pickSkill(p, p.skill); const e = this.setSkill2(id, k2); if (e) return e; p.randS2 = true; }
    else { const keep2 = p.randS2; const k = this.pickSkill(p, this.doubleMode ? p.skill2 : null); const e = this.setSkill(id, k); if (e) return e; p.randS1 = true; p.randS2 = keep2; }
    return null;
  }
  // 방장이 봇(더미 포함)의 스킬을 정함. 'random'이면 매 판 랜덤 (더블 모드면 두 번째도)
  setBotDiff(id, diff) {
    const p = this.players.get(id);
    if (!p || !p.bot) return '봇만 바꿀 수 있어요.';
    if (!['easy', 'mid', 'hard'].includes(diff)) return '난이도가 잘못됐어요.';
    p.diff = diff; p.inQ = [];
    return null;
  }
  setBotSkill(id, skill, skill2) {
    const p = this.players.get(id);
    if (!p || !p.bot) return '봇만 바꿀 수 있어요.';
    if (this.phase !== 'waiting') return '스킬은 게임 시작 전에만 바꿀 수 있어요.';
    if (skill) {
      if (skill === 'random') { const e = this.setRandom(id, 1, null); if (e) return e; }
      else {
        const k = validSkill(skill), r2 = p.randS2;
        if (p.skill2 && (p.skill2 === k || conflicts(p.skill2, k))) p.skill2 = this.pickSkill(p, k);
        const e = this.setSkill(id, k); if (e) return e; p.randS2 = r2;
      }
    }
    if (skill2 && this.doubleMode) {
      if (skill2 === 'random') { const e = this.setRandom(id, 2, null); if (e) return e; }
      else {
        const k2 = validSkill(skill2);
        if (k2 === p.skill) return '첫 번째 스킬과 다른 스킬을 골라 주세요.';
        if (conflicts(k2, p.skill)) return '같이 쓸 수 없는 스킬이에요.';
        const r1 = p.randS1; const e = this.setSkill2(id, k2); if (e) return e; p.randS1 = r1;
      }
    }
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
  // ---------------- 맵 투표 ----------------
  // 대기실마다 랜덤 후보 3개 (직전 맵 제외). 사람만 투표, 시작할 때 가장 많이 받은 맵 (동률·무투표면 그중 랜덤)
  rollVote() {
    const pool = MAPS.filter((m) => m !== this.stage);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.mapVote = { cands: pool.slice(0, 3).map((m) => m.id), votes: {} };
  }
  vote(id, mapId) {
    const p = this.players.get(id);
    if (!p || p.bot || this.phase !== 'waiting' || !this.mapVote) return;
    if (!this.mapVote.cands.includes(mapId)) return;
    this.mapVote.votes[id] = mapId;
  }
  voteWinner() {
    const v = this.mapVote; if (!v) return null;
    const cnt = v.cands.map((c) => Object.entries(v.votes).filter(([pid, m]) => m === c && this.players.has(pid)).length);
    const top = Math.max(...cnt), best = v.cands.filter((c, i) => cnt[i] === top);
    return best[Math.floor(Math.random() * best.length)];
  }
  // 판마다 맵: 투표로 정함 (투표 정보가 없으면 직전 맵 빼고 랜덤)
  pickMap() {
    const won = this.voteWinner(), voted = won && MAPS.find((m) => m.id === won);
    const others = MAPS.filter((m) => m !== this.stage);
    this.stage = voted || others[Math.floor(Math.random() * others.length)] || MAPS[0];
    if (voted) this.ev({ k: 'voted', n: voted.name });
    this.clearField();
    this.list().forEach((p, i) => {
      p.mapMid = this.stage.width / 2; p.hulkS = 1;
      if (p.parHost) this.endParasite(p, true);
      if (p.randS1 || p.randS2) { this.rollRandomSkills(p); if (!p.bot) this.ev({ k: 'randskill', only: p.id, s: p.skill, s2: p.skill2 || '' }); }   // 랜덤 스킬: 판마다 새로
      const sp = this.stage.spawns[i % this.stage.spawns.length];
      const keep = { wins: p.wins, inMatch: p.inMatch, stocks: p.stocks };
      p.reset(sp.x, sp.y); Object.assign(p, keep);
      p.invincible = 0.5;
    });
    this.ev({ k: 'map', n: this.stage.name });
  }
  clearField() {
    this.clones.clear(); this.smokes = []; this.slashes = [];
    this.turrets = []; this.bullets = []; this.blizzards = []; this.arrows = []; this.winds = []; this.timeSaves = new Map(); this.mines = []; this.logs = []; this.starRain = []; this.starBits = []; this.shields = []; this.flashes = []; this.water = null; this.potions = [];
  }
  removeTurrets(id) {
    this.turrets = this.turrets.filter((t) => t.owner !== id);
    this.bullets = this.bullets.filter((b) => b.owner !== id);
    this.mines = this.mines.filter((m) => m.owner !== id);
    this.logs = (this.logs || []).filter((l) => l.owner !== id);
    this.starRain = (this.starRain || []).filter((r) => r.owner !== id);
    this.starBits = (this.starBits || []).filter((b) => b.owner !== id);
    this.shields = (this.shields || []).filter((q) => q.owner !== id);
  }
  // x 위치 아래(또는 같은 높이)에 있는 가장 가까운 땅/발판
  surfaceBelow(x, y) {
    let best = null;
    for (const s of [...this.stage.solids, ...this.stage.platforms, ...(this.stage.tramps || [])]) {
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
  // 스킬을 고른 직후: 도박은 바로 굴리고, 별빛은 별 1개로 시작
  skillPicked(p) {
    p.gam = null; p.ghostUsed = false;
    if (has(p, 'gamble')) this.rollGamble(p, true);
    p.starN = SKILLS.starlight.start; p.starT = 0;
  }
  // 도박 굴리기: 6가지 배율을 0.0~2.0 (소수 첫째 자리) 랜덤
  rollGamble(p, auto) {
    const r = () => Math.round(Math.random() * 20) / 10;
    p.gam = { reach: r(), kbOut: r(), kbIn: r(), jump: r(), speed: r(), size: r() };
    if (p.skill === 'gamble') p.skillCd = SKILLS.gamble.cd; else p.skillCdB = SKILLS.gamble.cd;
    const g = p.gam;
    this.ev({ k: 'gamble', x: r0(p.x), y: r0(p.y - bh(p) / 2), pid: p.id, n: p.name, auto: auto ? 1 : 0, v: [g.reach, g.kbOut, g.kbIn, g.jump, g.speed, g.size] });
  }
  // ---------------- 도핑 물약 ----------------
  updatePotions(list, dt) {
    const s = SKILLS.dope;
    // 주인이 나갔거나 도핑이 아니면 물약 정리
    this.potions = this.potions.filter((q) => { const o = this.players.get(q.owner); return o && has(o, 'dope'); });
    for (const p of list) {
      if (!has(p, 'dope') || !p.alive || p.inside) continue;
      const mine = this.potions.filter((q) => q.owner === p.id).length;
      if (mine >= s.max) { p.dopeSpawn = 0; continue; }
      p.dopeSpawn = (p.dopeSpawn || 0) + dt;
      if (p.dopeSpawn >= s.every || (p.dopeSpawn >= 1.5 && mine === 0 && !p.dopeFirst)) {
        p.dopeSpawn = 0; p.dopeFirst = true;
        const spot = this.randomSafeSpot({ x: p.x + (Math.random() - 0.5) * 2000, y: p.y, hulkS: 1 });
        const kind = DOPE_KINDS[Math.floor(Math.random() * DOPE_KINDS.length)];
        this.potions.push({ id: ++this.evSeq, owner: p.id, kind, x: spot.x, y: spot.y - 520, gy: spot.y, vy: 0, landed: false });
      }
    }
    for (const q of this.potions) {
      if (!q.landed) { q.vy = Math.min(q.vy + 1200 * dt, 900); q.y += q.vy * dt; if (q.y >= q.gy) { q.y = q.gy; q.landed = true; this.ev({ k: 'potland', x: r0(q.x), y: r0(q.y) }); } }
      const o = this.players.get(q.owner);
      if (o && o.alive && !o.inside && Math.abs(o.x - q.x) < s.grab && o.y - bh(o) - 10 < q.y && o.y + 20 > q.y - 20) {
        // 먹으면 5초 강화 (약화 전에 또 먹으면 약화 없이 새 물약으로)
        o.dope = { k: q.kind, t: s.buff, bad: false };
        q.eaten = true;
        this.ev({ k: 'drink', x: r0(q.x), y: r0(q.y - 20), pid: o.id, d: DOPE_KINDS.indexOf(q.kind) });
      }
    }
    this.potions = this.potions.filter((q) => !q.eaten);
  }
  // ---------------- 홍수 물 ----------------
  inWater(p) { return !!this.water && p.y - bh(p) * 0.5 > this.water.y; }          // 몸 가운데가 물에 잠김
  headUnder(p) { return !!this.water && p.y - bh(p) > this.water.y + 4; }         // 머리까지 잠김
  waterK(y) { return this.water && y > this.water.y ? SKILLS.flood.proj : 1; }    // 물속 투사체 속도
  waterTop() { return -60; }   // 최대 수면 = 화면 맨 위까지 꽉 참
  updateWater(dt) {
    const w = this.water; if (!w) return;
    const s = SKILLS.flood, bottom = this.stage.height + 40;
    if (w.drain) {
      // 꽉 찬 뒤 10초 → 5초 동안 물이 전부 빠짐 (다 빠질 때까지 홍수 못 씀)
      w.y += w.drainSpd * dt; w.target = w.y;
      if (w.y >= bottom) this.water = null;
      return;
    }
    if (this.time - w.lastFill > s.hold) w.target += s.recede * dt;   // 15초 동안 안 쓰면 천천히 낮아짐
    w.y = approach(w.y, w.target, s.riseSpeed * dt);
    if (w.y <= this.waterTop() + 2) {
      if (w.fullAt == null) { w.fullAt = this.time; this.ev({ k: 'floodfull', lava: w.lava ? 1 : 0 }); }
      else if (this.time - w.fullAt >= s.fullHold) { w.drain = true; w.drainSpd = (bottom - w.y) / s.drainTime; this.ev({ k: 'flooddrain', lava: w.lava ? 1 : 0 }); }
    } else w.fullAt = null;
    if (w.target >= bottom && w.y >= bottom - 1) this.water = null;
  }
  // x 위치에서 y 아래로 가장 가까운 땅 높이 (빗면 포함). 없으면 null
  groundBelow(x, y) {
    let best = null;
    for (const s of [...this.stage.solids, ...this.stage.platforms]) if (x >= s.x && x <= s.x + s.w && s.y >= y - 2 && (best == null || s.y < best)) best = s.y;
    for (const sl of this.stage.slopes || []) { if (x < sl.x1 || x > sl.x2) continue; const sy = slopeY(sl, x); if (sy >= y - 2 && (best == null || sy < best)) best = sy; }
    return best;
  }
  // 닌자: 안전하게 설 수 있는 랜덤한 땅 위 (지금 자리에서 좀 떨어진 곳)
  randomSafeSpot(p) {
    const st = this.stage;
    const surf = [...st.solids.map((s) => ({ x1: s.x, x2: s.x + s.w, y: () => s.y })), ...st.platforms.map((s) => ({ x1: s.x, x2: s.x + s.w, y: () => s.y })),
      ...(st.slopes || []).map((sl) => ({ x1: sl.x1, x2: sl.x2, y: (x) => slopeY(sl, x) }))].filter((q) => q.x2 - q.x1 >= 70);
    const total = surf.reduce((n, q) => n + (q.x2 - q.x1 - 60), 0);
    let best = null;
    for (let tries = 0; tries < 40; tries++) {
      let pick = Math.random() * total, q = surf[0];
      for (const c of surf) { const w = c.x2 - c.x1 - 60; if (pick < w) { q = c; break; } pick -= w; }
      const x = q.x1 + 30 + Math.random() * (q.x2 - q.x1 - 60), y = q.y(x);
      if (this.insideSolid(x, y - 1)) continue;
      // 위에 다른 땅이 겹쳐 있지 않은지 (몸이 들어갈 자리)
      if (this.solidAt(x, y - bh(p) * 0.6)) continue;
      const far = Math.hypot(x - p.x, y - p.y);
      if (!best || (far > 260 && best.far <= 260)) best = { x, y, far };
      if (far > 260) break;
    }
    return best || { x: this.stage.respawn.x, y: this.stage.respawn.y };
  }
  startRound() {
    this.phase = 'playing'; this.winner = null; this.winnerId = null; this.winTeam = 0;
    this.clearField();
    this.list().forEach((p, i) => {
      const s = this.stage.spawns[i % this.stage.spawns.length];
      p.mapMid = this.stage.width / 2; p.hulkS = 1;
      p.reset(s.x, s.y); p.stocks = has(p, 'undying') ? SKILLS.undying.lives : CONFIG.STOCKS; p.kos = 0; p.botKos = 0; p.inMatch = true;
      this.skillPicked(p);   // 도박은 시작하자마자 자동으로 굴림 (그래서 바로 또 못 씀), 별빛은 별 1개로 시작
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
        this.phase = 'waiting'; this.rollVote();   // 다음 판 맵 후보 새로
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
      else if (p.bot) p.input = botInput(this, p);
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
      c.rockT = owner.rockT; c.buffT = owner.buffT; c.sunT = owner.sunT; c.hulkS = owner.hulkS; c.waveT = owner.waveT; c.dope = owner.dope;
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
    this.updateLogs(dt);
    this.updateStars(targets, dt);
    this.updateShields(targets, dt);
    this.updateWater(dt);
    this.updatePotions(list, dt);
    for (const f of this.flashes) f.t -= dt;
    this.flashes = this.flashes.filter((f) => f.t > 0);
    // 판이 끝나면 귀신 상태도 바로 풀림 (대기실까지 귀신으로 남지 않게)
    if (this.phase !== 'playing') for (const p of list) if (p.ghostT > 0) { p.ghostT = 0; p.invincible = 0; }
    for (const p of list) { if (p.ghostT > 0) { p.ghostT -= dt; p.invincible = Math.max(p.invincible, 0.1); if (p.ghostT <= 0) this.endGhost(p); } }
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
      blizzards: structuredClone(this.blizzards), logs: structuredClone(this.logs), starRain: structuredClone(this.starRain),
      starBits: this.starBits.map((b) => ({ ...b, hit: [...b.hit] })), shields: structuredClone(this.shields), flashes: structuredClone(this.flashes), water: this.water ? { ...this.water } : null, potions: structuredClone(this.potions),
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
    this.logs = structuredClone(snap.logs || []).filter((l) => this.players.has(l.owner));
    this.starRain = structuredClone(snap.starRain || []).filter((r) => this.players.has(r.owner));
    this.starBits = (snap.starBits || []).filter((b) => this.players.has(b.owner)).map((b) => ({ ...b, hit: new Set(b.hit) }));
    this.shields = structuredClone(snap.shields || []).filter((q) => this.players.has(q.owner));
    this.flashes = structuredClone(snap.flashes || []);
    this.water = snap.water ? { ...snap.water } : null;
    this.potions = structuredClone(snap.potions || []).filter((q) => this.players.has(q.owner));
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
    if (p.waveT > 0) p.waveT = Math.max(0, p.waveT - dt);
    if (p.quakeCastT > 0) p.quakeCastT = Math.max(0, p.quakeCastT - dt);
    if (p.dope && !p.clone) {   // 도핑: 강화 5초 → 약화 3초 → 끝
      p.dope.t -= dt;
      if (p.dope.t <= 0) { if (p.dope.bad) p.dope = null; else { p.dope.bad = true; p.dope.t = SKILLS.dope.debuff; this.ev({ k: 'dopebad', x: r0(p.x), y: r0(p.y - bh(p)), pid: p.id }); } }
    }
    // 헐크: 퍼센트에 따라 몸 크기가 서서히 변함
    if (p.clone) { /* 분신은 주인 크기를 따라감 */ } else if (has(p, 'hulk')) {
      const h = SKILLS.hulk;
      const target = 1 + h.size * clamp(p.damage / h.maxAt, 0, 1);
      p.hulkS = approach(p.hulkS || 1, target, h.grow * dt);
    } else p.hulkS = 1;

    if (p.blindT > 0) p.blindT = Math.max(0, p.blindT - dt);
    // 홍수: 홍수 사용자 말고는 머리가 잠기면 숨방울이 1초에 하나씩 줄어듦 (나오면 다시 참)
    if (!has(p, 'flood') && this.headUnder(p)) p.breath = Math.max(0, p.breath - dt);
    else p.breath = Math.min(SKILLS.flood.breath, p.breath + 3 * dt);
    if (p.blockT > 0) p.blockT = Math.max(0, p.blockT - dt);
    if (p.blockGapT > 0) p.blockGapT = Math.max(0, p.blockGapT - dt);
    if (p.anchorT > 0) p.anchorT = Math.max(0, p.anchorT - dt);
    if (!p.shieldHeld && p.shieldBack > 0) {
      p.shieldBack -= dt;
      if (p.shieldBack <= 0) { p.shieldHeld = true; this.ev({ k: 'shback', x: r0(p.x), y: r0(p.y - bh(p) / 2), pid: p.id }); }
    }
    for (const tc of p.tents || []) { if (tc.cd > 0) tc.cd -= dt; if (tc.t > 0) { tc.t += dt; const S = SKILLS.tentacle; if (tc.t > S.out + S.hold + S.back) tc.t = 0; } }
    // 별빛: 10초마다 별 카운트 +1 (최대 5)
    if (has(p, 'starlight') && !p.clone && p.starN < SKILLS.starlight.max) {
      p.starT += dt;
      if (p.starT >= SKILLS.starlight.every) { p.starT = 0; p.starN++; }
    } else if (has(p, 'starlight')) p.starT = 0;
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
    if (p.waveT > 0) { moveMul *= SKILLS.wave.speedMul; jumpMul *= SKILLS.wave.jumpMul; }
    moveMul *= dopeMul(p, 'spd');
    if (p.drawT > 0) moveMul *= 0.45;                     // 시위 당기는 중엔 느림
    if (p.gam) { moveMul *= p.gam.speed; jumpMul *= p.gam.jump; }   // 도박: 속도·점프력
    const wet = this.inWater(p), swimmer = wet && has(p, 'flood') && !p.clone, drown = wet && !swimmer && p.breath <= 0;
    if (wet && !swimmer) { moveMul *= SKILLS.flood.moveMul; jumpMul *= SKILLS.flood.jumpMul; if (!drown) p.jumpsLeft = Math.max(p.jumpsLeft, 1); }   // 물속: 느림, 점프 약하지만 무한
    const canFight = this.phase === 'playing' || this.phase === 'waiting';
    const flying = p.flyT > 0;

    if (p.hitstun > 0 || p.stunT > 0 || p.iceT > 0) {
      if (p.hitstun > 0) p.hitstun -= dt;
      p.vx = approach(p.vx, 0, 500 * dt);
      p.drawT = 0; p.shCharge = 0;
    } else {
      const attacking = p.attack !== null;
      const heavyLock = attacking && p.attack.type === 'heavy';
      const speed = CONFIG.RUN_SPEED * moveMul * (heavyLock && p.grounded ? 0.25 : 1);
      p.vx = approach(p.vx, dir * speed, (p.grounded ? CONFIG.GROUND_ACCEL : CONFIG.AIR_ACCEL) * Math.min(1, moveMul) * dt);
      if (dir !== 0 && !attacking) p.facing = dir;
      if (pressed('u') && !flying && !(p.anchorT > 0) && !(p.ghostT > 0) && !drown && !swimmer) {
        if (p.grounded) {
          p.vy = -CONFIG.JUMP_SPEED * jumpMul; p.grounded = false;
          this.ev({ k: 'jump', x: r0(p.x), y: r0(p.y), pid: p.ownerId || p.id });
        } else if (p.jumpsLeft > 0) {
          p.vy = -CONFIG.DOUBLE_JUMP_SPEED * jumpMul; p.jumpsLeft--;
          this.ev({ k: 'jump2', x: r0(p.x), y: r0(p.y), pid: p.ownerId || p.id });
        }
      }
      if (p.grounded && pressed('d') && this.onPlatform(p)) { p.dropThrough = 0.25; p.grounded = false; p.y += 2; }
      const sl = slotsOf(p), shKey = has(p, 'shield') && !p.clone ? ['s', 'e', 'x'].find((kk) => sl[kk] === 'shield') : null;
      if (canFight && !p.clone && !(p.ghostT > 0)) {
        for (const key of ['s', 'e', 'x']) if (key !== shKey && pressed(key)) this.useSlot(p, key);
      }
      // 방패 던지기: Q(방패 칸)를 누르고 있으면 충전, 놓으면 던짐
      if (shKey && canFight && !(p.ghostT > 0)) {
        if (inp[shKey] && p.shieldHeld) p.shCharge = pressed(shKey) ? 0.001 : p.shCharge > 0 ? Math.min(1, p.shCharge + dt / SKILLS.shield.full) : 0;
        else if (p.shCharge > 0) this.throwShield(p);
      }
      // 강공격 연타 방지: 궁수는 화살 쏜 뒤 0.5초, 검사는 강공격이 끝난 뒤 0.3초 지나야 다시 강공격
      if (p.hGap > 0 && !attacking && !(p.drawT > 0)) p.hGap -= dt;
      if (canFight && has(p, 'tentacle') && !p.clone && !(p.ghostT > 0)) {
        // 촉수: H·J·K·L(t1~t4)로 각각, 약/강 키는 위 촉수/아래 촉수 중 쓸 수 있는 것
        const fire = (i) => this.fireTentacle(p, i);
        for (let i = 0; i < 4; i++) if (pressed('t' + (i + 1))) fire(i);
        if (pressed('a')) fire(p.tents[0].cd <= 0 ? 0 : 1);
        if (pressed('h')) { if (p.anchorT > 0) fire(p.tents[0].cd <= 0 ? 0 : 1); else fire(p.tents[2].cd <= 0 ? 2 : 3); }
      } else if (canFight && !attacking && !(p.drawT > 0) && has(p, 'shield') && !p.clone && p.shieldHeld && pressed('a')) {
        // 방패 막기
        if (!(p.blockGapT > 0)) { p.blockT = SKILLS.shield.blockTime; p.blockGapT = SKILLS.shield.blockTime + SKILLS.shield.blockGap; this.ev({ k: 'shblock', x: r0(p.x), y: r0(p.y - bh(p) / 2), pid: p.id }); }
      } else if (canFight && !attacking && !(p.drawT > 0)) {
        if (pressed('a')) p.attack = { type: 'light', t: 0, hit: new Set(), victims: [] };
        else if (pressed('h') && !(p.hGap > 0)) {
          // 궁수: 강공격 = 활 시위 당기기 / 닌자: 바로 쿠나이 던지기
          if (has(p, 'ninja') && !p.clone) { this.throwKunai(p); p.hGap = SKILLS.ninja.heavyGap; }
          else if (has(p, 'archer') && !p.clone) p.drawT = 0.001;
          else {
            p.attack = { type: 'heavy', t: 0, hit: new Set(), victims: [] };
            if (has(p, 'sword') && !p.clone) p.hGap = SKILLS.sword.heavyGap;
          }
        }
      } else if (p.drawT > 0) {
        if (inp.h && canFight) p.drawT = Math.min(1, p.drawT + dt / SKILLS.archer.full);
        else { this.fireArrow(p); p.hGap = SKILLS.archer.heavyGap; }
      }
    }

    if (p.ghostT > 0) {
      // 귀신: 중력·벽 없이 WASD로 자유롭게 (장외로는 안 나감)
      const sp = SKILLS.ghost.speed * (p.bot ? ({ easy: 0.5, mid: 0.6, hard: 0.7 }[p.diff] || 0.6) : 1), b = this.stage.blast;   // 봇 귀신은 느리게
      p.vx = dir * sp; p.vy = ((inp.d ? 1 : 0) - (inp.u ? 1 : 0)) * sp;
      p.x = clamp(p.x + p.vx * dt, b.left + 60, b.right - 60); p.y = clamp(p.y + p.vy * dt, b.top + 120, b.bottom - 60);
      p.grounded = false; p.hitstun = 0;
      return;
    }
    if (p.anchorT > 0) {
      // 촉수 지탱: 중력 없이 WASD로 이동 (맞으면 살짝만 밀림)
      const sp = SKILLS.tentacle.speed * moveMul;
      if (p.hitstun > 0) { p.vx = approach(p.vx, 0, 300 * dt); p.vy = approach(p.vy, 0, 300 * dt); }
      else { p.vx = approach(p.vx, dir * sp, 3200 * dt); p.vy = approach(p.vy, ((inp.d ? 1 : 0) - (inp.u ? 1 : 0)) * sp, 3200 * dt); }
      this.moveAndCollide(p, dt);
      if (p.y > p.anchorFloor) { p.y = p.anchorFloor; if (p.vy > 0) p.vy = 0; }
      return;
    }
    if (swimmer && p.hitstun <= 0 && !(p.fdashT > 0)) {
      // 홍수 사용자: 물속을 자유롭게 헤엄 (수면에서 위로 누르면 물 밖으로 뛰어오름)
      const sp = CONFIG.RUN_SPEED * SKILLS.flood.swim * moveMul;
      p.vx = approach(p.vx, dir * sp, 3000 * dt);
      if (inp.u && pressed('u') && p.y - bh(p) < this.water.y + 24) { p.vy = -CONFIG.JUMP_SPEED * 0.95; }
      else p.vy = approach(p.vy, ((inp.d ? 1 : 0) - (inp.u ? 1 : 0)) * sp, 3000 * dt);
      this.moveAndCollide(p, dt);
      return;
    }
    if (p.fdashT > 0) {
      // 화염 돌진: 수평으로 쭉 (중력 없음) — 물속이면 느림
      p.fdashT -= dt;
      p.vx = p.facing * SKILLS.fire.dashSpeed * (wet ? SKILLS.flood.dash : 1); p.vy = 0;
    } else if (flying) {
      // 비행: 점프 키를 누르고 있으면 올라가고, 떼면 천천히 내려감
      const s = SKILLS.fly;
      const target = inp.u && p.flyDownT <= 0 && p.hitstun <= 0 ? -s.up : s.down;
      p.vy = approach(p.vy, target, 2600 * dt);
    } else if (wet) {
      // 물속: 천천히 가라앉음. 숨이 다 떨어지면 점점 더 빨리 가라앉음
      p.vy = drown ? approach(p.vy, 260, 900 * dt) : Math.min(p.vy + CONFIG.GRAVITY * 0.35 * dt, 240);
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
    // 촉수로 땅을 짚고 있는 동안은 점멸·화염 돌진 같은 돌진기를 못 씀
    if (p.anchorT > 0 && (k === 'blink' || k === 'fire')) { this.deny(p, '촉수로 땅을 짚는 동안은 못 써요'); return; }
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
      const dist = s.distance * (this.inWater(p) ? SKILLS.flood.dash : 1);   // 물속이면 짧게
      for (let t = 10; t <= dist; t += 10) {
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
      this.ev({ k: 'stealth', x: r0(p.x), y: r0(cy), pid: p.id, ck: skinOn(p, 'cloak') ? 1 : 0, f: p.facing });
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
      this.ev({ k: 'swap', x: r0(a.x), y: r0(a.y - 30), x2: r0(p.x), y2: r0(p.y - 30), wh: skinOn(p, 'wormhole') ? 1 : 0, c: p.color, pid: p.id, pid2: o.clone || isTurret ? undefined : o.id });
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
      this.smokes.push({ x: cx, y: cy, r: s.smokeR, t: s.smoke, max: s.smoke, nuke: skinOn(p, 'nuke') });   // 핵폭발 스킨: 버섯 구름
      p.skillCd = s.cd;
      this.ev({ k: 'explode', x: r0(cx), y: r0(cy), r: s.radius, h: hits, nk: skinOn(p, 'nuke') ? 1 : 0 });
    } else if (k === 'freeze') {
      const s = SKILLS.freeze;
      for (const o of [...this.players.values(), ...this.clones.values()]) {
        if (!this.foe(p, o) || !o.alive || o.inside) continue;
        o.frozen = s.duration; o.frzHaki = skinOn(p, 'haki');   // 패왕색 스킨: 검붉은 기운
        o.vx = 0; o.vy = 0;
      }
      p.skillCd = s.cd;
      this.ev({ k: 'freeze', x: r0(cx), y: r0(cy), hk: skinOn(p, 'haki') ? 1 : 0, pid: p.id });
    } else if (k === 'rock') {
      const s = SKILLS.rock;
      p.rockT = s.duration;
      p.skillCd = s.cd;
      this.ev({ k: 'rock', x: r0(p.x), y: r0(cy), pid: p.id });
    } else if (k === 'quake') {
      const s = SKILLS.quake;
      p.skillCd = s.cd;
      // 시전자 빼고 모두 흔들림 (봇은 움직임과 공격이 엉망이 됨)
      for (const o of this.players.values()) if (this.foe(p, o) && o.alive) { o.quakeT = s.duration; o.quakeWob = skinOn(p, 'wobble'); }
      p.quakeCastT = skinOn(p, 'wobble') ? s.duration : 0;   // 흔들흔들: 시전자 주위도 흰 흔들림
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
        o.stunT = Math.max(o.stunT || 0, s.stun * (this.inWater(o) ? SKILLS.flood.stunMul : 1));   // 물속이면 더 오래
        o.attack = null; o.vx = 0; if (o.vy < 0) o.vy = 0;
        o.lastHitBy = p.id; o.lastHitAt = this.tickCount;
        if (o.clone) this.hitClone(o);
        pts.push([r0(o.x), r0(o.y)]);
      }
      p.skillCd = s.cd;
      this.ev({ k: 'bolt', x: r0(cx), y: r0(cy), pts, h: cands.filter((e) => !e.o.clone).length, pid: p.id, th: skinOn(p, 'thunder') ? 1 : 0 });
    } else if (k === 'fire') {
      const s = SKILLS.fire;
      const inp = p.input;
      const d = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
      if (d) p.facing = d;
      p.fdashT = s.dashTime; p.fdashHit = new Set(); p.attack = null;
      p.skillCd = s.cd;
      this.ev({ k: 'fdash', x: r0(p.x), y: r0(cy), f: p.facing, pid: p.id, b: tintNum(fireTint(p)) });
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
      o.errT = s.duration; o.errModeT = 0; o.errHack = skinOn(p, 'hacker');   // 해커: 빨간 에러 + HACKER
      p.skillCd = s.cd;
      this.ev({ k: 'error', by: p.id, d: s.duration, n: p.name, n2: o.name, x: r0(o.x), y: r0(o.y - bh(o) / 2) });
    } else if (k === 'sun') {
      const s = SKILLS.sun;
      p.sunT = s.duration; p.skillCd = s.cd;
      this.ev({ k: 'sun', x: r0(p.x), y: r0(cy), pid: p.id, b: tintNum(sunTint(p)) });
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
    } else if (k === 'wave') {
      // 내 몸에서 큰 파동 → 주변 적을 조금 튕겨내고, 7초간 팔에 파동이 감김
      const s = SKILLS.wave;
      for (const o of others()) {
        if (o.invincible > 0 || o.rockT > 0) continue;
        const d = Math.hypot(o.x - cx, o.y - bh(o) / 2 - cy);
        if (d > s.radius) continue;
        const dir = Math.sign(o.x - cx) || p.facing, k2 = s.kb * (1 - d / s.radius * 0.4) * (o.anchorT > 0 ? SKILLS.tentacle.anchorKB : 1) * dopeMul(o, 'def');
        o.vx = dir * k2; o.vy = Math.min(o.vy, -k2 * 0.55); o.grounded = false; o.hitstun = Math.max(o.hitstun, 0.2); o.attack = null;
        o.lastHitBy = p.id; o.lastHitAt = this.tickCount;
      }
      p.waveT = s.duration; p.skillCd = s.cd;
      this.ev({ k: 'wave', x: r0(cx), y: r0(cy), pid: p.id });
    } else if (k === 'dope') {
      return;   // 패시브: 물약이 저절로 떨어짐
    } else if (k === 'flash') {
      const s = SKILLS.flash;
      this.flashes.push({ id: ++this.evSeq, owner: p.id, team: p.team, x: r0(cx), y: r0(cy), r: s.radius, t: s.zoneTime, max: s.zoneTime });
      for (const o of others()) {
        if (o.invincible > 0) continue;
        const d = Math.hypot(o.x - cx, o.y - bh(o) / 2 - cy);
        if (d < s.kbR && !(o.rockT > 0)) {   // 살짝 밀려남
          const dir = Math.sign(o.x - cx) || 1, k2 = s.kb * (1 - d / s.kbR * 0.5) * (o.anchorT > 0 ? SKILLS.tentacle.anchorKB : 1);
          o.vx = dir * k2; o.vy = Math.min(o.vy, -k2 * 0.6); o.grounded = false; o.hitstun = Math.max(o.hitstun, 0.18); o.attack = null;
          o.lastHitBy = p.id; o.lastHitAt = this.tickCount;
        }
        if (!o.clone && d < s.blindR) o.blindT = Math.max(o.blindT || 0, s.blindMax * (1 - d / s.blindR) + 0.4);   // 가까울수록 오래 눈부심
      }
      p.skillCd = s.cd;
      this.ev({ k: 'flash', x: r0(cx), y: r0(cy), pid: p.id });
    } else if (k === 'flood') {
      // 아래에서 물이 차오름 (또 쓰면 더 높이)
      const s = SKILLS.flood, bottom = this.stage.height + 40, top = this.waterTop();
      if (this.water && this.water.drain) { this.deny(p, '물이 다 빠질 때까지 홍수를 다시 쓸 수 없어요'); return; }
      if (!this.water) this.water = { y: bottom, target: bottom, lastFill: 0, lava: false };
      this.water.target = Math.max(top, Math.min(this.water.target, bottom) - s.rise - (this.water.target >= bottom ? bottom - this.stage.floor - 20 : 0));
      this.water.lastFill = this.time; this.water.lava = skinOn(p, 'lava');
      p.skillCd = s.cd;
      this.ev({ k: 'flood', x: r0(p.x), y: r0(this.water.target), pid: p.id, lava: this.water.lava ? 1 : 0 });
    } else if (k === 'tentacle') {
      // 아래 촉수 2개(K·L)로 땅을 짚음: 8초간 중력 없이 이동. 가장 낮은 땅 높이 아래로는 못 내려감
      const s = SKILLS.tentacle;
      p.anchorT = s.anchor; p.skillCd = s.cd; p.flyT = 0; p.vy = 0;
      p.anchorFloor = Math.max(...this.stage.solids.map((q) => q.y), ...(this.stage.slopes || []).map((q) => Math.max(q.y1, q.y2)));
      this.ev({ k: 'anchor', x: r0(p.x), y: r0(p.y), pid: p.id });
    } else if (k === 'ninja') {
      // 통나무(스노우 스킨: 눈사람)만 남기고 랜덤한 안전한 곳으로 순간이동
      const s = SKILLS.ninja, spot = this.randomSafeSpot(p);
      this.logs.push({ id: ++this.evSeq, owner: p.id, x: p.x, y: p.y, vy: Math.min(p.vy, 0) * 0, t: s.logLife, sn: skinOn(p, 'snowninja') ? 1 : 0, big: sizeOf(p) });
      this.ev({ k: 'kawarimi', x: r0(p.x), y: r0(cy), tx: r0(spot.x), ty: r0(spot.y - bh(p) / 2), pid: p.id, sn: skinOn(p, 'snowninja') ? 1 : 0 });
      p.x = spot.x; p.y = spot.y - 1; p.vx = 0; p.vy = 0; p.grounded = false; p.attack = null; p.drawT = 0;
      p.skillCd = s.cd;
    } else if (k === 'gamble') {
      this.rollGamble(p, false);
    } else if (k === 'starlight') {
      if (!(p.starN >= 1)) { this.deny(p, '별이 아직 없어요'); return; }
      const s = SKILLS.starlight, n = p.starN;
      p.starN = 0; p.starT = 0; p.skillCd = s.cd;
      const count = 6 + n * 6;
      this.starRain.push({ owner: p.id, team: p.team, n, left: count, every: s.spawnTime / count, timer: 0, dir: p.facing, cx: p.x });
      this.ev({ k: 'starfall', x: r0(p.x), y: r0(cy), n, pid: p.id });
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
      for (const o of pick) { o.invT = s.duration; o.invCrown = skinOn(p, 'crown'); }   // 우왕좌왕: 악마 대신 왕관
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
    this.ev({ k: 'smash', x: r0(cx), y: r0(cy), r: r0(R), n, h: hits, pid: p.id });
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
    const el = (has(p, 'fire') || p.sunT > 0) ? (has(p, 'fire') ? fireTint(p) : sunTint(p)) : has(p, 'ice') ? (skinOn(p, 'sand') ? 'sand' : 'ice') : skinFx(p) || (has(p, 'wind') ? 'wind' : '');
    this.arrows.push({ id: ++this.evSeq, owner: p.id, x, y, vx, vy, c, homing, t: homing ? s.homingLife : 2, el: el || (skinOn(p, 'firebow') ? 'fire' : ''), big: sizeOf(p), de: skinOn(p, 'darkelf'), lf: skinOn(p, 'elf') });   // 불화살 스킨: 겉모습만 불
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
  // ---------------- 방패 ----------------
  throwShield(p) {
    const s = SKILLS.shield, c = clamp(p.shCharge, 0, 1);
    p.shCharge = 0;
    if (!p.shieldHeld) return;
    p.shieldHeld = false;
    const y = p.y - bh(p) / 2, x = p.x + p.facing * (bw(p) / 2 + 12);
    this.shields.push({ id: ++this.evSeq, owner: p.id, team: p.team, x, y, vx: p.facing * (s.minSpeed + (s.maxSpeed - s.minSpeed) * c), vy: -40,
      fly: s.flyMin + (s.flyMax - s.flyMin) * c, ground: false, bounced: false, age: 0, big: sizeOf(p), c });
    this.ev({ k: 'shthrow', x: r0(x), y: r0(y), pid: p.id, c: Math.round(c * 10) / 10 });
  }
  updateShields(list, dt) {
    const s = SKILLS.shield;
    // 내 방패가 사라졌는데(시간 되돌리기 등) 손에도 없으면 돌려줌
    for (const p of this.players.values()) if (has(p, 'shield') && !p.shieldHeld && !(p.shieldBack > 0) && !this.shields.some((q) => q.owner === p.id)) p.shieldHeld = true;
    if (!this.shields.length) return;
    for (const sh of this.shields) {
      const owner = this.players.get(sh.owner);
      if (!owner) { sh.dead = true; continue; }
      sh.age += dt;
      if (!sh.ground) {
        const prevY = sh.y;
        if (sh.fly > 0) sh.fly -= dt; else sh.vy = Math.min(sh.vy + s.gravity * dt, CONFIG.MAX_FALL);
        { const k = this.waterK(sh.y); sh.x += sh.vx * dt * k; sh.y += sh.vy * dt * k; }
        const bounce = () => { sh.vx = -sh.vx * s.back; sh.vy = -260; sh.fly = 0; sh.bounced = true; };
        if (this.solidAt(sh.x + Math.sign(sh.vx) * 24, sh.y)) { bounce(); sh.x -= Math.sign(sh.vx) * -4; this.ev({ k: 'shclang', x: r0(sh.x), y: r0(sh.y) }); }
        else if (sh.vy >= 0) { const ly = this.landingY(sh.x, prevY + 20, sh.y + 20); if (ly != null) { sh.y = ly - 20; sh.vx = 0; sh.vy = 0; sh.ground = true; } }
        if (!sh.bounced && !sh.ground && this.phase !== 'countdown' && this.phase !== 'ended') {
          const def = { damage: s.dmg, baseKB: s.baseKB * (0.7 + 0.5 * sh.c), growthKB: s.growthKB, lift: 0.4 };
          for (const o of list) {
            if (!this.foe(sh, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
            const ow = bw(o), oh = bh(o);
            if (Math.abs(o.x - sh.x) < ow / 2 + 24 && sh.y > o.y - oh - 22 && sh.y < o.y + 22) {
              const dir = Math.sign(sh.vx) || 1;
              this.applyHit(owner, o, def, sh.c > 0.7 ? 'heavy' : 'light', { dir });
              this.elementHit(owner, o, 'light', dir);
              if (o.clone) this.hitClone(o);
              bounce(); this.ev({ k: 'shclang', x: r0(sh.x), y: r0(sh.y) });
              break;
            }
          }
        }
        const b = this.stage.blast;
        if (sh.x < b.left || sh.x > b.right || sh.y > b.bottom) {
          // 장외로 떨어짐: 10초 뒤 손에 다시 생김
          sh.dead = true; owner.shieldBack = s.respawn;
          this.ev({ k: 'shlost', pid: owner.id, only: owner.id });
          continue;
        }
      }
      // 주인만 주울 수 있음 (던지고 잠깐 뒤부터)
      if (sh.age > 0.3 && owner.alive && !owner.inside && Math.abs(owner.x - sh.x) < s.pickR && owner.y > sh.y - 30 && owner.y - bh(owner) < sh.y + 30) {
        sh.dead = true; owner.shieldHeld = true; owner.shieldBack = 0;
        this.ev({ k: 'shpick', x: r0(sh.x), y: r0(sh.y), pid: owner.id });
      }
    }
    this.shields = this.shields.filter((q) => !q.dead);
  }
  // ---------------- 촉수 ----------------
  fireTentacle(p, i) {
    const tc = p.tents[i], s = SKILLS.tentacle;
    if (!tc || tc.cd > 0 || tc.t > 0) return;
    if (p.anchorT > 0 && i >= 2) return;              // 땅을 짚은 아래 촉수(K·L)는 공격 못 함
    const aim = (p.input.u ? -0.5 : 0) + (p.input.d ? 0.5 : 0);
    tc.t = 0.0001; tc.cd = s.gap; tc.ang = [-0.24, -0.08, 0.08, 0.24][i] + aim; tc.hit = new Set();
    this.ev({ k: 'tentacle', x: r0(p.x), y: r0(p.y - bh(p) / 2), pid: p.id, i });
  }
  // 촉수 끝이 얼마나 뻗었는지 0~1
  tentExt(tc) {
    const s = SKILLS.tentacle;
    if (!(tc.t > 0)) return 0;
    if (tc.t < s.out) return tc.t / s.out;
    if (tc.t < s.out + s.hold) return 1;
    return Math.max(0, 1 - (tc.t - s.out - s.hold) / s.back);
  }
  updateTentacles(p, list) {
    if (!has(p, 'tentacle') || p.clone) return;
    const s = SKILLS.tentacle, size = sizeOf(p);
    const ox = p.x, oy = p.y - bh(p) * 0.55;
    const R = s.reach * size * this.reachBuff(p);
    const def = { damage: s.dmg, baseKB: s.baseKB, growthKB: s.growthKB, lift: 0.4 };
    for (const tc of p.tents) {
      if (!(tc.t > 0) || tc.t > s.out + s.hold) continue;
      const ext = this.tentExt(tc), dx = Math.cos(tc.ang) * p.facing, dy = Math.sin(tc.ang);
      for (const o of list) {
        if (!this.foe(p, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0 || tc.hit.has(o.id)) continue;
        const ow = bw(o), oh = bh(o);
        for (let k = 1; k <= 6; k++) {
          const px = ox + dx * R * ext * (k / 6), py = oy + dy * R * ext * (k / 6);
          if (Math.abs(px - o.x) < ow / 2 + 8 && py > o.y - oh - 8 && py < o.y + 8) {
            tc.hit.add(o.id);
            this.applyHit(p, o, def, 'light', { dir: p.facing });
            this.elementHit(p, o, 'light', p.facing);
            if (o.clone) this.hitClone(o);
            break;
          }
        }
      }
    }
  }
  // ---------------- 닌자 쿠나이 (화살 목록을 같이 씀: 중력 없이 직선) ----------------
  throwKunai(p) {
    const s = SKILLS.ninja, big = sizeOf(p);
    const y = p.y - bh(p) / 2 - 2, x = p.x + p.facing * (bw(p) / 2 + 6);
    // 화염·얼음·바람 등은 화살처럼 쿠나이에도 묻음. 고무·강화·거인 등 사거리 버프만큼 멀리 날아감
    const el = (has(p, 'fire') || p.sunT > 0) ? (has(p, 'fire') ? fireTint(p) : sunTint(p)) : has(p, 'ice') ? (skinOn(p, 'sand') ? 'sand' : 'ice') : skinFx(p) || (has(p, 'wind') ? 'wind' : '');
    const range = this.reachBuff(p) * (p.rubberT > 0 ? 1.3 : 1);
    this.arrows.push({ id: ++this.evSeq, owner: p.id, x, y, vx: p.facing * s.speed, vy: 0, c: 0.5, ku: 1, t: s.life * clamp(range, 0.3, 2), el, big, sw: skinOn(p, 'snowninja') ? 1 : 0 });
    this.ev({ k: 'kunai', x: r0(x), y: r0(y), pid: p.id, sn: skinOn(p, 'snowninja') ? 1 : 0 });
  }
  // 통나무: 중력으로 떨어져 땅에 놓였다가 사라짐
  updateLogs(dt) {
    if (!this.logs.length) return;
    for (const l of this.logs) {
      l.t -= dt;
      const prevY = l.y;
      l.vy = Math.min(l.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL); l.y += l.vy * dt;
      const ly = this.landingY(l.x, prevY, l.y); if (ly != null) { l.y = ly; l.vy = 0; }
      if (l.y > this.stage.blast.bottom) l.t = 0;
      if (l.t <= 0) this.ev({ k: 'logpoof', x: r0(l.x), y: r0(l.y - 25), sn: l.sn });
    }
    this.logs = this.logs.filter((l) => l.t > 0);
  }
  // 별빛: 별비를 조금씩 뿌리고, 떨어지는 별이 적에 닿으면 피해 + 별 방향으로 밀어냄
  updateStars(list, dt) {
    const s = SKILLS.starlight;
    for (const r of this.starRain) {
      r.timer -= dt;
      while (r.timer <= 0 && r.left > 0) {
        r.timer += r.every; r.left--;
        const span = 260 + r.n * 70, size = 9 + r.n * 2.6;
        // 떨어지는 동안 옆으로 흘러가는 만큼 뒤쪽에서 시작해서, 시전자 앞쪽 넓게 쏟아짐
        const x = r.cx - r.dir * 260 + (Math.random() * 2 - 1) * span + r.dir * 150;
        this.starBits.push({ id: ++this.evSeq, owner: r.owner, team: r.team, x, y: this.stage.blast.top * 0.35 - Math.random() * 160, vx: r.dir * s.fallVX * (0.85 + Math.random() * 0.3), vy: s.fallVY * (0.9 + Math.random() * 0.25), r: size * (0.8 + Math.random() * 0.4), n: r.n, hit: new Set(), t: 3 });
      }
    }
    this.starRain = this.starRain.filter((r) => r.left > 0 && this.players.has(r.owner));
    if (!this.starBits.length) return;
    for (const b of this.starBits) {
      { const k = this.waterK(b.y); b.t -= dt; b.x += b.vx * dt * k; b.y += b.vy * dt * k; }
      if (this.solidAt(b.x, b.y + b.r * 0.5) || b.y > this.stage.blast.bottom) { b.t = 0; this.ev({ k: 'starpop', x: r0(b.x), y: r0(b.y) }); continue; }
      if (this.phase === 'countdown' || this.phase === 'ended') continue;
      const owner = this.players.get(b.owner); if (!owner) { b.t = 0; continue; }
      const def = { damage: 3 + Math.round(b.n * 0.8), baseKB: 170 + b.n * 75, growthKB: 4 + b.n * 1.4, lift: 0.25 };
      for (const o of list) {
        if (!this.foe(b, o) || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0 || b.hit.has(o.id)) continue;
        const ow = bw(o), oh = bh(o);
        if (Math.abs(o.x - b.x) < ow / 2 + b.r && b.y > o.y - oh - b.r && b.y < o.y + b.r) {
          b.hit.add(o.id);
          this.applyHit(owner, o, def, b.n >= 4 ? 'heavy' : 'light', { dir: Math.sign(b.vx) || 1 });
          if (o.clone) this.hitClone(o);
          b.t = 0; this.ev({ k: 'starpop', x: r0(b.x), y: r0(b.y) });
          break;
        }
      }
    }
    this.starBits = this.starBits.filter((b) => b.t > 0);
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
      } else if (!a.ku) {
        a.vy += s.gravity * dt;
      }
      { const k = this.waterK(a.y); a.x += a.vx * dt * k; a.y += a.vy * dt * k; }
      if (this.solidAt(a.x, a.y)) { a.t = 0; this.ev({ k: 'thunk', x: r0(a.x), y: r0(a.y) }); continue; }
      if (this.phase === 'countdown' || this.phase === 'ended') continue;
      const def = a.ku ? { damage: SKILLS.ninja.dmg, baseKB: SKILLS.ninja.baseKB, growthKB: SKILLS.ninja.growthKB, lift: 0.3 }
        : { damage: 4 + Math.round(9 * a.c) + (a.homing ? 3 : 0), baseKB: 200 + 420 * a.c + (a.homing ? 120 : 0), growthKB: 6 + 8 * a.c, lift: 0.35 };
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
          // (예전보다 약하게 끌어서, 반대로 움직이거나 점프하면 빠져나갈 수 있음)
          o.x += (w.x - o.x) * 0.06; o.vx += (w.vx - o.vx) * 0.22; o.vy = approach(o.vy, -200, 2200 * dt);
          o.grounded = false; o.attack = null; o.drawT = 0;
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
    const win = p.mob ? s.mobWindow : s.window;
    if (atk.t >= def.startup - win && atk.t <= def.startup + def.active + win * 0.5) {
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
    for (const sf of [...this.stage.solids, ...this.stage.platforms, ...(this.stage.tramps || [])]) if (x >= sf.x && x <= sf.x + sf.w && prevY <= sf.y && y >= sf.y && (best == null || sf.y < best)) best = sf.y;
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
    // 트램펄린: 위에서 밟으면 높이 튕겨 오름 (↓를 누르고 있으면 살짝만)
    for (const tr of this.stage.tramps || []) {
      if (p.x + hw * 0.5 <= tr.x || p.x - hw * 0.5 >= tr.x + tr.w) continue;
      if (p.vy >= 0 && prevY <= tr.y && p.y >= tr.y) {
        p.y = tr.y; p.vy = -(tr.power || 1500) * (p.input && p.input.d ? 0.35 : 1);
        p.grounded = false; p.jumpsLeft = CONFIG.EXTRA_JUMPS; p.hitstun = Math.min(p.hitstun, 0.05);
        if (this.time - (p.boingAt || -9) > 0.15) { p.boingAt = this.time; this.ev({ k: 'boing', x: r0(p.x), y: r0(tr.y), pid: p.ownerId || p.id }); }
      }
    }
    if (p.grounded) p.jumpsLeft = Math.max(p.jumpsLeft, CONFIG.EXTRA_JUMPS);
    if (p.grounded && p.jumpsLeft > CONFIG.EXTRA_JUMPS) p.jumpsLeft = CONFIG.EXTRA_JUMPS;
  }

  updateAttack(p, list, dt) {
    if (p.fdashT > 0) this.fireDashHits(p, list);
    this.updateTentacles(p, list);
    if (!p.attack) return;
    const atk = p.attack, def = ATTACKS[atk.type];
    atk.t += dt * dopeMul(p, 'atk') * (p.slow > 0 ? SKILLS.slow.attackMul : 1) * (this.inWater(p) && !has(p, 'flood') ? SKILLS.flood.atkMul : 1);
    if (p.hitstun > 0 || p.stunT > 0 || p.iceT > 0) { p.attack = null; return; }
    const sword = has(p, 'sword') && !p.clone;
    // 검사 약공격: 보는 방향으로 돌진하며 벰
    if (sword && atk.type === 'light' && atk.t < def.startup + def.active) {
      p.vx = p.facing * SKILLS.sword.lunge * (p.slow > 0 ? SKILLS.slow.moveMul : 1) * (this.inWater(p) ? SKILLS.flood.dash : 1);
    }
    if (atk.t >= def.startup && atk.t < def.startup + def.active && this.phase !== 'countdown' && this.phase !== 'ended') {
      // 흑섬: Q를 누른 직후에 공격이 맞기 시작하면 흑섬
      if (has(p, 'blackflash') && !atk.black && !atk.bfChecked) {
        atk.bfChecked = true;
        if (this.time - p.bfAt <= (p.mob ? SKILLS.blackflash.mobWindow : SKILLS.blackflash.window)) atk.black = true;   // 모바일은 판정 조금 넉넉하게
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
    const wet = this.inWater(t);   // 물속: 불은 안 붙고, 얼음 게이지는 더 빨리 참
    if (has(a, 'fire') && !wet) this.ignite(t, a, SKILLS.fire.burnHits, dir);
    if (a.sunT > 0 && !wet) this.ignite(t, a, SKILLS.sun.burnHits, dir);
    if (has(a, 'ice')) this.chill(t, (type === 'heavy' ? SKILLS.ice.fillHeavy : SKILLS.ice.fillLight) * (wet ? SKILLS.flood.iceMul : 1), iceSkin(a));
  }
  ignite(t, a, n, dir) {
    // 화염 + 태양을 같이 쓰는 중이면 불 피해 2배
    t.burnMul = has(a, 'fire') && a.sunT > 0 ? 2 : 1;
    // 청염(화염)·초신성(태양) 스킨이면 파란 불
    t.burnBlue = tintNum(has(a, 'fire') ? fireTint(a) : sunTint(a));   // 0 주황 · 1 파랑 · 2 검보라
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
    if (p.burnN > 0 && this.inWater(p)) { p.burnN = 0; this.ev({ k: 'fizz', x: r0(p.x), y: r0(p.y - bh(p) / 2) }); }   // 물에 들어가면 불이 꺼짐
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
        this.ev({ k: 'burn', x: r0(p.x), y: r0(p.y - bh(p) / 2), b: p.burnBlue || 0 });
      }
    }
    const bz = this.blizzards.find((b) => this.foe({ id: b.by }, p));
    if (bz && !(p.frozen > 0)) this.chill(p, SKILLS.ice.blizRate * dt * (this.inWater(p) ? SKILLS.flood.iceMul : 1), bz.skin);
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
      // 홍수 물에 잠기면 고장
      if (this.water && t.y - 20 > this.water.y) { this.turrets = this.turrets.filter((x) => x !== t); this.ev({ k: 'tbreak', x: r0(t.x), y: r0(t.y - 30) }); continue; }
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
        { const k = this.waterK(b.y); b.t -= dt; b.x += b.vx * dt * k; b.y += b.vy * dt * k; }
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
      const ow = this.players.get(o.ownerId);
      // 트와이스 스킨: 진흙처럼 녹아 땅으로 퍼지며 사라짐
      this.ev({ k: 'poof', x: r0(o.x), y: r0(o.y - bh(o) / 2), tw: ow && skinOn(ow, 'twice') ? 1 : 0, gy: r0(o.y), c: o.color });
    }
  }
  // 사거리를 늘려 주는 버프들 (강화·거인·고무·헐크) — 검사 검에도 똑같이 적용
  reachBuff(p) {
    let m = 1;
    if (p.buffT > 0) m *= SKILLS.empower.reachMul;
    if (p.giantT > 0) m *= SKILLS.giant.reachMul;
    if (p.rubberT > 0) m *= SKILLS.rubber.reachMul;
    if (has(p, 'hulk')) m *= 1 + SKILLS.hulk.reach * hulkF(p);
    if (p.gam) m *= p.gam.reach;                                   // 도박: 사거리
    return m;
  }
  hitbox(p, def) {
    const hw = bw(p) / 2, size = sizeOf(p);
    let reach = def.reach * this.reachBuff(p);
    if (has(p, 'sword') && !p.clone) reach *= SKILLS.sword.reachMul;
    if (p.waveT > 0) reach *= SKILLS.wave.reachMul;   // 파동: 공격할 때 파동이 앞으로 뻗어 두 배 거리까지
    const h = def.height * size * (p.waveT > 0 ? 1.25 : 1);
    const x = p.facing > 0 ? p.x + hw - 6 : p.x - hw + 6 - reach;
    return { x, y: p.y - bh(p) / 2 - h / 2 - 4 * size, w: reach, h };
  }
  applyHit(a, t, def, type, opt = {}) {
    // 귀신: 때려도 피해 대신 표식. 같은 사람에게 3번이면 그 사람도 장외
    if (a.ghostT > 0) {
      if (t.clone) return;
      const n = (a.gMarks[t.id] || 0) + 1; a.gMarks[t.id] = n;
      this.ev({ k: 'ghostmark', x: r0(t.x), y: r0(t.y - bh(t)), n, pid: a.id });
      if (n >= SKILLS.ghost.marks) {
        a.gMarks[t.id] = 0;
        t.lastHitBy = a.id; t.lastHitAt = this.tickCount;
        this.ev({ k: 'ghostkill', x: r0(t.x), y: r0(t.y - bh(t) / 2), n: t.name, by: a.name });
        t.y = this.stage.blast.bottom + 200; t.vy = 0;   // 다음 판정에서 장외 처리
      }
      return;
    }
    // 방패 막기: 앞에서 들어온 공격은 막고 살짝만 밀림
    if (t.blockT > 0 && has(t, 'shield') && t.shieldHeld && !t.clone) {
      const dir = opt.dir || a.facing || 1;
      if (dir === -t.facing) {
        t.vx = dir * 160; t.attack = null;
        this.ev({ k: 'block', x: r0(t.x + t.facing * bw(t) / 2), y: r0(t.y - bh(t) / 2), pid: t.id });
        return;
      }
    }
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
    if (a.waveT > 0 && !opt.small) kb *= SKILLS.wave.kbMul;              // 파동: 팔에 감긴 파동으로 세게 침
    kb *= dopeMul(a, 'pow') * dopeMul(t, 'def');                          // 도핑: 힘 · 방어
    if (has(a, 'wind') && !opt.small) kb *= SKILLS.wind.kbMul;               // 바람: 더 날아감                      // 태양: 세게 침          // 헐크: 세게 침
    if (has(t, 'hulk')) kb *= 1 - SKILLS.hulk.tough * hulkF(t);          // 헐크: 덜 날아감
    if (t.giantT > 0) kb *= SKILLS.giant.kbMul;                       // 거인은 덜 날아감
    if (a.gam) kb *= a.gam.kbOut;                                      // 도박: 주는 넉백
    if (type === 'heavy' && has(a, 'shield') && a.shieldHeld && !a.clone && !opt.small) kb *= SKILLS.shield.bashKB;   // 방패 휘두르기
    if (t.anchorT > 0) kb *= SKILLS.tentacle.anchorKB;                  // 촉수로 땅을 짚으면 거의 안 밀림
    if (t.gam) kb *= t.gam.kbIn;                                       // 도박: 받는 넉백
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
      sl.t -= dt; sl.x += sl.vx * dt * this.waterK(sl.y);
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
    // 도박: 죽어도 굴린 배율·쿨타임 그대로
    if (p.skill === 'gamble') keep.skillCd = p.skillCd;
    if (p.skill2 === 'gamble') keep.skillCdB = p.skillCdB;
    // 별빛: 죽을 때마다 별 +1
    if (has(p, 'starlight')) p.starN = Math.min(SKILLS.starlight.max, (p.starN || 0) + 1);
    if (this.phase !== 'playing' || !p.inMatch) {
      // 연습 중(대기실)에 떨어져도 콤보·전환·시간 쿨타임은 그대로
      p.reset(this.stage.respawn.x, this.stage.respawn.y); Object.assign(p, keep); p.invincible = CONFIG.RESPAWN_INVINCIBLE; return;
    }
    p.stocks--;
    this.shields = this.shields.filter((q) => q.owner !== p.id);   // 방패는 다시 손에
    if (p.stocks > 0) { p.reset(this.stage.respawn.x, this.stage.respawn.y); Object.assign(p, keep); p.invincible = CONFIG.RESPAWN_INVINCIBLE; }
    else if (has(p, 'ghost') && !p.ghostUsed) {
      // 귀신: 마지막 5초 동안 귀신이 되어 돌아다님
      p.reset(this.stage.respawn.x, this.stage.respawn.y); Object.assign(p, keep);
      p.ghostUsed = true; p.ghostT = SKILLS.ghost.time; p.gMarks = {}; p.invincible = 0.1;
      this.clones.delete(p.id); this.removeTurrets(p.id);
      this.ev({ k: 'ghost', x: r0(p.x), y: r0(p.y), n: p.name, pid: p.id });
    }
    else { p.ghostT = 0; p.alive = false; this.clones.delete(p.id); this.removeTurrets(p.id); this.checkWinner(); }
  }

  // 귀신 시간이 끝나면 진짜 탈락
  endGhost(p) {
    p.ghostT = 0; p.alive = false; p.invincible = 0;
    this.ev({ k: 'ghostend', x: r0(p.x), y: r0(p.y - 30), n: p.name });
    if (this.phase === 'playing') this.checkWinner();
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
      sl: p.slow > 0 ? 1 : 0, stl: p.stealth > 0 ? 1 : 0, frz: p.frozen > 0 ? (p.frzHaki ? 2 : 1) : 0,
      fly: p.flyT > 0 ? 1 : 0, rk: p.rockT > 0 ? 1 : 0, bf: p.buffT > 0 ? 1 : 0,
      gt: p.giantT > 0 ? 1 : 0, rb: p.rubberT > 0 ? 1 : 0, en: p.engineT > 0 ? 1 : 0,
      stn: p.stunT > 0 ? 1 : 0, qk: p.quakeT > 0 ? (p.quakeWob ? 2 : 1) : 0, qc: p.quakeCastT > 0 ? 1 : 0,
      sz: Math.round(sizeOf(p) * 100) / 100, ig: Math.round(p.iceG || 0), icd: p.iceT > 0 ? 1 : 0,
      brn: p.burnN > 0 ? 1 : 0, fd: p.fdashT > 0 ? 1 : 0,
      er: p.errT > 0 ? (p.errHack ? 2 : 1) : 0, sun: p.sunT > 0 ? 1 : 0,
      rv: p.invT > 0 ? (p.invCrown ? 2 : 1) : 0, pa: p.parryT > 0 ? 1 : 0,
      el: p.electrons > 0 ? [p.electrons, Math.round(p.ePhase * 100) / 100, p.eBoostT > 0 ? 1 : 0] : 0,
      ts: this.timeSaves.has(p.id) ? [r0(this.timeSaves.get(p.id).x), r0(this.timeSaves.get(p.id).y)] : 0,
      dr: p.drawT > 0 ? Math.round(p.drawT * 100) / 100 : 0, cb: p.combo || 0, hm: p.homingNext ? 1 : 0,
      smk: this.inSmoke(p) ? 1 : 0,
      gm: p.gam ? [p.gam.reach, p.gam.kbOut, p.gam.kbIn, p.gam.jump, p.gam.speed, p.gam.size] : 0,
      scn: has(p, 'starlight') ? [p.starN || 0, Math.round(p.starT || 0)] : 0,
      shd: has(p, 'shield') && !p.clone ? [p.shieldHeld ? 1 : 0, p.blockT > 0 ? 1 : 0, Math.round((p.shCharge || 0) * 100) / 100, Math.ceil(p.shieldBack || 0)] : 0,
      tc: has(p, 'tentacle') && !p.clone ? p.tents.flatMap((tc) => [Math.round(this.tentExt(tc) * 100) / 100, Math.round(tc.ang * 100) / 100]) : 0,
      an: p.anchorT > 0 ? [Math.round(p.anchorT * 10) / 10, (() => { const g = this.groundBelow(p.x, p.y); return g == null ? 260 : Math.min(600, r0(g - p.y)); })()] : 0,
      bd: p.bot && !p.dummy ? ['easy', 'mid', 'hard'].indexOf(p.diff) : undefined,
      rs: p.randS1 || p.randS2 ? [p.randS1 ? 1 : 0, p.randS2 ? 1 : 0] : 0,
      br: this.headUnder(p) && !has(p, 'flood') ? Math.ceil(p.breath) : undefined, bl: p.blindT > 0 ? Math.round(p.blindT * 10) / 10 : undefined,
      gh: p.ghostT > 0 ? Math.round(p.ghostT * 10) / 10 : 0,
      wv: p.waveT > 0 ? Math.ceil(p.waveT) : 0,
      dp: p.dope ? [DOPE_KINDS.indexOf(p.dope.k), p.dope.bad ? 1 : 0, Math.ceil(p.dope.t)] : 0,
      mk: (() => { let m = 0; for (const g of this.players.values()) if (g.ghostT > 0 && g.gMarks[p.id]) m = Math.max(m, g.gMarks[p.id]); return m; })(),
    });
    return {
      ph: this.phase, tm: Math.ceil(this.timer), w: this.winner, wi: this.winnerId, wt: this.winTeam,
      md: [this.teamMode ? 1 : 0, this.doubleMode ? 1 : 0], s: this.tickCount, mp: this.stage.id,
      mv: this.phase === 'waiting' && this.mapVote ? [this.mapVote.cands, Object.fromEntries(Object.entries(this.mapVote.votes).filter(([pid]) => this.players.has(pid)).map(([pid, m]) => [pid, this.mapVote.cands.indexOf(m)]))] : 0,
      ev: this.recent.slice(-10),
      ar: this.arrows.map((a) => ({ x: r0(a.x), y: r0(a.y), vx: r0(a.vx), vy: r0(a.vy), h: a.homing ? 1 : 0, de: a.de ? 1 : undefined, lf: a.lf ? 1 : undefined, el: a.el || undefined, s: a.big !== 1 ? Math.round(a.big * 10) / 10 : undefined, ku: a.ku || undefined, sw: a.sw || undefined })),
      lg: this.logs.map((l) => ({ x: r0(l.x), y: r0(l.y), sn: l.sn, t: Math.round(l.t * 10) / 10, s: l.big !== 1 ? Math.round(l.big * 10) / 10 : undefined })),
      fz: this.flashes.map((f) => ({ x: f.x, y: f.y, r: f.r, a: Math.round(Math.min(1, f.t / 0.6) * 100) / 100, o: f.owner, tm: f.team })),
      wa: this.water ? [r0(this.water.y), this.water.lava ? 1 : 0] : 0,
      po: this.potions.map((q) => [r0(q.x), r0(q.y), DOPE_KINDS.indexOf(q.kind), q.owner]),
      shw: this.shields.map((q) => ({ x: r0(q.x), y: r0(q.y), vx: q.ground ? 0 : r0(q.vx), vy: q.ground ? 0 : r0(q.vy), g: q.ground ? 1 : 0, o: q.owner, s: q.big !== 1 ? Math.round(q.big * 10) / 10 : undefined })),
      sb: this.starBits.map((b) => { const o = this.players.get(b.owner); return { x: r0(b.x), y: r0(b.y), vx: r0(b.vx), vy: r0(b.vy), r: Math.round(b.r), m: o && skinOn(o, 'meteor') ? 1 : undefined }; }),
      wd: this.winds.map((w) => { const o = this.players.get(w.owner); return { i: w.id, x: r0(w.x), y: r0(w.y), vx: w.vx, r: o && skinOn(o, 'firetornado') ? 1 : 0 }; }),
      mn: this.mines.map((m) => { const o = this.players.get(m.owner); return { x: r0(m.x), y: r0(m.y), c: m.color, a: m.arm > 0 ? 0 : 1, sk: o && skinOn(o, 'ginkgo') ? 'g' : o && skinOn(o, 'blocks') ? 'b' : undefined }; }),
      tr: this.turrets.map((t) => { const o = this.players.get(t.owner); return { i: t.id, x: r0(t.x), y: r0(t.y), a: Math.round(t.aim * 100) / 100, hp: t.hp, c: t.color, o: t.owner, fg: o && skinOn(o, 'frog') ? 1 : o && skinOn(o, 'llama') ? 2 : 0 }; }),
      bl: this.bullets.map((b) => { const o = this.players.get(b.owner), c = o ? o.color : '#fff'; return b.tg ? { tg: 1, ox: r0(b.ox), oy: r0(b.oy), x: r0(b.x), y: r0(b.y), vx: 0, vy: 0, c } : { x: r0(b.x), y: r0(b.y), vx: r0(b.vx), vy: r0(b.vy), c, sp: o && skinOn(o, 'llama') ? 1 : undefined }; }),
      bz: this.blizzards.length ? Math.ceil(Math.max(...this.blizzards.map((b) => b.t)) * 10) / 10 : 0,
      bzs: this.blizzards.some((b) => b.sand) ? 1 : 0,
      bza: this.blizzards.some((b) => b.skin === 'aurora') ? 1 : 0,
      bzd: this.blizzards.some((b) => b.skin === 'shadow') ? 1 : 0,
      pj: this.slashes.map((sl) => { const o = this.players.get(sl.owner); return { i: sl.id, x: r0(sl.x), y: r0(sl.y), vx: sl.vx, o: sl.owner, d: o && skinOn(o, 'darkness') ? 1 : 0, ho: o && skinOn(o, 'holyknight') ? 1 : 0, lc: o ? (activeSkins(o).map((id) => SKIN_DB[id] && SKIN_DB[id].blade).find(Boolean) || undefined) : undefined }; }),
      sm: this.smokes.map((s) => ({ x: r0(s.x), y: r0(s.y), r: s.r, a: Math.round((s.t / s.max) * 100) / 100, nk: s.nuke ? 1 : undefined })),
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
        isd: p.iceSand ? 1 : 0, iau: p.iceAur ? 1 : 0, idk: p.iceDark ? 1 : 0, slm: p.slow > 0 && p.slowMud ? 1 : 0, sn: activeSkins(p), bb: p.burnN > 0 && p.burnBlue ? p.burnBlue : 0,
        ins: p.inside ? 1 : 0, phost: p.parHost, pt: ten(p.parT), ctl: p.controller, rd: p.ready ? 1 : 0,
      })),
      cl: [...this.clones.values()].map((c) => ({
        id: c.id, ow: c.ownerId, n: c.name, c: c.color, x: r0(c.x), y: r0(c.y), f: c.facing,
        g: c.grounded ? 1 : 0, vx: r0(c.vx), vy: r0(c.vy), al: 1, at: 0, ap: 0,
        sk: c.skill, sk2: c.skill2, sn: this.players.get(c.ownerId) ? activeSkins(this.players.get(c.ownerId)) : [],
        hs: c.hitstun > 0 || c.stunT > 0 ? 1 : 0, b: c.bot ? 1 : 0, inv: 0, ...status(c),
        // 분신이 맞은 효과도 때린 사람 스킨대로 (진흙 둔화 · 파란/검보라 불 · 모래/오로라/어둠 얼음)
        isd: c.iceSand ? 1 : 0, iau: c.iceAur ? 1 : 0, idk: c.iceDark ? 1 : 0, slm: c.slow > 0 && c.slowMud ? 1 : 0, bb: c.burnN > 0 && c.burnBlue ? c.burnBlue : 0,
      })),
    };
  }
}

// ---------------- 봇 ----------------
function botThink(sim, b) {
  const inp = EMPTY_INPUT();
  if (!b.alive || b.hitstun > 0 || b.stunT > 0 || b.iceT > 0 || b.fdashT > 0 || b.inside || b.frozen > 0) {
    if (b.inside) {
      // 기생 중인 봇: 숙주를 가까운 무대 끝으로 몰아 장외로 떨어뜨림 (자살시키기)
      const h = sim.players.get(b.parHost), st = sim.stage;
      if (h) {
        if (b.parDir == null) b.parDir = (h.x - st.left < st.right - h.x) ? -1 : 1;
        if (b.parDir > 0) inp.r = 1; else inp.l = 1;
        // 앞이 벽이면 뛰어넘고, 발판 위면 아래로 내려감, 떨어지는 중엔 점프 안 함
        if (h.grounded && Math.abs(h.vx) < 30 && sim.solidAt(h.x + b.parDir * 40, h.y - 30) && !b.prevInput.u) inp.u = 1;
        if (h.grounded && sim.onPlatform(h)) inp.d = 1;
      }
      // 시간이 거의 다 됐는데 숙주가 아직 무대 위면 빠져나옴
      if (b.parT < 0.4 && h && sim.surfaceBelow(h.x, h.y) && Math.random() < 0.2) {
        const sl = slotsOf(b), key = ['s', 'e', 'x'].find((q) => sl[q] === 'parasite') || 's';
        if (!b.prevInput[key]) inp[key] = 1;
      }
      return inp;
    }
    b.parDir = null;
    return inp;
  }
  // 귀신 봇: 가장 가까운 적에게 날아가서 때림
  if (b.ghostT > 0) {
    let tg = null, bd = 1e9;
    for (const o of sim.players.values()) { if (!sim.foe(b, o) || !o.alive || o.ghostT > 0) continue; const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; tg = o; } }
    if (tg) {
      if (tg.x > b.x + 20) inp.r = 1; else if (tg.x < b.x - 20) inp.l = 1;
      if (tg.y < b.y - 15) inp.u = 1; else if (tg.y > b.y + 15) inp.d = 1;
      if (bd < 80 && !b.attack && !b.prevInput.a) inp.a = 1;
    }
    return inp;
  }
  // 촉수로 땅을 짚은 봇: 무대 가운데 높이로 떠서 이동
  if (b.anchorT > 0 && (b.y > sim.stage.floor + 10)) inp.u = 1;
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
  // 섬광에 눈이 부신 봇: 앞이 안 보여서 허둥지둥 (방향을 바꾸고 아무 데나 휘두름)
  if (b.blindT > 0.2) {
    if (!b.bDirT || b.bDirT <= 0) { b.bDir = [-1, 0, 1][Math.floor(Math.random() * 3)]; b.bDirT = 10 + Math.floor(Math.random() * 20); }
    b.bDirT--;
    if (b.bDir > 0) inp.r = 1; else if (b.bDir < 0) inp.l = 1;
    if (!b.attack && Math.random() < 0.02) { if (Math.random() < 0.3) inp.h = 1; else inp.a = 1; }   // 가끔 허공에 휘두름
    if (!sim.surfaceBelow(b.x + (b.bDir || 0) * 60, b.y) && b.grounded) { inp.l = 0; inp.r = 0; }
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
  const react = (BOT_DIFF[b.diff] || BOT_DIFF.mid).react;   // 위험을 알아채는 정도 (난이도별)
  // ---- 귀신이 된 상대가 있으면 도망침 (귀신은 때려도 소용없음) ----
  if (!offstage) {
    let ghost = null, gd = 1e9;
    for (const o of sim.players.values()) { if (o.ghostT > 0 && sim.foe(b, o)) { const d = Math.hypot(o.x - b.x, o.y - b.y); if (d < gd) { gd = d; ghost = o; } } }
    const marked = ghost && (ghost.gMarks[b.id] || 0);
    if (ghost && gd < 700 && (Math.random() < 0.9 || marked)) {
      const away = b.x >= ghost.x ? 1 : -1;
      let dir = away;
      // 귀신이 더 빠르니, 가까이 오면 사람처럼 머리 위로 뛰어넘어 반대로 빠져나감 (멀면 그냥 도망)
      if (gd < 170 && !b.jukeT) { b.jukeT = 26 + Math.floor(Math.random() * 14); b.jukeDir = -away; }
      if (b.jukeT > 0) {
        b.jukeT--; dir = b.jukeDir;
        if (b.jukeT > 18 && (b.grounded || (b.jumpsLeft > 0 && b.vy > -100))) wantJump = true;
        if (b.jukeT === 0) b.jukeT = -40;      // 한 번 넘은 뒤 잠깐은 다시 도망
      } else if (b.jukeT < 0) b.jukeT++;
      // 무대 끝이면 반대로 꺾음
      if (!sim.surfaceBelow(b.x + dir * 90, b.y) && b.grounded) dir = -dir;
      if (dir > 0) inp.r = 1; else inp.l = 1;
      // 도망용 스킬
      const use0 = (k) => { const sl = slotsOf(b); const key = ['s', 'e', 'x'].find((q) => sl[q] === k); if (key && !b.prevInput[key]) inp[key] = 1; };
      for (const [k, rd] of [[b.skill, b.skillCd <= 0], [b.skill2, b.skillCdB <= 0]]) {
        if (!k || !rd || gd > 230) continue;
        if (k === 'blink' || k === 'ninja' || k === 'stealth' || k === 'freeze' || k === 'fly' || k === 'explode' || k === 'swap') use0(k);
      }
      if (b.flyT > 0 && ghost.y > b.y - 40) inp.u = 1;
      if (wantJump && !b.prevInput.u) inp.u = 1;
      return inp;
    }
  }
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
      if (k === 'ninja' && rd && b.jumpsLeft === 0 && b.vy > 0) use(k);
      if (k === 'tentacle' && rd && b.jumpsLeft === 0 && b.vy > 0) use(k);
    }
    if (b.flyT > 0) inp.u = 1;
  } else {
    let target = null, best = 1e9;
    for (const o of [...sim.players.values(), ...sim.clones.values()]) {
      // 무적(다시 나온 직후)인 상대도 인식은 함 — 귀신만 빼고
      if (!sim.foe(b, o) || !o.alive || o.inside || o.ghostT > 0 || o.frozen > 0) continue;
      b.seen = b.seen || {};
      if (o.stealth > 0) { if (b.seen[o.id] && !b.seen[o.id].hid) b.seen[o.id].hid = sim.time; continue; }   // 은신: 사라진 순간을 기억
      b.seen[o.id] = { x: o.x, y: o.y, hid: 0 };
      // 남의 섬광 자국 안에 있는 상대는 안 보임
      if (sim.flashes.some((f) => sim.foe(f, b) && Math.hypot(o.x - f.x, o.y - bh(o) / 2 - f.y) < f.r * 0.9)) continue;
      // 연기 속에 있는 상대는 봇도 볼 수 없음
      if (sim.smokes.some((s) => Math.hypot(o.x - s.x, o.y - bh(o) / 2 - s.y) < s.r * 0.75)) continue;
      let d = Math.abs(o.x - b.x) + Math.abs(o.y - b.y);
      // 사람처럼: 바위(넉백 없음)·촉수로 땅 짚은 상대는 때려도 잘 안 날아가니 다른 상대를 먼저
      if (o.rockT > 0) d += 380;
      if (o.anchorT > 0) d += 260;
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
      // 이중 점프: 공중에서 상대가 아직 위에 있고 올라가는 힘이 거의 끝났으면 한 번 더
      if (!b.grounded && b.jumpsLeft > 0 && dy < -60 && b.vy > -120 && !b.flyT && !b.anchorT) wantJump = true;
      if (b.flyT > 0 && dy < -40) inp.u = 1;
      // 무적인 상대: 붙어서 기다리다가 무적이 끝날 때 때림
      if (target.invincible > 0.15) b.waitHit = Math.max(b.waitHit || 0, 2);
      // 홍수 봇은 물속에서 상대 높이로 헤엄쳐 감
      if (has(b, 'flood') && sim.inWater(b)) { if (dy < -20) inp.u = 1; else if (dy > 20) inp.d = 1; }
      // 상대가 방패로 막고 있으면 정면으로 때리지 않고 잠깐 기다리거나 뒤로 넘어감
      const blocking = target.blockT > 0 && target.facing === -side && Math.abs(dx) < 140;
      if (blocking) { b.waitHit = 8; if (Math.random() < 0.12 && b.grounded) wantJump = true; }
      // 바위 상태 상대: 굳이 붙지 않고 거리를 둠
      if (target.rockT > 0 && Math.abs(dx) < 120) { inp.l = side > 0 ? 1 : 0; inp.r = side > 0 ? 0 : 1; b.waitHit = 6; }
      // 많이 맞은 상태에서 상대가 강해져 있으면(태양·강화·거인·헐크) 잠깐 거리를 벌림
      const strong = target.sunT > 0 || target.buffT > 0 || target.giantT > 0 || (has(target, 'hulk') && target.hulkS > 1.4);
      if (strong && b.damage > 90 && Math.abs(dx) < 200 && Math.random() < 0.6) { inp.l = side > 0 ? 1 : 0; inp.r = side > 0 ? 0 : 1; }
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
        if (sk === 'ninja' && ready && (b.damage > 70 && best < 160 || b.hitstun > 0.2) && R < 0.06) use(sk);
        if (sk === 'gamble' && ready && R < 0.01) use(sk);
        if (sk === 'flash' && ready && best < 260 && R < 0.05) use(sk);
        if (sk === 'wave' && ready && best < 200 && R < 0.06) use(sk);
        if (sk === 'flood' && ready && !(sim.water && sim.water.drain) && (target.y >= b.y - 20 || sim.water) && R < 0.025) use(sk);
        if (sk === 'starlight' && b.skillCd <= 0 && b.starN >= 3 && best < 420 && R < 0.04) use(sk);
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
      // 방패 봇: 멀리 있으면 방패를 충전해서 던지고, 떨어진 방패는 주우러 감
      if (has(b, 'shield') && b.shieldHeld && !(b.shHold > 0) && Math.abs(dx) > 170 && Math.abs(dx) < 650 && Math.abs(dy) < 100 && b.facing === side && Math.random() < 0.02) b.shHold = 15 + Math.floor(Math.random() * 40);
      if (has(b, 'shield') && !b.shieldHeld) {
        const mine = sim.shields.find((q) => q.owner === b.id && q.ground);
        if (mine && sim.surfaceBelow(mine.x, mine.y)) { inp.l = mine.x < b.x - 10 ? 1 : 0; inp.r = mine.x > b.x + 10 ? 1 : 0; if (mine.y < b.y - 60) wantJump = true; }
      }
      if (b.waitHit > 0) { b.waitHit--; } else if (b.archHold > 0) { /* 시위 당기는 중 */ } else if (Math.abs(dx) < 80 && Math.abs(dy) < 50 && b.facing === side && !b.attack && b.botCd <= 0) {
        if (target.damage > 70 && Math.random() < 0.5) inp.h = 1; else inp.a = 1;
        b.botCd = 14 + Math.floor(Math.random() * 18);
      }
    }
    // ---- 은신한 상대만 남았으면: 마지막으로 본 자리 근처를 돌아다니며 허공을 때려 봄 (사람처럼) ----
    if (!target) {
      const lost = Object.entries(b.seen || {}).map(([id, v]) => ({ o: sim.players.get(id), v }))
        .filter(({ o, v }) => o && o.alive && o.stealth > 0 && sim.foe(b, o) && v.hid)
        .sort((p1, p2) => Math.abs(p1.v.x - b.x) - Math.abs(p2.v.x - b.x))[0];
      if (lost) {
        const since = sim.time - lost.v.hid, spread = Math.min(420, 90 + since * 110);   // 시간이 지날수록 넓게 찾음
        if (!b.searchT || b.searchT <= 0 || b.searchX == null) {
          b.searchX = clamp(lost.v.x + (Math.random() * 2 - 1) * spread, st.left + 30, st.right - 30);
          b.searchT = 25 + Math.floor(Math.random() * 35);
        }
        b.searchT--;
        const sdx = b.searchX - b.x;
        if (Math.abs(sdx) > 18) { if (sdx > 0) inp.r = 1; else inp.l = 1; }
        else { b.searchT = Math.min(b.searchT, 6); if (Math.random() < 0.5) inp.r = 1; else inp.l = 1; }   // 도착하면 뒤돌아봄
        if (b.botCd > 0) b.botCd--;
        if (!b.attack && b.botCd <= 0 && Math.random() < 0.22) { if (Math.random() < 0.3) inp.h = 1; else inp.a = 1; b.botCd = 8 + Math.floor(Math.random() * 16); }
        if (b.grounded && Math.random() < 0.02) wantJump = true;
        if (b.grounded && lost.v.y < b.y - 120 && Math.random() < 0.04) wantJump = true;
      }
    }
    // ---- 위험 피하기 (사람처럼) ----
    if (Math.random() < react) {
      const mv = inp.r ? 1 : inp.l ? -1 : 0;
      // 적 지뢰를 밟을 것 같으면 뛰어넘음
      if (b.grounded && mv && sim.mines.some((m) => m.arm <= 0 && sim.foe(m, b) && (m.x - b.x) * mv > 10 && Math.abs(m.x - b.x) < 95 && Math.abs(m.y - b.y) < 12)) wantJump = true;
      // 날아오는 화살·쿠나이·참격·총알·방패: 뛰어서 피함
      const inc = [...sim.arrows, ...sim.slashes, ...sim.bullets, ...sim.shields.filter((q) => !q.ground && !q.bounced)].some((q) => sim.foe(q, b) && Math.sign(b.x - q.x) === Math.sign(q.vx || 0) && Math.abs(b.x - q.x) < 230 && Math.abs((q.y || 0) - (b.y - bh(b) / 2)) < 55);
      if (inc && b.grounded) wantJump = true;
      // 떨어지는 별비 아래에 있으면 옆으로 빠짐
      const star = sim.starBits.find((q) => sim.foe(q, b) && q.y < b.y && Math.abs(q.x + q.vx * ((b.y - q.y) / Math.max(1, q.vy)) - b.x) < 70);
      if (star) { const away = b.x >= star.x ? 1 : -1; inp.r = away > 0 ? 1 : 0; inp.l = away > 0 ? 0 : 1; }
      // 다가오는 바람 소용돌이: 반대로 뛰어 피함
      const wnd = sim.winds.find((w) => sim.foe(w, b) && Math.sign(b.x - w.x) === Math.sign(w.vx) && Math.abs(b.x - w.x) < 260);
      if (wnd) { const away = Math.sign(wnd.vx); inp.r = away > 0 ? 1 : 0; inp.l = away > 0 ? 0 : 1; if (Math.abs(b.x - wnd.x) < 150 && b.grounded) wantJump = true; }
    }
    edgeGuard();
    // 벽에 막혀 못 가면 점프
    if (b.grounded && (inp.l || inp.r) && Math.abs(b.vx) < 30) { b.stuckT = (b.stuckT || 0) + 1; if (b.stuckT > 12) { wantJump = true; b.stuckT = 0; } }
    else b.stuckT = 0;
  }
  // 도핑 봇: 싸울 상대가 가까이 없으면(또는 물약이 바로 옆이면) 물약을 주우러 감
  if (has(b, 'dope') && !(b.hitstun > 0)) {
    let pot = null, pd = 1e9, fd = 1e9;
    for (const q of sim.potions) if (q.owner === b.id && q.landed) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < pd) { pd = d; pot = q; } }
    for (const o of sim.players.values()) if (sim.foe(b, o) && o.alive) fd = Math.min(fd, Math.hypot(o.x - b.x, o.y - b.y));
    if (pot && pd < 900 && (fd > 240 || pd < 110) && !(b.dope && !b.dope.bad && fd < 400)) {
      inp.l = pot.x < b.x - 10 ? 1 : 0; inp.r = pot.x > b.x + 10 ? 1 : 0;
      if (pot.y < b.y - 50 && (b.grounded || b.vy > 0)) wantJump = true;
      if (pot.y > b.y + 40 && b.grounded && Math.abs(pot.x - b.x) < 80) inp.d = 1;
    }
  }
  // 물속(홍수 사용자 아님): 숨이 모자라면 계속 위로 헤엄쳐 올라감
  if (sim.water && !has(b, 'flood') && sim.headUnder(b) && b.breath < 7) wantJump = true;
  if (wantJump && !b.prevInput.u) inp.u = 1;
  if (inp.s && b.prevInput.s) inp.s = 0;
  if (inp.e && b.prevInput.e) inp.e = 0;
  if (inp.x && b.prevInput.x) inp.x = 0;
  if (b.shHold > 0) { b.shHold--; const sl = slotsOf(b), key = ['s', 'e', 'x'].find((q) => sl[q] === 'shield'); if (key) inp[key] = 1; }
  return inp;
}

// ---------------- 봇 난이도 ----------------
// 하드 = 원래 봇 그대로. 미들·이지는 반응이 늦고, 공격·스킬을 덜 쓰고, 가끔 멍하니 있음
const BOT_DIFF = {
  hard: { delay: 0, atk: 1, skill: 1, idle: 0, react: 0.5 },
  mid:  { delay: 6, atk: 0.72, skill: 0.62, idle: 0.002, react: 0.32 },
  easy: { delay: 12, atk: 0.45, skill: 0.36, idle: 0.006, react: 0.18 },
};
function botInput(sim, b) {
  const D = BOT_DIFF[b.diff] || BOT_DIFF.mid;
  const raw = botThink(sim, b);
  if (D === BOT_DIFF.hard) return raw;
  // 공격·스킬 키는 "새로 누르는 순간"마다 확률로 그냥 넘김 (누르고 있는 동안은 같은 결정 유지)
  b.keyKeep = b.keyKeep || {}; b.rawPrev = b.rawPrev || {};
  for (const k of ['a', 'h', 's', 'e', 'x']) {
    if (raw[k] && !b.rawPrev[k]) b.keyKeep[k] = Math.random() < (k === 'a' || k === 'h' ? D.atk : D.skill);
    b.rawPrev[k] = raw[k];
    if (raw[k] && !b.keyKeep[k]) raw[k] = 0;
  }
  // 가끔 잠깐 멍하니 있음 (떨어지는 중엔 안 멈춤)
  if (b.idleT > 0) { b.idleT--; if (b.grounded) return EMPTY_INPUT(); }
  else if (b.grounded && Math.random() < D.idle) b.idleT = 20 + Math.floor(Math.random() * 40);
  // 반응 지연: 몇 틱 전의 판단을 지금 씀
  b.inQ = b.inQ || [];
  b.inQ.push(raw);
  while (b.inQ.length > D.delay + 1) b.inQ.shift();
  return b.inQ.length > D.delay ? b.inQ[0] : EMPTY_INPUT();
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

module.exports = { Sim, MAPS, COLORS, CONFIG, SKILLS, SKILL_IDS, BOT_NAMES, TEAMS, validSkill, cleanInput, EMPTY_INPUT, slotsOf, conflicts };
