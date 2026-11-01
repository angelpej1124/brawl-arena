# 난투 아레나 (럭키 체스 미니게임 포함) — 시놀로지 NAS 등에서 Docker로 실행
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY . .
# DATABASE_URL이 없으면 계정은 /app/data/accounts.json 파일에 저장 (볼륨으로 NAS 폴더에 보관)
ENV DATA_DIR=/app/data PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1
CMD ["node", "server.js"]
