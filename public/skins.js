// =====================================================================
//  스킨 목록 — 서버(구매·장착 확인)와 브라우저(그리기)가 같이 씀
//  스킨은 보이는 것만 바뀌고 능력은 그대로예요.
//   skill : 어느 능력의 스킨인지
//   fx    : 약공격·강공격 이펙트 색 (venom 검정 / rainbow 무지개 / redwind 붉은 바람)
// =====================================================================
(function (root) {
  const SKINS = {
    venom:       { skill: 'parasite', name: '베놈', desc: '공격이 검은 이펙트로. 기생하면 머리 위 표시가 검게, 숙주에게 베놈 눈이 생김', fx: 'venom', color: '#1b1b22' },
    rainbow:     { skill: 'reflect', name: '무지개 반사', desc: '공격에 무지개 이펙트. 거울 대신 무지개로 반사', fx: 'rainbow', color: '#ff7ac8' },
    redhulk:     { skill: 'hulk', name: '레드 헐크', desc: '커질수록 빨갛게 변함', color: '#e8322e' },
    angel:       { skill: 'fly', name: '천사', desc: '비행할 때 커다란 천사 날개와 머리 위 천사 링', color: '#fff4c2' },
    demon:       { skill: 'fly', name: '악마', desc: '비행할 때 커다란 악마 날개와 머리의 악마 뿔', color: '#8b1030' },
    bluefire:    { skill: 'fire', name: '청염', desc: '불이 전부 파란색 (주먹·돌진·불붙은 상대까지)', color: '#3fa0ff' },
    firetornado: { skill: 'wind', name: '불 토네이도', desc: '공격에 붉은 이펙트, 소용돌이도 붉은 불꽃색', fx: 'redwind', color: '#ff5a2a' },
    steel:       { skill: 'rock', name: '강철', desc: '바위 대신 반짝이는 강철 몸', color: '#9fb0c4' },
  };
  const PRICE = 50;
  const api = { SKINS, PRICE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BRAWL_SKINS = api;
})(this);
