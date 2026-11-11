// =====================================================================
//  난투 아레나 — 브라우저 화면 (서버가 판정, 여기서는 그리기와 입력만)
// =====================================================================
(() => {
'use strict';
const CONFIG = {
  TICK_RATE: 60, SEND_EVERY: 2, MAX_PLAYERS: 6, STOCKS: 3,
  COUNTDOWN: 3, RESULT_TIME: 5, RESPAWN_INVINCIBLE: 2,
  GRAVITY: 2300, MAX_FALL: 1300, RUN_SPEED: 400, GROUND_ACCEL: 4200, AIR_ACCEL: 1800,
  JUMP_SPEED: 860, DOUBLE_JUMP_SPEED: 760, EXTRA_JUMPS: 1, PLAYER_W: 40, PLAYER_H: 60,
};
const ATTACKS = {
  light: { startup: 0.06, active: 0.10, total: 0.28, reach: 58, height: 40, damage: 6,  baseKB: 280, growthKB: 9,  lift: 0.45 },
  heavy: { startup: 0.24, active: 0.10, total: 0.62, reach: 72, height: 50, damage: 13, baseKB: 420, growthKB: 15, lift: 0.65 },
};
// 스킬 정보 (실제 판정은 서버의 game.js가 함)
const SKILLS = {
  slow:     { name: '둔화', desc: '넓은 범위의 적 이동·공격 속도를 7초간 절반으로', cd: '쿨 6초' },
  blink:    { name: '점멸', desc: '누른 방향으로 순간이동. 떨어질 때 복귀용', cd: '쿨 7초' },
  stealth:  { name: '은신', desc: '5초간 상대 화면에서 사라짐. 맞히면 맞음', cd: '쿨 12초' },
  clone:    { name: '분신', desc: '나와 똑같은 분신이 곁에서 지켜줌. 5대 맞으면 사라짐', cd: '쿨 10초' },
  swap:     { name: '전환', desc: '랜덤한 상대·분신·터렛과 위치를 바꿈. 강공격 맞고 1초간 불가', cd: '쿨 19초' },
  fly:      { name: '비행', desc: '5초간 비행. 점프 키 누르면 올라가고 떼면 내려감', cd: '쿨 15초' },
  explode:  { name: '폭파', desc: '넓게 폭파해 크게 날리고 0.5초 스턴. 3초간 반투명 연기. 공중이면 3단 점프', cd: '쿨 10초' },
  freeze:   { name: '정지', desc: '나 빼고 모두 1초 정지. 정지 중엔 공격이 안 맞음', cd: '쿨 7초' },
  rock:     { name: '바위', desc: '6초간 넉백 없음. 대신 아주 느려지고 점프도 낮아짐', cd: '쿨 10초' },
  magnet:   { name: '자석', desc: 'Q로 주변을 끌어당기고 E로 밀어냄', cd: '각 쿨 9초', two: true },
  empower:  { name: '강화', desc: '가만히 있는 시간이 8초 쌓이면 충전 (움직여도 유지). 6초간 넉백↓ 사거리·속도·점프↑', cd: '충전식' },
  quake:    { name: '지진', desc: '나를 뺀 모두의 화면이 3초간 격하게 흔들림', cd: '쿨 11초' },
  giant:    { name: '거인', desc: '9초간 2배로 커짐. 넉백·속도 조금↓, 사거리↑', cd: '쿨 13초' },
  rubber:   { name: '고무', desc: '7초간 사거리 2배, 점프가 더 높아짐', cd: '쿨 12초' },
  engine:   { name: '엔진', desc: '6초간 빨라짐. 빠를수록 때릴 때 넉백이 커짐', cd: '쿨 11초' },
  parasite: { name: '기생', desc: '5번 때린 상대 몸에 들어가 5초 조종. 다시 Q로 나옴', cd: '5번 때리면 준비' },
  sword:    { name: '검사', desc: '공격이 검으로 바뀌고 사거리↑. 약공격은 돌진 베기, 강공격은 주변 부채꼴 베기, Q는 날아가는 참격. 공격 사이에 딜레이가 있음', cd: '쿨 13초' },
  blackflash: { name: '흑섬', desc: '공격이 맞는 순간에 맞춰 Q를 누르면 넉백↑ (강공격은 0.7초 스턴까지). 타이밍이 틀리면 아무 일도 없음', cd: '쿨타임 없음' },
  lightning: { name: '번개', desc: '가까운 적 2명에게 번개를 내리쳐 3초 스턴', cd: '쿨 15초' },
  undying:  { name: '불사', desc: '목숨이 5개가 됨 (패시브)', cd: '패시브' },
  hulk:     { name: '헐크', desc: '퍼센트가 오를수록(110%에서 최대) 몸·사거리↑, 날리는 힘 최대 2.8배, 속도·받는 넉백↓. 퍼센트가 내려가면 다시 작아짐 (패시브)', cd: '패시브' },
  fire:     { name: '화염', desc: '공격에 불이 붙어 맞은 상대가 2번 더 밀림. Q는 불태우며 돌진 (맞으면 4번 더 밀림)', cd: '쿨 9초' },
  ice:      { name: '얼음', desc: '때리면 상대 얼음 게이지가 참. 가득 차면 2초 얼어붙음. Q는 4초 눈보라 (모두의 게이지가 계속 참)', cd: '쿨 13초' },
  error:    { name: '에러', desc: '랜덤한 적 1명의 화면이 5초간 끊기고 조작이 제멋대로 됨 (걸린 사람은 깨진 화면 효과)', cd: '쿨 12초' },
  sun:      { name: '태양', desc: '6초간 태양의 힘: 빨라지고, 평타에 불이 붙고, 넉백이 세짐', cd: '쿨 11초' },
  wind:     { name: '바람', desc: '공격에 바람이 붙어 더 날아감. Q는 앞으로 나아가며 휩쓸어 가는 소용돌이', cd: '쿨 14초' },
  archer:   { name: '궁수', desc: '강공격을 누르고 있으면 시위를 당김(1초면 최대), 놓으면 발사. Q는 다음 화살이 벽을 피해 쫓아가는 유도 화살', cd: '쿨 13초' },
  time:     { name: '시간', desc: '첫 Q로 지금 순간을 저장, 다시 Q를 누르면 모두 그 순간으로 되돌림 (위치·퍼센트·내 목숨·상대 쿨타임·맞은 효과 등). 내 쿨타임과 콤보·충전·별빛 같은 스택은 그대로, 상대가 그사이 잃은 목숨은 안 돌아옴. 탈락하면 못 씀', cd: '되돌린 뒤 쿨 20초' },
  combo:    { name: '콤보', desc: '때릴 때마다 콤보가 쌓임. Q는 콤보만큼 강하고 넓은 스매시 (죽어도 유지, 스매시하면 초기화)', cd: '콤보 1 이상' },
  reflect:  { name: '반사', desc: '상대 공격이 들어오는 순간에 맞춰 Q를 누르면 반사. 돌진·검 돌진은 반대로 날려 보내고, 화살(유도 포함)·참격·총알·바람은 되돌려 보냄', cd: '쿨 2초' },
  invert:   { name: '반전', desc: '나를 뺀 상대 절반(올림)의 좌우 키가 7초간 반대로. 머리 위에 악마 표시', cd: '쿨 13초' },
  atom:     { name: '원자', desc: '때릴 때마다 주위를 도는 전자 +1 (최대 5). 2초 안 때리면 1초에 1개씩 사라짐. 링은 무해, 도는 전자에 닿아야 피해. Q는 5초간 전자 2배 속도 + 링 2줄', cd: '쿨 15초' },
  mine:     { name: '지뢰', desc: '발밑에 지뢰 설치 (최대 10개). 적이 밟으면 폭발. 나와 팀원은 안 터짐', cd: '쿨 6초' },
  turret:   { name: '터렛', desc: '적을 자동으로 쏘는 터렛 설치 (최대 3개, 3번 맞으면 부서짐)', cd: '쿨 12초' },
  ninja:    { name: '닌자', desc: '쿠나이를 듦. 약공격은 쿠나이 베기, 강공격은 딜레이 없이 쿠나이를 똑바로 던짐 (던진 뒤 0.4초 뒤 다시). Q는 통나무를 남기고 랜덤한 안전한 곳으로 순간이동', cd: '쿨 15초' },
  gamble:   { name: '도박', desc: '사거리·주는 넉백·받는 넉백·점프·속도·크기가 각각 0.0~2.0배로 랜덤. 판이 시작되면 자동으로 굴림 (그래서 바로는 못 씀). 죽어도 유지', cd: '쿨 20초' },
  shield:   { name: '방패', desc: '방패를 듦. 약공격은 방패 막기(앞에서 오는 공격), 강공격은 방패 휘두르기(넉백↑). Q를 누르고 있다 놓으면 방패를 던짐(오래 누를수록 멀리). 맞히거나 벽에 부딪히면 튕겨 돌아오고, 가까이 가면 주움(나만). 장외로 떨어지면 10초 뒤 다시 생김. 방패가 없으면 보통 공격', cd: '누르고 있다 놓기' },
  tentacle: { name: '촉수', desc: '등 뒤 촉수 4개. 약공격(J)은 위 촉수 2개, 강공격(K)은 아래 촉수 2개를 번갈아 뻗어 공격 (촉수마다 따로 쿨 1.5초). Q는 아래 촉수 2개로 땅을 짚고 8초간 중력 없이 WASD로 이동, 넉백 거의 없음 (맨 밑 바닥 아래로는 못 감, 그동안 아래 촉수 공격·점멸·화염 돌진 불가 — K도 위 촉수로)', cd: '쿨 18초' },
  portal:   { name: '포탈', desc: 'Q: 내 자리에 포탈 → 다시 Q: 첫 포탈로 순간이동하면서 방금 자리에 두 번째 포탈. 나(팀전이면 우리 팀도)만 탈 수 있고, 한쪽 포탈에 들어가면 반대쪽으로 나오고 두 포탈은 사라짐. 포탈이 두 개일 때 Q를 누르면 둘 다 없애고 새로 만듦', cd: '쿨 10초 (두 번째 포탈부터)' },
  charge:   { name: '충전', desc: 'Q로 공격 모드(빨강) ↔ 충전 모드(초록) 전환. 충전 모드로 때리면 넉백도 %도 없이 충전 스택 +1 (제한 없음), 공격 모드로 때리면 스택만큼 피해·넉백이 세짐. 죽으면 스택 초기화', cd: '전환 쿨 2초' },
  dash:     { name: '돌진', desc: '약·강공격을 할 때 앞으로 튀어 나가며 공격. Q = 앞으로 쭉 돌진하며 앞의 상대를 밀고 가다가 끝에서 피해 + 튕김. 도중에 반대로 꺾으면 확 방향이 바뀌고 밀던 상대는 그 자리에서 튕겨 나감', cd: '쿨 13초' },
  gem:      { name: '보석', desc: '판 중에 상대를 때릴 때마다 진짜 보석 +1 (강공격 +2). Q = 5초 동안 2배. 판이 끝나면 계정에 들어옴 (한 판 최대 60개, 더미·분신은 제외)', cd: '쿨 11초' },
  shotgun:  { name: '샷건', desc: '샷건을 듦. 약공격 = 총으로 때리기, 강공격 = 바로 산탄 발사 (가까울수록 많이 맞음). 한 번 장전하면 5발, 발사 간격 0.5초. Q = 장전', cd: '장전 쿨 5초' },
  hop:      { name: '점프', desc: '기본으로 3단 점프 (패시브). Q = 3초 동안 공중에서 무한 점프', cd: '쿨 14초' },
  wave:     { name: '파동', desc: 'Q로 내 몸에서 큰 파동이 퍼져 주변 적을 조금 튕겨냄. 그 뒤 7초간 팔에 파동이 감겨 넉백이 세지고, 점프력·이동 속도도 올라감', cd: '쿨 13초' },
  dope:     { name: '도핑', desc: '맵 곳곳에 내 물약이 7초마다 하나씩 떨어짐 (최대 3개). 하늘=이속, 빨강=공속, 초록=힘(넉백), 노랑=방어(넉백 덜 받음). 먹으면 5초 강화, 끝나면 3초간 그만큼 약화. 약화 전에 다른 물약을 먹으면 약화 없음 (패시브)', cd: '패시브' },
  flash:    { name: '섬광', desc: '내 자리에서 섬광이 터져 주변을 살짝 밀어내고, 가까울수록 상대 화면이 오래 하얘짐. 터진 자리엔 4초간 빛 자국이 남아 나 말고는 그 안이 안 보임', cd: '쿨 10초' },
  flood:    { name: '홍수', desc: 'Q마다 아래에서 물이 차오름 (여러 번 쓰면 더 높이, 15초간 안 쓰면 천천히 빠짐). 화면 끝까지 꽉 차면 10초 뒤 5초 동안 전부 빠지고, 그동안은 다시 못 씀. 나는 물속을 자유롭게 헤엄치고, 다른 사람은 느려지고 공격·점프가 약해짐(물속 점프는 무한). 머리가 잠기면 숨방울 10개가 1초에 하나씩 줄고 다 떨어지면 가라앉음. 물속에선 불 무효·터렛 고장·번개 스턴↑·얼음 게이지↑·투사체와 돌진이 느려짐', cd: '쿨 12초' },
  ghost:    { name: '귀신', desc: '목숨을 다 잃으면 마지막 5초간 귀신이 됨 (중력·벽 무시, WASD 이동, 안 맞음). 그동안 한 명을 3번 때리면 그 사람도 장외 → 마지막 상대였다면 귀신이 승리 (패시브)', cd: '패시브' },
  starlight: { name: '별빛', desc: '별 카운트(처음 1개, 9초마다·죽을 때마다 +1, 최대 5)를 모두 써서 하늘에서 사선으로 별비를 쏟음. 별이 많을수록 별이 많고 크고 세게 밀어냄', cd: '별 1개 이상' },
  venom:    { name: '독침', desc: '때리면 독 +3 (최대 15). 0.5초마다 독만큼 퍼센트가 오르고, 독 1개당 넉백을 2% 더 받음. 독 6개부터 느려짐. Q = 초록 독안개가 터져서 주변 상대를 살짝 밀어내고 독 +6 + 4% 피해', cd: '쿨 8초' },
  ambush:   { name: '암습', desc: 'Q = 가장 가까운 상대 뒤로 순간이동 (잠깐 무적, 상대는 잠깐 멍해짐). 3초 안에 처음 때리는 공격이 피해 2배 · 넉백 1.7배', cd: '쿨 6초' },
  mark:     { name: '표식', desc: 'Q = 상대에게 표식을 붙임 (최대 3개). 2초 뒤 폭발해서 주변 상대에게 14% 피해 + 퍼센트가 높을수록 멀리 날려 보냄', cd: '쿨 7초' },
  hook:     { name: '낚시', desc: 'Q = 바라보는 쪽으로 긴 갈고리 (위·아래 살짝 조준). 상대에 걸면 내 바로 앞으로 끌어오고 줄로 감아서 2초 동안 못 움직이게 함 → 마음껏 때리기! 벽·바닥에 걸면 그쪽으로 날아가고 점프가 다 회복됨', cd: '쿨 4초' },
  leech:    { name: '흡혈', desc: '때리면 준 피해의 30%만큼 내 퍼센트가 줄어듦. Q = 5초 동안 흡혈 두 배 (60%)', cd: '쿨 12초' },
  disc:     { name: '원반', desc: 'Q = 앞으로 원반을 던짐. 끝까지 갔다가 나에게 돌아오면서, 갈 때·올 때 한 번씩 맞힘', cd: '쿨 5초' },
  cloud:    { name: '구름', desc: 'Q = 4초 동안 나와 우리 팀만 밟을 수 있는 구름 발판. 땅에선 앞쪽 위에, 공중에선 발밑에 생김 (최대 2개)', cd: '쿨 7초' },
  barrier:  { name: '결계', desc: 'Q = 2초 동안 나를 따라다니는 둥근 결계. 상대는 안으로 못 들어오고 튕겨 나가고, 상대가 쏜 화살·총알·참격도 막음', cd: '쿨 12초' },
  hammer:   { name: '망치', desc: '큰 망치를 듦: 공격이 느린 대신 피해 1.5배·넉백 1.3배. 강공격은 땅을 찍어 양옆으로 충격파. Q = 큰 충격파 (공중에서 쓰면 내리꽂음)', cd: '쿨 8초' },
  whip:     { name: '채찍', desc: '채찍을 듦: 약공격 사거리 2배. 강공격은 상대를 내 쪽으로 끌어당김. Q = 빙글 돌며 주변을 모두 후려침', cd: '쿨 7초' },
  curse:    { name: '저주', desc: 'Q = 가까운 상대에게 5초 동안 저주. 저주받은 상대는 휘두를 때마다 자기 퍼센트가 3%씩 오름', cd: '쿨 9초' },
  guard:    { name: '수호', desc: 'Q = 나와 가까운 아군에게 3초 동안 공격 한 번을 막는 보호막 (개인전에선 나만)', cd: '쿨 10초' },
  thorns:   { name: '가시', desc: 'Q = 2.5초 동안 몸에 가시. 가까이서 나를 때린 상대는 튕겨 나가고(+5%), 나는 피해 절반만 받고 조금만 밀림', cd: '쿨 12초' },
  wall:     { name: '장벽', desc: 'Q = 앞에 4초 동안 벽을 세움. 걸어오는 상대와 상대가 쏜 화살·총알·참격·원반을 막음 (나와 우리 팀은 통과)', cd: '쿨 11초' },
  volcano:  { name: '화산', desc: 'Q = 발밑 넓은 땅이 4.5초 동안 용암 지대. 위에 선 상대는 0.5초마다 +4%에 위로 튀어 오름', cd: '쿨 12초' },
  shrink:   { name: '축소', desc: 'Q = 가장 가까운 상대를 5초 동안 작게. 작아진 상대는 사거리·때리는 힘이 약해지고 더 멀리 날아감', cd: '쿨 14초' },
};
const SKILL_COLOR = {
  slow: '#7fb8ff', blink: '#c77dff', stealth: '#7fe0c8', clone: '#ff9ecf', swap: '#b48cff', fly: '#9ad7ff',
  explode: '#ff8a3d', freeze: '#d5ecff', rock: '#b5aca2', magnet: '#ff5d73', empower: '#4f8bff', parasite: '#7be36f',
  quake: '#d6a45c', giant: '#ff6b4a', rubber: '#ff9ff3', engine: '#ffb000',
  sword: '#cfe3ff', blackflash: '#c0263a', lightning: '#ffe94a', undying: '#ffd27a',
  hulk: '#5fd35a', fire: '#ff5a1f', ice: '#8fdcff', turret: '#a7b2c4', error: '#39ff88', sun: '#ffc21a',
  venom: '#9bd34a', ambush: '#8b6bd6', mark: '#ff4d6d', hook: '#c8a878',
  leech: '#c8102e', disc: '#ffb347', cloud: '#e8f4ff', barrier: '#7fd8ff', hammer: '#8a6a4a', whip: '#a0522d', curse: '#6a2c91', guard: '#ffd36b', thorns: '#5f8a3a', wall: '#9a8f80', volcano: '#ff4a1a', shrink: '#ff7ad9',
  wind: '#b8f2e6', archer: '#c98b4a', time: '#7c9cff', combo: '#ff5fa2', reflect: '#e0f0ff', invert: '#c2185b', atom: '#5ad8ff', mine: '#8a8f6a',
  ninja: '#5b6b8a', gamble: '#3fd07a', starlight: '#ffe27a', shield: '#c9a24a', tentacle: '#3a2a4a', ghost: '#d8d8f0', flash: '#fff6b0', flood: '#3a9ad8', wave: '#5fe0ff', dope: '#c06bff', portal: '#7a5cff', charge: '#3ccf6e', dash: '#ff8a3d', hop: '#7fe0ff', gem: '#5ef2ff', shotgun: '#8a6a4a',
};
// 더블 모드에서 같이 못 쓰는 조합 (서버 game.js와 같음)
const WEAPONS = ['sword', 'archer', 'ninja', 'shield', 'tentacle', 'shotgun', 'hammer', 'whip'];
const conflictsK = (a, b) => a !== b && ((WEAPONS.includes(a) && WEAPONS.includes(b)) || (a === 'tentacle' && b === 'fly') || (a === 'fly' && b === 'tentacle'));
// 스킬 목록 순서 = 나온 순서 (새 스킬은 항상 맨 뒤에 추가)
const SKILL_ORDER = ['slow', 'blink', 'stealth', 'clone', 'swap', 'fly', 'explode', 'freeze', 'rock', 'magnet', 'empower', 'parasite', 'quake', 'giant', 'rubber', 'engine',
  'sword', 'blackflash', 'lightning', 'undying', 'hulk', 'fire', 'ice', 'turret', 'error', 'sun', 'wind', 'archer', 'time', 'combo', 'reflect', 'invert', 'atom', 'mine',
  'ninja', 'gamble', 'starlight', 'shield', 'tentacle', 'ghost', 'flash', 'flood', 'wave', 'dope', 'portal', 'charge', 'dash', 'hop', 'gem', 'shotgun', 'venom', 'ambush', 'mark', 'hook', 'leech', 'disc', 'cloud', 'barrier', 'hammer', 'whip', 'curse', 'guard', 'thorns', 'wall', 'volcano', 'shrink'];
const SKILL_IDS = [...SKILL_ORDER.filter((k) => SKILLS[k]), ...Object.keys(SKILLS).filter((k) => !SKILL_ORDER.includes(k))];
const MAPS = window.BRAWL_MAPS;   // maps.js (서버와 같은 맵 정보)
let STAGE = MAPS[0];               // 지금 판의 맵
const COLORS = ['#ff5a5f', '#3fa7ff', '#ffc93c', '#4cd97b', '#c77dff', '#ff8c42'];
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 바둑이', '봇 민수', '봇 지수'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
const EMPTY_INPUT = () => ({ l: 0, r: 0, u: 0, d: 0, a: 0, h: 0, s: 0, e: 0, x: 0, t1: 0, t2: 0, t3: 0, t4: 0 });
const TEAMS = [null, { name: '빨강팀', color: '#ff4d4d' }, { name: '파랑팀', color: '#3f8cff' }, { name: '초록팀', color: '#3ccf6e' }, { name: '노랑팀', color: '#ffd23f' }];
// 키 배치 (서버와 같은 규칙): Q=스킬1, E=스킬2 / 자석이 있으면 Q·E 자석, R 나머지
function slotsOf(p) {
  if (!p.sk2) return { s: p.sk, e: p.sk === 'magnet' ? 'magnet2' : null, x: null };
  if (p.sk === 'magnet' || p.sk2 === 'magnet') return { s: 'magnet', e: 'magnet2', x: p.sk === 'magnet' ? p.sk2 : p.sk };
  return { s: p.sk, e: p.sk2, x: null };
}
// 그 슬롯 스킬의 남은 쿨타임
// 스킨 (보이는 것만 바뀜)
const SKIN_INFO = window.BRAWL_SKINS;
// 스킨 등급 표시: 일반(파랑) · 에픽(보라) · 레어(빨강) · 전설(노랑)
const skinPriceOf = (id) => SKIN_INFO.priceOf(id);
function gradeTag(id) { const g = SKIN_INFO.gradeOf(id); const s = document.createElement('span'); s.className = 'grade-tag'; s.textContent = g.name; s.style.color = g.color; s.style.borderColor = g.color; return s; }
function gradeEdge(card, id) { card.style.borderLeft = `5px solid ${SKIN_INFO.gradeOf(id).color}`; }
const skinOn = (p, id) => !!(p && p.sn && p.sn.includes(id));
const fxOf = (p) => { for (const id of (p && p.sn) || []) if (SKIN_INFO.SKINS[id] && SKIN_INFO.SKINS[id].fx) return SKIN_INFO.SKINS[id].fx; return null; };
// 공격 이펙트 색 (스킨) — 무지개는 시간에 따라 색이 돎
function fxColor(fx, a, time) {
  if (fx === 'venom') return `rgba(20,16,26,${a})`;
  if (fx === 'carnage') return `rgba(200,20,30,${a})`;
  if (fx === 'redwind') return `rgba(255,70,40,${a})`;
  if (fx === 'rainbow') return `hsla(${Math.floor((time || performance.now()) / 4) % 360},95%,62%,${a})`;
  return null;
}
const hasK = (p, k) => p.sk === k || p.sk2 === k;   // 더블 모드면 두 스킬 중 하나라도
const cdOf = (p, k) => (k === 'magnet2' ? p.cd2 : k === p.sk ? p.cd : p.cdB);
const cleanInput = (i) => ({ l: i.l ? 1 : 0, r: i.r ? 1 : 0, u: i.u ? 1 : 0, d: i.d ? 1 : 0, a: i.a ? 1 : 0, h: i.h ? 1 : 0, s: i.s ? 1 : 0 });
const validSkill = (s) => (Object.prototype.hasOwnProperty.call(SKILLS, s) ? s : 'slow');

// =====================================================================
//  계정 (서버에 회원가입 · 로그인)
// =====================================================================
const $ = (id) => document.getElementById(id);
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let isHost = false;   // 내가 방장인지 (서버가 알려줌)
let hostLive = null;  // 지금 방장의 id

const account = { token: null, profile: null, skill: 'slow' };
let authTab = 'login';
try { account.skill = validSkill(localStorage.getItem('brawl_skill')); } catch (e) {}
try { account.token = localStorage.getItem('brawl_token'); } catch (e) {}

async function api(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (account.token) headers.Authorization = 'Bearer ' + account.token;
  const res = await fetch(path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data.error || '서버에 연결하지 못했어요.'); err.status = res.status; throw err; }
  return data;
}
function cleanNick(s) {
  return String(s || '').normalize('NFC').replace(/[<>&"'\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').trim().slice(0, 12);
}

function setTab(tab) {
  authTab = tab;
  for (const [t, id] of [['login', 'tabLogin'], ['signup', 'tabSignup'], ['guest', 'tabGuest']]) $(id).setAttribute('aria-selected', String(t === tab));
  $('authForm').hidden = tab === 'guest';
  $('guestBox').hidden = tab !== 'guest';
  $('pw2Wrap').hidden = tab !== 'signup';
  $('pwWarn').hidden = tab !== 'signup';
  $('authBtn').textContent = tab === 'signup' ? '가입하기' : '로그인';
  $('aPw').setAttribute('autocomplete', tab === 'signup' ? 'new-password' : 'current-password');
  $('authMsg').textContent = '';
  renderAccount();
}
$('tabLogin').addEventListener('click', () => setTab('login'));
$('tabSignup').addEventListener('click', () => setTab('signup'));
$('tabGuest').addEventListener('click', () => setTab('guest'));

function authMsg(text, ok) {
  $('authMsg').textContent = text;
  $('authMsg').style.color = ok ? 'var(--ok)' : 'var(--danger)';
}

$('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nick = cleanNick($('aNick').value);
  const pw = $('aPw').value;
  if (nick.length < 2) { authMsg('닉네임은 2~12자로 써 주세요.'); return; }
  if (pw.length < 4) { authMsg('비밀번호는 4자 이상으로 써 주세요.'); return; }
  if (authTab === 'signup' && pw !== $('aPw2').value) { authMsg('비밀번호 확인이 달라요.'); return; }
  $('authBtn').disabled = true;
  authMsg(authTab === 'signup' ? '가입하는 중…' : '확인하는 중…', true);
  try {
    account.token = null;
    const r = await api(authTab === 'signup' ? '/api/signup' : '/api/login', { nick, pw });
    loginWith(r.token, r.profile);
    authMsg('');
  } catch (err) {
    authMsg(err.message);
  } finally {
    $('authBtn').disabled = false;
  }
});

// ---------------- 패치 내역 ----------------
// 새 패치 뒤 처음 들어오면 한 번 보여줌 (보상을 아직 안 받았으면 받을 때까지)
const PATCH = (window.BRAWL_PATCH || {}).PATCH;
let patchShown = false;
function patchLocalSeen() { try { return localStorage.getItem('brawl_patch') === PATCH.id; } catch (e) { return false; } }
function renderPatch() {
  const body = $('patchBody'); body.textContent = '';
  $('patchDate').textContent = PATCH.date;
  // 오래된 내용(keepDays일 지난 것)은 안 보여줌
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const cut = new Date(Date.parse(today) - ((PATCH.keepDays || 7) - 1) * 86400000).toISOString().slice(0, 10);
  for (const sec of PATCH.sections.filter((x) => !x.date || x.date >= cut)) {
    const h = document.createElement('h4'); h.textContent = sec.title; body.appendChild(h);
    const ul = document.createElement('ul');
    for (const it of sec.items) { const li = document.createElement('li'); li.textContent = it; ul.appendChild(li); }
    body.appendChild(ul);
  }
}
function openPatch() { if (!PATCH) return; renderPatch(); $('patchMsg').textContent = ''; $('patchModal').hidden = false; }
function maybeShowPatch() {
  if (!PATCH || patchShown || !$('lobby') || $('lobby').hidden) return;
  const p = account.profile;
  const need = p ? p.patchSeen !== PATCH.id : (!account.token && !patchLocalSeen());
  if (!need) return;
  patchShown = true; openPatch();
}
function closePatch() {
  $('patchModal').hidden = true;
  try { localStorage.setItem('brawl_patch', PATCH.id); } catch (e) {}
  if (account.profile && account.profile.patchSeen !== PATCH.id) api('/api/patch/seen', {}).then((r) => { account.profile = r.profile; }).catch(() => {});
}
$('patchOk').addEventListener('click', closePatch);
$('patchClose').addEventListener('click', closePatch);
$('patchModal').addEventListener('click', (e) => { if (e.target === $('patchModal')) closePatch(); });
$('patchOpen').addEventListener('click', openPatch);
function loginWith(token, profile) {
  account.token = token; account.profile = profile;
  try { localStorage.setItem('brawl_token', token); } catch (e) {}
  if (profile.skill) selectSkill(profile.skill, true);
  $('aPw').value = ''; $('aPw2').value = '';
  renderAccount();
  loadRanking();
  loadShop();
  patchShown = false; maybeShowPatch();
}
$('logoutBtn').addEventListener('click', () => {
  api('/api/logout', {}).catch(() => {});
  account.token = null; account.profile = null; adminLoaded = false; adminSel = null; $('admEdit').hidden = true;
  try { localStorage.removeItem('brawl_token'); } catch (e) {}
  setTab('login');
  loadRanking();
  $('shopDot').hidden = true; shopData = null;
});

function renderAccount() {
  const p = account.profile;
  // 닉네임 경고: 닉네임을 바꿀 때까지 다른 걸 못 함 (게임 중이면 로비로)
  if (p && p.nickWarn) {
    if (inGameNow()) { location.reload(); return; }
    $('nickWhy').textContent = `관리자가 "${p.nick}" 닉네임에 경고를 줬어요. 사유: ${p.nickWarn}. 새 닉네임으로 바꿔야 게임을 할 수 있어요.`;
    if ($('nickModal').hidden) { $('nickModal').hidden = false; $('nickNew').value = ''; $('nickMsg').textContent = ''; setTimeout(() => $('nickNew').focus(), 0); }
  } else if ($('nickModal')) $('nickModal').hidden = true;
  const loggedIn = !!p;
  $('authBox').hidden = loggedIn;
  $('meBox').hidden = !loggedIn;
  if (loggedIn) $('meNick').textContent = p.nick;
  $('stWins').textContent = p ? p.wins : '-';
  $('stGames').textContent = p ? p.games : '-';
  $('stKos').textContent = p ? p.kos : '-';
  $('acctDot').className = 'dot' + (loggedIn ? ' ok' : '');
  $('acctText').textContent = loggedIn ? '로그인됨 · 판이 끝날 때마다 서버에 기록돼요'
    : authTab === 'guest' ? '게스트는 기록이 저장되지 않고 둔화·점멸만 쓸 수 있어요'
    : '로그인하면 기록이 저장되고 보석으로 스킬을 뽑을 수 있어요';
  // 보석
  $('gemCount').textContent = p ? p.gems : '-';
  $('gachaBtn').disabled = !p || p.gems < GACHA_COST;
  $('gacha10Btn').disabled = !p || p.gems < GACHA_COST * 10;
  if (!p) $('gachaMsg').textContent = '가입하면 보석을 모아 은신·분신을 뽑을 수 있어요.';
  else if ($('gachaMsg').dataset.keep !== '1') $('gachaMsg').textContent = p.gems < GACHA_COST ? `뽑기까지 보석 ${GACHA_COST - p.gems}개 더 필요해요.` : '';
  // 스킬 잠금
  const owned = p ? p.owned : BASE_SKILLS;
  // 가진 스킬 수 / 전체 스킬 수
  $('skillCount').textContent = `${SKILL_IDS.filter((k) => owned.includes(k)).length}/${SKILL_IDS.length}`;
  document.querySelectorAll('.skill').forEach((b) => {
    const locked = !owned.includes(b.dataset.skill);
    b.classList.toggle('locked', locked);
    b.disabled = false;                              // 잠긴 스킬도 눌러서 설명·영상을 볼 수 있음
    b.classList.toggle('buyable', locked && !!p);
    b.title = locked ? '눌러서 설명·영상 보기 (뽑기로 얻거나 보석으로 사기)' : '';
  });
  if (!owned.includes(account.skill)) account.skill = 'slow';
  selectSkill(account.skill, false);
  // 관리자
  $('adminCard').hidden = !(p && p.admin);
  if (p && p.admin && !adminLoaded) { adminLoaded = true; adminSearch(); adminRooms(); adminReports(); }
}

// ---------------- 스킬 뽑기 ----------------
const GACHA_COST = 200, SKILL_BUY = 1000;
const BASE_SKILLS = ['slow', 'blink'];
// ---------------- 스킨 창 ----------------
function renderSkins() {
  const skill = validSkill(account.skill);
  const p = account.profile;
  const list = Object.entries(SKIN_INFO.SKINS).filter(([id, s]) => s.skill === skill && (!s.limited || (p && p.skins && p.skins.includes(id)) || evSale(id)));
  $('skinTitle').textContent = `${SKILLS[skill].name} 스킨`;
  $('skinGems').textContent = p ? `보석 ${p.gems}` : '';
  $('skinSub').textContent = '스킨은 보이는 모습만 바뀌고 능력은 그대로예요. 등급: 일반(기본 모습·무료) · 에픽 100 · 레어(소리까지 바뀜) 150 · 전설(한정판) 200보석. 카드를 누르면 영상으로 볼 수 있어요.';
  list.sort((a, b) => skinPriceOf(a[0]) - skinPriceOf(b[0]));
  const box = $('skinList'); box.textContent = '';
  const equipped = p && p.skinSel ? p.skinSel[skill] || null : null;
  const card = (id, name, desc, color, owned) => {
    const c = document.createElement('div'); c.className = 'skin-card' + (equipped === id ? ' on' : '');
    const sw = document.createElement('div'); sw.className = 'skin-sw'; sw.style.background = color;
    const t = document.createElement('div'); t.className = 'skin-txt';
    const b = document.createElement('b'); b.append(gradeTag(id), name); const sm = document.createElement('small'); sm.textContent = desc; t.append(b, sm);
    gradeEdge(c, id);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'skin-act';
    if (!p) { btn.textContent = id ? `보석 ${skinPriceOf(id)}` : '기본'; btn.disabled = true; }
    else if (equipped === id) { btn.textContent = '장착 중'; btn.disabled = true; btn.classList.add('ghost'); }
    else if (owned) { btn.textContent = '장착'; btn.onclick = () => skinAction('/api/skin/equip', { skill, skin: id }); }
    else if (id && SKIN_INFO.SKINS[id].limited) { const sale = evSale(id); btn.textContent = `한정판 · 보석 ${sale.price}`; btn.disabled = p.gems < sale.price; btn.onclick = () => eventBuy(id); }
    else { const pr = skinPriceOf(id); btn.textContent = `구매 · 보석 ${pr}`; btn.disabled = p.gems < pr; btn.onclick = () => skinAction('/api/skin/buy', { skin: id }); }
    c.append(sw, t, btn); box.append(c);
    // 카드를 누르면 스킨 영상 (버튼은 그대로)
    c.dataset.info = '1'; c.title = '눌러서 영상 보기';
    c.addEventListener('click', (e) => { if (e.target.closest('button')) return; openDetail({ skill, skin: id }); });
  };
  card(null, '기본', `${SKILLS[skill].name} 기본 모습`, SKILL_COLOR[skill], true);
  for (const [id, s] of list) card(id, s.name, s.desc, s.color, !!(p && p.skins && p.skins.includes(id)));
  if (!list.length) { const e = document.createElement('p'); e.className = 'hint'; e.textContent = '이 능력은 아직 스킨이 없어요.'; box.append(e); }
  if (!p) $('skinMsg').textContent = '가입하고 로그인하면 보석으로 스킨을 살 수 있어요.';
  const others = [...new Set(Object.values(SKIN_INFO.SKINS).map((s) => s.skill))].filter((k) => k !== skill).map((k) => SKILLS[k].name);
  $('skinOther').textContent = `스킨이 있는 능력: ${others.concat(list.length ? [SKILLS[skill].name] : []).join(' · ')} — 로비에서 능력을 고른 뒤 다시 열어 보세요.`;
}
// 한정판 스킨: 지금 이벤트로 팔고 있으면 { price }
function evSale(id) {
  for (const e of (shopData && shopData.events) || []) { const it = e.skins.find((x) => x.id === id); if (it) return { price: it.price }; }
  return null;
}
async function eventBuy(id) {
  const p = account.profile, sale = evSale(id), sk = SKIN_INFO.SKINS[id];
  if (!p || !sale) return;
  if (!confirm(`한정판 스킨 ${sk.name}을(를) 보석 ${sale.price}개로 살까요?\n(지금 보석 ${p.gems}개)`)) return;
  $('skinMsg').textContent = '';
  try {
    const r = await api('/api/shop/buy', { kind: 'event', id });
    account.profile = r.profile; shopData = r.shop; renderAccount(); renderSkins();
    $('skinMsg').textContent = `${sk.name} 구매 완료! 바로 장착했어요.`;
  } catch (e) { $('skinMsg').textContent = e.message; }
}
async function skinAction(path, body) {
  $('skinMsg').textContent = '';
  try {
    const r = await api(path, body);
    account.profile = r.profile; renderAccount(); renderSkins();
    $('skinMsg').textContent = path.endsWith('buy') ? '구매 완료! 바로 장착했어요.' : '장착했어요.';
  } catch (e) { $('skinMsg').textContent = e.message; }
}
// ---------------- 닉네임 바꾸기 (경고받았을 때) ----------------
function inGameNow() { return $('lobby').hidden; }
async function saveNick() {
  $('nickMsg').textContent = '';
  try {
    const r = await api('/api/nick', { nick: $('nickNew').value });
    account.profile = r.profile; renderAccount();
    $('nickModal').hidden = true;
  } catch (e) { $('nickMsg').textContent = e.message; }
}
$('nickSave').addEventListener('click', saveNick);
$('nickNew').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveNick(); });
$('skinBtn').addEventListener('click', () => { $('skinMsg').textContent = ''; renderSkins(); $('skinModal').hidden = false; $('skinClose').focus(); });
$('skinClose').addEventListener('click', () => { $('skinModal').hidden = true; $('skinBtn').focus(); });
$('skinModal').addEventListener('click', (e) => { if (e.target === $('skinModal')) $('skinModal').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('skinModal').hidden) $('skinModal').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('patchModal').hidden) closePatch(); });

// 10회 뽑기: 결과를 칩으로 보여줌 (새 스킬은 색, 중복은 흐리게)
$('gacha10Btn').addEventListener('click', async () => {
  $('gacha10Btn').disabled = true; $('gachaBtn').disabled = true;
  const msg = $('gachaMsg'), box = $('gachaRes');
  msg.dataset.keep = '1'; msg.style.color = 'var(--muted)'; msg.textContent = '10회 뽑는 중…';
  try {
    const r = await api('/api/gacha', { count: 10 });
    account.profile = r.profile;
    const res = r.results || [r];
    box.textContent = '';
    for (const x of res) {
      const s = document.createElement('span');
      s.textContent = SKILLS[x.skill].name; s.className = x.dup ? 'dup' : 'new';
      s.style.color = x.dup ? 'var(--muted)' : SKILL_COLOR[x.skill];
      box.appendChild(s);
    }
    box.hidden = false;
    const fresh = res.filter((x) => !x.dup), refund = res.reduce((n, x) => n + (x.refund || 0), 0);
    msg.style.color = fresh.length ? 'var(--gem)' : 'var(--muted)';
    msg.textContent = `새 스킬 ${fresh.length}개${refund ? ` · 중복 ${res.length - fresh.length}개라 보석 ${refund}개 돌려받음` : ''}`;
    if (fresh.length) selectSkill(fresh[fresh.length - 1].skill, true);
  } catch (err) { msg.style.color = 'var(--danger)'; msg.textContent = err.message; }
  renderAccount();
  setTimeout(() => { msg.dataset.keep = ''; }, 6000);
});
$('gachaBtn').addEventListener('click', async () => {
  const btn = $('gachaBtn');
  btn.disabled = true;
  $('gachaRes').hidden = true;
  const msg = $('gachaMsg');
  msg.dataset.keep = '1';
  msg.style.color = 'var(--muted)';
  msg.textContent = '뽑는 중…';
  try {
    const r = await api('/api/gacha', {});
    account.profile = r.profile;
    const name = SKILLS[r.skill].name;
    msg.style.color = r.dup ? 'var(--muted)' : SKILL_COLOR[r.skill];
    msg.textContent = r.dup ? `${name}! 이미 가진 스킬이라 보석 ${r.refund}개를 돌려받았어요.` : `새 스킬 ${name} 획득! 스킬 선택에서 골라 보세요.`;
    if (!r.dup) selectSkill(r.skill, true);
  } catch (err) {
    msg.style.color = 'var(--danger)';
    msg.textContent = err.message;
  }
  renderAccount();
  setTimeout(() => { msg.dataset.keep = ''; }, 4000);
});

// ---------------- 관리자 ----------------
let adminLoaded = false, adminSel = null;
async function adminSearch() {
  try {
    const r = await api('/api/admin/users?q=' + encodeURIComponent($('admQ').value.trim()));
    const ul = $('admList');
    ul.textContent = '';
    for (const u of r.users) {
      const li = document.createElement('li');
      if (adminSel && adminSel.nick === u.nick) li.className = 'sel';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (u.nickWarn ? '⚠ ' : '') + u.nick + (u.admin ? ' (관리자)' : '');
      const sc = document.createElement('span'); sc.className = 'sc';
      sc.textContent = `보석 ${u.gems} · 스킬 ${u.owned.length}/${SKILL_IDS.length}`;
      li.style.gridTemplateColumns = 'minmax(0,1fr) auto';
      li.append(nm, sc);
      li.addEventListener('click', () => adminPick(u));
      ul.append(li);
    }
    if (!r.users.length) { const li = document.createElement('li'); li.textContent = '찾는 계정이 없어요.'; ul.append(li); }
  } catch (e) {
    $('admMsg').textContent = e.message;
  }
}
function adminPick(u) {
  adminSel = u;
  $('admEdit').hidden = false;
  $('admName').textContent = `${u.nick} 관리 중` + (u.nickWarn ? ` · ⚠ 경고 중 (${u.nickWarn})` : '');
  $('admWarn').textContent = u.nickWarn ? '닉네임 경고 해제' : '닉네임 경고';
  $('admReason').value = '';
  $('admGems').value = u.gems;
  for (const k of SKILL_IDS) if (k !== 'slow' && k !== 'blink') $('admSk' + k).checked = u.owned.includes(k);
  renderAdminSkins(u);
  $('admMsg').textContent = '';
  document.querySelectorAll('#admList li').forEach((li) => li.classList.toggle('sel', li.firstChild && li.firstChild.textContent.replace('⚠ ', '').startsWith(u.nick)));
}
// 스킨 체크박스 (능력 이름 · 스킨 이름)
function renderAdminSkins(u) {
  const box = $('admSkins'); box.textContent = '';
  const have = new Set(u.skins || []);
  for (const [id, sk] of Object.entries(SKIN_INFO.SKINS)) {
    const l = document.createElement('label'); l.className = 'chk';
    const c = document.createElement('input'); c.type = 'checkbox'; c.dataset.skin = id; c.checked = have.has(id);
    l.append(c, ` ${sk.name} (${SKILLS[sk.skill] ? SKILLS[sk.skill].name : sk.skill})`);
    box.append(l);
  }
}
// 방 관리: 모든 방(공개·비공개) 목록과 삭제
async function adminRooms() {
  const ul = $('admRooms');
  try {
    const r = await api('/api/admin/rooms');
    ul.textContent = '';
    for (const rm of r.rooms) {
      const li = document.createElement('li');
      const info = document.createElement('span'); info.className = 'nm';
      info.textContent = `${rm.isPublic ? rm.title : '비공개 · ' + rm.code} (${rm.players}명${rm.bots ? ` + 봇 ${rm.bots}` : ''})`;
      const sub = document.createElement('span'); sub.className = 'rm-sub';
      sub.textContent = `${PHASE_KO[rm.phase] || ''} · ${rm.names.join(', ') || '빈 방'}`;
      info.append(sub);
      const del = document.createElement('button'); del.type = 'button'; del.className = 'adm-del'; del.textContent = '삭제';
      del.addEventListener('click', async () => {
        if (!confirm(`"${rm.isPublic ? rm.title : rm.code}" 방을 삭제할까요? 안에 있는 ${rm.players}명은 로비로 나가요.`)) return;
        try { await api('/api/admin/room/delete', { code: rm.code }); $('admRoomMsg').style.color = 'var(--ok)'; $('admRoomMsg').textContent = '방을 삭제했어요.'; }
        catch (e) { $('admRoomMsg').style.color = 'var(--danger)'; $('admRoomMsg').textContent = e.message; }
        adminRooms();
      });
      li.append(info, del);
      ul.append(li);
    }
    if (!r.rooms.length) { const li = document.createElement('li'); li.textContent = '지금 열린 방이 없어요.'; ul.append(li); }
  } catch (e) { $('admRoomMsg').style.color = 'var(--danger)'; $('admRoomMsg').textContent = e.message; }
}
$('admRoomsRefresh').addEventListener('click', adminRooms);
// ---------- 관리자: 버그 제보 목록 ----------
async function adminReports() {
  const ul = $('admReports');
  try {
    const r = await api('/api/admin/reports');
    ul.textContent = '';
    const todo = r.reports.filter((x) => !x.done).length;
    $('admRepCount').textContent = r.reports.length ? `(${r.reports.length}건 · 안 본 것 ${todo})` : '';
    for (const rp of r.reports) {
      const li = document.createElement('li'); if (rp.done) li.className = 'done';
      const h = document.createElement('div'); h.className = 'rep-h';
      const who = document.createElement('b'); who.textContent = rp.nick || `${rp.guest} (게스트)`;
      const d = new Date(rp.at), when = document.createElement('span');
      when.textContent = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}${rp.done ? ' · 처리됨' : ''}`;
      h.append(who, when);
      const t = document.createElement('div'); t.className = 'rep-t'; t.textContent = rp.text;
      const c = document.createElement('div'); c.className = 'rep-c';
      const cx = rp.ctx || {};
      c.textContent = [cx.room && '방 ' + cx.room, cx.map && '맵 ' + cx.map, cx.mode && '모드 ' + cx.mode, cx.skill && '스킬 ' + cx.skill, cx.phase, cx.screen, cx.ua].filter(Boolean).join(' · ');
      const bb = document.createElement('div'); bb.className = 'rep-b';
      const done = document.createElement('button'); done.type = 'button'; done.textContent = rp.done ? '다시 안 본 것으로' : '처리됨';
      done.addEventListener('click', async () => { try { await api('/api/admin/report', { id: rp.id, done: !rp.done }); } catch (e) { $('admRepMsg').textContent = e.message; } adminReports(); });
      const del = document.createElement('button'); del.type = 'button'; del.textContent = '삭제';
      del.addEventListener('click', async () => { if (!confirm('이 제보를 삭제할까요?')) return; try { await api('/api/admin/report', { id: rp.id, del: true }); } catch (e) { $('admRepMsg').textContent = e.message; } adminReports(); });
      bb.append(done, del);
      li.append(h, t, c, bb); ul.append(li);
    }
    if (!r.reports.length) { const li = document.createElement('li'); li.textContent = '아직 들어온 제보가 없어요.'; ul.append(li); }
  } catch (e) { $('admRepMsg').textContent = e.message; }
}
$('admRepRefresh').addEventListener('click', adminReports);
setInterval(() => { if (!$('adminCard').hidden && !$('lobby').hidden) adminReports(); }, 20000);
// ---------- 버그 제보 창 ----------
function openBug() { $('bugMsg').textContent = ''; $('bugModal').hidden = false; setTimeout(() => $('bugText').focus(), 30); }
function closeBug() { $('bugModal').hidden = true; }
for (const b of document.querySelectorAll('.bug-btn')) b.addEventListener('click', (e) => { e.currentTarget.blur(); openBug(); });
$('bugClose').addEventListener('click', closeBug);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('bugModal').hidden) closeBug(); });
$('bugModal').addEventListener('click', (e) => { if (e.target === $('bugModal')) closeBug(); });
$('bugText').addEventListener('input', () => { $('bugCount').textContent = `${$('bugText').value.length} / 1000`; });
$('bugText').addEventListener('keydown', (e) => e.stopPropagation());   // 쓰는 동안 게임 키 안 눌리게
$('bugSend').addEventListener('click', async () => {
  const text = $('bugText').value.trim(), msg = $('bugMsg');
  if (text.length < 5) { msg.style.color = 'var(--danger)'; msg.textContent = '5글자 이상 써 주세요.'; return; }
  const me = latest && latest.p ? latest.p.find((q) => q.id === myId) : null;
  const ctx = {
    room: $('roomLabel') && !$('bar').hidden ? $('roomLabel').textContent : '', map: latest && latest.mp && !$('bar').hidden ? latest.mp : '',
    mode: latest && latest.md ? ['팀', '더블', '아이템'].filter((_, i) => latest.md[i]).join('+') || '개인전' : '', skill: me ? [me.sk, me.sk2].filter(Boolean).join('+') : '',
    phase: latest ? latest.ph : '', screen: `${innerWidth}x${innerHeight}`, ua: navigator.userAgent,
  };
  $('bugSend').disabled = true;
  try {
    await api('/api/report', { text, name: account.profile ? '' : (cleanNick($('gNick').value) || '게스트'), ctx });
    $('bugText').value = ''; $('bugCount').textContent = '0 / 1000';
    msg.style.color = 'var(--ok)'; msg.textContent = '보냈어요! 고마워요 🙏';
    setTimeout(() => { if (msg.textContent.startsWith('보냈어요')) closeBug(); }, 1400);
  } catch (e) { msg.style.color = 'var(--danger)'; msg.textContent = e.message; }
  $('bugSend').disabled = false;
});
setInterval(() => { if (!$('adminCard').hidden && !$('lobby').hidden) adminRooms(); }, 10000);
let admTimer = null;
$('admQ').addEventListener('input', () => { clearTimeout(admTimer); admTimer = setTimeout(adminSearch, 300); });
$('admWarn').addEventListener('click', async () => {
  if (!adminSel) return;
  const on = !adminSel.nickWarn;
  try {
    const r = await api('/api/admin/warn', { nick: adminSel.nick, on, reason: $('admReason').value });
    adminPick(r.profile);
    $('admMsg').style.color = 'var(--ok)';
    $('admMsg').textContent = on ? `${r.profile.nick}에게 닉네임 경고를 줬어요. 닉네임을 바꿀 때까지 게임을 못 해요.` : `${r.profile.nick}의 경고를 해제했어요.`;
    adminSearch();
  } catch (e) { $('admMsg').style.color = 'var(--danger)'; $('admMsg').textContent = e.message; }
});
$('admSave').addEventListener('click', async () => {
  if (!adminSel) return;
  const owned = [...document.querySelectorAll('#admSkills input')].filter((c) => c.checked).map((c) => c.dataset.skill);
  const skins = [...document.querySelectorAll('#admSkins input')].filter((c) => c.checked).map((c) => c.dataset.skin);
  $('admSave').disabled = true;
  try {
    const r = await api('/api/admin/user', { nick: adminSel.nick, gems: Number($('admGems').value), owned, skins });
    adminSel = r.profile;
    $('admMsg').style.color = 'var(--ok)';
    $('admMsg').textContent = `${r.profile.nick} 저장했어요 · 보석 ${r.profile.gems}`;
    if (account.profile && r.profile.nick === account.profile.nick) { account.profile = r.profile; renderAccount(); }
    adminSearch();
  } catch (e) {
    $('admMsg').style.color = 'var(--danger)';
    $('admMsg').textContent = e.message;
  } finally {
    $('admSave').disabled = false;
  }
});

function renderRanking(rows) {
  const ol = $('rank');
  ol.textContent = '';
  rows.forEach((r, i) => {
    const li = document.createElement('li');
    const mine = account.profile && r.nick === account.profile.nick;
    if (mine) li.className = 'me';
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = i + 1;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.nick + (mine ? ' (나)' : '');
    const sc = document.createElement('span'); sc.className = 'sc';
    const em = document.createElement('em'); em.textContent = `${r.wins}승`;
    sc.append(em, ` · ${r.games}판 · KO ${r.kos}`);
    li.append(pos, nm, sc);
    ol.append(li);
  });
  $('rankEmpty').hidden = rows.length > 0;
}
async function loadRanking() {
  try {
    const r = await api('/api/ranking');
    renderRanking(r.ranking || []);
    $('onlineNow').textContent = r.online;
  } catch (e) {}
}
setInterval(() => { if (!$('lobby').hidden) loadRanking(); }, 15000);

(async () => {
  renderAccount();
  loadRanking();
  if (account.token) {
    try { const r = await api('/api/me'); account.profile = r.profile; if (r.profile.skill) selectSkill(r.profile.skill, true); }
    catch (e) { if (e.status === 401) { account.token = null; try { localStorage.removeItem('brawl_token'); } catch (_) {} } }
    renderAccount();
  }
  loadShop();
  maybeShowPatch();
})();

// ---------------- 스킬 선택 ----------------
// 로비 스킬 버튼 만들기
(function buildSkillButtons() {
  const box = $('skillBox');
  box.textContent = '';
  for (const k of SKILL_IDS) {
    const b = document.createElement('button');
    b.className = 'skill'; b.dataset.skill = k; b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    const t = document.createElement('b');
    const dot = document.createElement('i'); dot.style.background = SKILL_COLOR[k];
    t.append(dot, SKILLS[k].name);
    const d = document.createElement('span'); d.textContent = `${SKILLS[k].desc}. ${SKILLS[k].cd}`;
    b.append(t, d);
    box.append(b);
  }
  // 관리자 스킬 체크박스
  const adm = $('admSkills');
  adm.textContent = '';
  for (const k of SKILL_IDS) {
    const l = document.createElement('label'); l.className = 'chk';
    const c = document.createElement('input'); c.type = 'checkbox'; c.dataset.skill = k; c.id = 'admSk' + k;
    if (k === 'slow' || k === 'blink') { c.checked = true; c.disabled = true; }
    l.append(c, ' ' + SKILLS[k].name + (c.disabled ? ' (기본)' : ''));
    adm.append(l);
  }
})();

function selectSkill(skill, save) {
  skill = validSkill(skill);
  document.querySelectorAll('.skill').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skill === skill)));
  account.skill = skill;
  $('tSkillName').textContent = SKILLS[skill].name;
  $('tSkill').style.borderColor = SKILL_COLOR[skill];
  $('tSkill2').hidden = !SKILLS[skill].two;
  $('skillLbl').textContent = SKILLS[skill].two ? '스킬 선택 (Q · E)' : '스킬 선택 (Q)';
  if (save) { try { localStorage.setItem('brawl_skill', skill); } catch (e) {} }
}
document.querySelectorAll('.skill').forEach((b) => b.addEventListener('click', () => {
  if (b.classList.contains('locked')) return openDetail({ skill: b.dataset.skill });   // 안 가진 스킬: 상세 창(설명·영상·사기)
  selectSkill(b.dataset.skill, true);
}));
// ---------------- 상점 ----------------
let shopData = null;
function fmtLeft(ms) { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h >= 24 ? `${Math.floor(h / 24)}일 ${h % 24}시간` : `${h}시간 ${m}분`; }
async function loadShop() {
  try { shopData = await api('/api/shop'); } catch (e) { shopData = null; }
  $('shopDot').hidden = !(account.profile && shopData && !shopData.dailyDone);
  if (!$('shopModal').hidden) renderShop();
}
function shopCard(box, sw, name, desc, priceHtml, owned, onBuy, extra, onInfo, skinId) {
  const p = account.profile;
  const c = document.createElement('div'); c.className = 'skin-card';
  if (skinId !== undefined) gradeEdge(c, skinId);
  const s = document.createElement('div'); s.className = 'skin-sw'; s.style.background = sw;
  const t = document.createElement('div'); t.className = 'skin-txt';
  const b = document.createElement('b'); if (skinId !== undefined) b.append(gradeTag(skinId)); b.append(name); const sm = document.createElement('small'); sm.textContent = desc; t.append(b, sm);
  if (extra) t.append(extra);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'skin-act';
  if (owned) { btn.textContent = '보유 중'; btn.disabled = true; btn.classList.add('ghost'); }
  else if (!p) { btn.textContent = '로그인 필요'; btn.disabled = true; }
  else { btn.innerHTML = priceHtml; btn.onclick = onBuy; }
  c.append(s, t, btn); box.append(c);
  if (onInfo) { c.dataset.info = '1'; c.title = '눌러서 설명·영상 보기'; c.addEventListener('click', (e) => { if (!e.target.closest('button')) onInfo(); }); }
}
function renderShop() {
  const d = shopData, p = account.profile;
  $('shopGems').textContent = p ? `보석 ${p.gems}` : '';
  if (!d) { $('shopReset').textContent = '상점을 불러오지 못했어요.'; return; }
  $('shopReset').textContent = `오늘의 상품은 모두에게 똑같아요 · ${fmtLeft(d.nextReset - Date.now())} 뒤 바뀜`;
  // 한정판 이벤트 (맨 위)
  const evs = d.events || [], eb = $('shopEvent'), evBox = $('shopEvSkins');
  eb.hidden = !evs.length; evBox.textContent = '';
  for (const e of evs) {
    eb.classList.toggle('pepero', e.id.startsWith('pepero'));
    $('shopEvTitle').textContent = e.name;
    $('shopEvSub').textContent = `${e.desc} · ${fmtLeft(e.ends - Date.now())} 남음`;
    for (const it of e.skins) {
      const sk = SKIN_INFO.SKINS[it.id]; if (!sk) continue;
      const tag = document.createElement('span'); tag.className = 'ltd-tag'; tag.textContent = '한정판';
      shopCard(evBox, sk.color, `${sk.name} (${SKILLS[validSkill(sk.skill)].name} 스킨)`, sk.desc, `구매 · 보석 ${it.price}`, it.owned, () => shopBuy('event', it.id, sk.name, it.price), tag, () => openDetail({ skill: validSkill(sk.skill), skin: it.id }), it.id);
    }
  }
  const db = $('shopDaily');
  db.textContent = !p ? '로그인하면 받기' : d.dailyDone ? '오늘 받았어요 ✓' : `보석 ${d.daily}개 받기`;
  db.disabled = !p || d.dailyDone; db.classList.toggle('ghost', !!(p && d.dailyDone));
  const pk = $('shopPkgs'); pk.textContent = '';
  if (!d.packages.length) { const e = document.createElement('p'); e.className = 'hint'; e.textContent = '이번 주는 패키지가 없어요.'; pk.append(e); }
  for (const g of d.packages) {
    const items = document.createElement('div'); items.className = 'pkg-items';
    for (const k of g.skills) { const s = document.createElement('span'); s.textContent = `스킬 ${SKILLS[validSkill(k)].name}`; s.style.color = SKILL_COLOR[k] || '#fff'; items.append(s); }
    for (const k of g.skins) { const sk = SKIN_INFO.SKINS[k]; if (!sk) continue; const s = document.createElement('span'); s.textContent = `스킨 ${sk.name}`; s.style.color = sk.color; items.append(s); }
    const left = document.createElement('small'); left.textContent = ` · ${fmtLeft(g.ends - Date.now())} 남음`; items.append(left);
    shopCard(pk, 'linear-gradient(135deg,#ffd23f,#ff7ac8)', g.name, g.desc, `구매 · 보석 ${g.price}`, g.owned, () => shopBuy('pkg', g.id, g.name, g.price), items);
  }
  const ss = $('shopSkins'); ss.textContent = '';
  for (const it of d.skins) {
    const sk = SKIN_INFO.SKINS[it.id]; if (!sk) continue;
    shopCard(ss, sk.color, `${sk.name} (${SKILLS[validSkill(sk.skill)].name} 스킨)`, sk.desc, `<span class="old-price">${it.normal}</span>보석 ${it.price}`, it.owned, () => shopBuy('skin', it.id, sk.name, it.price), null, () => openDetail({ skill: validSkill(sk.skill), skin: it.id }), it.id);
  }
  const sl = $('shopSkills'); sl.textContent = '';
  for (const it of d.skills) {
    const k = validSkill(it.id);
    shopCard(sl, SKILL_COLOR[k], `${SKILLS[k].name} (스킬)`, SKILLS[k].desc, `보석 ${it.price}`, it.owned, () => shopBuy('skill', it.id, SKILLS[k].name, it.price), null, () => openDetail({ skill: k }));
  }
}
async function shopBuy(kind, id, name, price) {
  const p = account.profile; if (!p) return;
  if (p.gems < price) { $('shopMsg').style.color = 'var(--danger)'; $('shopMsg').textContent = `보석이 ${price - p.gems}개 모자라요.`; return; }
  if (!confirm(`${name}을(를) 보석 ${price}개로 살까요?\n(지금 보석 ${p.gems}개)`)) return;
  try {
    const r = await api('/api/shop/buy', { kind, id });
    account.profile = r.profile; shopData = r.shop;
    $('shopMsg').style.color = 'var(--gem)'; $('shopMsg').textContent = `${name} 구매 완료!`;
    renderAccount(); renderShop();
  } catch (e) { $('shopMsg').style.color = 'var(--danger)'; $('shopMsg').textContent = e.message; loadShop(); }
}
$('shopBtn').addEventListener('click', async () => { $('shopMsg').textContent = ''; $('shopModal').hidden = false; renderShop(); await loadShop(); renderShop(); });
// ---------------- 미니게임 (상점 밑) ----------------
// 미니게임은 같은 사이트의 /chess/ 를 전체 화면 창으로 띄움 → 로그인·보석이 그대로 이어짐
$('miniBtn').addEventListener('click', () => { $('miniModal').hidden = false; });
$('miniClose').addEventListener('click', () => { $('miniModal').hidden = true; });
$('miniModal').addEventListener('click', (e) => { if (e.target === $('miniModal')) $('miniModal').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('miniModal').hidden) $('miniModal').hidden = true; });
function openMini(path) {
  const guest = !account.profile ? cleanNick($('gNick').value) : '';
  $('miniModal').hidden = true;
  $('miniFrame').src = path + (guest ? (path.includes('?') ? '&' : '?') + 'guest=' + encodeURIComponent(guest) : '');
  $('miniFrameWrap').hidden = false;
  document.body.classList.add('mini-on');
}
async function closeMini() {
  $('miniFrameWrap').hidden = true;
  $('miniFrame').src = 'about:blank';
  document.body.classList.remove('mini-on');
  // 미니게임에서 로그인·로그아웃했거나 보석을 받았을 수 있으니 계정을 새로 불러옴
  let t = null;
  try { t = localStorage.getItem('brawl_token'); } catch (e) {}
  account.token = t;
  if (!t) account.profile = null;
  else {
    try { account.profile = (await api('/api/me')).profile; }
    catch (e) { if (e.status === 401) { account.token = null; account.profile = null; } }
  }
  renderAccount();
}
$('miniChess').addEventListener('click', () => openMini('/chess/'));
$('miniOnecard').addEventListener('click', () => openMini('/cards/?game=onecard'));
$('miniPoker').addEventListener('click', () => openMini('/cards/?game=poker'));
addEventListener('message', (e) => { if (e.origin === location.origin && e.data && e.data.t === 'closeMini') closeMini(); });

$('shopClose').addEventListener('click', () => { $('shopModal').hidden = true; });
$('shopModal').addEventListener('click', (e) => { if (e.target === $('shopModal')) $('shopModal').hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('shopModal').hidden) $('shopModal').hidden = true; });
$('shopDaily').addEventListener('click', async () => {
  try {
    const r = await api('/api/shop/daily', {});
    account.profile = r.profile; shopData = r.shop;
    $('shopMsg').style.color = 'var(--gem)'; $('shopMsg').textContent = `일일 보상 보석 ${r.gained}개를 받았어요!`;
    renderAccount(); renderShop(); $('shopDot').hidden = true;
  } catch (e) { $('shopMsg').style.color = 'var(--danger)'; $('shopMsg').textContent = e.message; }
});
// 잠긴 스킬 사기 (보석 1000개)
async function buySkillAsk(skill) {
  const p = account.profile, msg = $('gachaMsg');
  if (!p) return;
  const name = SKILLS[skill].name;
  msg.dataset.keep = '1';
  if (p.gems < SKILL_BUY) { msg.style.color = 'var(--danger)'; msg.textContent = `${name} 사기: 보석이 ${SKILL_BUY - p.gems}개 모자라요 (${SKILL_BUY}개 필요).`; setTimeout(() => { msg.dataset.keep = ''; }, 4000); return; }
  if (!confirm(`${name} 스킬을 보석 ${SKILL_BUY}개로 살까요?\n(지금 보석 ${p.gems}개)`)) { msg.dataset.keep = ''; return; }
  try {
    const r = await api('/api/skill/buy', { skill });
    account.profile = r.profile;
    msg.style.color = SKILL_COLOR[skill]; msg.textContent = `${name} 구매 완료!`;
    renderAccount(); selectSkill(skill, true);
  } catch (err) { msg.style.color = 'var(--danger)'; msg.textContent = err.message; renderAccount(); }
  setTimeout(() => { msg.dataset.keep = ''; }, 4000);
}
renderAccount(); // 스킬 버튼을 만든 뒤 잠금 상태 반영

// =====================================================================
//  서버 연결
// =====================================================================
let ws = null, myId = null, online = false, inGame = false, lastPh = null;
const swingSeen = new Map();   // 플레이어별 직전 공격 상태 (검 휘두르는 소리용)
// 소리 켜기/끄기 (로비와 게임 화면 둘 다)
function renderSnd() {
  const o = window.SFX ? SFX.get() : { bgm: false, sfx: false };
  for (const b of document.querySelectorAll('.snd-btn')) {
    const on = o[b.dataset.snd]; b.classList.toggle('off', !on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.title = (b.dataset.snd === 'bgm' ? '배경음악 ' : '효과음 ') + (on ? '끄기' : '켜기');
  }
}
for (const b of document.querySelectorAll('.snd-btn')) b.addEventListener('click', (e) => {
  e.currentTarget.blur(); if (!window.SFX) return;
  SFX.init(); SFX.set(b.dataset.snd, !SFX.get()[b.dataset.snd]); renderSnd();
});
renderSnd();

// ---------- 설정 창: 소리 크기 · 모바일 버튼 위치/크기 ----------
const TDEF = { ms: 100, as: 100 };
const tset = (() => {
  let o = {}; try { o = JSON.parse(localStorage.getItem('brawlTouch') || '{}') || {}; } catch (_) {}
  return { ms: +o.ms || 100, as: +o.as || 100, pos: (o.pos && typeof o.pos === 'object') ? o.pos : {} };
})();
// 위치는 가로/세로 화면 따로 저장: pos[land|port][move|a|h|u|s|e|x] = [dx, dy] (화면 px, 원래 자리에서 옮긴 만큼)
const tOrient = () => innerWidth > innerHeight ? 'land' : 'port';
const tPos = () => (tset.pos[tOrient()] = tset.pos[tOrient()] || {});
const tScale = (k) => Math.max(70, Math.min(170, +tset[k] || 100)) / 100;
function applyTouchLayout() {
  const P = tPos(), sm = tScale('ms'), sa = tScale('as');
  const mv = $('tgMove'), ac = $('tgAct'); if (!mv || !ac) return;
  const m = P.move || [0, 0];
  mv.style.setProperty('--ts', sm); mv.style.setProperty('--tx', m[0] + 'px'); mv.style.setProperty('--ty', m[1] + 'px');
  ac.style.setProperty('--ts', sa);
  // 공격 묶음은 크기만 묶음째로 → 버튼별 이동은 묶음 배율로 나눠서 화면 px 그대로 움직이게
  for (const b of ac.querySelectorAll('.tbtn')) {
    const d = P[b.dataset.k] || [0, 0];
    b.style.transform = d[0] || d[1] ? `translate(${(d[0] / sa).toFixed(1)}px, ${(d[1] / sa).toFixed(1)}px)` : '';
  }
}
function saveTouch() { try { localStorage.setItem('brawlTouch', JSON.stringify(tset)); } catch (_) {} }
applyTouchLayout(); addEventListener('resize', applyTouchLayout);
function renderSet() {
  const o = window.SFX ? SFX.get() : { bv: 1, sv: 1 };
  $('setBv').value = Math.round((o.bv ?? 1) * 100); $('setBvO').textContent = $('setBv').value + '%';
  $('setSv').value = Math.round((o.sv ?? 1) * 100); $('setSvO').textContent = $('setSv').value + '%';
  for (const r of document.querySelectorAll('#setModal input[data-t]')) { r.value = tset[r.dataset.t]; r.nextElementSibling.textContent = r.value + '%'; }
  for (const b of document.querySelectorAll('#setModal .snd-btn')) b.textContent = b.classList.contains('off') ? '꺼짐' : '켜짐';
}
function openSet() { renderSnd(); renderSet(); $('setModal').hidden = false; }
function closeSet() { $('setModal').hidden = true; document.body.classList.remove('tpreview'); }
for (const b of document.querySelectorAll('.set-btn')) b.addEventListener('click', (e) => { e.currentTarget.blur(); openSet(); });
$('setClose').addEventListener('click', closeSet); $('setOk').addEventListener('click', closeSet);
$('setModal').addEventListener('click', (e) => { if (e.target === $('setModal')) closeSet(); });
for (const [id, k] of [['setBv', 'bv'], ['setSv', 'sv']]) $(id).addEventListener('input', (e) => {
  if (!window.SFX) return; SFX.init();
  SFX.vol(k, e.target.value / 100);
  if (+e.target.value > 0 && !SFX.get()[k === 'bv' ? 'bgm' : 'sfx']) SFX.set(k === 'bv' ? 'bgm' : 'sfx', true);   // 올리면 자동으로 켜짐
  renderSnd(); renderSet();
});
$('setSv').addEventListener('change', () => { if (window.SFX) SFX.play('hit'); });   // 효과음 크기 확인용
for (const r of document.querySelectorAll('#setModal input[data-t]')) r.addEventListener('input', () => {
  tset[r.dataset.t] = +r.value; saveTouch(); applyTouchLayout(); renderSet();
  document.body.classList.add('tpreview');
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('setModal').hidden) closeSet(); });
function resetTouch() { tset.ms = tset.as = 100; tset.pos = {}; saveTouch(); applyTouchLayout(); }
$('setReset').addEventListener('click', () => { resetTouch(); renderSet(); document.body.classList.add('tpreview'); });
for (const b of document.querySelectorAll('#setModal .snd-btn')) b.addEventListener('click', () => setTimeout(renderSet, 0));

// ---------- 버튼 위치 편집: 끌어서 옮기기 ----------
let tEditing = false, tDrag = null;
function startTouchEdit() {
  closeSet(); tEditing = true; touchMap.clear(); refreshTouch();
  document.body.classList.add('tedit'); $('tEditBar').hidden = false;
}
function endTouchEdit() {
  tEditing = false; tDrag = null; document.body.classList.remove('tedit'); $('tEditBar').hidden = true;
  document.querySelectorAll('.tbtn.drag').forEach((b) => b.classList.remove('drag'));
  saveTouch(); openSet();
}
$('setEdit').addEventListener('click', startTouchEdit);
$('tEditDone').addEventListener('click', endTouchEdit);
$('tEditReset').addEventListener('click', () => { tset.pos[tOrient()] = {}; saveTouch(); applyTouchLayout(); });
addEventListener('keydown', (e) => { if (tEditing && (e.key === 'Escape' || e.key === 'Enter')) { e.preventDefault(); endTouchEdit(); } });
addEventListener('pointerdown', (e) => {
  if (!tEditing) return;
  const b = e.target.closest && e.target.closest('#touch .tbtn'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const isMove = !!b.closest('#tgMove'), key = isMove ? 'move' : b.dataset.k;
  const els = isMove ? [...$('tgMove').querySelectorAll('.tbtn')] : [b];
  // 화면 밖으로 못 나가게: 끌기 시작할 때 버튼(묶음)이 차지하는 영역
  const rs = els.map((el) => el.getBoundingClientRect());
  const box = { l: Math.min(...rs.map((r) => r.left)), r: Math.max(...rs.map((r) => r.right)), t: Math.min(...rs.map((r) => r.top)), b: Math.max(...rs.map((r) => r.bottom)) };
  tDrag = { id: e.pointerId, key, els, sx: e.clientX, sy: e.clientY, d0: (tPos()[key] || [0, 0]).slice(), box };
  els.forEach((el) => el.classList.add('drag'));
  try { b.setPointerCapture(e.pointerId); } catch (_) {}
}, true);
addEventListener('pointermove', (e) => {
  if (!tDrag || e.pointerId !== tDrag.id) return;
  e.preventDefault();
  const { box } = tDrag, pad = 4;
  const ddx = Math.max(pad - box.l, Math.min(innerWidth - pad - box.r, e.clientX - tDrag.sx));
  const ddy = Math.max(pad - box.t, Math.min(innerHeight - pad - box.b, e.clientY - tDrag.sy));
  tPos()[tDrag.key] = [Math.round(tDrag.d0[0] + ddx), Math.round(tDrag.d0[1] + ddy)];
  applyTouchLayout();
}, true);
const tDragEnd = (e) => {
  if (!tDrag || e.pointerId !== tDrag.id) return;
  tDrag.els.forEach((el) => el.classList.remove('drag')); tDrag = null; saveTouch();
};
addEventListener('pointerup', tDragEnd, true); addEventListener('pointercancel', tDragEnd, true);
let snapshots = [], latest = null, lastEvSeen = 0, pingMs = null;

try { $('roomcode').value = localStorage.getItem('brawl_room') || ''; } catch (e) {}
if (isTouch) { $('keysPc').hidden = true; $('keysTouch').hidden = false; }
$('playBtn').addEventListener('click', () => enter());
['gNick', 'roomcode', 'roomTitle'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') enter(); }));
$('exitBtn').addEventListener('click', () => { location.reload(); });
// 모바일: 두 번 탭·두 손가락으로 화면이 확대되는 것 막기 (삼성 인터넷 등 user-scalable=no를 무시하는 브라우저 포함)
{
  let lastTap = 0, lastEl = null;
  document.addEventListener('touchend', (e) => {
    const now2 = Date.now(), el = e.target;
    if (now2 - lastTap < 400 && !el.closest('input, textarea, select')) {
      e.preventDefault();   // 확대 막기
      // 버튼·링크는 두 번째 탭도 눌린 것으로 처리 (preventDefault 때문에 click이 안 생기므로 직접)
      const btn = el.closest('button, a, label, [role="button"]');
      if (btn && !btn.disabled && !el.closest('#touch')) btn.click();
    }
    lastTap = now2; lastEl = el;
  }, { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  // 두 손가락 확대(핀치) 막기 — 게임 버튼을 여러 손가락으로 누르는 건 포인터 이벤트라 그대로 됨
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  // 게임 화면·게임 버튼: 터치 기본 동작(확대·스크롤·길게 누르기 메뉴)을 아예 끔
  for (const id of ['touch', 'game']) $(id).addEventListener('touchstart', (e) => { if (!e.target.closest('input, textarea, select')) e.preventDefault(); }, { passive: false });
  // 그래도 확대돼 버렸으면 원래 크기로 되돌림
  const vp = document.querySelector('meta[name=viewport]');
  const unzoom = () => {
    if (!window.visualViewport || window.visualViewport.scale <= 1.01 || !vp) return;
    const c = vp.getAttribute('content');
    vp.setAttribute('content', c.replace(/maximum-scale=[\d.]+/, 'maximum-scale=1.01'));
    setTimeout(() => vp.setAttribute('content', c), 60);
  };
  if (window.visualViewport) window.visualViewport.addEventListener('resize', unzoom);
}
try { const km = sessionStorage.getItem('kickMsg'); if (km) { sessionStorage.removeItem('kickMsg'); $('err').textContent = km; } } catch (_) {}

// ---------------- 방 고르기 (공개 방 목록 · 방 만들기 · 초대 코드) ----------------
let roomTab = 'list';
function setRoomTab(tab) {
  roomTab = tab;
  for (const [t, id] of [['list', 'rtList'], ['create', 'rtCreate'], ['code', 'rtCode']]) $(id).setAttribute('aria-selected', String(t === tab));
  $('rpList').hidden = tab !== 'list';
  $('rpCreate').hidden = tab !== 'create';
  $('rpCode').hidden = tab !== 'code';
  $('playBtn').textContent = tab === 'list' ? '빠른 입장' : tab === 'create' ? '공개 방 만들기' : '코드로 입장';
  $('err').textContent = '';
  if (tab === 'list') loadRooms();
}
$('rtList').addEventListener('click', () => setRoomTab('list'));
$('rtCreate').addEventListener('click', () => setRoomTab('create'));
$('rtCode').addEventListener('click', () => setRoomTab('code'));

const PHASE_KO = { waiting: '대기 중', countdown: '곧 시작', playing: '게임 중', ended: '결과 화면' };
async function loadRooms() {
  try {
    const r = await api('/api/rooms');
    $('onlineNow').textContent = r.online;
    const ul = $('roomList');
    ul.textContent = '';
    for (const room of r.rooms || []) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'room-btn';
      const full = room.players >= room.max;
      b.disabled = full;
      const t = document.createElement('span'); t.className = 't'; t.textContent = room.title;
      const c = document.createElement('span'); c.className = 'c'; c.textContent = full ? '꽉 참' : `${room.players}/${room.max}명`;
      const st = document.createElement('span'); st.className = 's';
      st.textContent = `방장 ${room.host || '-'} · ${PHASE_KO[room.phase] || ''}${room.bots ? ` · 봇 ${room.bots}` : ''}`;
      b.append(t, c, st);
      b.addEventListener('click', () => enter({ mode: 'listed', room: room.code }));
      li.append(b);
      ul.append(li);
    }
    $('roomEmpty').hidden = (r.rooms || []).length > 0;
  } catch (e) {}
}
loadRooms();
setInterval(() => { if (!$('lobby').hidden && roomTab === 'list') loadRooms(); }, 5000);

function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

function enter(pick) {
  if (ws) return;
  if (!account.profile && authTab !== 'guest') { $('err').textContent = '먼저 로그인하거나, 게스트 탭에서 닉네임을 정해 주세요.'; return; }
  const guest = cleanNick($('gNick').value);
  if (!account.profile && guest.length < 2) { $('err').textContent = '닉네임은 2~12자로 써 주세요.'; return; }

  let join;
  if (pick) join = pick;
  else if (roomTab === 'create') join = { mode: 'create', title: $('roomTitle').value.trim().slice(0, 20) };
  else if (roomTab === 'code') {
    const code = $('roomcode').value.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{0,19}$/.test(code)) { $('err').textContent = '초대 코드는 영어 소문자와 숫자로 써 주세요.'; return; }
    try { localStorage.setItem('brawl_room', code); } catch (e) {}
    join = { mode: 'code', room: code };
  } else join = { mode: 'quick' };

  $('err').textContent = '연결 중…';
  $('playBtn').disabled = true;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => send({ t: 'join', ...join, mob: isTouch ? 1 : 0, skill: account.skill, ...(account.profile ? { token: account.token } : { guest }) });
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  ws.onclose = () => {
    online = false;
    if (inGame) $('net').textContent = '서버와 연결이 끊겼어요 · 오른쪽 위 "나가기"를 눌러 다시 들어와 주세요';
    else {
      ws = null;
      if ($('err').textContent === '연결 중…') $('err').textContent = '서버에 연결할 수 없어요. 잠시 후 다시 해 주세요.';
      $('playBtn').disabled = false;
    }
  };
}

function onMessage(m) {
  if (m.t === 'welcome') {
    myId = m.id; online = true; inGame = true;
    $('lobby').hidden = true; $('bar').hidden = false; $('net').hidden = false;
    $('roomLabel').textContent = m.isPublic ? `공개 · ${m.title}` : `초대 코드: ${m.room}`;
    if (isTouch) $('touch').hidden = false;
    resize();
    setInterval(() => send({ t: 'ping', c: performance.now() }), 2000);
  } else if (m.t === 'kicked') {
    // 관리자가 방을 삭제함: 로비로 돌아가서 안내
    try { sessionStorage.setItem('kickMsg', m.msg || '방이 삭제됐어요.'); } catch (_) {}
    inGame = false; location.reload();
  } else if (m.t === 'error') {
    $('err').textContent = m.msg;
    $('playBtn').disabled = false;
    if (!inGame && ws) { const w = ws; ws = null; w.onclose = null; w.close(); loadRooms(); }
  } else if (m.t === 'pong') {
    pingMs = Math.round(performance.now() - m.c);
  } else if (m.t === 'notice') {
    banners.push({ text: m.msg, life: 2, max: 2, small: true, color: '#ff9b9b' });
  } else if (m.t === 'report') {
    // 관리자: 새 버그 제보 알림
    banners.push({ text: `🐞 새 버그 제보 · ${m.report.nick || m.report.guest}`, life: 3, max: 3, small: true, color: '#ffd36b' });
    if (adminLoaded) adminReports();
  } else if (m.t === 'profile') {
    account.profile = m.profile;
    renderAccount();
    if (m.gained) banners.push({ text: `보석 +${m.gained}`, life: 2.2, max: 2.2, small: true, color: '#5ef2ff' });
  } else if (m.t === 's') {
    m.time = performance.now();
    snapshots.push(m);
    if (snapshots.length > 30) snapshots.shift();
    latest = m;
    if (m.mp && m.mp !== STAGE.id) STAGE = MAPS.find((x) => x.id === m.mp) || STAGE;
    updateRoomPanel(m);
    // 방장만 봇 추가/빼기 버튼이 보임
    if (m.host !== hostLive || isHost !== (m.host === myId)) {
      hostLive = m.host;
      isHost = m.host === myId;
      $('botAdd').hidden = !isHost;
      $('botDel').hidden = !isHost;
      $('dumAdd').hidden = !isHost;
      $('dumDel').hidden = !isHost;
    }
    const meS = m.p.find((q) => q.id === myId);
    // 검사: 공격을 시작하는 순간 휘두르는 소리 (약공격 = 전진베기, 강공격 = 크게 휘두르기)
    if (window.SFX) for (const q of m.p) {
      const was = swingSeen.get(q.id) || 0;
      if (q.at && !was && (q.sk === 'sword' || q.sk2 === 'sword') && q.al) SFX.at(q.at === 2 ? 'sword' : 'lunge', q.x, q.y, meS);
      swingSeen.set(q.id, q.at || 0);
    }
    for (const e of m.ev || []) if (e.i > lastEvSeen) { lastEvSeen = e.i; onEvent(e); if (window.SFX) SFX.event(e, meS, STAGE.width); }
    // 배경음악: 게임 중엔 신나게, 대기실은 잔잔하게 / 판이 끝나면 승리 음악
    if (window.SFX) { SFX.mode(m.ph === 'playing' ? 'battle' : 'calm'); if (m.ph === 'ended' && lastPh === 'playing') SFX.play('win'); }
    lastPh = m.ph;
  }
}

$('botAdd').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: true }); });
$('botDel').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: false }); });
$('dumAdd').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: true, dummy: true }); });
$('dumDel').addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'bot', add: false, dummy: true }); });

// ---------------- 입력 ----------------
const input = EMPTY_INPUT();
const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', Space: 'u', ArrowDown: 'd', KeyS: 'd',
  KeyJ: 'a', KeyZ: 'a', KeyK: 'h', KeyX: 'h', KeyQ: 's', KeyL: 's', KeyE: 'e', KeyI: 'e', KeyR: 'x', KeyO: 'x',
};
// 아주 짧게 눌러도 놓치지 않도록 최소 90ms는 눌린 상태로 유지
const downAt = {}, releaseTimers = {};
function setKey(k, v) {
  if (v) { clearTimeout(releaseTimers[k]); if (!input[k]) downAt[k] = performance.now(); }
  else if (input[k]) {
    const held = performance.now() - (downAt[k] || 0);
    if (held < 90) { clearTimeout(releaseTimers[k]); releaseTimers[k] = setTimeout(() => applyKey(k, 0), 90 - held); return; }
  }
  applyKey(k, v);
}
function applyKey(k, v) {
  if (input[k] === v) return;
  input[k] = v;
  send({ t: 'input', ...input });
}
// 촉수: H·J·K·L이 촉수 1~4 (원래 J·K·L의 약/강/스킬 대신)
const TENT_KEYS = { KeyH: 't1', KeyJ: 't2', KeyK: 't3', KeyL: 't4' };
const keyHeld = {};   // 누른 키가 어떤 입력으로 들어갔는지 (뗄 때 같은 걸 뗌)
function iHaveTentacle() { const me = latest && latest.p.find((q) => q.id === myId); return !!me && (me.sk === 'tentacle' || me.sk2 === 'tentacle'); }
addEventListener('keydown', (e) => {
  if (!$('lobby').hidden) return;
  const k = KEYMAP[e.code];   // 촉수도 J(위 촉수)·K(아래 촉수) 두 개로
  if (k) { e.preventDefault(); keyHeld[e.code] = k; setKey(k, 1); }
});
addEventListener('keyup', (e) => { const k = keyHeld[e.code] || KEYMAP[e.code]; delete keyHeld[e.code]; if (k) setKey(k, 0); });
addEventListener('blur', () => Object.keys(input).forEach((k) => setKey(k, 0)));

// 터치: 여러 손가락 동시 입력, 버튼 사이로 미끄러져도 따라감
const touchMap = new Map(); // pointerId -> key
function keyAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const b = el && el.closest && el.closest('.tbtn');
  return b ? b.dataset.k : null;
}
function refreshTouch() {
  const held = new Set(touchMap.values());
  document.querySelectorAll('.tbtn').forEach((b) => {
    const on = held.has(b.dataset.k);
    b.classList.toggle('on', on);
    setKey(b.dataset.k, on ? 1 : 0);
  });
}
const touchEl = $('touch');
touchEl.addEventListener('pointerdown', (e) => {
  if (tEditing) return;
  const k = keyAt(e.clientX, e.clientY);
  if (!k) return;
  e.preventDefault();
  touchMap.set(e.pointerId, k); refreshTouch();
});
addEventListener('pointermove', (e) => {
  if (!touchMap.has(e.pointerId)) return;
  const k = keyAt(e.clientX, e.clientY);
  const prev = touchMap.get(e.pointerId);
  // 이동 버튼끼리, 그리고 공격(약·강) → 스킬로 미끄러지는 것만 됨 (공격 연타 방지)
  //  약을 누른 엄지를 그대로 스킬 버튼으로 쓱 올리면 흑섬 타이밍 맞추기가 쉬움
  if (k && k !== prev && (('lrd'.includes(k) && 'lrd'.includes(prev)) || ('ah'.includes(prev) && 'sex'.includes(k)))) { touchMap.set(e.pointerId, k); refreshTouch(); }
});
const endTouch = (e) => { if (touchMap.delete(e.pointerId)) refreshTouch(); };
addEventListener('pointerup', endTouch);
addEventListener('pointercancel', endTouch);
touchEl.addEventListener('contextmenu', (e) => e.preventDefault());

// =====================================================================
//  화면 그리기
// =====================================================================
let canvas = $('game');
let ctx = canvas.getContext('2d');   // 스킬 상세 영상을 그릴 땐 잠깐 다른 캔버스로 바뀜
const W = 1280, H = 720, PW = 40, PH = 60, INTERP_DELAY = 70;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let particles = [], shake = 0, banners = [];
let bubPrev = {};   // 비눗방울 결계: 지난 화면에 있던 방울 (사라지면 퐁 터뜨림)

function onEvent(ev) {
  if (ev.k === 'hit') {
    const n = ev.p === 2 ? 22 : ev.p === 0 ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 150 + Math.random() * (ev.p === 2 ? 520 : 320);
      const c = ev.cg ? (i % 2 ? '#3ccf6e' : '#b8ffc8') : ev.fx === 'carnage' ? (i % 3 ? '#c4161c' : '#3a0408') : ev.fx === 'venom' ? (i % 3 ? '#14101a' : '#5a5466') : ev.fx === 'redwind' ? (i % 2 ? '#ff4a26' : '#ffb08a') : ev.fx === 'rainbow' ? `hsl(${(i * 37) % 360},95%,62%)` : ev.p === 2 ? '#ffcf3f' : '#ffffff';
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, c, r: ev.p === 2 ? 5 : 3.5 });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.25, max: 0.25, r: ev.p === 2 ? 70 : 42, c: '255,255,255' });
    shake = Math.max(shake, ev.p === 2 ? 12 : 5);
  } else if (ev.k === 'ko') {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = 200 + Math.random() * 700;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7, max: 0.7, c: i % 2 ? '#ff5a5f' : '#ffcf3f', r: 6 });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 220, c: '255,255,255' });
    shake = 22;
    banners.push({ text: `${ev.n} 장외!`, life: 1.2, max: 1.2, small: true });
  } else if (ev.k === 'shotgun') {
    if (ev.cn) {   // 대포: 발사할 때 연기가 크게 피어오름
      particles.push({ ring: true, fill: true, x: ev.x + ev.f * 20, y: ev.y, life: 0.3, max: 0.3, r: 60, c: '120,120,130', grow: true });
      for (let i = 0; i < 8; i++) particles.push({ x: ev.x + ev.f * 14, y: ev.y, vx: ev.f * (40 + Math.random() * 120), vy: -30 - Math.random() * 80, life: 0.9, max: 0.9, c: 'rgba(150,150,160,0.55)', r: 8 + Math.random() * 6, nograv: true });
    }
    particles.push({ ring: true, fill: true, x: ev.x + ev.f * 10, y: ev.y, life: 0.15, max: 0.15, r: 34, c: '255,220,130', grow: true });
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x, y: ev.y, vx: ev.f * (200 + Math.random() * 300), vy: (Math.random() - 0.5) * 200, life: 0.2, max: 0.2, c: i % 2 ? '#ffe9a0' : '#ff9a3a', r: 3, nograv: true });
    for (let i = 0; i < 4; i++) particles.push({ x: ev.x - ev.f * 10, y: ev.y, vx: -ev.f * 60 + (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, life: 0.7, max: 0.7, c: 'rgba(200,200,210,0.6)', r: 8, nograv: true });
    shake = Math.max(shake, 7);
  } else if (ev.k === 'reload') {
    if (ev.pid === myId) banners.push({ text: '장전 완료 ●●●●●', life: 0.9, max: 0.9, small: true, color: '#ffcf3f' });
    for (let i = 0; i < 3; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 60, life: 0.5, max: 0.5, c: '#d8452a', r: 4 });
  } else if (ev.k === 'sgempty') {
    if (ev.pid === myId) banners.push({ text: '탄이 없어요! Q로 장전', life: 0.8, max: 0.8, small: true, color: '#ff9b9b' });
  } else if (ev.k === 'gemget') {
    particles.push({ txt: ev.dm ? `+${ev.n}💠` : `+${ev.n}💎`, x: ev.x, y: ev.y - 10, vx: 0, vy: -70, life: 0.9, max: 0.9, c: '#5ef2ff', nograv: true });
    if (ev.dm) for (let i = 0; i < 6; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0.6, max: 0.6, c: i % 2 ? '#e6fbff' : '#7fe9ff', r: 3, nograv: true });
  } else if (ev.k === 'gemrush') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 70, c: '94,242,255' });
    if (ev.pid === myId) banners.push({ text: '보석 2배!', life: 1, max: 1, small: true, color: '#5ef2ff' });
  } else if (ev.k === 'rush') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 60, c: '255,150,70' });
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x - ev.f * 20, y: ev.y + (Math.random() - 0.5) * 40, vx: -ev.f * (150 + Math.random() * 200), vy: (Math.random() - 0.5) * 60, life: 0.35, max: 0.35, c: i % 2 ? '#ffb070' : '#fff0d8', r: 4, nograv: true });
  } else if (ev.k === 'rushturn' || ev.k === 'rushgrab') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.22, max: 0.22, r: 45, c: '255,180,100' });
  } else if (ev.k === 'rushhit') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 90, c: '255,140,60', grow: true }); shake = Math.max(shake, 12);
  } else if (ev.k === 'hop') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 60, c: '127,224,255' });
    for (let i = 0; i < 12; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 40, y: ev.y, vx: (Math.random() - 0.5) * 160, vy: -100 - Math.random() * 200, life: 0.5, max: 0.5, c: i % 2 ? '#bff4ff' : '#7fe0ff', r: 4, nograv: true });
  } else if (ev.k === 'portalmake') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 60, c: '160,130,255' });
  } else if (ev.k === 'portal' || ev.k === 'portalgo') {
    for (const [x, y] of [[ev.x, ev.y], [ev.x2, ev.y2]]) {
      particles.push({ ring: true, x, y, life: 0.45, max: 0.45, r: 70, c: '180,150,255' });
      for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 180; particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: i % 2 ? '#e0d8ff' : '#7a5cff', r: 4, nograv: true }); }
    }
  } else if (ev.k === 'chargemode') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 70, c: ev.m ? '60,220,110' : '255,60,50', grow: true });
    if (ev.pid === myId) banners.push({ text: ev.m ? '충전 모드' : '공격 모드', life: 0.9, max: 0.9, small: true, color: ev.m ? '#5ef08a' : '#ff6a5a' });
  } else if (ev.k === 'chargeup') {
    for (let i = 0; i < 5; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, life: 0.5, max: 0.5, c: '#7cf5a0', r: 3, nograv: true });
  } else if (ev.k === 'wave' && skinPid(ev.pid, 'electric')) {
    // 전기: 파동 대신 사방으로 번개가 튐
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 240, c: '120,200,255', grow: true });
    for (let i = 0; i < 18; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 120 + Math.random() * 140, life: 0.35, max: 0.35, c: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffe94a' : '#5ac8ff' });
    lightFlash = 0.15; lightBlue = true; shake = Math.max(shake, 10);
  } else if (ev.k === 'wave') {
    for (let i = 0; i < 3; i++) particles.push({ ring: true, grow: true, x: ev.x, y: ev.y, life: 0.45 + i * 0.12, max: 0.45 + i * 0.12, r: 240, c: '95,224,255' });
    shake = Math.max(shake, 9);
  } else if (ev.k === 'drink') {
    const c = DOPE_RGB[ev.d] || '255,255,255';
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 50, c });
    for (let i = 0; i < 12; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, life: 0.6, max: 0.6, c: `rgb(${c})`, r: 4, nograv: true });
    if (ev.pid === myId) banners.push({ text: `${DOPE_NAMES[ev.d]} 강화!`, life: 1.1, max: 1.1, small: true, color: `rgb(${c})` });
  } else if (ev.k === 'dopebad') {
    if (ev.pid === myId) banners.push({ text: '약화... (다른 물약을 먹으면 풀려요)', life: 1.3, max: 1.3, small: true, color: '#a89cc0' });
  } else if (ev.k === 'potland') {
    for (let i = 0; i < 5; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80, life: 0.3, max: 0.3, c: '#e8f4ff', r: 3 });
  } else if (ev.k === 'flash') {
    if (ev.cam) {
      // 플래시 카메라: 여러 겹의 하얀 빛이 한 번에 터짐
      for (const r of [200, 320, 480]) particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r, c: '255,255,255', grow: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 300, c: '255,250,210' });
    for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 500; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: i % 2 ? '#ffffff' : '#fff3a0', r: 4, nograv: true }); }
    shake = Math.max(shake, 10);
  } else if (ev.k === 'flood') {
    banners.push({ text: ev.ch ? '초코가 차오른다!' : ev.lava ? '용암이 차오른다!' : '홍수!', life: 1.3, max: 1.3, small: true, color: ev.lava ? '#ff8a3d' : '#7fc8ff' });
  } else if (ev.k === 'floodfull') {
    banners.push({ text: ev.lava ? '용암이 가득 찼다! 10초 뒤 빠져요' : '물이 가득 찼다! 10초 뒤 빠져요', life: 1.8, max: 1.8, small: true, color: ev.lava ? '#ff8a3d' : '#7fc8ff' });
  } else if (ev.k === 'flooddrain') {
    banners.push({ text: ev.lava ? '용암이 빠진다!' : '물이 빠진다!', life: 1.5, max: 1.5, small: true, color: ev.lava ? '#ff8a3d' : '#7fc8ff' });
  } else if (ev.k === 'boing') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, life: 0.3, max: 0.3, c: i % 2 ? '#ff3b4a' : '#2a7af0', r: 3 });
  } else if (ev.k === 'fizz') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 20, y: ev.y, vx: (Math.random() - 0.5) * 60, vy: -60 - Math.random() * 80, life: 0.6, max: 0.6, c: 'rgba(230,230,240,0.7)', r: 6, nograv: true });
  } else if (ev.k === 'kickout') {
    banners.push({ text: `${ev.n}님이 방에서 나갔어요 (추방)`, life: 1.8, max: 1.8, small: true, color: '#ffb3b3' });
  } else if (ev.k === 'randskill') {
    banners.push({ text: `🎲 이번 판 스킬: ${SKILLS[validSkill(ev.s)].name}${ev.s2 ? ' · ' + SKILLS[validSkill(ev.s2)].name : ''}`, life: 2.6, max: 2.6, small: true, color: '#ffe27a' });
  } else if (ev.k === 'block') {
    // 방패로 막음: 금빛 불꽃
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 200; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, c: i % 2 ? '#ffe27a' : '#ffffff', r: 3 }); }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.25, max: 0.25, r: 36, c: '255,230,140' });
  } else if (ev.k === 'shclang') {
    for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 160; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25, max: 0.25, c: '#ffe27a', r: 3 }); }
  } else if (ev.k === 'shlost') {
    banners.push({ text: '방패가 떨어졌어요 · 10초 뒤 다시 생겨요', life: 1.6, max: 1.6, small: true, color: '#c9a24a' });
  } else if (ev.k === 'shback' && ev.pid === myId) {
    banners.push({ text: '방패가 돌아왔어요', life: 1.2, max: 1.2, small: true, color: '#c9a24a' });
  } else if (ev.k === 'anchor') {
    for (let i = 0; i < 12; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 50, y: ev.y, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 200, life: 0.4, max: 0.4, c: '#6a5a7a', r: 5 });
  } else if (ev.k === 'ghost') {
    banners.push({ text: `👻 ${ev.n} 귀신이 됐다! (5초)`, life: 1.8, max: 1.8, small: true, color: '#d8d8f0' });
    for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140; particles.push({ x: ev.x, y: ev.y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7, c: 'rgba(220,220,255,0.8)', r: 6, nograv: true }); }
  } else if (ev.k === 'ghostmark') {
    for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 90; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.5, max: 0.5, c: '#b07aff', r: 4, nograv: true }); }
  } else if (ev.k === 'ghostkill') {
    banners.push({ text: `👻 ${ev.by}이(가) ${ev.n}을(를) 데려갔다!`, life: 2, max: 2, small: true, color: '#b07aff' });
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.6, max: 0.6, r: 140, c: '176,122,255' });
  } else if (ev.k === 'ghostend') {
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 100; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.8, max: 0.8, c: 'rgba(230,230,255,0.7)', r: 7, nograv: true }); }
  } else if (ev.k === 'kawarimi') {
    // 닌자 바꿔치기: 사라진 자리와 나타난 자리에 연기 (스노우: 눈가루)
    for (const [px, py] of [[ev.x, ev.y], [ev.tx, ev.ty]]) {
      for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160; particles.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.5, max: 0.5, c: ev.hw ? (i % 2 ? '#2a1030' : '#8a1a3a') : ev.sn ? (i % 2 ? '#ffffff' : '#cfeaff') : (i % 2 ? '#e8e8ee' : '#b8b8c4'), r: 7, nograv: true }); }
    }
    banners.push({ text: ev.hw ? '무덤 바꿔치기!' : ev.sn ? '눈사람 바꿔치기!' : '바꿔치기!', life: 0.9, max: 0.9, small: true, color: ev.hw ? '#ff6a8a' : ev.sn ? '#cfeaff' : '#c8d0e0' });
  } else if (ev.k === 'logpoof') {
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 100; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: ev.hw ? '#8a7aa8' : ev.sn ? '#ffffff' : '#d0d0d8', r: 6, nograv: true }); }
  } else if (ev.k === 'gamble') {
    // 도박: 주사위 + 결과
    const v = ev.v || [], lab = ['사거리', '넉백', '받는넉백', '점프', '속도', '크기'];
    if (skinPid(ev.pid, 'coin')) {
      // 동전: 위로 던져서 빙글빙글 돌다 떨어져 앞/뒤가 보임 (평균 배율이 1 이상이면 앞면)
      const avg = v.reduce((n, k) => n + Number(k), 0) / (v.length || 1);
      particles.push({ coin: true, x: ev.x, y: ev.y - 20, y0: ev.y - 20, life: 1.6, max: 1.6, head: avg >= 1 });
    }
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 220; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.6, max: 0.6, c: i % 3 ? '#3fd07a' : '#ffe27a', r: 4 }); }
    if (!ev.auto || ev.pid === myId) banners.push({ text: `🎲 ${ev.n} 도박! ` + lab.map((l, i) => `${l} ${Number(v[i]).toFixed(1)}`).join(' · '), life: 2.6, max: 2.6, small: true, color: '#3fd07a' });
  } else if (ev.k === 'starfall') {
    banners.push({ text: `별빛 ${'★'.repeat(ev.n)}`, life: 1.3, max: 1.3, small: true, color: '#ffe27a' });
  } else if (ev.k === 'starpop' && skinPid(ev.pid, 'hearts')) {
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2; particles.push({ txt: '♥', sz: 22, x: ev.x, y: ev.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 160, life: 0.6, max: 0.6, c: i % 2 ? '#ff6aa0' : '#ffb7d0', nograv: true }); }
  } else if (ev.k === 'starpop' && skinPid(ev.pid, 'meteor')) {
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 180; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.45, max: 0.45, c: i % 2 ? '#ff8a2a' : '#5a4030', r: 4 }); }
  } else if (ev.k === 'starpop') {
    for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 160; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, c: i % 2 ? '#ffe766' : '#fff8d0', r: 3.5, nograv: true }); }
  } else if (ev.k === 'jump' || ev.k === 'jump2') {
    for (let i = 0; i < 6; i++) {
      particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 60, life: 0.3, max: 0.3, c: ev.k === 'jump2' ? '#9fd8ff' : '#d8cfa8', r: 4 });
    }
  } else if (ev.k === 'slow') {
    const mud = !!ev.m;   // 늪 스킨: 갈색 늪이 퍼짐
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: mud ? 0.8 : 0.55, max: mud ? 0.8 : 0.55, r: ev.r, c: mud ? '110,80,40' : '127,184,255', grow: true });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      particles.push({ x: ev.x + Math.cos(a) * 30, y: ev.y + Math.sin(a) * 30, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380 + (mud ? 120 : 0), life: 0.45, max: 0.45, c: mud ? (i % 2 ? '#6b4a22' : '#9a7a44') : '#7fb8ff', r: mud ? 6 : 4, nograv: !mud });
    }
    if (ev.h > 0) banners.push({ text: mud ? `늪! ${ev.h}명` : `둔화! ${ev.h}명`, life: 1, max: 1, small: true, color: mud ? '#c49a5a' : '#7fb8ff' });
  } else if (ev.k === 'blink' && skinPid(ev.pid, 'blitz')) {
    // 번개 이동: 두 자리를 지그재그 노란 번개가 이음
    const dx = ev.x2 - ev.x, dy = ev.y2 - ev.y, len = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
    for (let i = 0; i < 3; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: a + (Math.random() - 0.5) * 0.08, len, life: 0.3, max: 0.3, c: i ? '#fff6a8' : '#ffe94a' });
    for (const [x, y] of [[ev.x, ev.y], [ev.x2, ev.y2]]) for (let i = 0; i < 10; i++) { const b = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260; particles.push({ x, y, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, life: 0.3, max: 0.3, c: i % 2 ? '#ffffff' : '#ffe94a', r: 3, nograv: true }); }
    lightFlash = Math.max(lightFlash, 0.08); lightBlue = false;
  } else if (ev.k === 'blink' && skinPid(ev.pid, 'moonwalk')) {
    // 문워크: 진행 방향을 등지고 뒤로 미끄러지는 잔상 + 발자국
    const pl = latest.p.find((q) => q.id === ev.pid), col = pl ? pl.c : '#ffffff', dir = Math.sign(ev.x2 - ev.x) || 1;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      particles.push({ mw: true, x: ev.x + (ev.x2 - ev.x) * t, y: ev.y + (ev.y2 - ev.y) * t, f: -dir, c: col, step: i, life: 0.2 + t * 0.4, max: 0.6 });
    }
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x2 + (Math.random() - 0.5) * 30, y: ev.y2 - 10, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 0.4, max: 0.4, c: i % 2 ? '#ffffff' : '#ffe27a', r: 3, nograv: true });
  } else if (ev.k === 'blink') {
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      particles.push({ ghost: true, x: ev.x + (ev.x2 - ev.x) * t, y: ev.y + (ev.y2 - ev.y) * t, life: 0.15 + t * 0.25, max: 0.4, c: '199,125,255' });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 200;
      particles.push({ x: ev.x2, y: ev.y2 - PH / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, c: '#e2b8ff', r: 4, nograv: true });
    }
  } else if (ev.k === 'poof' && ev.tw) {
    // 트와이스: 분신이 진흙처럼 녹아 바닥으로 퍼지며 사라짐
    particles.push({ goo: true, x: ev.x, y: ev.gy, life: 1.6, max: 1.6, c: ev.c || '#ff9ec8' });
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 120, life: 0.6, max: 0.6, c: ev.c || '#ff9ec8', r: 6 });
  } else if (ev.k === 'stealth' && ev.ck) {
    // 투명 망토를 머리 위에서 뒤집어씀
    particles.push({ cloakfall: true, x: ev.x, y: ev.y + 30, life: 0.55, max: 0.55 });
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 50, y: ev.y + (Math.random() - 0.5) * 50, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, life: 0.6, max: 0.6, c: '#e8f0ff', r: 3, nograv: true });
  } else if (ev.k === 'stealth' || ev.k === 'clone' || ev.k === 'poof') {
    // 연기 퍼프
    const col = ev.k === 'stealth' ? '#9fe8d6' : ev.k === 'clone' ? '#ffc4e1' : '#d9d3f0';
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.5, max: 0.5, c: col, r: 7, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 60, c: '255,255,255' });
  } else if (ev.k === 'swap' && skinPid(ev.pid, 'cards')) {
    // 카드 바꾸기: 두 자리에서 트럼프 무늬가 휙휙
    const SU = ['♠', '♥', '♦', '♣'];
    for (const [x, y] of [[ev.x, ev.y], [ev.x2, ev.y2]]) {
      particles.push({ ring: true, x, y, life: 0.3, max: 0.3, r: 40, c: '232,224,208' });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, su = SU[i % 4]; particles.push({ txt: su, sz: 30, x, y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 - 60, life: 0.7, max: 0.7, c: su === '♥' || su === '♦' ? '#ff3b4a' : '#1a1a24', nograv: true }); }
    }
  } else if (ev.k === 'swap' && ev.wh) {
    // 웜홀: 두 자리에 소용돌이 구멍 (테두리는 쓴 사람 색)
    for (const [x, y] of [[ev.x, ev.y], [ev.x2, ev.y2]]) particles.push({ worm: true, x, y, life: 0.8, max: 0.8, c: ev.c || '#b48cff' });
  } else if (ev.k === 'swap') {
    for (const [x, y] of [[ev.x, ev.y], [ev.x2, ev.y2]]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        particles.push({ x: x + Math.cos(a) * 34, y: y + Math.sin(a) * 34, vx: -Math.sin(a) * 260, vy: Math.cos(a) * 260, life: 0.45, max: 0.45, c: '#b48cff', r: 5, nograv: true });
      }
    }
  } else if (ev.k === 'fly') {
    for (let i = 0; i < 12; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 40, y: ev.y - 20, vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 80, life: 0.6, max: 0.6, c: '#eaf6ff', r: 5, nograv: true });
  } else if (ev.k === 'explode' && ev.nk) {
    // 핵폭발: 하얀 섬광 + 거대한 불기둥
    lightFlash = 0.35; lightBlue = false; shake = Math.max(shake, 26);
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.6, max: 0.6, r: ev.r * 1.4, c: '255,240,200', grow: true });
    for (let i = 0; i < 50; i++) { const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 520; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, max: 0.55, c: i % 3 ? '#ffb84a' : '#fff0b0', r: 8, nograv: true }); }
    if (ev.h > 0) banners.push({ text: `핵폭발! ${ev.h}명`, life: 1.1, max: 1.1, small: true, color: '#ffb84a' });
  } else if (ev.k === 'explode') {
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 520;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: i % 3 ? '#ff8a3d' : '#ffd36b', r: 7, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.r, c: '255,160,80' });
    shake = Math.max(shake, 18);
    if (ev.h > 0) banners.push({ text: `폭파! ${ev.h}명`, life: 1, max: 1, small: true, color: '#ff8a3d' });
  } else if (ev.k === 'freeze' && ev.hk) {
    // 패왕색: 검붉은 기운이 터져 나옴
    hakiFlash = 0.45; shake = Math.max(shake, 16);
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.6, max: 0.6, r: 900, c: '150,10,30' });
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 220, c: '60,0,8', grow: true });
    for (let i = 0; i < 16; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 140 + Math.random() * 220, life: 0.45, max: 0.45, c: i % 2 ? '#d01030' : '#1a0004' });
    banners.push({ text: '패왕색!', life: 1.1, max: 1.1, small: true, color: '#ff3a4a' });
  } else if (ev.k === 'freeze') {
    freezeFlash = 0.35;
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 900, c: '210,236,255' });
    banners.push({ text: '정지!', life: 1, max: 1, small: true, color: '#d5ecff' });
  } else if (ev.k === 'rock') {
    for (let i = 0; i < 14; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 40, y: ev.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, life: 0.5, max: 0.5, c: '#9b938a', r: 6 });
  } else if ((ev.k === 'pull' || ev.k === 'push') && ev.tj) {
    // 태극: 커다란 태극 무늬가 돌며 퍼지거나 모임
    particles.push({ taiji: true, yy: ev.tj === 2, x: ev.x, y: ev.y, life: 0.7, max: 0.7, r: ev.r * 0.55, dir: ev.k === 'pull' ? -1 : 1 });
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: ev.r, c: ev.tj === 2 ? (ev.k === 'pull' ? '30,30,30' : '245,245,245') : ev.k === 'pull' ? '216,50,60' : '40,80,200', grow: ev.k === 'push', shrink: ev.k === 'pull' });
  } else if (ev.k === 'pull' || ev.k === 'push') {
    const c = ev.k === 'pull' ? '255,93,115' : '90,150,255';
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: ev.r, c, grow: ev.k === 'push', shrink: ev.k === 'pull' });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, d = ev.k === 'pull' ? ev.r : 30, sp = ev.k === 'pull' ? -520 : 520;
      particles.push({ x: ev.x + Math.cos(a) * d, y: ev.y + Math.sin(a) * d, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, max: 0.45, c: `rgb(${c})`, r: 4, nograv: true });
    }
  } else if (ev.k === 'empower') {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 260;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.6, max: 0.6, c: '#6fa4ff', r: 5, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 90, c: '80,140,255' });
  } else if (ev.k === 'charged') {
    banners.push({ text: '강화 충전 완료! Q를 눌러요', life: 2, max: 2, small: true, color: '#6fa4ff' });
  } else if (ev.k === 'infest' || ev.k === 'unfest') {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 200;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, max: 0.55, c: ev.v === 2 ? (i % 2 ? '#c4161c' : '#3a0408') : ev.v === 1 ? (i % 2 ? '#141018' : '#5a5466') : '#7be36f', r: 6, nograv: true });
    }
    if (ev.k === 'infest') banners.push({ text: `${ev.n} → ${ev.n2} 기생!`, life: 1.6, max: 1.6, small: true, color: '#7be36f' });
  } else if (ev.k === 'deny') {
    banners.push({ text: ev.msg, life: 1.6, max: 1.6, small: true, color: '#ff9b9b' });
  } else if (ev.k === 'quake') {
    if (ev.by !== myId) banners.push({ text: '지진!', life: 1.2, max: 1.2, small: true, color: '#d6a45c' });
    for (let i = 0; i < 20; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 120, y: ev.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 400, life: 0.6, max: 0.6, c: '#a3825a', r: 6 });
  } else if (ev.k === 'giant' || ev.k === 'rubber' || ev.k === 'engine') {
    const col = ev.k === 'giant' ? '255,107,74' : ev.k === 'rubber' ? '255,159,243' : '255,176,0';
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.k === 'giant' ? 120 : 70, c: col });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 220;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, max: 0.45, c: `rgb(${col})`, r: 5, nograv: true });
    }
  } else if (ev.k === 'bfq' && ev.gx) {
    // 은하: 몸 주위에 별빛이 모여듦
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 80, c: '140,110,255' });
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2; particles.push({ x: ev.x + Math.cos(a) * 70, y: ev.y + Math.sin(a) * 70, vx: -Math.cos(a) * 200, vy: -Math.sin(a) * 200, life: 0.35, max: 0.35, c: i % 3 ? '#b8a6ff' : '#ffffff', r: 3, nograv: true }); }
  } else if (ev.k === 'bfq' && ev.g) {
    // 원포올: 초록 번개가 몸을 휘감음
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 80, c: '60,255,140' });
    for (let i = 0; i < 5; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 50 + Math.random() * 50, life: 0.25, max: 0.25, c: i % 2 ? '#d8ffe6' : '#3dff8a' });
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = 140 + Math.random() * 280; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, c: i % 2 ? '#3dff8a' : '#eaffef', r: 4, nograv: true }); }
  } else if (ev.k === 'bflash' && ev.gx) {
    // 은하 적중: 보랏빛 우주가 터지며 별이 사방으로
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.p === 2 ? 150 : 110, c: '40,20,90', grow: true });
    for (const [r, l] of [[ev.p === 2 ? 200 : 150, 0.5], [ev.p === 2 ? 120 : 90, 0.35]]) particles.push({ ring: true, x: ev.x, y: ev.y, life: l, max: l, r, c: '140,110,255' });
    for (let i = 0; i < 50; i++) { const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 700; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7, c: i % 4 === 0 ? '#ffffff' : i % 4 === 1 ? '#ffe9a0' : i % 4 === 2 ? '#8a6cff' : '#ff7ae0', r: i % 4 === 0 ? 2 : 4, nograv: true }); }
    for (let i = 0; i < 6; i++) particles.push({ txt: '✦', sz: 24, x: ev.x + (Math.random() - 0.5) * 120, y: ev.y + (Math.random() - 0.5) * 80, vx: 0, vy: -30, life: 0.8, max: 0.8, c: '#ffffff', nograv: true });
    shake = Math.max(shake, ev.p === 2 ? 24 : 16);
  } else if (ev.k === 'bflash' && ev.g) {
    // 원포올 적중: 초록 번개 폭풍 + 겹겹의 충격파
    for (let i = 0; i < 14; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 120 + Math.random() * 160, life: 0.45, max: 0.45, c: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#3dff8a' : '#0f8a3c' });
    if (ev.ax !== undefined) for (let i = 0; i < 4; i++) particles.push({ bolt: true, x: ev.ax, y: ev.ay, a: Math.random() * Math.PI * 2, len: 70 + Math.random() * 60, life: 0.35, max: 0.35, c: '#3dff8a' });
    for (let i = 0; i < 55; i++) {
      const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 800;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, max: 0.6, c: i % 3 ? '#3dff8a' : '#f2fff6', r: 6, nograv: true });
    }
    for (const [r, l] of [[ev.p === 2 ? 200 : 150, 0.5], [ev.p === 2 ? 130 : 95, 0.35], [60, 0.25]]) particles.push({ ring: true, x: ev.x, y: ev.y, life: l, max: l, r, c: '60,255,140' });
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 120, c: '200,255,220', grow: true });
    shake = Math.max(shake, ev.p === 2 ? 26 : 18); lightFlash = 0.15; lightBlue = false;
    banners.push({ text: '원 포 올!', life: 1.2, max: 1.2, small: true, color: '#3dff8a' });
  } else if (ev.k === 'bfq') {
    // 흑섬 발동: 검붉은 번쩍임 (이것만으로는 아무 일도 없음)
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 70, c: '150,10,30' });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, c: i % 2 ? '#1a0508' : '#b0142c', r: 5, nograv: true });
    }
  } else if (ev.k === 'bflash') {
    // 흑섬 적중: 검은 번개 + 붉은 폭발
    for (let i = 0; i < 6; i++) particles.push({ bolt: true, x: ev.x, y: ev.y, a: Math.random() * Math.PI * 2, len: 90 + Math.random() * 90, life: 0.3, max: 0.3, c: i % 2 ? '#14040a' : '#e0203f' });
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 600;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: i % 3 ? '#c0263a' : '#120307', r: 6, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.p === 2 ? 150 : 110, c: '200,20,50' });
    shake = Math.max(shake, ev.p === 2 ? 20 : 14);
    banners.push({ text: '흑섬!', life: 1, max: 1, small: true, color: '#ff3355' });
  } else if (ev.k === 'bolt' && skinPid(ev.pid, 'sakura')) {
    // 벚꽃: 하늘에서 분홍 꽃잎이 쏟아져 내림
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 60, c: '255,183,208' });
    for (const [x, y] of ev.pts || []) {
      for (let i = 0; i < 26; i++) particles.push({ x: x + (Math.random() - 0.5) * 80, y: y - 200 - Math.random() * 120, vx: (Math.random() - 0.5) * 80, vy: 380 + Math.random() * 200, life: 0.8, max: 0.8, c: i % 3 ? '#ff9ec4' : '#ffe4ee', r: 6 + Math.random() * 4, nograv: true });
      particles.push({ ring: true, fill: true, x, y: y - 30, life: 0.4, max: 0.4, r: 50, c: '255,183,208', grow: true });
    }
    if (ev.pts && ev.pts.length) shake = Math.max(shake, 10);
    if (ev.h > 0) banners.push({ text: `벚꽃! ${ev.h}명 스턴`, life: 1.2, max: 1.2, small: true, color: '#ffb7d0' });
  } else if (ev.k === 'bolt') {
    const th = ev.th;   // 천둥 스킨: 파란 천둥
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 60, c: th ? '80,150,255' : '255,233,74' });
    for (const [x, y] of ev.pts || []) {
      particles.push({ strike: true, x, y, life: th ? 0.55 : 0.45, max: th ? 0.55 : 0.45, seed: Math.random() * 1000, th });
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 300;
        particles.push({ x, y: y - 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: th ? (i % 2 ? '#cfe4ff' : '#3a8bff') : (i % 2 ? '#fff6a8' : '#ffe94a'), r: 4, nograv: true });
      }
    }
    if (ev.pts && ev.pts.length) { shake = Math.max(shake, th ? 18 : 14); lightFlash = 0.25; lightBlue = !!th; }
    if (ev.h > 0) banners.push({ text: `${th ? '천둥' : '번개'}! ${ev.h}명 스턴`, life: 1.2, max: 1.2, small: true, color: th ? '#6aaeff' : '#ffe94a' });
  } else if (ev.k === 'slash') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x, y: ev.y + (Math.random() - 0.5) * 50, vx: ev.f * (200 + Math.random() * 200), vy: (Math.random() - 0.5) * 80, life: 0.3, max: 0.3, c: '#e6f1ff', r: 4, nograv: true });
  } else if (ev.k === 'fdash' && ev.b === 3) {
    // 영혼 돌진: 영혼 고리 + 흩어지는 도깨비불
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.45, max: 0.45, r: 70, c: '150,255,220' });
    for (let i = 0; i < 6; i++) particles.push({ wisp: true, face: i < 2, x: ev.x + (Math.random() - 0.5) * 40, y: ev.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 90, life: 1, max: 1, r: i < 2 ? 15 : 9, seed: Math.random() * 10 });
  } else if (ev.k === 'fdash') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 60, c: ev.b === 3 ? '70,255,130' : ev.b === 2 ? '140,50,220' : ev.b ? '60,140,255' : '255,120,40' });
  } else if (ev.k === 'burn' && ev.b === 3) {
    // 영혼 불: 몸에서 영혼이 빠져나가듯 도깨비불이 떠오름
    for (let i = 0; i < 4; i++) particles.push({ wisp: true, face: i === 0, x: ev.x + (Math.random() - 0.5) * 30, y: ev.y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 60, vy: -70 - Math.random() * 70, life: 0.9, max: 0.9, r: i === 0 ? 14 : 8 + Math.random() * 4, seed: Math.random() * 10 });
  } else if (ev.k === 'burn') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, life: 0.4, max: 0.4, c: ev.b === 3 ? (i % 2 ? '#7dffa8' : '#0f8a40') : ev.b === 2 ? (i % 2 ? '#9a3cf0' : '#1a0828') : ev.b ? (i % 2 ? '#9fd8ff' : '#2a6dff') : (i % 2 ? '#ffb02e' : '#ff4d1a'), r: 5, nograv: true });
  } else if (ev.k === 'iced') {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 240;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: ev.au ? ['#2af598', '#3ae0d0', '#a66bff'][i % 3] : ev.dk ? (i % 2 ? '#140c20' : '#7a3cc0') : ev.sand ? (i % 2 ? '#f0d49a' : '#b88a45') : (i % 2 ? '#e8f8ff' : '#8fdcff'), r: 5, nograv: true });
    }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 70, c: ev.sand ? '217,178,106' : '170,225,255' });
  } else if (ev.k === 'blizzard') {
    banners.push({ text: ev.sand ? `${ev.n}의 모래바람!` : ev.au ? `${ev.n}의 오로라!` : ev.dk ? `${ev.n}의 어둠!` : `${ev.n}의 눈보라!`, life: 1.4, max: 1.4, small: true, color: ev.sand ? '#e8c27a' : ev.au ? '#5af0c0' : ev.dk ? '#b48cff' : '#bfeaff' });
  } else if (ev.k === 'turret') {
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y - 10, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 200, life: 0.4, max: 0.4, c: ev.hw ? (i % 2 ? '#ff8a1e' : '#6a2a8a') : '#c8d0dc', r: 4 });
  } else if (ev.k === 'tshot') {
    for (let i = 0; i < 4; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, life: 0.5, max: 0.5, c: i % 2 ? 'rgba(255,150,40,0.8)' : 'rgba(120,60,160,0.6)', r: 4, nograv: true });
  } else if (ev.k === 'tbreak') {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 360;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.6, max: 0.6, c: i % 2 ? '#7d8796' : '#ffb02e', r: 5 });
    }
  } else if (ev.k === 'error') {
    const hk = skinPid(ev.by, 'hacker');
    banners.push({ text: hk ? `${ev.n} → ${ev.n2} 해킹!` : `${ev.n} → ${ev.n2} 시스템 에러!`, life: 1.6, max: 1.6, small: true, color: hk ? '#ff2a3a' : '#39ff88' });
    if (ev.x !== undefined) for (let i = 0; i < 20; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 60, y: ev.y + (Math.random() - 0.5) * 70, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 100, life: 0.5, max: 0.5, c: hk ? ['#ff1a2e', '#ffffff', '#ff6a7a'][i % 3] : ['#39ff88', '#ff2a78', '#28a0ff'][i % 3], r: 6, nograv: true });
  } else if (ev.k === 'sun') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.6, max: 0.6, r: 140, c: ev.b === 2 ? '110,30,190' : ev.b ? '80,170,255' : '255,200,40', grow: true });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      particles.push({ x: ev.x + Math.cos(a) * 30, y: ev.y + Math.sin(a) * 30, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.5, max: 0.5, c: ev.b === 2 ? (i % 2 ? '#b070ff' : '#12041e') : ev.b ? (i % 2 ? '#d8f0ff' : '#3f8cff') : (i % 2 ? '#fff3a0' : '#ffb21a'), r: 5, nograv: true });
    }
  } else if (ev.k === 'wind') {
    for (let i = 0; i < 14; i++) particles.push({ x: ev.x + ev.f * 30, y: ev.y + (Math.random() - 0.5) * 60, vx: ev.f * (250 + Math.random() * 300), vy: (Math.random() - 0.5) * 100, life: 0.4, max: 0.4, c: '#d8fff5', r: 4, nograv: true });
  } else if (ev.k === 'windend') {
    for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 300; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: '#d8fff5', r: 4, nograv: true }); }
  } else if (ev.k === 'homing') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 55, c: '150,130,255' });
  } else if (ev.k === 'thunk') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160, life: 0.3, max: 0.3, c: '#b59a74', r: 3 });
  } else if (ev.k === 'tsave') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 70, c: ev.g ? '47,224,122' : '124,156,255' });
    banners.push({ text: `${ev.n}: 시간 저장!`, life: 1.2, max: 1.2, small: true, color: ev.g ? '#5cf09a' : '#aebfff' });
  } else if (ev.k === 'rewind') {
    rewindT = 0.9; rewindG = !!ev.g; banners.push({ text: `${ev.n}: 시간 되돌리기!`, life: 1.6, max: 1.6, small: true, color: ev.g ? '#5cf09a' : '#aebfff' });
  } else if (ev.k === 'smash' && skinPid(ev.pid, 'notes')) {
    // 음표: 콤보가 클수록 음표가 많이, 무지개색으로 쏟아짐
    const RB = ['#ff3b3b', '#ff9a2e', '#ffe14a', '#3ccf6e', '#3f8cff', '#b04aff', '#ff7ae0'], n = ev.n || 1, cnt = 8 + Math.min(30, n * 2);
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.r, c: '255,154,216', grow: true });
    for (let i = 0; i < cnt; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 350; particles.push({ txt: i % 3 ? '♪' : '♫', sz: 26 + (i % 3) * 4, x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.9, max: 0.9, c: RB[i % RB.length], nograv: true }); }
    shake = Math.max(shake, Math.min(22, 6 + ev.n));
    banners.push({ text: `${ev.n}콤보 연주!`, life: 1.2, max: 1.2, small: true, color: '#ff9ad8' });
  } else if (ev.k === 'smash' && skinPid(ev.pid, 'fireworks')) {
    // 불꽃놀이: 콤보가 클수록 불꽃이 많아지고, 색이 빨→주→노→초→파→남→보로 바뀜
    // 플레이어 자리에서 바로 한 발이 펑! 콤보가 클수록 크고 불티가 많아짐
    const RB = ['#ff3b3b', '#ff9a2e', '#ffe14a', '#3ccf6e', '#3f8cff', '#3a3ad8', '#b04aff'];
    const n = ev.n || 1, tier = Math.min(6, Math.floor((n - 1) * 7 / 30));
    particles.push({ fw: true, x: ev.x, y: ev.y, life: 1.2, max: 1.2, c: RB[tier], big: 0.9 + Math.min(2.2, n / 12), sparks: 18 + Math.min(42, n * 2), rings: 1 + Math.floor(n / 10), seed: Math.random() * 99 });
    shake = Math.max(shake, Math.min(26, 8 + ev.n));
    banners.push({ text: `${ev.n}콤보 불꽃놀이!`, life: 1.2, max: 1.2, small: true, color: RB[tier] });
  } else if (ev.k === 'smash') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: ev.r, c: '255,95,162', grow: true });
    for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 500; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45, max: 0.45, c: i % 2 ? '#ff5fa2' : '#ffe0ef', r: 6, nograv: true }); }
    shake = Math.max(shake, Math.min(26, 8 + ev.n));
    banners.push({ text: `${ev.n}콤보 스매시!`, life: 1.2, max: 1.2, small: true, color: '#ff5fa2' });
  } else if (ev.k === 'parryq') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.22, max: 0.22, r: 48, c: '220,240,255' });
  } else if (ev.k === 'parry') {
    // 반사 성공: 번쩍 + 튕겨 나가는 빛
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 90, c: '235,245,255', grow: true });
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 400; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3, max: 0.3, c: ev.fx === 'rainbow' ? `hsl(${i * 20},95%,62%)` : i % 2 ? '#ffffff' : '#9fd0ff', r: 4, nograv: true }); }
    shake = Math.max(shake, 10);
    banners.push({ text: '반사!', life: 0.9, max: 0.9, small: true, color: '#cfe8ff' });
  } else if (ev.k === 'invert') {
    banners.push({ text: `${ev.n}의 반전! ${(ev.names || []).join(', ')}`, life: 1.8, max: 1.8, small: true, color: '#ff4f8b' });
  } else if (ev.k === 'atomq') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 80, c: '90,216,255' });
  } else if (ev.k === 'venom') {
    // 독침 Q: 진한 초록 독안개가 퍼지면서 터짐 (둔화의 파란 원과 구분)
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.45, max: 0.45, r: ev.r, c: '70,230,90' });
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: ev.r * 0.8, c: '40,180,60', grow: true });
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 40, life: 0.6 + Math.random() * 0.3, max: 0.9, c: i % 3 === 0 ? 'rgba(170,255,120,0.8)' : i % 3 === 1 ? 'rgba(60,200,70,0.75)' : 'rgba(30,120,40,0.7)', r: 6 + Math.random() * 8, nograv: true });
    }
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * ev.r, y: ev.y + (Math.random() - 0.5) * 50, vx: 0, vy: -50 - Math.random() * 70, life: 0.9, max: 0.9, c: '#9dff6a', r: 3, nograv: true });
    shake = Math.max(shake, 5);
  } else if (ev.k === 'venomhit') {
    // 독에 맞은 상대: 초록 독이 튐
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 180; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5, max: 0.5, c: i % 2 ? '#7dff5a' : '#2fa83a', r: 4, nograv: true }); }
  } else if (ev.k === 'ambush' && ev.ct) {
    // 고양이 스킨: 떠난 자리·나타난 자리에 발자국 + 야옹
    for (const [px, py] of [[ev.x, ev.y], [ev.x2, ev.y2]]) for (let i = 0; i < 3; i++) particles.push({ txt: '🐾', sz: 16, x: px + (i - 1) * 18, y: py + 26 - (i % 2) * 8, vx: 0, vy: 0, life: 0.9, max: 0.9, c: '#f2b05e', nograv: true });
    particles.push({ txt: '야옹!', sz: 20, x: ev.x2, y: ev.y2 - 50, vx: 0, vy: -50, life: 0.9, max: 0.9, c: '#ffd08a', nograv: true });
  } else if (ev.k === 'ambush') {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, max: 0.4, c: '#8b6bd6', r: 5, nograv: true });
      particles.push({ x: ev.x2, y: ev.y2, vx: Math.cos(a) * sp * 0.6, vy: Math.sin(a) * sp * 0.6, life: 0.4, max: 0.4, c: '#c9b6ff', r: 4, nograv: true });
    }
  } else if (ev.k === 'ambushhit') {
    for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 300; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, c: i % 2 ? '#c9b6ff' : '#8b6bd6', r: 4, nograv: true }); }
  } else if (ev.k === 'markset') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 60, life: 0.5, max: 0.5, c: '#ff4d6d', r: 3, nograv: true });
  } else if (ev.k === 'markboom') {
    particles.push({ ring: true, fill: false, x: ev.x, y: ev.y, life: 0.45, max: 0.45, r: ev.r, c: '255,77,109', grow: true });
    for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 300; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.5, max: 0.5, c: i % 2 ? '#ff4d6d' : '#ffd36b', r: 5, nograv: true }); }
  } else if (ev.k === 'hook' && ev.ch) {
    // 쇠사슬 스킨: 회색 사슬 + 끝에 낫
    particles.push({ chain: true, x: ev.x, y: ev.y, hx: ev.hx, hy: ev.hy, life: 0.35, max: 0.35 });
  } else if (ev.k === 'hook') {
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      particles.push({ x: ev.x + (ev.hx - ev.x) * t, y: ev.y + (ev.hy - ev.y) * t, vx: 0, vy: 0, life: 0.3, max: 0.3, c: '#c8a878', r: 3, nograv: true });
    }
    if (ev.h) particles.push({ ring: true, fill: false, x: ev.hx, y: ev.hy, life: 0.25, max: 0.25, r: 22, c: '200,168,120', grow: true });
  } else if (ev.k === 'leech' && ev.mq) {
    // 모기 스킨: 모기가 상대에게서 빨아 오면서 피 방울
    particles.push({ txt: '🦟', sz: 18, x: ev.x, y: ev.y - 10, vx: (ev.x2 - ev.x) * 2, vy: (ev.y2 - ev.y) * 2, life: 0.45, max: 0.45, c: '#ffffff', nograv: true });
    for (let i = 0; i < 4; i++) { const t = Math.random(); particles.push({ x: ev.x, y: ev.y, vx: (ev.x2 - ev.x) * (1.6 + t), vy: (ev.y2 - ev.y) * (1.6 + t) - 30, life: 0.4, max: 0.4, c: '#ff2a4a', r: 2.5, nograv: true }); }
  } else if (ev.k === 'leechon' && ev.mq) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; particles.push({ txt: '🦟', sz: 16, x: ev.x, y: ev.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.5, max: 0.5, c: '#ffffff', nograv: true }); }
  } else if (ev.k === 'leech') {
    // 흡혈: 맞은 상대에게서 내 쪽으로 빨간 방울이 빨려 옴
    for (let i = 0; i < 6; i++) { const t = Math.random(); particles.push({ x: ev.x, y: ev.y, vx: (ev.x2 - ev.x) * (1.6 + t), vy: (ev.y2 - ev.y) * (1.6 + t) - 30, life: 0.4, max: 0.4, c: i % 2 ? '#ff2a4a' : '#9a0820', r: 3, nograv: true }); }
  } else if (ev.k === 'leechon') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 70, c: '200,16,46', grow: true });
  } else if (ev.k === 'discthrow') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.2, max: 0.2, r: 30, c: '255,179,71' });
  } else if (ev.k === 'disccatch') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.25, max: 0.25, c: '#ffd38a', r: 3, nograv: true });
  } else if (ev.k === 'cloud') {
    for (let i = 0; i < 10; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 140, y: ev.y, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, life: 0.5, max: 0.5, c: 'rgba(255,255,255,0.8)', r: 7, nograv: true });
  } else if (ev.k === 'barrier') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.r, c: '127,216,255', grow: true });
  } else if (ev.k === 'barrierblock') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.2, max: 0.2, r: ev.r, c: '200,240,255' });
  } else if (ev.k === 'hammerwave' || ev.k === 'hammerslam') {
    // 망치: 땅을 따라 양옆으로 퍼지는 먼지 + 돌 조각
    const big = ev.k === 'hammerslam';
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: big ? 0.45 : 0.3, max: big ? 0.45 : 0.3, r: ev.r, c: '150,120,90', grow: true });
    for (let i = 0; i < (big ? 30 : 16); i++) { const dir = i % 2 ? 1 : -1; particles.push({ x: ev.x, y: ev.y - 4, vx: dir * (150 + Math.random() * ev.r * 2), vy: -80 - Math.random() * (big ? 360 : 200), life: 0.6, max: 0.6, c: i % 3 ? '#8a6a4a' : '#c8b49a', r: big ? 6 : 4 }); }
    shake = Math.max(shake, big ? 16 : 8);
    if (ev.mj) {
      // 묠니르: 충격파 위로 번개가 여러 줄기 내리침
      for (let i = 0; i < (big ? 6 : 3); i++) { const bx = ev.x + (Math.random() - 0.5) * ev.r * 1.6; particles.push({ bolt: true, x: bx, y: ev.y - 160 - Math.random() * 60, a: Math.PI / 2 + (Math.random() - 0.5) * 0.3, len: 170, life: 0.3, max: 0.3, c: i % 2 ? '#cfe8ff' : '#fff27a' }); }
      particles.push({ ring: true, fill: true, x: ev.x, y: ev.y - 20, life: 0.3, max: 0.3, r: ev.r * 0.7, c: '190,225,255', grow: true });
    }
  } else if (ev.k === 'whipspin') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: ev.r, c: '160,82,45', grow: true });
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; particles.push({ x: ev.x + Math.cos(a) * ev.r * 0.8, y: ev.y + Math.sin(a) * ev.r * 0.8, vx: -Math.sin(a) * 300, vy: Math.cos(a) * 300, life: 0.25, max: 0.25, c: '#c27a46', r: 3, nograv: true }); }
  } else if (ev.k === 'curse') {
    for (let i = 0; i <= 12; i++) { const t = i / 12; particles.push({ x: ev.x + (ev.x2 - ev.x) * t, y: ev.y + (ev.y2 - ev.y) * t, vx: 0, vy: -20, life: 0.4, max: 0.4, c: '#8a3cc0', r: 4, nograv: true }); }
    particles.push({ ring: true, fill: true, x: ev.x2, y: ev.y2, life: 0.4, max: 0.4, r: 40, c: '106,44,145', grow: true });
  } else if (ev.k === 'cursebite') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80, life: 0.5, max: 0.5, c: '#b45cff', r: 3, nograv: true });
  } else if (ev.k === 'guard') {
    for (const [gx, gy] of ev.pts || []) particles.push({ ring: true, fill: true, x: gx, y: gy, life: 0.4, max: 0.4, r: 46, c: '255,211,107', grow: true });
  } else if (ev.k === 'guardblock') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 50, c: '255,230,150', grow: true });
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; particles.push({ x: ev.x + Math.cos(a) * 40, y: ev.y + Math.sin(a) * 40, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.3, max: 0.3, c: '#ffe9a0', r: 3, nograv: true }); }
  } else if (ev.k === 'thornon') {
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: 60, c: '95,138,58', grow: true });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; particles.push({ x: ev.x + Math.cos(a) * 30, y: ev.y + Math.sin(a) * 40, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.3, max: 0.3, c: '#6a9a3a', r: 3, nograv: true }); }
  } else if (ev.k === 'thornhit') {
    for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 200; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.35, max: 0.35, c: i % 2 ? '#4f7a2e' : '#b8e07a', r: 3 }); }
    particles.push({ txt: '찔림!', sz: 18, x: ev.x, y: ev.y - 30, vx: 0, vy: -70, life: 0.7, max: 0.7, c: '#9fd35a', nograv: true });
  } else if (ev.k === 'wallup') {
    for (let i = 0; i < 14; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 40, y: ev.y - 2, vx: (Math.random() - 0.5) * 260, vy: -60 - Math.random() * 160, life: 0.5, max: 0.5, c: i % 2 ? '#8c8174' : '#c8bca8', r: 4 });
    shake = Math.max(shake, 5);
  } else if (ev.k === 'wallblock') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x, y: ev.y + (Math.random() - 0.5) * 80, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 160, life: 0.25, max: 0.25, c: '#fff1c0', r: 2.5 });
  } else if (ev.k === 'volcano') {
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.w / 2, c: '255,90,26', grow: true });
    for (let i = 0; i < 26; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * ev.w, y: ev.y - 4, vx: (Math.random() - 0.5) * 160, vy: -200 - Math.random() * 380, life: 0.7, max: 0.7, c: i % 3 ? '#ff6a1a' : '#ffd23a', r: 4 + Math.random() * 3 });
    shake = Math.max(shake, 7);
  } else if (ev.k === 'lavahit') {
    for (let i = 0; i < 8; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 30, y: ev.y - 6, vx: (Math.random() - 0.5) * 120, vy: -140 - Math.random() * 200, life: 0.45, max: 0.45, c: i % 2 ? '#ff7a1a' : '#ffe14a', r: 3 });
  } else if (ev.k === 'shrink') {
    for (let i = 0; i <= 10; i++) { const t = i / 10; particles.push({ x: ev.x + (ev.x2 - ev.x) * t, y: ev.y + (ev.y2 - ev.y) * t, vx: 0, vy: 0, life: 0.35, max: 0.35, c: '#ff7ad9', r: 3.5, nograv: true }); }
    particles.push({ ring: true, x: ev.x2, y: ev.y2, life: 0.4, max: 0.4, r: 70, c: '255,122,217' });
    particles.push({ txt: '작아짐!', sz: 18, x: ev.x2, y: ev.y2 - 40, vx: 0, vy: -60, life: 0.8, max: 0.8, c: '#ff9ae5', nograv: true });
  } else if (ev.k === 'itemspawn') {
    const [c1] = ITEM_LOOK[ev.it] || ITEM_LOOK.life;
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.5, max: 0.5, r: 40, c: '255,255,255', grow: true });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, max: 0.4, c: c1, r: 3, nograv: true }); }
  } else if (ev.k === 'itemget') {
    const [c1, , ic] = ITEM_LOOK[ev.it] || ITEM_LOOK.life, MSG = { life: '목숨 +1', power: '데미지 2배!', armor: '방어!', clean: '효과 제거!' };
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 220; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, c: i % 2 ? c1 : '#ffffff', r: 4, nograv: true }); }
    particles.push({ txt: `${ic} ${MSG[ev.it] || ''}`, sz: 22, x: ev.x, y: ev.y - 20, vx: 0, vy: -60, life: 1.1, max: 1.1, c: c1, nograv: true });
    if (ev.pid === myId) banners.push({ text: `${ic} ${MSG[ev.it] || ''}`, life: 1.2, max: 1.2, small: true, color: c1 });
  } else if (ev.k === 'mineset') {
    for (let i = 0; i < 6; i++) particles.push({ x: ev.x + (Math.random() - 0.5) * 20, y: ev.y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 0.3, max: 0.3, c: '#9a8a6a', r: 3 });
  } else if (ev.k === 'boom' && ev.bn) {
    // 바나나: 미끌! 바나나 조각이 사방으로
    particles.push({ ring: true, fill: true, x: ev.x, y: ev.y, life: 0.35, max: 0.35, r: ev.r || 100, c: '255,225,74', grow: true });
    for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 400; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 150, life: 0.6, max: 0.6, c: i % 3 ? '#ffe14a' : '#fff6c0', r: 5 }); }
    particles.push({ txt: '미끌!', sz: 24, x: ev.x, y: ev.y - 30, vx: 0, vy: -60, life: 0.9, max: 0.9, c: '#ffd23a', nograv: true });
    shake = Math.max(shake, 10);
  } else if (ev.k === 'boom') {
    for (let i = 0; i < 34; i++) { const a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 500; particles.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.5, max: 0.5, c: i % 3 === 0 ? ev.c : i % 2 ? '#ff8a3d' : '#ffd36b', r: 6, nograv: true }); }
    particles.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: ev.r, c: '255,160,80' });
    shake = Math.max(shake, 14);
  } else if (ev.k === 'map') {
    banners.push({ text: `맵: ${ev.n}`, life: 2.5, max: 2.5, small: true, color: '#ffcf3f' });
  } else if (ev.k === 'host') {
    banners.push({ text: `${ev.n} 님이 새 방장이에요`, life: 2, max: 2, small: true, color: '#ffcf3f' });
  } else if (ev.k === 'start') {
    banners.push({ text: '싸워라!', life: 1, max: 1 });
  } else if (ev.k === 'join') {
    banners.push({ text: `${ev.n} 입장`, life: 1.5, max: 1.5, small: true });
  } else if (ev.k === 'leave') {
    banners.push({ text: `${ev.n} 퇴장`, life: 1.5, max: 1.5, small: true });
  }
  if (reduceMotion) shake = 0;
  if (particles.length > 500) particles.splice(0, particles.length - 500);
}

function interpolatedPlayers(key = 'p') {
  if (!snapshots.length) return [];
  const t = performance.now() - INTERP_DELAY;
  let a = snapshots[0], b = snapshots[snapshots.length - 1];
  for (let i = snapshots.length - 1; i > 0; i--) {
    if (snapshots[i - 1].time <= t) { a = snapshots[i - 1]; b = snapshots[i]; break; }
  }
  const span = b.time - a.time;
  const k = span > 0 ? Math.min(1, Math.max(0, (t - a.time) / span)) : 1;
  const prev = new Map((a[key] || []).map((p) => [p.id, p]));
  return (b[key] || []).map((p) => {
    const q = prev.get(p.id);
    if (!q || Math.abs(q.x - p.x) > 120 || Math.abs(q.y - p.y) > 120) return p;
    return { ...p, x: q.x + (p.x - q.x) * k, y: q.y + (p.y - q.y) * k };
  });
}

let scale = 1, offX = 0, offY = 0, portrait = false;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  portrait = innerHeight > innerWidth * 1.1;
  const inGame = $('lobby').hidden;
  if (portrait && isTouch && inGame) {
    // 세로 화면: 게임은 위, 버튼은 아래
    // 무대 부분만 확대해서 보여줌 (월드 x 140~1140)
    scale = canvas.width / 1000;
    offX = -140 * scale;
    offY = Math.max(64 * dpr, (canvas.height * 0.54 - H * scale) * 0.5);
  } else {
    scale = Math.min(canvas.width / W, canvas.height / H);
    offX = (canvas.width - W * scale) / 2; offY = (canvas.height - H * scale) / 2;
  }
  $('rotate').hidden = !(portrait && isTouch && inGame);
}
addEventListener('resize', resize); resize();

const stars = Array.from({ length: 70 }, (_, i) => ({ x: (i * 397) % W, y: (i * 211) % 420, r: (i % 3) + 1 }));
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawBackground(time) {
  const th = STAGE.theme;
  ctx.fillStyle = '#0b0a16'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(offX, offY); ctx.scale(scale * STAGE.zoom, scale * STAGE.zoom);
  const W = STAGE.width, H = STAGE.height, sx0 = W / 1280;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (th.stars) {
    for (const s of stars) {
      ctx.globalAlpha = reduceMotion ? 0.5 : 0.35 + 0.35 * Math.sin(time / 700 + s.x);
      ctx.fillStyle = '#fff'; ctx.fillRect(s.x * sx0, s.y * sx0, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  } else {
    // 낮 하늘: 구름
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 290 * sx0 + time / 60) % (W + 300)) - 150, cy = (90 + (i % 3) * 55) * sx0;
      ctx.beginPath(); ctx.ellipse(cx, cy, 70, 22, 0, 0, Math.PI * 2); ctx.ellipse(cx + 45, cy - 12, 45, 20, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = th.orb + '0.14)'; ctx.beginPath(); ctx.arc(1040 * sx0, 150 * sx0, 110 * sx0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = th.orb + '0.3)'; ctx.beginPath(); ctx.arc(1040 * sx0, 150 * sx0, 70 * sx0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = th.hill; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 80) ctx.lineTo(x, (470 + Math.sin(x * 0.011 + STAGE.left) * 50 + Math.sin(x * 0.03) * 18) * sx0);
  ctx.lineTo(W, H); ctx.fill();
  if (th.water) {
    // 바다
    ctx.fillStyle = th.water; ctx.fillRect(0, H - 110, W, 110);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - 95 + k * 30 + Math.sin(x * 0.03 + time / 500 + k) * 5);
      ctx.stroke();
    }
  }
  if (th.snow && !reduceMotion) {
    // 눈 내림: 천천히 흔들리며 떨어지는 눈송이
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 70; i++) {
      const sp = 30 + (i % 7) * 9, x = ((i * 233) % W) + Math.sin(time / 900 + i) * 25, y = ((i * 131) + time * sp / 1000) % (H + 40) - 20;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
function drawStage() {
  const th = STAGE.theme;
  for (const t of STAGE.trunks || []) {   // 배경 나무 줄기 (통과 가능)
    ctx.fillStyle = '#4a2f14'; ctx.fillRect(t.x, t.y, t.w, t.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = t.y + 14; y < t.y + t.h; y += 22) ctx.fillRect(t.x + 6, y, t.w - 12, 3);
    ctx.fillStyle = 'rgba(255,220,160,0.12)'; ctx.fillRect(t.x + 4, t.y, 6, t.h);
  }
  for (const s of STAGE.solids) {
    const thin = s.w < 80; // 성벽 기둥
    ctx.fillStyle = th.dirt; roundRect(s.x, s.y, s.w, s.h + (thin ? 0 : 40), thin ? 6 : 14); ctx.fill();
    if ((STAGE.slopes || []).some((sl) => sl.x1 <= s.x + 1 && sl.x2 >= s.x + s.w - 1)) continue;   // 윗면 전체가 빗면이면 풀 띠는 빗면이 그림
    ctx.fillStyle = th.grass; roundRect(s.x - (thin ? 2 : 6), s.y - 4, s.w + (thin ? 4 : 12), thin ? 14 : 22, thin ? 5 : 10); ctx.fill();
    ctx.fillStyle = th.grassHi; ctx.fillRect(s.x + 4, s.y - 2, s.w - 8, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    if (thin) { for (let y = s.y + 20; y < s.y + s.h - 8; y += 22) ctx.fillRect(s.x + 6, y, s.w - 12, 6); }
    else for (let x = s.x + 30; x < s.x + s.w - 20; x += 70) ctx.fillRect(x, s.y + 35, 28, 8);
  }
  // 빗면: 흙으로 채운 비탈 + 윗면을 따라 풀(눈·모래) 띠
  for (const sl of STAGE.slopes || []) {
    const base = Math.max(sl.y1, sl.y2) + 30;
    ctx.fillStyle = th.dirt; ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1); ctx.lineTo(sl.x2, sl.y2); ctx.lineTo(sl.x2, base); ctx.lineTo(sl.x1, base); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1); ctx.lineTo(sl.x2, sl.y2); ctx.lineTo(sl.x2, base); ctx.lineTo(sl.x1, base); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    const len = Math.hypot(sl.x2 - sl.x1, sl.y2 - sl.y1);
    for (let d = 40; d < len - 30; d += 70) { const x = sl.x1 + (sl.x2 - sl.x1) * d / len, y = sl.y1 + (sl.y2 - sl.y1) * d / len; ctx.fillRect(x - 14, y + 30, 28, 8); }
    ctx.restore();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = th.grass; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1 + 5); ctx.lineTo(sl.x2, sl.y2 + 5); ctx.stroke();
    ctx.strokeStyle = th.grassHi; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sl.x1 + 4, sl.y1 + 1); ctx.lineTo(sl.x2 - 4, sl.y2 + 1); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  for (const p of STAGE.platforms) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(p.x + 4, p.y + 6, p.w, 14, 7); ctx.fill();
    ctx.fillStyle = th.plat; roundRect(p.x, p.y, p.w, 14, 7); ctx.fill();
    ctx.fillStyle = th.platHi; ctx.fillRect(p.x + 8, p.y + 2, p.w - 16, 3);
  }
  drawIce();
  drawMapParts();
}
// 맵 전용 기믹: 무너지는 발판(금 간 돌, 흔들리다 무너지면 윤곽만) · 움직이는 발판(레일 따라 이동) · 바람 구역(흐르는 줄무늬)
function drawMapParts() {
  const t = performance.now();
  const cr = latest && latest.cr, mvs = latest && latest.mvs;   // mv는 투표 정보라 따로 씀
  (STAGE.crumble || []).forEach((c, i) => {
    const [st, tm] = (cr && cr[i]) || [0, 0];
    if (st === 2) { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(c.x, c.y, c.w, 14); ctx.setLineDash([]); return; }
    const x = c.x + (st === 1 ? Math.sin(t / 22 + i) * (2 + (1 - tm) * 3) : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(x + 4, c.y + 6, c.w, 14, 7); ctx.fill();
    ctx.fillStyle = st === 1 ? '#e08a5a' : '#c8956a'; roundRect(x, c.y, c.w, 14, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(70,35,15,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 1; k < 4; k++) { const cx = x + c.w * k / 4; ctx.moveTo(cx, c.y + 1); ctx.lineTo(cx + 5, c.y + 13); }
    ctx.stroke();
  });
  (STAGE.movers || []).forEach((m, i) => {
    const p = mvs && mvs[i] ? { x: mvs[i][0], y: mvs[i][1] } : { x: m.x, y: m.y };
    const bx = m.x2 !== undefined ? m.x2 : m.x, by = m.y2 !== undefined ? m.y2 : m.y;
    ctx.strokeStyle = 'rgba(190,240,255,0.35)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(m.x + m.w / 2, m.y + 7); ctx.lineTo(bx + m.w / 2, by + 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(p.x + 4, p.y + 6, m.w, 14, 7); ctx.fill();
    ctx.fillStyle = '#6fd3ff'; roundRect(p.x, p.y, m.w, 14, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(p.x + 8, p.y + 2, m.w - 16, 3);
  });
  for (const g of STAGE.gusts || []) {
    ctx.fillStyle = 'rgba(200,240,255,0.07)'; ctx.fillRect(g.x, g.y, g.w, g.h);
    const dirX = g.vx ? Math.sign(g.vx) : 0, rise = g.vy < 0 ? 1 : g.vy > 0 ? -1 : 0;
    const n = Math.max(5, Math.floor(g.w * g.h / 7000)), len = 16;
    ctx.strokeStyle = 'rgba(230,250,255,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const rx = ((k * 7919) % 1000) / 1000, ry = ((k * 104729) % 1000) / 1000;
      const x = g.x + ((rx * g.w + (t / 1000) * (g.vx || 0) * 0.5) % g.w + g.w) % g.w;
      const y = g.y + ((ry * g.h + (t / 1000) * (g.vy || 0) * -0.4) % g.h + g.h) % g.h;
      ctx.moveTo(x, y); ctx.lineTo(x - dirX * len, y + rise * len);
    }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
}
// 얼음(미끄러운 곳): 하늘색 반투명 빙판 + 고드름 + 천천히 지나가는 반짝임
function drawIce() {
  const t = performance.now();
  const iceGrad = (x, y) => { const g = ctx.createLinearGradient(x, y - 6, x, y + 12); g.addColorStop(0, 'rgba(235,252,255,0.95)'); g.addColorStop(1, 'rgba(120,200,240,0.85)'); return g; };
  const shine = (x, y, w) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y - 8, w, 18); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
    const off = (t / 12) % (w + 200) - 100;
    for (const d of [0, 26]) { ctx.beginPath(); ctx.moveTo(x + off + d, y + 10); ctx.lineTo(x + off + d + 14, y - 8); ctx.stroke(); }
    ctx.restore();
  };
  for (const s of STAGE.solids) {
    if (!s.ice) continue;
    ctx.fillStyle = iceGrad(s.x, s.y); roundRect(s.x - 6, s.y - 6, s.w + 12, 18, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x + 4, s.y - 3); ctx.lineTo(s.x + s.w - 4, s.y - 3); ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,250,0.55)'; for (let x = s.x + 20; x < s.x + s.w - 10; x += 46) { ctx.beginPath(); ctx.moveTo(x, s.y + 12); ctx.lineTo(x + 6, s.y + 26); ctx.lineTo(x + 12, s.y + 12); ctx.fill(); }   // 고드름
    shine(s.x - 6, s.y - 2, s.w + 12);
  }
  for (const sl of STAGE.slopes || []) {
    if (!sl.ice) continue;
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(190,236,255,0.95)'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(sl.x1, sl.y1 + 4); ctx.lineTo(sl.x2, sl.y2 + 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sl.x1 + 4, sl.y1); ctx.lineTo(sl.x2 - 4, sl.y2); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  for (const p of STAGE.platforms) {
    if (!p.ice) continue;
    ctx.fillStyle = iceGrad(p.x, p.y); roundRect(p.x, p.y - 2, p.w, 16, 7); ctx.fill();
    ctx.fillStyle = 'rgba(160,220,250,0.6)'; for (let x = p.x + 14; x < p.x + p.w - 8; x += 34) { ctx.beginPath(); ctx.moveTo(x, p.y + 13); ctx.lineTo(x + 4, p.y + 24); ctx.lineTo(x + 8, p.y + 13); ctx.fill(); }
    shine(p.x, p.y + 4, p.w);
  }
}

// 지그재그 전기 줄기 (x1,y1)→(x2,y2)
function zap(x1, y1, x2, y2, jag, col, w) {
  const n = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 12));
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let k = 1; k < n; k++) { const u = k / n; ctx.lineTo(x1 + (x2 - x1) * u + (Math.random() - 0.5) * jag, y1 + (y2 - y1) * u + (Math.random() - 0.5) * jag); }
  ctx.lineTo(x2, y2); ctx.stroke();
}
// 이벤트를 일으킨 사람이 그 스킨을 끼고 있는지
function skinPid(pid, id) { return !!(latest && pid && skinOn(latest.p.find((q) => q.id === pid), id)); }
// 불 색 스킨: 'blue'(청염·초신성) / 'dark'(흑염·블랙홀) / null(주황)
function hotTint(p) {
  const fT = skinOn(p, 'bluefire') ? 'blue' : skinOn(p, 'blackfire') ? 'dark' : skinOn(p, 'soul') ? 'green' : null;
  const sT = skinOn(p, 'supernova') ? 'blue' : skinOn(p, 'blackhole') ? 'dark' : null;
  if (!p.sun) return hasK(p, 'fire') ? fT : null;
  if (!hasK(p, 'fire')) return sT;
  return fT && sT ? fT : null;
}
// 도핑 물약 (이속 하늘 · 공속 빨강 · 힘 초록 · 방어 노랑)
const DOPE_NAMES = ['이속', '공속', '힘', '방어'];
const DOPE_RGB = ['110,210,255', '255,70,70', '70,220,100', '255,215,50'];
function drawPotions(state, time) {
  for (const [x, y, k, o] of state.po || []) {
    const c = DOPE_RGB[k] || '255,255,255', mine = o === myId, bob = Math.sin(time / 300 + x) * 3;
    if (skinOn(state.p.find((q) => q.id === o), 'pepero_dope')) {
      // 빼빼로: 이속=누드 · 공속=딸기 · 힘=아몬드 · 방어=초코 (밑에 물약 색 빛)
      const PEP = [['#e0b070', '#4a2412', '누드'], ['#ff8fb1', '#d8a35e', '딸기'], ['#4a2412', '#d8a35e', '아몬드'], ['#4a2412', '#d8a35e', '초코']][k] || ['#4a2412', '#d8a35e'];
      ctx.save(); ctx.translate(x, y - 22 + bob);
      const g5 = ctx.createRadialGradient(0, 16, 2, 0, 16, 22); g5.addColorStop(0, `rgba(${c},0.45)`); g5.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g5; ctx.beginPath(); ctx.arc(0, 16, 22, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(-0.35 + Math.sin(time / 500 + x) * 0.08); ctx.lineCap = 'round';
      if (k === 0) {
        // 누드: 겉은 과자, 안에 초코가 보임
        ctx.strokeStyle = PEP[0]; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, -16); ctx.stroke();
        ctx.fillStyle = PEP[1]; ctx.beginPath(); ctx.arc(0, -16, 2.6, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = PEP[1]; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 10); ctx.stroke();       // 과자 손잡이
        ctx.strokeStyle = PEP[0]; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -16); ctx.stroke();       // 코팅
        if (k === 2) { ctx.fillStyle = '#f0d49a'; for (let j = 0; j < 7; j++) ctx.fillRect(-3 + ((j * 5) % 6), 6 - j * 3.4, 2.4, 1.6); }   // 아몬드 조각
        if (k === 1) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let j = 0; j < 4; j++) ctx.fillRect(-1, 4 - j * 6, 2, 1.5); }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(-2, -14); ctx.stroke();
      ctx.restore();
      if (mine) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(DOPE_NAMES[k], x, y - 48 + bob); }
      continue;
    }
    if (skinOn(state.p.find((q) => q.id === o), 'candy')) {
      // 캔디: 같은 색 막대사탕 (소용돌이 무늬)
      ctx.save(); ctx.translate(x, y - 22 + bob);
      ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 22); ctx.stroke();
      ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.arc(0, -4, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let k2 = 0; k2 < 26; k2++) { const t = k2 / 25 * Math.PI * 4 + time / 400, r = k2 / 25 * 10; ctx.lineTo(Math.cos(t) * r, -4 + Math.sin(t) * r); }
      ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -4, 11, 0, Math.PI * 2); ctx.stroke();
      if (mine) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(DOPE_NAMES[k], 0, -20); }
      ctx.restore();
      continue;
    }
    ctx.save(); ctx.translate(x, y - 16 + bob);
    const g = ctx.createRadialGradient(0, 2, 2, 0, 2, 26); g.addColorStop(0, `rgba(${c},0.45)`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 2, 26, 0, Math.PI * 2); ctx.fill();
    // 병: 둥근 몸통 + 목 + 코르크
    ctx.fillStyle = 'rgba(235,245,255,0.55)'; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2;
    ctx.fillRect(-4, -14, 8, 7); ctx.strokeRect(-4, -14, 8, 7);
    ctx.fillStyle = '#9a6a3a'; ctx.fillRect(-5, -18, 10, 5);
    ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.arc(0, 2, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-3, -1, 3, 0, Math.PI * 2); ctx.fill();
    if (mine) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(DOPE_NAMES[k], 0, -22); }
    ctx.restore();
  }
}
// 포탈: 주인 색 테두리의 소용돌이 타원. 짝이 아직 없으면 흐리게 (탈 수 없음)
// 아이템전 아이템: 동그란 아이콘 (목숨 ❤ · 데미지 ⚔ · 방어 🛡 · 효과 제거 ✨)
const ITEM_LOOK = { life: ['#ff4d6d', '#ffd0da', '❤'], power: ['#ff8a1e', '#ffe0b0', '⚔'], armor: ['#3f8cff', '#cfe2ff', '🛡'], clean: ['#2fd18a', '#d6ffe9', '✨'] };
function drawItems(state, time) {
  for (const [x, y, type, blink] of state.it || []) {
    const [c1, c2, ic] = ITEM_LOOK[type] || ITEM_LOOK.life, by = y + Math.sin(time / 260 + x) * 4;
    if (blink && Math.floor(time / 120) % 2) continue;   // 곧 사라질 때 깜빡임
    ctx.save(); ctx.translate(x, by);
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 34); glow.addColorStop(0, c1 + '66'); glow.addColorStop(1, c1 + '00');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(-6, -7, 2, 0, 0, 20); g.addColorStop(0, c2); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = '19px "Black Han Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText(ic, 0, 1.5);
    ctx.restore();
  }
}
// 원반 · 구름 발판 · 결계
function drawSkillObjs(state, time) {
  drawItems(state, time);
  const meQ = state.p.find((q) => q.id === myId), myTm = meQ ? meQ.tm : 0;
  for (const [x, y, w, k, o] of state.cw || []) {
    // 구름 발판: 몽글몽글한 구름 (사라질 때쯤 깜빡임). 남의 팀 구름은 밟을 수 없어서 흐릿하게
    const ow = state.p.find((q) => q.id === o), mine = o === myId || (myTm && ow && ow.tm === myTm);
    ctx.globalAlpha = (k < 0.25 ? 0.4 + 0.4 * Math.abs(Math.sin(time / 60)) : 0.95) * (mine ? 1 : 0.3);
    const cc = skinOn(ow, 'cottoncandy');   // 솜사탕 스킨: 분홍·하늘색 솜사탕
    for (let i = 0; i < 5; i++) { ctx.fillStyle = cc ? (i % 2 ? '#bfe6ff' : '#ffb3dc') : '#ffffff'; ctx.beginPath(); ctx.arc(x + w * (0.12 + i * 0.19), y + 6 - (i % 2 ? 6 : 2), 16 + (i % 2) * 5, 0, Math.PI * 2); ctx.fill(); }
    if (cc) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + w * (0.2 + i * 0.2), y + 2, 7, time / 400 + i, time / 400 + i + 3.5); ctx.stroke(); } }
    ctx.fillStyle = cc ? '#ff9fd0' : '#dbe9f7'; ctx.fillRect(x + 6, y + 8, w - 12, 8);
    ctx.globalAlpha = 1;
  }
  const bubNow = {};
  for (const [x, y, r, owner, t] of state.gw || []) {
    const pl = state.p.find((q) => q.id === owner);
    if (skinOn(pl, 'bubble')) {
      // 비눗방울 스킨: 무지갯빛 테두리 + 하얀 반짝임 (끝나면 퐁 터짐)
      bubNow[owner] = [x, y, r];
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = t < 0.6 ? 0.5 + 0.3 * Math.abs(Math.sin(time / 70)) : 1;
      const wob = 1 + Math.sin(time / 180) * 0.025;
      ctx.scale(wob, 2 - wob);
      ctx.fillStyle = 'rgba(220,240,255,0.10)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.strokeStyle = `hsla(${(time / 8 + i * 60) % 360},90%,70%,0.55)`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r - 2, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.18, r * 0.08, -0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.62, r * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      continue;
    }
    // 결계: 반투명 하늘색 원 + 회전하는 육각 무늬
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = t < 0.6 ? 0.3 + 0.3 * Math.abs(Math.sin(time / 70)) : 1;
    const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r);
    g.addColorStop(0, 'rgba(127,216,255,0.04)'); g.addColorStop(1, 'rgba(127,216,255,0.28)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pl ? pl.c : '#7fd8ff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.rotate(time / 900); ctx.strokeStyle = 'rgba(200,240,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); }
    ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
  }
  // 비눗방울이 사라지면 퐁!
  for (const [o, [x, y, r]] of Object.entries(bubPrev)) if (!bubNow[o]) {
    particles.push({ ring: true, x, y, life: 0.25, max: 0.25, r, c: '200,235,255', grow: true });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; particles.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.35, max: 0.35, c: `hsl(${i * 26},90%,75%)`, r: 3, nograv: true }); }
    particles.push({ txt: '퐁!', sz: 20, x, y: y - r * 0.4, vx: 0, vy: -50, life: 0.6, max: 0.6, c: '#dff3ff', nograv: true });
  }
  bubPrev = bubNow;
  for (const [x, y, w, owner, t] of state.lv || []) {
    // 화산 용암: 땅 위에 이글거리는 용암 + 올라오는 기포
    const fade = t < 0.6 ? 0.45 + 0.4 * Math.abs(Math.sin(time / 70)) : 1;
    ctx.save(); ctx.globalAlpha = fade;
    const g = ctx.createLinearGradient(0, y - 14, 0, y + 10);
    g.addColorStop(0, 'rgba(255,200,60,0.0)'); g.addColorStop(0.35, 'rgba(255,120,20,0.85)'); g.addColorStop(1, 'rgba(150,20,0,0.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y + 8);
    for (let i = 0; i <= 14; i++) { const xx = x + (w * i) / 14; ctx.lineTo(xx, y - 6 - 5 * Math.abs(Math.sin(time / 160 + i * 1.7))); }
    ctx.lineTo(x + w, y + 8); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const ph = ((time / 700 + i * 0.37) % 1), bx = x + w * ((i * 0.29 + 0.07) % 1);
      ctx.fillStyle = `rgba(255,${180 - ph * 100},40,${1 - ph})`; ctx.beginPath(); ctx.arc(bx, y - 4 - ph * 34, 3 + (1 - ph) * 3, 0, Math.PI * 2); ctx.fill();
    }
    const pl = state.p.find((q) => q.id === owner);
    if (pl) { ctx.strokeStyle = pl.c; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 * fade; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + w, y + 8); ctx.stroke(); }
    ctx.restore();
  }
  for (const [x, top, bottom, owner, t] of state.wl || []) {
    // 장벽: 돌벽돌로 쌓은 기둥 (사라질 때쯤 깜빡임)
    const pl = state.p.find((q) => q.id === owner), hw = 15, h = bottom - top;
    ctx.save(); ctx.globalAlpha = t < 0.6 ? 0.4 + 0.4 * Math.abs(Math.sin(time / 60)) : 1;
    ctx.fillStyle = '#8c8174'; ctx.fillRect(x - hw, top, hw * 2, h);
    ctx.strokeStyle = '#5e564c'; ctx.lineWidth = 2;
    for (let yy = top, row = 0; yy < bottom; yy += 22, row++) {
      ctx.beginPath(); ctx.moveTo(x - hw, yy); ctx.lineTo(x + hw, yy); ctx.stroke();
      const off = row % 2 ? 0 : -hw / 2; ctx.beginPath(); ctx.moveTo(x + off + hw / 2, yy); ctx.lineTo(x + off + hw / 2, Math.min(bottom, yy + 22)); ctx.stroke();
    }
    ctx.strokeStyle = '#4a433b'; ctx.lineWidth = 3; ctx.strokeRect(x - hw, top, hw * 2, h);
    if (pl) { ctx.fillStyle = pl.c; ctx.fillRect(x - hw, top - 5, hw * 2, 5); }
    ctx.restore();
  }
  for (const [x, y, ret, pz] of state.ds || []) {
    if (pz) {
      // 피자 스킨: 페퍼로니 피자 (돌아올 땐 아래로 치즈가 쭉 늘어남)
      if (ret) { ctx.strokeStyle = '#ffd85a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { const L = 18 + 10 * Math.abs(Math.sin(time / 120 + i)); ctx.beginPath(); ctx.moveTo(x + i * 9, y + 4); ctx.quadraticCurveTo(x + i * 12, y + L * 0.6, x + i * 10, y + L); ctx.stroke(); } }
      ctx.save(); ctx.translate(x, y); ctx.rotate((ret ? -1 : 1) * time / 45);
      ctx.fillStyle = '#d9913a'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd85a'; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8302a'; for (const [px, py] of [[8, -6], [-9, -5], [0, 9], [-4, -12], [11, 6], [-10, 8]]) { ctx.beginPath(); ctx.arc(px, py, 3.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(160,90,30,0.6)'; ctx.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 19, Math.sin(a) * 19); ctx.lineTo(-Math.cos(a) * 19, -Math.sin(a) * 19); ctx.stroke(); }
      ctx.restore();
      continue;
    }
    // 원반: 빙글빙글 도는 주황 원반 (돌아올 땐 반대로 돎)
    ctx.save(); ctx.translate(x, y); ctx.rotate((ret ? -1 : 1) * time / 40);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a5a1a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
function drawPortals(state, time) {
  for (const [x, y, o, done] of state.pt || []) {
    const pl = state.p.find((q) => q.id === o), col = pl ? pl.c : '#7a5cff';
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = done ? 1 : 0.5;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(150,120,255,0.75)'); g.addColorStop(1, 'rgba(40,20,90,0.15)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 26, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.stroke();
    if (pl && pl.sn && pl.sn.includes('vortex')) {
      // 소용돌이 스킨: 안쪽으로 빨려 드는 나선 4줄
      ctx.strokeStyle = 'rgba(200,230,255,0.85)'; ctx.lineWidth = 2.5;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        for (let t = 0; t <= 1.001; t += 0.05) { const rr = 36 * (1 - t * 0.85), an = t * 7 + k * Math.PI / 2 + time / 180; ctx.lineTo(Math.cos(an) * rr * 0.75, Math.sin(an) * rr); }
        ctx.stroke();
      }
    } else {
      ctx.rotate(time / 300); ctx.strokeStyle = 'rgba(230,220,255,0.75)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(6, 0, 12, 20, 0.4, 0, Math.PI * 1.2); ctx.stroke(); }
    }
    ctx.restore();
  }
}
// 트램펄린: 다리 + 빨강·파랑 테두리 + 출렁이는 매트
function drawTramps(time) {
  for (const t of STAGE.tramps || []) {
    const sag = (latest && latest.p.some((q) => q.x > t.x && q.x < t.x + t.w && Math.abs(q.y - t.y) < 30)) ? 8 : 2 + Math.sin(time / 300 + t.x) * 1;
    ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 4;
    for (const lx of [t.x + 8, t.x + t.w - 8]) { ctx.beginPath(); ctx.moveTo(lx, t.y); ctx.lineTo(lx - 6, t.y + 26); ctx.moveTo(lx, t.y); ctx.lineTo(lx + 6, t.y + 26); ctx.stroke(); }
    ctx.fillStyle = '#1a1a24'; ctx.beginPath(); ctx.moveTo(t.x + 4, t.y); ctx.quadraticCurveTo(t.x + t.w / 2, t.y + sag * 2, t.x + t.w - 4, t.y); ctx.lineTo(t.x + t.w - 4, t.y + 4); ctx.quadraticCurveTo(t.x + t.w / 2, t.y + sag * 2 + 4, t.x + 4, t.y + 4); ctx.fill();
    const segs = Math.max(4, Math.floor(t.w / 18));
    for (let i = 0; i < segs; i++) { ctx.fillStyle = i % 2 ? '#2a7af0' : '#ff3b4a'; const x1 = t.x + (i / segs) * t.w; ctx.fillRect(x1, t.y - 4, t.w / segs + 0.5, 6); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(t.x + 2, t.y - 4, t.w - 4, 1.5);
  }
}
// 홍수 물(용암): 반투명이라 안이 다 보임
function drawWater(state, time) {
  if (!state.wa) return;
  const [wy, lava, choco] = state.wa, W2 = STAGE.width + 800, H2 = STAGE.height + 800;
  const g = ctx.createLinearGradient(0, wy, 0, STAGE.height + 200);
  if (choco) { g.addColorStop(0, 'rgba(140,80,40,0.62)'); g.addColorStop(1, 'rgba(70,35,15,0.8)'); }
  else if (lava) { g.addColorStop(0, 'rgba(255,150,40,0.5)'); g.addColorStop(1, 'rgba(200,40,10,0.68)'); }
  else { g.addColorStop(0, 'rgba(80,170,240,0.38)'); g.addColorStop(1, 'rgba(20,60,150,0.6)'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-400, H2);
  for (let x = -400; x <= W2 - 400; x += 24) ctx.lineTo(x, wy + Math.sin(x / 60 + time / 400) * 5);
  ctx.lineTo(W2 - 400, H2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = choco ? 'rgba(200,140,90,0.95)' : lava ? 'rgba(255,230,120,0.9)' : 'rgba(220,245,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = -400; x <= W2 - 400; x += 24) ctx.lineTo(x, wy + Math.sin(x / 60 + time / 400) * 5);
  ctx.stroke();
  // 물방울·용암 거품
  ctx.fillStyle = choco ? 'rgba(240,210,180,0.5)' : lava ? 'rgba(255,220,120,0.6)' : 'rgba(230,248,255,0.5)';
  for (let i = 0; i < 18; i++) { const bx = (i * 173 + time / 20) % STAGE.width, by = wy + 20 + ((i * 97 + time / 15) % Math.max(40, STAGE.height - wy)); ctx.beginPath(); ctx.arc(bx, STAGE.height + wy - by + 40 > wy ? by : wy + 30, 2 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
}
// 섬광 자국: 내 것(또는 우리 팀 것)은 테두리만, 남의 것은 안이 안 보이게 하얗게
function drawFlashZones(state, time) {
  const me = state.p.find((q) => q.id === myId);
  for (const f of state.fz || []) {
    const mine = f.o === myId || (state.md && state.md[0] && me && f.tm === me.tm);
    if (mine) {
      ctx.strokeStyle = `rgba(255,250,200,${0.5 * f.a})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      continue;
    }
    const g = ctx.createRadialGradient(f.x, f.y, f.r * 0.2, f.x, f.y, f.r * 1.15);
    g.addColorStop(0, `rgba(255,255,250,${0.99 * f.a})`); g.addColorStop(0.75, `rgba(255,252,225,${0.97 * f.a})`); g.addColorStop(1, 'rgba(255,250,210,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,240,150,${0.35 * f.a})`;
    for (let i = 0; i < 6; i++) { const a = time / 600 + i; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.r * 0.6, f.y + Math.sin(a * 1.3) * f.r * 0.5, f.r * 0.25, 0, Math.PI * 2); ctx.fill(); }
  }
}
function drawPlayer(p, time) {
  if (!p.al || p.hid) return;       // 은신 중인 상대는 서버가 위치를 안 보내줌
  // 베놈·카니지에게 기생당한 몸: 온몸(주먹까지)이 검은색/빨간색으로 뒤덮임
  if (p.ctl && latest) {
    const cp2 = latest.p.find((q) => q.id === p.ctl);
    if (skinOn(cp2, 'carnage')) p = { ...p, c: '#b3121b', vnm: 2 };
    else if (skinOn(cp2, 'venom')) p = { ...p, c: '#141018', vnm: 1 };
  }
  const isClone = !!p.ow;
  const ownerId = p.ow || p.id;
  // 은신 중인 나: 반투명 / 내 분신: 연하게 / 상대 분신: 진짜와 똑같이
  let baseAlpha = 1;
  if (p.stl) baseAlpha = 0.35;
  const light = isClone && p.ow === myId; // 내 분신은 연한 색으로
  ctx.globalAlpha = baseAlpha * (p.inv && Math.floor(time / 80) % 2 === 0 ? 0.45 : 1);
  const x = p.x, y = p.y, f = p.f || 1;
  const G = p.sz || (p.gt ? 2 : 1);
  if (p.gh) { drawGhost(p, x, y, performance.now(), G); finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time); return; }
  const gy = y;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 22 * G, 5 * G, 0, 0, Math.PI * 2); ctx.fill();
  if (latest && latest.md && latest.md[0] && !isClone && TEAMS[p.tm]) {
    // 팀 모드: 발밑에 팀 색 고리
    ctx.strokeStyle = TEAMS[p.tm].color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, gy + 2, 28 * G, 8 * G, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // 둔화 상태: 발밑에 파란 고리
  if (p.sl && p.slm) {
    // 늪: 발밑에 진흙 웅덩이
    ctx.fillStyle = 'rgba(95,68,32,0.8)'; ctx.beginPath(); ctx.ellipse(x, gy + 1, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
  } else if (p.sl) {
    ctx.strokeStyle = 'rgba(127,184,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, gy, 30, 8, 0, 0, Math.PI * 2); ctx.stroke();
  }
  let sx = 1, sy = 1;
  if (!p.g) { sy = p.vy < 0 ? 1.08 : 0.95; sx = 2 - sy; }
  ctx.save(); ctx.translate(x, y);
  if (p.hs && !reduceMotion) ctx.rotate(Math.sin(time / 30) * 0.25);
  ctx.scale(sx * G, sy * G);
  if (p.at === 2 && p.ap === 1) {
    ctx.fillStyle = 'rgba(255,207,63,0.35)';
    ctx.beginPath(); ctx.arc(0, -PH / 2, 44 + Math.sin(time / 30) * 4, 0, Math.PI * 2); ctx.fill();
  }
  if (p.en && skinOn(p, 'centaur')) {
    // 켄타우로스: 엔진 불꽃 대신 뒤로 말 몸통 + 다리 4개가 달림
    const run = Math.abs(p.vx || 0) > 30 ? time / 55 : 0, back = -f;
    const titan = p.gt && skinOn(p, 'titan'), hc = titan ? '#8a3a32' : shadeHex(p.c, -0.25);   // 진격의 거인이면 근육색 말 몸
    ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(back * 22, -18, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = titan ? '#5a1a14' : shadeHex(p.c, -0.55); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = hc; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (const [lx, ph] of [[back * 2, 0], [back * 10, Math.PI], [back * 36, Math.PI / 2], [back * 46, Math.PI * 1.5]]) {
      const sw = Math.sin(run + ph) * 9;
      ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx + sw * 0.5, -2); ctx.lineTo(lx + sw, 6); ctx.stroke();
    }
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.moveTo(back * 50, -24); ctx.quadraticCurveTo(back * 66, -14 + Math.sin(time / 120) * 4, back * 60, 2); ctx.lineTo(back * 54, -16); ctx.closePath(); ctx.fill();   // 꼬리
  } else if (p.en) {
    // 엔진: 뒤쪽 불꽃
    const len = 18 + Math.min(40, Math.abs(p.vx || 0) / 14) + Math.sin(time / 40) * 5;
    const back = -f * PW / 2;
    const g2 = ctx.createLinearGradient(back, 0, back - f * len, 0);
    g2.addColorStop(0, 'rgba(255,220,90,0.95)'); g2.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(back, -PH * 0.62); ctx.lineTo(back - f * len, -PH * 0.45); ctx.lineTo(back, -PH * 0.28); ctx.closePath(); ctx.fill();
  }
  if (p.rb) {
    // 고무: 말랑하게 출렁임
    const wob = 1 + Math.sin(time / 70) * 0.06;
    ctx.scale(2 - wob, wob);
  }
  if (hasK(p, 'undying') && skinOn(p, 'phoenix')) {
    // 불사조: 처음부터 등에 주황 불꽃 날개, 3번 죽은 뒤엔 더 크게 타오르며 불씨가 날림
    const reborn = p.ms && p.ms - p.st >= 3, big = reborn ? 1.3 : 1;
    const flap = Math.sin(time / 140) * 0.18;
    if (reborn && Math.random() < 0.3) particles.push({ x: p.x + (Math.random() - 0.5) * 80, y: p.y - PH * 0.7 + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, life: 0.6, max: 0.6, c: Math.random() < 0.5 ? '#ffd36b' : '#ff7a1a', r: 3, nograv: true });
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 6, -PH * 0.62); ctx.rotate(sd * (0.25 + flap)); ctx.scale(sd * big, big);
      for (let k = 0; k < 5; k++) {
        const fl = Math.sin(time / 70 + k) * 3;
        const wg = ctx.createLinearGradient(0, 0, 70, -40);
        wg.addColorStop(0, 'rgba(255,240,140,0.95)'); wg.addColorStop(0.5, 'rgba(255,140,30,0.85)'); wg.addColorStop(1, 'rgba(220,40,10,0)');
        ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(30 + k * 6, -40 - k * 6 + fl, 62 + k * 4, -30 + k * 10 + fl); ctx.quadraticCurveTo(34 + k * 4, -6 + k * 6, 0, 8); ctx.fill();
      }
      ctx.restore();
    }
  }
  if (p.bf && skinOn(p, 'muscle')) {
    // 근육: 오라 대신 근육 빵빵 (몸에 그림은 아래에서)
  } else if (p.bf && skinOn(p, 'prism')) {
    // 무지개: 색이 계속 바뀌는 오라 두 겹
    const pulse = 1 + Math.sin(time / 90) * 0.08, hue = (time / 8) % 360;
    ctx.fillStyle = `hsla(${hue},90%,65%,0.25)`; ctx.beginPath(); ctx.ellipse(0, -PH / 2, 38 * pulse, 48 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = `hsla(${hue},95%,60%,0.95)`; ctx.stroke();
    ctx.strokeStyle = `hsla(${(hue + 120) % 360},95%,65%,0.7)`; ctx.beginPath(); ctx.ellipse(0, -PH / 2, 30 * pulse, 40 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (p.bf) {
    // 강화: 파란 오라
    const pulse = 1 + Math.sin(time / 90) * 0.08;
    ctx.fillStyle = 'rgba(80,140,255,0.28)';
    ctx.beginPath(); ctx.ellipse(0, -PH / 2, 36 * pulse, 46 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,170,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
  }
  if (p.fly) {
    const flap = Math.sin(time / 60) * 0.5;
    if (skinOn(p, 'angel') || skinOn(p, 'demon')) {
      // 천사 날개(하얀 깃털) / 악마 날개(박쥐 모양) — 더 크게
      const angel = skinOn(p, 'angel');
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * PW / 2, -PH * 0.62); ctx.rotate(sd * (0.35 + flap * 0.8)); ctx.scale(sd, 1);
        if (angel) {
          ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.strokeStyle = 'rgba(210,200,160,0.9)'; ctx.lineWidth = 1.5;
          for (let k = 3; k >= 0; k--) { ctx.beginPath(); ctx.ellipse(16 + k * 7, -8 - k * 6, 28 - k * 3, 9, -0.45 - k * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        } else {
          ctx.fillStyle = 'rgba(110,10,35,0.95)'; ctx.strokeStyle = '#2a0010'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(50, -22); ctx.lineTo(44, 4); ctx.lineTo(36, 0); ctx.lineTo(30, 14); ctx.lineTo(20, 8); ctx.lineTo(12, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      if (angel) {
        ctx.strokeStyle = 'rgba(255,225,90,0.95)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, -PH - 14 + Math.sin(time / 200) * 2, 15, 5, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#8b1030';
        ctx.beginPath(); ctx.moveTo(-14, -PH + 4); ctx.quadraticCurveTo(-20, -PH - 10, -12, -PH - 18); ctx.lineTo(-7, -PH + 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(14, -PH + 4); ctx.quadraticCurveTo(20, -PH - 10, 12, -PH - 18); ctx.lineTo(7, -PH + 2); ctx.fill();
      }
    } else {
      // 비행: 날개
      ctx.fillStyle = 'rgba(240,248,255,0.92)';
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * PW / 2, -PH * 0.62); ctx.rotate(sd * (0.5 + flap));
        ctx.beginPath(); ctx.ellipse(sd * 16, 0, 18, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
  }
  if (p.ru) {
    // 돌진: 뒤로 늘어지는 속도선 + 앞쪽 주황 기운
    ctx.strokeStyle = 'rgba(255,170,90,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const yy = -PH + 10 + i * 11, ln = 30 + ((time / 20 + i * 17) % 40); ctx.beginPath(); ctx.moveTo(-f * (PW / 2 + 6), yy); ctx.lineTo(-f * (PW / 2 + 6 + ln), yy); ctx.stroke(); }
    const rg = ctx.createRadialGradient(f * PW / 2, -PH / 2, 4, f * PW / 2, -PH / 2, 40); rg.addColorStop(0, 'rgba(255,200,120,0.6)'); rg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(f * PW / 2, -PH / 2, 40, 0, Math.PI * 2); ctx.fill();
  }
  if (p.hj) {
    // 무한 점프: 발밑에 하늘색 용수철 + 바람
    ctx.strokeStyle = 'rgba(127,224,255,0.9)'; ctx.lineWidth = 2.5;
    for (const sd of [-10, 10]) { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const yy = 2 + k * 1.6 + Math.sin(time / 60) * 1.5; ctx.lineTo(sd + (k % 2 ? 5 : -5), yy); } ctx.stroke(); }
    ctx.fillStyle = 'rgba(200,245,255,0.55)'; for (let i = 0; i < 3; i++) { const ph = ((time / 400) + i / 3) % 1; ctx.beginPath(); ctx.ellipse(0, 16 + ph * 14, 18 * (1 - ph * 0.4), 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (p.jw && p.jw[1]) {
    // 보석 2배: 몸 주위에 반짝이는 보석
    for (let i = 0; i < 5; i++) {
      const a = time / 500 + i * 1.256, xx = Math.cos(a) * 34, yy = -PH / 2 + Math.sin(a) * 26;
      ctx.save(); ctx.translate(xx, yy); ctx.rotate(Math.PI / 4); ctx.fillStyle = i % 2 ? 'rgba(94,242,255,0.9)' : 'rgba(200,250,255,0.9)'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
    }
  }
  if (p.cg) {
    // 충전: 충전 모드 초록 / 공격 모드 빨강 기운 (스택이 쌓일수록 진하게)
    const chg = p.cg[0], n = p.cg[1], k2 = 0.18 + n * 0.045 + Math.sin(time / 120) * 0.04;
    const cg2 = ctx.createRadialGradient(0, -PH / 2, 8, 0, -PH / 2, 46 + n * 2);
    cg2.addColorStop(0, chg ? `rgba(80,230,120,${k2})` : `rgba(255,60,50,${k2})`); cg2.addColorStop(1, chg ? 'rgba(40,200,90,0)' : 'rgba(220,30,20,0)');
    ctx.fillStyle = cg2; ctx.beginPath(); ctx.arc(0, -PH / 2, 46 + n * 2, 0, Math.PI * 2); ctx.fill();
    if (chg) { ctx.fillStyle = 'rgba(140,255,170,0.8)'; for (let i = 0; i < 4; i++) { const ph = ((time / 700) + i / 4) % 1; ctx.beginPath(); ctx.arc(Math.sin(i * 2.1) * 20, 6 - ph * (PH + 20), 2.5, 0, Math.PI * 2); ctx.fill(); } }
  }
  if (p.wv && skinOn(p, 'electric')) {
    // 전기: 몸 주위에 찌직거리는 전기
    const g4 = ctx.createRadialGradient(0, -PH / 2, 10, 0, -PH / 2, 50); g4.addColorStop(0, 'rgba(150,220,255,0.25)'); g4.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = g4; ctx.beginPath(); ctx.arc(0, -PH / 2, 50, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 3; k++) {
      const a1 = Math.random() * Math.PI * 2, a2 = a1 + 0.6 + Math.random() * 0.8, r1 = 30 + Math.random() * 10;
      zap(Math.cos(a1) * r1, -PH / 2 + Math.sin(a1) * r1 * 1.2, Math.cos(a2) * r1, -PH / 2 + Math.sin(a2) * r1 * 1.2, 10, k % 2 ? 'rgba(255,240,120,0.9)' : 'rgba(140,220,255,0.95)', 2);
    }
  } else if (p.wv) {
    // 파동: 몸 주위로 퍼지는 물결 고리
    ctx.save(); ctx.translate(0, -PH / 2);
    for (let i = 0; i < 3; i++) {
      const ph = ((time / 700) + i / 3) % 1;
      ctx.strokeStyle = `rgba(95,224,255,${0.55 * (1 - ph)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 30 + ph * 26, 36 + ph * 26, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  if (p.dp) {
    // 도핑: 강화면 물약 색 기운이 위로 올라가고, 약화면 어둡게 아래로 처짐
    const c = DOPE_RGB[p.dp[0]], bad = p.dp[1];
    ctx.save(); ctx.translate(0, -PH / 2);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 52);
    g.addColorStop(0, bad ? 'rgba(60,50,80,0.35)' : `rgba(${c},0.35)`); g.addColorStop(1, bad ? 'rgba(40,30,60,0)' : `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const ph = ((time / 900) + i / 5) % 1, xx = Math.sin(i * 2.3 + time / 400) * 26, yy = bad ? -20 + ph * 60 : 30 - ph * 70;
      ctx.fillStyle = bad ? `rgba(120,110,140,${0.7 * (1 - ph)})` : `rgba(${c},${0.85 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(xx, yy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  if (p.sun && skinOn(p, 'blackhole')) {
    // 블랙홀: 태양 대신 검은 구멍 + 빨려 들어가는 보라 고리
    ctx.save(); ctx.translate(0, -PH / 2);
    const hg = ctx.createRadialGradient(0, 0, 14, 0, 0, 58);
    hg.addColorStop(0, 'rgba(0,0,0,0.9)'); hg.addColorStop(0.45, 'rgba(90,20,160,0.55)'); hg.addColorStop(1, 'rgba(40,0,80,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(-time / 500);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.strokeStyle = `rgba(${i % 2 ? '200,120,255' : '130,50,230'},0.75)`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 50 - i * 6, 16 - i * 2, 0, 0.2, Math.PI * 1.3); ctx.stroke();
    }
    ctx.restore();
  } else if (p.sun) {
    // 태양: 뒤에서 빛나는 햇살 (초신성 스킨이면 파란 태양)
    const nova = skinOn(p, 'supernova');
    ctx.save(); ctx.translate(0, -PH / 2); ctx.rotate(time / 900);
    ctx.fillStyle = nova ? 'rgba(80,170,255,0.4)' : 'rgba(255,200,40,0.35)';
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(-6, 30); ctx.lineTo(0, 54 + Math.sin(time / 120 + i) * 6); ctx.lineTo(6, 30); ctx.fill(); }
    const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 44);
    sg.addColorStop(0, nova ? 'rgba(200,235,255,0.65)' : 'rgba(255,230,120,0.55)'); sg.addColorStop(1, nova ? 'rgba(40,110,255,0)' : 'rgba(255,170,30,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (p.fd) {
    // 화염 돌진: 뒤로 긴 불꽃
    const g3 = ctx.createLinearGradient(0, 0, -f * 120, 0);
    if (skinOn(p, 'bluefire')) { g3.addColorStop(0, 'rgba(140,210,255,0.95)'); g3.addColorStop(1, 'rgba(30,90,255,0)'); }
    else if (skinOn(p, 'blackfire')) { g3.addColorStop(0, 'rgba(150,60,230,0.95)'); g3.addColorStop(0.5, 'rgba(25,6,40,0.85)'); g3.addColorStop(1, 'rgba(10,0,20,0)'); }
    else if (skinOn(p, 'soul')) {
      // 영혼 돌진: 뒤로 반투명한 내 잔상(유령)이 줄줄이 따라옴
      for (let k = 3; k >= 1; k--) {
        ctx.fillStyle = `rgba(150,255,220,${0.32 - k * 0.07})`;
        roundRect(-f * (34 * k) - PW / 2, -PH + 4 * k, PW, PH - 4 * k, 14); ctx.fill();
        ctx.fillStyle = `rgba(10,50,50,${0.4 - k * 0.1})`;
        for (const ex of [-6, 6]) { ctx.beginPath(); ctx.ellipse(-f * (34 * k) + ex, -PH * 0.62 + 2 * k, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      g3.addColorStop(0, 'rgba(200,255,235,0.6)'); g3.addColorStop(1, 'rgba(60,220,180,0)');
    }
    else { g3.addColorStop(0, 'rgba(255,200,60,0.9)'); g3.addColorStop(1, 'rgba(255,60,20,0)'); }
    ctx.fillStyle = g3; ctx.beginPath(); ctx.ellipse(-f * 50, -PH / 2, 80, 30, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (p.el && skinOn(p, 'solar') && !p.hs) {
    // 태양계: 시전자가 태양 — 뒤로 이글거리는 코로나
    ctx.save(); ctx.translate(0, -PH / 2); ctx.rotate(time / 1200);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = i % 2 ? 'rgba(255,170,40,0.55)' : 'rgba(255,220,90,0.5)'; ctx.beginPath(); ctx.moveTo(-6, 26); ctx.lineTo(0, 44 + Math.sin(time / 110 + i) * 6); ctx.lineTo(6, 26); ctx.fill(); }
    const cg = ctx.createRadialGradient(0, 0, 14, 0, 0, 46); cg.addColorStop(0, 'rgba(255,240,150,0.6)'); cg.addColorStop(1, 'rgba(255,140,20,0)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (p.tc) drawTentacles(p, f, time, G);   // 촉수: 몸 뒤에
  ctx.fillStyle = p.hs ? '#ffffff' : p.c;
  if (p.rb && skinOn(p, 'slime')) {
    // 슬라임: 아래가 퍼진 말랑한 덩어리 (내 색) + 반짝임 + 흘러내림
    // 말랑한 물방울 모양: 둥근 윗부분이 출렁이고 바닥은 넓게 퍼짐
    const sq = Math.sin(time / 140) * 4, R = PW / 2 + 9, Hh = PH * 0.82 - sq;
    ctx.beginPath(); ctx.moveTo(-R - sq * 0.5, -2);
    ctx.bezierCurveTo(-R - 6, -Hh * 0.55, -R * 0.75, -Hh, 0, -Hh);
    ctx.bezierCurveTo(R * 0.75, -Hh, R + 6, -Hh * 0.55, R + sq * 0.5, -2);
    ctx.bezierCurveTo(R + 4, 3, R * 0.4, 5, 0, 5); ctx.bezierCurveTo(-R * 0.4, 5, -R - 4, 3, -R - sq * 0.5, -2); ctx.fill();
    ctx.globalAlpha *= 0.5; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-8, -PH * 0.7, 5, 9, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.5;
    ctx.fillStyle = p.c;
    for (const dx of [-14, 6, 16]) { const dl = 4 + ((time / 18 + dx * 7) % 10); ctx.beginPath(); ctx.ellipse(dx, 2 + dl * 0.3, 3, 3 + dl * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (p.rb && skinOn(p, 'balloon')) {
    // 풍선: 둥글게 부푼 몸 + 반짝임 + 아래 꼭지와 줄
    const wob = Math.sin(time / 160) * 2;
    ctx.beginPath(); ctx.ellipse(0, -PH * 0.55, PW / 2 + 10 + wob, PH * 0.55 - wob, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(5, -1); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill();   // 꼭지
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(6 + Math.sin(time / 120) * 4, 8, 0, 16); ctx.stroke();   // 줄
    ctx.globalAlpha *= 0.55; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-9, -PH * 0.78, 5, 10, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.55;
    ctx.fillStyle = p.hs ? '#ffffff' : p.c;
  } else roundRect(-PW / 2, -PH, PW, PH, 12), ctx.fill();
  if (p.bf && skinOn(p, 'muscle') && !p.hs && !(p.gt && skinOn(p, 'titan'))) {   // 진격의 거인은 이미 근육질이라 겹쳐 그리지 않음
    // 근육: 가슴·복근·어깨 근육 그림자
    const dk = shadeHex(p.c, -0.35), hi = shadeHex(p.c, 0.3);
    ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(-8, -PH * 0.45, 8, 6, 0, 0, Math.PI * 2); ctx.ellipse(8, -PH * 0.45, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dk; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -PH * 0.52); ctx.lineTo(0, -6); ctx.stroke();
    for (const yy of [-PH * 0.3, -PH * 0.2, -PH * 0.1]) { ctx.beginPath(); ctx.moveTo(-8, yy); ctx.lineTo(8, yy); ctx.stroke(); }
    ctx.fillStyle = dk; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * (PW / 2 + 1), -PH * 0.6, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); }   // 어깨
  }
  if (p.el && skinOn(p, 'solar') && !p.hs) {
    // 몸이 이글이글 타는 태양 표면으로
    const sg2 = ctx.createRadialGradient(-6, -PH * 0.6, 4, 0, -PH / 2, PH * 0.75);
    sg2.addColorStop(0, '#fff6b0'); sg2.addColorStop(0.45, '#ffc93a'); sg2.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = sg2; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,20,0.45)';
    for (let i = 0; i < 5; i++) { const bx = Math.sin(time / 400 + i * 2.3) * 12, by = -PH * 0.2 - ((time / 30 + i * 13) % (PH * 0.7)); ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 2) * 2, 0, Math.PI * 2); ctx.fill(); }
  }
  if (p.gt && skinOn(p, 'titan')) {
    // 근육이 드러난 거대한 모습: 붉은 근섬유 + 이를 드러낸 입
    ctx.fillStyle = '#a8423a'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(90,20,18,0.75)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) { const xx = -PW / 2 + 4 + i * 5.5; ctx.beginPath(); ctx.moveTo(xx, -PH + 4); ctx.quadraticCurveTo(xx + 3, -PH / 2, xx - 1, -6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(230,150,130,0.55)';
    ctx.beginPath(); ctx.ellipse(-8, -PH * 0.42, 7, 6, 0, 0, Math.PI * 2); ctx.ellipse(8, -PH * 0.42, 7, 6, 0, 0, Math.PI * 2); ctx.fill();   // 가슴
    for (const yy of [-PH * 0.25, -PH * 0.14]) { ctx.beginPath(); ctx.ellipse(-5, yy, 4, 3, 0, 0, Math.PI * 2); ctx.ellipse(5, yy, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); }   // 복근
    ctx.fillStyle = '#f2ead8'; ctx.fillRect(-11, -PH + 28, 22, 5);   // 이빨
    ctx.strokeStyle = '#5a1a14'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-11 + i * 4.4, -PH + 28); ctx.lineTo(-11 + i * 4.4, -PH + 33); ctx.stroke(); }
  }
  if (p.gt && skinOn(p, 'snowman')) {
    // 눈사람: 하얀 눈덩이 두 개 + 숯 단추 + 목도리(내 색) + 당근 코
    ctx.fillStyle = '#f7fbff'; ctx.strokeStyle = 'rgba(160,190,220,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -PH * 0.3, PW / 2 + 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -PH * 0.74, PW / 2 - 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = p.c; ctx.fillRect(-PW / 2 + 2, -PH * 0.55, PW - 4, 5); ctx.fillRect(f * 6, -PH * 0.55, 5, 14);   // 목도리
    ctx.fillStyle = '#2a2a30'; for (const yy of [-PH * 0.38, -PH * 0.26, -PH * 0.14]) { ctx.beginPath(); ctx.arc(0, yy, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ff8a1e'; ctx.beginPath(); ctx.moveTo(f * 4, -PH * 0.7); ctx.lineTo(f * 18, -PH * 0.68); ctx.lineTo(f * 4, -PH * 0.65); ctx.fill();   // 당근 코
    if (Math.random() < 0.15) particles.push({ x: p.x + (Math.random() - 0.5) * 120, y: p.y - PH * G - 20, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 40, life: 1.2, max: 1.2, c: '#ffffff', r: 2.5, nograv: true });
  }
  if (hasK(p, 'hulk') && G > 1.02) {
    // 헐크: 커질수록 초록빛 + 근육 줄
    const hf = (G - 1) / 0.9;
    const red = skinOn(p, 'redhulk');
    ctx.fillStyle = red ? `rgba(225,40,35,${0.2 + hf * 0.5})` : `rgba(80,200,70,${0.15 + hf * 0.4})`; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
    ctx.strokeStyle = red ? `rgba(70,10,10,${0.2 + hf * 0.4})` : `rgba(20,60,20,${0.2 + hf * 0.4})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -PH + 30); ctx.quadraticCurveTo(0, -PH + 36, 10, -PH + 30); ctx.stroke();
  }
  if (p.c === '#26252e' || p.c === '#f4f4f6') { ctx.strokeStyle = p.c === '#26252e' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke(); }
  if (p.rk && skinOn(p, 'tree')) {
    // 나무: 나무껍질 몸통 + 머리 위 잎사귀
    ctx.fillStyle = '#7a4e26'; roundRect(-PW / 2 - 2, -PH, PW + 4, PH + 2, 6); ctx.fill();
    ctx.strokeStyle = '#4e3016'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const xx = -PW / 2 + 4 + i * 8; ctx.beginPath(); ctx.moveTo(xx, -PH + 6); ctx.bezierCurveTo(xx + 3, -PH * 0.6, xx - 3, -PH * 0.3, xx + 1, -2); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(6, -PH * 0.45, 4, 6, 0, 0, Math.PI * 2); ctx.stroke();   // 옹이
    for (const [lx, ly, lr, lc] of [[-14, -PH - 6, 13, '#3f9a3a'], [12, -PH - 8, 14, '#4caf3c'], [0, -PH - 18, 15, '#5cc84a'], [-4, -PH - 4, 10, '#6fd65a']]) { ctx.fillStyle = lc; ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill(); }
  } else if (p.rk && skinOn(p, 'crystal')) {
    // 크리스탈: 보랏빛 투명 결정 (면이 반짝임)
    const cg = ctx.createLinearGradient(-PW / 2, -PH, PW / 2, 0);
    cg.addColorStop(0, 'rgba(235,215,255,0.85)'); cg.addColorStop(0.5, 'rgba(170,120,255,0.75)'); cg.addColorStop(1, 'rgba(110,200,255,0.8)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(0, -PH - 14); ctx.lineTo(PW / 2 + 6, -PH + 12); ctx.lineTo(PW / 2 + 3, -4); ctx.lineTo(0, 4); ctx.lineTo(-PW / 2 - 3, -4); ctx.lineTo(-PW / 2 - 6, -PH + 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -PH - 14); ctx.lineTo(0, 4); ctx.moveTo(-PW / 2 - 6, -PH + 12); ctx.lineTo(PW / 2 + 3, -4); ctx.moveTo(PW / 2 + 6, -PH + 12); ctx.lineTo(-PW / 2 - 3, -4); ctx.stroke();
    const tw = (Math.sin(time / 150) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`;
    for (const [sx2, sy2] of [[-8, -PH + 4], [10, -PH / 2], [-4, -14]]) { ctx.beginPath(); ctx.moveTo(sx2, sy2 - 5); ctx.lineTo(sx2 + 2, sy2); ctx.lineTo(sx2, sy2 + 5); ctx.lineTo(sx2 - 2, sy2); ctx.fill(); }
  } else if (p.rk && skinOn(p, 'gold')) {
    // 골드: 번쩍이는 금덩어리 몸
    const gg = ctx.createLinearGradient(-PW / 2, -PH, PW / 2, 0);
    gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.35, '#ffd43a'); gg.addColorStop(0.7, '#d99a10'); gg.addColorStop(1, '#a86e05');
    ctx.fillStyle = gg; roundRect(-PW / 2 - 3, -PH - 3, PW + 6, PH + 5, 8); ctx.fill();
    ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 2; roundRect(-PW / 2 - 3, -PH - 3, PW + 6, PH + 5, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,210,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-PW / 2 + 2, -PH + 4); ctx.lineTo(-PW / 2 + 2, -8); ctx.stroke();
    const gs = 22 + ((time / 5) % 110);
    if (gs < PH + 4) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-PW / 2, -PH + gs); ctx.lineTo(PW / 2, -PH + gs - 18); ctx.stroke(); }
    const tw = (Math.sin(time / 130) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + tw * 0.65})`;
    for (const [sx2, sy2, sz] of [[-10, -PH + 6, 5], [12, -PH / 2 + 4, 4], [-2, -12, 3.5], [PW / 2 + 6, -PH + 2, 4]]) { ctx.beginPath(); ctx.moveTo(sx2, sy2 - sz); ctx.lineTo(sx2 + sz * 0.35, sy2); ctx.lineTo(sx2, sy2 + sz); ctx.lineTo(sx2 - sz * 0.35, sy2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(sx2 - sz, sy2); ctx.lineTo(sx2, sy2 + sz * 0.35); ctx.lineTo(sx2 + sz, sy2); ctx.lineTo(sx2, sy2 - sz * 0.35); ctx.closePath(); ctx.fill(); }
  } else if (p.rk && skinOn(p, 'steel')) {
    // 강철: 반짝이는 금속판 + 리벳
    const sg = ctx.createLinearGradient(-PW / 2, -PH, PW / 2, 0);
    sg.addColorStop(0, 'rgba(225,235,245,0.95)'); sg.addColorStop(0.5, 'rgba(140,155,175,0.95)'); sg.addColorStop(1, 'rgba(90,100,118,0.95)');
    ctx.fillStyle = sg; roundRect(-PW / 2 - 3, -PH - 3, PW + 6, PH + 5, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(50,58,72,0.9)'; ctx.lineWidth = 2; roundRect(-PW / 2 - 3, -PH - 3, PW + 6, PH + 5, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-PW / 2 - 3, -PH / 2); ctx.lineTo(PW / 2 + 3, -PH / 2); ctx.stroke();
    ctx.fillStyle = '#4b5568'; for (const [rx, ry] of [[-15, -PH + 5], [15, -PH + 5], [-15, -6], [15, -6], [-15, -PH / 2 + 6], [15, -PH / 2 + 6]]) { ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2); ctx.fill(); }
    const sh = 22 + ((time / 6) % 110);
    if (sh < PH + 4) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-PW / 2, -PH + sh); ctx.lineTo(PW / 2, -PH + sh - 18); ctx.stroke(); }
  } else if (p.rk) {
    // 바위: 딱딱한 돌 모양
    ctx.fillStyle = 'rgba(128,122,116,0.88)';
    ctx.beginPath(); ctx.moveTo(-PW / 2 - 3, -PH + 8); ctx.lineTo(-6, -PH - 4); ctx.lineTo(PW / 2 + 3, -PH + 4);
    ctx.lineTo(PW / 2 + 2, -4); ctx.lineTo(4, 2); ctx.lineTo(-PW / 2 - 2, -2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,56,52,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -PH + 6); ctx.lineTo(-2, -PH / 2); ctx.lineTo(-12, -14); ctx.moveTo(8, -PH + 14); ctx.lineTo(12, -24); ctx.stroke();
  }
  if (skinOn(p, 'soul') && hasK(p, 'fire')) {
    // 영혼 스킨 주인: 작은 도깨비불 두 개가 몸 주위를 떠돎
    for (let i = 0; i < 2; i++) {
      const a4 = time / 700 + i * Math.PI;
      drawSoulWisp(Math.cos(a4) * 38, -PH * 0.55 + Math.sin(a4 * 2) * 10, 8, time, i * 3, 0.55 + 0.25 * Math.sin(time / 300 + i), false);
    }
  }
  // 독침: 몸에서 독 방울이 올라감 (쌓인 만큼 많이)
  if (p.oi && Math.random() < 0.35) particles.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y - 2, vx: -Math.sign(p.vx || 1) * (40 + Math.random() * 80), vy: -30 - Math.random() * 40, life: 0.35, max: 0.35, c: Math.random() < 0.5 ? '#ffffff' : '#bfe8ff', r: 2.5 });   // 얼음 위에서 미끄러지면 얼음 가루
  // 점프 스킨: 용수철(발밑)은 땅에서 눌려 있고 뛸 때 늘어남 / 날개(등 뒤)는 공중에서 펄럭임
  if (skinOn(p, 'spring')) {
    const len = p.g ? 4 : Math.min(18, 6 + Math.max(0, -p.vy) / 40);
    ctx.strokeStyle = '#ff7ab0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-9, 0);
    for (let i = 1; i <= 5; i++) ctx.lineTo(-9 + i * 3.6 + (i % 2 ? -3 : 3), -len * i / 5);
    ctx.lineTo(9, 0); ctx.stroke();
    ctx.fillStyle = '#ff7ab0'; ctx.fillRect(-11, 0, 22, 2.5);
  }
  if (skinOn(p, 'wings') && !p.g) {
    const flap = Math.sin(time / 70) * 0.7;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(-f * PW * 0.3, -PH * 0.6); ctx.rotate(s * (0.3 + flap * 0.4) * (f));
      ctx.fillStyle = 'rgba(244,244,255,0.9)'; ctx.beginPath(); ctx.ellipse(-f * 14, 0, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  // 로켓 스킨: 돌진할 때 뒤로 불꽃
  if (skinOn(p, 'rocket') && p.ru) {
    for (let i = 0; i < 4; i++) {
      const L = 26 + Math.random() * 14;
      ctx.fillStyle = i % 2 ? 'rgba(255,200,60,0.85)' : 'rgba(255,110,40,0.8)';
      ctx.beginPath(); ctx.moveTo(-f * PW / 2, -PH * 0.45 + (i - 1.5) * 6); ctx.lineTo(-f * (PW / 2 + L), -PH * 0.45 + (i - 1.5) * 4); ctx.lineTo(-f * PW / 2, -PH * 0.45 + (i - 1.5) * 6 + 5); ctx.fill();
    }
  }
  // 마법진 스킨: 충전할수록 발밑 마법진이 커지고 빙글빙글 돎
  if (skinOn(p, 'magic') && p.cg && (p.cg[0] || p.cg[1] > 0)) {
    const n = p.cg[1] || 0, R2 = 24 + Math.min(n, 20) * 1.1;
    ctx.save(); ctx.translate(0, 2); ctx.rotate(time / 500); ctx.scale(1, 0.35);
    ctx.strokeStyle = 'rgba(160,120,255,0.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, R2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R2 * 0.7, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R2 * 0.7, Math.sin(a) * R2 * 0.7); ctx.lineTo(Math.cos(a + 0.5) * R2, Math.sin(a + 0.5) * R2); ctx.stroke(); }
    ctx.restore();
  }
  if (p.vn > 0) {
    const n = Math.min(4, 1 + Math.floor(p.vn / 3));
    for (let i = 0; i < n; i++) {
      const yy = -PH * 0.25 - ((time / 12 + i * 19) % 46);
      ctx.fillStyle = 'rgba(160,230,80,0.75)'; ctx.beginPath(); ctx.arc(Math.sin(time / 220 + i * 2) * 11, yy, 2.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 암습 중: 보라색 테두리 (다음 공격이 세다는 표시)
  if (p.ab) { ctx.strokeStyle = 'rgba(180,140,255,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(-PW / 2 - 5, -PH - 5, PW + 10, PH + 10); ctx.setLineDash([]); }
  // 아이템: 데미지 2배 중 주황 불꽃 테두리 · 방어 중 파란 방울
  if (p.ia) { ctx.strokeStyle = `rgba(255,138,30,${0.6 + 0.3 * Math.sin(time / 70)})`; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.strokeRect(-PW / 2 - 6, -PH - 6, PW + 12, PH + 12); ctx.setLineDash([]); }
  if (p.ig2) { ctx.strokeStyle = 'rgba(63,140,255,0.85)'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(120,180,255,0.14)'; ctx.beginPath(); ctx.ellipse(0, -PH / 2, PW / 2 + 16, PH / 2 + 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // 흡혈 Q 중: 몸 주위에 붉은 기운
  if (p.lu) { ctx.strokeStyle = `rgba(200,16,46,${0.5 + 0.3 * Math.sin(time / 90)})`; ctx.lineWidth = 3; ctx.strokeRect(-PW / 2 - 4, -PH - 4, PW + 8, PH + 8); }
  // 저주받음: 머리 위 보라 해골 + 보라 연기
  if (p.cu === 2) {
    // 부두 인형 스킨: 머리 위에 바늘 꽂힌 헝겊 인형이 흔들림
    const sy = -PH - 58 + Math.sin(time / 150) * 2;   // 이름표 위쪽
    ctx.save(); ctx.translate(0, sy); ctx.rotate(Math.sin(time / 260) * 0.15); ctx.scale(1.4, 1.4);
    ctx.fillStyle = '#c89a6a'; ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 4, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(-11, 0, 22, 3); ctx.fillRect(-5, 10, 3, 6); ctx.fillRect(2, 10, 3, 6);
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1.2;
    for (const ex of [-3, 3]) { ctx.beginPath(); ctx.moveTo(ex - 1.5, -9.5); ctx.lineTo(ex + 1.5, -6.5); ctx.moveTo(ex + 1.5, -9.5); ctx.lineTo(ex - 1.5, -6.5); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(3, 2); ctx.moveTo(-3, 6); ctx.lineTo(3, 6); ctx.stroke();
    ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 1.2;
    for (const [px, py, a] of [[4, -10, -0.7], [-3, 4, 0.5], [3, 7, -0.3]]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 11, py + Math.sin(a) * 11 - 4); ctx.stroke(); ctx.fillStyle = '#e8324a'; ctx.beginPath(); ctx.arc(px + Math.cos(a) * 11, py + Math.sin(a) * 11 - 4, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  } else if (p.cu) {
    const sy = -PH - 26 + Math.sin(time / 150) * 2;
    ctx.fillStyle = 'rgba(106,44,145,0.9)'; ctx.beginPath(); ctx.arc(0, sy, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-5, sy + 5, 10, 6);
    ctx.fillStyle = '#e6d0ff'; ctx.beginPath(); ctx.arc(-3.5, sy - 1, 2.4, 0, Math.PI * 2); ctx.arc(3.5, sy - 1, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  // 수호 보호막: 몸을 감싼 금빛 방울
  if (p.gd) {
    ctx.strokeStyle = 'rgba(255,211,107,0.9)'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,230,150,0.15)';
    ctx.beginPath(); ctx.ellipse(0, -PH / 2, PW / 2 + 14, PH / 2 + 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // 고양이 스킨: 암습 중 머리에 고양이 귀
  if (p.ab && skinOn(p, 'cat')) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#f2b05e'; ctx.beginPath(); ctx.moveTo(s * 5, -PH + 2); ctx.lineTo(s * 16, -PH - 16); ctx.lineTo(s * 19, -PH + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb3c8'; ctx.beginPath(); ctx.moveTo(s * 9, -PH + 1); ctx.lineTo(s * 15.5, -PH - 9); ctx.lineTo(s * 16.5, -PH + 2); ctx.closePath(); ctx.fill();
    }
  }
  // 모기 스킨: 흡혈 Q 중 모기 세 마리가 몸 주위를 맴돎
  if (p.lu && skinOn(p, 'mosquito')) {
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) { const a = time / 180 + (i * Math.PI * 2) / 3; ctx.fillText('🦟', Math.cos(a) * (PW / 2 + 18), -PH / 2 + Math.sin(a * 1.7) * (PH / 2 + 6)); }
  }
  // 복어 스킨에 독이 쌓임: 가시 돋친 노란 공처럼 부풀어 보임 (독이 많을수록 크게)
  if (p.pf && p.vn) {
    const R = PW / 2 + 8 + Math.min(15, p.vn) * 1.1, cy0 = -PH / 2;
    ctx.fillStyle = 'rgba(240,210,106,0.35)'; ctx.strokeStyle = 'rgba(176,140,40,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, cy0, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + Math.sin(time / 300) * 0.05; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, cy0 + Math.sin(a) * R); ctx.lineTo(Math.cos(a) * (R + 7), cy0 + Math.sin(a) * (R + 7)); ctx.stroke(); }
  }
  // 가시: 몸 둘레에 초록 가시가 돋음
  if (p.th) {
    ctx.fillStyle = '#4f7a2e'; ctx.strokeStyle = '#2f4a1a'; ctx.lineWidth = 1.5;
    const n = 14, wob = Math.sin(time / 120) * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, rx = PW / 2 + 4, ry = PH / 2 + 4, cx0 = Math.cos(a) * rx, cy0 = -PH / 2 + Math.sin(a) * ry;
      const ox = Math.cos(a) * (12 + wob), oy = Math.sin(a) * (12 + wob), px = -Math.sin(a) * 5, py = Math.cos(a) * 5;
      ctx.beginPath(); ctx.moveTo(cx0 + px, cy0 + py); ctx.lineTo(cx0 + ox, cy0 + oy); ctx.lineTo(cx0 - px, cy0 - py); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // 축소당함: 머리 위에 분홍 ▼ 두 개가 깜빡임
  if (p.shk) {
    ctx.fillStyle = `rgba(255,122,217,${0.6 + 0.4 * Math.sin(time / 100)})`;
    for (const dx of [-7, 7]) { const yy = -PH - 16 + Math.sin(time / 130 + dx) * 2; ctx.beginPath(); ctx.moveTo(dx - 5, yy - 5); ctx.lineTo(dx + 5, yy - 5); ctx.lineTo(dx, yy + 3); ctx.closePath(); ctx.fill(); }
  }
  // 낚싯줄에 감김: 몸에 갈색 줄이 비스듬히 여러 번 감김 + 매듭
  if (p.rp === 2) {
    // 쇠사슬 스킨에 감김: 회색 사슬 고리가 몸을 감고 자물쇠
    ctx.strokeStyle = '#9aa0aa'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      const yy = -PH * (0.2 + i * 0.2) + Math.sin(time / 90 + i) * 1.5;
      ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.ellipse(0, yy, PW / 2 + 5, 5, -0.25, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(PW / 2 - 2, -PH * 0.5 - 2, 11, 9);
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(PW / 2 + 3.5, -PH * 0.5 - 3, 4, Math.PI, 0); ctx.stroke();
  } else if (p.rp) {
    ctx.strokeStyle = '#a07a48'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const yy = -PH * (0.2 + i * 0.2) + Math.sin(time / 90 + i) * 1.5;
      ctx.beginPath(); ctx.ellipse(0, yy, PW / 2 + 5, 5, -0.25, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#7a5a30'; ctx.beginPath(); ctx.arc(PW / 2 + 3, -PH * 0.5, 4, 0, Math.PI * 2); ctx.fill();
  }
  // 표식이 붙은 상대: 빨간 조준 표시
  if (p.mt) {
    const ty = -PH - 24 + Math.sin(time / 120) * 2;
    ctx.strokeStyle = 'rgba(255,77,109,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, ty, 8, 0, Math.PI * 2); ctx.moveTo(0, ty - 13); ctx.lineTo(0, ty + 13); ctx.moveTo(-13, ty); ctx.lineTo(13, ty); ctx.stroke();
  }
  if (p.brn && p.bb === 3) {
    // 영혼 불에 붙음: 머리 위로 작은 영혼들이 빙글빙글 돌며 빠져나감
    for (let i = 0; i < 3; i++) {
      const a3 = time / 260 + (i * Math.PI * 2) / 3;
      drawSoulWisp(Math.cos(a3) * 18, -PH - 8 + Math.sin(a3) * 6 - (time / 8 + i * 12) % 14, 10, time, i * 2, 0.85, i === 0);
    }
  } else if (p.brn) {
    // 불붙음: 몸 위로 흔들리는 불꽃
    for (let i = 0; i < 3; i++) {
      const fx2 = -12 + i * 12, h2 = 16 + Math.sin(time / 50 + i * 2) * 6;
      ctx.fillStyle = p.bb === 3 ? (i % 2 ? 'rgba(120,255,160,0.9)' : 'rgba(20,150,70,0.85)') : p.bb === 2 ? (i % 2 ? 'rgba(140,50,220,0.9)' : 'rgba(20,6,32,0.9)') : p.bb ? (i % 2 ? 'rgba(150,215,255,0.9)' : 'rgba(40,110,255,0.85)') : (i % 2 ? 'rgba(255,180,40,0.85)' : 'rgba(255,80,20,0.85)');
      ctx.beginPath(); ctx.moveTo(fx2 - 7, -PH + 10); ctx.quadraticCurveTo(fx2, -PH - h2, fx2 + 7, -PH + 10); ctx.fill();
    }
  }
  if (p.icd && p.iau) {
    // 오로라에 갇힘: 몸을 감싼 빛의 기둥 안에서 초록·청록·보라 띠가 일렁임
    const cg = ctx.createLinearGradient(-PW, 0, PW, 0);
    cg.addColorStop(0, 'rgba(42,245,152,0.15)'); cg.addColorStop(0.5, 'rgba(58,224,208,0.55)'); cg.addColorStop(1, 'rgba(166,107,255,0.15)');
    ctx.fillStyle = cg; roundRect(-PW / 2 - 12, -PH - 26, PW + 24, PH + 30, 16); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const yy = -PH - 18 + i * 20, ph = time / 260 + i * 1.3;
      const col = ['rgba(42,245,152,0.9)', 'rgba(58,224,208,0.85)', 'rgba(120,160,255,0.85)', 'rgba(190,120,255,0.85)'][i];
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath();
      for (let x = -PW / 2 - 10; x <= PW / 2 + 10; x += 4) ctx.lineTo(x, yy + Math.sin(x / 7 + ph) * 5);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(220,255,245,0.9)'; ctx.lineWidth = 2; roundRect(-PW / 2 - 12, -PH - 26, PW + 24, PH + 30, 16); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 6; i++) { const sx = Math.sin(time / 300 + i * 2.1) * (PW / 2 + 6), sy = -PH - 20 + ((time / 9 + i * 17) % (PH + 20)); ctx.fillRect(sx - 1, sy - 1, 2.5, 2.5); }
  } else if (p.icd && p.idk) {
    // 어둠에 잠식: 검은 기운이 온몸을 휘감고 촉수가 꿈틀거림
    ctx.fillStyle = 'rgba(12,8,20,0.88)'; roundRect(-PW / 2 - 6, -PH - 6, PW + 12, PH + 8, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(120,60,190,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a2 = (i / 6) * Math.PI * 2 + time / 500, r1 = 24, r2 = 40 + Math.sin(time / 120 + i) * 6; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * r1, -PH / 2 + Math.sin(a2) * r1); ctx.quadraticCurveTo(Math.cos(a2 + 0.4) * (r2 - 6), -PH / 2 + Math.sin(a2 + 0.4) * (r2 - 6), Math.cos(a2) * r2, -PH / 2 + Math.sin(a2) * r2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(200,120,255,0.95)'; ctx.fillRect(-10, -PH + 16, 6, 3); ctx.fillRect(4, -PH + 16, 6, 3);
  } else if (p.icd && p.isd) {
    // 모래에 갇힘: 모래 더미가 몸을 덮음
    ctx.fillStyle = 'rgba(214,174,100,0.92)'; ctx.beginPath();
    ctx.moveTo(-PW / 2 - 14, 2); ctx.quadraticCurveTo(-PW / 2 - 6, -PH * 0.7, -4, -PH - 4); ctx.quadraticCurveTo(PW / 2 + 6, -PH * 0.7, PW / 2 + 14, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,110,55,0.7)';
    for (let i = 0; i < 10; i++) { const ang = i * 2.4, r = 6 + (i % 4) * 5; ctx.fillRect(Math.cos(ang) * r - 1, -PH / 2 + Math.sin(ang) * r * 1.3, 3, 3); }
  } else if (p.icd) {
    // 얼음에 갇힘
    ctx.fillStyle = 'rgba(150,215,255,0.6)'; ctx.beginPath();
    ctx.moveTo(-PW / 2 - 8, -4); ctx.lineTo(-PW / 2 - 10, -PH + 6); ctx.lineTo(-6, -PH - 10); ctx.lineTo(PW / 2 + 9, -PH - 2); ctx.lineTo(PW / 2 + 8, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,250,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -PH + 2); ctx.lineTo(-4, -PH / 2); ctx.moveTo(8, -PH + 8); ctx.lineTo(14, -20); ctx.stroke();
  }
  if (p.frz === 2) {
    // 패왕색: 검붉은 기운이 몸을 감싸고 번개처럼 튐
    const hg = ctx.createRadialGradient(0, -PH / 2, 8, 0, -PH / 2, 52);
    hg.addColorStop(0, 'rgba(40,0,6,0.55)'); hg.addColorStop(0.6, 'rgba(150,10,30,0.4)'); hg.addColorStop(1, 'rgba(90,0,10,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -PH / 2, 52, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = Math.floor(time / 90) % 2 ? 'rgba(220,20,40,0.9)' : 'rgba(30,0,4,0.9)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    for (let k = 0; k < 3; k++) { const a = time / 200 + k * 2.1; let xx = Math.cos(a) * 14, yy = -PH / 2 + Math.sin(a) * 18; ctx.beginPath(); ctx.moveTo(xx, yy); for (let j = 0; j < 4; j++) { xx += Math.cos(a) * 9 + (Math.random() - 0.5) * 10; yy += Math.sin(a) * 9 + (Math.random() - 0.5) * 10; ctx.lineTo(xx, yy); } ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,0,14,0.35)'; roundRect(-PW / 2 - 3, -PH - 3, PW + 6, PH + 6, 13); ctx.fill();
  } else if (p.frz) {
    ctx.fillStyle = 'rgba(214,238,255,0.55)'; roundRect(-PW / 2 - 4, -PH - 4, PW + 8, PH + 8, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (p.vnm) {
    // 베놈(검정)·카니지(빨강): 머리 위 표시 + 몸을 덮은 끈적한 무늬
    const carn = p.vnm === 2;
    ctx.fillStyle = carn ? 'rgba(190,18,28,0.95)' : 'rgba(15,12,20,0.95)';
    ctx.beginPath(); ctx.arc(0, -PH - 14, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-4, -PH - 16); ctx.lineTo(4, -PH - 14); ctx.lineTo(-4, -PH - 12); ctx.fill();
    ctx.strokeStyle = carn ? 'rgba(80,0,8,0.85)' : 'rgba(70,64,90,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const yy = -PH + 30 + i * 8, ph = time / 200 + i; ctx.beginPath(); ctx.moveTo(-PW / 2 + 2, yy); ctx.quadraticCurveTo(0, yy + Math.sin(ph) * 6, PW / 2 - 2, yy - 2); ctx.stroke(); }
  } else if (p.ctl) {
    // 기생당함: 초록 눈
    ctx.fillStyle = 'rgba(123,227,111,0.9)';
    ctx.beginPath(); ctx.arc(0, -PH - 14, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#163a12'; ctx.beginPath(); ctx.arc(0, -PH - 14, 3, 0, Math.PI * 2); ctx.fill();
  }
  if (light) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill(); }
  if (p.sl && p.slm) {
    // 진흙을 뒤집어씀: 머리부터 흘러내리는 갈색 진흙
    ctx.fillStyle = 'rgba(105,74,36,0.92)';
    ctx.beginPath(); ctx.moveTo(-PW / 2, -PH + 12); ctx.quadraticCurveTo(-PW / 2, -PH, -8, -PH - 2); ctx.quadraticCurveTo(PW / 2, -PH - 2, PW / 2, -PH + 12);
    for (let i = 0; i < 5; i++) { const dx2 = PW / 2 - i * (PW / 4), dl = 14 + ((i * 7 + Math.floor(time / 300)) % 4) * 6; ctx.lineTo(dx2, -PH + 12 + dl); ctx.lineTo(dx2 - PW / 8, -PH + 12); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(140,105,60,0.7)'; ctx.beginPath(); ctx.arc(-8, -PH + 4, 4, 0, Math.PI * 2); ctx.arc(10, -PH + 8, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.sl) { ctx.fillStyle = 'rgba(127,184,255,0.45)'; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; roundRect(-PW / 2, -PH * 0.35, PW, PH * 0.35, 10); ctx.fill();
  if (p.dm) {
    // 더미: 몸에 과녁
    for (const [r, c] of [[13, '#ffffff'], [9, '#ff4d4d'], [5, '#ffffff'], [2, '#ff4d4d']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -PH * 0.42, r, 0, Math.PI * 2); ctx.fill(); }
  } else if (p.b) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-2, -PH - 10, 4, 10); ctx.beginPath(); ctx.arc(0, -PH - 12, 4, 0, Math.PI * 2); ctx.fill(); }
  if (p.vnm) {
    // 원래 눈 대신 크고 찢어진 흰 눈만
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(-18, -PH + 10); ctx.quadraticCurveTo(-8, -PH + 12, -3, -PH + 26); ctx.quadraticCurveTo(-13, -PH + 23, -18, -PH + 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -PH + 10); ctx.quadraticCurveTo(8, -PH + 12, 3, -PH + 26); ctx.quadraticCurveTo(13, -PH + 23, 18, -PH + 10); ctx.fill();
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(f * 4 - 2, -PH + 14, 8, 11); ctx.fillRect(f * 4 + 10 * f - 2, -PH + 14, 8, 11);
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(f * 4 + f * 2, -PH + 17, 4, 6); ctx.fillRect(f * 4 + 10 * f + f * 2, -PH + 17, 4, 6);
  }
  // 사거리 버프 (몸 크기 기준): 거인은 몸이 2배라 1.6/2, 헐크도 몸 크기로 나눔
  const hf = hasK(p, 'hulk') && G > 1 ? (G - 1) / 0.9 : 0;
  const otherM = (p.gt ? 1.6 / 2 : 1) * (p.bf ? 1.3 : 1) * (hf ? (1 + 0.6 * hf) / G : 1);
  let reach = 0;
  if (p.at) {
    // 사거리 늘어나는 스킬은 팔도 길어짐 (거인은 몸이 2배라 그만큼 나눔)
    const mult = (p.rb ? 2 : 1) * otherM;
    const full = (p.at === 2 ? 60 : 46) * mult + (p.rb ? 40 : 0);
    reach = p.ap === 1 ? -6 : p.ap === 2 ? full : full * 0.4;
  }
  const fx = f * (PW / 2 + 4 + reach), fy = -PH / 2 - 2;
  if (hasK(p, 'archer') && !hasK(p, 'sword')) {
    drawBow(p, f, time, p.rb ? 2 : 1, otherM);
    ctx.restore();
    finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time);
    return;
  }
  if (hasK(p, 'sword')) {
    drawSword(p, f, time, p.rb ? 2 : 1, otherM);
    ctx.restore();
    finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time);
    return;
  }
  if (p.rb && p.at && p.ap !== 1) {
    ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, -PH / 2 - 2); ctx.lineTo(f * (PW / 2 + 4 + reach), -PH / 2 - 2); ctx.stroke();
  }
  const fxs = fxOf(p);
  if (p.ap === 2) {
    ctx.strokeStyle = fxs ? fxColor(fxs, 0.85, time) : p.at === 2 ? 'rgba(255,207,63,0.8)' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = p.at === 2 ? 10 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, fy); ctx.lineTo(fx, fy); ctx.stroke();
  }
  if (fxs && p.at) {
    // 스킨 공격 이펙트: 주먹 주변 기운
    const fr2 = (p.at === 2 ? 26 : 20) + Math.sin(time / 50) * 3;
    const gl2 = ctx.createRadialGradient(fx, fy, 2, fx, fy, fr2);
    gl2.addColorStop(0, fxColor(fxs, 0.9, time)); gl2.addColorStop(1, fxColor(fxs, 0, time + 300));
    ctx.fillStyle = gl2; ctx.beginPath(); ctx.arc(fx, fy, fr2, 0, Math.PI * 2); ctx.fill();
  }
  if (hasK(p, 'fire') || hasK(p, 'ice') || p.sun) {
    // 주먹에 불꽃 / 냉기 (청염 스킨이면 파란 불)
    const fr = (p.at === 2 ? 20 : 16) + Math.sin(time / 60) * 3;
    const gl = ctx.createRadialGradient(fx, fy, 2, fx, fy, fr);
    const tint = hotTint(p), blue = tint === 'blue', dk = tint === 'dark', gn = tint === 'green';
    const hot = hasK(p, 'fire') || p.sun;
    if (gn) { gl.addColorStop(0, 'rgba(220,255,240,0.7)'); gl.addColorStop(0.55, 'rgba(120,255,210,0.35)'); gl.addColorStop(1, 'rgba(40,200,170,0)'); }
    else gl.addColorStop(0, dk ? 'rgba(200,110,255,0.95)' : blue ? 'rgba(170,225,255,0.95)' : hot ? 'rgba(255,220,90,0.95)' : 'rgba(235,250,255,0.95)');
    if (!gn) gl.addColorStop(0.55, dk ? 'rgba(80,15,140,0.8)' : blue ? 'rgba(100,170,255,0.6)' : hot ? 'rgba(255,140,40,0.6)' : 'rgba(180,225,255,0.6)');
    if (!gn) gl.addColorStop(1, dk ? 'rgba(10,0,20,0)' : blue ? 'rgba(30,90,255,0)' : hot ? 'rgba(255,60,20,0)' : 'rgba(120,200,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    if (gn) drawSoulWisp(fx, fy - 6, p.at === 2 ? 16 : 12, time, 1, 0.95, true);   // 영혼: 주먹에 얼굴 있는 도깨비불
  }
  if (hasK(p, 'ninja')) drawKunaiHand(p, f, fx, fy, time);
  if (hasK(p, 'hammer')) {
    // 망치: 나무 손잡이 + 큰 쇠머리, 강공격은 위에서 아래로 내려찍음
    ctx.save(); ctx.translate(fx, fy); ctx.scale(f, 1);
    let rot = -0.9;
    if (p.at === 2) rot = p.ap === 1 ? -2.0 : p.ap === 2 ? 0.6 : 0.2;
    else if (p.at === 1) rot = p.ap === 1 ? -1.3 : 0.1;
    ctx.rotate(rot);
    if (skinOn(p, 'mjolnir')) {
      // 묠니르 스킨: 가죽 감은 손잡이 + 은빛 망치머리 + 번개 불꽃
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(-3, -30, 6, 34);
      ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-3, -26 + i * 6); ctx.lineTo(3, -23 + i * 6); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 6, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#c8d0dc'; ctx.fillRect(-16, -46, 32, 18);
      ctx.fillStyle = '#9aa4b4'; ctx.fillRect(-16, -46, 6, 18); ctx.fillRect(10, -46, 6, 18);
      ctx.strokeStyle = '#6a7484'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -37, 5, 0, Math.PI * 2); ctx.stroke();
      if (Math.sin(time / 90) > 0.2) { ctx.strokeStyle = 'rgba(190,230,255,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); const sx = (Math.random() - 0.5) * 30; ctx.moveTo(sx, -48); ctx.lineTo(sx + 5, -56); ctx.lineTo(sx - 2, -60); ctx.lineTo(sx + 4, -68); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(-3, -30, 6, 34);
      ctx.fillStyle = '#5a5a66'; ctx.fillRect(-14, -44, 28, 16);
      ctx.fillStyle = '#8a8a96'; ctx.fillRect(-14, -44, 28, 4);
    }
    ctx.restore();
  }
  if (hasK(p, 'whip')) {
    // 채찍: 공격 중엔 앞으로 쭉 뻗고, 평소엔 손에 둘둘 말려 있음
    const vine = skinOn(p, 'thornvine');   // 가시덩굴 스킨: 초록 덩굴 + 가시 + 잎
    ctx.strokeStyle = vine ? '#3f8a2e' : '#a0522d'; ctx.lineWidth = vine ? 4 : 3; ctx.lineCap = 'round';
    if (p.at && p.ap === 2) {
      const L = p.at === 2 ? 122 : 120, wv = Math.sin(time / 30) * 10;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + f * L * 0.5, fy - 18 + wv, fx + f * L, fy + 4); ctx.stroke();
      if (vine) {
        const pt = (t) => { const u = 1 - t; return [u * u * fx + 2 * u * t * (fx + f * L * 0.5) + t * t * (fx + f * L), u * u * fy + 2 * u * t * (fy - 18 + wv) + t * t * (fy + 4)]; };
        for (let i = 1; i < 9; i++) {
          const [px, py] = pt(i / 9), s = i % 2 ? -1 : 1;
          if (i % 3 === 0) { ctx.fillStyle = '#6fcf4a'; ctx.beginPath(); ctx.ellipse(px, py + s * 6, 6, 3, s * 0.6, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.fillStyle = '#d8e6b0'; ctx.beginPath(); ctx.moveTo(px - 2, py); ctx.lineTo(px, py + s * 6); ctx.lineTo(px + 2, py); ctx.closePath(); ctx.fill(); }
        }
        ctx.fillStyle = '#ff6ab0'; ctx.beginPath(); ctx.arc(fx + f * L, fy + 4, 4, 0, Math.PI * 2); ctx.fill();
      } else { ctx.fillStyle = '#ffd38a'; ctx.beginPath(); ctx.arc(fx + f * L, fy + 4, 3, 0, Math.PI * 2); ctx.fill(); }
    } else {
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(fx, fy + 10 + i * 2, 8 - i, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  if (hasK(p, 'venom') && skinOn(p, 'scorpion')) {
    // 전갈 스킨: 등 뒤에서 머리 위로 휘어 오르는 굵은 마디 꼬리, 때릴 땐 독침이 앞으로 찌름
    const atk = p.at ? 1 : 0, bx = -f * (PW / 2 - 4), by = -PH * 0.3;
    const tipX = atk ? f * (PW / 2 + 24) : f * 6, tipY = atk ? -PH * 0.72 : -PH - 6 + Math.sin(time / 200) * 2;
    const c1x = bx - f * 30, c1y = -PH * 0.8, c2x = atk ? f * 6 : -f * 18, c2y = -PH - 36;
    const pt = (t) => { const u = 1 - t; return [u * u * u * bx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * tipX, u * u * u * by + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * tipY]; };
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6a3e14'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tipX, tipY); ctx.stroke();
    ctx.strokeStyle = '#c8822e'; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = '#6a3e14'; ctx.lineWidth = 1.8;
    for (let i = 1; i < 7; i++) { const [x, y] = pt(i / 7), [x2, y2] = pt(i / 7 + 0.01), a = Math.atan2(y2 - y, x2 - x) + Math.PI / 2; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5); ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); ctx.stroke(); }
    ctx.fillStyle = '#c8822e'; ctx.beginPath(); ctx.arc(tipX, tipY, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const sx = f, sy = atk ? 0.15 : 0.9, sl = Math.hypot(sx, sy);
    ctx.fillStyle = '#2a1608'; ctx.beginPath(); ctx.moveTo(tipX - sy / sl * 4, tipY + sx / sl * 4); ctx.lineTo(tipX + (sx / sl) * 16, tipY + (sy / sl) * 16); ctx.lineTo(tipX + sy / sl * 4, tipY - sx / sl * 4); ctx.closePath(); ctx.fill();
    if (atk) { ctx.fillStyle = '#9dff6a'; ctx.beginPath(); ctx.arc(tipX + (sx / sl) * 18, tipY + (sy / sl) * 18, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }
  if (hasK(p, 'shotgun') && skinOn(p, 'cannon')) {
    // 대포 스킨: 짧고 굵은 대포를 들고 있음 (때릴 땐 손잡이로)
    ctx.save(); ctx.translate(fx, fy); ctx.scale(f * 1.2, 1.2);
    if (p.at === 1 && p.ap === 2) ctx.rotate(-0.5);
    ctx.fillStyle = '#4a4a55'; ctx.beginPath(); ctx.arc(-8, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(-2, -8, 26, 16);
    ctx.fillStyle = '#15151a'; ctx.beginPath(); ctx.ellipse(26, 0, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(4, -10, 6, 3);
    ctx.restore();
    if (p.am != null && p.id === myId) { ctx.fillStyle = '#ffcf3f'; for (let i = 0; i < p.am; i++) { ctx.beginPath(); ctx.arc(fx - f * 6 + i * 6 * f, fy + 14, 2.4, 0, Math.PI * 2); ctx.fill(); } }
  } else if (hasK(p, 'shotgun')) {
    // 샷건: 주먹에 쥔 총 (나무 개머리판 + 검은 총열 두 개), 때릴 땐 개머리판으로
    ctx.save(); ctx.translate(fx, fy); ctx.scale(f * 1.3, 1.3);
    if (p.at === 1 && p.ap === 2) ctx.rotate(-0.5);
    ctx.fillStyle = '#7a4e26'; ctx.beginPath(); ctx.moveTo(-22, -2); ctx.lineTo(-4, -4); ctx.lineTo(-2, 5); ctx.lineTo(-24, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2a32'; ctx.fillRect(-4, -6, 34, 5); ctx.fillRect(-4, -1, 34, 4);
    ctx.fillStyle = '#5a5a66'; ctx.fillRect(4, 3, 10, 4);
    ctx.fillStyle = '#9a9aa8'; ctx.fillRect(28, -6, 3, 9);
    ctx.restore();
    if (p.am != null && p.id === myId) { ctx.fillStyle = '#ffcf3f'; for (let i = 0; i < p.am; i++) { ctx.beginPath(); ctx.arc(fx - f * 6 + i * 6 * f, fy + 14, 2.4, 0, Math.PI * 2); ctx.fill(); } }
  }
  if (p.shd && p.shd[0] && !(p.shd[2] > 0) && !p.shd[1]) drawShieldHand(p, f, fx, fy, time);
  if (p.wv && skinOn(p, 'electric')) {
    // 전기: 팔을 타고 흐르는 번개 + 주먹에 스파크, 때리면 앞으로 번개가 뻗음
    zap(f * PW / 2, fy, fx, fy, 9, 'rgba(255,240,120,0.95)', 2.5);
    zap(f * PW / 2, fy, fx, fy, 7, 'rgba(150,225,255,0.9)', 1.5);
    const wr = (p.at ? 24 : 18) + Math.random() * 4;
    const wg = ctx.createRadialGradient(fx, fy, 3, fx, fy, wr);
    wg.addColorStop(0, 'rgba(255,255,220,0.95)'); wg.addColorStop(1, 'rgba(90,180,255,0)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(fx, fy, wr, 0, Math.PI * 2); ctx.fill();
    if (p.at && p.ap === 2) {
      const len = (p.at === 2 ? 72 : 58) * 1.3;
      for (let k = 0; k < 3; k++) zap(fx, fy, fx + f * len, fy + (Math.random() - 0.5) * 30, 18, k === 0 ? 'rgba(255,255,255,0.95)' : k === 1 ? 'rgba(255,230,90,0.9)' : 'rgba(100,190,255,0.9)', 4 - k);
    }
  } else if (p.wv) {
    // 파동: 팔에 감긴 파동 (나선)
    ctx.strokeStyle = 'rgba(140,235,255,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const u = k / 24, ax = f * PW / 2 + (fx - f * PW / 2) * u, ay = fy + Math.sin(u * Math.PI * 4 + time / 70) * 8;
      if (k) ctx.lineTo(ax, ay); else ctx.moveTo(ax, ay);
    }
    ctx.stroke();
    const wr = (p.at ? 24 : 18) + Math.sin(time / 80) * 3;
    const wg = ctx.createRadialGradient(fx, fy, 3, fx, fy, wr);
    wg.addColorStop(0, 'rgba(200,250,255,0.9)'); wg.addColorStop(1, 'rgba(40,170,255,0)');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(fx, fy, wr, 0, Math.PI * 2); ctx.fill();
    if (p.at && p.ap === 2) {
      // 파동 공격: 주먹 앞으로 파동이 뻗어 나감 (일반 공격의 두 배 거리)
      const len = (p.at === 2 ? 72 : 58) * 1.1;
      for (let k = 0; k < 4; k++) {
        const ux = fx + f * (14 + k * len / 4), rr = 12 + k * 6;
        ctx.strokeStyle = `rgba(150,240,255,${0.9 - k * 0.18})`; ctx.lineWidth = 4 - k * 0.6;
        ctx.beginPath(); ctx.arc(ux, fy, rr, f > 0 ? -0.9 : Math.PI - 0.9, f > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      }
    }
  }
  if (p.cg) {
    const chg = p.cg[0], fr3 = (p.at ? 22 : 15) + p.cg[1] * (chg ? 0 : 1.2);
    const gl3 = ctx.createRadialGradient(fx, fy, 2, fx, fy, fr3);
    gl3.addColorStop(0, chg ? 'rgba(170,255,190,0.95)' : 'rgba(255,170,150,0.95)'); gl3.addColorStop(1, chg ? 'rgba(40,200,90,0)' : 'rgba(230,30,20,0)');
    ctx.fillStyle = gl3; ctx.beginPath(); ctx.arc(fx, fy, fr3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  const mus = p.bf && skinOn(p, 'muscle') ? 5 : 0;   // 근육: 굵은 팔·큰 주먹
  if (mus) { ctx.strokeStyle = p.c; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * PW / 2, fy - 4); ctx.lineTo(fx, fy); ctx.stroke(); ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3; }
  ctx.beginPath(); ctx.arc(fx, fy, (p.at === 2 ? 13 : 10) + mus, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (light) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(fx, fy, 10, 0, Math.PI * 2); ctx.fill(); }
  if (p.shd && p.shd[0] && (p.shd[2] > 0 || p.shd[1])) drawShieldHand(p, f, fx, fy, time);   // 막기·던지기 자세는 주먹 위에
  ctx.restore();
  finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time);
}
// 닌자: 손에 든 쿠나이(스노우 스킨: 고드름). 약공격 때 앞으로 베는 궤적
// 박쥐 (뱀파이어 스킨): +x 방향으로 날아감, 날개가 퍼덕임
function drawBat(sc, time, seed = 0) {
  ctx.save(); ctx.scale(sc, sc);
  const flap = Math.sin(time / 45 + seed) * 0.8;
  ctx.fillStyle = '#1c1024'; ctx.strokeStyle = '#4a1530'; ctx.lineWidth = 1;
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(1, sd); ctx.rotate(-flap * 0.5);
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(-6, -16, -16, -18); ctx.quadraticCurveTo(-12, -12, -16, -9); ctx.quadraticCurveTo(-10, -8, -12, -4); ctx.quadraticCurveTo(-6, -5, -4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(5, -3); ctx.lineTo(8, -8); ctx.lineTo(9, -2); ctx.closePath(); ctx.fill();   // 귀
  ctx.fillStyle = '#ff2a3a'; ctx.beginPath(); ctx.arc(6, -1, 1.3, 0, Math.PI * 2); ctx.fill();            // 빨간 눈
  ctx.fillStyle = '#fff'; ctx.fillRect(7.5, 1.5, 1, 2);                                                    // 송곳니
  ctx.restore();
}
function drawKunaiHand(p, f, fx, fy, time) {
  const snow = skinOn(p, 'snowninja');
  if (skinOn(p, 'vampire')) {
    // 뱀파이어: 손에 박쥐가 매달려 퍼덕임, 벨 땐 붉은 궤적
    if (p.at === 1 && p.ap === 2) {
      ctx.fillStyle = 'rgba(150,20,50,0.4)';
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.arc(fx, fy, 40, f > 0 ? -1.1 : Math.PI - 0.5, f > 0 ? 0.5 : Math.PI + 1.1); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.translate(fx + f * 8, fy - 6); ctx.scale(f, 1); drawBat(0.9, time, p.x); ctx.restore();
    return;
  }
  if (p.at === 1 && p.ap === 2) {
    ctx.fillStyle = snow ? 'rgba(190,235,255,0.5)' : 'rgba(220,230,245,0.45)';
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.arc(fx, fy, 40, f > 0 ? -1.1 : Math.PI - 0.5, f > 0 ? 0.5 : Math.PI + 1.1); ctx.closePath(); ctx.fill();
  }
  const ang = p.at ? (p.ap === 1 ? -1.2 : p.ap === 2 ? 0.1 : 0.4) : -0.7 + Math.sin(time / 500) * 0.05;
  ctx.save(); ctx.translate(fx, fy); ctx.scale(f, 1); ctx.rotate(ang);
  drawKunaiShape(snow, 1);
  ctx.restore();
}
// 쿠나이 모양 (+x 방향이 칼끝). snow면 고드름
function drawKunaiShape(snow, sc) {
  ctx.save(); ctx.scale(sc, sc);
  if (snow) {
    const g = ctx.createLinearGradient(0, 0, 36, 0); g.addColorStop(0, 'rgba(230,248,255,0.95)'); g.addColorStop(1, 'rgba(150,215,255,0.85)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(36, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -1.5); ctx.lineTo(28, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(200,240,255,0.9)'; ctx.beginPath(); ctx.arc(-6, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#2a2a35'; ctx.fillRect(-12, -2.5, 12, 5);                     // 손잡이 (감은 끈)
    ctx.strokeStyle = '#8a3030'; ctx.lineWidth = 1; for (let i = -10; i < 0; i += 3) { ctx.beginPath(); ctx.moveTo(i, -2.5); ctx.lineTo(i + 2, 2.5); ctx.stroke(); }
    ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-15, 0, 3.5, 0, Math.PI * 2); ctx.stroke();   // 고리
    const g = ctx.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, '#e8edf5'); g.addColorStop(0.5, '#9aa6b8'); g.addColorStop(1, '#5d6676');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(24, 0); ctx.lineTo(0, 6); ctx.lineTo(3, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(22, 0); ctx.stroke();
  }
  ctx.restore();
}
// 통나무(스노우: 눈사람) · 별빛 별비
function drawLogsStars(state, now) {
  for (const l of state.lg || []) {
    const fade = Math.min(1, l.t / 0.4), s2 = l.s || 1;
    ctx.save(); ctx.translate(l.x, l.y); ctx.scale(s2, s2); ctx.globalAlpha = fade;
    if (l.vp) {
      // 뱀파이어: 통나무 대신 무덤 (흙더미 + 십자가 묘비)
      ctx.fillStyle = '#4a3322'; ctx.beginPath(); ctx.ellipse(0, -3, 26, 8, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6e7480'; ctx.strokeStyle = '#3e434c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-14, -40); ctx.arc(0, -40, 14, Math.PI, 0); ctx.lineTo(14, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2e323a'; ctx.fillRect(-1.5, -46, 3, 18); ctx.fillRect(-7, -40, 14, 3);
      ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RIP', 0, -16);
      ctx.fillStyle = 'rgba(80,200,90,0.8)'; ctx.fillRect(-12, -8, 3, 4); ctx.fillRect(9, -9, 3, 5);   // 풀
      ctx.fillStyle = `rgba(190,170,255,${0.25 + Math.sin(now / 300) * 0.1})`; ctx.beginPath(); ctx.ellipse(0, -6, 30, 6, 0, 0, Math.PI * 2); ctx.fill();   // 안개
    } else if (l.sn) {
      // 눈사람
      ctx.fillStyle = '#f4f9ff'; ctx.strokeStyle = '#b8d0e8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -16, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -44, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222'; for (const ex of [-4, 4]) { ctx.beginPath(); ctx.arc(ex, -47, 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ff8a2e'; ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(10, -42); ctx.lineTo(0, -41); ctx.fill();
      ctx.fillStyle = '#c62828'; ctx.fillRect(-12, -33, 24, 4);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, -22); ctx.lineTo(-28, -32); ctx.moveTo(15, -22); ctx.lineTo(28, -32); ctx.stroke();
      ctx.fillStyle = '#333'; for (const by of [-22, -12]) { ctx.beginPath(); ctx.arc(0, by, 1.8, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // 통나무 (세워 둔 몸만 한 통나무)
      ctx.fillStyle = '#8a5a2b'; roundRect(-15, -58, 30, 58, 6); ctx.fill();
      ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 2; for (const lx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(lx, -54); ctx.lineTo(lx + 1, -4); ctx.stroke(); }
      ctx.fillStyle = '#c99a62'; ctx.beginPath(); ctx.ellipse(0, -58, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -58, 9, 3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -58, 4, 1.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#4caf3c'; ctx.beginPath(); ctx.ellipse(12, -30, 6, 3, -0.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  const age = Math.max(-0.07, (now - state.time - INTERP_DELAY) / 1000);
  for (const b of state.sb || []) {
    const x = b.x + b.vx * age, y = b.y + b.vy * age, ang = Math.atan2(b.vy, b.vx);
    if (b.m === 2) {
      // 하트: 분홍 하트가 반짝이며 떨어짐
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(now / 150 + b.x) * 0.3); const hs = b.r / 8;
      ctx.fillStyle = '#ff6aa0'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 6 * hs); ctx.bezierCurveTo(-10 * hs, -2 * hs, -6 * hs, -10 * hs, 0, -4 * hs); ctx.bezierCurveTo(6 * hs, -10 * hs, 10 * hs, -2 * hs, 0, 6 * hs); ctx.fill(); ctx.stroke();
      ctx.restore();
      continue;
    }
    if (b.m) {
      // 운석: 불꼬리를 단 울퉁불퉁한 돌
      const tl2 = ctx.createLinearGradient(x - Math.cos(ang) * b.r * 7, y - Math.sin(ang) * b.r * 7, x, y);
      tl2.addColorStop(0, 'rgba(255,120,20,0)'); tl2.addColorStop(0.6, 'rgba(255,150,40,0.6)'); tl2.addColorStop(1, 'rgba(255,230,140,0.95)');
      ctx.strokeStyle = tl2; ctx.lineWidth = b.r * 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * b.r * 7, y - Math.sin(ang) * b.r * 7); ctx.lineTo(x, y); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(now / 200);
      ctx.fillStyle = '#5a4030'; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2, r = b.r * (0.8 + ((k * 37) % 5) / 12); ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,40,0.8)'; ctx.beginPath(); ctx.arc(-b.r * 0.2, b.r * 0.2, b.r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      continue;
    }
    // 꼬리
    const tl = ctx.createLinearGradient(x - Math.cos(ang) * b.r * 6, y - Math.sin(ang) * b.r * 6, x, y);
    tl.addColorStop(0, 'rgba(255,240,170,0)'); tl.addColorStop(1, 'rgba(255,240,170,0.75)');
    ctx.strokeStyle = tl; ctx.lineWidth = b.r * 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * b.r * 6, y - Math.sin(ang) * b.r * 6); ctx.lineTo(x, y); ctx.stroke();
    const gl = ctx.createRadialGradient(x, y, 1, x, y, b.r * 2); gl.addColorStop(0, 'rgba(255,250,210,0.8)'); gl.addColorStop(1, 'rgba(255,220,100,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, b.r * 2, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(now / 150);
    ctx.fillStyle = '#ffe766'; ctx.strokeStyle = '#fff8d0'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? b.r * 0.45 : b.r, t = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}
// 검사: 손에 든 검 + 베기 궤적 (몸 좌표계 안에서 그림)
//  rubM: 고무(팔이 늘어남), otherM: 강화·거인·헐크 (검이 길어짐)
function drawSword(p, f, time, rubM = 1, otherM = 1) {
  const swinging = p.at && p.ap !== 1;
  // 고무: 휘두를 때 팔이 쭉 늘어나고 그 끝에서 검을 휘두름
  const ext = swinging && rubM > 1 && !(p.at === 2 && p.ap === 2) ? 72 * otherM * (rubM - 1) + 40 : 0;
  const hx = f * (PW / 2 + 2 + ext), hy = -PH / 2 - 2;
  if (ext) {
    ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * PW / 2, hy); ctx.lineTo(hx, hy); ctx.stroke();
  }
  let ang;                         // 0 = 앞으로 수평
  const L = 64 * otherM;           // 검 길이 (사거리 버프만큼 길어짐)
  if (p.at === 1) ang = p.ap === 1 ? -1.3 : p.ap === 2 ? 0.15 : 0.6;
  else if (p.at === 2) ang = p.ap === 1 ? -2.4 : p.ap === 2 ? (time / 40) % (Math.PI * 2) : 0.9;
  else ang = -0.9 + Math.sin(time / 400) * 0.05;
  // 불(화염·태양) / 얼음이면 검날이 빛남
  const hot = hasK(p, 'fire') || p.sun, cold = hasK(p, 'ice');
  const fxs = fxOf(p);
  const dark = skinOn(p, 'darkness');   // 어둠의 검사 스킨
  const holy = skinOn(p, 'holyknight'); // 빛의 기사 스킨
  const pep = skinOn(p, 'pepero_sword'); // 빼빼로 검 (할로윈 다음 주 한정판)
  const blueHot = hotTint(p) === 'blue', darkHot = hotTint(p) === 'dark', greenHot = hotTint(p) === 'green';
  const saber = saberColor(p);          // 광선검 스킨 (색)
  const glow = saber ? saber : greenHot ? 'rgba(60,240,120,0.95)' : darkHot ? 'rgba(130,40,210,0.95)' : blueHot ? 'rgba(60,140,255,0.95)' : hot ? 'rgba(255,120,30,0.95)' : cold ? 'rgba(140,220,255,0.95)' : fxs ? fxColor(fxs, 0.95, time) : null;
  // 베기 궤적 (어둠의 검사: 검보라 초승달이 여러 겹)
  if (p.ap === 2 && p.at === 1) {
    if (holy) {
      ctx.fillStyle = 'rgba(255,236,150,0.55)';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L + 24, f > 0 ? -1.3 : Math.PI - 0.4, f > 0 ? 0.4 : Math.PI + 1.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,230,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, L + 24, f > 0 ? -1.3 : Math.PI - 0.4, f > 0 ? 0.4 : Math.PI + 1.3); ctx.stroke();
    } else if (dark) {
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k % 2 ? 'rgba(40,10,60,0.55)' : 'rgba(150,60,230,0.45)';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L + 26 - k * 10, f > 0 ? -1.3 + k * 0.1 : Math.PI - 0.4, f > 0 ? 0.4 : Math.PI + 1.3 - k * 0.1); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = saber ? hexA(saber, 0.4) : pep ? 'rgba(120,70,35,0.45)' : hot ? 'rgba(255,170,80,0.45)' : cold ? 'rgba(170,230,255,0.45)' : 'rgba(220,235,255,0.45)';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, L + 18, f > 0 ? -1.2 : Math.PI - 0.3, f > 0 ? 0.3 : Math.PI + 1.2); ctx.closePath(); ctx.fill();
    }
  }
  if (p.ap === 2 && p.at === 2) {
    // 부채꼴: 머리 위로 크게 반원 (사거리 버프만큼 커짐)
    const R = 125 * 1.25 * otherM * rubM;
    const g = ctx.createRadialGradient(0, -PH / 2, 20, 0, -PH / 2, R);
    g.addColorStop(0, 'rgba(220,235,255,0)');
    g.addColorStop(0.75, saber ? hexA(saber, 0.3) : pep ? 'rgba(110,60,30,0.35)' : holy ? 'rgba(255,230,140,0.35)' : dark ? 'rgba(60,15,90,0.45)' : hot ? 'rgba(255,170,80,0.25)' : cold ? 'rgba(170,230,255,0.25)' : 'rgba(220,235,255,0.25)');
    g.addColorStop(1, saber ? hexA(saber, 0.85) : pep ? 'rgba(160,95,50,0.85)' : holy ? 'rgba(255,250,210,0.9)' : dark ? 'rgba(170,80,255,0.85)' : hot ? 'rgba(255,200,120,0.75)' : cold ? 'rgba(200,240,255,0.75)' : 'rgba(240,248,255,0.75)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -PH / 2); ctx.arc(0, -PH / 2, R, Math.PI + 0.05, -0.05 + Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = holy ? 'rgba(255,220,90,0.95)' : dark ? 'rgba(200,130,255,0.95)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -PH / 2, R, Math.PI + 0.05, Math.PI * 2 - 0.05); ctx.stroke();
    if (rubM > 1) {
      // 고무: 늘어난 팔 끝의 검이 반원을 따라 돎
      const a2 = Math.PI + ((time / 60) % Math.PI), r2 = Math.max(20, R - L - 16);
      const ex = Math.cos(a2) * r2, ey = -PH / 2 + Math.sin(a2) * r2;
      ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -PH / 2); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a2);
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; }
      if (pep) { drawPeperoBlade(6, L + 6); ctx.restore(); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.fillStyle = saber ? '#ffffff' : holy ? '#fffbe6' : dark ? '#1a0f26' : hot ? '#ffe2b0' : cold ? '#dff5ff' : '#e8f0ff'; ctx.strokeStyle = saber || (holy ? '#e8b830' : dark ? '#b46bff' : '#5a6a88'); ctx.lineWidth = saber ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(6 + L, -2); ctx.lineTo(12 + L, 0); ctx.lineTo(6 + L, 3); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill();
      return;
    }
  }
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f, 1); ctx.rotate(ang);
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 16; } else if (dark) { ctx.shadowColor = 'rgba(160,70,255,0.95)'; ctx.shadowBlur = 14; }
  else if (holy) { ctx.shadowColor = 'rgba(255,230,120,1)'; ctx.shadowBlur = 22; }
  if (pep && !saber) {
    // 빼빼로 검: 칼 대신 기다란 초코 빼빼로
    drawPeperoBlade(10, L + 6);
    ctx.shadowBlur = 0; ctx.restore();
    ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    return;
  }
  if (saber) {
    // 광선검: 빛나는 색 칼날(가운데는 흰색) + 금속 손잡이
    ctx.shadowColor = saber; ctx.shadowBlur = 22;
    ctx.strokeStyle = saber; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(12 + L, 0); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(12 + L, 0); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#9aa3b2'; ctx.fillRect(-8, -3.5, 20, 7); ctx.fillStyle = '#3a3f4a'; ctx.fillRect(-2, -3.5, 3, 7); ctx.fillRect(5, -3.5, 2, 7);
    ctx.fillStyle = saber; ctx.fillRect(9, -2, 2, 4);
    ctx.restore();
    ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    return;
  }
  ctx.fillStyle = holy ? '#fffbe6' : dark ? '#1a0f26' : hot ? '#ffe2b0' : cold ? '#dff5ff' : '#e8f0ff'; ctx.strokeStyle = holy ? '#e8b830' : dark ? '#b46bff' : '#5a6a88'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10 + L, -2); ctx.lineTo(16 + L, 0); ctx.lineTo(10 + L, 3); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = dark ? '#6a2aa8' : holy ? '#ffd23f' : '#c9a24a'; ctx.fillRect(6, -10, 5, 20);         // 코등이
  if (holy) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(14, -1, L - 2, 2); }   // 칼날 가운데 빛줄기
  ctx.fillStyle = '#4a2f1e'; ctx.fillRect(-6, -3, 12, 6);         // 손잡이
  ctx.restore();
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
// 빼빼로 검: 손잡이 쪽은 과자, 나머지는 초코 (x0부터 길이 L)
function drawPeperoBlade(x0, L) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#d8a35e'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0 - 14, 0); ctx.lineTo(x0 + 4, 0); ctx.stroke();   // 과자 부분
  ctx.strokeStyle = 'rgba(160,100,40,0.6)'; ctx.lineWidth = 1; for (let k = -12; k < 4; k += 4) { ctx.beginPath(); ctx.moveTo(x0 + k, -4); ctx.lineTo(x0 + k + 2, 4); ctx.stroke(); }
  ctx.strokeStyle = '#4a2412'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0 + 6, 0); ctx.lineTo(x0 + L, 0); ctx.stroke();     // 초코
  ctx.strokeStyle = 'rgba(255,220,190,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + 10, -2.5); ctx.lineTo(x0 + L - 4, -2.5); ctx.stroke();   // 윤기
  ctx.strokeStyle = '#4a2412'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 6, -5); ctx.quadraticCurveTo(x0 + 3, 0, x0 + 6, 5); ctx.stroke();      // 초코 흘러내린 끝
  ctx.lineCap = 'butt';
}
// 광선검 스킨 색
function saberColor(p) { for (const id of (p && p.sn) || []) { const sk = SKIN_INFO.SKINS[id]; if (sk && sk.blade) return sk.blade; } return null; }
// '#rrggbb' → 'rgba(r,g,b,a)'
function hexA(hex, a) { const n = parseInt(String(hex).slice(1, 7), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
// ---------------- 촉수 (등 뒤 4개) ----------------
function drawTentacles(p, f, time, G) {
  const deep = skinOn(p, 'deepsea'), mech = skinOn(p, 'mecharm');
  const L = 150 * (p.rb ? 2 : 1) * (p.bf ? 1.3 : 1) * (p.gt ? 1.6 : 1) * (p.gm ? p.gm[0] : 1) * (hasK(p, 'hulk') && G > 1 ? 1 + 0.8 * Math.min(1, (G - 1) / 0.9) / G : 1);
  const tc = p.tc || [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) {
    const ext = tc[i * 2], ang = tc[i * 2 + 1];
    const ox = -f * PW * 0.28, oy = -PH * 0.62 + i * 7;      // 등 뒤 뿌리
    let pts;
    if (p.an && i >= 2) {
      // 땅을 짚은 아래 촉수: 무릎처럼 굽혀 바닥까지
      const gd = p.an[1] / (G || 1), sx = (i === 2 ? -1 : 1) * 26;
      pts = [[ox, oy], [ox + sx * 0.6, oy + 10], [sx, gd * 0.45], [sx * 1.3, gd]];
    } else if (ext > 0.02) {
      const tx = f * Math.cos(ang) * L * ext, ty = -PH * 0.55 + Math.sin(ang) * L * ext;
      pts = [[ox, oy], [ox - f * 14, oy - 26 + i * 6], [tx * 0.55, ty - 30 * (1 - ext) - 10], [tx, ty]];
    } else {
      // 쉬는 중: 등 뒤로 늘어져 꿈틀
      const w = Math.sin(time / 260 + i * 1.7) * 6;
      pts = [[ox, oy], [ox - f * 20, oy - 14 + i * 6], [ox - f * 34, oy - 2 + i * 9 + w], [ox - f * (40 + i * 3), oy + 14 + i * 10 + w * 1.4]];
    }
    if (mech) { drawMechArm(pts, f, time, i, ext); continue; }
    // 굵기가 점점 가늘어지는 촉수
    const N = 14;
    let prev = pts[0];
    for (let k = 1; k <= N; k++) {
      const t = k / N, u = 1 - t;
      const x = u * u * u * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t * t * t * pts[3][0];
      const y = u * u * u * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t * t * t * pts[3][1];
      ctx.strokeStyle = deep ? `rgb(${Math.round(70 + 60 * t)},${Math.round(30 + 20 * t)},${Math.round(120 + 70 * t)})` : `rgb(${Math.round(26 + 22 * t)},${Math.round(20 + 14 * t)},${Math.round(34 + 26 * t)})`;
      ctx.lineWidth = 9 - 6 * t; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); ctx.stroke();
      if (deep && k % 3 === 0) { ctx.fillStyle = `rgba(120,255,240,${0.55 + 0.35 * Math.sin(time / 200 + k + i)})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill(); }
      else if (!deep && k % 4 === 0) { ctx.fillStyle = 'rgba(120,90,150,0.6)'; ctx.beginPath(); ctx.arc(x, y + 1.5, 1.4, 0, Math.PI * 2); ctx.fill(); }
      prev = [x, y];
    }
  }
}
// 기계 팔 스킨: 같은 곡선을 따라 금속 마디 + 관절 + 유압 피스톤, 끝에 두 손가락 집게
function drawMechArm(pts, f, time, i, ext) {
  // 기계 팔 스킨: 매끈한 흰색 공상과학 로봇 팔 — 둥근 흰 장갑 마디 + 청록 빛 관절 + 끝의 둥근 집게
  const at = (t) => { const u = 1 - t; return [u * u * u * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t * t * t * pts[3][0], u * u * u * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t * t * t * pts[3][1]]; };
  const N = 4, J = [];
  for (let k = 0; k <= N; k++) J.push(at(k / N));
  const pulse = 0.6 + 0.4 * Math.sin(time / 180 + i);
  for (let k = 0; k < N; k++) {
    const [x1, y1] = J[k], [x2, y2] = J[k + 1], w = 10 - k * 1.6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7d8798'; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#f2f5fa'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const nx = -(y2 - y1), ny = x2 - x1, nl = Math.hypot(nx, ny) || 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(x1 + nx / nl * w * 0.25, y1 + ny / nl * w * 0.25); ctx.lineTo(x2 + nx / nl * w * 0.25, y2 + ny / nl * w * 0.25); ctx.stroke();
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ctx.strokeStyle = `rgba(60,220,230,${0.5 + 0.4 * pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - nx / nl * w * 0.35, my - ny / nl * w * 0.35); ctx.lineTo(mx + nx / nl * w * 0.35, my + ny / nl * w * 0.35); ctx.stroke();
  }
  for (let k = 0; k < N; k++) {
    const [x, y] = J[k], r = 5.2 - k * 0.7;
    ctx.fillStyle = '#4a5262'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8); g.addColorStop(0, '#e8ffff'); g.addColorStop(1, `rgba(40,210,225,${0.6 + 0.3 * pulse})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  const [ex, ey] = J[N], [px2, py2] = J[N - 1], ang = Math.atan2(ey - py2, ex - px2), open = 0.2 + 0.6 * (ext || 0);
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
  ctx.fillStyle = '#f2f5fa'; ctx.strokeStyle = '#7d8798'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.rotate(sd * open);
    ctx.fillStyle = '#f2f5fa'; ctx.beginPath(); ctx.moveTo(2, sd * 1.5); ctx.quadraticCurveTo(9, sd * 5, 13, sd * 1); ctx.quadraticCurveTo(9, sd * 2, 2, sd * 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = `rgba(60,220,230,${0.7 + 0.3 * pulse})`; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
// ---------------- 방패 (손에 든 모습) ----------------
const shStyle = (p) => skinOn(p, 'manhole') ? 'mh' : skinOn(p, 'potlid') ? 'pot' : false;
function drawShieldShape(r, rim, time, mh) {
  if (mh === 'pot') {
    // 냄비 뚜껑: 은색 원판 + 동심원 + 가운데 손잡이(주인 색) + 반짝임
    const pg = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 2, 0, 0, r);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, '#c8ccd4'); pg.addColorStop(1, '#8a8f98');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,95,105,0.7)'; ctx.lineWidth = 1.5;
    for (const k of [0.92, 0.62]) { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = rim; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.18, r * 0.07, -0.6, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (mh) {
    // 맨홀 뚜껑: 무쇠 원판 + 격자 무늬 + 테두리(주인 색)
    const mg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    mg.addColorStop(0, '#8a9098'); mg.addColorStop(1, '#3e4248');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = 'rgba(30,32,36,0.8)'; ctx.lineWidth = 2;
    for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.2, -r); ctx.lineTo(k * r * 0.2, r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r, k * r * 0.2); ctx.lineTo(r, k * r * 0.2); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,205,212,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rim; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 1.5; for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(Math.sin(a) * r * 0.75, -r * 0.7); ctx.lineTo(Math.sin(a) * r * 0.75, r * 0.7); ctx.stroke(); }
  const g = ctx.createRadialGradient(-r * 0.12, -r * 0.12, 1, 0, 0, r * 0.32); g.addColorStop(0, '#fff3c0'); g.addColorStop(1, '#c9a24a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
}
// 꿀벌 (원자 꿀벌 스킨): 노랑·검정 줄무늬 몸 + 파닥이는 날개
function drawBee(x, y, ang, time, G) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(G, G);
  ctx.fillStyle = 'rgba(230,245,255,0.75)'; const fl = Math.abs(Math.sin(time / 25)) * 5 + 3;
  ctx.beginPath(); ctx.ellipse(-3, -6, 4, fl, -0.4, 0, Math.PI * 2); ctx.ellipse(3, -6, 4, fl, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2018'; ctx.fillRect(-3, -5.5, 2.2, 11); ctx.fillRect(2, -5.5, 2.2, 11);
  ctx.beginPath(); ctx.arc(-8, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawShieldHand(p, f, fx, fy, time) {
  const d = p.shd;
  if (!d || !d[0]) return;
  if (d[1]) {
    // 막는 중: 몸 앞에 크게 세움 + 빛
    ctx.save(); ctx.translate(f * (PW / 2 + 10), -PH / 2); ctx.scale(0.55, 1);
    ctx.shadowColor = 'rgba(255,230,140,0.9)'; ctx.shadowBlur = 16; drawShieldShape(40, '#c9a24a', time, shStyle(p)); ctx.restore(); ctx.shadowBlur = 0;
  } else if (d[2] > 0) {
    // 던지려고 뒤로 당기는 중 (충전 링)
    ctx.save(); ctx.translate(-f * (PW / 2 + 8), -PH * 0.62); drawShieldShape(26, '#c9a24a', time, shStyle(p)); ctx.restore();
    ctx.strokeStyle = 'rgba(255,207,63,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-f * (PW / 2 + 8), -PH * 0.62, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d[2]); ctx.stroke();
  } else {
    ctx.save(); ctx.translate(fx + f * 6, fy); ctx.scale(0.6, 1); drawShieldShape(28, '#c9a24a', time, shStyle(p)); ctx.restore();
  }
}
// 던진 방패
function drawThrownShields(state, now) {
  const age = Math.max(-0.07, (now - state.time - INTERP_DELAY) / 1000);
  for (const q of state.shw || []) {
    const x = q.x + q.vx * age, y = q.y + q.vy * age, s2 = q.s || 1;
    const owner = state.p.find((pp) => pp.id === q.o);
    ctx.save(); ctx.translate(x, y); ctx.scale(s2, s2);
    if (q.g) { ctx.scale(1, 0.4); drawShieldShape(26, owner ? owner.c : '#c9a24a', now, shStyle(owner)); }
    else { ctx.rotate(now / 40 * (q.vx >= 0 ? 1 : -1)); ctx.scale(1, 0.75); drawShieldShape(26, owner ? owner.c : '#c9a24a', now, shStyle(owner)); }
    ctx.restore();
  }
}
// ---------------- 귀신 ----------------
function drawGhost(p, x, y, time, G) {
  const bob = Math.sin(time / 220) * 5, f = p.f || 1;
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(G, G);
  const mud = skinOn(p, 'mudghost');
  if (mud) { ctx.translate(0, -PH / 2); ctx.scale(1, -1); ctx.translate(0, PH / 2); }   // 물귀신: 거꾸로 뒤집힘
  ctx.globalAlpha = mud ? 0.9 : 0.72;
  const g = ctx.createLinearGradient(0, -PH - 8, 0, 6);
  if (mud) { g.addColorStop(0, '#8a6232'); g.addColorStop(1, 'rgba(70,46,20,0.75)'); }
  else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(210,215,255,0.5)'); }
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(-PW / 2 - 2, -6); ctx.lineTo(-PW / 2 - 2, -PH + 18); ctx.quadraticCurveTo(-PW / 2 - 2, -PH - 6, 0, -PH - 6); ctx.quadraticCurveTo(PW / 2 + 2, -PH - 6, PW / 2 + 2, -PH + 18); ctx.lineTo(PW / 2 + 2, -6);
  for (let k = 0; k < 4; k++) { const xx = PW / 2 + 2 - (k + 0.5) * ((PW + 4) / 4), dip = Math.sin(time / 120 + k) * 3; ctx.quadraticCurveTo(xx + 3, 8 + dip, xx - (PW + 4) / 8, -6); }
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1a1030';
  for (const ex of [4, 16]) { ctx.beginPath(); ctx.ellipse(f * ex - (f < 0 ? 0 : 0), -PH + 22, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(f * 10, -PH + 36, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (mud) {
    // 진흙 방울이 위(뒤집힌 아래)로 뚝뚝
    ctx.fillStyle = 'rgba(95,64,28,0.85)';
    for (let k = 0; k < 4; k++) { const ph = ((time / 500) + k / 4) % 1, xx = -14 + k * 9; ctx.beginPath(); ctx.ellipse(xx, -PH - 8 - ph * 26, 3, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(60,40,16,0.6)'; for (const [mx, my] of [[-10, -20], [8, -48], [12, -14]]) { ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
// 태양계 스킨 행성: 0 수성 1 금성 2 지구 3 화성 4 목성 5 토성 6 천왕성 7 해왕성
const PLANETS = [
  { r: 5, c: ['#d0d0d0', '#8a8a8a'] }, { r: 7, c: ['#fff0c0', '#d8a850'] }, { r: 7.5, c: ['#7fc8ff', '#1f5fc0'] }, { r: 6, c: ['#ff9a6a', '#b8401a'] },
  { r: 11, c: ['#f4dcb4', '#b8865a'] }, { r: 9, c: ['#fbe7a8', '#c8a050'] }, { r: 7.5, c: ['#d4fbff', '#6ad0dc'] }, { r: 7.5, c: ['#8fb0ff', '#2a48c8'] },
];
function drawPlanet(x, y, i, G) {
  const P = PLANETS[i % 8], r = P.r * Math.max(1, G * 0.8);
  if (i === 5) { ctx.strokeStyle = 'rgba(230,205,150,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.55, -0.35, Math.PI, Math.PI * 2); ctx.stroke(); }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r);
  g.addColorStop(0, P.c[0]); g.addColorStop(1, P.c[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  if (i === 2) { ctx.fillStyle = '#3cbf5a'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.1, r * 0.4, r * 0.28, 0.5, 0, Math.PI * 2); ctx.ellipse(x + r * 0.35, y + r * 0.35, r * 0.25, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
  if (i === 4) { ctx.strokeStyle = 'rgba(160,100,60,0.7)'; ctx.lineWidth = 1.5; for (const dy of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.moveTo(x - r * 0.9, y + dy * r); ctx.lineTo(x + r * 0.9, y + dy * r); ctx.stroke(); } ctx.fillStyle = '#c8603a'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.25, r * 0.22, r * 0.14, 0, 0, Math.PI * 2); ctx.fill(); }
  if (i === 5) { ctx.strokeStyle = 'rgba(230,205,150,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.55, -0.35, 0, Math.PI); ctx.stroke(); }
}
function finishPlayer(p, x, y, G, light, ownerId, baseAlpha, isClone, time) {
  if (p.qk === 2 || p.qc) {
    // 흔들흔들: 지진 걸린 사람(그리고 시전자)의 몸 주위로 하얀 흔들림 선
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const cy0 = y - PH * G / 2, sh = Math.sin(time / 35) * 4;
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
      const xx = x + sd * (PW * G / 2 + 8 + k * 7) + sh;
      ctx.beginPath(); ctx.moveTo(xx, cy0 - 18 + k * 4); ctx.quadraticCurveTo(xx + sd * 5, cy0, xx, cy0 + 18 - k * 4); ctx.stroke();
    }
    if (p.qc) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(x + sh, y - 2, 46 * G, 10 * G, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (p.stl && skinOn(p, 'cloak') && !isClone) {
    // 투명 망토: 머리부터 뒤집어쓴 반투명 망토 (나·우리 팀에게만 보임)
    ctx.save(); ctx.globalAlpha = 0.55;
    const cg = ctx.createLinearGradient(x - 30 * G, y - PH * G - 10, x + 30 * G, y);
    cg.addColorStop(0, 'rgba(200,215,240,0.9)'); cg.addColorStop(0.5, 'rgba(120,140,190,0.7)'); cg.addColorStop(1, 'rgba(200,225,255,0.9)');
    ctx.fillStyle = cg; ctx.beginPath();
    ctx.moveTo(x, y - PH * G - 12 * G); ctx.quadraticCurveTo(x + 30 * G, y - PH * G, x + 28 * G + Math.sin(time / 200) * 3, y + 2);
    ctx.lineTo(x - 28 * G + Math.sin(time / 230) * 3, y + 2); ctx.quadraticCurveTo(x - 30 * G, y - PH * G, x, y - PH * G - 12 * G); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    const sh2 = ((time / 6) % (PH * G + 40)) - 20; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(x - 24 * G, y - PH * G + sh2); ctx.lineTo(x + 24 * G, y - PH * G + sh2 - 14); ctx.stroke();
    ctx.restore();
  }
  if (p.el && !isClone) {
    // 원자: 링(무해) + 도는 전자 — 서버와 같은 식 (화면 지연만큼 각도를 앞당김)
    const [n, ph0, boost] = p.el, R = 62 * G, cx = x, cy = y - PH * G / 2;
    const age = latest ? Math.max(0, (performance.now() - latest.time) / 1000) : 0;
    const ph = ph0 + 4 * (boost ? 2 : 1) * age;
    const rings = boost ? [-0.6, 0.6] : [null];
    const solar = skinOn(p, 'solar'), bees = skinOn(p, 'bees');
    ctx.strokeStyle = solar ? 'rgba(255,220,150,0.35)' : bees ? 'rgba(255,210,80,0.3)' : 'rgba(90,216,255,0.45)'; ctx.lineWidth = 1.5;
    for (const t of rings) { ctx.beginPath(); if (t === null) ctx.arc(cx, cy, R, 0, Math.PI * 2); else ctx.ellipse(cx, cy, R, R * 0.4, t, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < n; i++) {
      let ex, ey;
      if (boost) { const ring = i % 2, cnt = Math.ceil(n / 2) || 1, j = Math.floor(i / 2), a = (ring ? -ph : ph) + (j * Math.PI * 2) / cnt, t = ring ? 0.6 : -0.6, rx = Math.cos(a) * R, ry = Math.sin(a) * R * 0.4; ex = cx + rx * Math.cos(t) - ry * Math.sin(t); ey = cy + rx * Math.sin(t) + ry * Math.cos(t); }
      else { const a = ph + (i * Math.PI * 2) / n; ex = cx + Math.cos(a) * R; ey = cy + Math.sin(a) * R; }
      if (solar) { drawPlanet(ex, ey, i, G); continue; }
      if (bees) { drawBee(ex, ey, Math.atan2(ey - cy, ex - cx) + Math.PI / 2, time + i * 50, G); continue; }
      const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 11); eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.4, '#5ad8ff'); eg.addColorStop(1, 'rgba(90,216,255,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 11, 0, Math.PI * 2); ctx.fill();
    }
    if (solar && boost) {
      // 스킬을 쓰면 나머지 행성(…토성·천왕성·해왕성)도 바깥 궤도에 나타나 수금지화목토천해가 모두 돎 (장식, 판정은 안쪽 행성만)
      for (let i = n; i < 8; i++) {
        const k = i - n, orbit = R * (1.35 + k * 0.17), a = -ph * (0.6 - k * 0.06) + i * 2.1;
        ctx.strokeStyle = 'rgba(255,230,180,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, orbit, orbit * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.85; drawPlanet(cx + Math.cos(a) * orbit, cy + Math.sin(a) * orbit * 0.45, i, G); ctx.globalAlpha = 1;
      }
    }
  }
  if (p.er === 2 && !isClone) {
    // 해커: 쨍한 빨간 글리치 + 머리 위 빨간 HACKER
    const jit = () => (Math.random() - 0.5) * 12;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ff1a2e'; roundRect(x - PW * G / 2 + jit() - 5, y - PH * G + jit(), PW * G, PH * G, 10); ctx.fill();
    ctx.fillStyle = '#ff7a8a'; roundRect(x - PW * G / 2 + jit() + 5, y - PH * G + jit(), PW * G, PH * G, 10); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ff2a3a' : '#ffffff'; ctx.fillRect(x + (Math.random() - 0.5) * 74 * G, y - Math.random() * PH * G * 1.2, 6 + Math.random() * 18, 3 + Math.random() * 4); }
    ctx.font = '900 14px monospace'; ctx.textAlign = 'center';
    const hy = y - PH * G - 30 - (p.b ? 12 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 36, hy - 13, 72, 18);
    ctx.fillStyle = Math.floor(time / 140) % 2 ? '#ff1a2e' : '#ff5a6a'; ctx.fillText('HACKER', x + jit() * 0.3, hy);
  } else if (p.er && !isClone) {
    // 에러 걸림: 몸이 어긋난 색으로 겹쳐 보이고 깨진 조각이 튐 (모두에게 보임)
    const jit = () => (Math.random() - 0.5) * 10;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ff2a78'; roundRect(x - PW * G / 2 + jit() - 5, y - PH * G + jit(), PW * G, PH * G, 10); ctx.fill();
    ctx.fillStyle = '#28a0ff'; roundRect(x - PW * G / 2 + jit() + 5, y - PH * G + jit(), PW * G, PH * G, 10); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#39ff88';
    for (let i = 0; i < 5; i++) ctx.fillRect(x + (Math.random() - 0.5) * 70 * G, y - Math.random() * PH * G * 1.2, 6 + Math.random() * 18, 3 + Math.random() * 4);
    ctx.font = '700 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(57,255,136,0.95)';
    if (Math.floor(time / 120) % 2) ctx.fillText('ERROR', x + jit(), y - PH * G - 30 - (p.b ? 12 : 0));
  }
  if (p.pa && skinOn(p, 'rainbow')) {
    // 무지개 반사: 몸 앞에 세운 무지개 아치
    const f2 = p.f || 1, cx2 = x + f2 * (PW / 2 + 6) * G, cy2 = y - PH * G / 2;
    const cols = ['#ff3b3b', '#ff9a2e', '#ffe14a', '#3ccf6e', '#3f8cff', '#7a5cff', '#c86bff'];
    ctx.lineWidth = 5 * G; ctx.lineCap = 'round';
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx2 - f2 * 30 * G, cy2, (44 - i * 5) * G, -1.1, 1.1, false); if (f2 < 0) { ctx.beginPath(); ctx.arc(cx2 - f2 * 30 * G, cy2, (44 - i * 5) * G, Math.PI - 1.1, Math.PI + 1.1, false); } ctx.stroke(); });
  } else if (p.pa) {
    // 반사 대기: 몸 앞에 세운 거울 (은색 테두리 + 비치는 유리 + 반짝임)
    const f2 = p.f || 1, mw = 16 * G, mh = 84 * G;
    const mx = x + f2 * (PW / 2 + 12) * G - mw / 2, my = y - PH * G / 2 - mh / 2;
    const gl = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
    gl.addColorStop(0, 'rgba(200,225,255,0.85)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.55, 'rgba(160,190,230,0.8)'); gl.addColorStop(1, 'rgba(220,235,255,0.85)');
    ctx.fillStyle = gl; roundRect(mx, my, mw, mh, 6 * G); ctx.fill();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; roundRect(mx, my, mw, mh, 6 * G); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2;
    const sh = ((time / 3) % (mh + 30)) - 15;
    ctx.beginPath(); ctx.moveTo(mx + 2, my + sh); ctx.lineTo(mx + mw - 2, my + sh - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx + 3, my + sh + 12); ctx.lineTo(mx + mw - 3, my + sh + 4); ctx.stroke();
  }
  if (p.br != null) {
    // 숨방울: 남은 개수만큼 (머리 위)
    const sy5 = y - PH * G - 28 - (p.b ? 12 : 0);
    for (let i = 0; i < 10; i++) {
      const sx5 = x - 40 + i * 9;
      ctx.strokeStyle = 'rgba(220,245,255,0.9)'; ctx.lineWidth = 1.2;
      ctx.fillStyle = i < p.br ? 'rgba(170,225,255,0.85)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.arc(sx5, sy5, 3.6, 0, Math.PI * 2); ctx.fill(); if (i < p.br) ctx.stroke();
    }
  }
  if (p.mk > 0) {
    // 귀신 표식: 3개 차면 장외
    const n = p.mk, sy4 = y - PH * G - 56 - (p.b ? 12 : 0);
    for (let i = 0; i < 3; i++) {
      const sx4 = x + (i - 1) * 16;
      ctx.fillStyle = i < n ? 'rgba(170,90,255,0.95)' : 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(sx4, sy4, 6, Math.PI, 0); ctx.lineTo(sx4 + 6, sy4 + 7); ctx.lineTo(sx4 + 2, sy4 + 4); ctx.lineTo(sx4 - 2, sy4 + 7); ctx.lineTo(sx4 - 6, sy4 + 4); ctx.closePath(); ctx.fill();
    }
  }
  if (p.scn && !isClone && p.scn[0] > 0) {
    // 별빛: 모은 별 카운트를 머리 위에 작은 별로
    const n = p.scn[0], sy3 = y - PH * G - 34 - (p.b ? 12 : 0);
    for (let i = 0; i < n; i++) {
      const sx3 = x + (i - (n - 1) / 2) * 13, tw = 0.7 + 0.3 * Math.sin(time / 200 + i);
      ctx.fillStyle = `rgba(255,231,102,${tw})`; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.4 : 5.5, t = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(sx3 + Math.cos(t) * r, sy3 + Math.sin(t) * r); }
      ctx.closePath(); ctx.fill();
    }
  }
  if (p.cg && p.cg[1] > 0 && !isClone) {
    // 충전 스택: 머리 위 작은 칸 (최대 10)
    const n = p.cg[1], by3 = y - PH * G - 44 - (p.b ? 12 : 0) - (p.br != null ? 12 : 0);
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i < n ? (p.cg[0] ? '#5ef08a' : '#ff5a4a') : 'rgba(255,255,255,0.15)'; ctx.fillRect(x - 30 + i * 6, by3, 5, 7); }
  }
  if (p.rv === 2) {
    // 우왕좌왕: 머리 위에 기울어진 금 왕관
    const dx = x, dy = y - PH * G - 44 - (p.b ? 12 : 0) - (p.cb > 0 ? 22 : 0) + Math.sin(time / 200) * 2;
    ctx.save(); ctx.translate(dx, dy); ctx.rotate(Math.sin(time / 300) * 0.25);
    const cg = ctx.createLinearGradient(0, -14, 0, 8); cg.addColorStop(0, '#fff3a0'); cg.addColorStop(1, '#d89a10');
    ctx.fillStyle = cg; ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-16, 8); ctx.lineTo(-18, -10); ctx.lineTo(-9, -2); ctx.lineTo(0, -16); ctx.lineTo(9, -2); ctx.lineTo(18, -10); ctx.lineTo(16, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const [gx, gc] of [[-9, '#ff3b5c'], [0, '#3f8cff'], [9, '#3ccf6e']]) { ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(gx, 3, 2.6, 0, Math.PI * 2); ctx.fill(); }
    for (const tx of [-18, 0, 18]) { ctx.fillStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(tx, tx ? -10 : -16, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  } else if (p.rv) {
    // 반전: 머리 위 악마 표시 (빨간 얼굴 + 뿔)
    const dx = x, dy = y - PH * G - 50 - (p.b ? 12 : 0) - (p.cb > 0 ? 22 : 0) + Math.sin(time / 200) * 2;
    ctx.fillStyle = '#d81b4a';
    ctx.beginPath(); ctx.moveTo(dx - 11, dy - 6); ctx.lineTo(dx - 15, dy - 20); ctx.lineTo(dx - 4, dy - 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dx + 11, dy - 6); ctx.lineTo(dx + 15, dy - 20); ctx.lineTo(dx + 4, dy - 10); ctx.fill();
    ctx.beginPath(); ctx.arc(dx, dy, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe14a';
    ctx.beginPath(); ctx.moveTo(dx - 8, dy - 4); ctx.lineTo(dx - 2, dy - 1); ctx.lineTo(dx - 8, dy + 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dx + 8, dy - 4); ctx.lineTo(dx + 2, dy - 1); ctx.lineTo(dx + 8, dy + 1); ctx.fill();
    ctx.strokeStyle = '#2a0010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx, dy + 3, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  if (p.cb > 0 && !isClone) {
    // 콤보 스택
    ctx.font = '400 20px "Black Han Sans", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(`${p.cb} COMBO`, x + 1, y - PH * G - 46 - (p.b ? 12 : 0));
    ctx.fillStyle = p.cb >= 10 ? '#ff5fa2' : '#ffd0e6'; ctx.fillText(`${p.cb} COMBO`, x, y - PH * G - 47 - (p.b ? 12 : 0));
  }
  if (p.ig > 0 && !p.icd) {
    // 얼음 게이지
    const bw2 = 46, bx = x - bw2 / 2, by2 = y - PH * G - 42 - (p.b ? 12 : 0);
    ctx.fillStyle = 'rgba(10,20,40,0.7)'; roundRect(bx - 2, by2 - 2, bw2 + 4, 10, 4); ctx.fill();
    if (p.idk) ctx.fillStyle = '#1a1424';
    else if (p.iau) {
      const ag = ctx.createLinearGradient(bx, 0, bx + bw2, 0);
      ag.addColorStop(0, '#2af598'); ag.addColorStop(0.5, '#3ae0d0'); ag.addColorStop(1, '#a66bff');
      ctx.fillStyle = ag;
    } else if (!p.idk) ctx.fillStyle = p.isd ? '#d9b26a' : '#8fdcff';
    roundRect(bx, by2, bw2 * Math.min(1, p.ig / 100), 6, 3); ctx.fill();
    if (p.idk) { ctx.strokeStyle = 'rgba(160,100,220,0.8)'; ctx.lineWidth = 1; roundRect(bx, by2, bw2 * Math.min(1, p.ig / 100), 6, 3); ctx.stroke(); }
  }
  if (p.stn) {
    // 스턴: 머리 위에 빙글빙글 별
    for (let i = 0; i < 3; i++) {
      const a = time / 180 + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 20 * G, sy = y - PH * G - 8 + Math.sin(a) * 6;
      ctx.fillStyle = '#ffe94a'; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 7, t = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(sx + Math.cos(t) * r, sy + Math.sin(t) * r); }
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = baseAlpha;
  const lift = (p.b ? 12 : 0) + PH * (G - 1);
  ctx.font = '700 15px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
  const isMe = p.id === myId || p.ctl === myId;
  const label = light ? '내 분신' : (isMe ? '▼ ' : '') + (ownerId === hostLive ? '♛ ' : '') + p.n
    + (p.stl && p.id === myId ? ' (은신)' : '') + (p.ctl ? (p.ctl === myId ? ' (조종 중)' : ' (기생당함)') : '');
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(label, x + 1, y - PH - 13 - lift - (p.ctl ? 14 : 0));
  ctx.fillStyle = isMe ? '#ffcf3f' : p.ctl ? '#9ef08f' : '#fff'; ctx.fillText(label, x, y - PH - 14 - lift - (p.ctl ? 14 : 0));
  ctx.globalAlpha = 1;
  if (!isClone && (x < 0 || x > STAGE.width || y < 0)) {
    const ax = Math.max(24, Math.min(STAGE.width - 24, x)), ay = Math.max(24, y);
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ax, ay, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
}
// 영혼(화염 할로윈 스킨): 위로 꼬리가 흔들리는 반투명 도깨비불 영혼 (눈·입이 있음)
function drawSoulWisp(x, y, r, time, seed = 0, alpha = 1, face = true) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha *= alpha;
  const sway = Math.sin(time / 180 + seed) * r * 0.45;
  ctx.shadowColor = 'rgba(120,255,210,0.95)'; ctx.shadowBlur = r * 1.4;
  const g = ctx.createRadialGradient(0, r * 0.15, r * 0.1, 0, 0, r * 1.25);
  g.addColorStop(0, 'rgba(240,255,250,0.95)'); g.addColorStop(0.45, 'rgba(140,255,215,0.75)'); g.addColorStop(1, 'rgba(40,200,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.2);
  ctx.bezierCurveTo(-r, r * 1.15, r, r * 1.15, r, r * 0.2);                     // 둥근 아래쪽
  ctx.bezierCurveTo(r, -r * 0.9, sway * 0.6 + r * 0.3, -r * 1.5, sway, -r * 2.6); // 오른쪽 위로 가늘어지는 꼬리
  ctx.bezierCurveTo(sway * 0.4 - r * 0.4, -r * 1.4, -r, -r * 0.9, -r, r * 0.2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (face && r >= 5) {
    // 텅 빈 눈 두 개 + 놀란 입
    ctx.fillStyle = 'rgba(10,40,40,0.85)';
    ctx.beginPath(); ctx.ellipse(-r * 0.35, r * 0.15, r * 0.17, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.15, r * 0.17, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.13, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawParticles(dt) {
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) {
    const a = Math.max(0, p.life / p.max);
    if (p.ring) {
      const rad = p.shrink ? p.r * a : p.grow ? p.r * (1 - a * 0.6) : p.r * (1 - a) + 8;
      if (p.fill) { ctx.fillStyle = `rgba(${p.c},${a * 0.18})`; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = `rgba(${p.c},${a})`; ctx.lineWidth = 4 * a + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.stroke();
    } else if (p.taiji) {
      // 태극 무늬 (빨강·파랑, 회전)
      const R = p.r * (p.dir > 0 ? 0.5 + (1 - a) * 0.6 : 0.6 + a * 0.5), rot = (1 - a) * Math.PI * 2 * p.dir;
      const cA = p.yy ? '#111' : '#2350b8', cB = p.yy ? '#f4f4f4' : '#d8323c';
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot); ctx.globalAlpha = Math.min(1, a * 1.6) * 0.55;
      ctx.fillStyle = cA; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cB; ctx.beginPath();
      ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);          // 오른쪽 반원
      ctx.arc(0, R / 2, R / 2, Math.PI / 2, Math.PI * 1.5, false); // 아래 작은 원 (왼쪽으로 볼록)
      ctx.arc(0, -R / 2, R / 2, Math.PI / 2, -Math.PI / 2, true);  // 위 작은 원 (오른쪽으로 오목)
      ctx.fill();
      ctx.fillStyle = cA; ctx.beginPath(); ctx.arc(0, R / 2, R / 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cB; ctx.beginPath(); ctx.arc(0, -R / 2, R / 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.yy ? 'rgba(120,120,120,0.9)' : 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (p.chain) {
      // 쇠사슬 스킨: 사슬 고리 줄 + 끝의 낫
      const dx = p.hx - p.x, dy = p.hy - p.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, n = Math.max(3, Math.floor(L / 14));
      ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5); ctx.strokeStyle = '#9aa0aa'; ctx.lineWidth = 2.5;
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; ctx.beginPath(); ctx.ellipse(p.x + dx * t, p.y + dy * t, 7, 3.5, Math.atan2(dy, dx) + (k % 2 ? Math.PI / 2 * 0 : 0), 0, Math.PI * 2); if (k % 2) { ctx.save(); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); } else ctx.stroke(); }
      ctx.translate(p.hx, p.hy); ctx.rotate(Math.atan2(uy, ux));
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = '#d8dde6'; ctx.strokeStyle = '#6a7484'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(6, -2); ctx.quadraticCurveTo(26, -4, 22, 18); ctx.quadraticCurveTo(18, 4, 6, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (p.bolt) {
      // 짧은 지그재그 번개 줄기
      ctx.strokeStyle = p.c; ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      for (let k = 1; k <= 4; k++) {
        const d = (p.len * k) / 4, off = (k % 2 ? 1 : -1) * 12;
        ctx.lineTo(p.x + Math.cos(p.a) * d - Math.sin(p.a) * off, p.y + Math.sin(p.a) * d + Math.cos(p.a) * off);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    } else if (p.strike) {
      // 하늘에서 내리치는 번개
      const top = -60;
      let x = p.x, seed = p.seed;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const layers = p.th ? [[22, `rgba(40,110,255,${a * 0.3})`], [11, `rgba(70,150,255,${a * 0.6})`], [4, `rgba(225,240,255,${a})`]] : [[14, `rgba(255,240,120,${a * 0.35})`], [5, `rgba(255,255,230,${a})`]];
      for (const [w, col] of layers) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x + (rnd() - 0.5) * 60, top);
        seed = p.seed;
        for (let y = top; y <= p.y - 30; y += 40) { x = p.x + (rnd() - 0.5) * 50; ctx.lineTo(x, y); }
        ctx.lineTo(p.x, p.y - 30); ctx.stroke();
      }
    } else if (p.txt) {
      p.y += p.vy * dt; if (p.vx) { p.x += p.vx * dt; p.vx *= 0.96; p.vy *= 0.97; }   // 옆으로도 퍼질 수 있음 (음표·카드·하트)
      ctx.globalAlpha = Math.min(1, a * 1.5); ctx.font = `400 ${p.sz || 18}px "Black Han Sans", sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(p.txt, p.x + 1, p.y + 1); ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, p.y); ctx.globalAlpha = 1;
    } else if (p.fw) {
      // 불꽃놀이: 플레이어 자리에서 바로 펑 터져 불티가 둥글게 퍼지고 떨어짐 (콤보가 클수록 겹 고리가 늘어남)
      const t = p.max - p.life, fade = Math.max(0, 1 - t / p.max);
      if (t < 0.14) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t / 0.14)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 34 * p.big, 0, Math.PI * 2); ctx.fill(); }
      for (let ring = 0; ring < p.rings; ring++) {
        const R = 95 * p.big * (1 - ring * 0.28) * Math.min(1, t / 0.3 + 0.15), N = Math.max(10, Math.round(p.sparks * (1 - ring * 0.3)));
        for (let k = 0; k < N; k++) {
          const a = (k / N) * Math.PI * 2 + p.seed + ring * 0.4, dx = Math.cos(a) * R, dy = Math.sin(a) * R + t * t * 120;
          ctx.globalAlpha = fade; ctx.strokeStyle = p.c; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(p.x + dx * 0.72, p.y + dy * 0.72 - 2); ctx.lineTo(p.x + dx, p.y + dy); ctx.stroke();
          ctx.fillStyle = (k + ring) % 3 ? p.c : '#ffffff'; ctx.beginPath(); ctx.arc(p.x + dx, p.y + dy, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else if (p.mw) {
      // 문워크 잔상: 뒤로 기운 몸 + 중절모 + 발끝 세운 발
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = a * 0.55; ctx.rotate(-p.f * 0.12);
      ctx.fillStyle = p.c; roundRect(-PW / 2, -PH, PW, PH, 12); ctx.fill();
      ctx.fillStyle = '#16141c'; ctx.fillRect(-14, -PH - 6, 28, 5); ctx.fillRect(-9, -PH - 16, 18, 11);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-9, -PH - 9, 18, 2);
      ctx.fillStyle = '#16141c'; const st = p.step % 2 ? 1 : -1; ctx.beginPath(); ctx.ellipse(st * 7, 2, 7, 3, st * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (p.cloakfall) {
      // 망토가 위에서 덮이며 내려옴
      const t = 1 - a, top = p.y - PH - 80 + t * 70;
      ctx.save(); ctx.globalAlpha = 0.75 * Math.min(1, a * 2);
      ctx.fillStyle = 'rgba(150,170,215,0.9)'; ctx.beginPath(); ctx.moveTo(p.x, top);
      ctx.quadraticCurveTo(p.x + 34, top + 20, p.x + 30, p.y - 30 + t * 30); ctx.lineTo(p.x - 30, p.y - 30 + t * 30); ctx.quadraticCurveTo(p.x - 34, top + 20, p.x, top); ctx.fill();
      ctx.restore();
    } else if (p.coin) {
      // 동전 던지기: 올라갔다 떨어지며 빙글빙글 → 마지막엔 면이 보임
      const t = 1 - a, h = Math.max(0, Math.sin(Math.min(1, t / 0.7) * Math.PI)) * 120, landed = t > 0.7;
      const cx2 = p.x, cy2 = p.y0 - 30 - h, sq = landed ? 1 : Math.abs(Math.cos(t * 40));
      ctx.save(); ctx.translate(cx2, cy2); ctx.scale(1, Math.max(0.12, sq));
      const cg = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16); cg.addColorStop(0, '#fff6b0'); cg.addColorStop(1, '#d89a10');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      if (landed) {
        ctx.font = '400 15px "Black Han Sans", sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#8a5a00'; ctx.fillText(p.head ? '앞' : '뒤', cx2, cy2 + 5);
        ctx.fillStyle = p.head ? '#ffe27a' : '#c8c8d8'; ctx.fillText(p.head ? '앞면!' : '뒷면!', cx2, cy2 - 24);
      }
    } else if (p.goo) {
      // 트와이스: 진흙 웅덩이가 넓게 퍼지며 옅어짐
      const t = 1 - a, w = 18 + t * 70;
      ctx.globalAlpha = Math.min(1, a * 1.5) * 0.85; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, w, 5 + (1 - t) * 10, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p.x, p.y, w, 4, 0, 0, Math.PI); ctx.fill();
      if (t < 0.4) { ctx.beginPath(); ctx.ellipse(p.x, p.y - 20 * (1 - t / 0.4), 14 * (1 - t), 22 * (1 - t / 0.4), 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(p.x - w * 0.3, p.y - 3, w * 0.25, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.worm) {
      // 웜홀: 검보라 소용돌이 + 쓴 사람 색 테두리
      const t = 1 - a, R = 44 * Math.min(1, t * 4) * (a < 0.25 ? a * 4 : 1);
      ctx.save(); ctx.translate(p.x, p.y);
      const wg = ctx.createRadialGradient(0, 0, 2, 0, 0, R); wg.addColorStop(0, 'rgba(0,0,0,0.95)'); wg.addColorStop(0.7, 'rgba(40,10,80,0.85)'); wg.addColorStop(1, 'rgba(90,40,160,0.2)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.ellipse(0, 0, R, R * 1.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.c; ctx.lineWidth = 4; ctx.stroke();
      ctx.rotate(t * 12); ctx.strokeStyle = 'rgba(200,170,255,0.7)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.arc(R * 0.3, 0, R * 0.45, 0, Math.PI * 1.1); ctx.stroke(); }
      ctx.restore();
    } else if (p.wisp) {
      // 영혼: 흔들리며 위로 떠오르다 사라짐
      p.x += p.vx * dt + Math.sin((p.life + p.seed) * 9) * 18 * dt; p.y += p.vy * dt; p.vx *= 0.94;
      drawSoulWisp(p.x, p.y, p.r * (0.6 + a * 0.4), performance.now(), p.seed, Math.min(1, a * 1.4), p.face);
    } else if (p.ghost) {
      ctx.fillStyle = `rgba(${p.c},${a * 0.45})`;
      roundRect(p.x - PW / 2, p.y - PH, PW, PH, 12); ctx.fill();
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.nograv) p.vy += 900 * dt; else { p.vx *= 0.92; p.vy *= 0.92; }
      ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); ctx.globalAlpha = 1;
    }
  }
}
function dmgColor(d) {
  const t = Math.min(d / 150, 1);
  return `rgb(255,${Math.round(255 - 200 * t)},${Math.round(255 - 230 * t)})`;
}
function skillStatus(p) {
  const k = validSkill(p.sk);
  const t = (v) => (v > 0 ? v.toFixed(1) + 's' : '준비');
  if (k === 'magnet') return { ready: !(p.cd > 0) || !(p.cd2 > 0), text: `Q ${t(p.cd)} E ${t(p.cd2)}` };
  if (k === 'empower') return p.bf ? { ready: true, text: `강화 중 ${p.bt}s` } : { ready: p.chg >= 100, text: p.chg >= 100 ? '충전 완료!' : `충전 ${p.chg || 0}%` };
  if (k === 'undying' || k === 'hulk') return { ready: true, text: '패시브' };
  if (k === 'wave' && p.wv) return { ready: true, text: `강화 ${p.wv}s` };
  if (k === 'shotgun' && p.am != null) return { ready: p.am > 0, text: `탄 ${'●'.repeat(p.am)}${'○'.repeat(Math.max(0, 5 - p.am))}${p.cd > 0 ? ' · 장전 ' + p.cd.toFixed(1) + 's' : p.am < 5 ? ' · Q 장전' : ''}` };
  if (k === 'gem' && p.jw) return { ready: !(p.cd > 0), text: `💎${p.jw[0]}${p.jw[1] ? ` · 2배 ${p.jw[1]}s` : p.cd > 0 ? ` · ${p.cd.toFixed(1)}s` : ''}` };
  if (k === 'hop') return p.hj ? { ready: true, text: `무한 점프 ${p.hj}s` } : { ready: !(p.cd > 0), text: p.cd > 0 ? `${p.cd.toFixed(1)}s · 3단 점프` : '준비 · 3단 점프' };
  if (k === 'charge' && p.cg) return { ready: !(p.cd > 0), text: `${p.cg[0] ? '충전 중' : '공격'} · ${p.cg[1]}스택` };
  if (k === 'portal' && latest) { const n = (latest.pt || []).filter((o) => o[2] === p.id).length; if (n === 1) return { ready: true, text: '다시 Q: 이동' }; if (n === 2) return { ready: !(p.cd > 0), text: p.cd > 0 ? `2개 · ${p.cd.toFixed(1)}s` : '2개 (Q: 새로)' }; }
  if (k === 'dope') return p.dp ? { ready: !p.dp[1], text: `${DOPE_NAMES[p.dp[0]]} ${p.dp[1] ? '약화' : '강화'} ${p.dp[2]}s` } : { ready: true, text: '물약 줍기' };
  if (k === 'time' && p.ts) return { ready: !(p.cd > 0), text: '저장됨' };
  if (k === 'combo') return { ready: p.cb > 0, text: `콤보 ${p.cb || 0}` };
  if (k === 'archer' && p.hm) return { ready: true, text: '유도 준비' };
  if (k === 'shield') { const d = p.shd || [1, 0, 0, 0]; return d[2] > 0 ? { ready: true, text: `던지기 ${Math.round(d[2] * 100)}%` } : d[0] ? { ready: true, text: '방패 있음' } : { ready: false, text: d[3] > 0 ? `${d[3]}초 뒤 복귀` : '방패 줍기' }; }
  if (k === 'tentacle' && p.an) return { ready: true, text: `지탱 ${p.an[0]}s` };
  if (k === 'ghost') return p.gh ? { ready: true, text: `귀신 ${p.gh}s` } : { ready: true, text: '패시브' };
  if (k === 'starlight') { const n = p.scn ? p.scn[0] : 0; return { ready: n >= 1 && !(p.cd > 0), text: '★'.repeat(n) + '☆'.repeat(5 - n) }; }
  if (k === 'parasite') return p.ins ? { ready: true, text: `기생 중 ${p.pt}s` } : { ready: p.pr > 0, text: p.pr > 0 ? `가능 ${p.pr}명` : '5번 때리기' };
  return { ready: !(p.cd > 0), text: t(p.cd) };
}
function drawHUD(state, players) {
  const list = players.filter((p) => p.im || state.ph !== 'playing');
  const n = list.length;
  const cw = n > 4 ? 132 : 156, gap = 10, total = n * cw + (n - 1) * gap;
  let x0 = (W - total) / 2;
  for (const p of list) {
    const y0 = H - 96;
    ctx.globalAlpha = p.al || state.ph !== 'playing' ? 1 : 0.4;
    ctx.fillStyle = 'rgba(14,12,28,0.8)'; roundRect(x0, y0, cw, 84, 12); ctx.fill();
    ctx.fillStyle = p.c; roundRect(x0, y0, 8, 84, 4); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = '700 14px "Noto Sans KR", sans-serif';
    ctx.fillStyle = p.id === myId ? '#ffcf3f' : '#d8d4f0';
    ctx.fillText(p.n, x0 + 18, y0 + 22, cw - 70);
    ctx.font = '400 32px "Black Han Sans", sans-serif'; ctx.fillStyle = dmgColor(p.dmg);
    ctx.fillText(p.al ? `${p.dmg}%` : 'OUT', x0 + 18, y0 + 58);
    if (state.ph === 'waiting') {
      const host = p.id === state.host, bot = p.b;
      ctx.font = '700 11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'right';
      ctx.fillStyle = host ? '#ffcf3f' : (p.rd || bot) ? '#6fe39a' : '#a39fc4';
      ctx.fillText(host ? '방장' : p.dm ? '더미' : bot ? '봇' : p.rd ? '준비 ✓' : '대기', x0 + cw - 12, y0 + 22);
      ctx.textAlign = 'left';
    }
    if (state.ph === 'playing' || state.ph === 'ended') {
      const ms = p.ms || CONFIG.STOCKS, gap2 = ms > 3 ? 11 : 16, rr = ms > 3 ? 4.5 : 6;
      for (let i = 0; i < ms; i++) {
        ctx.fillStyle = i < p.st ? p.c : 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(x0 + cw - 16 - i * gap2, y0 + 18, rr, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 스킬 쿨타임
    const sk = SKILLS[validSkill(p.sk)];
    const skColor = SKILL_COLOR[validSkill(p.sk)];
    const st = skillStatus(p);
    const ready = st.ready;
    ctx.font = '700 11px "Noto Sans KR", sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = ready ? skColor : '#6d6893';
    if (p.dm) { ctx.fillStyle = '#a39fc4'; ctx.fillText('가만히 있음', x0 + 18, y0 + 76, cw - 60); }
    else if (p.sk2) {
      // 더블: 두 스킬을 짧게
      const st2 = skillStatus({ ...p, sk: p.sk2, cd: p.cdB });
      const short = (t) => t.replace('준비', '✓');
      ctx.fillText(`${sk.name} ${short(st.text)}`, x0 + 18, y0 + 69, cw - 60);
      ctx.fillStyle = st2.ready ? SKILL_COLOR[validSkill(p.sk2)] : '#6d6893';
      ctx.fillText(`${SKILLS[validSkill(p.sk2)].name} ${short(st2.text)}`, x0 + 18, y0 + 81, cw - 60);
    } else ctx.fillText(`${sk.name} ${st.text}`, x0 + 18, y0 + 76, cw - 60);
    if (state.md && state.md[0] && TEAMS[p.tm]) { ctx.fillStyle = TEAMS[p.tm].color; roundRect(x0 + 10, y0, cw - 10, 5, 2); ctx.fill(); }
    if (p.gm) {
      // 도박: 굴린 배율 (1보다 크면 초록, 작으면 빨강)
      ctx.fillStyle = 'rgba(14,12,28,0.85)'; roundRect(x0, y0 - 38, cw, 34, 8); ctx.fill();
      const lab = ['사거리', '넉백', '받는넉백', '점프', '속도', '크기'];
      ctx.font = '700 10px "Noto Sans KR", sans-serif'; ctx.textAlign = 'left';
      lab.forEach((l, i) => {
        const v = p.gm[i], cx3 = x0 + 8 + (i % 3) * ((cw - 10) / 3), cy3 = y0 - 25 + Math.floor(i / 3) * 15;
        const good = i === 2 ? v < 1 : v > 1;   // 받는 넉백은 작을수록 좋음
        ctx.fillStyle = '#a39fc4'; ctx.fillText(l, cx3, cy3, 30);
        ctx.fillStyle = v === 1 ? '#d8d4f0' : good ? '#6fe39a' : '#ff7b7b'; ctx.fillText(v.toFixed(1), cx3 + 31, cy3);
      });
    }
    ctx.fillStyle = '#a39fc4'; ctx.textAlign = 'right';
    ctx.fillText(`${p.wn}승`, x0 + cw - 12, y0 + 76);
    ctx.globalAlpha = 1;
    x0 += cw + gap;
  }
}
function bigText(text, y, size, color) {
  ctx.textAlign = 'center'; ctx.font = `400 ${size}px "Black Han Sans", sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(text, W / 2 + 4, y + 5, W - 40);
  ctx.fillStyle = color; ctx.fillText(text, W / 2, y, W - 40);
}
function smallText(text, y) {
  ctx.font = '500 18px "Noto Sans KR", sans-serif'; ctx.fillStyle = '#d8d4f0'; ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y, W - 40);
}
function drawPhase(state, players, dt) {
  const ph = state.ph;
  if (ph === 'waiting') {
    smallText(isHost ? '모두 준비되면 위의 "게임 시작"을 눌러요 · 그동안 연습할 수 있어요' : '준비를 누르고 방장(♛)이 시작하길 기다려요 · 그동안 연습할 수 있어요', 330);
  } else if (ph === 'countdown') {
    bigText(String(state.tm), 300, 140, '#ffcf3f');
  } else if (ph === 'ended') {
    bigText(state.w ? `${state.w} 승리!` : '무승부', 260, 90, '#ffcf3f');
    smallText(`${state.tm}초 후 다음 라운드`, 305);
  } else if (ph === 'playing') {
    const me = players.find((p) => p.id === myId);
    if (me && !me.im) bigText('관전 중 · 다음 라운드에 참가합니다', 120, 30, '#ffffff');
    else if (me && !me.al) bigText('탈락! 관전 중', 120, 36, '#ff7b7b');
  }
  banners = banners.filter((b) => (b.life -= dt) > 0);
  let by = 220;
  for (const b of banners) {
    ctx.globalAlpha = Math.min(1, b.life / 0.3);
    if (b.small) {
      ctx.font = '700 22px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = b.color || '#fff'; ctx.fillText(b.text, W / 2, by); by += 32;
    } else {
      const s = reduceMotion ? 1 : 1 + (1 - b.life / b.max) * 0.3;
      ctx.save(); ctx.translate(W / 2, 330); ctx.scale(s, s); ctx.translate(-W / 2, -330);
      bigText(b.text, 330, 110, '#ff5a5f'); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}


// 폭파 연기: 짙은 연기가 물리적으로 덮어서 안이 안 보임 (캐릭터 위에 그림)
function drawSmoke(list, time) {
  for (const s of list) {
    if (s.nk) {
      // 핵폭발: 버섯 구름 (기둥 + 둥근 머리, 아래는 붉게 이글거림)
      const a = Math.min(1, s.a * 2.2) * 0.9, R = s.r;
      const stem = ctx.createLinearGradient(0, s.y - R * 0.8, 0, s.y + R * 0.6);
      stem.addColorStop(0, `rgba(150,120,110,${a})`); stem.addColorStop(1, `rgba(255,140,50,${a * 0.9})`);
      ctx.fillStyle = stem; ctx.beginPath(); ctx.moveTo(s.x - R * 0.18, s.y + R * 0.6); ctx.quadraticCurveTo(s.x - R * 0.12, s.y - R * 0.2, s.x - R * 0.2, s.y - R * 0.75);
      ctx.lineTo(s.x + R * 0.2, s.y - R * 0.75); ctx.quadraticCurveTo(s.x + R * 0.12, s.y - R * 0.2, s.x + R * 0.18, s.y + R * 0.6); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + time / 3000, rr = R * 0.55;
        const x = s.x + Math.cos(ang) * rr * 0.8, y = s.y - R * 0.95 + Math.sin(ang) * rr * 0.4;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.42);
        g.addColorStop(0, `rgba(${i % 3 ? '170,140,125' : '255,170,80'},${a})`); g.addColorStop(1, 'rgba(120,100,95,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(140,115,105,${a})`; ctx.beginPath(); ctx.ellipse(s.x, s.y - R * 0.95, R * 0.62, R * 0.38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,120,40,${a * 0.5})`; ctx.beginPath(); ctx.ellipse(s.x, s.y - R * 0.75, R * 0.5, R * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(110,95,90,${a * 0.8})`; ctx.beginPath(); ctx.ellipse(s.x, s.y + R * 0.6, R * 0.7, R * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const a = Math.min(1, s.a * 2.2) * 0.42;   // 반투명 연기
    // 바깥쪽 몽글몽글한 가장자리
    for (let i = 0; i < 16; i++) {
      const ang = i * 2.399 + time / 2600, rr = s.r * (0.55 + (i % 4) * 0.12);
      const x = s.x + Math.cos(ang) * rr * 0.75, y = s.y + Math.sin(ang) * rr * 0.6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 0.5);
      g.addColorStop(0, `rgba(104,100,122,${0.95 * a})`);
      g.addColorStop(1, 'rgba(104,100,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, s.r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    // 가운데는 완전히 불투명
    ctx.fillStyle = `rgba(92,88,108,${a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(120,116,136,${0.5 * a})`;
    for (let i = 0; i < 6; i++) {
      const ang = i * 1.05 + time / 1800;
      ctx.beginPath(); ctx.arc(s.x + Math.cos(ang) * s.r * 0.35, s.y + Math.sin(ang) * s.r * 0.3, s.r * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }
}
let hakiFlash = 0, freezeFlash = 0, lightFlash = 0, lightBlue = false, errHold = 0, rewindT = 0, rewindG = false;
// 화살 + 바람 소용돌이
function drawArrowsWinds(state, now) {
  const age = Math.max(-0.07, (now - state.time - INTERP_DELAY) / 1000);
  for (const a of state.ar || []) {
    const x = a.x + a.vx * age, y = a.y + a.vy * age, ang = Math.atan2(a.vy, a.vx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (a.s) ctx.scale(a.s, a.s);
    if (a.sg) {
      // 샷건 산탄: 작은 탄 + 짧은 불꽃 꼬리
      const tg2 = ctx.createLinearGradient(-30, 0, 4, 0); tg2.addColorStop(0, 'rgba(255,200,90,0)'); tg2.addColorStop(1, 'rgba(255,220,120,0.9)');
      ctx.fillStyle = tg2; ctx.fillRect(-30, -1.5, 32, 3);
      ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); continue;
    }
    if (a.ku && a.vp) {
      // 뱀파이어: 쿠나이 대신 박쥐가 날아감 (붉은 잔상)
      ctx.strokeStyle = 'rgba(150,30,60,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const oy of [-5, 5]) { ctx.beginPath(); ctx.moveTo(-36, oy); ctx.lineTo(-12, oy * 0.5); ctx.stroke(); }
      if (a.vx < 0) ctx.scale(1, -1);   // 왼쪽으로 날아가도 박쥐가 뒤집히지 않게
      drawBat(1.15, now, a.x);
      ctx.restore(); continue;
    }
    if (a.ku) {
      // 닌자 쿠나이(고드름): 직선으로 날아감 + 속도선
      const tc2 = a.vp ? 'rgba(150,30,60,0.55)' : a.el === 'green' ? 'rgba(60,240,120,0.7)' : a.el === 'fire' ? 'rgba(255,120,30,0.7)' : a.el === 'blue' ? 'rgba(60,140,255,0.7)' : a.el === 'dark' ? 'rgba(120,40,200,0.75)' : a.el === 'ice' ? 'rgba(150,220,255,0.7)' : a.el ? fxColor(a.el, 0.6, now) : a.sw ? 'rgba(200,240,255,0.55)' : 'rgba(230,235,245,0.4)';
      ctx.strokeStyle = tc2; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (const oy of [-4, 4]) { ctx.beginPath(); ctx.moveTo(-40, oy); ctx.lineTo(-10, oy * 0.5); ctx.stroke(); }
      ctx.translate(-8, 0); drawKunaiShape(!!a.sw, 1.15);
      ctx.restore(); continue;
    }
    // 불화살·얼음 화살·스킨 화살: 꼬리에 빛나는 자국
    const tc = a.el === 'green' ? 'rgba(60,240,120,' : a.el === 'fire' ? 'rgba(255,120,30,' : a.el === 'blue' ? 'rgba(60,140,255,' : a.el === 'dark' ? 'rgba(120,40,200,' : a.el === 'ice' ? 'rgba(150,220,255,' : a.el === 'sand' ? 'rgba(215,175,100,' : a.el === 'wind' ? 'rgba(210,250,240,' : null;
    const fc = a.el && !tc ? fxColor(a.el, 0.7, now) : null;
    if (tc || fc) {
      const tg = ctx.createLinearGradient(-60, 0, 10, 0);
      tg.addColorStop(0, tc ? tc + '0)' : 'rgba(0,0,0,0)'); tg.addColorStop(1, tc ? tc + '0.85)' : fc);
      ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(-22, 0, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (a.h) { ctx.strokeStyle = 'rgba(160,140,255,0.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(0, 0); ctx.stroke(); }
    if (a.de) { ctx.strokeStyle = 'rgba(150,60,230,0.45)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(4, 0); ctx.stroke(); }
    if (a.lf) { ctx.strokeStyle = 'rgba(110,230,90,0.45)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(4, 0); ctx.stroke(); }
    ctx.strokeStyle = a.de ? '#1c1028' : a.lf ? '#3f9a3a' : '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = a.de ? '#b46bff' : a.lf ? '#7be36f' : a.h ? '#b9a8ff' : '#d8dde6'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(4, -5); ctx.lineTo(4, 5); ctx.fill();
    ctx.fillStyle = a.de ? '#5b2a8c' : a.lf ? '#5cc84a' : a.h ? '#8f7bff' : '#e8e2d0'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-36, -5); ctx.lineTo(-24, 0); ctx.lineTo(-36, 5); ctx.fill();
    ctx.restore();
  }
  for (const w of state.wd || []) {
    const x = w.x + w.vx * age, y = w.y + (w.vy || 0) * age;
    // 아래는 좁고 위는 넓은 소용돌이 (가로 줄이 빙글빙글)
    for (let i = 0; i < 9; i++) {
      const t = i / 8, yy = y - t * 170, rx = 18 + t * 62, ph = now / 70 + i * 0.9;
      ctx.strokeStyle = w.r ? `rgba(${255},${Math.round(70 + 120 * t)},${30},${0.45 + 0.4 * (1 - t)})` : `rgba(210,250,240,${0.35 + 0.4 * (1 - t)})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(ph) * 8, yy, rx, 9 + t * 6, 0, ph % (Math.PI * 2), ph % (Math.PI * 2) + Math.PI * 1.4); ctx.stroke();
    }
  }
}
// 활 (몸 좌표계): 시위를 당기면 줄이 뒤로 가고 화살이 걸림
//  rubM: 고무(때릴 때 팔이 늘어남), otherM: 강화·거인·헐크 (활이 커지고 휘두르는 범위도 커짐)
function drawBow(p, f, time, rubM = 1, otherM = 1) {
  // 약공격: 활을 앞으로 휘둘러 때림
  const swing = p.at === 1 ? (p.ap === 1 ? -0.6 : p.ap === 2 ? 0.5 : 0.2) : 0;
  const ext = p.at === 1 && p.ap !== 1 && rubM > 1 ? 58 * otherM * (rubM - 1) + 30 : 0;   // 고무: 팔이 쭉
  const push = (p.at === 1 ? (p.ap === 1 ? -4 : p.ap === 2 ? 26 : 10) : 0) * otherM + ext;
  const hx = f * (PW / 2 + 8 + push), hy = -PH / 2 - 2;
  if (ext) { ctx.strokeStyle = p.c; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * PW / 2, hy); ctx.lineTo(hx, hy); ctx.stroke(); }
  const fxs = fxOf(p);
  // 불(화염·태양)·얼음이면 활이 빛남, 스킨 이펙트도 반영
  const blueHot = hotTint(p) === 'blue', darkHot = hotTint(p) === 'dark', greenHot = hotTint(p) === 'green';
  const fireBow = skinOn(p, 'firebow');   // 불화살 스킨: 활이 불로 (불 피해는 없음)
  const glow = fireBow ? 'rgba(255,110,20,0.95)' : greenHot ? 'rgba(60,240,120,0.95)' : darkHot ? 'rgba(130,40,210,0.95)' : blueHot ? 'rgba(60,140,255,0.95)' : (hasK(p, 'fire') || p.sun) ? 'rgba(255,120,30,0.95)' : hasK(p, 'ice') ? 'rgba(140,220,255,0.95)' : fxs ? fxColor(fxs, 0.95, time) : null;
  if (p.at === 1 && p.ap === 2) {
    ctx.fillStyle = fxs ? fxColor(fxs, 0.4, time) : 'rgba(255,240,210,0.4)';
    ctx.beginPath(); ctx.moveTo(hx - f * 20, hy); ctx.arc(hx - f * 20, hy, 62 * otherM, f > 0 ? -0.9 : Math.PI - 0.5, f > 0 ? 0.5 : Math.PI + 0.9); ctx.closePath(); ctx.fill();
  }
  const pull = p.dr || 0;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(f * otherM, otherM); ctx.rotate(swing);
  const elf = skinOn(p, 'darkelf');   // 다크 엘프: 검보라 활
  const leaf = skinOn(p, 'elf');      // 엘프: 덩굴 감긴 초록·갈색 활
  if (p.hm) { ctx.shadowColor = 'rgba(150,130,255,0.95)'; ctx.shadowBlur = 14; }
  else if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
  else if (elf) { ctx.shadowColor = 'rgba(170,80,255,0.9)'; ctx.shadowBlur = 12; }
  else if (leaf) { ctx.shadowColor = 'rgba(120,230,100,0.8)'; ctx.shadowBlur = 10; }
  ctx.strokeStyle = fireBow ? '#ff7a1a' : elf ? '#1c1028' : leaf ? '#6b4423' : '#8a5a2b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-14, 0, 30, -1.1, 1.1); ctx.stroke();
  if (fireBow) {
    // 활대를 따라 일렁이는 불꽃
    ctx.shadowBlur = 0;
    for (let t = -1.0; t <= 1.0; t += 0.25) {
      const bx = -14 + Math.cos(t) * 30, by = Math.sin(t) * 30, h3 = 7 + Math.sin(time / 60 + t * 9) * 3;
      ctx.fillStyle = (Math.round(t * 4) % 2) ? 'rgba(255,200,60,0.9)' : 'rgba(255,90,20,0.85)';
      ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.quadraticCurveTo(bx + 2, by - h3 * 0.5, bx - 1, by - h3); ctx.quadraticCurveTo(bx + 5, by - h3 * 0.4, bx + 3, by); ctx.fill();
    }
  }
  if (leaf) {
    // 활대에 감긴 덩굴과 잎
    ctx.shadowBlur = 0; ctx.strokeStyle = '#3f9a3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let t = -1.05; t <= 1.05; t += 0.07) { const r = 30 + Math.sin(t * 14) * 3; ctx.lineTo(-14 + Math.cos(t) * r, Math.sin(t) * r); } ctx.stroke();
    ctx.fillStyle = '#5cc84a';
    for (const t of [-0.9, -0.4, 0.15, 0.6, 1.0]) { const lx = -14 + Math.cos(t) * 33, ly = Math.sin(t) * 33; ctx.beginPath(); ctx.ellipse(lx, ly, 5, 2.6, t + 0.8, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.shadowBlur = 0;
  const tx = -14 + Math.cos(1.1) * 30, ty = Math.sin(1.1) * 30, sx = tx - pull * 26;
  if (elf) { ctx.strokeStyle = '#b46bff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-14, 0, 33, -1.0, 1.0); ctx.stroke(); }
  ctx.strokeStyle = elf ? '#c08aff' : leaf ? '#cfe8b0' : '#efe6d2'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(tx, -ty); ctx.lineTo(sx, 0); ctx.lineTo(tx, ty); ctx.stroke();
  if (pull > 0) {
    ctx.strokeStyle = elf ? '#1c1028' : leaf ? '#3f9a3a' : '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 44, 0); ctx.stroke();
    ctx.fillStyle = p.hm ? '#b9a8ff' : elf ? '#b46bff' : leaf ? '#7be36f' : '#d8dde6'; ctx.beginPath(); ctx.moveTo(sx + 50, 0); ctx.lineTo(sx + 40, -5); ctx.lineTo(sx + 40, 5); ctx.fill();
    if (pull >= 1) { ctx.strokeStyle = 'rgba(255,230,120,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + 46, 0, 9 + Math.sin(time / 60) * 2, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
  ctx.fillStyle = p.c; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(hx + f * otherM * (-14 + Math.cos(1.1) * 30 - pull * 26) * (pull > 0 ? 1 : 0), hy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
function drawGlitch(hack) {
  // 화면 위에 어긋난 색 띠와 노이즈 (해커 스킨이면 빨강 위주)
  for (let i = 0; i < 6; i++) {
    const y = Math.random() * H, h = 4 + Math.random() * 30;
    ctx.fillStyle = hack ? ['rgba(255,20,40,0.3)', 'rgba(255,90,110,0.25)', 'rgba(255,255,255,0.12)'][i % 3] : ['rgba(57,255,136,0.25)', 'rgba(255,40,120,0.22)', 'rgba(40,160,255,0.22)'][i % 3];
    ctx.fillRect((Math.random() - 0.5) * 60, y, W, h);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 40, 2);
  ctx.font = '700 20px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = hack ? 'rgba(255,30,50,0.95)' : 'rgba(57,255,136,0.85)';
  if (Math.random() < 0.5) ctx.fillText(hack ? 'YOU HAVE BEEN HACKED' : 'ERR0R: INPUT_STREAM CORRUPTED', W / 2 + (Math.random() - 0.5) * 20, 160);
}
// 터렛 + 총알
// 색 밝게(+)/어둡게(-): '#rrggbb'
function shadeHex(hex, k) {
  const n = parseInt(String(hex).slice(1, 7), 16);
  if (!Number.isFinite(n)) return hex;
  const f = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`;
}
function drawTurrets(state, now) {
  for (const m of state.mn || []) {
    ctx.globalAlpha = m.a ? 1 : 0.5;
    if (m.sk === 'g') {
      // 은행: 노란 은행 열매 두세 알 + 주인 색 꼭지
      for (const [dx, dy, r] of [[-7, -5, 6], [5, -6, 6.5], [0, -11, 5.5]]) {
        const gg = ctx.createRadialGradient(m.x + dx - 2, m.y + dy - 2, 1, m.x + dx, m.y + dy, r);
        gg.addColorStop(0, '#fff3a0'); gg.addColorStop(1, '#d8a820');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(m.x + dx, m.y + dy, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = m.c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(m.x, m.y - 6, 15, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(170,190,80,0.35)'; ctx.beginPath(); ctx.arc(m.x + Math.sin(now / 300) * 4, m.y - 20 - (now / 40) % 10, 4, 0, Math.PI * 2); ctx.fill();   // 냄새
      ctx.globalAlpha = 1; continue;
    }
    if (m.sk === 'n') {
      // 바나나 껍질: 노란 껍질이 세 갈래로 벌어짐 + 주인 색 꼭지
      ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = '#b8901a'; ctx.lineWidth = 1.2;
      for (const a of [-0.9, 0, 0.9]) { ctx.save(); ctx.translate(m.x, m.y - 4); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -7, 4.5, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = '#7a5a20'; for (const a of [-0.9, 0, 0.9]) { ctx.beginPath(); ctx.arc(m.x + Math.sin(a) * 15, m.y - 4 - Math.cos(a) * 15, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = m.c; ctx.fillRect(m.x - 3, m.y - 6, 6, 5);
      ctx.globalAlpha = 1; continue;
    }
    if (m.sk === 'b') {
      // 장난감 블록: 위에 동그란 돌기가 있는 블록 (주인 색)
      ctx.fillStyle = m.c; ctx.fillRect(m.x - 13, m.y - 10, 26, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(m.x - 13, m.y - 3, 26, 3);
      for (const dx of [-7, 0, 7]) { ctx.fillStyle = m.c; ctx.fillRect(m.x + dx - 3, m.y - 14, 6, 4); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(m.x + dx - 3, m.y - 14, 6, 1.5); }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(m.x - 13, m.y - 10, 26, 10);
      ctx.globalAlpha = 1; continue;
    }
    // 지뢰: 주인 색 고리 + 깜빡이는 불빛 (설치 직후엔 흐림)
    ctx.fillStyle = '#4a4d3a'; ctx.beginPath(); ctx.ellipse(m.x, m.y - 4, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6a6e52'; ctx.beginPath(); ctx.ellipse(m.x, m.y - 7, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = m.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(m.x, m.y - 4, 17, 7, 0, 0, Math.PI * 2); ctx.stroke();
    const on = Math.floor(now / 350) % 2 === 0;
    ctx.fillStyle = on ? m.c : 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(m.x, m.y - 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const t of state.tr || []) {
    const x = t.x, y = t.y;
    ctx.save(); ctx.translate(x, y); ctx.scale(1.3, 1.3); ctx.translate(-x, -y);   // 터렛은 1.3배 크기 (맞는 판정도 같이 커짐)
    if (t.fg === 3) {
      // 호박(할로윈): 골이 진 주황 호박 + 초록 꼭지 + 조준하는 쪽을 보는 잭오랜턴 얼굴 (안에서 촛불이 일렁임)
      const fx3 = Math.cos(t.a), fl = 0.75 + Math.sin(now / 90 + t.i) * 0.15 + Math.random() * 0.1;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = t.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 24, 6, 0, 0, Math.PI * 2); ctx.stroke();
      const cy = y - 20;
      for (const [dx, w, col] of [[-12, 12, '#e8701a'], [12, 12, '#e8701a'], [-6, 13, '#f7871f'], [6, 13, '#f7871f'], [0, 12, '#ff9a2e']]) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x + dx, cy, w, 19, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(150,60,10,0.55)'; ctx.lineWidth = 1.5;
      for (const dx of [-14, -5, 5, 14]) { ctx.beginPath(); ctx.ellipse(x + dx * 0.6, cy, Math.abs(dx) * 0.9 + 3, 18, 0, -Math.PI / 2, Math.PI / 2, dx < 0); ctx.stroke(); }
      ctx.fillStyle = '#3d7a26'; ctx.beginPath(); ctx.moveTo(x - 3, cy - 17); ctx.quadraticCurveTo(x + 2, cy - 30, x + 9, cy - 28); ctx.lineTo(x + 4, cy - 17); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4caf3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, cy - 22); ctx.quadraticCurveTo(x + 16, cy - 26, x + 12, cy - 16); ctx.stroke();
      // 얼굴 (안쪽이 노랗게 빛남)
      const ox = fx3 * 6;
      ctx.fillStyle = `rgba(255,${Math.round(200 + 40 * fl)},80,${0.9 * fl + 0.1})`; ctx.shadowColor = 'rgba(255,200,60,0.9)'; ctx.shadowBlur = 10 * fl;
      for (const ex of [-7, 7]) { ctx.beginPath(); ctx.moveTo(x + ox + ex - 4, cy - 2); ctx.lineTo(x + ox + ex, cy - 9); ctx.lineTo(x + ox + ex + 4, cy - 2); ctx.closePath(); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(x + ox - 10, cy + 4);
      for (let k = 0; k <= 6; k++) ctx.lineTo(x + ox - 10 + k * (20 / 6), cy + 4 + (k % 2 ? 4 : 0) + (k === 0 || k === 6 ? 0 : 2));
      ctx.lineTo(x + ox + 8, cy + 11); ctx.lineTo(x + ox - 8, cy + 11); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < t.hp ? '#6fe39a' : 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 13 + i * 9, y - 56, 7, 4); }
      ctx.restore(); continue;
    }
    if (t.fg === 2) {
      // 라마: 하얀 털 + 긴 목 + 등에 주인 색 안장
      const fx3 = Math.cos(t.a) >= 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (const lx of [-15, -7, 7, 15]) { ctx.beginPath(); ctx.moveTo(x + lx, y - 14); ctx.lineTo(x + lx, y); ctx.stroke(); }
      ctx.fillStyle = '#f6f2e8'; ctx.beginPath(); ctx.ellipse(x, y - 20, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c8c0ae'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = t.c; roundRect(x - 11, y - 33, 22, 10, 4); ctx.fill();   // 안장
      ctx.fillStyle = shadeHex(t.c, -0.3); ctx.fillRect(x - 11, y - 25, 22, 2);
      ctx.fillStyle = '#f6f2e8'; ctx.beginPath(); ctx.moveTo(x + fx3 * 12, y - 26); ctx.lineTo(x + fx3 * 20, y - 50); ctx.lineTo(x + fx3 * 28, y - 48); ctx.lineTo(x + fx3 * 22, y - 22); ctx.closePath(); ctx.fill();   // 목
      ctx.beginPath(); ctx.ellipse(x + fx3 * 26, y - 52, 9, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c8c0ae'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + fx3 * 33, y - 50, 5, 4, 0, 0, Math.PI * 2); ctx.fill();   // 주둥이
      ctx.fillStyle = '#f6f2e8'; for (const ex of [-3, 3]) { ctx.beginPath(); ctx.ellipse(x + fx3 * 22 + ex, y - 62, 2.5, 6, ex * 0.08, 0, Math.PI * 2); ctx.fill(); }   // 귀
      ctx.fillStyle = '#1a1420'; ctx.beginPath(); ctx.arc(x + fx3 * 28, y - 54, 2, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < t.hp ? '#6fe39a' : 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 13 + i * 9, y - 74, 7, 4); }
      ctx.restore(); continue;
    }
    if (t.fg) {
      // 개구리: 쪼그려 앉은 몸 + 툭 튀어나온 눈 + 보는 방향의 입. 몸 색 = 주인(플레이어) 색
      const fx3 = Math.cos(t.a) >= 0 ? 1 : -1;
      const body = t.c, belly = shadeHex(t.c, 0.45), leg = shadeHex(t.c, -0.3), edge = shadeHex(t.c, -0.55);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = leg; for (const sx3 of [-20, 20]) { ctx.beginPath(); ctx.ellipse(x + sx3, y - 3, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y - 18, 26, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(x + fx3 * 4, y - 12, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
      for (const ex of [-11, 11]) {
        ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x + ex, y - 34, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + ex, y - 35, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + ex + fx3 * 2, y - 35, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + fx3 * 6, y - 22, 10, 0.2, Math.PI - 0.2); ctx.stroke();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < t.hp ? '#6fe39a' : 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 13 + i * 9, y - 52, 7, 4); }
      ctx.restore(); continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
    // 다리
    ctx.strokeStyle = '#4b5361'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 6, y - 18); ctx.moveTo(x + 16, y); ctx.lineTo(x + 6, y - 18); ctx.stroke();
    // 몸통 (주인 색 테두리 + 띠 + 깃발로 누구 건지 구별)
    ctx.fillStyle = '#8994a6'; ctx.beginPath(); ctx.arc(x, y - 30, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = t.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 30, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = t.c; ctx.fillRect(x - 17, y - 32, 34, 5);
    ctx.strokeStyle = '#3c4350'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 12, y - 44); ctx.lineTo(x - 12, y - 62); ctx.stroke();
    ctx.fillStyle = t.c; ctx.beginPath(); ctx.moveTo(x - 12, y - 62); ctx.lineTo(x + 2, y - 57); ctx.lineTo(x - 12, y - 52); ctx.fill();
    // 포신
    ctx.save(); ctx.translate(x, y - 30); ctx.rotate(t.a);
    ctx.fillStyle = '#3c4350'; ctx.fillRect(4, -5, 26, 10); ctx.fillStyle = '#ffb02e'; ctx.fillRect(28, -3, 4, 6);
    ctx.restore();
    ctx.fillStyle = '#c8d0dc'; ctx.beginPath(); ctx.arc(x, y - 30, 7, 0, Math.PI * 2); ctx.fill();
    // 체력
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < t.hp ? '#6fe39a' : 'rgba(255,255,255,0.2)'; ctx.fillRect(x - 13 + i * 9, y - 56, 7, 4); }
    ctx.restore();
  }
  const age = Math.max(-0.07, (now - state.time - INTERP_DELAY) / 1000);
  for (const b of state.bl || []) {
    if (b.tg) {
      // 개구리 혀
      ctx.strokeStyle = '#ff6f8f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.ox, b.oy); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = '#ff4f78'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const x = b.x + b.vx * age, y = b.y + b.vy * age;
    if (b.pk) {
      // 호박 총알: 주황 도깨비불 + 흔들리는 불꼬리
      const ang = Math.atan2(b.vy, b.vx);
      const tg = ctx.createLinearGradient(x - Math.cos(ang) * 26, y - Math.sin(ang) * 26, x, y);
      tg.addColorStop(0, 'rgba(255,110,0,0)'); tg.addColorStop(1, 'rgba(255,150,30,0.85)');
      ctx.strokeStyle = tg; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 26, y - Math.sin(ang) * 26 + Math.sin(now / 40) * 2); ctx.lineTo(x, y); ctx.stroke();
      const g4 = ctx.createRadialGradient(x, y, 1, x, y, 9); g4.addColorStop(0, '#fff3c0'); g4.addColorStop(0.5, '#ff9a1e'); g4.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = g4; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.sp) {
      // 라마 침: 하얀 침방울 + 작은 방울 꼬리
      ctx.fillStyle = 'rgba(235,245,240,0.9)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 4.5, Math.atan2(b.vy, b.vx), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(210,235,225,0.6)'; for (const k of [1, 2]) { ctx.beginPath(); ctx.arc(x - b.vx * 0.012 * k, y - b.vy * 0.012 * k, 3 - k * 0.8, 0, Math.PI * 2); ctx.fill(); }
      continue;
    }
    ctx.strokeStyle = 'rgba(255,200,80,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * 0.025, y - b.vy * 0.025); ctx.stroke();
    ctx.fillStyle = b.c || '#fff2b0'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}
// 눈보라: 화면 가득 눈이 옆으로 날림
let snow = [];
function drawBlizzard(state, dt, now) {
  const on = state.bz > 0;
  if (on && state.bzd) {
    // 어둠: 화면 가장자리부터 검게 잠기고, 검은 연기가 흘러다님
    const W2 = STAGE.width, H2 = STAGE.height;
    const vg = ctx.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.15, W2 / 2, H2 / 2, W2 * 0.75);
    vg.addColorStop(0, 'rgba(10,5,20,0.25)'); vg.addColorStop(1, 'rgba(5,2,12,0.85)');
    ctx.fillStyle = vg; ctx.fillRect(-400, -400, W2 + 800, H2 + 800);
    for (let i = 0; i < 9; i++) {
      const x = ((i * 397 + now / 9) % (W2 + 400)) - 200, y = (i * 173) % H2, r = 90 + (i % 3) * 40;
      const sg = ctx.createRadialGradient(x, y, 0, x, y, r); sg.addColorStop(0, 'rgba(30,15,50,0.55)'); sg.addColorStop(1, 'rgba(30,15,50,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (on && state.bza && !state.bzs) {
    // 오로라: 밤하늘처럼 어두워지고, 진한 초록·청록·보라 빛의 커튼이 세로 빛줄기와 함께 일렁임
    const W2 = STAGE.width, H2 = STAGE.height;
    ctx.fillStyle = 'rgba(5,15,35,0.22)'; ctx.fillRect(-400, -400, W2 + 800, H2 + 800);
    const cols = [[42, 245, 152], [58, 224, 208], [90, 255, 170], [166, 107, 255], [70, 200, 255]];
    for (let band = 0; band < 5; band++) {
      const [r, g, bl] = cols[band], top = 10 + band * 45, depth = 260 + band * 30;
      const grad = ctx.createLinearGradient(0, top, 0, top + depth);
      grad.addColorStop(0, `rgba(${r},${g},${bl},0)`); grad.addColorStop(0.25, `rgba(${r},${g},${bl},0.26)`); grad.addColorStop(0.6, `rgba(${r},${g},${bl},0.1)`); grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, top);
      for (let x = 0; x <= W2; x += 30) ctx.lineTo(x, top + Math.sin(x / 130 + now / 500 + band * 1.7) * 45);
      for (let x = W2; x >= 0; x -= 30) ctx.lineTo(x, top + depth + Math.sin(x / 110 + now / 450 + band * 2.3) * 40);
      ctx.closePath(); ctx.fill();
    }
    // 세로로 내리꽂는 빛줄기
    for (let i = 0; i < 26; i++) {
      const x = ((i * 113 + now / 25) % (W2 + 100)) - 50, h = 180 + ((i * 53) % 140), a2 = 0.07 + 0.06 * Math.sin(now / 200 + i);
      const rg = ctx.createLinearGradient(0, 20, 0, 20 + h);
      rg.addColorStop(0, `rgba(200,255,230,0)`); rg.addColorStop(0.4, `rgba(150,255,210,${a2})`); rg.addColorStop(1, 'rgba(150,255,210,0)');
      ctx.fillStyle = rg; ctx.fillRect(x, 20 + Math.sin(i) * 30, 6 + (i % 3) * 3, h);
    }
    // 반짝이는 별가루
    ctx.fillStyle = 'rgba(230,255,245,0.6)';
    for (let i = 0; i < 40; i++) { const x = (i * 211) % W2, y = (i * 97) % (H2 * 0.6); if ((Math.floor(now / 180) + i) % 4 === 0) ctx.fillRect(x, y, 2.5, 2.5); }
    return;
  }
  const sand = !!state.bzs;   // 모래 스킨이면 모래바람
  if (on && snow.length < 160) for (let i = 0; i < 8; i++) {
    // 눈은 위에서 내리고, 모래바람은 화면 왼쪽 전체 높이에서 옆으로 불어 옴
    if (sand) snow.push({ x: -40 - Math.random() * 200, y: Math.random() * STAGE.height, vx: 520 + Math.random() * 300, vy: 20 + Math.random() * 40, r: 2 + Math.random() * 3, sand: 1 });
    else snow.push({ x: Math.random() * (STAGE.width + 400) - 300, y: -20 - Math.random() * 100, vx: 260 + Math.random() * 200, vy: 160 + Math.random() * 140, r: 2 + Math.random() * 3 });
  }
  if (!snow.length) return;
  if (on) { ctx.fillStyle = sand ? 'rgba(210,170,100,0.22)' : 'rgba(200,230,255,0.12)'; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); }
  ctx.fillStyle = sand ? 'rgba(200,155,80,0.85)' : 'rgba(245,250,255,0.9)';
  for (const f of snow) {
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (sand) ctx.fillRect(f.x, f.y, f.r * 2.2, f.r * 0.8);
    else { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
  }
  snow = snow.filter((f) => f.y < STAGE.height + 40 && f.x < STAGE.width + 60 && (on || Math.random() > 0.002) && (!!f.sand === sand || !on));
}
// 검사 참격: 초승달 모양으로 날아감
function drawSlashes(state, now) {
  const age = (now - state.time - INTERP_DELAY) / 1000;
  for (const s of state.pj || []) {
    const k = Math.max(-0.07, age), x = s.x + s.vx * k, y = s.y + (s.vy || 0) * k, f = s.vx >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y);
    ctx.scale(f, 1);
    const g = ctx.createLinearGradient(-60, 0, 30, 0);
    if (s.pp) { g.addColorStop(0, 'rgba(90,45,20,0)'); g.addColorStop(1, 'rgba(90,45,20,0.95)'); }
    else if (s.lc) { g.addColorStop(0, hexA(s.lc, 0)); g.addColorStop(1, hexA(s.lc, 0.95)); ctx.shadowColor = s.lc; }
    else if (s.ho) { g.addColorStop(0, 'rgba(255,240,170,0)'); g.addColorStop(1, 'rgba(255,248,210,0.98)'); }
    else if (s.d) { g.addColorStop(0, 'rgba(40,10,60,0)'); g.addColorStop(1, 'rgba(30,8,45,0.95)'); }
    else { g.addColorStop(0, 'rgba(200,225,255,0)'); g.addColorStop(1, 'rgba(240,248,255,0.95)'); }
    ctx.fillStyle = g;
    if (s.d) { ctx.shadowColor = 'rgba(170,80,255,0.95)'; ctx.shadowBlur = 18; }
    if (s.ho) { ctx.shadowColor = 'rgba(255,220,90,1)'; ctx.shadowBlur = 22; }
    if (s.lc) ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.moveTo(-10, -46); ctx.quadraticCurveTo(46, 0, -10, 46); ctx.quadraticCurveTo(18, 0, -10, -46); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = s.pp ? '#d8a35e' : s.lc ? '#ffffff' : s.ho ? 'rgba(255,215,80,0.95)' : s.d ? 'rgba(190,110,255,0.95)' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-10, -46); ctx.quadraticCurveTo(46, 0, -10, 46); ctx.stroke();
    ctx.restore();
  }
}
let quakeT = 0;   // 지진: 남은 흔들림 시간 (시전자는 0)

// ---------------- 대기실 패널 (준비 · 시작 · 색 · 스킬) ----------------
const PALETTE = MAPS.COLORS;
let panelKey = '';
let myReady = false;
(function buildPanel() {
  const sw = $('swatches');
  for (const c of PALETTE) {
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.dataset.hex = c.hex;
    b.style.background = c.hex; b.title = c.name; b.setAttribute('aria-label', c.name);
    b.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'color', color: c.hex }); });
    sw.append(b);
  }
  $('readyBtn').addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (isHost) send({ t: 'start' });
    else { myReady = !myReady; send({ t: 'ready', on: myReady }); }
  });
  // 모드: 팀 · 더블을 각각 눌러서 켜고 끔
  $('modeTgls').querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
    e.currentTarget.blur();
    if (!latest || !latest.md) return;
    const md = [latest.md[0] || 0, latest.md[1] || 0, latest.md[2] || 0], f = +b.dataset.f;
    md[f] = md[f] ? 0 : 1;
    send({ t: 'mode', team: !!md[0], dbl: !!md[1], item: !!md[2] });
  }));
  $('rpFold').addEventListener('click', (e) => {
    const folded = $('roomPanel').classList.toggle('folded');
    e.currentTarget.textContent = folded ? '펼치기' : '접기';
    e.currentTarget.setAttribute('aria-expanded', String(!folded));
  });
})();
function renderSkillChips(current, boxId = 'skillChips', msg = 'skill', other = null, isRandom = false) {
  const box = $(boxId);
  const owned = account.profile ? account.profile.owned : BASE_SKILLS;
  box.textContent = '';
  // 랜덤: 가진 스킬 중에서 매 판 새로 뽑음
  const rb = document.createElement('button');
  rb.className = 'chip' + (isRandom ? ' on' : ''); rb.type = 'button'; rb.textContent = '🎲 랜덤';
  rb.title = isRandom ? `매 판 가진 스킬 중에서 랜덤 (이번 판: ${SKILLS[validSkill(current)].name})` : '매 판 시작할 때 가진 스킬 중에서 랜덤으로 정해요';
  rb.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: msg, skill: 'random' }); });
  box.append(rb);
  for (const k of SKILL_IDS) {
    if (!owned.includes(k)) continue;
    const b = document.createElement('button');
    b.className = 'chip' + (k === current ? ' on' : ''); b.type = 'button';
    if (isRandom && k === current) b.style.borderStyle = 'dashed';   // 랜덤으로 이번 판에 뽑힌 스킬
    const dot = document.createElement('i'); dot.style.background = SKILL_COLOR[k];
    b.append(dot, SKILLS[k].name);
    b.title = `${SKILLS[k].desc}. ${SKILLS[k].cd}` + (k === other ? ' (다른 칸에서 쓰는 중 · 누르면 서로 바뀜)' : '');
    if (k === other) b.style.opacity = '.5';
    // 더블 모드: 검사와 궁수는 같이 못 씀
    if (other && conflictsK(k, other)) { b.disabled = true; b.style.opacity = '.35'; b.title = '같이 쓸 수 없는 조합이에요 (검사·궁수·닌자·방패·촉수끼리, 촉수와 비행)'; }
    b.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: msg, skill: k }); });
    box.append(b);
  }
}
// ---------------- 맵 투표 ----------------
// 맵 미리보기 (작은 그림): 하늘 · 땅 · 발판 · 빗면 · 트램펄린
function drawMapThumb(cv, map) {
  const c2 = cv.getContext('2d'), w = cv.width, h = cv.height, th = map.theme || {};
  const sx = w / map.width, sy = h / map.height;
  const g = c2.createLinearGradient(0, 0, 0, h); const sky = th.sky || ['#222', '#444', '#666'];
  g.addColorStop(0, sky[0]); g.addColorStop(0.6, sky[1]); g.addColorStop(1, sky[2]);
  c2.fillStyle = g; c2.fillRect(0, 0, w, h);
  if (th.water) { c2.fillStyle = th.water; c2.fillRect(0, h * 0.88, w, h * 0.12); }
  for (const s of map.solids) { c2.fillStyle = th.dirt || '#6a4a2a'; c2.fillRect(s.x * sx, s.y * sy, s.w * sx, s.h * sy); c2.fillStyle = th.grass || '#5c5'; c2.fillRect(s.x * sx, s.y * sy - 1, s.w * sx, 3); }
  for (const t of map.trunks || []) { c2.fillStyle = '#4a2f14'; c2.fillRect(t.x * sx, t.y * sy, t.w * sx, t.h * sy); }
  for (const sl of map.slopes || []) {
    c2.fillStyle = th.dirt || '#6a4a2a'; c2.beginPath(); c2.moveTo(sl.x1 * sx, sl.y1 * sy); c2.lineTo(sl.x2 * sx, sl.y2 * sy); c2.lineTo(sl.x2 * sx, h); c2.lineTo(sl.x1 * sx, h); c2.closePath(); c2.fill();
    c2.strokeStyle = th.grass || '#5c5'; c2.lineWidth = 2; c2.beginPath(); c2.moveTo(sl.x1 * sx, sl.y1 * sy); c2.lineTo(sl.x2 * sx, sl.y2 * sy); c2.stroke();
  }
  for (const p of map.platforms) { c2.fillStyle = th.plat || '#fd3'; c2.fillRect(p.x * sx, p.y * sy - 1, p.w * sx, 3); }
  for (const t of map.tramps || []) { c2.fillStyle = '#ff3b4a'; c2.fillRect(t.x * sx, t.y * sy - 2, t.w * sx, 3); }
  for (const c of map.crumble || []) { c2.fillStyle = '#c8956a'; c2.fillRect(c.x * sx, c.y * sy - 1, c.w * sx, 3); }
  for (const m of map.movers || []) { c2.fillStyle = '#6fd3ff'; c2.fillRect(m.x * sx, m.y * sy - 1, m.w * sx, 3); c2.fillRect((m.x2 !== undefined ? m.x2 : m.x) * sx, (m.y2 !== undefined ? m.y2 : m.y) * sy - 1, m.w * sx, 3); }
  for (const g of map.gusts || []) { c2.fillStyle = 'rgba(200,240,255,0.25)'; c2.fillRect(g.x * sx, g.y * sy, g.w * sx, g.h * sy); }
}
let voteKey = '';
const SIZE_KO = { S: '소', M: '중', L: '대' };   // 맵 크기 등급
const VOTE_LBL = '다음 맵 투표 <small>(눌러서 투표 · 시작할 때 가장 많은 표)</small>';
const PICK_LBL = '맵 고르기 <small>(사람이 나 혼자일 때는 방장이 직접 골라요 · 누르면 바로 바뀜)</small>';
// 혼자(봇·더미 제외)인 방장: 모든 맵 중에서 직접 고름
function renderPick(m) {
  const row = $('voteRow'), box = $('voteCards');
  row.hidden = false;
  if (voteKey !== 'pick') {
    voteKey = 'pick'; box.textContent = ''; box.classList.add('pick'); $('voteLbl').innerHTML = PICK_LBL;
    box.setAttribute('aria-label', '맵 고르기');
    // 맨 앞: 랜덤 (시작할 때마다 무작위 맵)
    {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vote-card'; b.dataset.id = 'random';
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 72;
      const c2 = cv.getContext('2d'), g = c2.createLinearGradient(0, 0, 128, 72); g.addColorStop(0, '#3a2a6a'); g.addColorStop(1, '#ff7ac8');
      c2.fillStyle = g; c2.fillRect(0, 0, 128, 72); c2.font = '40px sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('🎲', 64, 38);
      const nm = document.createElement('b'); nm.textContent = '랜덤';
      const sm = document.createElement('small');
      b.append(cv, nm, sm);
      b.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'pickmap', map: 'random' }); });
      box.append(b);
    }
    for (const map of [...MAPS].sort((a, b) => 'SML'.indexOf(a.size) - 'SML'.indexOf(b.size))) {
      if (!box.querySelector('.size-h.s-' + map.size)) { const hd = document.createElement('div'); hd.className = 'size-h s-' + map.size; hd.textContent = `${SIZE_KO[map.size]} 맵`; box.append(hd); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vote-card'; b.dataset.id = map.id;
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 72; drawMapThumb(cv, map);
      const nm = document.createElement('b'); nm.textContent = map.name;
      const sm = document.createElement('small');
      b.append(cv, nm, sm);
      b.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'pickmap', map: map.id }); });
      box.append(b);
    }
  }
  box.querySelectorAll('.vote-card').forEach((b) => {
    const on = b.dataset.id === m.pk;
    b.classList.toggle('mine', on); b.setAttribute('aria-pressed', String(on));
    b.querySelector('small').textContent = on ? (b.dataset.id === 'random' ? '선택됨 · 판마다 무작위' : '선택됨') : '';
  });
}
function renderVote(m) {
  if (m.pk && m.host === myId) return renderPick(m);
  const mv = m.mv, row = $('voteRow');
  row.hidden = !mv;
  if (voteKey === 'pick') { voteKey = ''; $('voteCards').classList.remove('pick'); $('voteLbl').innerHTML = VOTE_LBL; $('voteCards').setAttribute('aria-label', '다음 맵 투표'); }
  if (!mv) return;
  const [cands, votes] = mv, mine = votes[myId];
  const cnt = cands.map((c, i) => Object.values(votes).filter((v) => v === i).length);
  const box = $('voteCards');
  const k = cands.join();
  if (k !== voteKey) {
    voteKey = k; box.textContent = '';
    cands.forEach((id, i) => {
      const map = MAPS.find((x) => x.id === id); if (!map) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vote-card'; b.dataset.i = i;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90; drawMapThumb(cv, map);
      const nm = document.createElement('b'); nm.textContent = map.name;
      const sz = document.createElement('i'); sz.className = 'map-size s-' + map.size; sz.textContent = SIZE_KO[map.size] || ''; nm.prepend(sz);
      const sm = document.createElement('small');
      b.append(cv, nm, sm);
      b.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'vote', map: id }); });
      box.append(b);
    });
  }
  box.querySelectorAll('.vote-card').forEach((b) => {
    const i = Number(b.dataset.i);
    b.classList.toggle('mine', mine === i);
    b.setAttribute('aria-pressed', String(mine === i));
    b.querySelector('small').textContent = `${cnt[i]}표${mine === i ? ' · 내 투표' : ''}`;
  });
}
// 대기실 창은 항상 위 버튼줄 바로 아래부터 (버튼줄 높이가 바뀌어도 안 겹치게), 화면을 넘으면 창 안에서 스크롤
function layoutRoomPanel() {
  const bar = $('bar'), rp = $('roomPanel');
  if (bar.hidden || rp.hidden) return;
  const top = Math.round(bar.getBoundingClientRect().bottom + 8);
  if (rp.dataset.top !== String(top)) { rp.dataset.top = String(top); rp.style.top = top + 'px'; rp.style.maxHeight = `calc(100% - ${top + 12}px)`; rp.style.overflowY = 'auto'; }
}
addEventListener('resize', layoutRoomPanel);
function updateRoomPanel(m) {
  const show = inGame && m.ph === 'waiting';
  $('roomPanel').hidden = !show;
  if (show) layoutRoomPanel();
  if (!show) { myReady = false; return; }
  const me = m.p.find((p) => p.id === myId);
  if (!me) return;
  if (me.sk !== account.skill) selectSkill(me.sk, true);
  myReady = !!me.rd;
  const taken = new Set(m.p.filter((p) => p.id !== myId).map((p) => p.c));
  const [ready, need] = m.rdy || [0, 0];
  const host = m.host === myId;
  const md = m.md || [0, 0];
  const prof = account.profile;
  const key = [me.c, me.sk, me.sk2, me.rd, host, JSON.stringify(me.rs || 0), ready, need, m.p.length, [...taken].join(), (prof && prof.owned.join()) || '',
    prof ? (prof.skins || []).join() + JSON.stringify(prof.skinSel || {}) : '', m.p.filter((p) => p.b).map((p) => p.id + p.sk + (p.sk2 || '') + JSON.stringify(p.rs || 0) + (p.bd ?? '')).join(),
    md.join(), m.p.map((p) => p.id + ':' + p.tm + ':' + p.n).join(), JSON.stringify(m.mv || 0), m.pk || '', m.host || ''].join('|');
  if (key === panelKey) return;
  panelKey = key;
  document.querySelectorAll('.sw').forEach((b) => {
    b.classList.toggle('on', b.dataset.hex === me.c);
    b.disabled = taken.has(b.dataset.hex);
    const name = PALETTE.find((c) => c.hex === b.dataset.hex).name;
    b.title = b.disabled ? `${name} (다른 사람이 사용 중)` : name;
  });
  renderSkillChips(me.sk, 'skillChips', 'skill', md[1] ? me.sk2 : null, !!(me.rs && me.rs[0]));
  renderVote(m);
  // 모드 (방장만 바꿀 수 있음)
  $('modeTgls').querySelectorAll('button').forEach((b) => { const on = !!md[+b.dataset.f]; b.classList.toggle('on', on); b.disabled = !host; b.setAttribute('aria-pressed', String(on)); });
  $('modeNote').textContent = host ? '' : '방장이 정해요';
  // 팀 나누기 (팀 모드)
  $('teamRow').hidden = !md[0];
  const tl = $('teamList'); tl.textContent = '';
  if (md[0]) {
    for (const p of m.p) {
      const pill = document.createElement('div'); pill.className = 'tp';
      const nm = document.createElement('span'); nm.textContent = (p.dm ? '🎯 ' : p.b ? '🤖 ' : '') + p.n; nm.style.color = p.id === myId ? '#ffcf3f' : '';
      pill.append(nm);
      for (let t = 1; t <= 4; t++) {
        const d = document.createElement('button'); d.type = 'button';
        d.className = 'tdot' + (p.tm === t ? ' on' : ''); d.style.background = TEAMS[t].color;
        d.title = `${p.n} → ${TEAMS[t].name}`; d.setAttribute('aria-label', d.title); d.disabled = !host;
        d.addEventListener('click', (e) => { e.currentTarget.blur(); send({ t: 'team', id: p.id, team: t }); });
        pill.append(d);
      }
      tl.append(pill);
    }
  }
  // 두 번째 스킬 (더블 모드)
  $('chip2Row').hidden = !md[1];
  if (md[1]) renderSkillChips(me.sk2, 'skillChips2', 'skill2', me.sk, !!(me.rs && me.rs[1]));
  const sl = slotsOf(me);
  $('keysNote').hidden = !md[1];
  let kn = !md[1] ? '' : sl.x ? `자석 당기기 Q · 밀기 E · ${SKILLS[validSkill(sl.x)].name} R` : `${SKILLS[validSkill(me.sk)].name} Q · ${me.sk2 ? SKILLS[validSkill(me.sk2)].name : '?'} E`;
  $('keysNote').textContent = kn;
  // 스킨 (내 스킬의 가진 스킨 중에서 바로 바꾸기)
  const mySkills = [me.sk, md[1] ? me.sk2 : null].filter(Boolean);
  const skinBox = $('skinChips'); skinBox.textContent = '';
  let anySkin = false;
  for (const k of mySkills) {
    const owned = Object.entries(SKIN_INFO.SKINS).filter(([id, sk]) => sk.skill === k && prof && (prof.skins || []).includes(id));
    if (!owned.length) continue;
    anySkin = true;
    const cur = (prof.skinSel || {})[k] || null;
    for (const [id, nm] of [[null, `${SKILLS[k].name} 기본`], ...owned.map(([id, sk]) => [id, sk.name])]) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (cur === id ? ' on' : '');
      const dot = document.createElement('i'); dot.style.background = id ? SKIN_INFO.SKINS[id].color : SKILL_COLOR[k];
      b.append(dot, nm);
      b.addEventListener('click', async (e) => {
        e.currentTarget.blur();
        try { const r = await api('/api/skin/equip', { skill: k, skin: id }); account.profile = r.profile; renderAccount(); panelKey = ''; } catch (err) { banners.push({ text: err.message, life: 1.5, max: 1.5, small: true }); }
      });
      skinBox.append(b);
    }
  }
  $('skinRow').hidden = !anySkin;
  // 추방 (방장만): 다른 사람을 방에서 내보냄. 다시 들어올 수는 있음
  const others = m.p.filter((p) => !p.b && p.id !== myId);
  $('kickRow').hidden = !host || !others.length;
  const kl = $('kickList'); kl.textContent = '';
  if (host) for (const o of others) {
    const pill = document.createElement('div'); pill.className = 'bp';
    const nm = document.createElement('span'); nm.textContent = o.n; nm.style.color = o.c;
    const kb = document.createElement('button'); kb.type = 'button'; kb.className = 'kick'; kb.textContent = '추방';
    kb.addEventListener('click', (e) => { e.currentTarget.blur(); if (confirm(`${o.n}님을 방에서 내보낼까요? (다시 들어올 수는 있어요)`)) send({ t: 'kick', id: o.id }); });
    pill.append(nm, kb); kl.append(pill);
  }
  // 봇 스킬 (방장만): 봇마다 스킬을 고르거나 랜덤
  const bots = m.p.filter((p) => p.b && !p.dm);
  $('botRow').hidden = !host || !bots.length;
  const bl = $('botList'); bl.textContent = '';
  if (host) for (const bot of bots) {
    const pill = document.createElement('div'); pill.className = 'bp';
    const nm = document.createElement('span'); nm.textContent = bot.n.replace('봇 ', ''); pill.append(nm);
    const mkSel = (cur, field, other, rnd) => {
      const sel = document.createElement('select'); sel.setAttribute('aria-label', `${bot.n} ${field === 'skill' ? '스킬' : '스킬2'}`);
      const r = document.createElement('option'); r.value = 'random'; r.textContent = rnd ? `🎲 랜덤 (${SKILLS[validSkill(cur)].name})` : '🎲 랜덤'; if (rnd) r.selected = true; sel.append(r);
      for (const k of SKILL_IDS) {
        const o = document.createElement('option'); o.value = k; o.textContent = SKILLS[k].name;
        if (other && (k === other || conflictsK(k, other))) o.disabled = true;
        if (k === cur && !rnd) o.selected = true;
        sel.append(o);
      }
      sel.addEventListener('change', () => send({ t: 'botskill', id: bot.id, [field]: sel.value }));
      return sel;
    };
    // 난이도 (기본 미들)
    const dsel = document.createElement('select'); dsel.setAttribute('aria-label', `${bot.n} 난이도`);
    ['이지', '미들', '하드'].forEach((t, i) => { const o = document.createElement('option'); o.value = ['easy', 'mid', 'hard'][i]; o.textContent = t; if ((bot.bd ?? 1) === i) o.selected = true; dsel.append(o); });
    dsel.addEventListener('change', () => send({ t: 'botdiff', id: bot.id, diff: dsel.value }));
    pill.append(dsel);
    pill.append(mkSel(bot.sk, 'skill', null, !!(bot.rs && bot.rs[0])));
    if (md[1]) pill.append(mkSel(bot.sk2, 'skill2', bot.sk, !!(bot.rs && bot.rs[1])));
    bl.append(pill);
  }
  const btn = $('readyBtn');
  if (host) {
    const teamsOk = !md[0] || new Set(m.p.map((p) => p.tm)).size >= 2;
    const canStart = m.p.length >= 2 && ready === need && teamsOk;
    btn.textContent = '게임 시작';
    btn.classList.remove('on');
    btn.disabled = !canStart;
    $('rpStatus').textContent = m.p.length < 2 ? '방장 · 2명 이상 필요 (봇 추가 가능)'
      : !teamsOk ? '방장 · 팀을 2개 이상으로 나눠 주세요'
      : need === 0 ? '방장 · 바로 시작할 수 있어요' : `방장 · 준비 ${ready}/${need}명`;
  } else {
    btn.disabled = false;
    btn.textContent = me.rd ? '준비 완료 (취소하려면 누르기)' : '준비';
    btn.classList.toggle('on', !!me.rd);
    $('rpStatus').textContent = `준비 ${ready}/${need}명 · 방장이 시작하면 게임이 시작돼요`;
  }
}

// ---------------- 메인 루프 ----------------
// =====================================================================
//  스킬·스킨 상세 영상 — 브라우저에서 진짜 게임 규칙(sim.js)으로 짧은 장면을 돌려서 그림
//  (나 vs 상대 한 명, 약공격 → 강공격 → 스킬 → 다시 공격, 7초마다 처음부터)
// =====================================================================
let simLoad = null;
function loadSim() {
  if (window.BRAWL_SIM) return Promise.resolve(window.BRAWL_SIM);
  if (!simLoad) simLoad = new Promise((ok, bad) => {
    const sc = document.createElement('script'); sc.src = 'sim.js';
    sc.onload = () => (window.BRAWL_SIM ? ok(window.BRAWL_SIM) : bad(new Error('sim')));
    sc.onerror = () => { simLoad = null; bad(new Error('sim')); };
    document.head.append(sc);
  });
  return simLoad;
}
// 그릴 때 잠깐 바꿔 끼우는 화면 상태 (게임 화면과 섞이지 않게)
function pvSwap(v) {
  let t;
  t = canvas; canvas = v.canvas; v.canvas = t;
  t = ctx; ctx = v.ctx; v.ctx = t;
  t = scale; scale = v.scale; v.scale = t;
  t = offX; offX = v.offX; v.offX = t;
  t = offY; offY = v.offY; v.offY = t;
  t = STAGE; STAGE = v.STAGE; v.STAGE = t;
  t = latest; latest = v.latest; v.latest = t;
  t = snapshots; snapshots = v.snapshots; v.snapshots = t;
  t = particles; particles = v.particles; v.particles = t;
  t = shake; shake = v.shake; v.shake = t;
  t = banners; banners = v.banners; v.banners = t;
  t = myId; myId = v.myId; v.myId = t;
  t = hakiFlash; hakiFlash = v.hakiFlash; v.hakiFlash = t;
  t = freezeFlash; freezeFlash = v.freezeFlash; v.freezeFlash = t;
  t = lightFlash; lightFlash = v.lightFlash; v.lightFlash = t;
  t = lightBlue; lightBlue = v.lightBlue; v.lightBlue = t;
  t = rewindT; rewindT = v.rewindT; v.rewindT = t;
  t = rewindG; rewindG = v.rewindG; v.rewindG = t;
  t = quakeT; quakeT = v.quakeT; v.quakeT = t;
  t = snow; snow = v.snow; v.snow = t;
}
const PV_LOOP = 420;
const pvKey = (k) => ({ a: isTouch ? '약' : 'J', h: isTouch ? '강' : 'K', s: 'Q', e: 'E', u: isTouch ? '점프' : 'W' }[k] || k);
const P = (t, key, label, hold = 1) => ({ t, key, label, hold });
// 기본 장면: 다가가서 약·약·강 → Q → 약·약·강
function pvBase(name) {
  return [P(42, 'a', '약공격'), P(64, 'a', '약공격'), P(90, 'h', '강공격'), P(150, 's', name.replace(/^Q /, '')), P(200, 'a', '약공격'), P(222, 'a', '약공격'), P(248, 'h', '강공격')];
}
const pvNoQ = (pl) => pl.filter((x) => x.key !== 's');
const pvSetQ = (pl, ...qs) => pvNoQ(pl).concat(qs);
// 스킬마다 다른 장면 (plan: 누르는 키, dplan: 상대가 누르는 키, setup: 시작 상태, at: 매 틱, cap: 아래 설명)
const PV_SPEC = {
  blink: { plan: (b) => pvSetQ(b, P(150, 's', '방향키 + Q 점멸'), P(146, 'r', '', 6)) },
  fly: { plan: (b) => pvSetQ(b.filter((x) => x.t < 150), P(150, 's', 'Q 비행'), P(160, 'jump', '점프 키를 누르고 있으면 위로', 60), P(240, 'r', '', 50)), noMove: [150, 330] },
  rock: { dplan: [P(196, 'l', '', 4), P(200, 'a'), P(232, 'h')], cap: '바위 중엔 맞아도 안 날아가요' },
  magnet: { plan: (b) => pvSetQ(b.filter((x) => x.t < 150), P(150, 's', 'Q 당기기'), P(250, 'e', 'E 밀기')), noMove: [150, 250] },
  empower: { setup: (sim, me) => { me.charged = true; }, cap: '가만히 8초 서 있으면 충전돼요 (영상에선 충전된 상태)' },
  parasite: { setup: (sim, me, du) => { me.parHits[du.id] = 5; }, plan: (b) => pvSetQ(b.filter((x) => x.t < 150), P(150, 's', 'Q 기생 → 상대를 조종'), P(165, 'l', '내 키로 상대가 움직여요', 80), P(280, 's', 'Q 나오기')), noMove: [150, 290] },
  sword: { plan: (b) => b.map((x) => (x.key === 'a' ? { ...x, label: '약공격 = 돌진 베기' } : x.key === 'h' ? { ...x, label: '강공격 = 부채꼴 베기' } : x.key === 's' ? { ...x, label: 'Q 참격' } : x)) },
  blackflash: { plan: () => [P(50, 'a', '약공격'), P(53, 's', '맞는 순간 Q = 흑섬!'), P(100, 'h', '강공격'), P(112, 's', '맞는 순간 Q = 흑섬!'), P(200, 'a', '약공격'), P(222, 'h', '강공격')] },
  undying: { plan: pvNoQ, cap: '패시브: 목숨이 5개' },
  hulk: { plan: pvNoQ, at: (t, sim, me) => { if (t < 300) me.damage = Math.min(110, t * 0.6); }, cap: '패시브: 퍼센트가 오를수록 커지고 세져요' },
  archer: { plan: () => [P(20, 's', 'Q 유도 화살 준비'), P(70, 'h', '강공격 꾹 → 놓으면 발사', 45), P(200, 'h', '오래 당길수록 세게', 60)], keep: 220 },
  time: { plan: (b) => [P(30, 's', 'Q 시간 저장')].concat(b.filter((x) => x.key !== 's'), [P(300, 's', 'Q 되돌리기!')]), dplan: [P(176, 'a'), P(198, 'h')], at: (t, sim, me) => { if (t === 260) me.damage = Math.max(me.damage, 70); } },
  combo: { setup: (sim, me) => { me.combo = 9; }, plan: (b) => pvSetQ(b, P(150, 's', 'Q 콤보 스매시')), cap: '때릴 때마다 콤보가 쌓여요' },
  reflect: { plan: (b) => pvSetQ(b, P(150, 's', '공격이 들어오는 순간 Q = 반사!')), dplan: [P(138, 'h')] },
  invert: { dplan: [P(170, 'r', '', 90)], cap: '상대가 오른쪽을 눌러도 왼쪽으로!' },
  error: { dplan: [P(170, 'r', '', 90)], cap: '상대 조작이 제멋대로' },
  quake: { cap: '상대 화면이 3초 동안 흔들려요' },
  mine: { plan: () => [P(40, 's', 'Q 지뢰 놓기'), P(100, 'a', '약공격'), P(120, 'h', '강공격'), P(250, 's', 'Q 지뢰 놓기')], noMove: [40, 100], dplan: [P(60, 'l', '', 60)] },
  charge: { plan: (b) => [P(22, 's', 'Q 충전 모드 (넉백 없이 스택만)')].concat(b.filter((x) => x.key !== 's'), [P(150, 's', 'Q 공격 모드 (스택만큼 세게)')]) },
  starlight: { setup: (sim, me) => { me.starN = 5; }, plan: (b) => pvSetQ(b, P(150, 's', 'Q 별빛 (별 5개)')) },
  portal: { plan: (b) => [P(22, 's', 'Q 포탈')].concat(b.filter((x) => x.key !== 's' && x.t < 150), [P(150, 's', 'Q 순간이동 + 두 번째 포탈'), P(170, 'l', '포탈에 들어가면 반대쪽으로', 12), P(186, 'r', '', 14)]), noMove: [150, 210] },
  shield: { plan: () => [P(40, 'a', '약공격 = 방패 막기'), P(88, 'h', '강공격 = 방패 휘두르기'), P(140, 's', 'Q 꾹 → 놓으면 방패 던지기', 30), P(230, 'a', '방패 막기')], dplan: [P(42, 'a'), P(228, 'h')], keep: 200, cap: '던진 방패는 가까이 가면 주워요' },
  tentacle: { plan: (b) => pvSetQ(b.map((x) => (x.key === 'a' ? { ...x, label: '약공격 = 위 촉수' } : x.key === 'h' ? { ...x, label: '강공격 = 아래 촉수' } : x)), P(150, 's', 'Q 땅을 짚고 떠다니기'), P(165, 'u', '', 25)) },
  hop: { plan: (b) => pvSetQ(b.filter((x) => x.t < 150), P(150, 's', 'Q 무한 점프'), ...[160, 178, 196, 214, 232].map((t) => P(t, 'jump', '점프 연타'))), noMove: [150, 330], cap: '기본으로 3단 점프' },
  dash: { plan: (b) => pvSetQ(b.map((x) => (x.key === 'a' || x.key === 'h' ? { ...x, label: x.label + ' (앞으로 튀어 나감)' } : x)), P(150, 's', 'Q 돌진! 밀고 가기')), keepAt: [130, 150, 150] },
  ninja: { plan: (b) => b.map((x) => (x.key === 'h' ? { ...x, label: '강공격 = 쿠나이 던지기' } : x.key === 's' ? { ...x, label: 'Q 통나무 순간이동' } : x)) },
  shotgun: { plan: () => [P(40, 'a', '약공격 = 총으로 때리기'), P(88, 'h', '강공격 = 산탄'), P(120, 'h', '강공격 = 산탄'), P(150, 's', 'Q 장전'), P(210, 'h', '강공격 = 산탄'), P(242, 'h', '강공격 = 산탄')] },
  ghost: { plan: () => [P(40, 'a', '약공격'), P(160, 'a', '귀신으로 3번 때리면 장외!'), P(190, 'a', '귀신으로 3번 때리면 장외!'), P(220, 'a', '귀신으로 3번 때리면 장외!')],
    at: (t, sim, me) => { if (t === 140) { me.ghostT = 5; me.gMarks = {}; sim.ev({ k: 'ghost', x: Math.round(me.x), y: Math.round(me.y), n: me.name, pid: me.id }); } }, cap: '패시브: 목숨을 다 잃으면 5초 동안 귀신' },
  dope: { setup: (sim, me) => { me.dopeSpawn = 6.6; }, plan: (b) => pvNoQ(b).filter((x) => x.t > 150), goPotion: true, cap: '패시브: 물약이 떨어지면 주워 먹어요' },
  flood: { plan: (b) => pvSetQ(b, P(150, 's', 'Q 홍수'), P(190, 's', 'Q 더 차오름'), P(230, 's', 'Q 더 차오름')), setup: (sim, me) => { me.skillCd = 0; }, at: (t, sim, me) => { if (t === 189 || t === 229) me.skillCd = 0; } },
  gem: { cap: '판 중에 때릴 때마다 진짜 보석이 쌓여요' },
  gamble: { cap: '능력치가 0.0~2.0배로 랜덤' },
};
function pvMakeSim(v) {
  const S = window.BRAWL_SIM, sim = new S.Sim();
  sim.stage = MAPS.find((m) => m.id === 'field');
  sim.mapVote = null; sim.onEvent = () => {};
  const me = sim.addPlayer('me', '나', false, v.skill), du = sim.addPlayer('du', '상대', false, 'slow');
  me.skins = v.skin ? { [v.skill]: v.skin } : {};
  const [mx, my, dx, dy] = [500, 520, 650, 520];
  me.reset(mx, my); du.reset(dx, dy);
  sim.phase = 'playing';
  for (const p of [me, du]) { p.inMatch = true; p.stocks = 99; p.invincible = 0; p.rawInput = S.EMPTY_INPUT(); }
  const spec = PV_SPEC[v.skill] || {};
  if (spec.setup) spec.setup(sim, me, du);
  v.sim = sim; v.me = me; v.du = du; v.tick = 0; v.lastEv = 0; v.cap = null;
  v.plan = (spec.plan ? spec.plan(pvBase(`Q ${SKILLS[v.skill].name}`)) : pvBase(`Q ${SKILLS[v.skill].name}`));
  v.dplan = spec.dplan || [];
  v.spec = spec;
}
function pvInputs(v) {
  const { sim, me, du, tick: t, spec } = v, S = window.BRAWL_SIM;
  const mi = {}, di = {};
  // 상대 쪽으로 다가감 (무대 밖으로는 안 따라감)
  const inWin = (t >= 20 && t < 140) || (t >= 160 && t < 330);
  const blocked = spec.noMove && t >= spec.noMove[0] && t < spec.noMove[1];
  let tx = du.x, ty = du.y;
  if (spec.goPotion && sim.potions.length) { const q = sim.potions.find((o) => o.owner === me.id && o.landed); if (q) { tx = q.x; ty = q.y; } }
  const safe = tx > 220 && tx < 1060 && ty < 600;
  if (inWin && !blocked && safe && !me.inside && du.alive) {
    const dist = spec.goPotion && tx !== du.x ? 4 : 62;
    if (Math.abs(tx - me.x) > dist) mi[tx > me.x ? 'r' : 'l'] = 1;
  }
  const keyOf = (k) => (k === 'jump' ? 'u' : k);
  for (const x of v.plan) {
    if (t >= x.t && t < x.t + x.hold) mi[keyOf(x.key)] = 1;
    if (t === x.t && x.label) {
      const kn = pvKey(x.key);
      v.cap = { text: ['jump', 'r', 'l', 'u'].includes(x.key) || x.label.startsWith(kn + ' ') ? x.label : `${kn} · ${x.label}`, life: 60 };
    }
    // 공격·스킬 직전엔 상대 쪽을 보게 (방향키를 살짝)
    if (['a', 'h', 's'].includes(x.key) && t >= x.t - 3 && t < x.t && !blocked && du.alive && !me.inside) {
      if (Math.abs(du.x - me.x) > 4 && Math.sign(du.x - me.x) !== me.facing) mi[du.x > me.x ? 'r' : 'l'] = 1;
    }
  }
  for (const x of v.dplan) if (t >= x.t && t < x.t + (x.hold || 1)) di[keyOf(x.key)] = 1;
  me.rawInput = { ...S.EMPTY_INPUT(), ...mi }; du.rawInput = { ...S.EMPTY_INPUT(), ...di };
  if (du.damage > 55) du.damage = 55;   // 영상에선 상대가 너무 멀리 날아가지 않게
  if (spec.at) spec.at(t, sim, me, du);
}
function pvStep(v) {
  pvInputs(v);
  v.sim.tick(1 / 60); v.tick++;
  if (v.tick % 2 === 0) {
    const m = JSON.parse(JSON.stringify(v.sim.snapshot()));
    m.p = m.p.map((q) => (q.ins ? { ...q, x: 0, y: 0, vx: 0, vy: 0, at: 0, ap: 0, hid: 1 } : q));
    m.time = performance.now();
    snapshots.push(m); if (snapshots.length > 30) snapshots.shift();
    latest = m;
    for (const e of m.ev || []) if (e.i > v.lastEv) { v.lastEv = e.i; if (!e.only || e.only === 'me') onEvent(e); }
  }
}
let pv = null;   // 지금 보여 주는 영상
function pvStart(cv, skill, skin) {
  pvStop();
  const st = MAPS.find((m) => m.id === 'field');
  const v = { canvas: cv, ctx: cv.getContext('2d'), skill, skin, scale: 1, offX: 0, offY: 0, STAGE: { ...st, zoom: 1 },
    latest: null, snapshots: [], particles: [], shake: 0, banners: [], myId: 'me', hakiFlash: 0, freezeFlash: 0, lightFlash: 0, lightBlue: false,
    rewindT: 0, rewindG: false, quakeT: 0, snow: [], acc: 0, last: performance.now(), on: true, x0: 240, y0: 150, RW: 800 };
  pv = v;
  loadSim().then(() => {
    if (pv !== v) return;
    pvSwap(v); try { pvMakeSim(v); } finally { pvSwap(v); }
    $('detLoading').hidden = true;
    requestAnimationFrame((t) => pvFrame(v, t));
  }).catch(() => { $('detLoading').textContent = '영상을 불러오지 못했어요.'; });
}
function pvStop() { if (pv) pv.on = false; pv = null; }
function pvFrame(v, now) {
  if (!v.on || pv !== v) return;
  const cv = v.canvas, dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
  if (w > 0 && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; }
  const dt = Math.min(0.05, (now - v.last) / 1000); v.last = now;
  // 카메라: 나와 상대 사이를 부드럽게 따라감
  if (v.latest) {
    const me = v.latest.p.find((q) => q.id === 'me'), du = v.latest.p.find((q) => q.id === 'du');
    if (me && !me.hid) {
      let fx = me.x, fy = me.y;
      if (du && !du.hid && Math.hypot(du.x - me.x, du.y - me.y) < 560) { fx = (fx + du.x) / 2; fy = (fy + du.y) / 2; }
      const st = v.STAGE, RH = v.RW * 9 / 16;
      const tx = clamp(fx - v.RW / 2, 0, st.width - v.RW), ty = clamp(Math.min(150, fy - RH * 0.72), -200, 150);
      const k = Math.min(1, dt * 3);
      v.x0 += (tx - v.x0) * k; v.y0 += (ty - v.y0) * k;
    }
  }
  v.scale = cv.width / v.RW; v.offX = -v.x0 * v.scale; v.offY = -v.y0 * v.scale;
  pvSwap(v);
  try {
    v.acc = Math.min(v.acc + dt, 0.1);
    while (v.acc >= 1 / 60) {
      v.acc -= 1 / 60;
      // pvSwap 상태에서는 v 안의 값과 전역이 서로 바뀌어 있으므로 sim 등은 v에서 그대로 씀
      pvStep(v);
      if (v.tick >= PV_LOOP) { pvMakeSim(v); snapshots = []; latest = null; particles = []; shake = 0; }
    }
    drawBackground(now);
    if (latest) drawWorld(now, dt, interpolatedPlayers(), interpolatedPlayers('cl'));
    // 위: 지금 누른 키 / 아래: 설명 / 오른쪽 위: 상대 퍼센트
    const k = Math.max(canvas.width / 640, Math.min(devicePixelRatio || 1, 2) * 0.85);   // 작은 화면에서도 글씨가 읽히게
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (v.cap && v.cap.life > 0) {
      v.cap.life -= dt * 60;
      ctx.globalAlpha = Math.min(1, v.cap.life / 12);
      ctx.font = `700 ${Math.round(17 * k)}px Pretendard, system-ui, sans-serif`;
      const tw = ctx.measureText(v.cap.text).width + 28 * k;
      ctx.fillStyle = 'rgba(14,12,30,0.82)'; roundRect(canvas.width / 2 - tw / 2, 12 * k, tw, 32 * k, 16 * k); ctx.fill();
      ctx.strokeStyle = SKILL_COLOR[v.skill] || '#ffcf3f'; ctx.lineWidth = 2 * k; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(v.cap.text, canvas.width / 2, 28 * k);
      ctx.globalAlpha = 1;
    }
    if (v.spec.cap) {
      ctx.font = `600 ${Math.round(13 * k)}px Pretendard, system-ui, sans-serif`;
      const tw = ctx.measureText(v.spec.cap).width + 20 * k;
      ctx.fillStyle = 'rgba(14,12,30,0.7)'; roundRect(canvas.width / 2 - tw / 2, canvas.height - 34 * k, tw, 24 * k, 12 * k); ctx.fill();
      ctx.fillStyle = '#e8e4ff'; ctx.fillText(v.spec.cap, canvas.width / 2, canvas.height - 22 * k);
    }
    const dq = latest && latest.p.find((q) => q.id === 'du');
    if (dq) {
      ctx.textAlign = 'right'; ctx.font = `800 ${Math.round(16 * k)}px Pretendard, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(14,12,30,0.6)'; roundRect(canvas.width - 112 * k, 10 * k, 102 * k, 28 * k, 8 * k); ctx.fill();
      ctx.fillStyle = dmgColor(dq.dmg || 0); ctx.fillText(`상대 ${dq.dmg || 0}%`, canvas.width - 18 * k, 25 * k);
    }
    ctx.restore();
  } catch (e) { console.error(e); }
  finally { pvSwap(v); }
  requestAnimationFrame((t) => pvFrame(v, t));
}
// ---------------- 스킬·스킨 상세 창 ----------------
const DOCS = (window.BRAWL_DOCS || {}).DOCS || {};
let det = null;   // { skill, skin, td }
function openDetail(o) {
  det = { skin: null, ...o };
  $('detMsg').textContent = '';
  $('detailModal').hidden = false;
  renderDetail(true);
  $('detClose').focus();
}
function closeDetail() { pvStop(); det = null; $('detailModal').hidden = true; }
function renderDetail(restart) {
  if (!det) return;
  const { skill, skin } = det, sk = SKILLS[skill], sd = skin && SKIN_INFO.SKINS[skin];
  $('detTitle').textContent = sd ? sd.name : sk.name;
  $('detTitle').style.color = sd ? sd.color : SKILL_COLOR[skill];
  const gd = sd ? SKIN_INFO.gradeOf(skin) : null;
  $('detTag').textContent = sd ? `${gd.name} · ${sk.name} 스킨` : sk.cd;
  $('detTag').style.color = gd ? gd.color : '';
  $('detDesc').textContent = sd ? `${sd.desc} — 보이는 모습만 바뀌고 능력은 그대로예요.` : sk.desc;
  const ul = $('detMore'); ul.textContent = '';
  const li = (label, text) => { if (!text) return; const e = document.createElement('li'); if (label) { const b = document.createElement('b'); b.textContent = label + ' '; e.append(b); } e.append(text); ul.append(e); };
  const d = DOCS[skill] || {};
  if (sd) li('스킬', sk.desc);
  else {
    for (const h of d.how || []) li('', h);
    li('기본 공격', d.atk);
    li('팁', d.tip);
  }
  detActions();
  if (restart) { $('detLoading').hidden = false; $('detLoading').textContent = '영상 불러오는 중…'; pvStart($('detCanvas'), skill, skin); }
}
function detActions() {
  const { skill, skin } = det, p = account.profile, btn = $('detBuy'), msg = $('detMsg');
  btn.onclick = null; btn.disabled = false; btn.classList.remove('ghost');
  if (skin) {
    const owned = !!(p && p.skins && p.skins.includes(skin)), on = !!(p && p.skinSel && p.skinSel[skill] === skin);
    if (!p) { btn.textContent = '로그인하면 살 수 있어요'; btn.disabled = true; }
    else if (on) { btn.textContent = '장착 중'; btn.disabled = true; btn.classList.add('ghost'); }
    else if (owned) { btn.textContent = '장착'; btn.onclick = async () => { await skinAction('/api/skin/equip', { skill, skin }); msg.textContent = $('skinMsg').textContent; detActions(); }; }
    else if (SKIN_INFO.SKINS[skin].limited) {
      const sale = evSale(skin);
      if (!sale) { btn.textContent = '판매가 끝난 한정판 스킨이에요'; btn.disabled = true; }
      else { btn.textContent = `한정판 구매 · 보석 ${sale.price}`; btn.disabled = p.gems < sale.price; btn.onclick = async () => { await eventBuy(skin); msg.textContent = $('skinMsg').textContent; detActions(); }; }
      return;
    }
    else {
      const pr = skinPriceOf(skin); btn.textContent = `구매 · 보석 ${pr}`; btn.disabled = p.gems < pr;
      btn.onclick = async () => { await skinAction('/api/skin/buy', { skin }); msg.textContent = $('skinMsg').textContent; detActions(); };
    }
    if (!msg.textContent) msg.textContent = p && !owned && p.gems < skinPriceOf(skin) ? `보석이 ${skinPriceOf(skin) - p.gems}개 모자라요.` : '';
    return;
  }
  const owned = (p ? p.owned : BASE_SKILLS).includes(skill);
  if (owned) { btn.textContent = '이 스킬 고르기'; btn.onclick = () => { selectSkill(skill, true); closeDetail(); }; }
  else if (!p) { btn.textContent = '가입하면 뽑기로 얻을 수 있어요'; btn.disabled = true; }
  else {
    btn.textContent = `보석 ${SKILL_BUY}개로 사기`;
    btn.onclick = async () => {
      await buySkillAsk(skill);
      const ok = account.profile && account.profile.owned.includes(skill);
      msg.textContent = ok ? `${SKILLS[skill].name} 구매 완료!` : $('gachaMsg').textContent;
      detActions();
    };
    if (!msg.textContent) msg.textContent = p.gems < SKILL_BUY ? `보석 ${SKILL_BUY - p.gems}개 더 모으거나, 뽑기(보석 ${GACHA_COST})로 얻을 수 있어요.` : `뽑기(보석 ${GACHA_COST})로도 얻을 수 있어요.`;
  }
}
$('detClose').addEventListener('click', closeDetail);
$('detailModal').addEventListener('click', (e) => { if (e.target === $('detailModal')) closeDetail(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && det) closeDetail(); });
$('detBtn').addEventListener('click', () => openDetail({ skill: validSkill(account.skill) }));
// 게임 장면(배경 빼고): 무대 · 사람 · 효과. 스킬 상세 영상도 이걸로 그림
function drawWorld(now, dt, players, clonesI) {
  ctx.save();
  shake *= Math.pow(0.002, dt);
  let sx = (Math.random() - 0.5) * shake * scale, sy = (Math.random() - 0.5) * shake * scale;
  let rot = 0;
  // 지진: 서버가 알려 주는 내 흔들림 상태를 따름 (시간 되돌리기에도 맞게)
  const meQ = latest.p.find((q) => q.id === myId);
  quakeT = meQ && meQ.qk ? Math.max(quakeT, 0.4) : Math.max(0, quakeT - dt * 3);
  if (quakeT > 0) {
    quakeT -= dt;
    const q = reduceMotion ? 6 : 34 * Math.min(1, quakeT + 0.3);
    sx += (Math.random() - 0.5) * q * 2 * scale; sy += (Math.random() - 0.5) * q * 2 * scale;
    rot = reduceMotion ? 0 : (Math.random() - 0.5) * 0.05;
  }
  ctx.translate(offX + sx, offY + sy);
  if (rot) { ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rot); ctx.translate(-canvas.width / 2, -canvas.height / 2); }
  ctx.scale(scale * STAGE.zoom, scale * STAGE.zoom);
  drawStage();
  drawTramps(now);
  drawPotions(latest, now);
  drawPortals(latest, now);
  drawSkillObjs(latest, now);
  drawSlashes(latest, now);
  drawTurrets(latest, now);
  for (const q of latest.p) if (q.ts) {
    // 시간 저장 위치: 반투명 시계
    const [tx, ty] = q.ts, cy3 = ty - 34;
    ctx.globalAlpha = 0.55 + Math.sin(now / 250) * 0.15;
    ctx.strokeStyle = skinOn(q, 'timestone') ? '#3cf08a' : '#9fb3ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tx, cy3, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, cy3); ctx.lineTo(tx, cy3 - 15); ctx.moveTo(tx, cy3); ctx.lineTo(tx + 10 * Math.cos(now / 400), cy3 + 10 * Math.sin(now / 400)); ctx.stroke();
    ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(tx, cy3 + 32, 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  drawArrowsWinds(latest, now);
  drawLogsStars(latest, now);
  drawThrownShields(latest, now);
  clonesI.forEach((c) => drawPlayer(c, now));
  players.filter((p) => p.id !== myId).forEach((p) => drawPlayer(p, now));
  players.filter((p) => p.id === myId).forEach((p) => drawPlayer(p, now));
  drawWater(latest, now);
  drawFlashZones(latest, now);
  drawParticles(dt);
  drawSmoke(latest.sm || [], now);
  drawBlizzard(latest, dt, now);
  if (hakiFlash > 0) { ctx.fillStyle = `rgba(90,0,14,${Math.min(0.4, hakiFlash)})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); hakiFlash -= dt; }
  if (freezeFlash > 0) { ctx.fillStyle = `rgba(210,236,255,${Math.min(0.35, freezeFlash)})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); freezeFlash -= dt; }
  if (rewindT > 0) {
    // 시간 되돌리기: 푸른 화면 + 거꾸로 도는 시계
    const k = rewindT / 0.9;
    ctx.fillStyle = rewindG ? `rgba(40,210,110,${0.33 * k})` : `rgba(90,120,255,${0.35 * k})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800);
    ctx.save(); ctx.translate(STAGE.width / 2, STAGE.height / 2 - 60); ctx.globalAlpha = k;
    ctx.strokeStyle = rewindG ? '#c8ffdc' : '#dfe6ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(-(1 - k) * Math.PI * 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.moveTo(0, 0); ctx.lineTo(45, 0); ctx.stroke();
    ctx.restore(); rewindT -= dt;
  }
  if (lightFlash > 0) { ctx.fillStyle = lightBlue ? `rgba(150,195,255,${Math.min(0.3, lightFlash)})` : `rgba(255,250,200,${Math.min(0.3, lightFlash)})`; ctx.fillRect(-400, -400, STAGE.width + 800, STAGE.height + 800); lightFlash -= dt; }
  ctx.restore();
}
let last = performance.now(), barCounter = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;

  if (latest && isTouch) {
    const meS = latest.p.find((p) => p.id === myId);
    if (meS) {
      const sl = slotsOf(meS);
      const btn = (el, nameEl, cdEl, k, keyName) => {
        el.hidden = !k;
        if (!k) return;
        const kk = k === 'magnet2' ? 'magnet' : validSkill(k), cd = cdOf(meS, k);
        let ready = !(cd > 0), txt = cd > 0 ? cd.toFixed(1) : keyName;
        if (kk === 'empower') { ready = meS.chg >= 100 || meS.bf; txt = meS.bf ? '강화' : `${meS.chg || 0}%`; }
        if (kk === 'parasite') { ready = meS.pr > 0 || meS.ins; txt = meS.ins ? '나가기' : `${meS.pr || 0}명`; }
        if (kk === 'undying' || kk === 'hulk' || kk === 'ghost' || kk === 'dope') { ready = true; txt = '패시브'; }
        if (kk === 'combo') { ready = meS.cb > 0; txt = `${meS.cb || 0}콤보`; }
        const nm = k === 'magnet2' ? '밀기' : sl.e === 'magnet2' && k === 'magnet' ? '당기기' : SKILLS[kk].name;
        if (nameEl.textContent !== nm) nameEl.textContent = nm;
        el.style.borderColor = SKILL_COLOR[kk];
        cdEl.textContent = txt;
        el.classList.toggle('cool', !ready);
      };
      // 촉수: 약=위 촉수, 강=아래 촉수 / 방패: 약=막기
      const tent = meS.sk === 'tentacle' || meS.sk2 === 'tentacle', shd = (meS.sk === 'shield' || meS.sk2 === 'shield') && meS.shd && meS.shd[0];
      const la = tent ? '촉수↑' : shd ? '막기' : '약', lh = tent ? '촉수↓' : '강';
      if ($('touch').querySelector('.tb-a').textContent !== la) $('touch').querySelector('.tb-a').textContent = la;
      if ($('touch').querySelector('.tb-h').textContent !== lh) $('touch').querySelector('.tb-h').textContent = lh;
      btn($('tSkill'), $('tSkillName'), $('tSkillCd'), sl.s, 'Q');
      btn($('tSkill2'), $('tSkill2Name'), $('tSkill2Cd'), sl.e, 'E');
      btn($('tSkill3'), $('tSkill3Name'), $('tSkill3Cd'), sl.x, 'R');
    }
  }
  if (online && latest && ++barCounter % 30 === 0) {
    const people = latest.p.filter((p) => !p.b).length;
    $('net').textContent = `같은 방 ${people}명${pingMs != null ? ` · 핑 ${pingMs}ms` : ''}`;
  }

  // 에러: 내 화면이 끊김 (가끔 그리기를 멈추고, 깨진 줄무늬가 지나감)
  const meE = latest && latest.p.find((p) => p.id === myId);
  if (meE && meE.er && !reduceMotion) {
    if (errHold > 0) { errHold -= dt; requestAnimationFrame(frame); return; }
    if (Math.random() < 0.06) errHold = 0.08 + Math.random() * 0.35;
  } else errHold = 0;
  drawBackground(now);
  if (latest) {
    const players = interpolatedPlayers();
    const clonesI = interpolatedPlayers('cl');
    drawWorld(now, dt, players, clonesI);
    ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale);
    if (meE && meE.er) drawGlitch(meE.er === 2);
    const meB = latest.p.find((q) => q.id === myId);
    if (meB && meB.bl) { ctx.fillStyle = `rgba(255,255,248,${Math.min(0.97, meB.bl / 0.9)})`; ctx.fillRect(-2000, -2000, 6000, 6000); }   // 섬광에 눈부심: 화면이 하얗게
    drawHUD(latest, players);
    drawPhase(latest, players, dt);
    ctx.restore();
  } else if ($('lobby').hidden) {
    ctx.save(); ctx.translate(offX, offY); ctx.scale(scale * STAGE.zoom, scale * STAGE.zoom);
    drawStage(); ctx.restore(); ctx.save(); ctx.translate(offX, offY); ctx.scale(scale, scale); smallText('방에 연결하는 중…', 200); ctx.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
