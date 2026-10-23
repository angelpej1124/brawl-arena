// =====================================================================
//  상점 설정
//   - 매일(한국 시간 자정) 바뀌는 오늘의 상품: 스킨 3개 + 스킬 2개 (모든 유저 똑같음)
//   - 일일 보상: 하루 한 번 보석 DAILY개
//   - 주간 패키지: 아래 PACKAGES에 직접 적어서 정함 (from ~ until 동안만 팔림, 한국 시간)
//       skills / skins: 들어 있는 스킬·스킨 id (스킬 id는 game.js SKILLS, 스킨 id는 public/skins.js)
//       price: 패키지 가격 (이미 가진 건 빼고 나머지를 받음, 전부 가지고 있으면 못 삼)
//     예) 광선검 패키지: skins: ['saber_r', 'saber_b', 'saber_y', 'saber_g', 'saber_p']
//         터렛 패키지:   skills: ['turret'], skins: ['frog', 'llama']
// =====================================================================
const SHOP = {
  DAILY: 30,          // 일일 보상 보석
  SKIN_PRICE: 70,     // 오늘의 스킨 가격 (원래 100)
  SKILL_PRICE: 100,   // 오늘의 스킬 가격
  SKINS_PER_DAY: 3,
  SKILLS_PER_DAY: 2,
  PACKAGES: [
    {
      id: 'jam-2026w43', name: '방해 패키지', desc: '상대를 괴롭히는 스킬 3종: 지진 · 반전 · 에러',
      skills: ['quake', 'invert', 'error'], skins: [], price: 200,
      from: '2026-10-22', until: '2026-10-25',   // 이번 주 일요일까지
    },
    {
      id: 'weapon-2026w44', name: '무기 패키지', desc: '공격 방식이 바뀌는 무기 스킬 4종: 검사 · 궁수 · 닌자 · 방패',
      skills: ['sword', 'archer', 'ninja', 'shield'], skins: [], price: 300,
      from: '2026-10-26', until: '2026-11-01',   // 다음 주 월요일 0시(한국)에 자동으로 바뀜 — 그 전엔 상점에 안 보임
    },
  ],
};
module.exports = SHOP;
