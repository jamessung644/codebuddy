// 언어 설정 (전역)
let petLanguage = 'ko';

// i18n 문자열
const PET_I18N = {
  ko: {
    roleName: {
      developer: '개발자', designer: '디자이너', planner: '기획자',
      debugger: '디버거', reviewer: '리뷰어', tester: '테스터'
    },
    greetings: {
      developer: ['코드 짜는 중~', 'git push 완료!', '버그 아닌 기능이야', '리팩토링 하고 싶다...', 'PR 올렸어요!', '테스트 통과! ✨'],
      designer: ['이 색 조합 어때?', '패딩을 좀 더...', '피그마 열어볼게', '사용자 경험이 중요해!', 'UI 수정 완료~', '이 폰트 이쁘지?'],
      planner: ['일정 확인해볼게', '스프린트 시작!', '요구사항 정리 중~', '회의 시간이야!', 'KPI 달성했어!', '로드맵 업데이트!'],
      debugger: ['버그 찾았다!', 'console.log 추가~', '이거 왜 되지...?', '재현 성공!', '스택트레이스 분석 중', '핫픽스 나갑니다!'],
      reviewer: ['LGTM! 👍', '여기 수정해주세요', '코드 리뷰 시작!', '네이밍 다시 한번...', '이 로직 맞아?', '승인!'],
      tester: ['테스트 케이스 작성 중', 'QA 시작!', '엣지 케이스 발견!', '회귀 테스트 통과~', '버그 리포트 작성!', '자동화 테스트 추가!']
    },
    gathering: {
      developer: ['이 부분 같이 보자!', '아키텍처 논의해요', 'API 스펙 맞춰볼까?', '코드 리뷰 부탁!', '머지 충돌 해결 좀...'],
      designer: ['디자인 시안 봐줘!', '이 컴포넌트 어때?', 'UX 플로우 확인!', '색상 팔레트 정했어', '반응형 체크 좀~'],
      planner: ['일정 조율하자!', '이번 스프린트 목표는...', '우선순위 정하자', '데일리 스크럼!', '데모 준비해야 해'],
      debugger: ['이 에러 봤어?', '로그 같이 분석하자', '이거 재현돼?', '프로파일링 결과...', '메모리 릭 같은데...'],
      reviewer: ['이 PR 좀 봐줘', '컨벤션 논의하자', '아 이거 좋은 패턴이다', '타입 안전성 체크!', '이건 approve!'],
      tester: ['테스트 결과 공유!', '커버리지 올려야 해', 'E2E 실패했어', '시나리오 검토 좀!', '성능 테스트 해볼까?']
    },
    thinking: {
      developer: ['설계 잠깐 고민중...', '이 로직 맞나?', '구조 다시 생각해볼게'],
      designer: ['레이아웃 다시 고민중', '톤앤매너 정리할게', '간격을 좀 더 볼까?'],
      planner: ['우선순위 재정리 중', '리스크 체크...', '일정 다시 계산중'],
      debugger: ['원인 추적 중...', '이 스택 어디서 왔지', '재현 방법 고민중'],
      reviewer: ['리뷰 포인트 정리 중', '이 부분 더 살펴볼게', '패턴 확인중'],
      tester: ['테스트 시나리오 생각중', '엣지 케이스 떠올리는 중', '재현 조건 체크중']
    },
    working: {
      developer: ['코드 작성 중...', '리팩토링 하는 중', '버그 수정 중'],
      designer: ['와이어프레임 만드는 중', '아이콘 다듬는 중', '디자인 시스템 적용 중'],
      planner: ['요구사항 문서 작성 중', '스프린트 계획 중', '일정표 업데이트 중'],
      debugger: ['로그 분석 중', '브레이크포인트 걸었어', '핫픽스 준비 중'],
      reviewer: ['코드 리뷰 중', '성능 체크 중', '보안 관점 확인 중'],
      tester: ['테스트 케이스 추가 중', '회귀 테스트 돌리는 중', '버그 리포트 작성 중']
    },
    wave: {
      developer: ['야호! 🎉', '빌드 성공! 🚀', '머지됐다! 🎊'],
      designer: ['짜잔~ ✨', '완성! 🎨', '오케이 굿! 👍'],
      planner: ['목표 달성! 🎯', '킥오프! 🚀', '화이팅! 💪'],
      debugger: ['버그 잡았다! 🐛✅', '해결! 🎊', '완벽해!'],
      reviewer: ['Approve! ✅', 'LGTM!! 👍', '완벽한 코드!'],
      tester: ['올 그린! 🟢', '테스트 통과! ✅', '완벽한 QA!']
    },
    approve: '승인 완료! ✅',
    denied: '거부됨 ❌',
    permissionRequest: '🔐 권한 요청',
    approveBtn: '✅ 승인',
    denyBtn: '❌ 거부',
    apiExhausted: '💀 API 소진...',
    revived: '다시 살아났다! ✨',
    thinkingBubble: '🤔 생각 중...'
  },
  en: {
    roleName: {
      developer: 'Developer', designer: 'Designer', planner: 'Planner',
      debugger: 'Debugger', reviewer: 'Reviewer', tester: 'Tester'
    },
    greetings: {
      developer: ['Writing code~', 'git push done!', "It's a feature, not a bug", 'Want to refactor...', 'PR submitted!', 'Tests passed! ✨'],
      designer: ['How about this color?', 'Need more padding...', "Let me open Figma", 'UX matters!', 'UI update done~', 'Nice font, right?'],
      planner: ['Checking schedule', 'Sprint start!', 'Organizing requirements~', 'Meeting time!', 'KPI achieved!', 'Roadmap updated!'],
      debugger: ['Found a bug!', 'Adding console.log~', 'Why does this work...?', 'Reproduced it!', 'Analyzing stack trace', 'Hotfix incoming!'],
      reviewer: ['LGTM! 👍', 'Please fix this', 'Code review time!', 'Rethink the naming...', 'Is this logic right?', 'Approved!'],
      tester: ['Writing test cases', 'QA started!', 'Edge case found!', 'Regression tests passed~', 'Bug report filed!', 'Added automation tests!']
    },
    gathering: {
      developer: ["Let's look at this together!", "Let's discuss architecture", 'Align on API spec?', 'Code review please!', 'Merge conflict help...'],
      designer: ['Check this design!', 'How about this component?', 'UX flow review!', 'Color palette is set', 'Responsive check please~'],
      planner: ["Let's sync on schedule!", 'Sprint goal is...', "Let's prioritize", 'Daily standup!', 'Demo prep needed'],
      debugger: ['Seen this error?', "Let's analyze logs together", 'Can you reproduce this?', 'Profiling results...', 'Looks like a memory leak...'],
      reviewer: ['Review this PR please', "Let's discuss conventions", 'Oh this is a good pattern', 'Type safety check!', 'This one is approved!'],
      tester: ['Sharing test results!', 'Need more coverage', 'E2E failed', 'Review scenarios please!', 'Performance test?']
    },
    thinking: {
      developer: ['Thinking about design...', 'Is this logic right?', 'Reconsidering structure'],
      designer: ['Rethinking layout', 'Refining tone & manner', 'Checking spacing more'],
      planner: ['Re-prioritizing', 'Risk check...', 'Recalculating timeline'],
      debugger: ['Tracing the cause...', 'Where did this stack come from', 'Thinking about repro steps'],
      reviewer: ['Organizing review points', "Let me look closer", 'Checking patterns'],
      tester: ['Thinking about test scenarios', 'Coming up with edge cases', 'Checking repro conditions']
    },
    working: {
      developer: ['Writing code...', 'Refactoring', 'Fixing bugs'],
      designer: ['Making wireframes', 'Polishing icons', 'Applying design system'],
      planner: ['Writing requirements', 'Planning sprint', 'Updating schedule'],
      debugger: ['Analyzing logs', 'Set a breakpoint', 'Preparing hotfix'],
      reviewer: ['Reviewing code', 'Performance check', 'Security review'],
      tester: ['Adding test cases', 'Running regression tests', 'Writing bug report']
    },
    wave: {
      developer: ['Yay! 🎉', 'Build success! 🚀', 'Merged! 🎊'],
      designer: ['Ta-da~ ✨', 'Done! 🎨', 'Looks good! 👍'],
      planner: ['Goal achieved! 🎯', 'Kickoff! 🚀', "Let's go! 💪"],
      debugger: ['Bug squashed! 🐛✅', 'Solved! 🎊', 'Perfect!'],
      reviewer: ['Approve! ✅', 'LGTM!! 👍', 'Perfect code!'],
      tester: ['All green! 🟢', 'Tests passed! ✅', 'Perfect QA!']
    },
    approve: 'Approved! ✅',
    denied: 'Denied ❌',
    permissionRequest: '🔐 Permission Request',
    approveBtn: '✅ Approve',
    denyBtn: '❌ Deny',
    apiExhausted: '💀 API Exhausted...',
    revived: "I'm back! ✨",
    thinkingBubble: '🤔 Thinking...'
  }
};

