# 같이 만들기

Tab Zoo를 함께 개발하기 위한 안내입니다. 처음이라면 위에서부터 순서대로 읽으면 됩니다.

## 1. 준비

필요한 것: Git, Chrome(121 이상), Node.js 22 이상(테스트용).

```bash
git clone <저장소 주소>
cd tab-zoo
npm test
```

`npm install`은 필요 없습니다. 외부 패키지를 쓰지 않습니다.

그다음 `chrome://extensions` → **개발자 모드** 켜기 → **압축해제된 확장 프로그램을 로드** → `extension/` 폴더를 선택합니다.

## 2. 코드가 돌아가는 방식

```
background.js  ──기록──▶  chrome.storage.local  ──읽기──▶  popup.js  ──그리기──▶  popup.html
(서비스 워커)              (tabZooStateV1 등)                (팝업을 열 때마다)
```

- **[background.js](extension/background.js)**: 탭 전환·닫기·유휴 이벤트를 듣고, 도메인별 체류 시간(`totalMs`, `sessionsMs`)과 방문 시각(`visits`)을 저장합니다. 동물 종 배정과 초기화도 여기서 합니다. 시간 기준값은 파일 맨 위 상수에 있습니다.
- **[popup.js](extension/popup.js)**: 저장된 기록을 읽어 `visualFromMetrics()`로 성장 단계·크기·체형·졸림을 계산하고, `renderCreature()`로 맵에 그립니다. 파비콘 색 추출, 동물 설명(`summaryFor()`)도 여기 있습니다.
- **[sprite-art.js](extension/sprite-art.js)** + **[atlas-clips.js](extension/atlas-clips.js)**: 아틀라스 PNG에서 동물 그림을 잘라 색을 입힙니다. `atlas-clips.js`는 `tests/build-atlas-clips.ps1`로 생성하는 파일이니 직접 고치지 마세요.
- **[movement.js](extension/movement.js)**: 동물이 맵 위를 걷는 경로를 정합니다.

### 수정은 어디서

| 하고 싶은 것 | 고칠 곳 |
| --- | --- |
| 성장·수면 기준 시간 | `popup.js`의 `visualFromMetrics()` |
| 유휴 판정·기록 방식 | `background.js` 상단 상수와 이벤트 리스너 |
| 새 맵 | `popup.html`의 `<select id="map-theme">`에 옵션 추가 → `popup.js`의 `mapThemes`에 이름 추가 → `popup.css`에 `.zoo-map[data-theme="이름"]` 스타일 추가 |
| 새 동물 | 아래 체크리스트 |

### 새 동물 추가 체크리스트

1. 아틀라스 PNG에 그림 추가 → `tests/build-atlas-clips.ps1`로 `atlas-clips.js` 재생성 ([ARTWORK.md](extension/assets/ARTWORK.md) 참고)
2. `sprite-art.js`의 `spriteArt` 배열에 항목 추가
3. `background.js`와 `popup.js` **두 곳의** `species` 배열에 id 추가
4. `popup.js`의 `speciesNames`와 `summaryFor()`의 설명 추가
5. `npm test`

## 3. 작업 흐름

```bash
git switch main
git pull
git switch -c feat/새-맵        # 버그 수정이면 fix/..., 그 밖에는 chore/...
# 작업
npm test
git add -A
git commit -m "Add snowfield map"
git push -u origin feat/새-맵
```

그다음 GitHub에서 Pull Request를 엽니다.

- **리뷰**: 상대방 1명이 승인하면 PR 작성자가 **Squash and merge**로 합칩니다.
- **CI**: PR마다 GitHub Actions가 `npm test`를 돌립니다. 빨간불이면 합치지 않습니다.
- **main**에 직접 push하지 않습니다.
- 확장 코드를 고친 뒤에는 `chrome://extensions`에서 Tab Zoo의 새로고침(↻) 버튼을 눌러야 반영됩니다.

## 4. 규칙

- **버전은 릴리스할 때 저장소 주인만 올립니다.** PR에서는 `extension/manifest.json`의 `version`을 건드리지 마세요. 동시에 열린 PR끼리 충돌합니다.
- **저장 구조를 바꾸면 기존 데이터를 생각하세요.** `chrome.storage.local`에 저장되는 모양(키 이름, 필드)을 바꾸면 이미 쓰던 사람의 동물원이 깨질 수 있습니다. 바꿀 때는 읽는 쪽에서 옛 구조도 처리하거나, 종 배정 구조라면 `background.js`의 `SPECIES_STATE_VERSION`을 올려 초기화되게 하고 PR 설명에 적어 주세요.
- **실제 방문 기록을 올리지 마세요.** 이슈나 PR에 스크린샷을 붙일 때는 실제로 방문한 사이트가 보이지 않게 해 주세요. 동물 하나하나가 방문한 도메인입니다. `extension/map-preview.html`처럼 샘플 데이터로 그린 화면을 쓰면 안전합니다.
- **새 권한은 상의 후에.** `manifest.json`의 `permissions`를 늘리면 설치 경고가 바뀌고 [개인정보처리방침](extension/PRIVACY.md)도 고쳐야 합니다.

## 5. 디버깅

- 백그라운드 로그: `chrome://extensions` → Tab Zoo 카드의 **서비스 워커** 링크
- 팝업 로그: 팝업에서 우클릭 → **검사**
- 기록 초기화: 팝업 오른쪽 아래 ↻ 버튼(모든 동물과 기록 삭제)
- 성장을 확인하려면 실제로 시간이 지나야 합니다(최대 크기까지 2시간). 미리보기 페이지(`extension/*-preview.html`)로 그림만 먼저 확인할 수 있습니다.

## 6. 할 일 고르기

[Issues](../../issues)에서 `good first issue` 라벨이 붙은 것부터 시작하면 좋습니다.
