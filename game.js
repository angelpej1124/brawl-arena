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
// 스킬 (Q) — 숫자를 바꿔서 밸런스를 조절하세요
const SKILLS = {
  slow:  { name: '둔화', cd: 6, radius: 230, duration: 5, moveMul: 0.5, attackMul: 0.5 },
  blink: { name: '점멸', cd: 12, distance: 230 },
  stealth: { name: '은신', cd: 11, duration: 5 },   // 상대 화면에서 사라짐 (맞으면 맞음)
  clone: { name: '분신', cd: 10, hits: 4 },          // 나를 지키는 분신, 4대 맞으면 사라짐
};
const SKILL_IDS = Object.keys(SKILLS);
const STAGE = {
  width: 1280, height: 720,
  solids: [{ x: 240, y: 520, w: 800, h: 70 }],
  platforms: [{ x: 320, y: 385, w: 200 }, { x: 760, y: 385, w: 200 }, { x: 540, y: 255, w: 200 }],
  blast: { left: -260, right: 1540, top: -520, bottom: 980 },
  spawns: [{ x: 340, y: 520 }, { x: 940, y: 520 }, { x: 640, y: 255 }, { x: 420, y: 385 }, { x: 860, y: 385 }, { x: 640, y: 520 }],
};
const COLORS = ['#ff5a5f', '#3fa7ff', '#ffc93c', '#4cd97b', '#c77dff', '#ff8c42'];
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 바둑이', '봇 민수', '봇 지수'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const EMPTY_INPUT = () => ({ l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, s: 0 });
const cleanInput = (i) => ({ l: i.l ? 1 : 0, r: i.r ? 1 : 0, u: i.u ? 1 : 0, d: i.d ? 1 : 0, a: i.a ? 1 : 0, h: i.h ? 1 : 0, s: i.s ? 1 : 0 });
const validSkill = (s) => (Object.prototype.hasOwnProperty.call(SKILLS, s) ? s : 'slow');

class Player {
  constructor(id, name, color, bot, skill) {
    this.id = id; this.name = name; this.color = color; this.bot = !!bot; this.skill = validSkill(skill);
    this.input = EMPTY_INPUT(); this.prevInput = EMPTY_INPUT();
    this.inMatch = false; this.wins = 0; this.stocks = 0; this.kos = 0;
    this.reset(0, 0); this.alive = false;
    this.botCd = 0;
  }
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.facing = x < STAGE.width / 2 ? 1 : -1;
    this.grounded = false; this.jumpsLeft = CONFIG.EXTRA_JUMPS;
    this.damage = 0; this.hitstun = 0; this.invincible = 0;
    this.attack = null; this.dropThrough = 0; this.alive = true;
    this.lastHitBy = null; this.lastHitAt = 0;
    this.skillCd = 0; this.slow = 0; this.stealth = 0;
  }
}

