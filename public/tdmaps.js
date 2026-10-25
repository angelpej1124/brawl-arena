// =====================================================================
//  입체 모드(위에서 내려다보기) 맵 — 서버(판정)와 브라우저(그리기)가 같이 씀
//  월드 크기 1600 x 900. 바닥 밖으로 나가면(점프·비행 중이 아니면) 떨어져서 장외.
//   floors : 바닥 { x, y, w, h } 네모 또는 { cx, cy, r } 동그라미
//   holes  : 바닥에 뚫린 구멍 (floors보다 우선)
//   tops   : 구멍 위에 놓인 섬·다리 (holes보다 우선)
//   walls  : 지나갈 수 없는 기둥·벽 (네모 또는 동그라미) — 투사체도 막힘
//   spawns : 시작 위치, respawn: 장외 후 다시 나타나는 위치
// =====================================================================
(function (root) {
  const R = (x, y, w, h) => ({ x, y, w, h });
  const C = (cx, cy, r) => ({ cx, cy, r });
  const TD_MAPS = [
    {
      id: 'td_round', name: '둥근 섬',
      floors: [C(800, 460, 400)],
      spawns: [{ x: 560, y: 460 }, { x: 1040, y: 460 }, { x: 800, y: 260 }, { x: 800, y: 660 }, { x: 640, y: 320 }, { x: 960, y: 600 }],
      theme: { void: '#0c1830', top: '#6fd65a', top2: '#5cc84a', side: '#6a4a2a', wall: '#8a8f9a', line: '#3f9a3a' },
    },
    {
      id: 'td_ring', name: '도넛 섬',
      floors: [C(800, 460, 410)], holes: [C(800, 460, 140)],
      spawns: [{ x: 520, y: 460 }, { x: 1080, y: 460 }, { x: 800, y: 210 }, { x: 800, y: 710 }, { x: 600, y: 270 }, { x: 1000, y: 650 }],
      theme: { void: '#1a0c2a', top: '#d8b878', top2: '#c8a868', side: '#7a5a3a', wall: '#8a8f9a', line: '#a8885a' },
    },
    {
      id: 'td_pillars', name: '기둥 광장',
      floors: [R(240, 110, 1120, 700)],
      walls: [C(520, 320, 46), C(1080, 320, 46), C(520, 600, 46), C(1080, 600, 46), C(800, 460, 60)],
      spawns: [{ x: 360, y: 460 }, { x: 1240, y: 460 }, { x: 800, y: 200 }, { x: 800, y: 720 }, { x: 360, y: 200 }, { x: 1240, y: 720 }],
      theme: { void: '#101018', top: '#c8c4d8', top2: '#b8b4c8', side: '#5a5668', wall: '#e8e0c8', line: '#9a96aa' },
    },
    {
      id: 'td_bridges', name: '다리로 이은 섬',
      floors: [C(330, 460, 200), C(1270, 460, 200), C(800, 460, 170), R(520, 435, 120, 50), R(960, 435, 120, 50), C(800, 160, 110), C(800, 760, 110), R(778, 260, 44, 60), R(778, 620, 44, 60)],
      spawns: [{ x: 330, y: 460 }, { x: 1270, y: 460 }, { x: 800, y: 160 }, { x: 800, y: 760 }, { x: 800, y: 460 }, { x: 280, y: 400 }],
      theme: { void: '#06304a', top: '#5ad06a', top2: '#4ac05a', side: '#8a6a3a', wall: '#8a8f9a', line: '#3a9a4a', water: true },
    },
    {
      id: 'td_cross', name: '십자 광장',
      floors: [R(650, 70, 300, 780), R(260, 320, 1080, 280)],
      walls: [R(770, 430, 60, 60)],
      spawns: [{ x: 380, y: 460 }, { x: 1220, y: 460 }, { x: 800, y: 150 }, { x: 800, y: 780 }, { x: 700, y: 380 }, { x: 900, y: 540 }],
      theme: { void: '#2a0c10', top: '#e8a868', top2: '#d89858', side: '#7a3a2a', wall: '#5a3a3a', line: '#b8784a' },
    },
    {
      id: 'td_checker', name: '징검다리',
      floors: (() => { const f = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) f.push(R(230 + c * 236, 150 + r * 236, 196, 196)); return f; })(),
      spawns: [{ x: 328, y: 248 }, { x: 1272, y: 720 }, { x: 800, y: 484 }, { x: 328, y: 720 }, { x: 1272, y: 248 }, { x: 564, y: 484 }],
      theme: { void: '#081a1a', top: '#7ae0d0', top2: '#5ac8b8', side: '#2a6a6a', wall: '#8a8f9a', line: '#3aa898' },
    },
    {
      id: 'td_long', name: '긴 다리',
      floors: [R(130, 400, 1340, 120), R(640, 140, 320, 150), R(640, 630, 320, 150), R(775, 290, 50, 110), R(775, 520, 50, 110)],
      spawns: [{ x: 220, y: 460 }, { x: 1380, y: 460 }, { x: 800, y: 210 }, { x: 800, y: 700 }, { x: 600, y: 460 }, { x: 1000, y: 460 }],
      theme: { void: '#140a20', top: '#a8784a', top2: '#986838', side: '#5a3a1e', wall: '#8a8f9a', line: '#7a5430' },
    },
    {
      id: 'td_flower', name: '꽃 섬',
      floors: [C(800, 460, 190), ...[0, 1, 2, 3, 4, 5].map((i) => C(800 + Math.cos(i * Math.PI / 3) * 300, 460 + Math.sin(i * Math.PI / 3) * 260, 130))],
      spawns: [{ x: 800, y: 460 }, { x: 1100, y: 460 }, { x: 500, y: 460 }, { x: 950, y: 235 }, { x: 650, y: 685 }, { x: 650, y: 235 }],
      theme: { void: '#2a1030', top: '#ff9ec8', top2: '#ff8ab8', side: '#8a3a6a', wall: '#8a8f9a', line: '#e86aa0' },
    },
    {
      id: 'td_maze', name: '미로 정원',
      floors: [R(200, 100, 1200, 720)],
      walls: [R(420, 100, 40, 260), R(420, 520, 40, 300), R(780, 260, 40, 400), R(1140, 100, 40, 300), R(1140, 560, 40, 260), R(560, 440, 200, 40), R(840, 440, 200, 40)],
      spawns: [{ x: 300, y: 200 }, { x: 1300, y: 720 }, { x: 300, y: 720 }, { x: 1300, y: 200 }, { x: 620, y: 300 }, { x: 980, y: 620 }],
      theme: { void: '#0a1a0a', top: '#4caf3c', top2: '#3f9a3a', side: '#3a2a1a', wall: '#2a6a2a', line: '#3a8a30' },
    },
    {
      id: 'td_moat', name: '해자 성',
      floors: [R(150, 80, 1300, 760)], holes: [R(440, 270, 720, 380)],
      tops: [R(610, 390, 380, 140), R(775, 270, 50, 120), R(775, 530, 50, 120)],
      walls: [C(800, 460, 34)],
      spawns: [{ x: 280, y: 460 }, { x: 1320, y: 460 }, { x: 800, y: 170 }, { x: 800, y: 750 }, { x: 680, y: 460 }, { x: 920, y: 460 }],
      theme: { void: '#0a2440', top: '#b8b0a0', top2: '#a8a090', side: '#5a5448', wall: '#6a6458', line: '#8a8070', water: true },
    },
  ];
  const inShape = (s, x, y, pad = 0) => (s.r != null ? Math.hypot(x - s.cx, y - s.cy) <= s.r + pad : x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad);
  // 발 위치(x,y)가 바닥 위인지
  function onFloor(m, x, y) {
    if ((m.tops || []).some((s) => inShape(s, x, y))) return true;
    if ((m.holes || []).some((s) => inShape(s, x, y))) return false;
    return m.floors.some((s) => inShape(s, x, y));
  }
  // 반지름 r 원이 벽과 겹치면 밀어낼 위치를 돌려줌 (안 겹치면 null)
  function pushOut(m, x, y, r) {
    for (const w of m.walls || []) {
      if (w.r != null) {
        const dx = x - w.cx, dy = y - w.cy, d = Math.hypot(dx, dy);
        if (d < w.r + r) { const k = d < 0.01 ? 1 : d; return { x: w.cx + (dx / k) * (w.r + r), y: w.cy + (dy / k) * (w.r + r) }; }
      } else {
        const nx = Math.max(w.x, Math.min(x, w.x + w.w)), ny = Math.max(w.y, Math.min(y, w.y + w.h));
        const dx = x - nx, dy = y - ny, d = Math.hypot(dx, dy);
        if (d < r) {
          if (d > 0.01) return { x: nx + (dx / d) * r, y: ny + (dy / d) * r };
          // 안에 박힘: 가장 가까운 변으로
          const l = x - w.x, rr = w.x + w.w - x, t = y - w.y, b = w.y + w.h - y, mn = Math.min(l, rr, t, b);
          return mn === l ? { x: w.x - r, y } : mn === rr ? { x: w.x + w.w + r, y } : mn === t ? { x, y: w.y - r } : { x, y: w.y + w.h + r };
        }
      }
    }
    return null;
  }
  const inWall = (m, x, y) => (m.walls || []).some((w) => inShape(w, x, y));
  for (const m of TD_MAPS) {
    m.td = true; m.width = 1600; m.height = 900; m.zoom = 0.7; m.camX = (1280 - 1600 * 0.7) / 2;   // 아래 점수판에 안 가리게 조금 작게, 가운데로
    m.holes = m.holes || []; m.tops = m.tops || []; m.walls = m.walls || [];
    // 옆 모드 코드가 쓰는 값들 (빈 것으로)
    m.solids = []; m.platforms = []; m.slopes = []; m.tramps = []; m.trunks = [];
    m.respawn = m.respawn || { x: 800, y: 460 };
    m.blast = { left: -300, right: 1900, top: -300, bottom: 1200 };
    m.left = 0; m.right = 1600; m.floor = 900;
  }
  // 입체 모드에서 이미 쓸 수 있는 스킬 (나머지는 '준비 중' — 차례로 늘어남)
  const TD_SKILLS = ['slow', 'blink', 'stealth', 'swap', 'explode', 'freeze', 'rock', 'magnet', 'empower', 'parasite', 'quake', 'giant', 'rubber', 'engine',
    'blackflash', 'lightning', 'undying', 'hulk', 'fire', 'ice', 'error', 'sun', 'time', 'combo', 'reflect', 'invert', 'atom', 'gamble', 'ghost',
    'portal', 'charge', 'hop', 'gem', 'wave', 'flash'];
  const api = { TD_MAPS, TD_SKILLS, onFloor, pushOut, inWall, inShape };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BRAWL_TDMAPS = api;
})(this);
