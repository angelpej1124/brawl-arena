// =====================================================================
//  맵 목록 — 서버(게임 판정)와 브라우저(그리기)가 같이 씀
//  월드 크기는 1280 x 720. 숫자를 바꾸면 맵 모양이 바뀌어요.
//   solids    : 단단한 땅 (옆·아래에서 못 지나감)
//   platforms : 위에서만 올라설 수 있는 얇은 발판 (↓로 내려가기)
//   spawns    : 라운드 시작 위치 (발 위치)
//   respawn   : 장외 후 다시 나타나는 위치
//   theme     : 색깔
// =====================================================================
(function (root) {
  const MAPS = [
    {
      id: 'hill', name: '별빛 언덕',
      solids: [{ x: 240, y: 520, w: 800, h: 70 }],
      platforms: [{ x: 320, y: 385, w: 200 }, { x: 760, y: 385, w: 200 }, { x: 540, y: 255, w: 200 }],
      spawns: [{ x: 340, y: 520 }, { x: 940, y: 520 }, { x: 640, y: 255 }, { x: 420, y: 385 }, { x: 860, y: 385 }, { x: 640, y: 520 }],
      respawn: { x: 640, y: 120 },
      theme: { sky: ['#1b1640', '#3a2560', '#6b3459'], hill: '#2a1c48', grass: '#5ec46a', grassHi: '#8be38f', dirt: '#4d3b2a', plat: '#c9b6ff', platHi: '#efe8ff', orb: 'rgba(255,207,63,', stars: true },
    },
    {
      id: 'island', name: '작은 섬',
      solids: [{ x: 400, y: 520, w: 480, h: 70 }],
      platforms: [{ x: 440, y: 395, w: 160 }, { x: 680, y: 395, w: 160 }],
      spawns: [{ x: 460, y: 520 }, { x: 820, y: 520 }, { x: 520, y: 395 }, { x: 760, y: 395 }, { x: 600, y: 520 }, { x: 680, y: 520 }],
      respawn: { x: 640, y: 160 },
      theme: { sky: ['#0d3b66', '#2a7aa8', '#7fc8d8'], hill: '#11507a', grass: '#f2d58a', grassHi: '#fff1c2', dirt: '#b58a4c', plat: '#ffe0a3', platHi: '#fff6dd', orb: 'rgba(255,240,180,', stars: false, water: '#1a6f9a' },
    },
    {
      id: 'twin', name: '쌍둥이 섬',
      solids: [{ x: 180, y: 520, w: 350, h: 70 }, { x: 750, y: 520, w: 350, h: 70 }],
      platforms: [{ x: 560, y: 410, w: 160 }, { x: 250, y: 380, w: 160 }, { x: 870, y: 380, w: 160 }],
      spawns: [{ x: 300, y: 520 }, { x: 980, y: 520 }, { x: 640, y: 410 }, { x: 420, y: 520 }, { x: 860, y: 520 }, { x: 330, y: 380 }],
      respawn: { x: 640, y: 150 },
      theme: { sky: ['#2b1b3d', '#7a3b5e', '#e0875f'], hill: '#4a2440', grass: '#e8a35a', grassHi: '#ffd08a', dirt: '#6b3a2a', plat: '#ffb48a', platHi: '#ffe1cc', orb: 'rgba(255,170,90,', stars: false },
    },
    {
      id: 'tower', name: '계단 탑',
      solids: [{ x: 300, y: 540, w: 680, h: 60 }],
      platforms: [{ x: 330, y: 440, w: 170 }, { x: 555, y: 345, w: 170 }, { x: 780, y: 440, w: 170 }, { x: 555, y: 200, w: 170 }],
      spawns: [{ x: 360, y: 540 }, { x: 920, y: 540 }, { x: 415, y: 440 }, { x: 865, y: 440 }, { x: 640, y: 345 }, { x: 640, y: 540 }],
      respawn: { x: 640, y: 90 },
      theme: { sky: ['#101826', '#1f3149', '#3c5a74'], hill: '#18263a', grass: '#8a95a8', grassHi: '#c8d0dc', dirt: '#3d4656', plat: '#9fb4cc', platHi: '#e3ecf6', orb: 'rgba(220,235,255,', stars: true },
    },
    {
      id: 'field', name: '넓은 들판',
      solids: [{ x: 140, y: 520, w: 1000, h: 70 }],
      platforms: [{ x: 540, y: 330, w: 200 }],
      spawns: [{ x: 240, y: 520 }, { x: 1040, y: 520 }, { x: 640, y: 520 }, { x: 440, y: 520 }, { x: 840, y: 520 }, { x: 640, y: 330 }],
      respawn: { x: 640, y: 120 },
      theme: { sky: ['#3a7bd5', '#7fb6ea', '#cfe8ff'], hill: '#5d9c6b', grass: '#6cc24a', grassHi: '#a6e57f', dirt: '#6e4b2e', plat: '#e7d6a8', platHi: '#fff6dc', orb: 'rgba(255,250,210,', stars: false },
    },
    {
      id: 'float', name: '떠다니는 발판',
      solids: [{ x: 530, y: 560, w: 220, h: 50 }],
      platforms: [{ x: 250, y: 455, w: 180 }, { x: 850, y: 455, w: 180 }, { x: 390, y: 330, w: 170 }, { x: 720, y: 330, w: 170 }, { x: 555, y: 205, w: 170 }],
      spawns: [{ x: 340, y: 455 }, { x: 940, y: 455 }, { x: 475, y: 330 }, { x: 805, y: 330 }, { x: 600, y: 560 }, { x: 680, y: 560 }],
      respawn: { x: 640, y: 100 },
      theme: { sky: ['#0b0a1f', '#24164a', '#4b2a7a'], hill: '#1c1240', grass: '#b78cff', grassHi: '#e2d0ff', dirt: '#3b2766', plat: '#8fe3ff', platHi: '#e3f9ff', orb: 'rgba(180,140,255,', stars: true },
    },
    {
      id: 'castle', name: '성벽',
      solids: [{ x: 260, y: 520, w: 760, h: 70 }, { x: 370, y: 440, w: 44, h: 80 }, { x: 866, y: 440, w: 44, h: 80 }],
      platforms: [{ x: 555, y: 340, w: 170 }, { x: 300, y: 300, w: 140 }, { x: 840, y: 300, w: 140 }],
      spawns: [{ x: 310, y: 520 }, { x: 970, y: 520 }, { x: 640, y: 520 }, { x: 640, y: 340 }, { x: 520, y: 520 }, { x: 760, y: 520 }],
      respawn: { x: 640, y: 120 },
      theme: { sky: ['#2a1a12', '#5a3420', '#a4643a'], hill: '#3a2418', grass: '#a79a86', grassHi: '#d8cdb8', dirt: '#5b4c3e', plat: '#c9a978', platHi: '#f1dfbd', orb: 'rgba(255,200,140,', stars: false },
    },
  ];
  // 계산해 두는 값 (봇·분신이 땅 끝을 알기 위해)
  for (const m of MAPS) {
    m.width = 1280; m.height = 720;
    m.blast = { left: -260, right: 1540, top: -520, bottom: 980 };
    m.left = Math.min(...m.solids.map((s) => s.x), ...m.platforms.map((p) => p.x));
    m.right = Math.max(...m.solids.map((s) => s.x + s.w), ...m.platforms.map((p) => p.x + p.w));
    m.floor = Math.max(...m.solids.map((s) => s.y), ...m.platforms.map((p) => p.y));
  }
  // 캐릭터 색 (한 방에서 같은 색은 한 명만)
  MAPS.COLORS = [
    { id: 'red', name: '빨강', hex: '#ff4d4d' },
    { id: 'blue', name: '파랑', hex: '#3f8cff' },
    { id: 'yellow', name: '노랑', hex: '#ffd23f' },
    { id: 'green', name: '초록', hex: '#3ccf6e' },
    { id: 'purple', name: '보라', hex: '#a66bff' },
    { id: 'black', name: '검정', hex: '#26252e' },
    { id: 'white', name: '흰색', hex: '#f4f4f6' },
    { id: 'orange', name: '주황', hex: '#ff8c2e' },
    { id: 'pink', name: '핑크', hex: '#ff7ac8' },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = MAPS;
  else root.BRAWL_MAPS = MAPS;
})(this);
