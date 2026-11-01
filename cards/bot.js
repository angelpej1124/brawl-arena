// =====================================================================
//  레인보우 카드 봇 — 이지 · 미들 · 하드
//  원카드: 어떤 카드를 낼지 (못 내거나 안 내면 null → 카드 받기)
//  인디언포커: 다른 사람 머리 위 카드를 보고 내 카드가 이길 확률을 계산해서 베팅
//  봇은 남의 손에 든 카드나 자기 머리 위 카드를 몰래 보지 않음 (사람과 같은 정보만 씀)
// =====================================================================
'use strict';
const D = require('./public/deck.js');
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------- 원카드 ----------------
//  hand: 내 카드, s: { top, color, attack, atkKind }, nextCount: 다음 사람 카드 수
//  nextLacks: 다음 사람이 최근에 못 낸 색들 (그 색일 때 카드를 받아 감 — 모두가 볼 수 있는 정보)
//  이지: 아무거나 · 미들: 괜찮은 카드를 고르지만 가끔 실수 · 하드: 계속 낼 수 있게 + 다음 사람이 못 내는 색으로 바꾸기
function onecardChoose(diff, hand, s, nextCount, nextLacks) {
  const ok = hand.filter((id) => D.canPlay(id, s));
  if (!ok.length) return null;
  if (diff === 'easy') {
    if (s.attack > 0 && Math.random() < 0.4) return null;   // 막을 수 있어도 가끔 그냥 받음
    return pick(ok);
  }
  if (diff === 'medium') {
    if (s.attack > 0 && Math.random() < 0.15) return null;
    if (Math.random() < 0.3) return pick(ok);
  }
  if (s.attack > 0) {
    // 공격 받는 중: 막을 수 있으면 막음 (A로 키워서 넘기기 > 2 > 조커로 그대로 넘기기)
    const order = (id) => (D.rankOf(id) === 1 ? 3 : D.rankOf(id) === 2 ? 2 : 1);
    return ok.sort((a, b) => order(b) - order(a))[0];
  }
  const hard = diff === 'hard';
  const colorCount = Array(7).fill(0), rankCount = {};
  for (const id of hand) if (!D.isJoker(id)) { colorCount[D.colorOf(id)]++; rankCount[D.rankOf(id)] = (rankCount[D.rankOf(id)] || 0) + 1; }
  const score = (id) => {
    const left = hand.filter((x) => x !== id);
    if (!left.length) return 1000;                                    // 마지막 카드면 바로 이김
    let v = 0;
    const atk = !D.isJoker(id) && D.rankOf(id) <= 2;
    if (D.isJoker(id)) v += colorCount[D.colorOf(id)] * 2 - 10;        // 조커는 아껴 둠 (막기·색 바꾸기용)
    else v += colorCount[D.colorOf(id)] * 2 - (hard ? (rankCount[D.rankOf(id)] - 1) * 1.5 : 0);   // 많이 가진 색으로, 같은 숫자는 색 바꾸기용으로 남김
    if (atk) v += nextCount <= 2 ? 6 : -3;                             // 다음 사람이 거의 끝나 가면 공격
    if (hard) {
      const n = D.afterPlay(id, s);
      v += left.filter((x) => D.canPlay(x, { ...n, attack: 0 })).length * 1.5;   // 다음에도 낼 카드가 남게
      if (nextLacks && nextLacks.has(n.color)) v += 3;                            // 다음 사람이 못 내던 색으로
    }
    return v + Math.random() * (hard ? 0.3 : 2);
  };
  return ok.sort((a, b) => score(b) - score(a))[0];
}

// ---------------- 인디언포커 ----------------
//  view: { seen: 내가 볼 수 있는 모든 카드(다른 사람 머리 위), oppActive: 아직 안 접은 상대들의 카드,
//          pot, toCall(더 내야 하는 수), myIn(이번 판에 낸 수), cap(최대로 낼 수 있는 총액), bet(지금 최고 금액) }
//  반환: { act: 'fold' | 'call' | 'raise', to?: 총액 }
function winChance(seen, oppActive) {
  const seenSet = new Set(seen);
  const best = Math.max(...oppActive.map(D.pokerScore));
  let win = 0, total = 0;
  for (let id = 0; id < D.COUNT; id++) {
    if (seenSet.has(id)) continue;
    total++;
    if (D.pokerScore(id) > best) win++;
  }
  return total ? win / total : 0;
}
function pokerDecide(diff, v) {
  let p = winChance(v.seen, v.oppActive);
  if (diff === 'easy') p = Math.min(1, Math.max(0, p + (Math.random() - 0.5) * 0.6));
  if (diff === 'medium') p = Math.min(1, Math.max(0, p + (Math.random() - 0.5) * 0.2));
  const canRaise = v.cap > v.bet;
  const raiseTo = (frac) => Math.min(v.cap, v.bet + Math.max(1, Math.round((v.pot + v.toCall) * frac)));
  const potOdds = v.toCall / (v.pot + v.toCall || 1);
  if (diff === 'easy') {
    if (canRaise && p > 0.75 && Math.random() < 0.5) return { act: 'raise', to: Math.min(v.cap, v.bet + 1 + Math.floor(Math.random() * 3)) };
    if (v.toCall === 0 || p > 0.3 || Math.random() < 0.3) return { act: 'call' };
    return { act: 'fold' };
  }
  if (diff === 'medium') {
    if (canRaise && p > 0.7) return { act: 'raise', to: raiseTo(0.5) };
    if (v.toCall === 0 || p >= potOdds) return { act: 'call' };
    return { act: 'fold' };
  }
  // 하드: 상대는 내 카드를 볼 수 있으니까, 상대가 올렸다면 내 카드가 약하다는 뜻 → 이길 확률을 낮춰서 봄
  p = winChance(v.seen, v.oppActive);
  if (v.bet > 1 && v.toCall > 0) p *= Math.max(0.2, 0.8 - 0.03 * v.toCall);
  if (canRaise && p > 0.7) return { act: 'raise', to: raiseTo(0.6) };
  if (v.toCall === 0 || p >= potOdds) return { act: 'call' };
  return { act: 'fold' };
}

module.exports = { onecardChoose, pokerDecide, winChance };
