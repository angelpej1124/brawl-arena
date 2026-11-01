// =====================================================================
//  레인보우 카드 미니게임 — 레인보우 원카드 · 레인보우 인디언포커
//  - server.js(난투 아레나)가 불러서 씀:  /cards/ 화면 · /cards-ws 실시간 연결 · /api/cards/... 방 목록·랭킹
//  - 한 방에 최대 4명 (사람 + 봇 이지·미들·하드), 나머지는 구경
//  - 보석
//      원카드: 사람 2명 이상 → 1등 +100 · 참가 +20 / 봇이랑만 → 1등 이지 10·미들 25·하드 50 · 참가 5 (accounts.js GEMS)
//      인디언포커: 앉은 사람이 전부 로그인한 사람이면 진짜 보석(베팅할 때 바로 빼 두고 이긴 사람이 다 가져감),
//                 봇이나 게스트가 끼면 연습 칩 (100개씩, 보석 안 바뀜)
// =====================================================================
'use strict';
const crypto = require('crypto');
const D = require('./public/deck.js');
const BOT = require('./bot.js');

const CFG = {
  MAX_SEATS: 4,
  MAX_MEMBERS: 12,
  START_HAND: 5,            // 원카드 처음 카드 수
  ONECARD_TURN_MS: 20000,   // 원카드 한 차례 시간 (넘으면 저절로 카드 받기)
  MIN_PLAYS_FOR_GEMS: 6,    // 원카드: 다 합쳐 이만큼은 내야 보석 지급 (바로 끝나는 판으로 보석 모으기 방지)
  POKER_TURN_MS: 25000,     // 포커 한 차례 시간 (넘으면 체크, 낼 게 있으면 폴드)
  POKER_NEXT_MS: 6000,      // 포커 결과를 보여 주고 다음 판까지
  ANTE: 1,                  // 포커 기본 베팅
  CHIPS: 100,               // 연습 칩
  BOT_MS: [900, 1600],      // 봇이 생각하는 시간
};
if (process.env.LUCKY_FAST) { CFG.BOT_MS = [40, 80]; CFG.POKER_NEXT_MS = 300; }   // 테스트용
const BOT_DIFFS = { easy: '이지', medium: '미들', hard: '하드' };
const BOT_NAMES = ['무지개', '빨강이', '노랑이', '초록이', '파랑이', '보라돌이', '남색이'];
const GAMES = { onecard: '레인보우 원카드', poker: '레인보우 인디언포커' };
const DIFF_RANK = { easy: 1, medium: 2, hard: 3 };

let hooks = { accounts: null, pushProfile: () => {} };
function init(h) { hooks = { ...hooks, ...h }; if (hooks.accounts) hooks.accounts.onShutdown(refundAll); }

