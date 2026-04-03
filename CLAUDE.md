# Claude Pets (ClaudeCo) - AI 컨텍스트 문서

> 이 문서는 다른 AI 모델이 이 프로젝트를 빠르게 이해하고 수정할 수 있도록 작성되었습니다.

---

## 프로젝트 개요

**Claude Pets**는 macOS 데스크톱 위를 돌아다니는 AI 펫 캐릭터 앱입니다.
각 캐릭터는 개발자, 디자이너, 기획자 등 전문 역할을 가지며, 채팅을 통해 AI와 대화할 수 있습니다.

- **플랫폼**: macOS (Electron 기반 데스크톱 앱)
- **렌더링**: HTML5 Canvas 픽셀아트 (80×64px, 4px 단위)
- **AI 지원**: Claude CLI, OpenAI API, Google Gemini API, Ollama (로컬)
- **언어**: JavaScript (CommonJS), HTML, CSS
- **프레임워크**: Electron 41.1.0 + electron-builder

---

## 아키텍처

```
┌───────────────────────────────────────────────────────┐
│                  Electron Main Process                │
│                      (main.js)                        │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐    │
│  │  Config  │  │   Tray   │  │   AI Providers    │    │
│  │ Manager  │  │  Menu    │  │ ├─ Claude CLI     │    │
│  │(JSON파일)│  │          │  │ ├─ OpenAI HTTPS   │    │
│  └─────────┘  └──────────┘  │ ├─ Gemini HTTPS   │    │
│                              │ └─ Ollama HTTP    │    │
│                              └───────────────────┘    │
│  ┌────────────────────────────────────────────────┐   │
│  │           IPC Handlers                         │   │
│  │  ai-send-message, ai-approve, ai-abort         │   │
│  │  get-config, save-config, get-file-tree         │   │
│  │  permission-needed, api-exhausted (이벤트)      │   │
│  └────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────┤
│               Preload Bridge (preload.js)             │
│          contextBridge → window.electronAPI            │
├───────────────────────────────────────────────────────┤
│               Renderer Process                        │
│  ┌────────────────────┐  ┌────────────────────────┐   │
│  │    App (app.js)    │  │   Pet (pet.js)         │   │
│  │ ├─ 채팅 패널       │  │ ├─ PixelPet (렌더러)   │   │
│  │ ├─ 모델 선택       │  │ │  └─ Canvas 픽셀아트  │   │
│  │ ├─ 파일 트리       │  │ ├─ Pet (캐릭터 로직)   │   │
│  │ ├─ 패널 관리       │  │ │  ├─ idle/walk/talk   │   │
│  │ ├─ 권한승인 처리   │  │ │  ├─ jump (권한승인)  │   │
│  │ └─ API소진 처리    │  │ │  └─ faint (API소진)  │   │
│  └────────────────────┘  └────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │                 index.html                       │  │
│  │  #world, #control-panel, #chat-panel,            │  │
│  │  #modal-overlay, #settings-overlay               │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

---

## 파일별 상세 설명

### `main.js` — Electron 메인 프로세스

| 항목 | 설명 |
|------|------|
| 역할 | 앱 윈도우 생성, 시스템 트레이, AI 통신, IPC 처리 |
| 줄 수 | ~370줄 |

**주요 함수:**

- `loadConfig()` / `saveConfig(config)` — `userData/config.json`에서 API 키, 기본 모델 설정 관리
- `createWindow()` — 투명 + 항상 위 + 마우스 통과 Electron 윈도우 생성
- `createTray()` — 시스템 트레이 메뉴 (컨트롤 패널, 모여라/흩어져라, 설정 등)
- `sendClaude(petId, systemPrompt, message, model)` — Claude CLI를 spawn하여 실행. `--output-format stream-json --verbose` 사용. `--no-input` 미사용 (권한 승인 인터랙션 지원)
- `sendOpenAI(...)` — OpenAI API HTTPS 스트리밍 호출
- `sendGemini(...)` — Google Gemini API HTTPS 호출
- `sendOllama(...)` — 로컬 Ollama HTTP 스트리밍 호출
- `detectPermissionNeeded(parsed)` — 스트림 데이터에서 `tool_use`, `input_request` 등 권한 요청 감지
- `isApiExhausted(errorText)` — rate_limit, quota, 429 등 API 소진 패턴 감지
- `ensureChatDir()` — 작업 폴더 내 `Chat/` 디렉토리 자동 생성
- `formatTimestamp(date)` — `YYYYMMDD-HHMMSS` 형식 타임스탬프 생성

**IPC 핸들러:**

| 채널 | 방향 | 설명 |
|------|------|------|
| `ai-send-message` | renderer→main | AI에게 메시지 전송 (provider/model 포함) |
| `ai-approve` | renderer→main | Claude CLI stdin에 "y\n" 전송 (권한 승인) |
| `ai-abort` | renderer→main | 진행 중인 AI 프로세스 중단 |
| `ai-stream` | main→renderer | AI 응답 스트리밍 데이터 |
| `ai-stream-end` | main→renderer | AI 응답 완료 |
| `permission-needed` | main→renderer | 권한 승인 필요 알림 |
| `api-exhausted` | main→renderer | API 소진 알림 |
| `get-config` / `save-config` | 양방향 | 설정 읽기/쓰기 |
| `get-file-tree` | renderer→main | 디렉토리 트리 조회 |
| `start-chat-log` | renderer→main | 협업 채팅 로그 파일 생성 (`Chat/Chat-YYYYMMDD-HHMMSS.md`) |
| `append-chat-log` | renderer→main | 협업 채팅 로그에 한 줄 추가 |

**프로세스 관리:**
- `activeProcesses` Map에 petId별로 프로세스 저장
- Claude CLI는 `{ proc, waitingPermission, permissionTimer }` 구조
- 앱 종료 시 모든 프로세스 정리

---

### `app.js` — 프론트엔드 메인 컨트롤러

| 항목 | 설명 |
|------|------|
| 역할 | UI 관리, 펫 생성/삭제, 채팅, 모델 선택, 이벤트 처리 |
| 클래스 | `App` |
| 줄 수 | ~480줄 |

**주요 프로퍼티:**

```javascript
this.pets = [];               // Pet 객체 배열
this.activePet = null;        // 현재 채팅 중인 펫
this.aiProvider = 'claude';   // 선택된 AI 제공자
this.aiModel = '';            // 선택된 모델명
this.isStreaming = false;     // AI 응답 수신 중 여부
this.isApiExhausted = false;  // API 소진 상태
this.collabSessionId = null;  // 현재 협업 세션 ID (중복 방지)
this.collabTimers = [];       // 협업 타이머 핸들 목록
this.collabLogFile = null;    // 현재 협업 로그 파일 경로
```

**핵심 기능:**

1. **AI 모델 선택** — `toggleModelDropdown()`, `selectModel(provider, model, label)`, `updateModelSelector()`
   - 채팅 패널 상단 드롭다운으로 모델 변경
   - 선택값은 config에 자동 저장

2. **채팅 시스템** — `sendMessage()`, `handleStreamData(data)`, `finishStreaming()`
   - 사용자 메시지 → AI 호출 → 스트리밍 응답 렌더링
   - `renderMarkdown(text)`: 코드블록, 볼드, 이탤릭, 헤더, 리스트 변환

3. **권한 승인 처리** — `onPermissionNeeded` 이벤트 수신
   - 해당 펫에 `startJumping()` 호출
   - 펫 클릭 시 `electronAPI.approvePermission(petId)` 전송

4. **API 소진 처리** — `handleApiExhausted(reason)`
   - 모든 펫에 `faint()` 호출
   - 5초 후 `revive()`로 자동 회복

5. **설정 모달** — `openSettings()`, `saveSettings()`
   - OpenAI/Gemini API 키, Ollama URL 입력

6. **협업 채팅 (모여라 시)** — `startGatherChat()`, `buildCollabLines()`, `stopGatherChat()`
   - 모여라 실행 시 세션 ID 발급 → 중복 실행 방지
   - `buildCollabLines()`: 펫들의 랜덤 대사 목록 생성 (talk/think/work 3종류)
   - 대사마다 `pet.showChat()` 또는 `pet.startThinking()` 호출
   - 모든 대사가 끝나면 재귀적으로 `startGatherChat()` 재호출
   - 로그 파일을 `Chat/Chat-YYYYMMDD-HHMMSS.md`에 자동 저장
   - `loadConfig()`에서 구 `codex` provider를 `claude`로 자동 마이그레이션

---

### `pet.js` — 캐릭터 렌더링 & 애니메이션

| 항목 | 설명 |
|------|------|
| 역할 | 픽셀아트 캐릭터 그리기, 상태 관리, 이동, 인터랙션 |
| 클래스 | `PixelPet`, `Pet` |
| 줄 수 | ~360줄 |

#### PixelPet 클래스 (Canvas 렌더러)

| 속성 | 값 | 설명 |
|------|-----|------|
| width | 80px | 캔버스 너비 |
| height | 64px | 캔버스 높이 |
| p | 4px | 한 픽셀 단위 크기 (20×16 그리드) |

**`draw(ctx, frame, direction, state)` 렌더링 로직:**

```
상태별 렌더링:
├─ idle:  정지 상태, 눈 깜빡임 (80프레임마다)
├─ walk:  다리 교차 애니메이션 + 상하 바운스
├─ talk:  입 벌림 애니메이션 (8프레임 토글)
├─ jump:  큰 수직 바운스 + 반짝이는 눈 하이라이트
├─ think: 반쯤 감긴 눈 (눈꺼풀 픽셀) + 작은 입
└─ faint: 회색 변환 + X자 빨간 눈 + 빨간 입 + 다리 벌어짐
```

**캐릭터 구조 (픽셀 좌표):**
```
        [3,4][4,4]                    [15,4][16,4]     ← 왼쪽/오른쪽 귀
        [3,5][4,5]                    [15,5][16,5]
              [5,2]~~~~~~~~~~~~~~~~~[14,2]              ← 몸통 상단 (하이라이트)
              [5,3]                 [14,3]
              [5,4]  [7,5][8,5]  [11,5][12,5]  [14,4]  ← 눈 (2x2)
              [5,5]  [7,6][8,6]  [11,6][12,6]  [14,5]
              [5,6]                 [14,6]
              [5,7]                 [14,7]
              [5,8]     [9,8][10,8]            [14,8]   ← 입
              [5,9]~~~~~~~~~~~~~~~~~[14,9]              ← 몸통 하단 (그림자)
               [6,10]  [8,10]  [11,10]  [13,10]        ← 다리 4개 (각 3px 높이)
               [6,11]  [8,11]  [11,11]  [13,11]
               [6,12]  [8,12]  [11,12]  [13,12]
