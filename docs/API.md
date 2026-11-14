# API · 운영 상세

> README에서 옮긴 기존 운영 메모와 참가자 API v3 명세입니다. 내용은 바꾸지 않았습니다.


행사 초대 링크로 접속해 1~15조 중 하나를 선택하고 프로필을 등록합니다. 각 조의 팀장은 팀원들의 관심사로 공통 대화 주제 3개를 만들고 다시 생성할 수 있습니다.

### 로컬 실행

1. `.env.sample`을 `.env.local`로 복사하고 Supabase 프로젝트 URL과 서버 전용 키를 입력합니다. 실제 키는 공유하지 않습니다.
2. 새 Supabase 프로젝트에는 `supabase/migrations`의 SQL을 번호 순서대로 검토해 한 번씩 적용합니다. 기존 프로젝트에는 적용 이력을 먼저 확인합니다. 투표 테이블은 보존하며 화면에서 사용하지 않습니다.
3. `npm install` 후 `npm run dev`를 실행합니다.
4. `node scripts/setup-event.mjs --base-url http://localhost:3000`을 실행합니다. 다른 배포 주소라면 해당 주소를 넣습니다.
5. 스크립트가 알려준 `.env.huddling-links-*.local` 파일의 `EVENT_LINK`를 행사 참여자에게 전달합니다. 팀장은 첫 화면의 **조 만들기**에서 조와 이름을 선택합니다. 팀장 링크를 배포할 필요는 없습니다.

스크립트는 15개 조가 이미 있으면 재사용하고 다른 프로젝트 데이터를 지우지 않습니다. 토큰을 변경하지 않고 동일한 로컬 `.env.local`로 재실행해야 합니다. 링크 파일은 주소별로 따로 생성되며, 기존 파일을 덮어쓰지 않습니다.

배포 환경에도 `.env.local`의 `HUDDLING_EVENT_TOKEN`을 서버 전용 환경변수로 설정해야 팀장 조 선택이 동작합니다. 토큰은 공개하거나 클라이언트 변수로 설정하지 마세요. 조를 선점한 팀장의 권한은 현재 브라우저의 쿠키로 유지됩니다.

운영진 로그인을 쓰려면 서버 환경변수 `ADMIN_ID`, `ADMIN_PASSWORD`를 설정합니다. 첫 화면의 운영진 입구에서 로그인하면 조별 현황, 팀장 해제와 프로필 삭제를 이용할 수 있습니다. 이전 투표에 연결된 프로필은 투표 보존을 위해 삭제할 수 없습니다. 로그인 제한은 배포 환경에서 신뢰할 수 있는 클라이언트 IP 헤더가 전달되어야 합니다.

GPT를 사용하지 못하면 관심사 기반 기본 주제 3개가 표시됩니다. 유료 호출은 승인 후 서버의 `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-6-luna`, `AI_ENABLED=true`, `AI_ALLOW_PAID=true`를 설정했을 때만 실행됩니다. GPT 출력 한도는 4000, reasoning effort는 medium입니다.

### 현재 범위

초대 링크를 가진 참여자는 행사 15개 조의 프로필을 볼 수 있습니다. 개인정보 공유 범위를 안내하고 링크를 필요한 사람에게만 전달하세요. 투표·결과 화면은 사용하지 않으며 기존 테이블과 데이터는 보존합니다. 한 조의 주제 생성은 시간당 최대 10회입니다.

### 참가자 API v3

참가자는 초대 링크 없이 서버에 설정된 행사의 1~15조를 조회하고 프로필을 등록합니다. 행사 범위는 `HUDDLING_EVENT_TOKEN`의 해시로만 정합니다. 클라이언트가 보낸 행사 쿠키로 다른 행사를 선택하지 않습니다. 조회 응답은 `Cache-Control: no-store`를 사용합니다.

| 경로 | 응답·조건 |
| --- | --- |
| `GET /api/teams` | 공개. `{ event: { name }, myRoomId, teams: [{ id, number, name, count, hostName }] }`. 조 번호 오름차순입니다. `hostName`과 `myRoomId`는 없으면 `null`입니다. |
| `GET /api/rooms/[id]/public` | 공개. `{ id, number, name, count, hostName }`. 서버에 설정된 행사 소속이 아닌 조는 404입니다. |
| `POST /api/rooms/[id]/profiles` | 초대·행사 쿠키 없이 등록합니다. 서버에 설정된 행사 조만 허용하고 외부 출처 요청은 403입니다. 성공하면 `{ id }`와 httpOnly profile·room 쿠키를 발급합니다. 같은 브라우저의 기존 카드가 있으면 `409 { error, roomId }`를 반환합니다. |
| `POST /api/host-claim` | 기존 `{ id, name }` 요청과 조건부 팀장 선점을 유지합니다. 성공 `{ id }`, 이미 선점된 조 409, 기존 팀장 쿠키 발급을 유지합니다. |
| `GET /api/rooms/[id]` | 현재 행사 조는 공개 열람합니다. 기존 응답의 `profiles`, `myProfileId`, `isHost`, `questions`, `source`, `profileCount`, `generatedAt`을 유지합니다. 본인 카드·팀장 여부만 쿠키로 판단합니다. 현재 행사 밖의 기존 독립 조는 기존 초대 권한이 있어야 열람합니다. |
| `GET /api/events/current` | 공개. `{ event: { name }, myRoomId, teams: [{ id, number, name, count, cards: [{ id, name, occupation, experience, domains, introduction }] }] }`. 조 번호·카드 등록 시각 오름차순입니다. |
| `POST /api/rooms/[id]/topics` | 기존 `analysis`의 별칭입니다. 팀장 쿠키와 같은 출처의 요청만 허용하며 `{ source, generatedAt }`를 반환합니다. |
| `GET /api/rooms/[id]/leader` | 기존 해당 조 팀장 전용 `{ inviteUrl, count, names }`를 유지합니다. v3의 공개 진입 흐름에서는 초대 링크가 필요하지 않습니다. |

`myRoomId`는 현재 행사 안의 유효한 본인 프로필 쿠키를 우선하고, 없으면 유효한 조 참여·팀장 쿠키로 정합니다. 둘 다 없으면 `null`입니다. 공개 API에 인증 토큰·해시를 포함하지 않습니다. 기존 행사·조 enter API와 초대 경로는 보존합니다.

`supabase/migrations/202611140005_topic_generated_at.sql`은 nullable 생성 시각 컬럼을 추가합니다. 기존 주제의 생성 시각은 알 수 없으므로 다음 생성 성공까지 `generatedAt`이 `null`입니다. 주제 저장 성공과 같은 트랜잭션에서만 시각을 갱신합니다. 추가 v3 테이블이나 컬럼은 필요하지 않습니다.

예: `/api/teams`에서 조 id를 선택한 뒤 `/api/rooms/{id}/public`으로 정보를 확인합니다. 해당 조의 profiles API에 제출하고, 성공 응답의 쿠키로 이후 조 페이지에서 본인 카드를 표시합니다.
