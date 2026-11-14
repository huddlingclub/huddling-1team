# 1조 팀 작업 안내

작업 원장은 GitHub Issues와 Milestones다. Notion에는 PRD·참고 자료와 GitHub 링크를 둔다.
개발 구현은 정도연에게 모으고, 기획·디자인은 문서와 Figma·에셋·검수 결과로 전달한다.

[P0 MVP 마일스톤](https://github.com/huddlingclub/huddling-1team/milestone/1) · [P1 후속 마일스톤](https://github.com/huddlingclub/huddling-1team/milestone/2)

## 사람과 개인 브랜치

사용자가 공유한 현재 역할과 실제 원격 브랜치를 기준으로 적었다. GitHub 계정명과 브랜치 이름은 서로 다를 수 있다.

| 이름 | 이번 프로젝트 역할 | 개인 브랜치 | 담당 이슈 |
| --- | --- | --- | --- |
| 김동규 | 조장·배포 | dongkyukim | [#1](https://github.com/huddlingclub/huddling-1team/issues/1) |
| 정진만 | 기획 | jinmanjung | [#2](https://github.com/huddlingclub/huddling-1team/issues/2) |
| 김지현 | 기획 | jihyunkim | [#3](https://github.com/huddlingclub/huddling-1team/issues/3) |
| 최지영 | 기획 | jiyoungchoi | [#4](https://github.com/huddlingclub/huddling-1team/issues/4) |
| 차은영 | 디자인 | eunyoungcha | [#5](https://github.com/huddlingclub/huddling-1team/issues/5) |
| 김재이 | 디자인 | jaeikim | [#6](https://github.com/huddlingclub/huddling-1team/issues/6) |
| 이유리 | 디자인 | yurilee | [#7](https://github.com/huddlingclub/huddling-1team/issues/7) |
| 박나현 | 디자인 | nahyunpark | [#8](https://github.com/huddlingclub/huddling-1team/issues/8) |
| 정도연 | 개발·Git 관리 | doyeonjung | [#9](https://github.com/huddlingclub/huddling-1team/issues/9) |

원격 개인 브랜치들은 처음 만든 화면에서 시작했다. 첫 작업 전에 최신 main의 규칙을 반드시 반영한다.
파일·폴더의 작성자는 한 명으로 정한다. 공통 설정·lockfile은 정도연과 조율한다.

## 이슈에 작업 등록

1. 본인 이름의 이슈를 열고 `맡겠습니다. 브랜치: 내이름` 댓글을 남긴다.
2. 본인 GitHub 계정을 Assignee로 지정한다. 권한이 없으면 조장에게 요청한다.
3. 이슈의 할 일·산출물·완료 조건을 확인하고 `진행 중`으로 옮긴다.
4. 산출물이 나오면 이슈에 Figma·파일·PR 링크와 확인 결과를 남기고 `검수 대기`로 옮긴다.
5. 작성자와 다른 사람이 확인한 뒤 완료 처리한다. 막히면 `막힘`으로 옮기고 필요한 결정을 적는다.

P0부터 진행한다. 로그인·카드 수정·Slack 알림·모바일 앱은 현재 PRD 범위 밖이다.
디자인 작업은 이슈로 공유하면 된다. 저장소 파일을 바꾸지 않았다면 빈 커밋·PR을 만들지 않는다.

## 개인 브랜치에서 안전하게 받기

처음 저장소를 받았고 작업 폴더가 깨끗한 경우:
```sh
git switch main
git pull --ff-only origin main
git switch 내브랜치
git pull --no-rebase origin 내브랜치
git pull --no-rebase origin main
```
개인 브랜치가 로컬에 없으면 위 `git switch 내브랜치` 대신 `git switch --track origin/내브랜치`를 실행한다. 명령의 `내브랜치`는 위 표의 실제 이름으로 바꾼다.

시작할 때, 약 20~30분마다, 커밋·push 전에 원격을 확인한다.
변경한 파일이 있으면 pull을 강행하지 않는다. fetch로 확인하고 본인 파일만 선택 커밋한 뒤 pull한다.
충돌이 나면 남의 변경을 버리지 말고 Git 담당자와 의도를 확인한다.

## AI에게 복사해서 보내는 요청
```text
AGENTS.md, CLAUDE.md, TEAM_GUIDE.md, HANDOFF.md부터 읽어줘.
내 이름: <이름>
내 개인 브랜치: <위 표의 브랜치>
담당 이슈: #번호
목표와 담당 경로: <이슈에서 합의한 범위>
먼저 상태를 확인하고 다른 사람의 변경을 보존해줘.
작업 전 최신 개인 원격과 main을 pull해줘. 미커밋 변경이 있으면 강행하지 마.
수정 계획과 확인 방법을 먼저 적고 내 담당 경로만 수정해줘.
커밋 전에도 원격을 확인해줘. 변경 중이면 fetch로 확인하고 본인 파일을 선택 커밋한 뒤 pull해줘.
commit 메시지는 type: 한국어 요약으로 작성해줘.
pull 후 검증하고 내 브랜치를 push한 뒤 main 대상 PR까지 만들어줘.
열린 내 PR이 있으면 중복 생성하지 말고 작업·확인·참고를 짧게 갱신해줘.
이슈에 PR 링크와 확인 결과를 남기고 검수를 요청해줘. 머지는 하지 마.
API 키는 출력·커밋하지 마. 배포와 유료 호출은 명시 승인 범위에서만 진행해줘.
```

## 키와 환경변수

실제 키는 로컬 `.env` 또는 `.env.local`과 승인된 배포 환경변수에만 둔다.
`.env.sample`은 변수 이름과 빈 값만 공유한다. 기존 로컬 파일을 덮어쓰지 않는다.
브라우저 HTML·JS·공개 변수에 비밀키를 넣지 않는다. 비밀 API 호출은 서버에서 처리한다.
노출됐으면 값 없이 경로만 알리고, 담당자 승인 후 제공자에서 폐기·재발급한다.
.gitignore는 이미 커밋한 키를 지우거나 모든 유출을 탐지하지 않는다.

## 통합·배포

정도연이 Git·PR 통합을 관리하고 김동규가 배포를 진행한다.
머지·배포·권한 변경·유료 호출은 사용자 명시 승인 범위에서만 실행한다.
문서만으로 브랜치 보호나 시크릿 스캔이 강제되는 것은 아니다.