class Sim {
  constructor() {
    this.players = new Map();
    this.clones = new Map(); // 주인 id -> 분신
    this.phase = 'waiting'; this.timer = 0; this.winner = null; this.winnerId = null;
    this.tickCount = 0; this.evSeq = 0; this.recent = [];
    this.onEvent = () => {};
  }
  list() { return [...this.players.values()]; }
  ev(e) {
    e.i = ++this.evSeq;
    this.recent.push(e);
    if (this.recent.length > 10) this.recent.shift();
    this.onEvent(e);
  }
  freeColor() {
    const used = new Set(this.list().map((p) => p.color));
    return COLORS.find((c) => !used.has(c)) || COLORS[this.players.size % COLORS.length];
  }
  addPlayer(id, name, bot, skill) {
    if (this.players.has(id) || this.players.size >= CONFIG.MAX_PLAYERS) return null;
    const p = new Player(id, name, this.freeColor(), bot, skill);
    this.players.set(id, p);
    this.ev({ k: 'join', n: name });
    return p;
  }
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    this.clones.delete(id);
    this.ev({ k: 'leave', n: p.name });
    if (this.phase === 'playing') this.checkWinner();
    if (this.phase === 'countdown' && this.players.size < 2) this.phase = 'waiting';
  }
  checkStart() {
    if (this.players.size >= 2) { this.phase = 'countdown'; this.timer = CONFIG.COUNTDOWN; }
  }
  startRound() {
    this.phase = 'playing'; this.winner = null; this.winnerId = null;
    this.clones.clear();
    this.list().forEach((p, i) => {
      const s = STAGE.spawns[i % STAGE.spawns.length];
      p.reset(s.x, s.y); p.stocks = CONFIG.STOCKS; p.kos = 0; p.botKos = 0; p.inMatch = true;
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
    if (this.phase === 'waiting') {
      if (this.players.size >= 2) this.checkStart();
    } else if (this.phase === 'countdown') {
      this.timer -= dt;
      if (this.players.size < 2) this.phase = 'waiting';
      else if (this.timer <= 0) this.startRound();
    } else if (this.phase === 'ended') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.list().forEach((p) => { p.inMatch = false; });
        this.phase = 'waiting'; this.checkStart();
      }
    }
    const list = this.list();
    list.forEach((p, idx) => {
      if (this.phase !== 'playing' && !p.alive) {
        const s = STAGE.spawns[idx % STAGE.spawns.length];
        p.reset(s.x, s.y);
        // 결과 화면 동안은 '이번 판 참가자' 표시를 유지해야 기록이 정확히 남음
        if (this.phase !== 'ended') p.inMatch = false;
      }
      if (p.bot) p.input = botThink(this, p);
      if (p.alive) this.updatePlayer(p, dt);
    });
    const clones = [...this.clones.values()];
    for (const c of clones) {
      const owner = this.players.get(c.ownerId);
      if (!owner || !owner.alive) { this.clones.delete(c.ownerId); continue; }
      c.input = cloneThink(this, c, owner);
      this.updatePlayer(c, dt);
    }
    const targets = list.concat([...this.clones.values()]);
    for (const p of list) if (p.alive) this.updateAttack(p, targets, dt);
    for (const p of list) if (p.alive) this.checkBlast(p);
    for (const c of this.clones.values()) this.checkCloneBounds(c);
    for (const p of targets) p.prevInput = { ...p.input };
  }
  updatePlayer(p, dt) {
    const inp = p.input, prev = p.prevInput;
    const pressed = (k) => inp[k] && !prev[k];
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (p.invincible > 0) p.invincible -= dt;
    if (p.dropThrough > 0) p.dropThrough -= dt;
    if (p.skillCd > 0) p.skillCd = Math.max(0, p.skillCd - dt);
    if (p.slow > 0) p.slow = Math.max(0, p.slow - dt);
    if (p.stealth > 0) p.stealth = Math.max(0, p.stealth - dt);
    const slowMul = p.slow > 0 ? SKILLS.slow.moveMul : 1;
    const canFight = this.phase === 'playing' || this.phase === 'waiting';
    if (p.hitstun > 0) {
      p.hitstun -= dt;
      p.vx = approach(p.vx, 0, 500 * dt);
    } else {
      const attacking = p.attack !== null;
      const heavyLock = attacking && p.attack.type === 'heavy';
      const speed = CONFIG.RUN_SPEED * slowMul * (heavyLock && p.grounded ? 0.25 : 1);
      p.vx = approach(p.vx, dir * speed, (p.grounded ? CONFIG.GROUND_ACCEL : CONFIG.AIR_ACCEL) * slowMul * dt);
      if (dir !== 0 && !attacking) p.facing = dir;
      if (pressed('u')) {
        if (p.grounded) {
          p.vy = -CONFIG.JUMP_SPEED; p.grounded = false;
          this.ev({ k: 'jump', x: Math.round(p.x), y: Math.round(p.y), pid: p.ownerId || p.id });
        } else if (p.jumpsLeft > 0) {
          p.vy = -CONFIG.DOUBLE_JUMP_SPEED; p.jumpsLeft--;
          this.ev({ k: 'jump2', x: Math.round(p.x), y: Math.round(p.y), pid: p.ownerId || p.id });
        }
      }
      if (p.grounded && pressed('d') && this.onPlatform(p)) { p.dropThrough = 0.25; p.grounded = false; p.y += 2; }
      if (canFight && pressed('s') && p.skillCd <= 0) this.useSkill(p);
      if (canFight && !attacking) {
        if (pressed('a')) p.attack = { type: 'light', t: 0, hit: new Set() };
        else if (pressed('h')) p.attack = { type: 'heavy', t: 0, hit: new Set() };
      }
    }
    p.vy = Math.min(p.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    this.moveAndCollide(p, dt);
  }

  // ---------------- 스킬 ----------------
  useSkill(p) {
    if (p.skill === 'slow') {
      const s = SKILLS.slow;
      const cx = p.x, cy = p.y - CONFIG.PLAYER_H / 2;
      let hits = 0;
      for (const o of [...this.players.values(), ...this.clones.values()]) {
        if (o === p || o.ownerId === p.id || !o.alive || o.invincible > 0) continue;
        const d = Math.hypot(o.x - cx, o.y - CONFIG.PLAYER_H / 2 - cy);
        if (d <= s.radius) { o.slow = s.duration; if (!o.clone) hits++; }
      }
      p.skillCd = s.cd;
      this.ev({ k: 'slow', x: Math.round(cx), y: Math.round(cy), r: s.radius, h: hits, pid: p.id });
    } else if (p.skill === 'stealth') {
      const s = SKILLS.stealth;
      p.stealth = s.duration;
      p.skillCd = s.cd;
      this.ev({ k: 'stealth', x: Math.round(p.x), y: Math.round(p.y - CONFIG.PLAYER_H / 2) });
    } else if (p.skill === 'clone') {
      const s = SKILLS.clone;
      const old = this.clones.get(p.id);
      if (old) this.ev({ k: 'poof', x: Math.round(old.x), y: Math.round(old.y - CONFIG.PLAYER_H / 2) });
      // 분신: 주인과 똑같은 모습 (이름·색·스킬 표시까지 같게)
      const c = new Player('c-' + p.id + '-' + this.tickCount, p.name, p.color, p.bot, p.skill);
      c.clone = true; c.ownerId = p.id; c.hitsTaken = 0;
      let cx = p.x - p.facing * 60;
      if (this.insideSolid(cx, p.y)) cx = p.x;
      c.reset(cx, p.y);
      c.facing = p.facing; c.vx = p.vx; c.vy = p.vy;
      c.patrol = -p.facing; c.patrolT = 0;
      this.clones.set(p.id, c);
      p.skillCd = s.cd;
      this.ev({ k: 'clone', x: Math.round(cx), y: Math.round(p.y - CONFIG.PLAYER_H / 2), pid: p.id });
    } else {
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
      this.ev({ k: 'blink', x: Math.round(x0), y: Math.round(y0), x2: Math.round(bx), y2: Math.round(by), pid: p.id });
    }
  }
  insideSolid(x, y) {
    const hw = CONFIG.PLAYER_W / 2, h = CONFIG.PLAYER_H;
    return STAGE.solids.some((s) => x + hw > s.x && x - hw < s.x + s.w && y > s.y + 1 && y - h < s.y + s.h);
  }

  onPlatform(p) {
    return STAGE.platforms.some((pl) => Math.abs(p.y - pl.y) < 1 && p.x > pl.x && p.x < pl.x + pl.w);
  }
  moveAndCollide(p, dt) {
    const hw = CONFIG.PLAYER_W / 2, h = CONFIG.PLAYER_H;
    p.x += p.vx * dt;
    for (const s of STAGE.solids) {
      if (p.y > s.y && p.y - h < s.y + s.h && p.x + hw > s.x && p.x - hw < s.x + s.w) {
        if (p.vx > 0 || p.x < s.x + s.w / 2) p.x = s.x - hw; else p.x = s.x + s.w + hw;
        p.vx = 0;
      }
    }
    const prevY = p.y;
    p.y += p.vy * dt; p.grounded = false;
    for (const s of STAGE.solids) {
      if (p.x + hw <= s.x || p.x - hw >= s.x + s.w) continue;
      if (p.vy >= 0 && prevY <= s.y && p.y >= s.y) { p.y = s.y; p.vy = 0; p.grounded = true; }
      else if (p.vy < 0 && prevY - h >= s.y + s.h && p.y - h < s.y + s.h) { p.y = s.y + s.h + h; p.vy = 0; }
    }
    if (p.dropThrough <= 0 && p.hitstun <= 0.05) {
      for (const pl of STAGE.platforms) {
        if (p.x + hw * 0.5 <= pl.x || p.x - hw * 0.5 >= pl.x + pl.w) continue;
        if (p.vy >= 0 && prevY <= pl.y && p.y >= pl.y) { p.y = pl.y; p.vy = 0; p.grounded = true; }
      }
    }
    if (p.grounded) p.jumpsLeft = CONFIG.EXTRA_JUMPS;
  }
  updateAttack(p, list, dt) {
    if (!p.attack) return;
    const atk = p.attack, def = ATTACKS[atk.type];
    atk.t += dt * (p.slow > 0 ? SKILLS.slow.attackMul : 1);
    if (p.hitstun > 0) { p.attack = null; return; }
    if (atk.t >= def.startup && atk.t < def.startup + def.active && this.phase !== 'countdown' && this.phase !== 'ended') {
      const hb = this.hitbox(p, def);
      const overlaps = (o) => {
        const ox = o.x - CONFIG.PLAYER_W / 2, oy = o.y - CONFIG.PLAYER_H;
        return hb.x < ox + CONFIG.PLAYER_W && hb.x + hb.w > ox && hb.y < oy + CONFIG.PLAYER_H && hb.y + hb.h > oy;
      };
      // 분신과 주인이 한 공격에 같이 걸리면 분신만 맞음 (분신이 지켜줌)
      const shielded = new Set();
      for (const o of list) if (o.clone && o.ownerId !== p.id && overlaps(o)) shielded.add(o.ownerId);
      for (const o of list) {
        if (o === p || o.ownerId === p.id || !o.alive || o.invincible > 0 || atk.hit.has(o.id)) continue;
        if (!o.clone && shielded.has(o.id)) continue;
        if (overlaps(o)) {
          atk.hit.add(o.id);
          this.applyHit(p, o, def, atk.type);
          if (o.clone && ++o.hitsTaken >= SKILLS.clone.hits) {
            this.clones.delete(o.ownerId);
            this.ev({ k: 'poof', x: Math.round(o.x), y: Math.round(o.y - CONFIG.PLAYER_H / 2) });
          }
        }
      }
    }
    if (atk.t >= def.total) p.attack = null;
  }
  hitbox(p, def) {
    const hw = CONFIG.PLAYER_W / 2;
    const x = p.facing > 0 ? p.x + hw - 6 : p.x - hw + 6 - def.reach;
    return { x, y: p.y - CONFIG.PLAYER_H / 2 - def.height / 2 - 4, w: def.reach, h: def.height };
  }
  applyHit(a, t, def, type) {
    t.damage = Math.min(t.damage + def.damage, 999);
    const kb = def.baseKB + def.growthKB * t.damage;
    t.vx = a.facing * kb * 0.85; t.vy = -kb * def.lift - 120;
    t.grounded = false; t.hitstun = 0.15 + kb * 0.00025; t.attack = null;
    t.lastHitBy = a.id; t.lastHitAt = this.tickCount;
    this.ev({ k: 'hit', x: Math.round(t.x), y: Math.round(t.y - CONFIG.PLAYER_H / 2), p: type === 'heavy' ? 2 : 1 });
  }
  // 분신이 무대 밖으로 날아가면 주인 옆으로 돌아옴 (KO 아님)
  checkCloneBounds(c) {
    const b = STAGE.blast;
    if (c.x > b.left && c.x < b.right && c.y > b.top && c.y < b.bottom) return;
    const owner = this.players.get(c.ownerId);
    if (!owner) return;
    c.x = owner.x; c.y = owner.y; c.vx = 0; c.vy = 0; c.hitstun = 0; c.damage = 0;
  }
  checkBlast(p) {
    const b = STAGE.blast;
    if (p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom) return;
    this.ev({ k: 'ko', x: Math.round(clamp(p.x, 0, STAGE.width)), y: Math.round(clamp(p.y, 0, STAGE.height)), n: p.name });
    if (p.lastHitBy && this.tickCount - p.lastHitAt < CONFIG.TICK_RATE * 5 && this.phase === 'playing') {
      const killer = this.players.get(p.lastHitBy);
      if (killer) { if (p.bot) killer.botKos = (killer.botKos || 0) + 1; else killer.kos++; }
    }
    if (this.phase !== 'playing' || !p.inMatch) {
      p.reset(640, 120); p.invincible = CONFIG.RESPAWN_INVINCIBLE; return;
    }
    p.stocks--;
    if (p.stocks > 0) { p.reset(640, 120); p.invincible = CONFIG.RESPAWN_INVINCIBLE; }
    else { p.alive = false; this.clones.delete(p.id); this.checkWinner(); }
  }
  snapshot() {
    const ap = (p) => {
      if (!p.attack) return 0;
      const d = ATTACKS[p.attack.type];
      return p.attack.t < d.startup ? 1 : p.attack.t < d.startup + d.active ? 2 : 3;
    };
    return {
      ph: this.phase, tm: Math.ceil(this.timer), w: this.winner, wi: this.winnerId, s: this.tickCount,
      ev: this.recent.slice(-8),
      p: this.list().map((p) => ({
        id: p.id, n: p.name, c: p.color, x: Math.round(p.x), y: Math.round(p.y), f: p.facing,
        g: p.grounded ? 1 : 0, vx: Math.round(p.vx), vy: Math.round(p.vy), dmg: p.damage, st: p.stocks,
        al: p.alive ? 1 : 0, im: p.inMatch ? 1 : 0, at: p.attack ? (p.attack.type === 'heavy' ? 2 : 1) : 0,
        ap: ap(p), inv: p.invincible > 0 ? 1 : 0, hs: p.hitstun > 0 ? 1 : 0, ko: p.kos, wn: p.wins, b: p.bot ? 1 : 0,
        sk: p.skill, cd: Math.ceil(p.skillCd * 10) / 10, sl: p.slow > 0 ? 1 : 0, stl: p.stealth > 0 ? 1 : 0,
      })),
      cl: [...this.clones.values()].map((c) => ({
        id: c.id, ow: c.ownerId, n: c.name, c: c.color, x: Math.round(c.x), y: Math.round(c.y), f: c.facing,
        g: c.grounded ? 1 : 0, vx: Math.round(c.vx), vy: Math.round(c.vy), al: 1, at: 0, ap: 0,
        hs: c.hitstun > 0 ? 1 : 0, b: c.bot ? 1 : 0, sl: c.slow > 0 ? 1 : 0, inv: 0,
      })),
    };
  }
  load(gs) {
    this.players.clear();
    this.phase = gs.ph; this.timer = gs.tm; this.winner = gs.w; this.winnerId = gs.wi || null;
    this.evSeq = Math.max(0, ...(gs.ev || []).map((e) => e.i || 0));
    for (const q of gs.p) {
      const p = new Player(q.id, q.n, q.c, q.b, q.sk);
      Object.assign(p, { x: q.x, y: q.y, vx: q.vx, vy: q.vy, facing: q.f, damage: q.dmg, stocks: q.st,
        alive: !!q.al, inMatch: !!q.im, kos: q.ko, wins: q.wn, invincible: q.inv ? 1 : 0,
        skillCd: q.cd || 0, slow: q.sl ? 2 : 0 });
      this.players.set(p.id, p);
    }
  }
}

