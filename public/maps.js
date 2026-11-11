// =====================================================================
//  맵 목록 — 서버(게임 판정)와 브라우저(그리기)가 같이 씀
//  월드 크기는 1280 x 720 (큰 맵은 width/height로 따로 지정). 숫자를 바꾸면 맵 모양이 바뀌어요.
//   solids    : 단단한 땅 (옆·아래에서 못 지나감)
//   platforms : 위에서만 올라설 수 있는 얇은 발판 (↓로 내려가기)
//   tramps    : 트램펄린 { x, y, w, power } — 위에서 밟으면 power만큼 튕겨 오름
//   slopes    : 빗면 { x1, y1, x2, y2 } — 윗면이 기울어진 땅. 걸어서 오르내림 (높은 쪽 끝은 땅에 딱 붙여서 만들기)
//   spawns    : 라운드 시작 위치 (발 위치)
//   respawn   : 장외 후 다시 나타나는 위치
//   theme     : 색깔
//   crumble   : 무너지는 발판 [{ x, y, w }] — 밟으면 1초 뒤 무너지고 3초 뒤 다시 생김
//   movers    : 움직이는 발판 [{ x, y, w, x2, y2, per, ph }] — (x,y)↔(x2,y2) 왕복, per초에 한 바퀴. 올라탄 사람은 같이 실림. 스폰 위치로 쓰지 않기
//   gusts     : 바람 구역 [{ x, y, w, h, vx, vy }] — 안에 있으면 vx(px/초)만큼 밀리고, vy가 있으면 그 속도로 떠오름(음수=위)
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
      solids: [{ x: 290, y: 520, w: 700, h: 70 }],
      platforms: [{ x: 350, y: 395, w: 180 }, { x: 750, y: 395, w: 180 }, { x: 560, y: 285, w: 160 }],
      spawns: [{ x: 360, y: 520 }, { x: 920, y: 520 }, { x: 440, y: 395 }, { x: 840, y: 395 }, { x: 560, y: 520 }, { x: 720, y: 520 }],
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
      solids: [{ x: 430, y: 560, w: 420, h: 50 }],
      platforms: [{ x: 170, y: 455, w: 220 }, { x: 890, y: 455, w: 220 }, { x: 340, y: 330, w: 200 }, { x: 740, y: 330, w: 200 }, { x: 540, y: 205, w: 200 }, { x: 70, y: 300, w: 150 }, { x: 1060, y: 300, w: 150 }],
      spawns: [{ x: 280, y: 455 }, { x: 1000, y: 455 }, { x: 440, y: 330 }, { x: 840, y: 330 }, { x: 540, y: 560 }, { x: 740, y: 560 }],
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
    {
      id: 'ruins', name: '무너진 유적', width: 1600, height: 900,
      solids: [{ x: 200, y: 660, w: 400, h: 80 }, { x: 1000, y: 660, w: 400, h: 80 }, { x: 640, y: 600, w: 320, h: 60 }, { x: 520, y: 570, w: 50, h: 90 }, { x: 1030, y: 570, w: 50, h: 90 }],
      platforms: [{ x: 250, y: 520, w: 170 }, { x: 1180, y: 520, w: 170 }, { x: 700, y: 460, w: 200 }, { x: 420, y: 360, w: 170 }, { x: 1010, y: 360, w: 170 }, { x: 715, y: 250, w: 170 }],
      spawns: [{ x: 300, y: 660 }, { x: 1300, y: 660 }, { x: 800, y: 600 }, { x: 335, y: 520 }, { x: 1265, y: 520 }, { x: 800, y: 460 }],
      respawn: { x: 800, y: 140 },
      theme: { sky: ['#1d1a2e', '#3d3a5c', '#8a7f9e'], hill: '#2a2640', grass: '#9c9483', grassHi: '#cfc6b3', dirt: '#4f4a42', plat: '#bcae92', platHi: '#ece2cb', orb: 'rgba(220,210,255,', stars: true },
    },
    {
      id: 'volcano', name: '화산섬', width: 1600, height: 900,
      solids: [{ x: 260, y: 640, w: 1080, h: 90 }, { x: 690, y: 560, w: 220, h: 80 }],
      platforms: [{ x: 300, y: 500, w: 180 }, { x: 1120, y: 500, w: 180 }, { x: 520, y: 400, w: 160 }, { x: 920, y: 400, w: 160 }, { x: 720, y: 300, w: 160 }, { x: 330, y: 300, w: 140 }, { x: 1130, y: 300, w: 140 }],
      spawns: [{ x: 360, y: 640 }, { x: 1240, y: 640 }, { x: 800, y: 560 }, { x: 600, y: 640 }, { x: 1000, y: 640 }, { x: 800, y: 300 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#1a0a0a', '#4a1410', '#a8401c'], hill: '#2a0e0a', grass: '#5a4a48', grassHi: '#8a7470', dirt: '#2e2220', plat: '#ff8a3d', platHi: '#ffd0a0', orb: 'rgba(255,120,60,', stars: false, water: '#d4471a' },
    },
    {
      id: 'skygarden', name: '하늘 정원', width: 1600, height: 900,
      solids: [{ x: 250, y: 600, w: 300, h: 60 }, { x: 1050, y: 600, w: 300, h: 60 }, { x: 650, y: 660, w: 300, h: 60 }],
      platforms: [{ x: 560, y: 520, w: 140 }, { x: 900, y: 520, w: 140 }, { x: 300, y: 430, w: 160 }, { x: 1140, y: 430, w: 160 }, { x: 700, y: 380, w: 200 }, { x: 480, y: 270, w: 150 }, { x: 970, y: 270, w: 150 }, { x: 725, y: 180, w: 150 }],
      spawns: [{ x: 400, y: 600 }, { x: 1200, y: 600 }, { x: 800, y: 660 }, { x: 380, y: 430 }, { x: 1220, y: 430 }, { x: 800, y: 380 }],
      respawn: { x: 800, y: 100 },
      theme: { sky: ['#7ec8ff', '#bfe6ff', '#fff3d6'], hill: '#9fd4a8', grass: '#7fe08a', grassHi: '#c4f5b8', dirt: '#8a6a4a', plat: '#ffffff', platHi: '#e8f6ff', orb: 'rgba(255,255,220,', stars: false },
    },
    // ---- 빗면이 있는 큰 맵 ----
    {
      id: 'halfpipe', name: '하프파이프', width: 1600, height: 900,
      // 양 끝이 비탈로 솟은 스케이트장: 비탈을 타고 내려가며 달려들기
      solids: [{ x: 330, y: 660, w: 940, h: 80 }, { x: 150, y: 520, w: 180, h: 220 }, { x: 1270, y: 520, w: 180, h: 220 }],
      slopes: [{ x1: 330, y1: 520, x2: 540, y2: 660 }, { x1: 1060, y1: 660, x2: 1270, y2: 520 }],
      platforms: [{ x: 650, y: 520, w: 300 }, { x: 430, y: 390, w: 160 }, { x: 1010, y: 390, w: 160 }, { x: 720, y: 270, w: 160 }],
      spawns: [{ x: 230, y: 520 }, { x: 1370, y: 520 }, { x: 640, y: 660 }, { x: 960, y: 660 }, { x: 800, y: 520 }, { x: 800, y: 270 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#1a1030', '#4a2a6a', '#ff7a8a'], hill: '#2a1c44', grass: '#c8c8d4', grassHi: '#ffffff', dirt: '#6a6a7e', plat: '#ffd23f', platHi: '#fff1a8', orb: 'rgba(255,140,170,', stars: true },
    },
    {
      id: 'peak', name: '설산 봉우리', width: 1600, height: 900,
      // 한가운데 뾰족한 눈 덮인 산: 꼭대기를 차지하려는 싸움
      solids: [{ x: 200, y: 680, w: 1200, h: 80 }],
      slopes: [{ x1: 500, y1: 680, x2: 800, y2: 480 }, { x1: 800, y1: 480, x2: 1100, y2: 680 }],
      platforms: [{ x: 720, y: 360, w: 160 }, { x: 250, y: 540, w: 170 }, { x: 1180, y: 540, w: 170 }, { x: 390, y: 410, w: 150 }, { x: 1060, y: 410, w: 150 }, { x: 735, y: 220, w: 130 }],
      spawns: [{ x: 300, y: 680 }, { x: 1300, y: 680 }, { x: 800, y: 360 }, { x: 440, y: 680 }, { x: 1160, y: 680 }, { x: 335, y: 540 }],
      respawn: { x: 800, y: 110 },
      theme: { sky: ['#1c2a4a', '#5a7aa8', '#c8dcf0'], hill: '#3a5070', grass: '#f4f8ff', grassHi: '#ffffff', dirt: '#6a7890', plat: '#b8d8f0', platHi: '#f0f8ff', orb: 'rgba(240,248,255,', stars: false },
    },
    {
      id: 'zigzag', name: '지그재그 산길', width: 1600, height: 900,
      // 왼쪽 아래에서 오른쪽 위로 올라가는 계단식 산길 (오른쪽이 높은 고지대)
      solids: [{ x: 180, y: 700, w: 1040, h: 80 }, { x: 760, y: 600, w: 460, h: 100 }, { x: 1220, y: 500, w: 240, h: 280 }],
      slopes: [{ x1: 540, y1: 700, x2: 760, y2: 600 }, { x1: 1000, y1: 600, x2: 1220, y2: 500 }],
      platforms: [{ x: 240, y: 560, w: 180 }, { x: 520, y: 450, w: 160 }, { x: 860, y: 420, w: 160 }, { x: 1250, y: 360, w: 170 }, { x: 640, y: 290, w: 160 }, { x: 1020, y: 250, w: 150 }],
      spawns: [{ x: 300, y: 700 }, { x: 1340, y: 500 }, { x: 860, y: 600 }, { x: 440, y: 700 }, { x: 330, y: 560 }, { x: 600, y: 450 }],
      respawn: { x: 820, y: 130 },
      theme: { sky: ['#1f3a2a', '#4f7a4a', '#d8c88a'], hill: '#2c4a30', grass: '#7cb342', grassHi: '#aed581', dirt: '#6d4c2e', plat: '#d7b98a', platHi: '#f5e6c8', orb: 'rgba(255,240,180,', stars: false },
    },
    {
      id: 'glacier', name: '기울어진 빙하', width: 1600, height: 900,
      // 비스듬히 기운 얼음 섬 두 개와 낮은 가운데 섬 (기운 섬의 높은 쪽 끝은 절벽)
      solids: [{ x: 200, y: 640, w: 320, h: 70 }, { x: 640, y: 700, w: 320, h: 70 }, { x: 1080, y: 640, w: 320, h: 70 }],
      slopes: [{ x1: 200, y1: 580, x2: 520, y2: 640 }, { x1: 1080, y1: 640, x2: 1400, y2: 580 }],
      platforms: [{ x: 560, y: 540, w: 150 }, { x: 890, y: 540, w: 150 }, { x: 720, y: 410, w: 160 }, { x: 290, y: 450, w: 150 }, { x: 1160, y: 450, w: 150 }, { x: 720, y: 260, w: 160 }],
      spawns: [{ x: 365, y: 450 }, { x: 1235, y: 450 }, { x: 720, y: 700 }, { x: 880, y: 700 }, { x: 800, y: 410 }, { x: 635, y: 540 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#06223a', '#1b5a80', '#8fd3f0'], hill: '#103a58', grass: '#d8f4ff', grassHi: '#ffffff', dirt: '#5a9ac0', plat: '#a8e8ff', platHi: '#f0fcff', orb: 'rgba(220,250,255,', stars: true, water: '#0f4f78' },
    },
    {
      id: 'dunes', name: '모래 언덕', width: 1600, height: 900,
      // 물결치는 모래 언덕 사이 가운데에 계단식 피라미드 발판
      solids: [{ x: 160, y: 700, w: 1280, h: 80 }],
      slopes: [{ x1: 260, y1: 700, x2: 430, y2: 615 }, { x1: 430, y1: 615, x2: 600, y2: 700 }, { x1: 1000, y1: 700, x2: 1170, y2: 615 }, { x1: 1170, y1: 615, x2: 1340, y2: 700 }],
      platforms: [{ x: 680, y: 590, w: 240 }, { x: 720, y: 480, w: 160 }, { x: 755, y: 370, w: 90 }, { x: 360, y: 470, w: 150 }, { x: 1090, y: 470, w: 150 }, { x: 540, y: 300, w: 130 }, { x: 930, y: 300, w: 130 }],
      spawns: [{ x: 200, y: 700 }, { x: 1400, y: 700 }, { x: 700, y: 700 }, { x: 900, y: 700 }, { x: 800, y: 590 }, { x: 800, y: 480 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#5a2a10', '#d8803a', '#ffe0a0'], hill: '#b8703a', grass: '#f0c878', grassHi: '#ffe8b0', dirt: '#c8964e', plat: '#e8b878', platHi: '#fff0d0', orb: 'rgba(255,240,200,', stars: false },
    },
    // ---- 트램펄린 맵 ----
    {
      id: 'trampark', name: '트램펄린 공원', width: 1600, height: 900,
      // 가운데 구덩이에 큰 트램펄린: 떨어져도 튕겨 올라옴. 양쪽 땅에도 작은 트램펄린
      solids: [{ x: 180, y: 660, w: 430, h: 80 }, { x: 990, y: 660, w: 430, h: 80 }],
      tramps: [{ x: 660, y: 790, w: 280, power: 1750 }, { x: 250, y: 660, w: 80, power: 1350 }, { x: 1270, y: 660, w: 80, power: 1350 }],
      platforms: [{ x: 700, y: 450, w: 200 }, { x: 390, y: 480, w: 150 }, { x: 1060, y: 480, w: 150 }, { x: 240, y: 300, w: 140 }, { x: 1220, y: 300, w: 140 }, { x: 720, y: 230, w: 160 }],
      spawns: [{ x: 420, y: 660 }, { x: 1180, y: 660 }, { x: 800, y: 450 }, { x: 520, y: 660 }, { x: 1080, y: 660 }, { x: 800, y: 230 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#2b2a6b', '#5a4ab8', '#ff9ec8'], hill: '#3a2f7a', grass: '#7fe08a', grassHi: '#c4f5b8', dirt: '#6a4a8a', plat: '#ffd23f', platHi: '#fff3a8', orb: 'rgba(255,220,240,', stars: true },
    },
    {
      id: 'cloudhop', name: '구름 트램펄린', width: 1600, height: 900,
      // 떠 있는 구름 섬마다 트램펄린 → 높은 발판으로 뛰어오름. 아래 틈에도 구조용 트램펄린
      solids: [{ x: 250, y: 640, w: 280, h: 50 }, { x: 1070, y: 640, w: 280, h: 50 }, { x: 670, y: 570, w: 260, h: 50 }],
      tramps: [{ x: 290, y: 640, w: 70, power: 1550 }, { x: 1240, y: 640, w: 70, power: 1550 }, { x: 765, y: 570, w: 70, power: 1650 }, { x: 560, y: 820, w: 90, power: 1900 }, { x: 950, y: 820, w: 90, power: 1900 }],
      platforms: [{ x: 200, y: 360, w: 150 }, { x: 1250, y: 360, w: 150 }, { x: 720, y: 300, w: 160 }, { x: 720, y: 140, w: 160 }, { x: 470, y: 230, w: 130 }, { x: 1000, y: 230, w: 130 }],
      spawns: [{ x: 440, y: 640 }, { x: 1160, y: 640 }, { x: 870, y: 570 }, { x: 275, y: 360 }, { x: 1325, y: 360 }, { x: 800, y: 300 }],
      respawn: { x: 800, y: 80 },
      theme: { sky: ['#6ec6ff', '#b8e4ff', '#fff0f8'], hill: '#9ad0f0', grass: '#ffffff', grassHi: '#ffffff', dirt: '#d8e8f8', plat: '#ffe0f0', platHi: '#ffffff', orb: 'rgba(255,255,230,', stars: false },
    },
    {
      id: 'canopy', name: '정글 나무 위', width: 1600, height: 900,
      // 큰 나무 두 그루 위 잎사귀 발판과 덩굴 사이를 오가는 정글
      solids: [{ x: 200, y: 700, w: 1200, h: 80 }],
      // 나무 줄기는 배경 장식 (통과 가능)
      trunks: [{ x: 430, y: 430, w: 46, h: 270 }, { x: 1124, y: 430, w: 46, h: 270 }],
      platforms: [{ x: 320, y: 430, w: 270 }, { x: 1010, y: 430, w: 270 }, { x: 650, y: 540, w: 300 }, { x: 700, y: 310, w: 200 }, { x: 240, y: 260, w: 150 }, { x: 1210, y: 260, w: 150 }, { x: 720, y: 160, w: 160 }],
      spawns: [{ x: 300, y: 700 }, { x: 1300, y: 700 }, { x: 800, y: 700 }, { x: 455, y: 430 }, { x: 1145, y: 430 }, { x: 800, y: 540 }],
      respawn: { x: 800, y: 100 },
      theme: { sky: ['#0f2a14', '#1f5a2a', '#7ab85a'], hill: '#1a4a22', grass: '#4caf3c', grassHi: '#8be06a', dirt: '#5a3a1a', plat: '#6fd65a', platHi: '#c8f5b0', orb: 'rgba(230,255,180,', stars: false },
    },
    // ---- 큰 맵 5개 (2차) ----
    {
      id: 'pyramid', name: '사막 피라미드', width: 1600, height: 900,
      // 한가운데 거대한 피라미드: 비탈을 타고 올라 꼭대기 평평한 곳을 차지
      solids: [{ x: 180, y: 700, w: 1240, h: 80 }, { x: 720, y: 500, w: 160, h: 200 }],
      slopes: [{ x1: 520, y1: 700, x2: 720, y2: 500 }, { x1: 880, y1: 500, x2: 1080, y2: 700 }],
      platforms: [{ x: 250, y: 560, w: 170 }, { x: 1180, y: 560, w: 170 }, { x: 400, y: 420, w: 150 }, { x: 1050, y: 420, w: 150 }, { x: 730, y: 330, w: 140 }, { x: 560, y: 250, w: 120 }, { x: 920, y: 250, w: 120 }],
      spawns: [{ x: 280, y: 700 }, { x: 1320, y: 700 }, { x: 800, y: 500 }, { x: 440, y: 700 }, { x: 1160, y: 700 }, { x: 335, y: 560 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#0e0c2a', '#3a2a6a', '#e8906a'], hill: '#2a1f4a', grass: '#e8c27a', grassHi: '#fff0c0', dirt: '#b8874a', plat: '#d8a860', platHi: '#ffe8b8', orb: 'rgba(255,230,190,', stars: true },
    },
    {
      id: 'bridge', name: '끊어진 다리', width: 1600, height: 900,
      // 두 절벽 사이에 군데군데 끊어진 나무다리. 틈으로 떨어지면 아래 작은 바위뿐
      solids: [{ x: 160, y: 620, w: 340, h: 220 }, { x: 1100, y: 620, w: 340, h: 220 }, { x: 745, y: 790, w: 110, h: 70 }],
      platforms: [{ x: 510, y: 620, w: 160 }, { x: 720, y: 620, w: 160 }, { x: 930, y: 620, w: 160 }, { x: 600, y: 470, w: 130 }, { x: 870, y: 470, w: 130 }, { x: 230, y: 470, w: 160 }, { x: 1210, y: 470, w: 160 }, { x: 735, y: 330, w: 130 }],
      spawns: [{ x: 260, y: 620 }, { x: 1340, y: 620 }, { x: 800, y: 620 }, { x: 420, y: 620 }, { x: 1180, y: 620 }, { x: 590, y: 620 }],
      respawn: { x: 800, y: 150 },
      theme: { sky: ['#2a1420', '#8a3a3a', '#ffb070'], hill: '#4a2228', grass: '#8a6a4a', grassHi: '#c8a070', dirt: '#5a3a2a', plat: '#a8784a', platHi: '#e0b080', orb: 'rgba(255,200,150,', stars: false },
    },
    {
      id: 'rooftop', name: '빌딩 옥상', width: 1600, height: 900,
      // 높이가 다른 빌딩 옥상을 뛰어다니는 밤의 도시. 빌딩 사이 틈 조심
      solids: [{ x: 170, y: 620, w: 270, h: 300 }, { x: 520, y: 540, w: 220, h: 380 }, { x: 820, y: 680, w: 230, h: 240 }, { x: 1130, y: 590, w: 300, h: 330 }],
      platforms: [{ x: 250, y: 460, w: 150 }, { x: 560, y: 400, w: 140 }, { x: 860, y: 520, w: 150 }, { x: 880, y: 360, w: 130 }, { x: 1200, y: 440, w: 160 }, { x: 700, y: 250, w: 140 }],
      spawns: [{ x: 300, y: 620 }, { x: 1280, y: 590 }, { x: 630, y: 540 }, { x: 935, y: 680 }, { x: 1380, y: 590 }, { x: 220, y: 620 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#05060f', '#141a3a', '#3a3a6a'], hill: '#0c1028', grass: '#5a6070', grassHi: '#8a90a0', dirt: '#2a2e3e', plat: '#ff5fa2', platHi: '#ffb0d0', orb: 'rgba(255,230,140,', stars: true },
    },
    {
      id: 'crater', name: '달 운석 구덩이', width: 1600, height: 900,
      // 달 표면에 파인 큰 운석 구덩이: 비탈을 타고 굴러 내려가 바닥에서 맞붙기
      solids: [{ x: 190, y: 600, w: 320, h: 260 }, { x: 1090, y: 600, w: 320, h: 260 }, { x: 670, y: 760, w: 260, h: 100 }],
      slopes: [{ x1: 510, y1: 600, x2: 670, y2: 760 }, { x1: 930, y1: 760, x2: 1090, y2: 600 }],
      platforms: [{ x: 690, y: 560, w: 220 }, { x: 520, y: 430, w: 140 }, { x: 940, y: 430, w: 140 }, { x: 270, y: 450, w: 150 }, { x: 1180, y: 450, w: 150 }, { x: 730, y: 300, w: 140 }],
      spawns: [{ x: 300, y: 600 }, { x: 1300, y: 600 }, { x: 800, y: 760 }, { x: 440, y: 600 }, { x: 1160, y: 600 }, { x: 800, y: 560 }],
      respawn: { x: 800, y: 150 },
      theme: { sky: ['#000004', '#0a0a1e', '#1e2040'], hill: '#20222e', grass: '#c8c8d0', grassHi: '#f0f0f6', dirt: '#6a6a78', plat: '#9aa0b8', platHi: '#e0e4f0', orb: 'rgba(230,235,255,', stars: true },
    },
    {
      id: 'archipelago', name: '열대 군도', width: 1600, height: 900,
      // 바다 위 높이가 다른 작은 섬 다섯 개. 가운데 섬에는 트램펄린
      solids: [{ x: 170, y: 640, w: 200, h: 70 }, { x: 450, y: 700, w: 210, h: 70 }, { x: 720, y: 620, w: 160, h: 70 }, { x: 940, y: 700, w: 210, h: 70 }, { x: 1230, y: 640, w: 200, h: 70 }],
      tramps: [{ x: 765, y: 620, w: 70, power: 1300 }],
      platforms: [{ x: 300, y: 500, w: 140 }, { x: 1160, y: 500, w: 140 }, { x: 560, y: 470, w: 130 }, { x: 910, y: 470, w: 130 }, { x: 730, y: 330, w: 140 }, { x: 420, y: 330, w: 120 }, { x: 1060, y: 330, w: 120 }],
      spawns: [{ x: 270, y: 640 }, { x: 1330, y: 640 }, { x: 555, y: 700 }, { x: 1045, y: 700 }, { x: 370, y: 500 }, { x: 1230, y: 500 }],
      respawn: { x: 800, y: 150 },
      theme: { sky: ['#0a5a8a', '#3ab0d8', '#bff0ff'], hill: '#1a7a6a', grass: '#5ad06a', grassHi: '#a8f0a0', dirt: '#e8d090', plat: '#f0d898', platHi: '#fff4d0', orb: 'rgba(255,255,230,', stars: false, water: '#1a7ab8' },
    },
    // ---- 큰 맵 5개 (3차) ----
    {
      id: 'pirate', name: '해적선', width: 1600, height: 900,
      // 바다 위 해적선: 앞뒤로 솟은 뱃머리·고물(비탈), 돛대 꼭대기 망대까지 올라가 싸움
      solids: [{ x: 420, y: 640, w: 760, h: 120 }, { x: 260, y: 540, w: 160, h: 220 }, { x: 1180, y: 540, w: 160, h: 220 }],
      slopes: [{ x1: 420, y1: 540, x2: 540, y2: 640 }, { x1: 1060, y1: 640, x2: 1180, y2: 540 }],
      trunks: [{ x: 785, y: 260, w: 30, h: 380 }],
      platforms: [{ x: 700, y: 520, w: 200 }, { x: 720, y: 390, w: 160 }, { x: 740, y: 260, w: 120 }, { x: 470, y: 420, w: 140 }, { x: 990, y: 420, w: 140 }, { x: 280, y: 400, w: 120 }, { x: 1200, y: 400, w: 120 }],
      spawns: [{ x: 340, y: 540 }, { x: 1260, y: 540 }, { x: 650, y: 640 }, { x: 950, y: 640 }, { x: 800, y: 520 }, { x: 800, y: 390 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#0a2a4a', '#2a6a9a', '#f0c890'], hill: '#1a4a6a', grass: '#a8743a', grassHi: '#d8a868', dirt: '#5a3a1e', plat: '#c89a5a', platHi: '#f0d0a0', orb: 'rgba(255,240,200,', stars: false, water: '#0f4f7a' },
    },
    {
      id: 'colosseum', name: '콜로세움', width: 1600, height: 900,
      // 양쪽 계단식 관중석이 가운데 경기장으로 내려감. 위로 올라갈수록 높은 자리
      solids: [{ x: 560, y: 720, w: 480, h: 120 }, { x: 440, y: 650, w: 120, h: 190 }, { x: 320, y: 580, w: 120, h: 260 }, { x: 200, y: 510, w: 120, h: 330 },
        { x: 1040, y: 650, w: 120, h: 190 }, { x: 1160, y: 580, w: 120, h: 260 }, { x: 1280, y: 510, w: 120, h: 330 }],
      platforms: [{ x: 690, y: 580, w: 220 }, { x: 600, y: 440, w: 140 }, { x: 860, y: 440, w: 140 }, { x: 730, y: 300, w: 140 }, { x: 220, y: 360, w: 140 }, { x: 1240, y: 360, w: 140 }],
      spawns: [{ x: 260, y: 510 }, { x: 1340, y: 510 }, { x: 700, y: 720 }, { x: 900, y: 720 }, { x: 380, y: 580 }, { x: 1220, y: 580 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#3a1a0a', '#a85a2a', '#ffd8a0'], hill: '#8a4a2a', grass: '#e8d0a0', grassHi: '#fff0d0', dirt: '#b89068', plat: '#d8b888', platHi: '#fff0d8', orb: 'rgba(255,230,190,', stars: false },
    },
    {
      id: 'clocktower', name: '시계탑', width: 1600, height: 900,
      // 한가운데 높은 시계탑(벽): 돌아가거나 발판을 타고 넘어가야 함. 양옆 낮은 지붕
      solids: [{ x: 200, y: 680, w: 1200, h: 80 }, { x: 735, y: 400, w: 130, h: 280 }],
      platforms: [{ x: 560, y: 560, w: 140 }, { x: 900, y: 560, w: 140 }, { x: 600, y: 420, w: 110 }, { x: 890, y: 420, w: 110 }, { x: 720, y: 280, w: 160 }, { x: 300, y: 520, w: 160 }, { x: 1140, y: 520, w: 160 }, { x: 380, y: 380, w: 130 }, { x: 1090, y: 380, w: 130 }],
      spawns: [{ x: 300, y: 680 }, { x: 1300, y: 680 }, { x: 800, y: 400 }, { x: 500, y: 680 }, { x: 1100, y: 680 }, { x: 380, y: 520 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#140c24', '#3a2a5a', '#c87a8a'], hill: '#2a1c3c', grass: '#8a8098', grassHi: '#c8c0d8', dirt: '#4a4258', plat: '#c8a86a', platHi: '#f0dca8', orb: 'rgba(255,240,210,', stars: true },
    },
    {
      id: 'mushroom', name: '버섯 숲', width: 1600, height: 900,
      // 거대한 버섯 갓 위를 뛰어다니는 숲. 바닥은 군데군데 끊겨 있음. 가운데 큰 버섯엔 트램펄린
      solids: [{ x: 200, y: 700, w: 380, h: 80 }, { x: 1020, y: 700, w: 380, h: 80 }, { x: 700, y: 760, w: 200, h: 60 }],
      trunks: [{ x: 360, y: 520, w: 34, h: 180 }, { x: 1206, y: 520, w: 34, h: 180 }, { x: 783, y: 470, w: 34, h: 290 }, { x: 560, y: 380, w: 26, h: 320 }, { x: 1014, y: 380, w: 26, h: 320 }],
      tramps: [{ x: 760, y: 470, w: 80, power: 1400 }],
      platforms: [{ x: 290, y: 520, w: 175 }, { x: 1135, y: 520, w: 175 }, { x: 500, y: 380, w: 145 }, { x: 955, y: 380, w: 145 }, { x: 700, y: 470, w: 200 }, { x: 730, y: 250, w: 140 }, { x: 280, y: 330, w: 120 }, { x: 1200, y: 330, w: 120 }],
      spawns: [{ x: 280, y: 700 }, { x: 1320, y: 700 }, { x: 800, y: 760 }, { x: 480, y: 700 }, { x: 1120, y: 700 }, { x: 377, y: 520 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#0e2a1e', '#2a6a4a', '#c8e8a0'], hill: '#1a4a32', grass: '#6ac85a', grassHi: '#a8f0a0', dirt: '#5a3a24', plat: '#e8463a', platHi: '#ffd0c8', orb: 'rgba(230,255,220,', stars: false },
    },
    {
      id: 'pinball', name: '핀볼', width: 1600, height: 900,
      // 핀볼 기계 안: 크고 작은 트램펄린이 여기저기 → 튕겨 다니며 싸움. 양쪽은 높은 벽
      solids: [{ x: 260, y: 700, w: 300, h: 80 }, { x: 1040, y: 700, w: 300, h: 80 }, { x: 180, y: 300, w: 40, h: 480 }, { x: 1380, y: 300, w: 40, h: 480 }],
      tramps: [{ x: 640, y: 780, w: 320, power: 1650 }, { x: 330, y: 700, w: 70, power: 1250 }, { x: 1200, y: 700, w: 70, power: 1250 }, { x: 560, y: 470, w: 70, power: 1100 }, { x: 970, y: 470, w: 70, power: 1100 }],
      platforms: [{ x: 700, y: 560, w: 200 }, { x: 540, y: 470, w: 110 }, { x: 950, y: 470, w: 110 }, { x: 730, y: 330, w: 140 }, { x: 260, y: 470, w: 140 }, { x: 1200, y: 470, w: 140 }, { x: 420, y: 260, w: 120 }, { x: 1060, y: 260, w: 120 }],
      spawns: [{ x: 450, y: 700 }, { x: 1150, y: 700 }, { x: 800, y: 560 }, { x: 300, y: 700 }, { x: 1300, y: 700 }, { x: 800, y: 330 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#1a0a2a', '#4a1a6a', '#ff5fa2'], hill: '#2a1040', grass: '#3af0ff', grassHi: '#c0fcff', dirt: '#3a2a5a', plat: '#ffe14a', platHi: '#fff6b0', orb: 'rgba(255,200,255,', stars: true },
    },
    // ---------------- 얼음 맵 (ice: true 인 땅·발판·빗면은 미끄러움: 움직이던 방향으로 쭉 밀려남) ----------------
    {
      id: 'icerink', name: '빙판 경기장', width: 1600, height: 900,
      // 바닥 전체가 빙판: 멈추기 어려워서 양쪽 끝으로 미끄러져 떨어지기 쉬움. 위 발판은 일반 땅(가운데만 얼음)
      solids: [{ x: 220, y: 690, w: 1160, h: 80, ice: true }],
      platforms: [{ x: 380, y: 540, w: 190 }, { x: 1030, y: 540, w: 190 }, { x: 700, y: 420, w: 200, ice: true }, { x: 470, y: 300, w: 150 }, { x: 980, y: 300, w: 150 }],
      spawns: [{ x: 400, y: 690 }, { x: 1200, y: 690 }, { x: 800, y: 420 }, { x: 600, y: 690 }, { x: 1000, y: 690 }, { x: 475, y: 540 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#0a1e3a', '#2a5a8a', '#a8d8f0'], hill: '#1a3a5a', grass: '#e8f8ff', grassHi: '#ffffff', dirt: '#5a88a8', plat: '#d8f0ff', platHi: '#ffffff', orb: 'rgba(220,245,255,', stars: true, snow: true },
    },
    {
      id: 'iceberg', name: '떠다니는 빙산', width: 1600, height: 900,
      // 양쪽 빙산은 미끄럽고, 가운데 낮은 섬만 단단한 땅. 작은 얼음 발판을 건너 싸움
      solids: [{ x: 200, y: 660, w: 280, h: 70, ice: true }, { x: 660, y: 720, w: 280, h: 70 }, { x: 1120, y: 660, w: 280, h: 70, ice: true }],
      platforms: [{ x: 500, y: 570, w: 130, ice: true }, { x: 970, y: 570, w: 130, ice: true }, { x: 720, y: 460, w: 160 }, { x: 260, y: 500, w: 160 }, { x: 1180, y: 500, w: 160 }, { x: 740, y: 310, w: 120, ice: true }],
      spawns: [{ x: 340, y: 660 }, { x: 1260, y: 660 }, { x: 800, y: 720 }, { x: 720, y: 720 }, { x: 880, y: 720 }, { x: 800, y: 460 }],
      respawn: { x: 800, y: 140 },
      theme: { sky: ['#04182c', '#14507a', '#6cc0e8'], hill: '#0c3050', grass: '#eafaff', grassHi: '#ffffff', dirt: '#4a8ab0', plat: '#c0ecff', platHi: '#ffffff', orb: 'rgba(200,240,255,', stars: false, water: '#0f4f78', snow: true },
    },
    {
      id: 'iceslide', name: '얼음 미끄럼틀', width: 1600, height: 900,
      // 양쪽 높은 언덕에서 가운데로 얼음 비탈: 내려오면 쭉 미끄러져 가운데를 지나 반대편까지
      solids: [{ x: 180, y: 520, w: 240, h: 260 }, { x: 620, y: 720, w: 360, h: 60, ice: true }, { x: 1180, y: 520, w: 240, h: 260 }],
      slopes: [{ x1: 420, y1: 520, x2: 620, y2: 720, ice: true }, { x1: 980, y1: 720, x2: 1180, y2: 520, ice: true }],
      platforms: [{ x: 240, y: 390, w: 150 }, { x: 1210, y: 390, w: 150 }, { x: 720, y: 560, w: 160 }, { x: 520, y: 420, w: 130 }, { x: 950, y: 420, w: 130 }, { x: 735, y: 290, w: 130 }],
      spawns: [{ x: 300, y: 520 }, { x: 1300, y: 520 }, { x: 800, y: 720 }, { x: 700, y: 720 }, { x: 900, y: 720 }, { x: 800, y: 560 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#14244a', '#4a6aa8', '#d0e4f8'], hill: '#2a3e68', grass: '#f4f8ff', grassHi: '#ffffff', dirt: '#6a7c9a', plat: '#cfe6fa', platHi: '#ffffff', orb: 'rgba(240,248,255,', stars: false, snow: true },
    },
    {
      id: 'icecave', name: '얼음 동굴', width: 1600, height: 900,
      // 미끄러운 동굴 바닥 + 단단한 얼음 기둥 두 개 (기둥에 부딪혀 멈출 수 있음)
      solids: [{ x: 220, y: 700, w: 1160, h: 80, ice: true }, { x: 540, y: 560, w: 50, h: 140 }, { x: 1010, y: 560, w: 50, h: 140 }],
      platforms: [{ x: 300, y: 470, w: 180 }, { x: 1120, y: 470, w: 180 }, { x: 710, y: 430, w: 180, ice: true }, { x: 520, y: 300, w: 140 }, { x: 940, y: 300, w: 140 }],
      spawns: [{ x: 380, y: 700 }, { x: 1220, y: 700 }, { x: 800, y: 700 }, { x: 565, y: 560 }, { x: 1035, y: 560 }, { x: 800, y: 430 }],
      respawn: { x: 800, y: 140 },
      theme: { sky: ['#06101e', '#14304a', '#2a5070'], hill: '#0c2236', grass: '#bfe8ff', grassHi: '#f0faff', dirt: '#3a5a78', plat: '#9fd8f5', platHi: '#e8f8ff', orb: 'rgba(160,220,255,', stars: false },
    },
    {
      id: 'snowfort', name: '눈 요새', width: 1600, height: 900,
      // 양쪽 눈 요새는 단단한 눈, 가운데 낮은 얼음 해자는 미끄러움. 해자에 빠지면 벽을 넘어 올라와야 함
      solids: [{ x: 200, y: 600, w: 300, h: 180 }, { x: 1100, y: 600, w: 300, h: 180 }, { x: 500, y: 720, w: 600, h: 60, ice: true }],
      platforms: [{ x: 250, y: 470, w: 150 }, { x: 1200, y: 470, w: 150 }, { x: 700, y: 560, w: 200, ice: true }, { x: 730, y: 390, w: 140 }, { x: 420, y: 340, w: 130 }, { x: 1050, y: 340, w: 130 }],
      spawns: [{ x: 330, y: 600 }, { x: 1270, y: 600 }, { x: 800, y: 720 }, { x: 650, y: 720 }, { x: 950, y: 720 }, { x: 800, y: 560 }],
      respawn: { x: 800, y: 130 },
      theme: { sky: ['#1a2238', '#4a5a80', '#e0e8f4'], hill: '#2a3450', grass: '#f8faff', grassHi: '#ffffff', dirt: '#8a96ac', plat: '#e4ecf8', platHi: '#ffffff', orb: 'rgba(255,255,255,', stars: false, snow: true },
    },
    // ---------------- 무너지는 발판 · 움직이는 발판 · 바람 구역 (새 기믹) ----------------
    {
      id: 'crumblestairs', name: '무너지는 계단', width: 1600, height: 900,
      // 가운데 돌계단이 밟으면 무너짐. 바닥은 튼튼해서 떨어져도 바닥으로 돌아옴
      solids: [{ x: 150, y: 740, w: 1300, h: 60 }],
      crumble: [{ x: 300, y: 620, w: 180 }, { x: 620, y: 520, w: 180 }, { x: 940, y: 620, w: 180 }],
      platforms: [{ x: 330, y: 400, w: 170 }, { x: 1100, y: 400, w: 170 }, { x: 700, y: 250, w: 200 }],
      spawns: [{ x: 230, y: 740 }, { x: 1370, y: 740 }, { x: 390, y: 620 }, { x: 1030, y: 620 }, { x: 710, y: 520 }, { x: 800, y: 250 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#2a3a4a', '#4f6a80', '#a8c0d0'], hill: '#33485a', grass: '#8fa3a8', grassHi: '#c8d6da', dirt: '#5a6470', plat: '#d4a373', platHi: '#f3d5b2', orb: 'rgba(255,240,220,', stars: false },
    },
    {
      id: 'gustcanyon', name: '바람 협곡', width: 1600, height: 900,
      // 두 절벽 사이 바람이 위·아래로 반대로 분다. 위쪽은 오른쪽, 아래쪽은 왼쪽으로 밀어냄
      solids: [{ x: 120, y: 600, w: 380, h: 140 }, { x: 1100, y: 600, w: 380, h: 140 }, { x: 640, y: 800, w: 320, h: 60 }],
      platforms: [{ x: 180, y: 420, w: 200 }, { x: 1220, y: 420, w: 200 }, { x: 700, y: 280, w: 200 }],
      gusts: [{ x: 500, y: 150, w: 600, h: 250, vx: 300 }, { x: 500, y: 480, w: 600, h: 260, vx: -300 }],
      spawns: [{ x: 240, y: 600 }, { x: 1360, y: 600 }, { x: 280, y: 420 }, { x: 1320, y: 420 }, { x: 800, y: 280 }, { x: 800, y: 800 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#1c2a38', '#3d6a8a', '#9ac8d8'], hill: '#2a4a60', grass: '#7aa88a', grassHi: '#b6d8c0', dirt: '#4a5c66', plat: '#b8d8e8', platHi: '#eef8ff', orb: 'rgba(220,245,255,', stars: false },
    },
    {
      id: 'elevator', name: '수직 승강기', width: 1600, height: 900,
      // 양쪽 승강기가 바닥과 위 발판 사이를 오르내림. 스폰은 고정 땅·발판에만
      solids: [{ x: 150, y: 740, w: 1300, h: 60 }],
      platforms: [{ x: 620, y: 440, w: 360 }, { x: 640, y: 200, w: 320 }],
      movers: [{ x: 260, y: 640, w: 180, x2: 260, y2: 300, per: 9 }, { x: 1160, y: 640, w: 180, x2: 1160, y2: 300, per: 9, ph: 4.5 }],
      spawns: [{ x: 240, y: 740 }, { x: 1360, y: 740 }, { x: 500, y: 740 }, { x: 1100, y: 740 }, { x: 800, y: 440 }, { x: 800, y: 200 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#101c3a', '#2a3f7a', '#6a84c8'], hill: '#1a2a58', grass: '#7a8ad8', grassHi: '#b0bcf0', dirt: '#3a4370', plat: '#9ab0ff', platHi: '#e0e8ff', orb: 'rgba(200,220,255,', stars: true },
    },
    {
      id: 'crumblegust', name: '흩날리는 발판', width: 1600, height: 900,
      // 무너지는 발판 위로 양쪽 바람이 가운데로 모임. 바람에 밀려 발판에서 떨어지기 쉬움
      solids: [{ x: 150, y: 740, w: 1300, h: 60 }],
      crumble: [{ x: 240, y: 610, w: 200 }, { x: 560, y: 540, w: 200 }, { x: 880, y: 610, w: 200 }, { x: 1200, y: 540, w: 200 }],
      gusts: [{ x: 150, y: 380, w: 620, h: 220, vx: 260 }, { x: 830, y: 380, w: 620, h: 220, vx: -260 }],
      platforms: [{ x: 400, y: 420, w: 160 }, { x: 1040, y: 420, w: 160 }],
      spawns: [{ x: 250, y: 740 }, { x: 1350, y: 740 }, { x: 340, y: 610 }, { x: 1300, y: 540 }, { x: 460, y: 420 }, { x: 1120, y: 420 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#3a2a4a', '#7a5a8a', '#e0b8d8'], hill: '#4a3a5a', grass: '#b8a0c8', grassHi: '#e0d0ec', dirt: '#5a4a64', plat: '#e8c0e0', platHi: '#fff0fa', orb: 'rgba(255,220,250,', stars: false },
    },
    {
      id: 'movingcrumble', name: '떠다니는 셔틀', width: 1600, height: 900,
      // 두 셔틀이 공중을 가로질러 다니고, 아래에는 무너지는 발판. 셔틀을 타고 옮겨 다니기
      solids: [{ x: 150, y: 740, w: 1300, h: 60 }],
      crumble: [{ x: 560, y: 600, w: 160 }, { x: 880, y: 600, w: 160 }],
      movers: [{ x: 160, y: 460, w: 180, x2: 1220, y2: 460, per: 14 }, { x: 1240, y: 300, w: 180, x2: 200, y2: 300, per: 14, ph: 7 }],
      platforms: [{ x: 700, y: 250, w: 200 }],
      spawns: [{ x: 250, y: 740 }, { x: 1350, y: 740 }, { x: 500, y: 740 }, { x: 640, y: 600 }, { x: 960, y: 600 }, { x: 800, y: 250 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#0e3a4a', '#2a7a8a', '#a8e0e0'], hill: '#1a5060', grass: '#66c0b0', grassHi: '#a8e8dc', dirt: '#3a6a6a', plat: '#90e0d0', platHi: '#e8fff8', orb: 'rgba(220,255,250,', stars: false },
    },
    {
      id: 'windlift', name: '돌풍 리프트', width: 1600, height: 900,
      // 가운데 위로 솟는 돌풍 기둥. 양쪽 승강기와 돌풍을 섞어 타고 올라감
      solids: [{ x: 150, y: 740, w: 1300, h: 60 }],
      platforms: [{ x: 620, y: 430, w: 360 }, { x: 660, y: 240, w: 280 }],
      movers: [{ x: 340, y: 600, w: 170, x2: 340, y2: 300, per: 10 }, { x: 1090, y: 300, w: 170, x2: 1090, y2: 600, per: 10, ph: 5 }],
      gusts: [{ x: 440, y: 200, w: 720, h: 540, vy: -380 }],
      spawns: [{ x: 240, y: 740 }, { x: 1360, y: 740 }, { x: 380, y: 740 }, { x: 1220, y: 740 }, { x: 800, y: 430 }, { x: 800, y: 240 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#1a2a3a', '#3a5a7a', '#c0d8e8'], hill: '#2a3e54', grass: '#8ab4c8', grassHi: '#c4e0ee', dirt: '#4a6070', plat: '#a8d4e8', platHi: '#f0fbff', orb: 'rgba(230,250,255,', stars: true },
    },
    {
      id: 'factory', name: '고장난 공장', width: 1600, height: 900,
      // 무너지는 발판 + 셔틀 + 바람 3종. 왼쪽 기둥은 위로 띄우고 오른쪽은 왼쪽으로 밀어냄
      solids: [{ x: 150, y: 760, w: 1300, h: 40 }],
      crumble: [{ x: 260, y: 620, w: 180 }, { x: 1160, y: 620, w: 180 }, { x: 700, y: 480, w: 200 }],
      movers: [{ x: 480, y: 540, w: 200, x2: 1000, y2: 540, per: 16 }],
      platforms: [{ x: 620, y: 300, w: 200 }, { x: 900, y: 300, w: 200 }],
      gusts: [{ x: 150, y: 250, w: 120, h: 510, vy: -260 }, { x: 1170, y: 250, w: 280, h: 510, vx: -200 }],
      spawns: [{ x: 520, y: 760 }, { x: 1000, y: 760 }, { x: 350, y: 620 }, { x: 1250, y: 620 }, { x: 790, y: 480 }, { x: 720, y: 300 }, { x: 980, y: 300 }, { x: 600, y: 760 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#2a2a1a', '#6a5a2a', '#d8b860'], hill: '#3a3420', grass: '#9a8a50', grassHi: '#c8b878', dirt: '#4a4028', plat: '#c8a040', platHi: '#fff0b0', orb: 'rgba(255,230,160,', stars: false },
    },
    {
      id: 'frostwind', name: '눈보라 빙판', width: 1600, height: 900,
      // 얼음 바닥에 오른쪽으로 부는 바람. 위쪽 셔틀 발판도 얼음 위로 미끄러짐
      solids: [{ x: 150, y: 740, w: 1300, h: 60, ice: true }],
      platforms: [{ x: 300, y: 560, w: 200, ice: true }, { x: 1100, y: 560, w: 200, ice: true }, { x: 660, y: 430, w: 280 }],
      movers: [{ x: 560, y: 300, w: 200, x2: 960, y2: 300, per: 10 }],
      gusts: [{ x: 150, y: 470, w: 1300, h: 300, vx: 160 }],
      spawns: [{ x: 300, y: 740 }, { x: 1300, y: 740 }, { x: 400, y: 560 }, { x: 1200, y: 560 }, { x: 800, y: 430 }, { x: 1000, y: 740 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#0a1a30', '#2a4a78', '#9cc8ec'], hill: '#1a3050', grass: '#eaf6ff', grassHi: '#ffffff', dirt: '#5a86a8', plat: '#c8ecff', platHi: '#ffffff', orb: 'rgba(220,245,255,', stars: true, snow: true },
    },
    // ---------------- 새 기믹 + 기존 기믹 (튕기는 · 비탈 · 얼음 · 트램펄린) ----------------
    {
      id: 'bouncyruins', name: '튀는 폐허', width: 1600, height: 900,
      // 무너지는 돌다리와 트램펄린 바닥. 떨어져도 트램펄린이 다시 띄움
      solids: [{ x: 150, y: 700, w: 360, h: 100 }, { x: 1090, y: 700, w: 360, h: 100 }],
      tramps: [{ x: 510, y: 800, w: 580, power: 1800 }, { x: 200, y: 700, w: 90, power: 1300 }, { x: 1140, y: 700, w: 90, power: 1300 }],
      crumble: [{ x: 500, y: 560, w: 180 }, { x: 920, y: 560, w: 180 }],
      platforms: [{ x: 700, y: 440, w: 200 }, { x: 320, y: 430, w: 150 }, { x: 1130, y: 430, w: 150 }],
      trunks: [{ x: 180, y: 300, w: 40, h: 400 }, { x: 1380, y: 300, w: 40, h: 400 }],
      spawns: [{ x: 330, y: 700 }, { x: 1300, y: 700 }, { x: 590, y: 560 }, { x: 1010, y: 560 }, { x: 770, y: 440 }, { x: 395, y: 430 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#2a1a2a', '#6a3a4a', '#d8a078'], hill: '#4a2a34', grass: '#b08a6a', grassHi: '#dcb898', dirt: '#6a4a3a', plat: '#c89a6a', platHi: '#f4dcb8', orb: 'rgba(255,220,180,', stars: false },
    },
    {
      id: 'slidelift', name: '비탈 리프트', width: 1600, height: 900,
      // 양쪽 높은 땅에서 가운데로 내려가는 비탈. 가운데 위로 셔틀이 가로질러 감
      solids: [{ x: 120, y: 560, w: 260, h: 240 }, { x: 1220, y: 560, w: 260, h: 240 }, { x: 700, y: 740, w: 200, h: 60 }],
      slopes: [{ x1: 380, y1: 560, x2: 700, y2: 740 }, { x1: 900, y1: 740, x2: 1220, y2: 560 }],
      movers: [{ x: 520, y: 440, w: 150, x2: 1000, y2: 440, per: 12 }],
      platforms: [{ x: 340, y: 380, w: 150 }, { x: 1110, y: 380, w: 150 }, { x: 700, y: 260, w: 200 }],
      spawns: [{ x: 250, y: 560 }, { x: 1350, y: 560 }, { x: 800, y: 740 }, { x: 410, y: 380 }, { x: 1185, y: 380 }, { x: 800, y: 260 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#1a2a40', '#3a6a8a', '#e8c890'], hill: '#2a4050', grass: '#9ac070', grassHi: '#c8e4a0', dirt: '#6a5a40', plat: '#d0b080', platHi: '#fff0d0', orb: 'rgba(255,240,200,', stars: false },
    },
    {
      id: 'icetramp', name: '빙판 트램펄린', width: 1600, height: 900,
      // 얼음 바닥 사이 구덩이엔 큰 트램펄린. 얼음 발판과 트램펄린을 번갈아 밟기
      solids: [{ x: 150, y: 740, w: 420, h: 60, ice: true }, { x: 1030, y: 740, w: 420, h: 60, ice: true }],
      tramps: [{ x: 570, y: 820, w: 460, power: 1900 }],
      platforms: [{ x: 250, y: 560, w: 200, ice: true }, { x: 1150, y: 560, w: 200, ice: true }, { x: 640, y: 440, w: 320 }],
      spawns: [{ x: 300, y: 740 }, { x: 1300, y: 740 }, { x: 350, y: 560 }, { x: 1250, y: 560 }, { x: 800, y: 440 }, { x: 700, y: 440 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#0a1e3a', '#2a5a8a', '#b0e0f8'], hill: '#1a3a5a', grass: '#e8f8ff', grassHi: '#ffffff', dirt: '#5a88a8', plat: '#c0ecff', platHi: '#ffffff', orb: 'rgba(220,245,255,', stars: true, snow: true },
    },
    {
      id: 'slopepark', name: '경사 점프대', width: 1600, height: 900,
      // 비탈을 타고 내려가 튕기는 트램펄린으로 뛰어올라 발판 위 싸움
      solids: [{ x: 150, y: 700, w: 280, h: 100 }, { x: 1170, y: 700, w: 280, h: 100 }, { x: 620, y: 760, w: 360, h: 40 }],
      slopes: [{ x1: 430, y1: 700, x2: 620, y2: 760 }, { x1: 980, y1: 760, x2: 1170, y2: 700 }],
      tramps: [{ x: 200, y: 700, w: 110, power: 1500 }, { x: 1290, y: 700, w: 110, power: 1500 }],
      platforms: [{ x: 480, y: 520, w: 180 }, { x: 940, y: 520, w: 180 }, { x: 700, y: 380, w: 200 }],
      trunks: [{ x: 790, y: 200, w: 30, h: 300 }],
      spawns: [{ x: 330, y: 700 }, { x: 1230, y: 700 }, { x: 800, y: 760 }, { x: 570, y: 520 }, { x: 1030, y: 520 }, { x: 800, y: 380 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#1a3a2a', '#3a7a5a', '#f0d890'], hill: '#2a5040', grass: '#90d060', grassHi: '#c4ee90', dirt: '#6a5a30', plat: '#f0c060', platHi: '#fff4c8', orb: 'rgba(255,240,180,', stars: false },
    },
    {
      id: 'snowcrumble', name: '눈 무너지는 언덕', width: 1600, height: 900,
      // 눈 덮인 언덕 가운데는 미끄러운 얼음 바닥, 가운데 공중 발판은 무너짐
      solids: [{ x: 120, y: 600, w: 300, h: 160 }, { x: 1180, y: 600, w: 300, h: 160 }, { x: 560, y: 760, w: 480, h: 40, ice: true }],
      slopes: [{ x1: 420, y1: 600, x2: 560, y2: 760 }, { x1: 1040, y1: 760, x2: 1180, y2: 600 }],
      crumble: [{ x: 640, y: 600, w: 140 }, { x: 830, y: 600, w: 140 }],
      platforms: [{ x: 200, y: 440, w: 200 }, { x: 1200, y: 440, w: 200 }, { x: 700, y: 420, w: 200 }],
      spawns: [{ x: 270, y: 600 }, { x: 1330, y: 600 }, { x: 700, y: 760 }, { x: 700, y: 600 }, { x: 900, y: 600 }, { x: 800, y: 420 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#1a2238', '#4a5a80', '#e0e8f4'], hill: '#2a3450', grass: '#f8faff', grassHi: '#ffffff', dirt: '#8a96ac', plat: '#e4ecf8', platHi: '#ffffff', orb: 'rgba(255,255,255,', stars: false, snow: true },
    },
    {
      id: 'icewheel', name: '얼음 풍차 언덕', width: 1600, height: 900,
      // 얼음 땅 사이 구덩이엔 트램펄린과 위로 솟는 바람. 옆 바람에 밀리며 발판으로 올라감
      solids: [{ x: 150, y: 720, w: 520, h: 80, ice: true }, { x: 930, y: 720, w: 520, h: 80, ice: true }],
      tramps: [{ x: 670, y: 820, w: 260, power: 2000 }],
      platforms: [{ x: 200, y: 520, w: 180 }, { x: 1220, y: 520, w: 180 }, { x: 680, y: 460, w: 240 }],
      gusts: [{ x: 670, y: 150, w: 260, h: 570, vy: -350 }, { x: 150, y: 420, w: 500, h: 200, vx: 200 }],
      spawns: [{ x: 300, y: 720 }, { x: 1300, y: 720 }, { x: 290, y: 520 }, { x: 1310, y: 520 }, { x: 800, y: 460 }, { x: 560, y: 720 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#0c1a34', '#2a5078', '#90c8e8'], hill: '#1c3a58', grass: '#dff4ff', grassHi: '#ffffff', dirt: '#4a7a9a', plat: '#b8e4ff', platHi: '#ffffff', orb: 'rgba(200,240,255,', stars: true, snow: true },
    },
    // ---------------- 기믹 대잔치 (새 기믹 + 기존 기믹 전부) ----------------
    {
      id: 'ultimate', name: '기믹 대잔치', width: 1600, height: 900,
      // 무너지는 발판, 셔틀, 바람, 비탈, 얼음, 트램펄린이 다 모인 맵
      solids: [{ x: 120, y: 740, w: 360, h: 60 }, { x: 1120, y: 740, w: 360, h: 60, ice: true }, { x: 620, y: 620, w: 360, h: 180 }],
      slopes: [{ x1: 480, y1: 740, x2: 620, y2: 620 }, { x1: 980, y1: 620, x2: 1120, y2: 740 }],
      tramps: [{ x: 700, y: 620, w: 80, power: 1500 }, { x: 880, y: 620, w: 80, power: 1500 }],
      movers: [{ x: 200, y: 520, w: 160, x2: 520, y2: 520, per: 10 }, { x: 1240, y: 360, w: 160, x2: 1240, y2: 600, per: 9, ph: 2 }],
      crumble: [{ x: 720, y: 420, w: 160 }, { x: 920, y: 420, w: 160 }],
      platforms: [{ x: 700, y: 260, w: 200 }],
      gusts: [{ x: 300, y: 200, w: 500, h: 300, vx: 220 }, { x: 1000, y: 150, w: 320, h: 440, vy: -300 }],
      spawns: [{ x: 250, y: 740 }, { x: 1300, y: 740 }, { x: 800, y: 620 }, { x: 740, y: 420 }, { x: 1000, y: 420 }, { x: 800, y: 260 }],
      respawn: { x: 800, y: 120 },
      theme: { sky: ['#1a0e2e', '#4a2a6a', '#f08aa8'], hill: '#2e1a40', grass: '#c0a0e0', grassHi: '#e8d4ff', dirt: '#4a3a5a', plat: '#f8b0d0', platHi: '#fff0f8', orb: 'rgba(255,200,230,', stars: true },
    },
  ];
  // 계산해 두는 값 (봇·분신이 땅 끝을 알기 위해)
  for (const m of MAPS) {
    m.width = m.width || 1280; m.height = m.height || 720; m.slopes = m.slopes || []; m.tramps = m.tramps || [];
    m.crumble = m.crumble || []; m.movers = m.movers || []; m.gusts = m.gusts || [];
    m.zoom = 1280 / m.width;
    m.icy = [...m.solids, ...m.platforms, ...m.slopes].some((q) => q.ice);   // 얼음이 있는 맵: 얼음 아닌 땅도 살짝 미끄러움
    // 크기 등급: 실제 땅·발판이 펼쳐진 가로 폭으로 소(S) · 중(M) · 대(L). 맵에 size를 직접 적으면 그걸 씀
    if (!m.size) {
      const xs = [...m.solids, ...m.platforms].flatMap((q) => [q.x, q.x + q.w]).concat(m.slopes.flatMap((q) => [q.x1, q.x2]));
      const span = Math.max(...xs) - Math.min(...xs);
      m.size = span < 1100 ? 'S' : span <= 1220 ? 'M' : 'L';
    }
    // 빗면 높은 쪽 끝이 다른 빗면·땅과 이어져 있지 않으면 절벽(벽)으로 취급
    const joined = (sl, x, y) => m.slopes.some((o) => o !== sl && ((o.x1 === x && o.y1 === y) || (o.x2 === x && o.y2 === y))) || m.solids.some((s) => s.y === y && s.x <= x && s.x + s.w >= x);
    for (const sl of m.slopes) { sl.wallL = sl.y1 < sl.y2 && !joined(sl, sl.x1, sl.y1); sl.wallR = sl.y2 < sl.y1 && !joined(sl, sl.x2, sl.y2); }   // 큰 맵은 화면에 맞게 작게 그림
    const pad = m.width > 1280 ? 320 : 260;
    m.blast = { left: -pad, right: m.width + pad, top: -(m.height * 0.72), bottom: m.height + pad };
    m.left = Math.min(...m.solids.map((s) => s.x), ...m.platforms.map((p) => p.x), ...m.slopes.map((s) => s.x1), ...m.tramps.map((t) => t.x));
    m.right = Math.max(...m.solids.map((s) => s.x + s.w), ...m.platforms.map((p) => p.x + p.w), ...m.slopes.map((s) => s.x2), ...m.tramps.map((t) => t.x + t.w));
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