const clean = (s, n) => String(s || '').normalize('NFC')
  .replace(/[<>&"'\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').trim().slice(0, n);
const rand = () => crypto.randomInt(1 << 30) / (1 << 30);
const hits = new Map();
function limited(ip, bucket, max, perMs) {
  const k = bucket + ':' + ip, now = Date.now();
  let h = hits.get(k);
  if (!h || h.reset < now) { h = { n: 0, reset: now + perMs }; hits.set(k, h); }
  return ++h.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (h.reset < now) hits.delete(k); }, 60000).unref();

const rooms = new Map();   // 'game:code' -> room
let nextId = 1;
const onlineCount = (game) => [...rooms.values()].filter((r) => !game || r.game === game).reduce((n, r) => n + r.members.size, 0);

class CardRoom {
  constructor(game, code, { isPublic = false, title = '', botRoom = false } = {}) {
    this.game = game; this.code = code; this.isPublic = isPublic; this.title = title || code; this.botRoom = botRoom;
    this.createdAt = Date.now();
    this.members = new Map();   // cid -> { socket, name, key }
    this.seats = [];            // { id, name, key, bot, out, chips }
    this.host = null;
    this.phase = 'waiting';     // waiting · playing · between(포커 판 사이)
    this.g = null;              // 게임 상태
    this.result = null;
    this.ev = [];
    this.timer = setInterval(() => this.tick(), 200);
  }
  get key() { return this.game + ':' + this.code; }
  isFull() { return this.members.size >= CFG.MAX_MEMBERS; }
  seatIdx(id) { return this.seats.findIndex((s) => s.id === id); }
  humans() { return this.seats.filter((s) => !s.bot); }

  // ---------- 사람 · 자리 ----------
  join(cid, socket, name, key) {
    if (this.isFull()) return false;
    this.members.set(cid, { socket, name, key });
    if (!this.host) this.host = cid;
    this.sit(cid, true);
    this.event({ k: 'join', n: name });
    return true;
  }
  sit(cid, quiet) {
    const m = this.members.get(cid);
    if (!m || this.seatIdx(cid) >= 0) return null;
    if (this.phase === 'playing') return quiet ? null : '게임 중이에요. 이번 판이 끝나면 앉을 수 있어요.';
    if (this.seats.length >= CFG.MAX_SEATS) return quiet ? null : '자리가 다 찼어요 (최대 4명).';
    if (m.key && this.seats.some((s) => s.key === m.key)) return quiet ? null : '같은 계정으로 두 자리에 앉을 수 없어요.';
    this.seats.push({ id: cid, name: m.name, key: m.key, bot: null, out: false, chips: CFG.CHIPS });
    return null;
  }
  stand(cid) {
    const i = this.seatIdx(cid);
    if (i < 0) return null;
    if (this.phase === 'playing') return '게임 중에는 일어날 수 없어요.';
    this.seats.splice(i, 1);
    return null;
  }
  addBot(cid, diff) {
    if (cid !== this.host) return '봇은 방장만 넣을 수 있어요.';
    if (this.phase === 'playing') return '게임 중에는 봇을 넣을 수 없어요.';
    if (this.seats.length >= CFG.MAX_SEATS) return '자리가 다 찼어요 (최대 4명).';
    if (!BOT_DIFFS[diff]) diff = 'medium';
    const used = new Set(this.seats.map((s) => s.name));
    const base = BOT_NAMES.find((n) => !used.has(`${n} (${BOT_DIFFS[diff]})`)) || '봇';
    this.seats.push({ id: 'bot' + nextId++, name: `${base} (${BOT_DIFFS[diff]})`, key: null, bot: diff, out: false, chips: CFG.CHIPS });
    return null;
  }
  removeSeat(cid, i) {
    if (cid !== this.host) return '방장만 뺄 수 있어요.';
    if (this.phase === 'playing') return '게임 중에는 뺄 수 없어요.';
    const s = this.seats[i];
    if (!s || !s.bot) return '봇만 뺄 수 있어요.';
    this.seats.splice(i, 1);
    return null;
  }
  start(cid) {
    if (cid !== this.host) return '시작은 방장만 할 수 있어요.';
    if (this.phase === 'playing') return null;
    if (this.seats.length < 2) return '2명 이상 있어야 해요. 봇을 넣거나 친구를 기다려 주세요.';
    return this.game === 'onecard' ? this.ocStart() : this.pkStartRound(true);
  }
  leave(cid) {
    const m = this.members.get(cid);
    if (!m) return;
    this.members.delete(cid);
    const i = this.seatIdx(cid);
    if (i >= 0) {
      if (this.phase === 'playing') {
        if (this.game === 'onecard') this.ocLeave(i);
        else this.pkLeave(i);
      } else this.seats.splice(i, 1);
    }
    if (this.host === cid) this.host = this.members.keys().next().value || null;
    if (this.members.size === 0) return this.close();
    this.event({ k: 'leave', n: m.name });
  }
  close() {
    if (this.game === 'poker' && this.phase === 'playing') this.pkRefund();
    clearInterval(this.timer);
    if (rooms.get(this.key) === this) rooms.delete(this.key);
  }
  tick() {
    if (this.phase === 'playing') { if (this.game === 'onecard') this.ocTick(); else this.pkTick(); }
    else if (this.phase === 'between' && Date.now() >= this.nextAt) this.pkStartRound(false);
  }

  // ================= 레인보우 원카드 =================
  ocStart() {
    const deck = D.newDeck(rand);
    const hands = new Map();
    for (const s of this.seats) { s.out = false; hands.set(s.id, deck.splice(0, CFG.START_HAND)); }
    const first = deck.pop();
    this.g = {
      deck, pile: [first], hands,
      s: { top: first, color: D.colorOf(first), attack: 0, atkKind: null },   // 처음 카드는 A·2여도 공격 없음
      turn: crypto.randomInt(this.seats.length), plays: 0, log: [],
      lacks: new Map(this.seats.map((x) => [x.id, new Set()])),   // 최근에 못 내서 카드를 받아 간 색 (모두가 볼 수 있는 정보)
    };
    this.phase = 'playing';
    this.result = null;
    this.ocBeginTurn();
    this.event({ k: 'start' });
    return null;
  }
  ocActive() { return this.seats.map((s, i) => i).filter((i) => !this.seats[i].out); }
  ocNext(i) {
    for (let k = 1; k <= this.seats.length; k++) { const j = (i + k) % this.seats.length; if (!this.seats[j].out) return j; }
    return i;
  }
  ocBeginTurn() {
    const g = this.g;
    g.deadline = Date.now() + CFG.ONECARD_TURN_MS;
    const s = this.seats[g.turn];
    g.botAt = s.bot ? Date.now() + CFG.BOT_MS[0] + rand() * (CFG.BOT_MS[1] - CFG.BOT_MS[0]) : 0;
  }
  ocDrawCards(seat, n) {
    const g = this.g, hand = g.hands.get(seat.id);
    let got = 0;
    for (let k = 0; k < n; k++) {
      if (!g.deck.length) {
        // 뽑을 카드가 없으면 버린 카드(맨 위 빼고)를 섞어서 다시 씀
        const top = g.pile.pop();
        g.deck = g.pile; g.pile = [top];
        for (let i = g.deck.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [g.deck[i], g.deck[j]] = [g.deck[j], g.deck[i]]; }
        if (!g.deck.length) break;
      }
      hand.push(g.deck.pop()); got++;
    }
    return got;
  }
  ocLog(t) { const g = this.g; g.log.push(t); if (g.log.length > 8) g.log.shift(); }
  ocPlay(id, card) {
    const g = this.g;
    if (this.phase !== 'playing') return null;
    const seat = this.seats[g.turn];
    if (!seat || seat.id !== id) return '내 차례가 아니에요.';
    const hand = g.hands.get(id);
    card = Number(card);
    const at = hand.indexOf(card);
    if (at < 0) return '가지고 있지 않은 카드예요.';
    if (!D.canPlay(card, g.s)) return g.s.attack > 0 ? (g.s.atkKind === 'A' ? 'A 공격은 A나 조커로만 막을 수 있어요.' : '공격은 A·2·조커로만 막을 수 있어요.') : '색이나 숫자가 같은 카드만 낼 수 있어요.';
    hand.splice(at, 1);
    g.pile.push(card);
    g.s = D.afterPlay(card, g.s);
    g.lacks.get(id).delete(g.s.color);
    g.plays++;
    seat.plays = (seat.plays || 0) + 1;
    const atk = D.rankOf(card) <= 2 && !D.isJoker(card);
    this.ocLog(`${seat.name}: ${D.nameOf(card)}${g.s.attack ? ` (공격 ${g.s.attack}장)` : ''}`);
    if (!hand.length) return this.ocEnd(g.turn);
    g.turn = this.ocNext(g.turn);
    this.ocBeginTurn();
    this.event({ k: 'play', n: seat.name, card, atk, joker: D.isJoker(card) });
    return null;
  }
  ocDraw(id) {
    const g = this.g;
    if (this.phase !== 'playing') return null;
    const seat = this.seats[g.turn];
    if (!seat || seat.id !== id) return '내 차례가 아니에요.';
    const n = g.s.attack > 0 ? g.s.attack : 1;
    const got = this.ocDrawCards(seat, n);
    this.ocLog(g.s.attack > 0 ? `${seat.name}: 공격을 받아 ${got}장 가져감` : `${seat.name}: 카드 한 장 가져감`);
    const hit = g.s.attack > 0;
    if (hit) g.lacks.get(id).clear(); else g.lacks.get(id).add(g.s.color);
    g.s = { ...g.s, attack: 0, atkKind: null };
    g.turn = this.ocNext(g.turn);
    this.ocBeginTurn();
    this.event({ k: 'draw', n: seat.name, cnt: got, hit });
    return null;
  }
  ocTick() {
    const g = this.g, seat = this.seats[g.turn];
    if (!seat) return;
    if (seat.bot && Date.now() >= g.botAt) {
      const next = this.seats[this.ocNext(g.turn)];
      const card = BOT.onecardChoose(seat.bot, g.hands.get(seat.id), g.s, g.hands.get(next.id).length, g.lacks.get(next.id));
      if (card === null) this.ocDraw(seat.id); else this.ocPlay(seat.id, card);
    } else if (!seat.bot && Date.now() >= g.deadline) {
      this.ocDraw(seat.id);   // 시간 초과: 저절로 카드 받기
    }
  }
  ocLeave(i) {
    const g = this.g, seat = this.seats[i];
    seat.out = true; seat.left = true;
    // 나간 사람 카드는 뽑을 카드 맨 밑으로
    g.deck.unshift(...g.hands.get(seat.id)); g.hands.set(seat.id, []);
    this.ocLog(`${seat.name}: 나감`);
    const act = this.ocActive();
    if (act.length === 1) return this.ocEnd(act[0]);
    if (g.turn === i) { g.turn = this.ocNext(i); this.ocBeginTurn(); }
  }
  ocEnd(winIdx) {
    const g = this.g, win = this.seats[winIdx];
    this.phase = 'waiting';
    const humans = this.seats.filter((s) => !s.bot).length;
    const bots = this.seats.filter((s) => s.bot);
    const botDiff = humans >= 2 ? null : bots.reduce((b, s) => (!b || DIFF_RANK[s.bot] > DIFF_RANK[b] ? s.bot : b), null);
    const enough = g.plays >= CFG.MIN_PLAYS_FOR_GEMS;
    this.result = { game: 'onecard', winner: win.name, enough, left: this.seats.map((s) => ({ name: s.name, cards: [...(g.hands.get(s.id) || [])], out: !!s.left })) };
    this.ocLog(`${win.name} 님이 이겼어요!`);
    this.event({ k: 'win', n: win.name });
    for (const s of this.seats) {
      if (s.bot || !s.key || s.left) continue;
      const cid = s.id;
      if (!enough) { this.tell(cid, { t: 'gems', gained: 0, why: '너무 빨리 끝난 판이라 보석은 없어요.' }); continue; }
      try {
        const r = hooks.accounts.onecardRecord(s.key, s === win ? 'win' : 'play', botDiff || undefined);
        if (r) { this.tell(cid, { t: 'gems', gained: r.gained, profile: r.profile }); hooks.pushProfile(s.key, r.profile); }
      } catch (e) { this.tell(cid, { t: 'gems', gained: 0, why: '보석을 지급하지 못했어요: ' + e.message }); }
    }
    // 나간 사람 자리는 비움
    this.seats = this.seats.filter((s) => !s.left);
    this.broadcast();
    // 봇전은 판이 끝나면 방장이 "한 판 더"를 누를 때까지 기다림
  }

  // ================= 레인보우 인디언포커 =================
  stackOf(s, real) { return real ? hooks.accounts.gemsOf(s.key) : s.chips; }
  pay(s, n, real) {
    if (n <= 0) return true;
    if (real) {
      if (!hooks.accounts.takeGems(s.key, n)) return false;
      hooks.pushProfile(s.key, hooks.accounts.profileOf(s.key));
      this.tellProfile(s);
      return true;
    }
    if (s.chips < n) return false;
    s.chips -= n;
    return true;
  }
  tellProfile(s) { if (s.key && this.members.has(s.id)) this.tell(s.id, { t: 'profile', profile: hooks.accounts.profileOf(s.key) }); }
  pkStartRound(byHost) {
    // 진짜 보석: 앉은 사람이 전부 로그인한 사람일 때만 (봇·게스트가 끼면 연습 칩)
    const real = this.seats.length >= 2 && this.seats.every((s) => !s.bot && s.key);
    for (const s of this.seats) if (!real && s.chips < CFG.ANTE) { s.chips = CFG.CHIPS; s.refill = true; }   // 연습 칩이 떨어지면 다시 100개
    const players = this.seats.filter((s) => this.stackOf(s, real) >= CFG.ANTE);
    if (players.length < 2) {
      this.phase = 'waiting';
      this.broadcast();
      return byHost ? (real ? '보석이 1개 이상 있는 사람이 2명 이상이어야 해요.' : '2명 이상 있어야 해요.') : null;
    }
    const paid = players.filter((s) => this.pay(s, CFG.ANTE, real));
    if (paid.length < 2) {   // 그 사이 보석을 다 써 버린 경우: 낸 사람에게 돌려줌
      if (real) for (const s of paid) hooks.accounts.giveGems(s.key, CFG.ANTE); else for (const s of paid) s.chips += CFG.ANTE;
      this.phase = 'waiting'; this.broadcast();
      return '보석이 있는 사람이 2명 이상이어야 해요.';
    }
    const deck = D.newDeck(rand);
    const order = this.seats.filter((s) => paid.includes(s)).map((s) => s.id);
    const r = {
      real, order, cards: new Map(order.map((id) => [id, deck.pop()])),
      contrib: new Map(order.map((id) => [id, CFG.ANTE])), folded: new Set(), acted: new Set(),
      bet: CFG.ANTE, pot: CFG.ANTE * order.length, turn: crypto.randomInt(order.length), log: [], done: false,
    };
    this.g = r;
    this.phase = 'playing';
    this.result = null;
    r.log.push(`${real ? '💎 진짜 보석' : '🪙 연습 칩'} 판 · 모두 ${CFG.ANTE}개씩 기본 베팅 · ${this.seatById(order[r.turn]).name} 님부터`);
    this.pkBeginTurn();
    this.event({ k: 'deal', real });
    return null;
  }
  seatById(id) { return this.seats.find((s) => s.id === id); }
  pkActive() { const r = this.g; return r.order.filter((id) => !r.folded.has(id)); }
  // 한 판에 낼 수 있는 최대 총액: 아직 안 접은 사람 중 가장 적게 가진 사람 기준 (그래야 모두 따라올 수 있음)
  pkCap() {
    const r = this.g;
    return Math.min(...this.pkActive().map((id) => r.contrib.get(id) + this.stackOf(this.seatById(id), r.real)));
  }
  pkBeginTurn() {
    const r = this.g, id = r.order[r.turn], s = this.seatById(id);
    r.deadline = Date.now() + CFG.POKER_TURN_MS;
    r.botAt = s && s.bot ? Date.now() + CFG.BOT_MS[0] + rand() * (CFG.BOT_MS[1] - CFG.BOT_MS[0]) : 0;
  }
  pkAct(id, act, to) {
    const r = this.g;
    if (this.phase !== 'playing') return null;
    if (r.order[r.turn] !== id) return '내 차례가 아니에요.';
    const s = this.seatById(id), mine = r.contrib.get(id);
    if (act === 'raise') {
      to = Math.floor(Number(to));
      const cap = this.pkCap();
      if (!(to > r.bet)) return `지금보다 많이 걸어야 해요 (지금 ${r.bet}개).`;
      if (to > cap) return `한 판에 최대 ${cap}개까지 걸 수 있어요 (보석이 가장 적은 사람 기준).`;
      if (!this.pay(s, to - mine, r.real)) return '보석이 모자라요.';
      r.contrib.set(id, to); r.pot += to - mine; r.bet = to;
      r.acted = new Set([id]);
      r.log.push(`${s.name}: ${to}개로 올림`);
      this.lastBet = { n: s.name, act: 'raise', to };
    } else if (act === 'call') {
      const need = r.bet - mine;
      if (need > 0 && !this.pay(s, need, r.real)) { act = 'fold'; }
      else {
        r.contrib.set(id, r.bet); r.pot += need; r.acted.add(id);
        r.log.push(`${s.name}: ${need > 0 ? `콜 (${r.bet}개)` : '체크'}`);
        this.lastBet = { n: s.name, act: need > 0 ? 'call' : 'check', to: r.bet };
      }
    }
    if (act === 'fold') {
      r.folded.add(id); r.acted.add(id);
      r.log.push(`${s.name}: 폴드`);
      this.lastBet = { n: s.name, act: 'fold' };
    } else if (act !== 'raise' && act !== 'call') return '잘못된 행동이에요.';
    if (r.log.length > 10) r.log.splice(0, r.log.length - 10);
    return this.pkAfter();
  }
  pkAfter() {
    const r = this.g, act = this.pkActive();
    if (act.length === 1) return this.pkFinish(act[0], false);
    if (act.every((id) => r.acted.has(id) && r.contrib.get(id) === r.bet)) {
      const win = act.reduce((b, id) => (D.pokerScore(r.cards.get(id)) > D.pokerScore(r.cards.get(b)) ? id : b), act[0]);
      return this.pkFinish(win, true);
    }
    // 다음 사람 (접은 사람은 건너뜀)
    do { r.turn = (r.turn + 1) % r.order.length; } while (r.folded.has(r.order[r.turn]));
    this.pkBeginTurn();
    this.event({ k: 'bet', ...this.lastBet });
    return null;
  }
  pkFinish(winId, showdown) {
    const r = this.g, win = this.seatById(winId) || { name: '?', key: null };
    r.done = true;
    // 판돈은 이긴 사람에게 (나간 사람이 이겨도 그 계정으로)
    const winKey = r.real ? (win.key || r.keys && r.keys.get(winId)) : null;
    if (r.real) hooks.accounts.giveGems(winKey, r.pot);
    else if (win.chips !== undefined) win.chips += r.pot;
    if (r.real) {
      for (const id of r.order) {
        const s = this.seatById(id), key = s ? s.key : r.keys && r.keys.get(id);
        if (!key) continue;
        hooks.accounts.pokerStat(key, (id === winId ? r.pot : 0) - r.contrib.get(id));
        hooks.pushProfile(key, hooks.accounts.profileOf(key));
        if (s) this.tellProfile(s);
      }
    }
    r.log.push(showdown ? `카드 공개! ${win.name} 님이 ${r.pot}개를 가져가요` : `모두 접어서 ${win.name} 님이 ${r.pot}개를 가져가요`);
    this.result = { game: 'poker', winner: win.name, winId, pot: r.pot, real: r.real, showdown };
    this.phase = 'between';
    this.nextAt = Date.now() + CFG.POKER_NEXT_MS;
    // 나간 사람 자리는 비움, 진짜 보석이 1개도 없는 사람은 일어나게 함
    this.seats = this.seats.filter((s) => !s.left);
    this.event({ k: 'potwin', n: win.name, pot: r.pot, showdown, real: r.real });
  }
  pkTick() {
    const r = this.g, id = r.order[r.turn], s = this.seatById(id);
    if (!s) return;
    if (s.bot && Date.now() >= r.botAt) {
      const seen = r.order.filter((x) => x !== id).map((x) => r.cards.get(x));
      const oppActive = this.pkActive().filter((x) => x !== id).map((x) => r.cards.get(x));
      const d = BOT.pokerDecide(s.bot, { seen, oppActive, pot: r.pot, toCall: r.bet - r.contrib.get(id), myIn: r.contrib.get(id), cap: this.pkCap(), bet: r.bet });
      const err = this.pkAct(id, d.act, d.to);
      if (err) this.pkAct(id, 'call');
    } else if (!s.bot && Date.now() >= r.deadline) {
      this.pkAct(id, r.bet === r.contrib.get(id) ? 'call' : 'fold');   // 시간 초과
    }
  }
  pkLeave(i) {
    const r = this.g, s = this.seats[i];
    s.left = true;
    if (!r || r.done || !r.order.includes(s.id)) return;
    r.keys = r.keys || new Map(); r.keys.set(s.id, s.key);
    if (r.folded.has(s.id)) return;
    r.folded.add(s.id); r.acted.add(s.id);
    r.log.push(`${s.name}: 나가서 폴드`);
    if (r.order[r.turn] === s.id) this.pkAfter();
    else if (this.pkActive().length === 1) this.pkFinish(this.pkActive()[0], false);
  }
  // 판이 안 끝났는데 방이 닫히거나 서버가 꺼질 때: 낸 보석을 그대로 돌려줌
  pkRefund() {
    const r = this.g;
    if (!r || r.done || !r.real) return;
    r.done = true;
    for (const id of r.order) {
      const s = this.seatById(id), key = s ? s.key : r.keys && r.keys.get(id);
      if (key) hooks.accounts.giveGems(key, r.contrib.get(id));
    }
  }

  // ---------- 화면에 보낼 정보 (사람마다 다름) ----------
  tell(cid, msg) { const m = this.members.get(cid); if (m) try { m.socket.send(JSON.stringify(msg)); } catch (_) {} }
  event(e) { this.ev.push(e); this.broadcast(); }
  broadcast() {
    const g = this.g, ev = this.ev; this.ev = [];
    for (const [cid, m] of this.members) {
      const me = this.seatIdx(cid);
      const base = {
        game: this.game, code: this.code, title: this.title, isPublic: this.isPublic, botRoom: this.botRoom,
        phase: this.phase, hostMe: cid === this.host, you: me, result: this.result, ev,
        seats: this.seats.map((s) => ({ name: s.name, bot: s.bot, guest: !s.bot && !s.key, host: s.id === this.host, out: s.out, left: !!s.left, chips: s.chips })),
        specs: [...this.members.entries()].filter(([id]) => this.seatIdx(id) < 0).map(([, x]) => x.name),
      };
      if (this.game === 'onecard' && g) {
        base.oc = {
          top: g.s.top, color: g.s.color, attack: g.s.attack, atkKind: g.s.atkKind, deck: g.deck.length, pile: g.pile.length,
          turn: g.turn, left: Math.max(0, g.deadline - Date.now()), log: g.log,
          counts: this.seats.map((s) => (g.hands.get(s.id) || []).length),
          hand: me >= 0 ? [...(g.hands.get(cid) || [])] : null,
        };
      }
      if (this.game === 'poker' && g) {
        const r = g, mineId = me >= 0 ? this.seats[me].id : null;
        // 진짜 보석 판은 구경하는 사람에게도 카드를 안 보여 줌 (몰래 알려 주기 방지), 판이 끝나면 모두 공개
        const inRound = mineId !== null && r.order.includes(mineId);
        const canSee = (id) => r.done || (inRound ? id !== mineId : !r.real);
        base.pk = {
          real: r.real, pot: r.pot, bet: r.bet, done: r.done, log: r.log,
          turnId: r.done ? null : r.order[r.turn], left: r.done ? 0 : Math.max(0, r.deadline - Date.now()),
          players: r.order.map((id) => {
            const s = this.seatById(id);
            return { seat: this.seatIdx(id), name: s ? s.name : '나감', bot: s ? s.bot : null, card: canSee(id) ? r.cards.get(id) : null, in: r.contrib.get(id), folded: r.folded.has(id), me: id === mineId,
              turn: !r.done && r.order[r.turn] === id, stack: s ? this.stackOf(s, r.real) : 0 };
          }),
          cap: r.done ? 0 : this.pkCap(),
          myStack: me >= 0 ? this.stackOf(this.seats[me], r.real) : null,
          nextIn: this.phase === 'between' ? Math.max(0, this.nextAt - Date.now()) : 0,
        };
      }
      if (this.game === 'poker' && me >= 0 && !base.pk) {
        const real = this.seats.length >= 2 && this.seats.every((s) => !s.bot && s.key);
        base.pkWait = { real, myStack: this.stackOf(this.seats[me], real) };
      }
      try { m.socket.send(JSON.stringify({ t: 'state', room: base })); } catch (_) {}
    }
  }
  summary() {
    const h = this.members.get(this.host);
    return { game: this.game, code: this.code, title: this.title, players: this.seats.length, bots: this.seats.filter((s) => s.bot).length,
      specs: this.members.size - this.seats.filter((s) => !s.bot).length, phase: this.phase, host: h ? h.name : '', full: this.isFull(), seatsFull: this.seats.length >= CFG.MAX_SEATS };
  }
}

function refundAll() { for (const r of rooms.values()) if (r.game === 'poker' && r.phase === 'playing') r.pkRefund(); }
function publicRooms(game) {
  return [...rooms.values()].filter((r) => r.isPublic && r.game === game && r.members.size > 0)
    .sort((a, b) => (a.phase === 'playing') - (b.phase === 'playing') || b.members.size - a.members.size || a.createdAt - b.createdAt)
    .slice(0, 30).map((r) => r.summary());
}
function newCode(prefix) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code;
  do { code = prefix + Array.from({ length: 5 }, () => chars[crypto.randomInt(chars.length)]).join(''); } while ([...rooms.values()].some((r) => r.code === code));
  return code;
}
const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';

