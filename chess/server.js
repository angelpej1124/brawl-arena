// =====================================================================
//  예전 럭키 체스 주소(따로 된 사이트)용 — 이제 체스는 난투 아레나 안 미니게임이에요.
//  예전 주소로 들어온 사람을 난투 아레나의 체스(/chess/)로 보내 주기만 함.
//  실행: node chess/server.js   (환경 변수 BRAWL_URL = 난투 아레나 주소)
//  체스 게임 자체는 chess/core.js 이고, 난투 아레나 server.js 가 불러서 씀.
// =====================================================================
'use strict';
const http = require('http');

const PORT = process.env.PORT || 3100;
const BRAWL_URL = String(process.env.BRAWL_URL || 'http://localhost:3000').replace(/\/+$/, '');

http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); return res.end('ok'); }
  res.writeHead(301, { Location: BRAWL_URL + '/chess/', 'Cache-Control': 'no-cache' });
  res.end();
}).listen(PORT, () => console.log(`예전 럭키 체스 주소 → ${BRAWL_URL}/chess/ 로 보내는 중 (포트 ${PORT})`));
