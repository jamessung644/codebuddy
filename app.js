// 메인 애플리케이션 (Electron 데스크톱 + 다중 AI 모델 GUI)
class App {
  constructor() {
    this.pets = [];
    this.petIdCounter = 0;
    this.world = document.getElementById('world');
    this.isGathered = false;
    this.gatherCircle = null;
    this.selectedColor = '#C4836A';
    this.panelVisible = false;
    this.chatVisible = false;
    this.activePet = null;       // 채팅 패널이 열린 펫 (대화 대상 기본값)
    this.targetPetId = null;     // 메시지 수신 대상 ('all' or petId)
    this.isStreaming = false;
    this.workingDirectory = '~/';
    this.collabSessionId = null;
    this.collabTimers = [];
    this.collabLogFile = null;

    // 일반 채팅 로그 (1:1 대화)
    this.chatLogFile = null;      // 현재 1:1 채팅 로그 파일
    this.chatLogPetId = null;     // 로그가 연결된 펫 ID

    // 그룹 채팅
    this.groupChatHistory = [];  // { id, role, petId, petName, petColor, petRole, content }
    this.streamingMsgId = null;  // 현재 스트리밍 중인 메시지 id
    this.streamingContent = '';

    // AI 기본 모델 설정 (펫별 모델 없을 때 폴백)
    this.aiProvider = 'claude';
    this.aiModel = '';
    this.isApiExhausted = false;
    this.autoApprove = false;
    this.petOpacity = 1.0;
    this.currentTokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      provider: null
    };
    this.pendingPermissionRequests = new Map();

    // 멀티에이전트 스트림 라우팅: petId → { div, msgId, text, resolve }
    this.activeStreams = new Map();

    // 펫 모델 팝업 상태
    this.modelPopupPetId = null;