```

**색상 시스템:**
- `base`: 사용자 선택 색상 (8가지 프리셋)
- `dark`: base에서 20% 어둡게 (그림자, 다리)
- `light`: base에서 15% 밝게 (상단 하이라이트)
- `grayscale()`: 기절 시 회색 변환 (R×0.3 + G×0.59 + B×0.11)

#### Pet 클래스 (캐릭터 로직)

**상태 머신:**
```
idle ──(12% 확률)──────────────────→ think ──(타이머 만료)──→ idle
idle ──(랜덤 이동 결정)────────────→ walk
walk ──(목표 도달)─────────────────→ idle
idle/walk ──(채팅)─────────────────→ talk ──(3초 후)──→ idle
idle/walk ──(권한요청)─────────────→ jump ──(클릭/완료)──→ idle
idle/walk/talk ──(API소진)─────────→ faint ──(5초 후 revive)──→ idle
```

**주요 메서드:**

| 메서드 | 설명 |
|--------|------|
| `startJumping()` | jump 상태 진입, CSS 클래스 추가, 승인 버블 표시 |
| `stopJumping()` | jump 해제, idle 복귀 |
| `startThinking(durationMs, text)` | think 상태 진입, 타이머 후 자동 해제 |
| `faint()` | 기절 상태, 회색화, X눈, 움직임 중단 |
| `revive()` | 기절 해제, 색상 복원 |
| `onClick()` | 점프 중이면 권한 승인, 아니면 채팅 패널 열기 |
| `showChat(text)` | 3초간 말풍선 표시 |
| `getThinkingChat()` | 역할별 고민 대사 반환 |
| `getWorkingChat()` | 역할별 작업 중 대사 반환 |
| `getCollabLine(kind)` | `talk`/`think`/`work` 종류별 협업 대사 반환 |
| `update(time, w, h)` | 매 프레임 호출: 이동, 경계체크, Canvas 렌더링 |
| `setTarget(x, y)` | 이동 목표 좌표 설정 |

---

### `preload.js` — IPC 브릿지

| 항목 | 설명 |
|------|------|
| 역할 | contextBridge로 main↔renderer 간 안전한 통신 제공 |
| 줄 수 | ~40줄 |

**노출 API (`window.electronAPI`):**

```javascript
// 마우스 제어
setIgnoreMouse(ignore: boolean)

