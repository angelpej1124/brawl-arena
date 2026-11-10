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
  SKIN_SALE: 0.7,     // 오늘의 스킨은 등급 가격의 70% (에픽 100→70 · 레어 150→105)
  SKILL_PRICE: 100,   // 오늘의 스킬 가격
  SKINS_PER_DAY: 3,
  SKILLS_PER_DAY: 2,
  // 한정판 이벤트: 상점 맨 위에 따로 (from 00:00 ~ until 23:59, 한국 시간). 그 전엔 안 보이고, 끝나면 다시는 못 삼
  // 한정판 가격은 전설 등급 가격 (public/skins.js GRADES.legend = 200)
  EVENTS: [
    { id: 'halloween-2026', name: '🎃 할로윈 한정판', desc: '이번 주에만 살 수 있는 한정판 스킨! 기간이 끝나면 다시는 못 사요',
      skins: ['pumpkin', 'vampire', 'soul'], from: '2026-11-02', until: '2026-11-08' },
    { id: 'pepero-2026', name: '🍫 빼빼로 데이 한정판', desc: '빼빼로 데이 주간에만 살 수 있는 한정판 스킨! 기간이 끝나면 다시는 못 사요',
      skins: ['pepero_sword', 'pepero_dope'], from: '2026-11-09', until: '2026-11-15' },
  ],
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
