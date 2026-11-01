// =====================================================================
//  레인보우 카드 (서버와 브라우저가 같이 씀)
//  - 숫자 13가지(A 2~10 J Q K) × 무지개 7색(빨주노초파남보) = 91장 + 조커 7장(색마다 1장) = 98장
//  - 모든 카드는 딱 한 장씩이라 중복 없음
//  카드 번호(id): 0~90 = 색 c, 숫자 r(1~13) → c*13 + (r-1)   /   91~97 = 조커 (색 = id-91)
// =====================================================================
(function (root) {
  'use strict';
  const COLORS = [
    { k: 'R', name: '빨강', short: '빨', hex: '#ff4d4d' },
    { k: 'O', name: '주황', short: '주', hex: '#ff9a1f' },
    { k: 'Y', name: '노랑', short: '노', hex: '#ffd23b' },
    { k: 'G', name: '초록', short: '초', hex: '#36c96a' },
    { k: 'B', name: '파랑', short: '파', hex: '#3a8dff' },
    { k: 'N', name: '남색', short: '남', hex: '#3f3fbf' },
    { k: 'V', name: '보라', short: '보', hex: '#a24dff' },
  ];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const JOKER = 14;
  const COUNT = 98;
  const isJoker = (id) => id >= 91;
  const colorOf = (id) => (isJoker(id) ? id - 91 : Math.floor(id / 13));
  const rankOf = (id) => (isJoker(id) ? JOKER : (id % 13) + 1);           // A=1 … K=13, 조커=14
  const label = (id) => (isJoker(id) ? '조커' : RANKS[rankOf(id) - 1]);
  const nameOf = (id) => `${COLORS[colorOf(id)].short} ${label(id)}`;
  function newDeck(rand = Math.random) {
    const d = Array.from({ length: COUNT }, (_, i) => i);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }

  // ---------------- 레인보우 원카드 ----------------
  //  top: 맨 위 카드, color: 지금 색(조커를 내면 조커 색), attack: 쌓인 벌칙 장수, atkKind: 'A' | '2' | null
  //  - 공격이 없을 때: 색이 같거나 숫자가 같은 카드, 조커는 아무 때나
  //  - 공격(A·2)을 받는 중: A는 언제나 막을 수 있음, 2는 2 공격만 막을 수 있음(A 공격은 못 막음), 조커는 공격을 그대로 다음 사람에게 넘김 (색 상관없음)
  function canPlay(id, s) {
    if (isJoker(id)) return true;
    const r = rankOf(id);
    if (s.attack > 0) return r === 1 || (r === 2 && s.atkKind === '2');
    return colorOf(id) === s.color || (!isJoker(s.top) && r === rankOf(s.top));
  }
  // 카드를 낸 뒤 상태 (공격 장수·색)
  function afterPlay(id, s) {
    const r = rankOf(id);
    const n = { top: id, color: colorOf(id), attack: s.attack, atkKind: s.atkKind };
    if (r === 1) { n.attack += 4; n.atkKind = 'A'; }
    else if (r === 2) { n.attack += 2; n.atkKind = s.atkKind === 'A' ? 'A' : '2'; }
    // 조커: 공격 장수·종류는 그대로 넘어감
    return n;
  }

  // ---------------- 레인보우 인디언포커 ----------------
  //  점수: A(1) < 2 < … < K(13) < 조커(14), 숫자가 같으면 빨강에 가까울수록 높음
  //  → 보라 A가 가장 낮고, 빨강 조커가 가장 높음 (모든 카드가 한 장씩이라 비기는 일 없음)
  const pokerScore = (id) => rankOf(id) * 10 + (6 - colorOf(id));

  const api = { COLORS, RANKS, JOKER, COUNT, isJoker, colorOf, rankOf, label, nameOf, newDeck, canPlay, afterPlay, pokerScore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RainbowDeck = api;
})(typeof window !== 'undefined' ? window : globalThis);