// 트레이 이벤트 수신
onTogglePanel(callback), onGather(callback), onScatter(callback)
onAddPet(callback), onOpenSettings(callback), onWorkingDirChanged(callback)

// AI 통신
sendMessage(petId, role, message, aiProvider, model) → Promise
onStream(callback)      // { petId, data } 수신
onStreamEnd(callback)   // { petId } 수신
abortMessage(petId)

// 권한 승인
approvePermission(petId)
onPermissionNeeded(callback)  // { petId } 수신

// API 소진
onApiExhausted(callback)      // { reason } 수신

// 설정
getConfig() → Promise<config>
saveConfig(config) → Promise

// 파일시스템
getFileTree(dirPath) → Promise<tree[]>
selectWorkingDirectory() → Promise<string|null>
getWorkingDirectory() → Promise<string>

// 협업 채팅 로그
startChatLog(participants: string[]) → Promise<string|null>  // 파일경로 반환
appendChatLog(filePath: string, line: string) → Promise<boolean>
```

---

### `prompts.js` — 역할별 시스템 프롬프트

| 역할 | 키 | 설명 |
|------|-----|------|
| 개발자 | `developer` | 시니어 소프트웨어 개발자, 클린 코드, 구현, 디버깅 |
| 디자이너 | `designer` | UI/UX 디자이너, 사용자 경험, 시각 디자인 |
| 기획자 | `planner` | 테크니컬 PM, 일정, 요구사항, 작업 분류 |
| 디버거 | `debugger` | 에러 분석, 이슈 추적, 근본 원인 분석 |
| 리뷰어 | `reviewer` | 코드 품질, 보안, 성능, 유지보수성 |
| 테스터 | `tester` | QA, 테스트 케이스, 엣지 케이스, 커버리지 |

모든 프롬프트는 한국어 응답을 지시합니다.

---

### `index.html` — UI 마크업

**5개 영역:**

1. **`#world`** — 펫 렌더링 캔버스 공간 (전체 화면)
2. **`#control-panel`** — 펫 리스트, 모여라/흩어져라 버튼 (우측 상단)
3. **`#chat-panel`** — AI 채팅 패널 (우측 사이드바, 420px)
   - 모델 선택 드롭다운 (Claude/OpenAI/Gemini/Ollama, 총 10개 모델)
   - 채팅/파일 탭 전환
   - 작업 폴더 표시
   - 메시지 입력 + 전송 버튼
