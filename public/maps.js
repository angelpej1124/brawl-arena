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
      solids: [{ x: 200, y: 700, w: 1200, h: 80 }, { x: 430, y: 430, w: 46, h: 270 }, { x: 1124, y: 430, w: 46, h: 270 }],
      platforms: [{ x: 320, y: 430, w: 270 }, { x: 1010, y: 430, w: 270 }, { x: 650, y: 540, w: 300 }, { x: 700, y: 310, w: 200 }, { x: 240, y: 260, w: 150 }, { x: 1210, y: 260, w: 150 }, { x: 720, y: 160, w: 160 }],
      spawns: [{ x: 300, y: 700 }, { x: 1300, y: 700 }, { x: 800, y: 700 }, { x: 455, y: 430 }, { x: 1145, y: 430 }, { x: 800, y: 540 }],
      respawn: { x: 800, y: 100 },
      theme: { sky: ['#0f2a14', '#1f5a2a', '#7ab85a'], hill: '#1a4a22', grass: '#4caf3c', grassHi: '#8be06a', dirt: '#5a3a1a', plat: '#6fd65a', platHi: '#c8f5b0', orb: 'rgba(230,255,180,', stars: false },
    },
  ];
  // 계산해 두는 값 (봇·분신이 땅 끝을 알기 위해)
  for (const m of MAPS) {
    m.width = m.width || 1280; m.height = m.height || 720; m.slopes = m.slopes || []; m.tramps = m.tramps || [];
    m.zoom = 1280 / m.width;
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