// server.js 가 /cards-ws 로 들어온 연결을 넘겨 줌
function handleSocket(socket, req) {
  const ip = clientIp(req);
  const id = 'k' + nextId++;
  let room = null, msgCount = 0;
  const counter = setInterval(() => { msgCount = 0; }, 1000);
  const fail = (msg) => socket.send(JSON.stringify({ t: 'error', msg }));
  const notice = (msg) => socket.send(JSON.stringify({ t: 'notice', msg }));

  function join(m) {
    const game = GAMES[m.game] ? m.game : null;
    if (!game) return fail('없는 게임이에요.');
    let name, key = null;
    if (m.token) {
      const k = hooks.accounts.fromToken(String(m.token));
      const p = k && hooks.accounts.profileOf(k);
      if (!p) return fail('로그인이 만료됐어요. 다시 로그인해 주세요.');
      if (p.nickWarn) return fail('닉네임 경고를 받았어요. 난투 아레나 로비에서 닉네임을 바꿔야 게임을 할 수 있어요.');
      name = p.nick; key = k;
    } else {
      name = clean(m.guest, 12);
      if (name.length < 2) return fail('닉네임은 2~12자로 써 주세요.');
      if (limited(ip, 'guest', 30, 60000)) return fail('잠시 후 다시 해 주세요.');
      if (hooks.accounts.isTaken(name)) return fail('가입된 닉네임이에요. 로그인하거나 다른 닉네임을 써 주세요.');
    }
    let r;
    if (m.mode === 'bot') {
      // 봇전: 나 + 봇 1~3명, 바로 시작
      const diff = BOT_DIFFS[m.diff] ? m.diff : 'medium';
      const n = Math.max(1, Math.min(3, Math.floor(Number(m.bots) || 1)));
      r = new CardRoom(game, newCode('bot-'), { isPublic: false, title: `봇전 · ${BOT_DIFFS[diff]}`, botRoom: true });
      rooms.set(r.key, r);
      r.join(id, socket, name, key);
      for (let k = 0; k < n; k++) r.addBot(id, diff);
      room = r;
      socket.send(JSON.stringify({ t: 'welcome', id, room: r.code, title: r.title }));
      r.start(id);
      r.broadcast();
      return;
    }
    if (m.mode === 'create') {
      r = new CardRoom(game, newCode('pub-'), { isPublic: true, title: clean(m.title, 20) || `${name}의 방` });
      rooms.set(r.key, r);
    } else if (m.mode === 'quick') {
      r = [...rooms.values()].filter((x) => x.game === game && x.isPublic && x.phase !== 'playing' && x.seats.length < CFG.MAX_SEATS && !x.isFull())
        .sort((a, b) => b.seats.length - a.seats.length || a.createdAt - b.createdAt)[0];
      if (!r) { r = new CardRoom(game, newCode('pub-'), { isPublic: true, title: `${name}의 방` }); rooms.set(r.key, r); }
    } else {
      const code = String(m.room || '').toLowerCase();
      if (!/^[a-z0-9][a-z0-9_.-]{0,19}$/.test(code)) return fail('초대 코드는 영어 소문자와 숫자로 써 주세요.');
      r = rooms.get(game + ':' + code);
      if (!r) {
        if (m.mode === 'listed') return fail('그 방은 방금 사라졌어요. 목록을 새로 보고 다른 방을 골라 주세요.');
        if (code.startsWith('pub-') || code.startsWith('bot-')) return fail('그 코드는 쓸 수 없어요. 다른 초대 코드를 써 주세요.');
        r = new CardRoom(game, code, { isPublic: false });
        rooms.set(r.key, r);
      }
    }
    if (!r.join(id, socket, name, key)) {
      if (r.members.size === 0) r.close();
      return fail('방이 가득 찼어요. 다른 방을 골라 주세요.');
    }
    room = r;
    socket.send(JSON.stringify({ t: 'welcome', id, room: r.code, title: r.title, isPublic: r.isPublic }));
    r.broadcast();
  }

  socket.on('message', (text) => {
    if (++msgCount > 40) return socket.close();
    let m;
    try { m = JSON.parse(text); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join') { if (!room) { try { join(m); } catch (e) { fail(e.message || '들어가지 못했어요.'); } } return; }
    if (!room) return;
    let err = null;
    if (m.t === 'start') err = room.start(id);
    else if (m.t === 'sit') err = room.sit(id, false);
    else if (m.t === 'stand') err = room.stand(id);
    else if (m.t === 'addbot') err = room.addBot(id, String(m.diff || ''));
    else if (m.t === 'kickbot') err = room.removeSeat(id, Number(m.i));
    else if (room.game === 'onecard' && m.t === 'play') err = room.ocPlay(id, m.card);
    else if (room.game === 'onecard' && m.t === 'draw') err = room.ocDraw(id);
    else if (room.game === 'poker' && ['fold', 'call', 'raise'].includes(m.t)) err = room.pkAct(id, m.t, m.to);
    else return;
    if (err) notice(err);
    room.broadcast();
  });
  socket.on('close', () => { clearInterval(counter); if (room) room.leave(id); });
}

module.exports = { init, handleSocket, publicRooms, onlineCount, CFG, GAMES, rooms };
