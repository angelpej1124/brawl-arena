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
    carnage:     { skill: 'parasite', name: '카니지', desc: '베놈과 같지만 빨간색. 공격이 붉은 이펙트, 기생 표시와 숙주의 찢어진 눈도 빨갛게', fx: 'carnage', color: '#c4161c' },
    crystal:     { skill: 'rock', name: '크리스탈', desc: '바위 대신 반짝이는 보랏빛 크리스탈 몸', color: '#b48cff' },
    sand:        { skill: 'ice', name: '모래', desc: '눈보라 대신 모래바람, 얼음 대신 모래에 갇힘, 게이지도 모래색', color: '#d9b26a' },
    oneforall:   { skill: 'blackflash', name: '원포올', desc: '흑섬 이펙트가 초록 번개로, 훨씬 화려하게', color: '#3dff8a' },
    supernova:   { skill: 'sun', name: '초신성', desc: '파란 태양 — 햇살과 오라, 평타의 불까지 모두 파란색', color: '#4aa8ff' },
    swamp:       { skill: 'slow', name: '늪', desc: '둔화가 갈색 늪으로 퍼지고, 걸린 사람은 진흙을 뒤집어씀', color: '#7a5a30' },
    darkness:    { skill: 'sword', name: '어둠의 검사', desc: '검이 검은색·보라색으로, 휘두르는 궤적과 참격도 어둠의 보라빛', color: '#5b2a8c' },
    steel:       { skill: 'rock', name: '강철', desc: '바위 대신 반짝이는 강철 몸', color: '#9fb0c4' },
  };
  const PRICE = 50;
  const api = { SKINS, PRICE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BRAWL_SKINS = api;
})(this);