// ---------------- 봇 ----------------
function botThink(sim, b) {
  const inp = EMPTY_INPUT();
  if (!b.alive || b.hitstun > 0) return inp;
  let wantJump = false;
  const offstage = b.x < 250 || b.x > 1030;
  if (offstage || b.y > 540) {
    if (b.x < 640) inp.r = 1; else inp.l = 1;
    if (b.vy > 100 || b.grounded) wantJump = true;
    // 점멸로 복귀
    if (b.skill === 'blink' && b.skillCd <= 0 && b.jumpsLeft === 0 && b.vy > 0) { inp.u = 1; inp.s = 1; }
  } else {
    let target = null, best = 1e9;
    for (const o of [...sim.players.values(), ...sim.clones.values()]) {
      if (o === b || o.ownerId === b.id || !o.alive || o.invincible > 0 || o.stealth > 0) continue;
      const d = Math.abs(o.x - b.x) + Math.abs(o.y - b.y);
      if (d < best) { best = d; target = o; }
    }
    if (target) {
      const dx = target.x - b.x, dy = target.y - b.y;
      const side = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > 55) { if (side > 0) inp.r = 1; else inp.l = 1; }
      else if (b.facing !== side && !b.attack) { if (side > 0) inp.r = 1; else inp.l = 1; }
      if (dy < -90 && b.grounded) wantJump = true;
      if (dy > 60 && b.grounded && b.y < 500) inp.d = 1;
      if (b.botCd > 0) b.botCd--;
      if (b.skill === 'slow' && b.skillCd <= 0 && best < 170 && Math.random() < 0.05) inp.s = 1;
      if (b.skill === 'stealth' && b.skillCd <= 0 && best < 260 && Math.random() < 0.03) inp.s = 1;
      if (b.skill === 'clone' && b.skillCd <= 0 && !sim.clones.has(b.id) && best < 320 && Math.random() < 0.04) inp.s = 1;
      if (Math.abs(dx) < 80 && Math.abs(dy) < 50 && b.facing === side && !b.attack && b.botCd <= 0) {
        if (target.damage > 70 && Math.random() < 0.5) inp.h = 1; else inp.a = 1;
        b.botCd = 14 + Math.floor(Math.random() * 18);
      }
    }
    if (b.grounded && ((b.x < 280 && inp.l) || (b.x > 1000 && inp.r))) { inp.l = 0; inp.r = 0; }
  }
  if (wantJump && !b.prevInput.u) inp.u = 1;
  if (inp.s && b.prevInput.s) inp.s = 0;
  return inp;
}

