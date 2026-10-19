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
    darkelf:     { skill: 'archer', name: '다크 엘프', desc: '활과 화살이 검은색·보라색으로', color: '#3a1460' },
    titan:       { skill: 'giant', name: '진격의 거인', desc: '거인이 되면 근육이 드러난 거대한 모습', color: '#b8483a' },
    timestone:   { skill: 'time', name: '타임 스톤', desc: '시간 저장·되돌리기 이펙트가 초록색', color: '#2fe07a' },
    aurora:      { skill: 'ice', name: '오로라', desc: '눈보라 대신 하늘에 오로라가 일렁이고, 얼음 게이지도 오로라빛', color: '#5af0c0' },
    frog:        { skill: 'turret', name: '개구리', desc: '터렛이 개구리로! 총알 대신 혀를 쭉 내밀었다가 감아 들임 (혀 끝만 맞음)', color: '#5cc84a' },
    elf:         { skill: 'archer', name: '엘프', desc: '덩굴과 잎이 감긴 초록·갈색 활, 초록빛 화살', color: '#4caf50' },
    holyknight:  { skill: 'sword', name: '빛의 기사', desc: '검이 신성한 빛의 검으로, 휘두르면 금빛 궤적', color: '#ffe680' },
    tree:        { skill: 'rock', name: '나무', desc: '바위 대신 나무 몸 (나무껍질 + 머리 위 잎사귀)', color: '#8a5a2b' },
    taiji:       { skill: 'magnet', name: '태극', desc: '당기기·밀기 때 커다란 태극 무늬가 돎', color: '#d8323c' },
    shadowice:   { skill: 'ice', name: '어둠', desc: '눈보라 대신 어둠이 깔리고, 검은 게이지가 차면 어둠에 잠식됨', color: '#2a2238' },
    steel:       { skill: 'rock', name: '강철', desc: '바위 대신 반짝이는 강철 몸', color: '#9fb0c4' },
    yinyang:     { skill: 'magnet', name: '음양', desc: '당기기·밀기 때 커다란 흑백 음양 무늬가 돎', color: '#1a1a1a' },
    lava:        { skill: 'flood', name: '용암', desc: '물 대신 주황색 반투명 용암 바다가 차오름 (보이는 것만 바뀜)', color: '#ff7a1a' },
    mecharm:     { skill: 'tentacle', name: '기계 팔', desc: '촉수가 매끈한 흰색 로봇 팔로 (청록 빛 관절, 둥근 집게)', color: '#3cdce6' },
    deepsea:     { skill: 'tentacle', name: '심해', desc: '보랏빛으로 빛나는 심해 생물 촉수 (청록 발광 점)', color: '#7a4ac8' },
    ginkgo:      { skill: 'mine', name: '은행', desc: '지뢰 대신 노란 은행 열매를 뿌림', color: '#e8c84a' },
    blocks:      { skill: 'mine', name: '블록', desc: '지뢰 대신 밟으면 아픈 장난감 블록을 뿌림', color: '#e53935' },
    firebow:     { skill: 'archer', name: '불화살', desc: '활과 화살이 불로 바뀜 (보이는 것만, 불 피해는 없음)', color: '#ff6a1a' },
    saber_r:     { skill: 'sword', name: '광선검-레드', desc: '빨간 광선검', color: '#ff2a2a', blade: '#ff2a2a' },
    saber_b:     { skill: 'sword', name: '광선검-블루', desc: '파란 광선검', color: '#2a8cff', blade: '#2a8cff' },
    saber_y:     { skill: 'sword', name: '광선검-옐로', desc: '노란 광선검', color: '#ffe02a', blade: '#ffe02a' },
    saber_g:     { skill: 'sword', name: '광선검-그린', desc: '초록 광선검', color: '#2aff6a', blade: '#2aff6a' },
    saber_p:     { skill: 'sword', name: '광선검-퍼플', desc: '보라 광선검', color: '#b42aff', blade: '#b42aff' },
    snowninja:   { skill: 'ninja', name: '스노우', desc: '쿠나이 대신 고드름을 휘두르고 던짐. 통나무 대신 눈사람을 남김', color: '#cfeaff' },
    solar:       { skill: 'atom', name: '태양계', desc: '시전자는 이글거리는 태양, 전자는 수성·금성·지구·화성·목성. 스킬을 쓰면 토성·천왕성·해왕성까지 수금지화목토천해가 다 돎', color: '#ffb02e' },
    gold:        { skill: 'rock', name: '골드', desc: '바위 대신 번쩍이는 금덩어리 몸', color: '#ffc928' },
  };
  const PRICE = 50;
  const api = { SKINS, PRICE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BRAWL_SKINS = api;
})(this);