4. **`#modal-overlay`** — 새 펫 만들기 모달 (이름, 역할, 색상 8종)
5. **`#settings-overlay`** — AI 설정 모달 (API 키 입력)

**사용 가능한 AI 모델 (드롭다운):**

| 제공자 | 모델 | data-provider | data-model |
|--------|------|--------------|------------|
| Claude | 기본 모델 | `claude` | `""` |
| Claude | Sonnet 4.6 | `claude` | `claude-sonnet-4-6` |
| Claude | Opus 4.6 | `claude` | `claude-opus-4-6` |
| Claude | Haiku 4.5 | `claude` | `claude-haiku-4-5-20251001` |
| OpenAI | GPT-4o | `openai` | `gpt-4o` |
| OpenAI | GPT-4o Mini | `openai` | `gpt-4o-mini` |
| OpenAI | o3 | `openai` | `o3` |
| Gemini | 2.0 Flash | `gemini` | `gemini-2.0-flash` |
| Gemini | 2.5 Pro | `gemini` | `gemini-2.5-pro` |
| Ollama | Llama 3 | `ollama` | `llama3` |
| Ollama | CodeLlama | `ollama` | `codellama` |
| Ollama | Mistral | `ollama` | `mistral` |

---

### `style.css` — 전체 스타일링

| 섹션 | 설명 |
|------|------|
| 펫 캐릭터 | `.pet`, `.pet-name-tag`, `.pet-role-tag`, `.pet-shadow` |
| 점프 애니메이션 | `.pet-jumping` → `@keyframes petJump` (0.5s, translateY -20px) |
| 기절 애니메이션 | `.pet-fainted` → `@keyframes petFaint` (0.6s, rotate 90deg) |
| 승인 버블 | `.approval-bubble` → 오렌지 그라데이션, 펄스 애니메이션 |
| 채팅 버블 | `.chat-bubble` → fadeIn/fadeOut (3초) |
| 컨트롤 패널 | `#control-panel` → 글래스모피즘, 다크 테마 |
| 채팅 패널 | `#chat-panel` → 420px 고정 사이드바 |
| 모델 드롭다운 | `.model-selector-bar`, `.model-dropdown` → 절대 위치, 그룹 레이블 |
| 메시지 | `.chat-msg.user` (오렌지), `.chat-msg.assistant` (반투명), `.chat-msg.error` (빨강) |
| 모달 | `#modal-overlay`, `#settings-overlay` → 풀스크린 오버레이, 블러 배경 |
| 파일 트리 | `.file-item`, `.file-children` → 확장 가능 트리 |
| 모임 효과 | `.gathering-circle` → 점선 원, 펄스 애니메이션 |

---

### `package.json` — 프로젝트 설정