// ---------------- 분신 움직임 ----------------
// 주인 근처를 왔다 갔다 하다가, 적이 다가오면 주인과 적 사이를 막아섬. 공격은 안 함.
function cloneThink(sim, c, owner) {
  const inp = EMPTY_INPUT();
  if (c.hitstun > 0) return inp;
  let targetX;
  let enemy = null, best = 1e9;
  for (const o of sim.players.values()) {
    if (o.id === owner.id || !o.alive) continue;
    const d = Math.abs(o.x - owner.x) + Math.abs(o.y - owner.y);
    if (d < best) { best = d; enemy = o; }
  }
  if (enemy && best < 320) {
    const side = enemy.x >= owner.x ? 1 : -1;
    targetX = owner.x + side * 55;
    c.faceTo = side;
  } else {
    if (--c.patrolT <= 0) { c.patrol = -c.patrol || 1; c.patrolT = 60 + Math.floor(Math.random() * 60); }
    targetX = owner.x + c.patrol * 75;
    c.faceTo = owner.facing;
  }
  targetX = clamp(targetX, 260, 1020);
  const dx = targetX - c.x;
  if (Math.abs(dx) > 14) { if (dx > 0) inp.r = 1; else inp.l = 1; }
  else if (c.facing !== c.faceTo) { if (c.faceTo > 0) inp.r = 1; else inp.l = 1; }
  const dy = owner.y - c.y;
  let wantJump = false;
  if (dy < -80 && c.grounded) wantJump = true;                       // 주인이 위에 있으면 따라 올라감
  if (!c.grounded && c.vy > 200 && (c.x < 250 || c.x > 1030 || c.y > 540)) wantJump = true; // 떨어지면 복귀
  if (dy > 60 && c.grounded && c.y < 500) inp.d = 1;                 // 주인이 아래에 있으면 내려감
  if (c.x < 250) inp.r = 1, inp.l = 0;
  if (c.x > 1030) inp.l = 1, inp.r = 0;
  if (wantJump && !c.prevInput.u) inp.u = 1;
  return inp;
}

module.exports = { Sim, CONFIG, SKILLS, SKILL_IDS, BOT_NAMES, validSkill, cleanInput, EMPTY_INPUT };