    this.setupEventListeners();
    this.setupElectronListeners();
    this.setupChatListeners();
    this.addDefaultPets();
    this.startLoop();
    this.setupMouseTracking();
    this.loadWorkingDirectory();
    this.loadConfig();
  }

  // === 설정 로드 ===
  async loadConfig() {
    if (!window.electronAPI) return;
    try {
      const config = await window.electronAPI.getConfig();
      if (config.defaultAI) {
        this.aiProvider = config.defaultAI === 'codex' ? 'claude' : config.defaultAI;
        if (config.defaultAI === 'codex') {
          config.defaultAI = 'claude';
          window.electronAPI.saveConfig(config);
        }
      }
      // Claude 기본 모델을 Sonnet 4.6으로 설정
      if (config.defaultModel) {
        this.aiModel = config.defaultModel;
      } else {
        this.aiModel = 'claude-sonnet-4-6';
        config.defaultModel = 'claude-sonnet-4-6';
        window.electronAPI.saveConfig(config);
      }
      // 언어 설정 적용
      if (config.language) {
        setLanguage(config.language);
        this.applyLanguageToUI(config.language);
      }
      // 기본 모델을 펫에 적용 (펫별 개별 설정이 없는 경우 폴백)
      this.pets.forEach(pet => {
        if (!pet.aiProvider) pet.aiProvider = this.aiProvider;
        if (!pet.aiModel) pet.aiModel = this.aiModel;
      });
      this.updateModelSelector();
      // 저장된 패널 위치 복원
      if (config.panelPosition) {
        this.restorePanelPosition(config.panelPosition);
      }
      if (config.chatPanelPosition) {
        this.restoreChatPanelPosition(config.chatPanelPosition);
      }
    } catch {}
  }

  // === 패널 위치 저장/복원 ===
  savePanelPosition() {
    if (!window.electronAPI) return;
    const panel = document.getElementById('control-panel');
    const top = parseInt(window.getComputedStyle(panel).top);
    const right = parseInt(window.getComputedStyle(panel).right);
    window.electronAPI.getConfig().then(config => {
      config.panelPosition = { top, right };
      window.electronAPI.saveConfig(config);
    });
  }

  restorePanelPosition(position) {
    const panel = document.getElementById('control-panel');
    if (position.top !== undefined) {
      panel.style.setProperty('--panel-top', position.top + 'px');
    }
    if (position.right !== undefined) {
      panel.style.setProperty('--panel-right', position.right + 'px');
    }
  }

  saveChatPanelPosition() {
    if (!window.electronAPI) return;
    const panel = document.getElementById('chat-panel');
    const top = parseInt(window.getComputedStyle(panel).top);
    const right = parseInt(window.getComputedStyle(panel).right);
    window.electronAPI.getConfig().then(config => {
      config.chatPanelPosition = { top, right };
      window.electronAPI.saveConfig(config);
    });
  }

  restoreChatPanelPosition(position) {
    const panel = document.getElementById('chat-panel');
    if (position.top !== undefined) {
      panel.style.setProperty('--chat-top', position.top + 'px');
    }
    if (position.right !== undefined) {
      panel.style.setProperty('--chat-right', position.right + 'px');
    }
  }

  setupPanelDrag() {
    const panel = document.getElementById('control-panel');
    const header = panel.querySelector('.panel-header');
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const newTop = e.clientY - offsetY;
      const newLeft = e.clientX - offsetX;
      const newRight = window.innerWidth - (newLeft + panel.offsetWidth);

      // 화면 경계 제한
      const constrainedTop = Math.max(0, Math.min(newTop, window.innerHeight - panel.offsetHeight));
      const constrainedRight = Math.max(0, Math.min(newRight, window.innerWidth - panel.offsetWidth));

      panel.style.setProperty('--panel-top', constrainedTop + 'px');
      panel.style.setProperty('--panel-right', constrainedRight + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
        this.savePanelPosition();
      }
    });
  }

  setupChatPanelDrag() {
    const panel = document.getElementById('chat-panel');
    const header = panel.querySelector('.chat-panel-header');
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const newTop = e.clientY - offsetY;
      const newLeft = e.clientX - offsetX;
      const newRight = window.innerWidth - (newLeft + panel.offsetWidth);

      // 화면 경계 제한
      const constrainedTop = Math.max(0, Math.min(newTop, window.innerHeight - 20));
      const constrainedRight = Math.max(0, Math.min(newRight, window.innerWidth - panel.offsetWidth));

      panel.style.setProperty('--chat-top', constrainedTop + 'px');
      panel.style.setProperty('--chat-right', constrainedRight + 'px');
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
        this.saveChatPanelPosition();
      }
    });
  }

  // === 마우스 트래킹 (Electron 투명 창) ===
  setupMouseTracking() {
    if (!window.electronAPI) return;

    document.addEventListener('mousemove', (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const isInteractive = el && (
        el.closest('.pet') ||
        el.closest('#control-panel') ||
        el.closest('#chat-panel') ||
        el.closest('#modal-overlay') ||
        el.closest('#settings-overlay') ||
        el.closest('#pet-model-popup')
      );

      if (isInteractive || this.panelVisible || this.chatVisible) {
        window.electronAPI.setIgnoreMouse(false);
      } else {
        window.electronAPI.setIgnoreMouse(true);
      }
    });
  }

  // === Electron IPC 이벤트 ===
  setupElectronListeners() {
    if (!window.electronAPI) return;

    window.electronAPI.onTogglePanel(() => this.togglePanel());
    window.electronAPI.onGather(() => this.gatherPets());
    window.electronAPI.onScatter(() => this.scatterPets());
    window.electronAPI.onAddPet(() => this.openModal());
    window.electronAPI.onOpenSettings(() => this.openSettings());
    window.electronAPI.onWorkingDirChanged((dir) => {
      this.workingDirectory = dir;
      document.getElementById('chat-cwd').textContent = dir;
    });

    // AI 스트리밍 수신
    window.electronAPI.onStream(({ petId, data }) => {
      if (this.activeStreams.has(petId)) {
        this.handleAgentStream(petId, data);
      } else if (this.streamingMsgId !== null) {
        this.handleStreamData(data);
      }
    });

    window.electronAPI.onStreamEnd(({ petId }) => {
      if (this.activeStreams.has(petId)) {
        this.finishAgentStream(petId);
      } else if (this.streamingMsgId !== null) {
        this.finishStreaming();
      }
    });

    // 권한 승인 필요 이벤트
    window.electronAPI.onPermissionNeeded(({ petId, toolName }) => {
      const pet = this.pets.find(p => p.id === petId);
      if (!pet) return;
      this.pendingPermissionRequests.set(petId, { toolName: toolName || '도구' });

      // 자동 승인 모드
      if (this.autoApprove) {
        this.handlePermissionApproval(petId, true);
        pet.showChat(`⚡ 자동 승인: ${toolName || '도구'}`);
        return;
      }

      pet.startJumping(toolName);
      pet.onPermissionApprove = () => this.handlePermissionApproval(petId);
      pet.onPermissionDeny   = () => this.handlePermissionDenial(petId);
    });

    // API 소진 이벤트
    window.electronAPI.onApiExhausted(({ reason }) => {
      this.handleApiExhausted(reason);
    });

    // 토큰 사용량 실시간 업데이트
    window.electronAPI.onTokenUsageUpdate(({ petId, inputTokens, outputTokens, totalTokens }) => {
      console.log(`[App] Token Update - petId: ${petId}, input: ${inputTokens}, output: ${outputTokens}, total: ${totalTokens}`);
      if (this.activePet?.id === petId) {
        this.currentTokenUsage = { inputTokens, outputTokens, totalTokens, provider: 'claude' };
        this.updateTokenDisplay();
        console.log('[App] Token display updated');
      }
    });

    // 토큰 사용량 최종 정보
    window.electronAPI.onTokenUsageFinal(({ petId, inputTokens, outputTokens, totalTokens }) => {
      console.log(`[App] Token Final - petId: ${petId}, input: ${inputTokens}, output: ${outputTokens}, total: ${totalTokens}`);
      if (this.activePet?.id === petId) {
        this.currentTokenUsage = { inputTokens, outputTokens, totalTokens, provider: 'claude' };
        this.updateTokenDisplay();
        console.log('[App] Token display updated (final)');
      }
    });

    // 트레이: 모든 펫 숨기기/보이기
    window.electronAPI.onToggleAllPets((visible) => {
      this.pets.forEach(pet => {
        if (visible) {
          pet.show();
          if (this.petOpacity < 1) pet.element.style.opacity = String(this.petOpacity);
        } else {
          pet.hide();
        }
      });
      this.updatePetList();
    });

    // 트레이: 펫 투명도 조절
    window.electronAPI.onSetPetOpacity((opacity) => {
      this.pets.forEach(pet => {
        if (!pet.isHidden) {
          pet.element.style.opacity = String(opacity);
        }
      });
      this.petOpacity = opacity;
    });
  }

  // === 자동 승인 토글 ===
  toggleAutoApprove() {
    this.autoApprove = !this.autoApprove;
    const btn = document.getElementById('auto-approve-btn');
    if (btn) {
      btn.classList.toggle('btn-active', this.autoApprove);
      const isEn = petLanguage === 'en';
      btn.title = this.autoApprove
        ? (isEn ? 'Auto Approve ON (click to disable)' : '자동 승인 ON (클릭하여 끄기)')
        : (isEn ? 'Auto Approve OFF (click to enable)' : '자동 승인 OFF (클릭하여 켜기)');
    }
  }

  // === 펫 숨기기 토글 ===
  toggleHidePet(petId) {
    const pet = this.pets.find(p => p.id === petId);
    if (!pet) return;
    if (pet.isHidden) {
      pet.show();
    } else {
      pet.hide();
      // 숨길 때 채팅 패널이 해당 펫이면 최소화
      if (this.activePet && this.activePet.id === petId) {
        this.minimizeChatPanel();
      }
    }
    this.updatePetList();
  }

  // === API 소진 처리: 모든 캐릭터 쓰러짐 ===
  handleApiExhausted(reason) {
    this.isApiExhausted = true;
    this.pets.forEach(pet => pet.faint());

    // 5초 후 자동 회복
    setTimeout(() => {
      this.isApiExhausted = false;
      this.pets.forEach(pet => pet.revive());
    }, 5000);
  }

  async loadWorkingDirectory() {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.getWorkingDirectory();
    if (dir) {
      this.workingDirectory = dir;
      document.getElementById('chat-cwd').textContent = dir;
    }
  }

  // === UI 이벤트 ===
  setupEventListeners() {
    document.getElementById('add-pet-btn').addEventListener('click', () => this.openModal());
    document.getElementById('gather-btn').addEventListener('click', () => this.gatherPets());
    document.getElementById('scatter-btn').addEventListener('click', () => this.scatterPets());
    document.getElementById('close-panel').addEventListener('click', () => this.hidePanel());
    document.getElementById('modal-cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-create').addEventListener('click', () => this.createPetFromModal());
    document.getElementById('chat-minimize-btn').addEventListener('click', () => this.minimizeChatPanel());
    document.getElementById('chat-close-btn').addEventListener('click', () => this.closeChatPanel());
    document.getElementById('auto-approve-btn').addEventListener('click', () => this.toggleAutoApprove());

    // 펫 모델 팝업 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('pet-model-popup');
      if (!popup.classList.contains('hidden') &&
          !popup.contains(e.target) &&
          !e.target.closest('.pet-chip')) {
        popup.classList.add('hidden');
        this.modelPopupPetId = null;
      }
    });

    // 설정 버튼
    document.getElementById('chat-settings-btn').addEventListener('click', () => this.openSettings());

    // 색상 선택
    document.querySelectorAll('.color-option').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.selectedColor = el.dataset.color;
        document.getElementById('color-custom').value = el.dataset.color;
      });
    });
    document.querySelector('.color-option').classList.add('selected');

    // 커스텀 색상 선택
    document.getElementById('color-custom').addEventListener('input', (e) => {
      document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
      this.selectedColor = e.target.value;
    });

    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    // 설정 모달 닫기
    document.getElementById('settings-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('settings-overlay')) this.closeSettings();
    });
    document.getElementById('settings-cancel').addEventListener('click', () => this.closeSettings());
    document.getElementById('settings-save').addEventListener('click', () => this.saveSettings());

    // 탭 전환
    document.querySelectorAll('.chat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.chat-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');

        if (tab.dataset.tab === 'files') this.loadFileTree();
      });
    });

    // 작업 폴더 선택
    document.getElementById('chat-cwd-btn').addEventListener('click', async () => {
      if (!window.electronAPI) return;
      const dir = await window.electronAPI.selectWorkingDirectory();
      if (dir) {
        this.workingDirectory = dir;
        document.getElementById('chat-cwd').textContent = dir;
      }
    });

    // 컨트롤 패널 & 채팅 패널 드래그 기능
    this.setupPanelDrag();
    this.setupChatPanelDrag();
  }

  // === AI 기본 모델 저장 (config 전용) ===
  saveDefaultModel(provider, model) {
    this.aiProvider = provider;
    this.aiModel = model;
    if (window.electronAPI) {
      window.electronAPI.getConfig().then(config => {
        config.defaultAI = provider;
        config.defaultModel = model;
        window.electronAPI.saveConfig(config);
      });
    }
  }

  updateModelSelector() {
    // 기존 model-selector-btn 참조 제거 — 팀 행으로 대체됨
    if (this.chatVisible) this.updateTeamRow();
  }

  // === 설정 모달 ===
  openSettings() {
    document.getElementById('settings-overlay').classList.remove('hidden');
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouse(false);
      window.electronAPI.getConfig().then(config => {
        document.getElementById('openai-key').value = config.apiKeys?.openai || '';
        document.getElementById('gemini-key').value = config.apiKeys?.gemini || '';
        document.getElementById('ollama-url').value = config.ollamaUrl || 'http://localhost:11434';
        document.getElementById('settings-language').value = config.language || 'ko';
      });
    }
  }

  closeSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
    if (!this.panelVisible && !this.chatVisible && window.electronAPI) {
      window.electronAPI.setIgnoreMouse(true);
    }
  }

  async saveSettings() {
    if (!window.electronAPI) return;
    const config = await window.electronAPI.getConfig();
    config.apiKeys = config.apiKeys || {};
    config.apiKeys.openai = document.getElementById('openai-key').value.trim();
    config.apiKeys.gemini = document.getElementById('gemini-key').value.trim();
    config.ollamaUrl = document.getElementById('ollama-url').value.trim();
    config.language = document.getElementById('settings-language').value;
    await window.electronAPI.saveConfig(config);
    // 언어 즉시 적용
    setLanguage(config.language);
    this.applyLanguageToUI(config.language);
    this.closeSettings();
  }

  // UI 문자열 언어 전환
  applyLanguageToUI(lang) {
    const isEn = lang === 'en';

    // 컨트롤 패널
    const panelTitle = document.querySelector('.panel-header h2');
    if (panelTitle) panelTitle.textContent = '🤝 Code Buddy';
    document.getElementById('add-pet-btn').textContent = isEn ? '+ Add Pet' : '+ 새 펫 추가';
    document.getElementById('gather-btn').textContent = isEn ? 'Gather!' : '모여라!';
    document.getElementById('scatter-btn').textContent = isEn ? 'Scatter!' : '흩어져라!';
    document.getElementById('auto-approve-btn').textContent = isEn ? '🔐 Auto Approve' : '🔐 자동 승인';

    // 채팅 패널
    document.getElementById('chat-input').placeholder = isEn ? 'Type a message...' : '메시지를 입력하세요...';
    const chatTab = document.querySelector('[data-tab="chat"]');
    const filesTab = document.querySelector('[data-tab="files"]');
    if (chatTab) chatTab.textContent = isEn ? '💬 Chat' : '💬 채팅';
    if (filesTab) filesTab.textContent = isEn ? '📂 Files' : '📂 파일';

    // 모달
    const modalTitle = document.querySelector('#modal h3');
    if (modalTitle) modalTitle.textContent = isEn ? 'Create New Pet' : '새 클로드 펫 만들기';
    const nameLabel = document.querySelector('#modal .form-group:first-of-type label');
    if (nameLabel) nameLabel.textContent = isEn ? 'Name' : '이름';
    document.getElementById('pet-name').placeholder = isEn ? 'e.g. Cody' : '예: 코딩이';
    const roleLabel = document.querySelectorAll('#modal .form-group label')[1];
    if (roleLabel) roleLabel.textContent = isEn ? 'Role' : '역할';
    const roleSelect = document.getElementById('pet-role');
    const roleOptionsI18n = isEn
      ? { developer: '🛠 Developer', designer: '🎨 Designer', planner: '📋 Planner', debugger: '🐛 Debugger', reviewer: '👀 Reviewer', tester: '🧪 Tester' }
      : { developer: '🛠 개발자', designer: '🎨 디자이너', planner: '📋 기획자', debugger: '🐛 디버거', reviewer: '👀 리뷰어', tester: '🧪 테스터' };
    roleSelect.querySelectorAll('option').forEach(opt => {
      if (roleOptionsI18n[opt.value]) opt.textContent = roleOptionsI18n[opt.value];
    });
    document.getElementById('modal-cancel').textContent = isEn ? 'Cancel' : '취소';
    document.getElementById('modal-create').textContent = isEn ? 'Create' : '만들기';

    // 설정 모달
    const settingsInfo = document.querySelector('.settings-info');
    if (settingsInfo) settingsInfo.textContent = isEn ? 'Claude works via CLI and requires no API key.' : 'Claude는 CLI를 통해 동작하며 별도 API 키가 필요 없습니다.';
    document.getElementById('settings-cancel').textContent = isEn ? 'Cancel' : '취소';
    document.getElementById('settings-save').textContent = isEn ? 'Save' : '저장';

    // 펫 역할 태그 갱신
    this.pets.forEach(pet => {
      const roleTag = pet.element.querySelector('.pet-role-tag');
      if (roleTag) {
        const roleEmojis = { developer: '🛠', designer: '🎨', planner: '📋', debugger: '🐛', reviewer: '👀', tester: '🧪' };
        roleTag.textContent = `${roleEmojis[pet.role] || ''} ${pet.getRoleName()}`;
      }
    });
    this.updatePetList();
  }

  // === 채팅 기능 ===
  setupChatListeners() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const abortBtn = document.getElementById('chat-abort-btn');

    sendBtn.addEventListener('click', () => this.sendMessage());

    // 메시지 중단 버튼
    abortBtn.addEventListener('click', () => this.abortMessage());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
      // ⌘+K (Mac) 또는 Ctrl+K (Windows/Linux)로 메시지 중단
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.abortMessage();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  // === 채팅 패널 열기 (그룹 채팅방) ===
  openChatPanel(pet) {
    this.activePet = pet;
    this.targetPetId = pet.id;

    this.chatVisible = true;
    document.getElementById('chat-panel').classList.remove('hidden');
    document.getElementById('world').classList.add('chat-open');
    if (this.panelVisible) this.hidePanel();
    if (window.electronAPI) window.electronAPI.setIgnoreMouse(false);

    this.renderGroupChat();
    this.updateTeamRow();
    this.updateTargetRow();
    this.scrollToBottom();
    setTimeout(() => document.getElementById('chat-input').focus(), 100);
  }

  minimizeChatPanel() {
    this.chatVisible = false;
    document.getElementById('chat-panel').classList.add('hidden');
    document.getElementById('world').classList.remove('chat-open');
    if (!this.panelVisible && window.electronAPI) window.electronAPI.setIgnoreMouse(true);
  }

  closeChatPanel() {
    if (this.isStreaming && this.streamingContent && this.streamingMsgId !== null) {
      // 현재 스트리밍 메시지 내용 확정
      const msg = this.groupChatHistory.find(m => m.id === this.streamingMsgId);
      if (msg) msg.content = this.streamingContent;
      if (this.activePet) window.electronAPI?.abortMessage(this.activePet.id);
      this.isStreaming = false;
      this.streamingContent = '';
      this.streamingMsgId = null;
      if (this.activePet) this.activePet.stopThinkingNow();
    }
    this.chatVisible = false;
    this.activePet = null;
    this.targetPetId = null;
    document.getElementById('chat-panel').classList.add('hidden');
    document.getElementById('world').classList.remove('chat-open');
    document.getElementById('chat-send-btn').disabled = false;
    this.resetTokenDisplay();
    if (window.electronAPI) window.electronAPI.setIgnoreMouse(true);
  }

  // === 그룹 채팅 렌더링 ===
  renderGroupChat() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    const isEn = petLanguage === 'en';
    if (this.groupChatHistory.length === 0) {
      container.innerHTML = `<div class="chat-welcome"><span>${isEn ? 'Click a pet to start chatting!' : '펫을 클릭해서 대화를 시작하세요!'}</span></div>`;
      return;
    }

    this.groupChatHistory.forEach(msg => {
      const el = this.createMsgElement(msg);
      container.appendChild(el);
    });
    this.scrollToBottom();
  }

  createMsgElement(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `group-msg ${msg.role}`;
    wrapper.dataset.msgId = msg.id;

    if (msg.role === 'user') {
      const body = document.createElement('div');
      body.className = 'msg-body';
      const row = document.createElement('div');
      row.className = 'msg-bubble-row';
      const copyBtn = this._makeCopyBtn(msg.content);
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = msg.content;
      row.appendChild(copyBtn);
      row.appendChild(bubble);
      body.appendChild(row);
      wrapper.appendChild(body);
    } else {
      // 아바타
      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.style.background = msg.petColor || '#888';
      avatar.textContent = (msg.petName || '?').charAt(0);
      wrapper.appendChild(avatar);

      const body = document.createElement('div');
      body.className = 'msg-body';

      const sender = document.createElement('div');
      sender.className = 'msg-sender';
      sender.innerHTML = `${msg.petName || ''} <span class="msg-sender-role">${msg.petRole || ''}</span>`;
      body.appendChild(sender);

      const row = document.createElement('div');
      row.className = 'msg-bubble-row';
      const bubble = document.createElement('div');
      bubble.className = `msg-bubble${msg.streaming ? ' streaming' : ''}`;
      if (msg.streaming) {
        bubble.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
      } else if (msg.role === 'error') {
        bubble.textContent = msg.content;
      } else {
        bubble.innerHTML = this.renderMarkdown(msg.content || '');
      }
      const copyBtn = this._makeCopyBtn(msg.content);
      row.appendChild(bubble);
      row.appendChild(copyBtn);
      body.appendChild(row);
      wrapper.appendChild(body);
    }
    return wrapper;
  }

  _makeCopyBtn(content) {
    const btn = document.createElement('button');
    btn.className = 'msg-copy-btn';
    btn.title = '복사';
    btn.textContent = '⎘';
    btn.addEventListener('click', () => {
      const text = content || '';
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('copied'); }, 1500);
      });
    });
    return btn;
  }

  appendGroupMsg(msg, scroll = true) {
    const container = document.getElementById('chat-messages');
    const welcome = container.querySelector('.chat-welcome');
    if (welcome) welcome.remove();
    const el = this.createMsgElement(msg);
    container.appendChild(el);
    if (scroll) this.scrollToBottom();
    return el;
  }

  // 스트리밍 메시지 버블 DOM 찾기
  _getStreamingBubble(msgId) {
    const wrapper = document.querySelector(`[data-msg-id="${msgId}"]`);
    return wrapper ? wrapper.querySelector('.msg-bubble') : null;
  }

  // === 팀 행 & 수신자 행 업데이트 ===
  updateTeamRow() {
    const row = document.getElementById('chat-team-row');
    if (!row) return;
    row.innerHTML = '';
    const isEn = petLanguage === 'en';
    document.getElementById('chat-team-subtitle').textContent =
      `${this.pets.length} ${isEn ? 'members' : '멤버'}`;

    this.pets.forEach(pet => {
      const chip = document.createElement('div');
      chip.className = 'pet-chip';
      chip.dataset.petId = pet.id;
      const modelLabel = pet.aiModel
        ? pet.aiModel.split('-').slice(0, 2).join(' ')
        : (pet.aiProvider === 'claude' ? 'Claude' : pet.aiProvider);
      chip.innerHTML = `
        <div class="pet-chip-dot" style="background:${pet.color}"></div>
        <div class="pet-chip-info">
          <div class="pet-chip-name">${pet.name}</div>
          <div class="pet-chip-model">${modelLabel}</div>
        </div>
      `;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPetModelPopup(pet, chip);
      });
      row.appendChild(chip);
    });
  }

  updateTargetRow() {
    const row = document.getElementById('chat-target-row');
    if (!row) return;
    row.innerHTML = '';
    const isEn = petLanguage === 'en';

    const label = document.createElement('span');
    label.className = 'target-label';
    label.textContent = isEn ? 'To:' : '받는 사람:';
    row.appendChild(label);

    this.pets.forEach(pet => {
      const chip = document.createElement('div');
      chip.className = 'target-chip' + (this.targetPetId === pet.id ? ' active' : '');
      chip.innerHTML = `<div class="target-chip-dot" style="background:${pet.color}"></div>${pet.name}`;
      chip.addEventListener('click', () => this.selectTargetPet(pet.id));
      row.appendChild(chip);
    });

    // 팀 전체 버튼
    const allChip = document.createElement('div');
    allChip.className = 'target-chip' + (this.targetPetId === 'all' ? ' active' : '');
    allChip.textContent = isEn ? '👥 Team' : '👥 팀';
    allChip.addEventListener('click', () => this.selectTargetPet('all'));
    row.appendChild(allChip);
  }

  selectTargetPet(petId) {
    this.targetPetId = petId;
    if (petId !== 'all') {
      const pet = this.pets.find(p => p.id === petId);
      if (pet) this.activePet = pet;
    }
    this.updateTargetRow();
  }

  // === 펫별 모델 팝업 ===
  async openPetModelPopup(pet, anchorEl) {
    const popup = document.getElementById('pet-model-popup');
    if (this.modelPopupPetId === pet.id && !popup.classList.contains('hidden')) {
      popup.classList.add('hidden');
      this.modelPopupPetId = null;
      return;
    }
    this.modelPopupPetId = pet.id;

    document.getElementById('pet-model-popup-name').textContent = pet.name;
    document.getElementById('pet-model-popup-role').textContent = pet.getRoleName();

    // API 설정 확인
    let config = {};
    if (window.electronAPI) {
      config = await window.electronAPI.getConfig();
    }

    // 현재 선택 표시 및 비활성화 상태 설정
    popup.querySelectorAll('.model-popup-opt').forEach(opt => {
      const match = opt.dataset.provider === pet.aiProvider &&
        (opt.dataset.model || '') === (pet.aiModel || '');
      opt.classList.toggle('active', match);

      // API 설정 없으면 투명도 70%
      const provider = opt.dataset.provider;
      const hasApi =
        provider === 'claude' ? true : // Claude는 항상 활성화
        provider === 'openai' ? (config.apiKeys?.openai?.trim()) :
        provider === 'gemini' ? (config.apiKeys?.gemini?.trim()) :
        provider === 'ollama' ? (config.ollamaUrl?.trim()) :
        false;

      if (!hasApi) {
        opt.style.opacity = '0.7';
        opt.style.pointerEvents = 'none';
        opt.style.cursor = 'default';
      } else {
        opt.style.opacity = '1';
        opt.style.pointerEvents = 'auto';
        opt.style.cursor = 'pointer';
      }
    });

    // 옵션 클릭 핸들러
    popup.querySelectorAll('.model-popup-opt').forEach(opt => {
      opt.onclick = () => {
        pet.aiProvider = opt.dataset.provider;
        pet.aiModel = opt.dataset.model || '';
        popup.classList.add('hidden');
        this.modelPopupPetId = null;
        this.updateTeamRow();
      };
    });

    // 위치 계산
    const rect = anchorEl.getBoundingClientRect();
    popup.style.left = rect.left + 'px';
    popup.style.top = (rect.bottom + 6) + 'px';
    popup.classList.remove('hidden');
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || this.pets.length === 0) return;

    // 승인/거부 키워드 감지 → Claude CLI stdin으로 전달
    const approveKeywords = ['승인', '예', '네', '넵', '넹', 'ㅇ', 'ㅇㅇ', 'y', 'yes', 'ok', 'okay', '오케이', '허용', '허가', '허용한다', '허용함', '맞아', '응', '어', '그래', '좋아'];
    const denyKeywords = ['거부', '아니', '아니요', 'ㄴ', 'ㄴㄴ', 'n', 'no', '거절', '취소', '안돼', '안됨', '싫어', '멈춰', '스톱'];
    const normalizedText = text.toLowerCase().replace(/\s+/g, '').trim();

    const pendingPermissionPetId = this.pendingPermissionRequests.size > 0
      ? [...this.pendingPermissionRequests.keys()][0]
      : null;
    const jumpingPet = this.pets.find(p => p.isJumping)
      || this.pets.find(p => p.id === pendingPermissionPetId);

    if (jumpingPet && this.pendingPermissionRequests.has(jumpingPet.id)) {
      if (approveKeywords.includes(normalizedText)) {
        input.value = '';
        input.style.height = 'auto';
        this.handlePermissionApproval(jumpingPet.id);
        return;
      } else if (denyKeywords.includes(normalizedText)) {
        input.value = '';
        input.style.height = 'auto';
        this.handlePermissionDenial(jumpingPet.id);
        return;
      }

      input.value = '';
      input.style.height = 'auto';
      const isEn = petLanguage === 'en';
      const helpMsg = {
        id: Date.now() + Math.random(),
        role: 'assistant',
        petId: jumpingPet.id,
        petName: jumpingPet.name,
        petColor: jumpingPet.color,
        petRole: jumpingPet.getRoleName(),
        content: isEn
          ? 'A permission request is waiting. Type yes/no, or click the pet approval buttons.'
          : '권한 요청이 대기 중입니다. `승인`/`거부`를 입력하거나 펫의 승인 버튼을 눌러주세요.'
      };
      this.groupChatHistory.push(helpMsg);
      this.appendGroupMsg(helpMsg);
      return;
    }

    if (this.isStreaming) return;

    // 기본 타겟 설정
    if (!this.targetPetId) {
      this.targetPetId = this.activePet ? this.activePet.id : this.pets[0].id;
    }

    // 유저 메시지 그룹 채팅에 추가
    const userMsg = { id: Date.now() + Math.random(), role: 'user', content: text };
    this.groupChatHistory.push(userMsg);
    this.appendGroupMsg(userMsg);

    input.value = '';
    input.style.height = 'auto';
    this.isStreaming = true;
    document.getElementById('chat-send-btn').disabled = true;
    const abortBtn = document.getElementById('chat-abort-btn');
    if (abortBtn) abortBtn.style.display = 'inline-block';

    if (this.targetPetId === 'all') {
      // 팀 전체 모드 → 멀티에이전트
      await this.runMultiAgentFlow(text);
    } else {
      // 특정 펫에게 단일 전송
      const targetPet = this.pets.find(p => p.id === this.targetPetId) || this.activePet;
      if (!targetPet) { this.isStreaming = false; return; }
      this.activePet = targetPet;
      this.targetPetId = targetPet.id;

      // 채팅 로그 초기화
      await this.initChatLog(targetPet.id);

      // 사용자 메시지 로그 기록
      this.appendChatLogLine('user', text);
      const history = this.getPetConversationHistory(targetPet);
      this.appendPetHistory(targetPet, 'user', text);

      targetPet.startThinkingIndefinite();

      const msgId = Date.now() + Math.random();
      this.streamingMsgId = msgId;
      this.streamingContent = '';
      this._lastClaudeAssistantId = null;

      // 처리 중 메시지 표시
      const isEn = petLanguage === 'en';
      const processingMsg = isEn ? '⏳ Processing...' : '⏳ 처리 중...';

      const streamMsg = {
        id: msgId, role: 'assistant', streaming: true,
        petId: targetPet.id, petName: targetPet.name,
        petColor: targetPet.color, petRole: targetPet.getRoleName(),
        content: processingMsg,
        isProcessing: true
      };
      this.groupChatHistory.push(streamMsg);
      this.appendGroupMsg(streamMsg);

      if (window.electronAPI) {
        window.electronAPI.sendMessage(
          targetPet.id, targetPet.role, text,
          targetPet.aiProvider || this.aiProvider,
          targetPet.aiModel || this.aiModel,
          undefined,
          history
        );
      }
    }
  }

  // === 메시지 중단 ===
  abortMessage() {
    if (!this.isStreaming) return;

    // 활성 펫에게 중단 신호 보내기
    if (this.activePet && window.electronAPI) {
      window.electronAPI.abortMessage(this.activePet.id);
      console.log(`[Abort] Aborting message for pet: ${this.activePet.name}`);
    }

    // UI 상태 복구
    this.isStreaming = false;
    this.streamingContent = '';
    this.streamingMsgId = null;

    // 버튼 상태 업데이트
    const sendBtn = document.getElementById('chat-send-btn');
    const abortBtn = document.getElementById('chat-abort-btn');
    if (sendBtn) sendBtn.disabled = false;
    if (abortBtn) abortBtn.style.display = 'none';

    // 펫 상태 복구
    if (this.activePet) {
      this.activePet.stopThinkingNow();
    }
    this.pets.forEach(p => p.stopThinkingNow());

    // 진행 중인 메시지 마무리
    if (this.streamingMsgId !== null) {
      const msg = this.groupChatHistory.find(m => m.id === this.streamingMsgId);
      if (msg) {
        msg.streaming = false;
        this.renderGroupChat();
      }
    }
  }

  // ── 멀티에이전트 오케스트레이션 (그룹 채팅) ──────────────────
  async runMultiAgentFlow(message) {
    const planner = this.pets.find(p => p.role === 'planner') || this.pets[0];
    const workers = this.pets.filter(p => p.id !== planner.id);
    const teamStr = this.pets.map(p => `${p.name}(${p.getRoleName()})`).join(', ');
    const isEn = petLanguage === 'en';

    this.pets.forEach(p => p.startThinkingIndefinite());

    // Step 1: 기획자
    const plannerSysPrompt = isEn
      ? `You are a technical project manager and team leader.\nTeam: ${teamStr}\nAnalyze the user request and assign tasks to each team member. Be concise.`
      : `당신은 테크니컬 프로젝트 매니저이자 팀 리더입니다.\n팀원: ${teamStr}\n사용자 요청을 분석하고 각 팀원에게 구체적인 작업을 배분하세요. 핵심만 간결하게 한국어로 답변하세요.`;
    const plannerMsg = isEn
      ? `Team: ${teamStr}\n\nUser request: ${message}\n\nCreate an overall plan and assign specific tasks.`
      : `팀원: ${teamStr}\n\n사용자 요청: ${message}\n\n전체 계획을 세우고 각 팀원에게 구체적 지시를 내리세요.`;

    const plannerResponse = await this.sendBotMessage(planner, plannerMsg, plannerSysPrompt);
    planner.stopThinkingNow();
    planner.showChat(isEn ? 'Plan done! ✅' : '계획 완료! ✅');

    // Step 2: 각 worker 순차 실행
    let prevContext = `[${planner.name}] ${plannerResponse}`;

    for (const worker of workers) {
      const workerSysPrompt = isEn
        ? `You are a ${worker.getRoleName()}. Refer to the planner's instructions and previous team work. Be concise.`
        : `당신은 ${worker.getRoleName()}입니다. 기획자의 지시와 이전 팀원 작업을 참고하여 전문 분야를 수행하세요. 핵심만 간결하게 한국어로 답변하세요.`;
      const workerMsg = isEn
        ? `Original request: ${message}\n\n${prevContext}\n\nPerform your role as ${worker.getRoleName()} (${worker.name}).`
        : `원래 요청: ${message}\n\n${prevContext}\n\n${worker.getRoleName()}(${worker.name})으로서 역할을 수행하세요.`;

      const workerResponse = await this.sendBotMessage(worker, workerMsg, workerSysPrompt);
      worker.stopThinkingNow();
      worker.showChat(isEn ? 'Done! ✅' : '완료! ✅');
      prevContext += `\n\n[${worker.name}] ${workerResponse}`;
    }

    const lead = this.activePet || this.pets[0];
    lead.showChat(isEn ? 'Team work done! 🎉' : '팀 작업 완료! 🎉');
    this.isStreaming = false;
    document.getElementById('chat-send-btn').disabled = false;
    if (this.chatVisible) document.getElementById('chat-input').focus();
  }

  // 특정 봇에게 메시지 보내고 그룹 채팅에 스트리밍 → Promise 반환
  sendBotMessage(pet, message, systemPromptOverride) {
    return new Promise((resolve) => {
      const msgId = Date.now() + Math.random();
      const streamMsg = {
        id: msgId, role: 'assistant', streaming: true,
        petId: pet.id, petName: pet.name,
        petColor: pet.color, petRole: pet.getRoleName(),
        content: ''
      };
      this.groupChatHistory.push(streamMsg);
      this.appendGroupMsg(streamMsg);

      this.activeStreams.set(pet.id, { msgId, text: '', resolve });
      const history = this.getPetConversationHistory(pet);
      this.appendPetHistory(pet, 'user', message);

      window.electronAPI.sendMessage(
        pet.id, pet.role, message,
        pet.aiProvider || this.aiProvider,
        pet.aiModel || this.aiModel,
        systemPromptOverride || null,
        history
      );
    });
  }

  // 멀티에이전트 스트림 데이터 처리
  handleAgentStream(petId, data) {
    const stream = this.activeStreams.get(petId);
    if (!stream) return;

    let text = '';
    if (data.type === 'error') {
      const bubble = this._getStreamingBubble(stream.msgId);
      if (bubble) { bubble.className = 'msg-bubble'; bubble.textContent = data.content; }
      return;
    }
    if (data.type === 'text') text = data.content || '';
    else if (data.type === 'content_block_delta') text = data.delta?.text || '';
    else if (data.type === 'result') text = data.result || '';
    else if (data.type === 'assistant' && data.message?.content) {
      data.message.content.forEach(b => { if (b.type === 'text') text += b.text; });
    }

    if (text) {
      stream.text += text;
      const bubble = this._getStreamingBubble(stream.msgId);
      if (bubble) bubble.innerHTML = this.renderMarkdown(stream.text);
      const msg = this.groupChatHistory.find(m => m.id === stream.msgId);
      if (msg) msg.content = stream.text;
      this.scrollToBottom();
    }
  }

  // 멀티에이전트 스트림 완료
  finishAgentStream(petId) {
    const stream = this.activeStreams.get(petId);
    if (!stream) return;
    const bubble = this._getStreamingBubble(stream.msgId);
    if (bubble) {
      bubble.classList.remove('streaming');
      bubble.innerHTML = this.renderMarkdown(stream.text);
      // 복사 버튼 내용 업데이트
      const row = bubble.parentElement;
      if (row) {
        const copyBtn = row.querySelector('.msg-copy-btn');
        if (copyBtn) {
          const content = stream.text;
          copyBtn.onclick = null;
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
              copyBtn.textContent = '✓'; copyBtn.classList.add('copied');
              setTimeout(() => { copyBtn.textContent = '⎘'; copyBtn.classList.remove('copied'); }, 1500);
            });
          });
        }
      }
    }
    const msg = this.groupChatHistory.find(m => m.id === stream.msgId);
    if (msg) { msg.content = stream.text; msg.streaming = false; }
    const pet = this.pets.find(candidate => candidate.id === petId);
    if (pet && stream.text) {
      this.appendPetHistory(pet, 'assistant', stream.text);
    }
    this.activeStreams.delete(petId);
    stream.resolve(stream.text);
  }

  handleStreamData(data) {
    if (this.streamingMsgId === null) return;

    if (data.type === 'error') {
      const bubble = this._getStreamingBubble(this.streamingMsgId);
      if (bubble) { bubble.className = 'msg-bubble'; bubble.textContent = data.content; }
      return;
    }

    let text = '';
    if (data.type === 'assistant' && data.message?.content) {
      const claudeMsgId = data.message.id;
      const fullText = data.message.content
        .filter(b => b.type === 'text').map(b => b.text).join('');
      if (!fullText) return;

      const msg = this.groupChatHistory.find(m => m.id === this.streamingMsgId);
      if (msg && msg.isProcessing) { this.streamingContent = ''; msg.isProcessing = false; }

      if (this._lastClaudeAssistantId === claudeMsgId) {
        // 같은 id → 완성본으로 덮어쓰기
        this.streamingContent = fullText;
      } else {
        // 새 id (새 라운드) → 이어붙이기
        if (this.streamingContent) this.streamingContent += '\n\n';
        this.streamingContent += fullText;
        this._lastClaudeAssistantId = claudeMsgId;
      }

      const bubble = this._getStreamingBubble(this.streamingMsgId);
      if (bubble) bubble.innerHTML = this.renderMarkdown(this.streamingContent);
      if (msg) msg.content = this.streamingContent;
      if (this.activePet) this.activePet.state = 'talk';
      this.scrollToBottom();
      return;
    } else if (data.type === 'content_block_delta') {
      text = data.delta?.text || '';
    } else if (data.type === 'result') {
      // 이미 스트리밍 내용이 있으면 result 무시 (중복 방지)
      if (this.streamingContent) return;
      text = data.result || '';
    } else if (data.type === 'text') {
      text = data.content || '';
    } else if (typeof data === 'string') {
      text = data;
    }

    if (text) {
      // 첫 응답 수신 시 "처리 중..." 메시지 제거
      const msg = this.groupChatHistory.find(m => m.id === this.streamingMsgId);
      if (msg && msg.isProcessing) {
        this.streamingContent = '';  // 처리 중 메시지 제거
        msg.isProcessing = false;
      }

      this.streamingContent += text;
      const bubble = this._getStreamingBubble(this.streamingMsgId);
      if (bubble) {
        bubble.innerHTML = this.renderMarkdown(this.streamingContent);
      }
      // 그룹 채팅 히스토리도 업데이트 (복사 버튼용)
      if (msg) msg.content = this.streamingContent;

      if (this.activePet) this.activePet.state = 'talk';
      this.scrollToBottom();
    }
  }

  finishStreaming() {
    if (this.streamingMsgId !== null) {
      const bubble = this._getStreamingBubble(this.streamingMsgId);
      if (bubble) {
        bubble.classList.remove('streaming');
        bubble.innerHTML = this.renderMarkdown(this.streamingContent || '');
        // 복사 버튼 content 업데이트
        const row = bubble.parentElement;
        if (row) {
          const copyBtn = row.querySelector('.msg-copy-btn');
          if (copyBtn) {
            const content = this.streamingContent;
            copyBtn.onclick = null;
            copyBtn.addEventListener('click', () => {
              navigator.clipboard.writeText(content).then(() => {
                copyBtn.textContent = '✓'; copyBtn.classList.add('copied');
                setTimeout(() => { copyBtn.textContent = '⎘'; copyBtn.classList.remove('copied'); }, 1500);
              });
            });
          }
        }
      }
      const msg = this.groupChatHistory.find(m => m.id === this.streamingMsgId);
      if (msg) { msg.content = this.streamingContent; msg.streaming = false; }
    }

    if (this.activePet) {
      const hasPendingPermission = this.pendingPermissionRequests.has(this.activePet.id);
      // AI 응답 로그 기록
      this.appendChatLogLine('assistant', this.streamingContent);
      if (this.streamingContent) {
        this.appendPetHistory(this.activePet, 'assistant', this.streamingContent);
      }

      this.activePet.stopThinkingNow();
      if (!hasPendingPermission) {
        const isEn = petLanguage === 'en';
        this.activePet.showChat(this.chatVisible
          ? (isEn ? 'Done!' : '완료!')
          : (isEn ? '✅ Reply ready!' : '✅ 답변 완료!'));
        if (this.activePet.isJumping) this.activePet.stopJumping();
      }
    }

    this.isStreaming = false;
    this.streamingContent = '';
    this.streamingMsgId = null;
    document.getElementById('chat-send-btn').disabled = false;
    const abortBtn = document.getElementById('chat-abort-btn');
    if (abortBtn) abortBtn.style.display = 'none';
    if (this.chatVisible) document.getElementById('chat-input').focus();
    this.scrollToBottom();
  }

  scrollToBottom() {
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
  }

  renderMarkdown(text) {
    if (!text) return '';

    let html = text
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<strong style="font-size:13px">$1</strong>')
      .replace(/^## (.+)$/gm, '<strong style="font-size:14px">$1</strong>')
      .replace(/^# (.+)$/gm, '<strong style="font-size:15px">$1</strong>')
      .replace(/^- (.+)$/gm, '• $1')
      .replace(/^\d+\. (.+)$/gm, (m, p1, offset, str) => `${m}`)
      .replace(/\n/g, '<br>');

    return html;
  }

  // === 파일 트리 ===
  async loadFileTree() {
    if (!window.electronAPI) return;

    const container = document.getElementById('file-tree');
    container.innerHTML = '<div class="chat-welcome">로딩 중...</div>';

    const tree = await window.electronAPI.getFileTree();
    container.innerHTML = '';

    if (tree.length === 0) {
      container.innerHTML = '<div class="chat-welcome">파일이 없습니다</div>';
      return;
    }

    this.renderFileTree(tree, container);
  }

  renderFileTree(items, container) {
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = `file-item ${item.isDir ? 'dir' : 'file'}`;
      div.innerHTML = `
        <span class="icon">${item.isDir ? '📁' : '📄'}</span>
        <span>${item.name}</span>
      `;

      div.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!item.isDir) {
          const input = document.getElementById('chat-input');
          input.value += item.path + ' ';
          input.focus();
          document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.chat-tab-content').forEach(c => c.classList.remove('active'));
          document.querySelector('[data-tab="chat"]').classList.add('active');
          document.getElementById('tab-chat').classList.add('active');
        }
      });

      container.appendChild(div);

      if (item.isDir && item.children && item.children.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'file-children';
        childContainer.style.display = 'none';
        this.renderFileTree(item.children, childContainer);
        container.appendChild(childContainer);

        div.addEventListener('click', (e) => {
          e.stopPropagation();
          childContainer.style.display =
            childContainer.style.display === 'none' ? 'block' : 'none';
          div.querySelector('.icon').textContent =
            childContainer.style.display === 'none' ? '📁' : '📂';
        });
      }
    });
  }

  // === 패널 관리 ===
  togglePanel() {
    if (this.panelVisible) this.hidePanel();
    else this.showPanel();
  }

  showPanel() {
    document.getElementById('control-panel').classList.remove('hidden');
    this.panelVisible = true;
    if (window.electronAPI) window.electronAPI.setIgnoreMouse(false);
  }

  hidePanel() {
    document.getElementById('control-panel').classList.add('hidden');
    this.panelVisible = false;
    if (!this.chatVisible && window.electronAPI) window.electronAPI.setIgnoreMouse(true);
  }

  // === 모달 ===
  openModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('pet-name').value = '';
    document.getElementById('pet-name').focus();
    if (window.electronAPI) window.electronAPI.setIgnoreMouse(false);
  }

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    if (!this.panelVisible && !this.chatVisible && window.electronAPI) {
      window.electronAPI.setIgnoreMouse(true);
    }
  }

  createPetFromModal() {
    const name = document.getElementById('pet-name').value.trim();
    const role = document.getElementById('pet-role').value;
    const color = this.selectedColor;

    if (!name) {
      document.getElementById('pet-name').style.borderColor = '#f66';
      setTimeout(() => {
        document.getElementById('pet-name').style.borderColor = 'rgba(255,255,255,0.12)';
      }, 1500);
      return;
    }

    this.addPet(name, role, color);
    this.closeModal();
  }

  // === 펫 관리 ===
  addPet(name, role, color) {
    const id = this.petIdCounter++;
    const x = 100 + Math.random() * (window.innerWidth - 500);
    const y = 100 + Math.random() * (window.innerHeight - 200);
    const pet = new Pet(id, name, role, color, x, y);

    pet.onChatOpen = () => this.openChatPanel(pet);
    if (this.petOpacity < 1) {
      pet.element.style.opacity = String(this.petOpacity);
    }

    this.pets.push(pet);
    this.world.appendChild(pet.element);
    this.updatePetList();
    if (this.chatVisible) {
      this.updateTeamRow();
      this.updateTargetRow();
    }
    return pet;
  }

  removePet(id) {
    const idx = this.pets.findIndex(p => p.id === id);
    if (idx !== -1) {
      if (this.activePet && this.activePet.id === id) {
        this.closeChatPanel();
      }
      // targetPetId가 삭제된 펫이면 초기화
      if (this.targetPetId === id) {
        this.targetPetId = this.pets.find(p => p.id !== id)?.id || null;
      }
      this.pets[idx].destroy();
      this.pets.splice(idx, 1);
      this.updatePetList();
      if (this.chatVisible) {
        this.updateTeamRow();
        this.updateTargetRow();
      }
    }
  }

  updatePetList() {
    const list = document.getElementById('pet-list');
    list.innerHTML = '';

    const isEn = petLanguage === 'en';
    this.pets.forEach(pet => {
      const item = document.createElement('div');
      item.className = 'pet-list-item' + (pet.isHidden ? ' pet-list-hidden' : '');
      const hiddenBadge = isEn ? 'hidden' : '숨김';
      const hideTitle = pet.isHidden ? (isEn ? 'Show' : '보이기') : (isEn ? 'Hide' : '숨기기');
      const deleteTitle = isEn ? 'Delete' : '삭제';
      item.innerHTML = `
        <div class="pet-list-color" style="background:${pet.color};opacity:${pet.isHidden ? 0.4 : 1}"></div>
        <div class="pet-list-info">
          <div class="pet-list-name">${pet.name}${pet.isHidden ? ` <span class="hidden-badge">${hiddenBadge}</span>` : ''}</div>
          <div class="pet-list-role">${pet.getRoleName()}</div>
        </div>
        <button class="pet-list-hide" title="${hideTitle}">${pet.isHidden ? '🙈' : '👁'}</button>
        <button class="pet-list-delete" title="${deleteTitle}">✕</button>
      `;

      item.querySelector('.pet-list-info').addEventListener('click', () => {
        if (!pet.isHidden) this.openChatPanel(pet);
      });

      item.querySelector('.pet-list-hide').addEventListener('click', () => {
        this.toggleHidePet(pet.id);
      });

      item.querySelector('.pet-list-delete').addEventListener('click', () => {
        this.removePet(pet.id);
      });

      list.appendChild(item);
    });
  }

  addDefaultPets() {
    this.addPet('클로디', 'developer', '#C4836A');
    this.addPet('소닉', 'designer', '#6A9EC4');
    this.addPet('하이쿠', 'planner', '#8BC46A');
  }

  // === 모여라 / 흩어져라 ===
  gatherPets() {
    if (this.pets.length < 2) return;
    this.stopGatherChat();
    this.isGathered = true;
    const centerX = window.innerWidth / 2 - 40;
    const centerY = window.innerHeight / 2 - 40;
    const radius = 70 + this.pets.length * 15;

    this.pets.forEach((pet, i) => {
      pet.isGathering = true;
      const angle = (i / this.pets.length) * Math.PI * 2 - Math.PI / 2;
      pet.setTarget(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      pet.speed = 3;
    });

    if (this.gatherCircle) this.gatherCircle.remove();
    this.gatherCircle = document.createElement('div');
    this.gatherCircle.className = 'gathering-circle';
    const s = radius * 2 + 80;
    Object.assign(this.gatherCircle.style, {
      width: s + 'px', height: s + 'px',
      left: (centerX + 40 - s / 2) + 'px',
      top: (centerY + 40 - s / 2) + 'px'
    });
    this.world.appendChild(this.gatherCircle);
    setTimeout(() => this.startGatherChat(), 2000);
  }

  async startGatherChat() {
    if (!this.isGathered || this.pets.length < 2) return;
    const sessionId = Date.now() + Math.random();
    this.collabSessionId = sessionId;
    this.collabTimers.forEach(t => clearTimeout(t));
    this.collabTimers = [];

    // 첫 사이클에만 로그 파일 생성
    if (this.collabLogFile === null && window.electronAPI) {
      const participants = this.pets.map(pet => `${pet.name}(${pet.getRoleName()})`);
      try {
        this.collabLogFile = await window.electronAPI.startChatLog(participants);
      } catch (e) {
        console.error('Failed to create chat log:', e);
        this.collabLogFile = null;
      }
    }

    const lines = this.buildCollabLines();
    let delay = 0;
    lines.forEach((line) => {
      delay += 900 + Math.random() * 1400;
      const timer = setTimeout(() => {
        if (!this.isGathered || this.collabSessionId !== sessionId) return;
        if (line.kind === 'think') {
          line.pet.startThinking(3000, line.text);
        } else {
          line.pet.showChat(line.text);
          this.appendCollabLogLine(line);
        }
      }, delay);
      this.collabTimers.push(timer);
    });

    const nextDelay = delay + 2500 + Math.random() * 3500;
    const nextTimer = setTimeout(() => {
      if (this.isGathered && this.collabSessionId === sessionId) this.startGatherChat();
    }, nextDelay);
    this.collabTimers.push(nextTimer);
  }

  scatterPets() {
    this.isGathered = false;
    this.stopGatherChat();
    if (this.gatherCircle) { this.gatherCircle.remove(); this.gatherCircle = null; }
    this.pets.forEach(pet => {
      pet.isGathering = false;
      pet.speed = 1.5 + Math.random() * 1;
      const margin = 100;
      const maxX = Math.max(margin, window.innerWidth - margin);
      const maxY = Math.max(margin, window.innerHeight - margin);
      pet.setTarget(
        margin + Math.random() * (maxX - margin),
        margin + Math.random() * (maxY - margin)
      );
    });
  }

  stopGatherChat() {
    this.collabSessionId = null;
    this.collabLogFile = null;
    this.collabTimers.forEach(t => clearTimeout(t));
    this.collabTimers = [];
  }

  buildCollabLines() {
    const pets = [...this.pets].sort(() => Math.random() - 0.5);
    const lineCount = Math.min(8, Math.max(4, pets.length + 2));
    const lines = [];
    for (let i = 0; i < lineCount; i++) {
      const pet = pets[i % pets.length];
      const roll = Math.random();
      const kind = roll < 0.25 ? 'think' : roll < 0.5 ? 'work' : 'talk';
      lines.push({ pet, kind, text: pet.getCollabLine(kind) });
    }
    return lines;
  }

  appendCollabLogLine(line) {
    if (!this.collabLogFile || !window.electronAPI) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const entry = `[${hh}:${mm}:${ss}] ${line.pet.name}(${line.pet.getRoleName()}): ${line.text}`;
    window.electronAPI.appendChatLog(this.collabLogFile, entry);
  }

  // === 일반 채팅 로그 ===
  async initChatLog(petId) {
    // 이미 같은 펫과의 로그가 있으면 재사용
    if (this.chatLogPetId === petId && this.chatLogFile) return;

    const targetPet = this.pets.find(p => p.id === petId);
    if (!targetPet || !window.electronAPI) return;

    try {
      const participants = [`You`, `${targetPet.name}(${targetPet.getRoleName()})`];
      this.chatLogFile = await window.electronAPI.startChatLog(participants);
      this.chatLogPetId = petId;
    } catch (e) {
      console.error('Failed to create chat log:', e);
      this.chatLogFile = null;
      this.chatLogPetId = null;
    }
  }

  appendChatLogLine(role, content) {
    if (!this.chatLogFile || !window.electronAPI || !this.activePet) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    const speaker = role === 'user' ? 'You' : this.activePet.name;
    const entry = `[${hh}:${mm}:${ss}] ${speaker}: ${content}`;
    window.electronAPI.appendChatLog(this.chatLogFile, entry);
  }

  ensureStreamingSlotForPet(pet) {
    if (!pet || this.streamingMsgId !== null) return;
    this.isStreaming = true;
    this.streamingContent = '';
    this._lastClaudeAssistantId = null;
    const sendBtn = document.getElementById('chat-send-btn');
    const abortBtn = document.getElementById('chat-abort-btn');
    if (sendBtn) sendBtn.disabled = true;
    if (abortBtn) abortBtn.style.display = 'inline-block';

    const isEn = petLanguage === 'en';
    const processingMsg = isEn ? '⏳ Processing...' : '⏳ 처리 중...';
    const msgId = Date.now() + Math.random();
    this.streamingMsgId = msgId;
    const streamMsg = {
      id: msgId,
      role: 'assistant',
      streaming: true,
      petId: pet.id,
      petName: pet.name,
      petColor: pet.color,
      petRole: pet.getRoleName(),
      content: processingMsg,
      isProcessing: true
    };
    this.groupChatHistory.push(streamMsg);
    this.appendGroupMsg(streamMsg);
  }

  handlePermissionApproval(petId, autoApproved = false) {
    const pet = this.pets.find(candidate => candidate.id === petId);
    this.pendingPermissionRequests.delete(petId);
    if (pet) {
      pet.stopJumping();
      pet.startThinkingIndefinite();
      this.activePet = pet;
      this.targetPetId = pet.id;
      this.ensureStreamingSlotForPet(pet);
      if (!autoApproved) {
        pet.showChat(petLanguage === 'en' ? 'Approved, retrying...' : '승인됨, 다시 시도 중...');
      }
    }
    window.electronAPI?.approvePermission(petId);
  }

  handlePermissionDenial(petId) {
    const pet = this.pets.find(candidate => candidate.id === petId);
    this.pendingPermissionRequests.delete(petId);
    if (pet) {
      pet.stopJumping();
      pet.stopThinkingNow();
    }
    window.electronAPI?.denyPermission(petId);
  }

  getPetConversationHistory(pet, limit = 20) {
    if (!pet || !Array.isArray(pet.chatHistory)) return [];
    return pet.chatHistory
      .filter(msg => msg && msg.role && msg.content)
      .slice(-limit)
      .map(msg => ({ role: msg.role, content: msg.content }));
  }

  appendPetHistory(pet, role, content) {
    if (!pet || !role || !content) return;
    if (!Array.isArray(pet.chatHistory)) pet.chatHistory = [];
    pet.chatHistory.push({ role, content });
    if (pet.chatHistory.length > 40) {
      pet.chatHistory = pet.chatHistory.slice(-40);
    }
  }

  closeChatLog() {
    this.chatLogFile = null;
    this.chatLogPetId = null;
  }

  startLoop() {
    const loop = (time) => {
      this.pets.forEach(pet => pet.update(time, window.innerWidth, window.innerHeight));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // === 토큰 사용량 표시 ===
  updateTokenDisplay() {
    const barEl = document.getElementById('token-usage-bar');
    const textEl = document.getElementById('token-usage-text');

    if (!barEl || !textEl) return;

    // 토큰이 없으면 숨김
    if (this.currentTokenUsage.totalTokens === 0) {
      barEl.style.display = 'none';
      return;
    }

    // Claude 기본 한계: 1M tokens
    const RATE_LIMIT = 1000000;
    const usagePercentage = Math.min(
      (this.currentTokenUsage.totalTokens / RATE_LIMIT) * 100,
      100
    );
    const remainingPercentage = 100 - usagePercentage;

    // 숫자 포매팅
    const formattedInput = this.currentTokenUsage.inputTokens.toLocaleString();
    const formattedOutput = this.currentTokenUsage.outputTokens.toLocaleString();
    const formattedTotal = this.currentTokenUsage.totalTokens.toLocaleString();

    // HTML 구성
    textEl.innerHTML = `📊 사용: <span class="token-usage-value">${formattedTotal}</span> | 입: <span class="token-usage-value">${formattedInput}</span> 출: <span class="token-usage-value">${formattedOutput}</span> | 남음: <span class="token-usage-value">${remainingPercentage.toFixed(1)}%</span>`;

    barEl.style.display = 'flex';

    // 색상 경고 설정
    barEl.classList.remove('high-usage', 'critical-usage');
    if (usagePercentage > 95) {
      barEl.classList.add('critical-usage');
    } else if (usagePercentage > 80) {
      barEl.classList.add('high-usage');
    }
  }

  resetTokenDisplay() {
    const barEl = document.getElementById('token-usage-bar');
    if (barEl) {
      barEl.style.display = 'none';
    }
    this.currentTokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      provider: null
    };
  }

  // 테스트용: 토큰 정보 시뮬레이션 (개발 중 UI 확인용)
  testTokenDisplay() {
    this.currentTokenUsage = {
      inputTokens: 2500,
      outputTokens: 3750,
      totalTokens: 6250,
      provider: 'claude'
    };
    this.updateTokenDisplay();
    console.log('[Test] Token display test activated');
  }
}

const app = new App();
