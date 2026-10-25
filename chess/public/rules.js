// =====================================================================
//  럭키 체스 — 체스 규칙 (서버와 브라우저가 같이 씀)
//  - 칸 번호: 0 = a8, 7 = h8, 56 = a1, 63 = h1  (위에서부터 8줄)
//  - 기물: 대문자 = 백(KQRBNP), 소문자 = 흑(kqrbnp), 빈칸 = null
//  - 기본 규칙 전부: 이동 · 잡기 · 캐슬링 · 앙파상 · 프로모션 · 체크 ·
//    체크메이트 · 스테일메이트 · 50수 규칙 · 3회 동형 반복 · 기물 부족 무승부
// =====================================================================
(function (root) {
  'use strict';
  const FILES = 'abcdefgh';
  const fileOf = (s) => s & 7;
  const rankOf = (s) => 8 - (s >> 3);               // 1~8
  const sqName = (s) => FILES[fileOf(s)] + rankOf(s);
  const colorOf = (p) => (p ? (p === p.toUpperCase() ? 'w' : 'b') : null);
  const other = (c) => (c === 'w' ? 'b' : 'w');
  const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;   // r: 0 = 8랭크 줄

  const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  function initial() {
    const back = 'rnbqkbnr';
    const b = new Array(64).fill(null);
    for (let f = 0; f < 8; f++) {
      b[f] = back[f]; b[8 + f] = 'p';
      b[48 + f] = 'P'; b[56 + f] = back[f].toUpperCase();
    }
    return { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1 };
  }

  function clone(st) {
    return { b: st.b.slice(), turn: st.turn, castle: { ...st.castle }, ep: st.ep, half: st.half, full: st.full };
  }

  // sq 칸을 by 색이 공격하고 있는지
  function attacked(b, sq, by) {
    const f = fileOf(sq), r = sq >> 3;
    // 폰: 백 폰은 아래(큰 r)에서 위로 공격
    const pr = by === 'w' ? r + 1 : r - 1, pawn = by === 'w' ? 'P' : 'p';
    for (const df of [-1, 1]) if (onBoard(f + df, pr) && b[pr * 8 + f + df] === pawn) return true;
    const N = by === 'w' ? 'N' : 'n', K = by === 'w' ? 'K' : 'k';
    for (const [df, dr] of KNIGHT) if (onBoard(f + df, r + dr) && b[(r + dr) * 8 + f + df] === N) return true;
    for (const [df, dr] of KING) if (onBoard(f + df, r + dr) && b[(r + dr) * 8 + f + df] === K) return true;
    const slide = (dirs, kinds) => {
      for (const [df, dr] of dirs) {
        let x = f + df, y = r + dr;
        while (onBoard(x, y)) {
          const p = b[y * 8 + x];
          if (p) { if (colorOf(p) === by && kinds.includes(p.toLowerCase())) return true; break; }
          x += df; y += dr;
        }
      }
      return false;
    };
    return slide(ROOK_D, 'rq') || slide(BISHOP_D, 'bq');
  }

  function kingSq(b, c) { const k = c === 'w' ? 'K' : 'k'; return b.indexOf(k); }
  function inCheck(st, c = st.turn) { const k = kingSq(st.b, c); return k >= 0 && attacked(st.b, k, other(c)); }

  // 규칙상 가능한 수 (자기 왕이 체크에 남는 수 포함)
  function pseudo(st) {
    const { b, turn } = st, out = [];
    const add = (from, to, flag) => {
      const p = b[from];
      if ((p === 'P' && to < 8) || (p === 'p' && to >= 56)) {
        for (const pr of 'qrbn') out.push({ from, to, promo: pr, flag });
      } else out.push({ from, to, flag });
    };
    for (let s = 0; s < 64; s++) {
      const p = b[s];
      if (!p || colorOf(p) !== turn) continue;
      const f = fileOf(s), r = s >> 3, t = p.toLowerCase();
      if (t === 'p') {
        const dir = turn === 'w' ? -1 : 1, start = turn === 'w' ? 6 : 1;
        const one = (r + dir) * 8 + f;
        if (onBoard(f, r + dir) && !b[one]) {
          add(s, one, '');
          const two = (r + 2 * dir) * 8 + f;
          if (r === start && !b[two]) out.push({ from: s, to: two, flag: 'd' });
        }
        for (const df of [-1, 1]) {
          if (!onBoard(f + df, r + dir)) continue;
          const to = (r + dir) * 8 + f + df;
          if (b[to] && colorOf(b[to]) !== turn) add(s, to, 'c');
          else if (to === st.ep) out.push({ from: s, to, flag: 'e' });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [df, dr] of t === 'n' ? KNIGHT : KING) {
          if (!onBoard(f + df, r + dr)) continue;
          const to = (r + dr) * 8 + f + df;
          if (!b[to]) add(s, to, '');
          else if (colorOf(b[to]) !== turn) add(s, to, 'c');
        }
        if (t === 'k') {
          // 캐슬링: 권리가 있고, 사이가 비고, 왕이 지나가는 칸이 공격받지 않을 때
          const home = turn === 'w' ? 60 : 4, opp = other(turn);
          const [KS, QS, R] = turn === 'w' ? ['K', 'Q', 'R'] : ['k', 'q', 'r'];
          if (s === home && !attacked(b, home, opp)) {
            if (st.castle[KS] && b[home + 3] === R && !b[home + 1] && !b[home + 2]
              && !attacked(b, home + 1, opp) && !attacked(b, home + 2, opp)) out.push({ from: s, to: home + 2, flag: 'k' });
            if (st.castle[QS] && b[home - 4] === R && !b[home - 1] && !b[home - 2] && !b[home - 3]
              && !attacked(b, home - 1, opp) && !attacked(b, home - 2, opp)) out.push({ from: s, to: home - 2, flag: 'q' });
          }
        }
      } else {
        const dirs = t === 'r' ? ROOK_D : t === 'b' ? BISHOP_D : ROOK_D.concat(BISHOP_D);
        for (const [df, dr] of dirs) {
          let x = f + df, y = r + dr;
          while (onBoard(x, y)) {
            const to = y * 8 + x;
            if (!b[to]) add(s, to, '');
            else { if (colorOf(b[to]) !== turn) add(s, to, 'c'); break; }
            x += df; y += dr;
          }
        }
      }
    }
    return out;
  }

  // 수를 둔 다음 판 (검사 없이)
  function apply(st, m) {
    const n = clone(st), b = n.b, p = b[m.from], t = p.toLowerCase(), c = st.turn;
    const captured = m.flag === 'e' ? b[m.to + (c === 'w' ? 8 : -8)] : b[m.to];
    b[m.to] = m.promo ? (c === 'w' ? m.promo.toUpperCase() : m.promo) : p;
    b[m.from] = null;
    if (m.flag === 'e') b[m.to + (c === 'w' ? 8 : -8)] = null;
    if (m.flag === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; }
    if (m.flag === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
    // 캐슬링 권리: 왕이나 룩이 움직이거나 룩이 잡히면 사라짐
    if (t === 'k') { if (c === 'w') n.castle.K = n.castle.Q = false; else n.castle.k = n.castle.q = false; }
    for (const [sq, right] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.from === sq || m.to === sq) n.castle[right] = false;
    n.ep = m.flag === 'd' ? (m.from + m.to) / 2 : -1;
    n.half = t === 'p' || captured ? 0 : st.half + 1;
    if (c === 'b') n.full += 1;
    n.turn = other(c);
    return n;
  }

  function legalMoves(st) {
    return pseudo(st).filter((m) => !inCheck(apply(st, m), st.turn));
  }

  // 3회 동형 반복 비교용 열쇠 (기물 배치 + 차례 + 캐슬링 권리 + 실제로 할 수 있는 앙파상)
  function posKey(st) {
    let ep = '-';
    if (st.ep >= 0 && legalMoves(st).some((m) => m.flag === 'e')) ep = sqName(st.ep);
    const cs = ['K', 'Q', 'k', 'q'].filter((k) => st.castle[k]).join('') || '-';
    return st.b.map((p) => p || '.').join('') + st.turn + cs + ep;
  }

  // 기물 부족: 킹 vs 킹, 킹+비숍/나이트 vs 킹, 같은 색 칸 비숍만 남음
  function insufficient(b) {
    const rest = [];
    for (let s = 0; s < 64; s++) if (b[s] && b[s].toLowerCase() !== 'k') rest.push([b[s].toLowerCase(), s]);
    if (rest.length === 0) return true;
    if (rest.length === 1 && (rest[0][0] === 'b' || rest[0][0] === 'n')) return true;
    if (rest.every(([t]) => t === 'b')) {
      const shade = (s) => (fileOf(s) + (s >> 3)) & 1;
      return rest.every(([, s]) => shade(s) === shade(rest[0][1]));
    }
    return false;
  }
  // 한 색이 체크메이트를 만들 기물이 하나도 없는지 (시간 초과 판정용)
  function cannotMate(b, c) {
    const mine = [];
    for (let s = 0; s < 64; s++) if (b[s] && colorOf(b[s]) === c && b[s].toLowerCase() !== 'k') mine.push(b[s].toLowerCase());
    return mine.length === 0 || (mine.length === 1 && (mine[0] === 'b' || mine[0] === 'n'));
  }

  // 판 상태: { over, winner: 'w'|'b'|null, reason }
  function status(st, history) {
    const moves = legalMoves(st);
    if (moves.length === 0) {
      if (inCheck(st)) return { over: true, winner: other(st.turn), reason: 'checkmate' };
      return { over: true, winner: null, reason: 'stalemate' };
    }
    if (insufficient(st.b)) return { over: true, winner: null, reason: 'material' };
    if (st.half >= 100) return { over: true, winner: null, reason: 'fifty' };
    if (history) {
      const k = posKey(st);
      if (history.filter((x) => x === k).length >= 3) return { over: true, winner: null, reason: 'repetition' };
    }
    return { over: false };
  }

  // 기보 표기 (예: Nf3, exd5, O-O, e8=Q+, Qh4#)
  function san(st, m) {
    const p = st.b[m.from], t = p.toLowerCase();
    let s;
    if (m.flag === 'k') s = 'O-O';
    else if (m.flag === 'q') s = 'O-O-O';
    else {
      const cap = m.flag === 'c' || m.flag === 'e';
      if (t === 'p') {
        s = (cap ? FILES[fileOf(m.from)] + 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
      } else {
        // 같은 칸에 갈 수 있는 같은 종류 기물이 있으면 구별
        const twins = legalMoves(st).filter((x) => x.to === m.to && x.from !== m.from && st.b[x.from] === p);
        let dis = '';
        if (twins.length) {
          if (!twins.some((x) => fileOf(x.from) === fileOf(m.from))) dis = FILES[fileOf(m.from)];
          else if (!twins.some((x) => rankOf(x.from) === rankOf(m.from))) dis = String(rankOf(m.from));
          else dis = sqName(m.from);
        }
        s = t.toUpperCase() + dis + (cap ? 'x' : '') + sqName(m.to);
      }
    }
    const n = apply(st, m);
    if (inCheck(n)) s += legalMoves(n).length ? '+' : '#';
    return s;
  }

  // 클라이언트가 보낸 {from, to, promo}가 둘 수 있는 수인지 찾아줌
  function findMove(st, from, to, promo) {
    const list = legalMoves(st).filter((m) => m.from === from && m.to === to);
    if (!list.length) return null;
    if (list[0].promo) return list.find((m) => m.promo === String(promo || '').toLowerCase()) || null;
    return list[0];
  }

  const api = { initial, clone, apply, legalMoves, inCheck, status, san, posKey, findMove, insufficient, cannotMate, sqName, colorOf, other, kingSq };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChessRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
