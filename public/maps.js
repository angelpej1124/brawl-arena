// =====================================================================
//  맵 목록 — 서버(게임 판정)와 브라우저(그리기)가 같이 씀
//  월드 크기는 1280 x 720 (큰 맵은 width/height로 따로 지정). 숫자를 바꾸면 맵 모양이 바뀌어요.
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
    // ---- 큰 맵 (월드 1600 x 900, 화면은 살짝 멀리서 보여줌) ----
    {
      id: 'temple', name: '고대 신전', width: 1600, height: 900,
      solids: [{ x: 230, y: 660, w: 1140, h: 80 }, { x: 420, y: 590, w: 130, h: 70 }, { x: 1050, y: 590, w: 130, h: 70 }],
      platforms: [{ x: 280, y: 490, w: 200 }, { x: 1120, y: 490, w: 200 }, { x: 590, y: 400, w: 180 }, { x: 830, y: 400, w: 180 }, { x: 700, y: 270, w: 200 }, { x: 330, y: 300, w: 150 }, { x: 1120, y: 300, w: 150 }],
      spawns: [{ x: 330, y: 660 }, { x: 1270, y: 660 }, { x: 800, y: 660 }, { x: 680, y: 400 }, { x: 920, y: 400 }, { x: 800, y: 270 }],
      respawn: { x: 800, y: 140 },
      theme: { sky: ['#0f2a22', '#1f5145', '#6aa37f'], hill: '#163a2e', grass: '#7fbf5a', grassHi: '#b9e68f', dirt: '#6d5c3c', plat: '#e2c879', platHi: '#fff1c4', orb: 'rgba(255,230,150,', stars: false },
    },
    {
      id: 'canyon', name: '거대한 협곡', width: 1600, height: 900,
      solids: [{ x: 170, y: 640, w: 520, h: 90 }, { x: 910, y: 640, w: 520, h: 90 }],
      platforms: [{ x: 650, y: 540, w: 300 }, { x: 250, y: 490, w: 180 }, { x: 1170, y: 490, w: 180 }, { x: 480, y: 370, w: 180 }, { x: 940, y: 370, w: 180 }, { x: 710, y: 240, w: 180 }],
      spawns: [{ x: 300, y: 640 }, { x: 1300, y: 640 }, { x: 800, y: 540 }, { x: 560, y: 640 }, { x: 1040, y: 640 }, { x: 800, y: 240 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#3b1d1a', '#8a3f2a', '#e59a5c'], hill: '#5a2a1e', grass: '#d58a4a', grassHi: '#f5bb7a', dirt: '#7a3e26', plat: '#f0b07a', platHi: '#ffe0c0', orb: 'rgba(255,190,120,', stars: false },
    },
  ];
  // 계산해 두는 값 (봇·분신이 땅 끝을 알기 위해)
  for (const m of MAPS) {
    m.width = m.width || 1280; m.height = m.height || 720;
    m.zoom = 1280 / m.width;   // 큰 맵은 화면에 맞게 작게 그림
    const pad = m.width > 1280 ? 320 : 260;
    m.blast = { left: -pad, right: m.width + pad, top: -(m.height * 0.72), bottom: m.height + pad };
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