```json
{
  "name": "claude-pets",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder --mac"
  },
  "build": {
    "appId": "com.example.claudepets",
    "productName": "Claude Pets",
    "mac": {
      "category": "public.app-category.utilities",
      "icon": "icon.icns",
      "target": ["dir"]
    }
  }
}
```

---

## 협업 채팅 로그

모여라 실행 시 작업 폴더 내에 `Chat/` 디렉토리가 자동 생성되고, 협업 대화 내역이 Markdown 파일로 저장됩니다.

```
{workingDirectory}/Chat/Chat-20260330-153000.md
```

**파일 형식:**
```markdown
# Pet Collaboration Chat

Date: 2026. 3. 30. 오후 3:30:00
Participants: 클로디(개발자), 소닉(디자이너), 하이쿠(기획자)

---

[15:30:01] 클로디(개발자): 아키텍처 논의해요
[15:30:03] 소닉(디자이너): 레이아웃 다시 고민중
[15:30:05] 하이쿠(기획자): 일정 조율하자!
```

---

## 주요 데이터 흐름

### 1. 채팅 메시지 전송

```
사용자 입력 → app.sendMessage()
  → electronAPI.sendMessage(petId, role, text, aiProvider, aiModel)
  → [preload IPC] → main.js ai-send-message 핸들러
  → switch(aiProvider) → sendClaude/sendOpenAI/sendGemini/sendOllama
  → 스트리밍 응답 → mainWindow.send('ai-stream', {petId, data})
  → [preload IPC] → app.handleStreamData(data)
  → 마크다운 렌더링 → 채팅 패널에 표시
  → 완료 시 ai-stream-end → app.finishStreaming()
```

### 2. 권한 승인 (Claude CLI)

```
Claude CLI tool_use 이벤트 감지 (main.js detectPermissionNeeded)
  → 800ms 딜레이 후 mainWindow.send('permission-needed', {petId})
  → [preload IPC] → app → pet.startJumping()
  → 펫 점프 애니메이션 + "🔐 클릭하여 승인!" 버블
  → 사용자가 펫 클릭 → pet.onClick() → onPermissionApprove()
  → electronAPI.approvePermission(petId)
  → [preload IPC] → main.js → proc.stdin.write('y\n')
  → Claude CLI 실행 재개
```

### 3. API 소진 처리

```
AI 응답에서 에러 감지 (rate_limit, quota, 429 등)
  → main.js isApiExhausted() → emitApiExhausted(reason)
  → mainWindow.send('api-exhausted', {reason})
  → [preload IPC] → app.handleApiExhausted()
  → 모든 펫 pet.faint(): 회색화 + X눈 + rotate(90deg) + "💀 API 소진..."
  → 5초 후 자동 pet.revive(): 색상 복원 + "다시 살아났다! ✨"
```

---

## 사용 가능한 색상 프리셋

| Hex | 색상명 |
|-----|--------|
| `#C4836A` | 탄/브라운 |
| `#6A9EC4` | 블루 |
| `#8BC46A` | 그린 |
| `#C46AB8` | 마젠타 |
| `#C4B86A` | 옐로우/탄 |
| `#6AC4B8` | 시안 |
| `#C46A6A` | 레드 |
| `#8A6AC4` | 퍼플 |

---

## 기본 생성 펫

| 이름 | 역할 | 색상 |
|------|------|------|
| 클로디 | developer | #C4836A |
| 소닉 | designer | #6A9EC4 |
| 하이쿠 | planner | #8BC46A |

---

## 설정 파일

경로: `{userData}/config.json`

```json
{
  "apiKeys": {
    "openai": "sk-...",
    "gemini": "AI..."
  },
  "defaultAI": "claude",
  "defaultModel": "",
  "ollamaUrl": "http://localhost:11434"
}
```

---

## 빌드 & 실행

```bash
# 개발 실행
npm start

# macOS 앱 빌드
npm run build
# → dist/mac-arm64/Claude Pets.app
```

---

## 수정 시 참고사항

- `preload.js`의 IPC 채널명은 `main.js`의 핸들러와 **정확히 일치**해야 합니다
- 새 AI 제공자 추가 시: `main.js`에 send함수, `preload.js`에 채널, `index.html`에 드롭다운 옵션, `app.js`의 `selectModel()`에 라벨 추가
- 새 펫 상태 추가 시: `pet.js`의 `PixelPet.draw()`와 `Pet.update()`에 분기, `style.css`에 CSS 클래스/애니메이션 추가
- 새 역할 추가 시: `prompts.js`에 프롬프트, `pet.js`의 `getRoleName()/getRandomGreeting()/getGatheringChat()`에 항목 추가, `index.html`의 select 옵션 추가
