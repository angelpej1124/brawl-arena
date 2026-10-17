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
  slow:     { name: '둔화', cd: 6, radius: 230, duration: 5, moveMul: 0.5, attackMul: 0.5 },
  blink:    { name: '점멸', cd: 10, distance: 230 },
  stealth:  { name: '은신', cd: 11, duration: 5 },
  clone:    { name: '분신', cd: 10, hits: 4 },
  swap:     { name: '전환', cd: 15, heavyLock: 1 },                       // 강공격 맞고 1초 동안은 못 씀
  fly:      { name: '비행', cd: 14, duration: 6, up: 380, down: 260, hitDrop: 0.6 },
  explode:  { name: '폭파', cd: 9, radius: 210, power: 640, damage: 6, stun: 0.5, smoke: 3, smokeR: 230 },
  freeze:   { name: '정지', cd: 8, duration: 1 },
  rock:     { name: '바위', cd: 10, duration: 6, moveMul: 0.32, jumpMul: 0.7 },
  magnet:   { name: '자석', cd: 9, cd2: 9, radius: 330, power: 720 },     // Q 끌어당김, E 밀어냄
  empower:  { name: '강화', charge: 8, duration: 6, kbMul: 0.35, reachMul: 1.3, speedMul: 1.35, jumpMul: 1.2 },
  parasite: { name: '기생', hitsNeeded: 3, duration: 7 },
  quake:    { name: '지진', cd: 12, duration: 3 },                        // 시전자 빼고 모두의 화면이 흔들림
  giant:    { name: '거인', cd: 14, duration: 9, size: 2, kbMul: 0.8, speedMul: 0.85, reachMul: 1.6 },
  rubber:   { name: '고무', cd: 13, duration: 7, reachMul: 2, jumpMul: 1.25 },
  engine:   { name: '엔진', cd: 12, duration: 6, speedMul: 1.6, kbPerSpeed: 0.8, kbMax: 2.2 },
  // 검사: 공격이 검으로 바뀜 (사거리 1.25배). 약공격은 앞으로 돌진하며 베기, 강공격은 주변 부채꼴 베기, Q는 참격 발사
  sword:    { name: '검사', cd: 12, reachMul: 1.25, lunge: 620, fanR: 125, slashSpeed: 950, slashLife: 0.65, slashDmg: 9, slashKB: 380, slashGrowth: 12 },
  // 흑섬: Q 자체는 이펙트만. 공격이 맞는 순간과 같은 타이밍(±window초)이면 넉백 강화
  blackflash: { name: '흑섬', cd: 3, window: 0.1, heavyKbMul: 1.45, stun: 0.7 },
  lightning: { name: '번개', cd: 11, radius: 480, count: 3, damage: 10, stun: 3 },
  undying:  { name: '불사', lives: 5 },                                   // 목숨 5개 (패시브)
};
const SKILL_IDS = Object.keys(SKILLS);

const MAPS = require('./public/maps.js');   // 맵 목록 (판마다 랜덤)
const COLORS = MAPS.COLORS.map((c) => c.hex);   // 빨강 파랑 노랑 초록 보라 검정 흰색 주황 핑크
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 바둑이', '봇 민수', '봇 지수'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const EMPTY_INPUT = () => ({ l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, s: 0, e: 0 });
const cleanInput = (i) => ({
  l: i.l ? 1 : 0, r: i.r ? 1 : 0, u: i.u ? 1 : 0, d: i.d ? 1 : 0,
  a: i.a ? 1 : 0, h: i.h ? 1 : 0, s: i.s ? 1 : 0, e: i.e ? 1 : 0,
});
const validSkill = (s) => (Object.prototype.hasOwnProperty.call(SKILLS, s) ? s : 'slow');
const r0 = Math.round;
// 몸 크기 (거인이면 2배)
const sizeOf = (p) => (p && p.giantT > 0 ? SKILLS.giant.size : 1);
const bw = (p) => CONFIG.PLAYER_W * sizeOf(p);
const bh = (p) => CONFIG.PLAYER_H * sizeOf(p);