function getI18n() {
  return PET_I18N[petLanguage] || PET_I18N.ko;
}

function setLanguage(lang) {
  petLanguage = lang;
}

// 픽셀 아트 펫 캐릭터 (사진 기반 - 넓고 납작한 몸통, 옆 귀, 4다리)
class PixelPet {
  constructor(color) {
    this.color = color;
    this.width = 80;
    this.height = 64;
    this.p = 4;
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  darken(hex, amount) {
    const { r, g, b } = this.hexToRgb(hex);
    const f = 1 - amount;
    return `rgb(${Math.floor(r * f)},${Math.floor(g * f)},${Math.floor(b * f)})`;
  }

  lighten(hex, amount) {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amount))},${Math.min(255, Math.floor(g + (255 - g) * amount))},${Math.min(255, Math.floor(b + (255 - b) * amount))})`;
  }

  // 색상을 회색으로 만들기 (기절 상태)
  grayscale(hex) {
    const { r, g, b } = this.hexToRgb(hex);
    const gray = Math.floor(r * 0.3 + g * 0.59 + b * 0.11);
    return `rgb(${gray},${gray},${gray})`;
  }

  draw(ctx, frame = 0, direction = 1, state = 'idle') {
    const p = this.p;
    const isFainted = state === 'faint';
    const isThinking = state === 'think';
    const base = isFainted ? this.grayscale(this.color) : this.color;
    const dark = isFainted ? this.darken(this.grayscale(this.color), 0.2) : this.darken(this.color, 0.2);
    const light = isFainted ? this.lighten(this.grayscale(this.color), 0.15) : this.lighten(this.color, 0.15);
    const eye = '#1a1a1a';

    ctx.clearRect(0, 0, this.width, this.height);

    let bounce = 0;
    if (state === 'walk')  bounce = Math.sin(frame * 0.3) * 1.5;
    else if (state === 'run')   bounce = Math.sin(frame * 0.55) * 2.5;
    else if (state === 'jump')  bounce = -Math.abs(Math.sin(frame * 0.15)) * 8;
    else if (state === 'sit')   bounce = 1; // 살짝 내려앉음
    const oy = Math.round(bounce);

    ctx.save();
    if (direction < 0) {
      ctx.translate(this.width, 0);
      ctx.scale(-1, 1);
    }

    const px = (x, y, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x * p, y * p, p, p);
    };

    // === 몸통 (넓고 납작한 사각형) ===
    for (let y = 2; y <= 9; y++) {
      for (let x = 5; x <= 14; x++) {
        px(x, y + oy, base);
      }
    }

    // 상단 하이라이트
    for (let x = 6; x <= 13; x++) {
      px(x, 2 + oy, light);
    }

    // 하단 그림자
    for (let x = 5; x <= 14; x++) {
      px(x, 9 + oy, dark);
    }

    // === 귀 (몸통 옆쪽 중간에서 수평으로 돌출) ===
    if (state === 'wave') {
      // 왼쪽 귀 들어올리기 (흔들기)
      const earBob = Math.floor(frame / 8) % 2 === 0 ? -1 : 0;
      px(3, 3 + oy + earBob, base);
      px(4, 3 + oy + earBob, base);
      px(3, 4 + oy + earBob, base);
      px(4, 4 + oy + earBob, base);
      // 오른쪽 귀 일반
      px(15, 4 + oy, base);
      px(16, 4 + oy, base);
      px(15, 5 + oy, base);
      px(16, 5 + oy, base);
    } else {
      px(3, 4 + oy, base);
      px(4, 4 + oy, base);
      px(3, 5 + oy, base);
      px(4, 5 + oy, base);
      px(15, 4 + oy, base);
      px(16, 4 + oy, base);
      px(15, 5 + oy, base);
      px(16, 5 + oy, base);
    }

    // === 눈 ===
    if (isFainted) {
      // X 눈 (기절)
      px(7, 5 + oy, '#ff4444');
      px(8, 6 + oy, '#ff4444');
      px(8, 5 + oy, '#ff4444');
      px(7, 6 + oy, '#ff4444');

      px(11, 5 + oy, '#ff4444');
      px(12, 6 + oy, '#ff4444');
      px(12, 5 + oy, '#ff4444');
      px(11, 6 + oy, '#ff4444');
    } else if (state === 'jump') {
      // 반짝이는 눈 (점프 중 - 열린 눈)
      px(7, 5 + oy, eye);
      px(8, 5 + oy, eye);
      px(7, 6 + oy, eye);
      px(8, 6 + oy, eye);
      // 흰색 하이라이트 (반짝)
      if (frame % 10 < 5) {
        px(8, 5 + oy, '#ffffff');
        px(12, 5 + oy, '#ffffff');
      }

      px(11, 5 + oy, eye);
      px(12, 5 + oy, eye);
      px(11, 6 + oy, eye);
      px(12, 6 + oy, eye);
    } else if (isThinking) {
      // 고민 중 - 반쯤 감긴 눈
      px(7, 5 + oy, eye);
      px(8, 5 + oy, eye);
      px(11, 5 + oy, eye);
      px(12, 5 + oy, eye);
      // 눈꺼풀
      px(7, 4 + oy, dark);
      px(8, 4 + oy, dark);
      px(11, 4 + oy, dark);
      px(12, 4 + oy, dark);
    } else if (state === 'wave') {
      // 신난 눈 (^^ 형태)
      px(7, 6 + oy, eye);
      px(8, 5 + oy, eye);
      px(11, 6 + oy, eye);
      px(12, 5 + oy, eye);
      // 눈 위 하이라이트
      px(8, 4 + oy, light);
      px(12, 4 + oy, light);
    } else if (state === 'sit') {
      // 앉아서 편안한 눈 (살짝 반쯤 감김)
      px(7, 5 + oy, eye);
      px(8, 5 + oy, eye);
      px(11, 5 + oy, eye);
      px(12, 5 + oy, eye);
      // 눈 깜빡임 더 자주
      if (frame % 40 > 36) {
        px(7, 5 + oy, base); px(8, 5 + oy, base);
        px(11, 5 + oy, base); px(12, 5 + oy, base);
      }
    } else {
      // 일반 눈
      px(7, 5 + oy, eye);
      px(8, 5 + oy, eye);
      px(7, 6 + oy, eye);
      px(8, 6 + oy, eye);

      px(11, 5 + oy, eye);
      px(12, 5 + oy, eye);
      px(11, 6 + oy, eye);
      px(12, 6 + oy, eye);

      // 눈 깜빡임
      if (frame % 80 > 74) {
        px(7, 5 + oy, base); px(8, 5 + oy, base);
        px(11, 5 + oy, base); px(12, 5 + oy, base);
      }
    }

    // === 입 ===
    if (isFainted) {
      // 파도 입 (기절)
      px(9, 8 + oy, '#ff4444');
      px(10, 8 + oy, '#ff4444');
    } else if (isThinking) {
      px(9, 8 + oy, dark);
    } else if (state === 'talk' && Math.floor(frame / 8) % 2 === 0) {
      px(9, 8 + oy, dark);
      px(10, 8 + oy, dark);
    } else if (state === 'jump') {
      // 점프 중 - 웃는 입
      px(9, 8 + oy, dark);
      px(10, 8 + oy, dark);
    } else if (state === 'wave') {
      // 흥분한 큰 웃음
      px(8, 8 + oy, dark);
      px(9, 9 + oy, dark);
      px(10, 9 + oy, dark);
      px(11, 8 + oy, dark);
    } else if (state === 'sit') {
      // 만족스러운 작은 입
      px(9, 8 + oy, dark);
    }

    // === 다리 (4개) ===
    if (isFainted) {
      // 기절: 다리가 축 처짐 (약간 벌어짐)
      px(5, 10 + oy, dark); px(5, 11 + oy, dark); px(5, 12 + oy, dark);
      px(7, 10 + oy, dark); px(7, 11 + oy, dark); px(7, 12 + oy, dark);
      px(12, 10 + oy, dark); px(12, 11 + oy, dark); px(12, 12 + oy, dark);
      px(14, 10 + oy, dark); px(14, 11 + oy, dark); px(14, 12 + oy, dark);
    } else if (state === 'sit') {
      // 앉은 자세: 짧고 옆으로 퍼진 다리
      px(5, 10 + oy, dark); px(4, 11 + oy, dark);   // 앞왼쪽 사선
      px(9, 10 + oy, dark); px(10, 11 + oy, dark);  // 앞오른쪽 사선
      px(10, 10 + oy, dark); px(11, 11 + oy, dark); // 뒤왼쪽
      px(14, 10 + oy, dark); px(15, 11 + oy, dark); // 뒤오른쪽
    } else if (state === 'wave') {
      // 흥분: 한쪽 다리 들기
      const kick = frame % 20 < 10 ? -3 : 0;
      px(6, 10 + oy + kick, dark);
      px(6, 11 + oy + kick, dark);
      px(6, 12 + oy + kick, dark);
      px(8, 10 + oy, dark); px(8, 11 + oy, dark); px(8, 12 + oy, dark);
      px(11, 10 + oy, dark); px(11, 11 + oy, dark); px(11, 12 + oy, dark);
      px(13, 10 + oy, dark); px(13, 11 + oy, dark); px(13, 12 + oy, dark);
    } else {
      const l1 = state === 'walk' ? Math.sin(frame * 0.3) * 1 :
                 state === 'run'  ? Math.sin(frame * 0.6) * 3 :
                 state === 'jump' ? Math.sin(frame * 0.3) * 2 : 0;
      const l2 = state === 'walk' ? Math.sin(frame * 0.3 + Math.PI) * 1 :
                 state === 'run'  ? Math.sin(frame * 0.6 + Math.PI) * 3 :
                 state === 'jump' ? Math.sin(frame * 0.3 + Math.PI) * 2 : 0;

      px(6, 10 + oy + Math.round(l1), dark);
      px(6, 11 + oy + Math.round(l1), dark);
      px(6, 12 + oy + Math.round(l1), dark);

      px(8, 10 + oy + Math.round(l2), dark);
      px(8, 11 + oy + Math.round(l2), dark);
      px(8, 12 + oy + Math.round(l2), dark);

      px(11, 10 + oy + Math.round(l1), dark);
      px(11, 11 + oy + Math.round(l1), dark);
      px(11, 12 + oy + Math.round(l1), dark);

      px(13, 10 + oy + Math.round(l2), dark);
      px(13, 11 + oy + Math.round(l2), dark);
      px(13, 12 + oy + Math.round(l2), dark);
    }

    ctx.restore();
  }
}

// 펫 객체
class Pet {
  constructor(id, name, role, color, x, y) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.color = color;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.direction = 1;
    this.state = 'idle'; // idle, walk, talk, jump, think, faint
    this.frame = 0;
    this.speed = 1.5 + Math.random() * 1;
    this.nextActionTime = 0;
    this.chatTimeout = null;
    this.isGathering = false;
    this.chatHistory = [];
    this.onChatOpen = null;
    this.onPermissionApprove = null; // 권한 승인 콜백
    this.isJumping = false;
    this.isFainted = false;
    this.jumpStartTime = 0;
    this.isThinking = false;
    this.thinkUntil = 0;
    this.isSitting = false;
    this.isWaving = false;
    this.isRunning = false;
    this.isHidden = false;
    this.sitTimeout = null;
    this.waveTimeout = null;
    this.runTimeout = null;
    this.onPermissionDeny = null;

    // 펫별 AI 모델
    this.aiProvider = 'claude';
    this.aiModel = '';

    this.pixelPet = new PixelPet(color);
    this.element = null;
    this.canvas = null;
    this.ctx = null;

    this.createElement();
  }

  createElement() {
    this.element = document.createElement('div');
    this.element.className = 'pet';
    this.element.style.left = this.x + 'px';
    this.element.style.top = this.y + 'px';

    this.canvas = document.createElement('canvas');
    this.canvas.width = 80;
    this.canvas.height = 64;
    this.canvas.style.width = '80px';
    this.canvas.style.height = '64px';
    this.element.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    const nameTag = document.createElement('div');
    nameTag.className = 'pet-name-tag';
    nameTag.textContent = this.name;
    this.element.appendChild(nameTag);

    const roleTag = document.createElement('div');
    roleTag.className = 'pet-role-tag';
    const roleEmojis = {
      developer: '🛠',
      designer: '🎨',
      planner: '📋',
      debugger: '🐛',
      reviewer: '👀',
      tester: '🧪'
    };
    roleTag.textContent = `${roleEmojis[this.role] || ''} ${this.getRoleName()}`;
    this.element.appendChild(roleTag);

    const shadow = document.createElement('div');
    shadow.className = 'pet-shadow';
    this.element.appendChild(shadow);

    // 권한 승인 버블 (점프 시 표시) - 승인/거부 버튼 포함
    this.approvalBubble = document.createElement('div');
    this.approvalBubble.className = 'approval-bubble hidden';
    this.approvalBubble.innerHTML = `
      <div class="approval-tool-name">🔐 권한 요청</div>
      <div class="approval-btns">
        <button class="approval-btn approval-yes">✅ 승인</button>
        <button class="approval-btn approval-no">❌ 거부</button>
      </div>
    `;
    this.element.appendChild(this.approvalBubble);

    // 승인 버튼
    this.approvalBubble.querySelector('.approval-yes').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isJumping && this.onPermissionApprove) {
        this.onPermissionApprove();
      }
    });

    // 거부 버튼
    this.approvalBubble.querySelector('.approval-no').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isJumping && this.onPermissionDeny) {
        this.onPermissionDeny();
      }
    });

    // 펫 클릭: 버블 내부 클릭이면 무시 (버튼이 처리)
    this.element.addEventListener('click', (e) => {
      if (e.target.closest('.approval-bubble')) return;
      this.onClick();
    });
  }

  getRoleName() {
    return getI18n().roleName[this.role] || this.role;
  }

  onClick() {
    // 점프 중 펫 바디 클릭 = 승인 (버블 버튼 클릭은 별도 처리됨)
    if (this.isJumping && this.onPermissionApprove) {
      this.onPermissionApprove();
      return;
    }

    if (this.onChatOpen) {
      this.onChatOpen();
    } else {
      this.showChat(this.getRandomGreeting());
    }
  }

  // 펫 숨기기
  hide() {
    this.isHidden = true;
    this.element.style.opacity = '0';
    this.element.style.pointerEvents = 'none';
    this.element.style.transition = 'opacity 0.3s';
  }

  // 펫 보이기
  show() {
    this.isHidden = false;
    this.element.style.opacity = '1';
    this.element.style.pointerEvents = '';
  }

  // 점프 시작 (권한 승인 필요)
  startJumping(toolName) {
    this.isJumping = true;
    this.state = 'jump';
    this.jumpStartTime = Date.now();
    this.element.classList.add('pet-jumping');

    // 요청된 도구 이름 표시
    const toolLabel = this.approvalBubble.querySelector('.approval-tool-name');
    if (toolLabel) toolLabel.textContent = `🔐 ${toolName || getI18n().permissionRequest}`;

    this.approvalBubble.classList.remove('hidden');

    // 기존 채팅 버블 제거
    const existing = this.element.querySelector('.chat-bubble');
    if (existing) existing.remove();
  }

  // 점프 중지
  stopJumping() {
    this.isJumping = false;
    this.state = 'idle';
    this.element.classList.remove('pet-jumping');
    this.approvalBubble.classList.add('hidden');
  }

  // 기절 (API 소진)
  faint() {
    this.isFainted = true;
    this.state = 'faint';
    this.isJumping = false;
    this.element.classList.remove('pet-jumping');
    this.element.classList.add('pet-fainted');
    this.approvalBubble.classList.add('hidden');

    this.showChat(getI18n().apiExhausted);
  }

  // 앉기 상태
  sit() {
    if (this.isFainted || this.isJumping || this.isThinking) return;
    this.isSitting = true;
    this.isWaving = false;
    this.isRunning = false;
    this.state = 'sit';
    this.targetX = this.x;
    this.targetY = this.y;
    clearTimeout(this.sitTimeout);
    this.sitTimeout = setTimeout(() => {
      this.isSitting = false;
      if (this.state === 'sit') this.state = 'idle';
    }, 3000 + Math.random() * 2000);
  }

  // 달리기 상태
  run(targetX, targetY) {
    if (this.isFainted || this.isJumping || this.isSitting) return;
    this.isRunning = true;
    this.isWaving = false;
    this.state = 'run';
    const prevSpeed = this.speed;
    this.speed = 3.5 + Math.random() * 1.5;
    if (targetX !== undefined) this.setTarget(targetX, targetY);
    clearTimeout(this.runTimeout);
    this.runTimeout = setTimeout(() => {
      this.isRunning = false;
      this.speed = 1.5 + Math.random() * 1;
      if (this.state === 'run') this.state = 'walk';
    }, 3000 + Math.random() * 2000);
  }

  // 흔들기(기뻐하기) 상태
  wave() {
    if (this.isFainted || this.isJumping) return;
    this.isWaving = true;
    this.isSitting = false;
    this.state = 'wave';
    clearTimeout(this.waveTimeout);
    // showChat without state override
    const existing = this.element.querySelector('.chat-bubble');
    if (existing) existing.remove();
    clearTimeout(this.chatTimeout);
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = this.getWaveChat();
    this.element.appendChild(bubble);
    this.chatTimeout = setTimeout(() => { bubble.remove(); }, 3000);

    this.waveTimeout = setTimeout(() => {
      this.isWaving = false;
      if (this.state === 'wave') this.state = 'idle';
    }, 2500);
  }

  getWaveChat() {
    const lines = getI18n().wave;
    const roleLines = lines[this.role] || lines.developer;
    return roleLines[Math.floor(Math.random() * roleLines.length)];
  }

  // 기절에서 회복
  revive() {
    this.isFainted = false;
    this.state = 'idle';
    this.element.classList.remove('pet-fainted');
    this.showChat(getI18n().revived);
  }

  getRandomGreeting() {
    const greetings = getI18n().greetings;
    const roleGreetings = greetings[this.role] || greetings.developer;
    return roleGreetings[Math.floor(Math.random() * roleGreetings.length)];
  }

  getGatheringChat() {
    const chats = getI18n().gathering;
    const roleChats = chats[this.role] || chats.developer;
    return roleChats[Math.floor(Math.random() * roleChats.length)];
  }

  showChat(text) {
    const existing = this.element.querySelector('.chat-bubble');
    if (existing) existing.remove();
    clearTimeout(this.chatTimeout);

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    this.element.appendChild(bubble);

    if (!this.isFainted && !this.isJumping && this.state !== 'wave') {
      this.state = this.isThinking ? 'think' : 'talk';
    }

    this.chatTimeout = setTimeout(() => {
      bubble.remove();
      if (this.state === 'talk') this.state = 'idle';
    }, 3000);
  }

  startThinking(durationMs, text) {
    this.isThinking = true;
    this.thinkUntil = Date.now() + durationMs;
    this.state = 'think';
    if (text) this.showChat(text);
  }

  // AI 응답 대기 중 무한 대기 (응답 올 때까지 멈춤)
  startThinkingIndefinite() {
    this.isThinking = true;
    this.thinkUntil = Number.MAX_SAFE_INTEGER;
    this.state = 'think';
    // 기존 버블 제거 후 생각중 버블 표시
    const existing = this.element.querySelector('.chat-bubble');
    if (existing) existing.remove();
    clearTimeout(this.chatTimeout);
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble thinking-bubble';
    bubble.textContent = getI18n().thinkingBubble;
    this.element.appendChild(bubble);
  }

  stopThinkingNow() {
    this.isThinking = false;
    this.thinkUntil = 0;
    if (this.state === 'think') this.state = 'idle';
    const bubble = this.element.querySelector('.thinking-bubble');
    if (bubble) bubble.remove();
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  update(time, worldWidth, worldHeight) {
    this.frame++;

    // 숨겨진 상태에서는 업데이트 스킵
    if (this.isHidden) return;

    // 기절 상태에서는 움직이지 않음
    if (this.isFainted) {
      this.pixelPet.draw(this.ctx, this.frame, this.direction, 'faint');
      return;
    }

    // 점프 상태
    if (this.isJumping) {
      this.pixelPet.draw(this.ctx, this.frame, this.direction, 'jump');
      return;
    }

    // 고민 중 상태
    if (this.isThinking) {
      if (Date.now() < this.thinkUntil) {
        this.pixelPet.draw(this.ctx, this.frame, this.direction, 'think');
        return;
      }
      this.isThinking = false;
      if (this.state === 'think') this.state = 'idle';
    }

    // 앉은 상태: 움직이지 않음
    if (this.isSitting) {
      this.element.style.left = this.x + 'px';
      this.element.style.top = this.y + 'px';
      this.pixelPet.draw(this.ctx, this.frame, this.direction, 'sit');
      return;
    }

    // 흔들기 상태: 제자리
    if (this.isWaving) {
      this.element.style.left = this.x + 'px';
      this.element.style.top = this.y + 'px';
      this.pixelPet.draw(this.ctx, this.frame, this.direction, 'wave');
      return;
    }

    // 행동 결정 (5~15초 간격으로 완화)
    if (!this.isGathering && time > this.nextActionTime) {
      this.decideNextAction(worldWidth, worldHeight);
      this.nextActionTime = time + 5000 + Math.random() * 10000;
    }

    // 이동
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 3) {
      const movingState = this.isRunning ? 'run' : (this.state === 'talk' ? 'talk' : 'walk');
      this.state = movingState;
      const moveX = (dx / dist) * this.speed;
      const moveY = (dy / dist) * this.speed;
      this.x += moveX;
      this.y += moveY;
      this.direction = dx > 0 ? 1 : -1;
    } else {
      if (this.state === 'walk' || this.state === 'run') {
        this.isRunning = false;
        this.speed = 1.5 + Math.random() * 1;
        this.state = 'idle';
      }
    }

    // 경계 체크
    this.x = Math.max(10, Math.min(worldWidth - 70, this.x));
    this.y = Math.max(10, Math.min(worldHeight - 90, this.y));

    // 렌더링
    this.element.style.left = this.x + 'px';
    this.element.style.top = this.y + 'px';
    this.pixelPet.draw(this.ctx, this.frame, this.direction, this.state);
  }

  decideNextAction(worldWidth, worldHeight) {
    const roll = Math.random();
    const margin = 100;

    if (roll < 0.30) {
      // 조용히 대기 (idle) - 말풍선 없이 가만히 있기
      return;
    }
    if (roll < 0.42) {
      // 앉기 (조용히)
      this.sit();
      return;
    }
    if (roll < 0.50) {
      // 고민하기 (말풍선 있음)
      this.startThinking(1200 + Math.random() * 1200, this.getThinkingChat());
      return;
    }
    if (roll < 0.56) {
      // 달리기
      const tx = margin + Math.random() * (worldWidth - margin * 2);
      const ty = margin + Math.random() * (worldHeight - margin * 2);
      this.setTarget(tx, ty);
      this.run();
      return;
    }
    if (roll < 0.60) {
      // 기뻐하기
      this.wave();
      return;
    }

    // 기본 이동 (조용히 걷기, 5% 확률로만 인사)
    this.setTarget(
      margin + Math.random() * (worldWidth - margin * 2),
      margin + Math.random() * (worldHeight - margin * 2)
    );

    if (Math.random() < 0.05) {
      setTimeout(() => this.showChat(this.getRandomGreeting()), Math.random() * 2000);
    }
  }

  destroy() {
    clearTimeout(this.chatTimeout);
    clearTimeout(this.sitTimeout);
    clearTimeout(this.waveTimeout);
    clearTimeout(this.runTimeout);
    this.element.remove();
  }

  getThinkingChat() {
    const lines = getI18n().thinking;
    const roleLines = lines[this.role] || lines.developer;
    return roleLines[Math.floor(Math.random() * roleLines.length)];
  }

  getWorkingChat() {
    const lines = getI18n().working;
    const roleLines = lines[this.role] || lines.developer;
    return roleLines[Math.floor(Math.random() * roleLines.length)];
  }

  getCollabLine(kind) {
    if (kind === 'think') return this.getThinkingChat();
    if (kind === 'work') return this.getWorkingChat();
    return this.getGatheringChat();
  }
}
