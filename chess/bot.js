// =====================================================================
//  럭키 체스 봇 — 이지 · 미들 · 하드
//  럭키 룰에서는 잡을 때마다 가위바위보(이길 확률 50%)를 하니까,
//  "잡으면 얻는 것"과 "지면 잃는 것"을 반반으로 계산해서 수를 고름.
//    이지  : 거의 아무 수나 둠 (잡을 수 있으면 가끔 잡음)
//    미들  : 지금 한 수만 보고 손해 보지 않는 수를 고름
//    하드  : 남은 이동을 두 수까지 이어서 계산하고, 킹 안전·상대 위협까지 따짐
//  가위바위보는 세 난이도 모두 랜덤 (상대가 낸 걸 훔쳐보지 않음)
// =====================================================================
'use strict';
const R = require('./public/rules.js');

const VAL = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 60 };   // 킹은 잃으면 지니까 아주 크게
const KING_LOSS = 1000;
const valOf = (p) => (p ? VAL[p.toLowerCase()] : 0);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 이 색 입장에서 판 점수 (클수록 좋음)
function evaluate(st, me, deep) {
  const s = R.luckyStatus(st);
  if (s.over) return s.winner === me ? KING_LOSS : s.winner ? -KING_LOSS : 0;
  const opp = R.other(me);
  let score = 0;
  for (let q = 0; q < 64; q++) {
    const p = st.b[q];
    if (!p || p.toLowerCase() === 'k') continue;
    const v = valOf(p) + positional(p, q);
    score += R.colorOf(p) === me ? v : -v;
  }
  if (!deep) return score;
  // 상대가 다음 차례에 노릴 수 있는 내 기물 (상대가 동전 앞면일 확률 50% × 가위바위보 50%)
  score -= threatPenalty(st, opp, me) * 0.5;
  // 내가 노리고 있는 상대 기물 (다음에 내 차례가 올 수도 있으니 조금만)
  score += threatPenalty(st, me, opp) * 0.15;
  return score;
}
// by 색이 잡을 수 있는 target 색 기물들의 기대 이득 (가위바위보: 이기면 +잡힌 기물, 지면 -공격한 기물)
function threatPenalty(st, by, target) {
  const view = { ...st, turn: by, ep: -1 };
  const best = new Map();   // 칸 → 가장 싼 공격 기물 값
  for (const m of R.luckyMoves(view)) {
    if (m.flag !== 'c') continue;
    const a = valOf(st.b[m.from]);
    if (!best.has(m.to) || a < best.get(m.to)) best.set(m.to, a);
  }
  let total = 0;
  for (const [sq, a] of best) {
    const v = st.b[sq] && st.b[sq].toLowerCase() === 'k' ? KING_LOSS * 0.25 : valOf(st.b[sq]);
    total += Math.max(0, 0.5 * v - 0.5 * a);
  }
  return total;
}
// 자리 점수: 가운데로 나온 나이트·비숍, 앞으로 나간 폰
function positional(p, q) {
  const t = p.toLowerCase(), f = q & 7, r = q >> 3;
  const center = 3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5));   // 0(가장자리) ~ 3(가운데)
  if (t === 'n' || t === 'b') return center * 0.08;
  if (t === 'p') { const adv = p === 'P' ? 6 - r : r - 1; return adv * 0.04 + (f >= 2 && f <= 5 ? center * 0.03 : 0); }
  if (t === 'q') return center * 0.02;
  return 0;
}

// 한 수를 두었을 때 생길 수 있는 결과들 [{ st, p }] (잡는 수는 가위바위보 이김/짐 반반)
function outcomes(st, m) {
  if (R.victimSq(st, m) < 0) return [{ st: R.applyLucky(st, m), p: 1 }];
  return [{ st: R.applyLucky(st, m), p: 0.5 }, { st: R.removeAt(st, m.from), p: 0.5 }];
}
function moveValue(st, m, me, depth, left) {
  let total = 0;
  for (const o of outcomes(st, m)) {
    let v;
    const done = R.luckyStatus(o.st).over;
    if (depth > 1 && left > 1 && !done) {
      // 남은 이동이 있으면 그다음 수도 가장 좋은 걸로 둔다고 보고 계산
      const next = R.luckyMoves(o.st);
      v = -Infinity;
      for (const m2 of next) v = Math.max(v, moveValue(o.st, m2, me, depth - 1, left - 1));
      if (v === -Infinity) v = evaluate(o.st, me, true);
    } else v = evaluate(o.st, me, true);
    total += o.p * v;
  }
  return total;
}

// 지금 차례(st.turn)의 봇이 둘 수 하나를 고름
function chooseMove(st, diff, left) {
  const me = st.turn;
  const moves = R.luckyMoves(st);
  if (!moves.length) return null;
  const promoOk = (m) => !m.promo || m.promo === 'q';
  const list = moves.filter(promoOk);
  if (diff === 'easy') {
    // 상대 킹을 잡을 수 있으면 가끔 잡고, 잡는 수는 30%만 고름
    const king = list.filter((m) => st.b[m.to] && st.b[m.to].toLowerCase() === 'k');
    if (king.length && Math.random() < 0.5) return pick(king);
    const caps = list.filter((m) => R.victimSq(st, m) >= 0);
    if (caps.length && Math.random() < 0.3) return pick(caps);
    return pick(list);
  }
  const deep = diff === 'hard';
  const depth = deep ? 2 : 1;
  const noise = deep ? 0.05 : 0.6;   // 미들은 가끔 실수함
  let best = null, bestV = -Infinity;
  for (const m of list) {
    const v = (deep ? moveValue(st, m, me, depth, left) : outcomes(st, m).reduce((s, o) => s + o.p * evaluate(o.st, me, true), 0))
      + Math.random() * noise;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}
const pickRps = () => pick(['r', 'p', 's']);

module.exports = { chooseMove, pickRps, evaluate };