class Player {
  constructor(id, name, color, bot, skill) {
    this.id = id; this.name = name; this.color = color; this.bot = !!bot; this.skill = validSkill(skill);
    this.input = EMPTY_INPUT(); this.prevInput = EMPTY_INPUT();
    this.inMatch = false; this.wins = 0; this.stocks = 0; this.kos = 0; this.botKos = 0;
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
    this.skillCd = 0; this.skillCd2 = 0;
    this.slow = 0; this.stealth = 0; this.frozen = 0;
    this.flyT = 0; this.flyDownT = 0; this.rockT = 0; this.buffT = 0;
    this.giantT = 0; this.rubberT = 0; this.engineT = 0;
    this.stunT = 0; this.quakeT = 0; this.bfAt = -999;
    this.stillT = 0; this.charged = false;
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
    this.stage = MAPS[Math.floor(Math.random() * MAPS.length)];
    this.phase = 'waiting'; this.timer = 0; this.winner = null; this.winnerId = null;
    this.tickCount = 0; this.time = 0; this.evSeq = 0; this.recent = [];
    this.onEvent = () => {};
  }
  list() { return [...this.players.values()]; }
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
    p.skill = validSkill(skill);
    p.skillCd = 0; p.skillCd2 = 0; p.charged = false; p.stillT = 0; p.parHits = {};
    p.flyT = 0; p.rockT = 0; p.buffT = 0; p.stealth = 0; p.giantT = 0; p.rubberT = 0; p.engineT = 0; p.stunT = 0;
    this.clones.delete(id);
    return null;
  }
  // 방장이 시작 가능한지: 2명 이상(봇 포함), 방장 빼고 사람은 모두 준비
  startStatus(hostId) {
    const humans = this.list().filter((p) => !p.bot && p.id !== hostId);
    const ready = humans.filter((p) => p.ready).length;
    return { ok: this.phase === 'waiting' && this.players.size >= 2 && ready === humans.length, ready, need: humans.length, count: this.players.size };
  }
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.parHost) this.endParasite(p, true);
    if (p.controller) { const c = this.players.get(p.controller); if (c) this.endParasite(c, true); }
    this.players.delete(id);
    this.clones.delete(id);
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
    this.clones.clear(); this.smokes = []; this.slashes = [];
    this.list().forEach((p, i) => {
      p.mapMid = this.stage.width / 2;
      if (p.parHost) this.endParasite(p, true);
      const sp = this.stage.spawns[i % this.stage.spawns.length];
      const keep = { wins: p.wins, inMatch: p.inMatch, stocks: p.stocks };
      p.reset(sp.x, sp.y); Object.assign(p, keep);
      p.invincible = 0.5;
    });
    this.ev({ k: 'map', n: this.stage.name });
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
    this.phase = 'playing'; this.winner = null; this.winnerId = null;
    this.clones.clear(); this.smokes = []; this.slashes = [];
    this.list().forEach((p, i) => {
      const s = this.stage.spawns[i % this.stage.spawns.length];
      p.mapMid = this.stage.width / 2;
      p.reset(s.x, s.y); p.stocks = p.skill === 'undying' ? SKILLS.undying.lives : CONFIG.STOCKS; p.kos = 0; p.botKos = 0; p.inMatch = true;
    });
    this.ev({ k: 'start' });
  }
  checkWinner() {
    const alive = this.list().filter((p) => p.inMatch && p.alive);
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

    const list = this.list();
    list.forEach((p, idx) => {
      if (this.phase !== 'playing' && !p.alive) {
        const s = this.stage.spawns[idx % this.stage.spawns.length];
        p.reset(s.x, s.y);
        if (this.phase !== 'ended') p.inMatch = false;
      }
      if (p.bot) p.input = botThink(this, p);
    });
    // 기생당한 몸은 기생자의 입력으로 움직임 (숙주 스킬은 못 씀)
    for (const p of list) {
      if (!p.controller) continue;
      const c = this.players.get(p.controller);
      if (!c || c.parHost !== p.id) { p.controller = null; continue; }
      p.input = { ...c.input, s: 0, e: 0 };
      p.lastHitBy = c.id; p.lastHitAt = this.tickCount; // 조종해서 떨어뜨리면 기생자 킬
    }
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
      c.input = cloneThink(this, c, owner);
      this.updatePlayer(c, dt);
    }
    const targets = list.concat([...this.clones.values()]);
    for (const p of list) if (p.alive && !p.inside && !(p.frozen > 0)) this.updateAttack(p, targets, dt);
    this.updateSlashes(targets, dt);
    for (const p of list) if (p.alive && !p.inside) this.checkBlast(p);
    for (const c of this.clones.values()) this.checkCloneBounds(c);
    for (const p of targets) p.prevInput = { ...p.input };
  }

  tickTimers(p, dt) {
    if (p.skillCd > 0) p.skillCd = Math.max(0, p.skillCd - dt);
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

    // 강화 충전: 아무것도 안 하고 가만히 서 있는 시간
    if (p.skill === 'empower' && !p.clone && !p.charged && p.buffT <= 0) {
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
    const canFight = this.phase === 'playing' || this.phase === 'waiting';
    const flying = p.flyT > 0;

    if (p.hitstun > 0 || p.stunT > 0) {
      if (p.hitstun > 0) p.hitstun -= dt;
      p.vx = approach(p.vx, 0, 500 * dt);
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
        if (pressed('s')) this.useSkill(p);
        if (pressed('e')) this.useSkill2(p);
      }
      if (canFight && !attacking) {
        if (pressed('a')) p.attack = { type: 'light', t: 0, hit: new Set(), victims: [] };
        else if (pressed('h')) p.attack = { type: 'heavy', t: 0, hit: new Set(), victims: [] };
      }
    }

    if (flying) {
      // 비행: 점프 키를 누르고 있으면 올라가고, 떼면 천천히 내려감
      const s = SKILLS.fly;
      const target = inp.u && p.flyDownT <= 0 && p.hitstun <= 0 ? -s.up : s.down;
      p.vy = approach(p.vy, target, 2600 * dt);
    } else {
      p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    }
    this.moveAndCollide(p, dt);
  }

  // ---------------- 스킬 (Q) ----------------
  useSkill(p) {
    const k = p.skill;
    if (k === 'empower') return this.useEmpower(p);
    if (k === 'parasite') return this.startParasite(p);
    if (p.skillCd > 0) return;
    const cx = p.x, cy = p.y - bh(p) / 2;
    const others = () => [...this.players.values(), ...this.clones.values()].filter(
      (o) => o !== p && o.ownerId !== p.id && o.alive && !o.inside && !(o.frozen > 0));

    if (k === 'slow') {
      const s = SKILLS.slow;
      let hits = 0;
      for (const o of others()) {
        if (o.invincible > 0) continue;
        if (Math.hypot(o.x - cx, o.y - bh(o) / 2 - cy) <= s.radius) { o.slow = s.duration; if (!o.clone) hits++; }
      }
      p.skillCd = s.cd;
      this.ev({ k: 'slow', x: r0(cx), y: r0(cy), r: s.radius, h: hits, pid: p.id });
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
      c.clone = true; c.ownerId = p.id; c.hitsTaken = 0;
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
      const cands = [...this.players.values()].filter((o) => o !== p && o.alive && !o.inside && (this.phase !== 'playing' || o.inMatch));
      if (!cands.length) return this.deny(p, '바꿀 상대가 없어요');
      const o = cands[Math.floor(Math.random() * cands.length)];
      const a = { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
      p.x = o.x; p.y = o.y; p.vx = o.vx; p.vy = o.vy;
      o.x = a.x; o.y = a.y; o.vx = a.vx; o.vy = a.vy;
      p.grounded = false; o.grounded = false;
      p.skillCd = s.cd;
      this.ev({ k: 'swap', x: r0(a.x), y: r0(a.y - 30), x2: r0(p.x), y2: r0(p.y - 30), pid: p.id, pid2: o.id });
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
        if (o === p || !o.alive || o.inside) continue;
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
      for (const o of this.players.values()) if (o !== p && o.alive) o.quakeT = s.duration;
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
    } else if (k === 'undying') {
      return this.deny(p, '불사는 목숨이 5개가 되는 패시브 스킬이에요');
    } else if (k === 'magnet') {
      this.magnet(p, 1);
      p.skillCd = SKILLS.magnet.cd;
    }
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
      if (o === p || o.ownerId === p.id || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0) continue;
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
    this.ev({ k: sign > 0 ? 'pull' : 'push', x: r0(cx), y: r0(cy), r: s.radius, h: hits });
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
    this.ev({ k: 'bfq', x: r0(p.x), y: r0(p.y - bh(p) / 2), pid: p.id });
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
    const cands = [...this.players.values()].filter((o) => o !== p && o.alive && !o.inside && !o.controller
      && (p.parHits[o.id] || 0) >= s.hitsNeeded);
    if (!cands.length) return this.deny(p, `같은 상대를 ${s.hitsNeeded}번 때려야 기생할 수 있어요`);
    const h = cands[Math.floor(Math.random() * cands.length)];
    p.parOrigin = { x: p.x, y: p.y };
    p.inside = true; p.parHost = h.id; p.parT = s.duration;
    p.attack = null; p.vx = 0; p.vy = 0;
    h.controller = p.id; h.attack = null;
    if (this.clones.has(p.id)) this.clones.delete(p.id);
    this.ev({ k: 'infest', x: r0(h.x), y: r0(h.y - bh(h) / 2), n: p.name, n2: h.name });
  }
  updateParasite(p, dt) {
    this.tickTimers(p, dt);
    p.parT -= dt;
    const h = this.players.get(p.parHost);
    const pressedQ = p.input.s && !p.prevInput.s;
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
    return this.stage.solids.some((s) => x + hw > s.x && x - hw < s.x + s.w && y > s.y + 1 && y - h < s.y + s.h);
  }
  onPlatform(p) {
    return this.stage.platforms.some((pl) => Math.abs(p.y - pl.y) < 1 && p.x > pl.x && p.x < pl.x + pl.w);
  }
  moveAndCollide(p, dt) {
    const hw = bw(p) / 2, h = bh(p);
    p.x += p.vx * dt;
    for (const s of this.stage.solids) {
      if (p.y > s.y && p.y - h < s.y + s.h && p.x + hw > s.x && p.x - hw < s.x + s.w) {
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
    if (!p.attack) return;
    const atk = p.attack, def = ATTACKS[atk.type];
    atk.t += dt * (p.slow > 0 ? SKILLS.slow.attackMul : 1);
    if (p.hitstun > 0 || p.stunT > 0) { p.attack = null; return; }
    const sword = p.skill === 'sword' && !p.clone;
    // 검사 약공격: 보는 방향으로 돌진하며 벰
    if (sword && atk.type === 'light' && atk.t < def.startup + def.active) {
      p.vx = p.facing * SKILLS.sword.lunge * (p.slow > 0 ? SKILLS.slow.moveMul : 1);
    }
    if (atk.t >= def.startup && atk.t < def.startup + def.active && this.phase !== 'countdown' && this.phase !== 'ended') {
      // 흑섬: Q를 누른 직후에 공격이 맞기 시작하면 흑섬
      if (p.skill === 'blackflash' && !atk.black && !atk.bfChecked) {
        atk.bfChecked = true;
        if (this.time - p.bfAt <= SKILLS.blackflash.window) atk.black = true;
      }
      const hb = this.hitbox(p, def);
      const fan = sword && atk.type === 'heavy';
      const cx = p.x, cy = p.y - bh(p) / 2, R = SKILLS.sword.fanR * SKILLS.sword.reachMul;
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
      const hittable = (o) => o !== p && o.ownerId !== p.id && o.alive && !o.inside && !(o.frozen > 0) && !(o.invincible > 0);
      // 분신과 주인이 한 공격에 같이 걸리면 분신만 맞음 (분신이 지켜줌)
      const shielded = new Set();
      for (const o of list) if (o.clone && hittable(o) && overlaps(o)) shielded.add(o.ownerId);
      for (const o of list) {
        if (!hittable(o) || atk.hit.has(o.id)) continue;
        if (!o.clone && shielded.has(o.id)) continue;
        if (overlaps(o)) {
          atk.hit.add(o.id);
          const dir = fan ? (Math.sign(o.x - p.x) || p.facing) : p.facing;
          if (!atk.dirs) atk.dirs = new Map();
          atk.dirs.set(o.id, dir);
          atk.victims.push(o);
          this.applyHit(p, o, def, atk.type, { dir, black: !!atk.black });
          if (o.clone) this.hitClone(o);
        }
      }
    }
    if (atk.t >= def.total) p.attack = null;
  }
  hitClone(o) {
    if (++o.hitsTaken >= SKILLS.clone.hits && this.clones.get(o.ownerId) === o) {
      this.clones.delete(o.ownerId);
      this.ev({ k: 'poof', x: r0(o.x), y: r0(o.y - bh(o) / 2) });
    }
  }
  hitbox(p, def) {
    const hw = bw(p) / 2, size = sizeOf(p);
    let reach = def.reach;
    if (p.buffT > 0) reach *= SKILLS.empower.reachMul;
    if (p.giantT > 0) reach *= SKILLS.giant.reachMul;
    if (p.rubberT > 0) reach *= SKILLS.rubber.reachMul;
    if (p.skill === 'sword' && !p.clone) reach *= SKILLS.sword.reachMul;
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
    if (!t.clone && a.skill === 'parasite' && !a.clone) a.parHits[t.id] = (a.parHits[t.id] || 0) + 1;
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
      this.ev({ k: 'bflash', x: r0(t.x), y: r0(t.y - bh(t) / 2), p: type === 'heavy' ? 2 : 1 });
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
    if (t.giantT > 0) kb *= SKILLS.giant.kbMul;                       // 거인은 덜 날아감
    if (a.engineT > 0) {                                               // 엔진: 빠를수록 세게
      const e = SKILLS.engine;
      kb *= Math.min(e.kbMax, 1 + (Math.abs(a.vx) / CONFIG.RUN_SPEED) * e.kbPerSpeed);
    }
    const dir = opt.dir || a.facing;
    t.vx = dir * kb * 0.85; t.vy = -kb * (black ? kdef.lift : def.lift) - 120;
    t.grounded = false; t.hitstun = 0.15 + kb * 0.00025;
    this.ev({ k: 'hit', x: r0(t.x), y: r0(t.y - bh(t) / 2), p: type === 'heavy' || black ? 2 : 1 });
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
      for (const o of list) {
        if (o === owner || o.ownerId === owner.id || !o.alive || o.inside || o.frozen > 0 || o.invincible > 0 || sl.hit.has(o.id)) continue;
        const ow = bw(o), oh = bh(o);
        if (Math.abs(o.x - sl.x) < ow / 2 + 26 && sl.y > o.y - oh - 30 && sl.y < o.y + 30) {
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
      if (killer && killer !== p) { if (p.bot) killer.botKos = (killer.botKos || 0) + 1; else killer.kos++; }
    }
    const keep = { wins: p.wins, skill: p.skill };
    if (this.phase !== 'playing' || !p.inMatch) {
      p.reset(this.stage.respawn.x, this.stage.respawn.y); p.invincible = CONFIG.RESPAWN_INVINCIBLE; return;
    }
    p.stocks--;
    if (p.stocks > 0) { p.reset(this.stage.respawn.x, this.stage.respawn.y); Object.assign(p, keep); p.invincible = CONFIG.RESPAWN_INVINCIBLE; }
    else { p.alive = false; this.clones.delete(p.id); this.checkWinner(); }
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
      smk: this.inSmoke(p) ? 1 : 0,
    });
    return {
      ph: this.phase, tm: Math.ceil(this.timer), w: this.winner, wi: this.winnerId, s: this.tickCount, mp: this.stage.id,
      ev: this.recent.slice(-10),
      pj: this.slashes.map((sl) => ({ i: sl.id, x: r0(sl.x), y: r0(sl.y), vx: sl.vx, o: sl.owner })),
      sm: this.smokes.map((s) => ({ x: r0(s.x), y: r0(s.y), r: s.r, a: Math.round((s.t / s.max) * 100) / 100 })),
      p: this.list().map((p) => ({
        id: p.id, n: p.name, c: p.color, x: r0(p.x), y: r0(p.y), f: p.facing,
        g: p.grounded ? 1 : 0, vx: r0(p.vx), vy: r0(p.vy), dmg: p.damage, st: p.stocks,
        al: p.alive ? 1 : 0, im: p.inMatch ? 1 : 0, at: p.attack ? (p.attack.type === 'heavy' ? 2 : 1) : 0,
        ap: ap(p), inv: p.invincible > 0 ? 1 : 0, hs: p.hitstun > 0 || p.stunT > 0 ? 1 : 0, ms: p.skill === 'undying' ? SKILLS.undying.lives : CONFIG.STOCKS, ko: p.kos, wn: p.wins, b: p.bot ? 1 : 0,
        sk: p.skill, cd: ten(p.skillCd), cd2: ten(p.skillCd2),
        ...status(p),
        ft: ten(p.flyT), rt: ten(p.rockT), bt: ten(p.buffT),
        chg: p.skill === 'empower' ? (p.charged ? 100 : Math.floor((p.stillT / SKILLS.empower.charge) * 100)) : 0,
        pr: p.skill === 'parasite' ? Object.values(p.parHits).filter((n) => n >= SKILLS.parasite.hitsNeeded).length : 0,
        ins: p.inside ? 1 : 0, phost: p.parHost, pt: ten(p.parT), ctl: p.controller, rd: p.ready ? 1 : 0,
      })),
      cl: [...this.clones.values()].map((c) => ({
        id: c.id, ow: c.ownerId, n: c.name, c: c.color, x: r0(c.x), y: r0(c.y), f: c.facing,
        g: c.grounded ? 1 : 0, vx: r0(c.vx), vy: r0(c.vy), al: 1, at: 0, ap: 0,
        sk: c.skill, hs: c.hitstun > 0 || c.stunT > 0 ? 1 : 0, b: c.bot ? 1 : 0, inv: 0, ...status(c),
      })),
    };
  }
}

// ---------------- 봇 ----------------
function botThink(sim, b) {
  const inp = EMPTY_INPUT();
  if (!b.alive || b.hitstun > 0 || b.stunT > 0 || b.inside || b.frozen > 0) {
    // 기생 중인 봇: 3~5초 뒤 빠져나옴
    if (b.inside && b.parT < 3 && Math.random() < 0.02 && !b.prevInput.s) inp.s = 1;
    return inp;
  }
  let wantJump = false;
  const st = sim.stage;
  // 지진에 흔들리는 봇: 방향을 마구 바꾸고, 아무 데나 휘두름
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
    if (sk === 'blink' && b.skillCd <= 0 && b.jumpsLeft === 0 && b.vy > 0) { inp.u = 1; inp.s = 1; }
    if (sk === 'fly' && b.skillCd <= 0 && b.jumpsLeft === 0 && b.vy > 0) inp.s = 1;
    if (b.flyT > 0) inp.u = 1;
  } else {
    let target = null, best = 1e9;
    for (const o of [...sim.players.values(), ...sim.clones.values()]) {
      if (o === b || o.ownerId === b.id || !o.alive || o.inside || o.invincible > 0 || o.frozen > 0) continue;
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
      const ready = b.skillCd <= 0;
      if (sk === 'slow' && ready && best < 170 && R < 0.05) inp.s = 1;
      if (sk === 'stealth' && ready && best < 260 && R < 0.03) inp.s = 1;
      if (sk === 'clone' && ready && !sim.clones.has(b.id) && best < 320 && R < 0.04) inp.s = 1;
      if (sk === 'swap' && ready && R < 0.008) inp.s = 1;
      if (sk === 'fly' && ready && dy < -120 && R < 0.03) inp.s = 1;
      if (sk === 'explode' && ready && best < 140 && R < 0.06) inp.s = 1;
      if (sk === 'freeze' && ready && best < 160 && R < 0.04) inp.s = 1;
      if (sk === 'rock' && ready && b.damage > 60 && best < 220 && R < 0.04) inp.s = 1;
      if (sk === 'magnet' && ready && best > 120 && best < 300 && R < 0.03) inp.s = 1;
      if (sk === 'magnet' && b.skillCd2 <= 0 && best < 110 && (target.x < st.left + 90 || target.x > st.right - 90) && R < 0.08) inp.e = 1;
      if (sk === 'sword' && ready && Math.abs(dy) < 50 && b.facing === side && Math.abs(dx) > 120 && Math.abs(dx) < 600 && R < 0.05) inp.s = 1;
      if (sk === 'lightning' && ready && best < 380 && R < 0.04) inp.s = 1;
      if (sk === 'blackflash' && ready && b.attack && !b.attack.black) {
        // 봇은 가끔 타이밍을 맞춤
        const d = ATTACKS[b.attack.type];
        if (b.attack.t >= d.startup - 0.05 && b.attack.t <= d.startup + d.active && R < 0.35) inp.s = 1;
      }
      if (sk === 'empower' && b.charged && best < 250) inp.s = 1;
      if (sk === 'quake' && ready && best < 400 && R < 0.01) inp.s = 1;
      if ((sk === 'giant' || sk === 'rubber') && ready && best < 200 && R < 0.04) inp.s = 1;
      if (sk === 'engine' && ready && best > 200 && R < 0.03) inp.s = 1;
      if (sk === 'parasite' && Object.values(b.parHits).some((n) => n >= SKILLS.parasite.hitsNeeded) && R < 0.03) inp.s = 1;
      if (Math.abs(dx) < 80 && Math.abs(dy) < 50 && b.facing === side && !b.attack && b.botCd <= 0) {
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
  return inp;
}

// ---------------- 분신 움직임 ----------------
// 주인 근처를 왔다 갔다 하다가, 적이 다가오면 주인과 적 사이를 막아섬. 공격은 안 함.
function cloneThink(sim, c, owner) {
  const inp = EMPTY_INPUT();
  if (c.hitstun > 0 || c.stunT > 0) return inp;
  const ox = owner.inside && owner.parOrigin ? owner.parOrigin.x : owner.x;
  const oy = owner.inside && owner.parOrigin ? owner.parOrigin.y : owner.y;
  let targetX;
  let enemy = null, best = 1e9;
  for (const o of sim.players.values()) {
    if (o.id === owner.id || !o.alive || o.inside) continue;
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

module.exports = { Sim, MAPS, COLORS, CONFIG, SKILLS, SKILL_IDS, BOT_NAMES, validSkill, cleanInput, EMPTY_INPUT };
