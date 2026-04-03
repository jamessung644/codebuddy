const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 마우스 이벤트 제어
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),

  // 트레이 메뉴 이벤트
  onTogglePanel: (callback) => ipcRenderer.on('toggle-panel', callback),
  onGather: (callback) => ipcRenderer.on('gather', callback),
  onScatter: (callback) => ipcRenderer.on('scatter', callback),
  onAddPet: (callback) => ipcRenderer.on('add-pet', callback),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  onWorkingDirChanged: (callback) => ipcRenderer.on('working-dir-changed', (e, dir) => callback(dir)),

  // AI 통신 (다중 모델 지원)
  sendMessage: (petId, role, message, aiProvider, model, systemPromptOverride, history) =>
    ipcRenderer.invoke('ai-send-message', { petId, role, message, aiProvider, model, systemPromptOverride, history }),
  onStream: (callback) =>
    ipcRenderer.on('ai-stream', (e, data) => callback(data)),
  onStreamEnd: (callback) =>
    ipcRenderer.on('ai-stream-end', (e, data) => callback(data)),
  abortMessage: (petId) =>
    ipcRenderer.send('ai-abort', { petId }),

  // 권한 승인 / 거부
  approvePermission: (petId) =>
    ipcRenderer.send('ai-approve', { petId }),
  denyPermission: (petId) =>
    ipcRenderer.send('ai-deny', { petId }),
  onPermissionNeeded: (callback) =>
    ipcRenderer.on('permission-needed', (e, data) => callback(data)),

  // API 소진 이벤트
  onApiExhausted: (callback) =>
    ipcRenderer.on('api-exhausted', (e, data) => callback(data)),

  // 토큰 사용량 이벤트
  onTokenUsageUpdate: (callback) =>
    ipcRenderer.on('token-usage-update', (e, data) => callback(data)),
  onTokenUsageFinal: (callback) =>
    ipcRenderer.on('token-usage-final', (e, data) => callback(data)),

  // 설정
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // 파일 트리
  getFileTree: (dirPath) =>
    ipcRenderer.invoke('get-file-tree', { dirPath }),
  selectWorkingDirectory: () =>
    ipcRenderer.invoke('select-working-directory'),
  getWorkingDirectory: () =>
    ipcRenderer.invoke('get-working-directory'),

  // 펫 협업 채팅 로그
  startChatLog: (participants) =>
    ipcRenderer.invoke('start-chat-log', { participants }),
  appendChatLog: (filePath, line) =>
    ipcRenderer.invoke('append-chat-log', { filePath, line }),


  // 트레이 추가 기능
  onToggleAllPets: (callback) =>
    ipcRenderer.on('toggle-all-pets', (e, visible) => callback(visible)),
  onSetPetOpacity: (callback) =>
    ipcRenderer.on('set-pet-opacity', (e, opacity) => callback(opacity))
});
