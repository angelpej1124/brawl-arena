# 시놀로지 NAS에서 Docker로 실행하기

DSM 7.2 이상, **Container Manager**가 되는 모델(대부분의 plus 모델, x86·ARM64)에서 실행할 수 있어요.

## 1. 준비
1. **패키지 센터**에서 **Container Manager**를 설치해요.
2. **File Station**의 `docker` 공유 폴더 안에 `brawl-arena` 폴더를 만들어요.
3. 소스코드 zip을 그 폴더에 올리고, 오른쪽 클릭 → **압축 풀기 → 여기에 압축 풀기**를 해요.
   `docker/brawl-arena/` 바로 안에 `Dockerfile`, `docker-compose.yml`, `server.js`가 보이면 돼요. 폴더가 한 겹 더 생겼으면 안의 파일을 위로 옮겨요.
4. `docker/brawl-arena/` 안에 **`data`** 폴더가 있는지 확인하고, 없으면 만들어요 (계정 파일 저장용 — 없으면 실행이 안 돼요).

## 2. 설정 파일 (.env)
1. PC에서 `.env.example`을 복사해 이름을 **`.env`**로 바꾸고 메모장으로 값을 채워요.
   - `DATABASE_URL`: Render 대시보드 → brawl-arena → **Environment**에 있는 값을 그대로 복사해요. 이걸 넣어야 원래 계정·보석·스킨이 이어져요. 비워 두면 NAS에 새로 저장해요 (처음부터 시작).
   - `ADMIN_NICKS`: 관리자 닉네임 (예: `deku`)
   - 럭키 체스도 쓸 거면 `CHESS_SECRET`(아무 긴 글자)과 `CHESS_URL`(사람들이 체스에 들어갈 주소)을 넣어요.
2. `.env` 파일을 `docker/brawl-arena/` 폴더에 올려요. (`.env`는 비밀번호가 들어 있으니 아무에게도 보여주지 마세요.)

## 3. 실행
1. **Container Manager → 프로젝트 → 생성**
2. 프로젝트 이름: `brawl-arena` · 경로: `/docker/brawl-arena` 선택
3. 원본: **"기존 docker-compose.yml 사용"** → 다음 → (웹 포털 설정은 건너뛰기) → **완료**
4. 처음엔 이미지를 만들고(빌드) 켜느라 1~3분 걸려요. 컨테이너 `brawl-arena`, `lucky-chess`가 **실행 중**이 되면 끝!
5. 같은 와이파이에서 `http://NAS내부IP:8580` 으로 들어가 봐요 (체스는 `:8581`).
   체스를 안 쓰면 `lucky-chess` 컨테이너는 꺼 둬도 돼요.

## 4. 밖(친구 폰·다른 집)에서 들어오게 하기
QuickConnect로는 게임에 못 들어와요. 아래 둘 중 하나를 해요.

**A. 간단하게 (http)**: 공유기 설정에서 **포트 포워딩** 외부 8580 → NAS내부IP:8580 (체스는 8581).
주소는 `http://집공인IP:8580` 또는 DDNS 주소 `http://내이름.synology.me:8580`.

**B. 추천 (https, 포트 번호 없이)**
1. **제어판 → 외부 액세스 → DDNS**에서 `내이름.synology.me` 만들기 (Let's Encrypt 인증서도 같이 받기)
2. **제어판 → 로그인 포털 → 고급 → 역방향 프록시 → 생성**
   - 소스: HTTPS · 호스트 이름 `내이름.synology.me` (또는 `game.내이름.synology.me`) · 포트 443
   - 대상: HTTP · `localhost` · 포트 8580
   - **사용자 지정 머리글 → 생성 → WebSocket** 을 꼭 눌러 추가 (이게 없으면 게임 접속이 안 돼요)
3. 공유기에서 443 포트를 NAS로 포트 포워딩
4. 주소: `https://내이름.synology.me`

## 5. 업데이트할 때
새 소스코드로 파일을 덮어쓴 뒤 (`.env`와 `data` 폴더는 그대로 두기)
**Container Manager → 프로젝트 → brawl-arena → 작업 → 빌드** (끝나면 자동으로 다시 켜짐)

## 오류가 날 때
- **`driver failed programming external connectivity` / `port is already allocated` / `address already in use`**
  NAS의 다른 앱이 같은 포트를 쓰고 있어요. `.env`에 `BRAWL_PORT=8590`, `CHESS_PORT=8591`처럼 다른 숫자를 넣고
  프로젝트를 **정지 → 시작** (또는 작업 → 빌드) 하세요. 컨테이너 목록에 예전에 만든 `brawl-arena`가 남아 있으면 지우고 다시 해요.

- **`Bind mount failed: '/volume1/docker/brawl-arena/data' does not exist`**
  File Station에서 `docker/brawl-arena` 안에 `data` 폴더를 만들고 다시 빌드하세요.

## 참고
- `DATABASE_URL`을 안 쓰면 계정 기록은 `docker/brawl-arena/data/accounts.json`에 저장돼요. 이 폴더를 가끔 백업하세요.
- 같은 데이터베이스(`DATABASE_URL`)를 Render와 NAS가 동시에 쓰면 서로 기록이 엇갈릴 수 있으니, NAS로 옮기면 Render 서비스는 꺼 두세요.
- 로그: Container Manager → 컨테이너 → brawl-arena → **로그**
