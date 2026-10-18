// =====================================================================
//  치장품 목록 — 서버(뽑기·장착 확인)와 브라우저(그리기)가 같이 씀
//  카테고리마다 하나씩 장착 (없음 가능). 보이는 것만 바뀜.
// =====================================================================
(function (root) {
  const COSMETICS = {
    hat: {
      name: '모자',
      items: {
        bunny:   { name: '토끼 귀' },
        tophat:  { name: '신사 모자' },
        cowboy:  { name: '카우보이 모자' },
        horns:   { name: '뿔' },
        brain:   { name: '뇌' },
        cap:     { name: '야구 모자' },
        straw:   { name: '밀짚모자' },
      },
    },
    outfit: {
      name: '옷',
      items: {
        suit:     { name: '정장' },
        beggar:   { name: '거지' },
        doctor:   { name: '의사' },
        uniform:  { name: '교복' },
        baby:     { name: '아기' },
      },
    },
  };
  const COST = 70;          // 치장품 뽑기 1회
  const DUP_REFUND = 30;    // 이미 가진 걸 뽑으면 돌려받는 보석
  const all = [];
  for (const [cat, c] of Object.entries(COSMETICS)) for (const id of Object.keys(c.items)) all.push({ cat, id });
  const api = { COSMETICS, COST, DUP_REFUND, ALL: all };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BRAWL_COSM = api;
})(this);
