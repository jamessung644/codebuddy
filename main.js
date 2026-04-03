const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { SYSTEM_PROMPTS } = require('./prompts');

let mainWindow;
let tray;
let activeProcesses = new Map();
let pendingPermissionRequests = new Map();
let workingDirectory = process.env.HOME;

// 설정 파일 경로
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {}
  return { apiKeys: {}, defaultAI: 'claude', defaultModel: '' };
}

function saveConfig(config) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Config save error:', e);
  }
}

// API 소진 감지 키워드
const API_EXHAUSTED_PATTERNS = [
  'rate_limit', 'rate limit', 'quota', 'insufficient_quota',
  'exceeded', 'too many requests', '429', 'billing',
  'credit', 'overloaded', 'capacity', 'limit reached',
  'out of credits', 'payment required', 'usage limit'
];

const FILE_CREATION_SUCCESS_PATTERNS = [
  /파일이\s+생성되었/i,
  /생성되었습니다/i,
  /생성했/i,
  /만들었습니다/i,
  /\bcreated\b/i,
  /\bwritten\b/i,
  /\bsaved\b/i
];

const FILE_CANDIDATE_PATTERNS = [
  /`([^`\n]+\.[a-z0-9]+)`/gi,
  /(\/[^\s`'"]+\.[a-z0-9]+)/gi,
  /\b([A-Za-z0-9._/-]+\.(?:html|css|js|ts|json|md|txt|py|jsx|tsx))\b/gi
];

function isApiExhausted(errorText) {
  const lower = (errorText || '').toLowerCase();
  return API_EXHAUSTED_PATTERNS.some(p => lower.includes(p));
}

function extractAssistantText(parsed) {
  if (parsed.type === 'assistant' && Array.isArray(parsed.message?.content)) {
    return parsed.message.content
      .filter(block => block.type === 'text' && block.text)
      .map(block => block.text)
      .join('');
  }
  if (parsed.type === 'result' && typeof parsed.result === 'string') {
    return parsed.result;
  }
  return '';
}

function extractMentionedFileCandidates(text) {
  const results = new Set();
  for (const pattern of FILE_CANDIDATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const candidate = (match[1] || match[0] || '').trim();
      if (!candidate) continue;
      if (candidate.startsWith('http://') || candidate.startsWith('https://')) continue;
      results.add(candidate);
    }
  }
  return [...results];
}

function resolveCandidatePath(candidate) {
  if (!candidate) return null;
  if (path.isAbsolute(candidate)) return candidate;
  return path.resolve(workingDirectory || process.cwd(), candidate);
}

function buildMissingFileWarning(entry) {
  const responseText = entry.finalAssistantText || '';
  if (!responseText) return '';

  const claimsCreation = FILE_CREATION_SUCCESS_PATTERNS.some(pattern => pattern.test(responseText));
  if (!claimsCreation) return '';

  const candidates = extractMentionedFileCandidates(responseText);
  if (candidates.length === 0) return '';

  const missingCandidates = candidates.filter(candidate => {
    const resolved = resolveCandidatePath(candidate);
    return resolved && !fs.existsSync(resolved);
  });

  if (missingCandidates.length === 0) return '';

  const firstMissing = resolveCandidatePath(missingCandidates[0]);
  return `\n[검증 경고] 응답에서 생성되었다고 한 파일을 확인했지만 현재 찾을 수 없습니다: ${firstMissing}`;
}

function emitApiExhausted(reason) {
  if (mainWindow) {
    mainWindow.webContents.send('api-exhausted', { reason });
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'floating', 1);
  mainWindow.loadFile('index.html');
}

let isAlwaysOnTop = true;
let petsVisible = true;
let petOpacity = 1.0;

function createTray() {
  const iconPath = path.join(__dirname, 'icon-tray.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
  } else {
    icon = nativeImage.createEmpty();
  }
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  const config = loadConfig();
  const lang = config.language || 'ko';
  const isEn = lang === 'en';

  const t = {
    controlPanel: isEn ? 'Open Control Panel' : '컨트롤 패널 열기',
    gather: isEn ? 'Gather!' : '모여라!',
    scatter: isEn ? 'Scatter!' : '흩어져라!',
    addPet: isEn ? 'Add New Pet' : '새 펫 추가',
    aiSettings: isEn ? 'AI Settings...' : 'AI 설정...',
    selectFolder: isEn ? 'Select Work Folder...' : '작업 폴더 선택...',
    alwaysOnTop: isEn ? 'Always on Top' : '항상 위에 표시',
    showHidePets: petsVisible
      ? (isEn ? 'Hide All Pets' : '모든 펫 숨기기')
      : (isEn ? 'Show All Pets' : '모든 펫 보이기'),
    opacity: isEn ? 'Pet Opacity' : '펫 투명도',
    quit: isEn ? 'Quit' : '종료'
  };

  const opacityLabels = [
    { label: '100%', value: 1.0 },
    { label: '75%', value: 0.75 },
    { label: '50%', value: 0.5 },
    { label: '25%', value: 0.25 }
  ];

  const contextMenu = Menu.buildFromTemplate([
    { label: '🤝 Code Buddy', enabled: false },
    { type: 'separator' },
    {
      label: t.controlPanel,
      click: () => {
        mainWindow.webContents.send('toggle-panel');
        mainWindow.setIgnoreMouseEvents(false);
        mainWindow.setFocusable(true);
        mainWindow.focus();
      }
    },
    { label: t.gather, click: () => mainWindow.webContents.send('gather') },
    { label: t.scatter, click: () => mainWindow.webContents.send('scatter') },
    { type: 'separator' },
    {
      label: t.addPet,
      click: () => {
        mainWindow.webContents.send('add-pet');
        mainWindow.setIgnoreMouseEvents(false);
        mainWindow.setFocusable(true);
        mainWindow.focus();
      }
    },
    {
      label: t.aiSettings,
      click: () => {
        mainWindow.webContents.send('open-settings');
        mainWindow.setIgnoreMouseEvents(false);
        mainWindow.setFocusable(true);
        mainWindow.focus();
      }
    },
    {
      label: t.selectFolder,
      click: async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory'],
          defaultPath: workingDirectory
        });
        if (!result.canceled && result.filePaths[0]) {
          workingDirectory = result.filePaths[0];
          mainWindow.webContents.send('working-dir-changed', workingDirectory);
        }
      }
    },
    { type: 'separator' },
    {
      label: t.alwaysOnTop,
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: () => {
        isAlwaysOnTop = !isAlwaysOnTop;
        if (isAlwaysOnTop) {
          mainWindow.setAlwaysOnTop(true, 'floating', 1);
        } else {
          mainWindow.setAlwaysOnTop(false);
        }
      }
    },
    {
      label: t.showHidePets,
      click: () => {
        petsVisible = !petsVisible;
        mainWindow.webContents.send('toggle-all-pets', petsVisible);
        rebuildTrayMenu();
      }
    },
    {
      label: t.opacity,
      submenu: opacityLabels.map(o => ({
        label: o.label,
        type: 'radio',
        checked: petOpacity === o.value,
        click: () => {
          petOpacity = o.value;
          mainWindow.webContents.send('set-pet-opacity', o.value);
        }
      }))
    },
    { type: 'separator' },
    { label: t.quit, click: () => app.quit() }
  ]);

  tray.setToolTip('Code Buddy');
  tray.setContextMenu(contextMenu);
}

// === IPC: 마우스 제어 ===
ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (!mainWindow) return;
  if (ignore) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setFocusable(false);
  } else {
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setFocusable(true);
  }
});


// === IPC: AI 메시지 전송 (다중 AI 지원) ===
ipcMain.handle('ai-send-message', async (event, { petId, role, message, aiProvider, model, systemPromptOverride, history }) => {
  if (activeProcesses.has(petId)) {
    const entry = activeProcesses.get(petId);
    if (entry.kill) entry.kill();
    else if (entry.proc && entry.proc.kill) entry.proc.kill();
    else if (entry.abort) entry.abort();
    activeProcesses.delete(petId);
  }
  pendingPermissionRequests.delete(petId);

  const config = loadConfig();
  const lang = config.language || 'ko';
  const prompts = SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.ko;
  const systemPrompt = systemPromptOverride || prompts[role] || prompts.developer;

  switch (aiProvider) {
    case 'openai':
      return sendOpenAI(petId, systemPrompt, message, model, config.apiKeys.openai, history);
    case 'gemini':
      return sendGemini(petId, systemPrompt, message, model, config.apiKeys.gemini, history);
    case 'ollama':
      return sendOllama(petId, systemPrompt, message, model, config, history);
    case 'claude':
    default:
      return sendClaude(petId, systemPrompt, message, model, history);
  }
});

// === IPC: 권한 승인 ===
ipcMain.on('ai-approve', (event, { petId }) => {
  const entry = activeProcesses.get(petId);
  if (entry) {
    entry.waitingPermission = false;
    clearTimeout(entry.permissionTimer);

    // Claude CLI를 -p 모드로 실행할 때 stdin은 즉시 EOF 되어야 시작되므로,
    // 승인 시점에는 원 프로세스에 y/n을 보내기보다 같은 요청을 권한 우회 모드로 재실행한다.
    if (entry.request && entry.proc) {
      entry.restartWithBypassPermissions = true;
      entry.suppressStreamEnd = true;
      entry.proc.kill();
      return;
    }

    if (entry.proc && entry.proc.stdin && !entry.proc.stdin.destroyed && !entry.proc.stdin.writableEnded) {
      entry.proc.stdin.write('y\n');
    }
    pendingPermissionRequests.delete(petId);
    return;
  }

  const pendingRequest = pendingPermissionRequests.get(petId);
  if (pendingRequest) {
    pendingPermissionRequests.delete(petId);
    sendClaude(
      pendingRequest.petId,
      pendingRequest.systemPrompt,
      pendingRequest.message,
      pendingRequest.model,
      pendingRequest.history,
      { bypassPermissions: true }
    );
  }
});

// === IPC: 권한 거부 ===
ipcMain.on('ai-deny', (event, { petId }) => {
  const entry = activeProcesses.get(petId);
  if (entry) {
    entry.waitingPermission = false;
    clearTimeout(entry.permissionTimer);

    if (entry.request && entry.proc) {
      entry.deniedByUser = true;
      entry.suppressStreamEnd = true;
      entry.proc.kill();
      return;
    }

    if (entry.proc && entry.proc.stdin && !entry.proc.stdin.destroyed && !entry.proc.stdin.writableEnded) {
      entry.proc.stdin.write('n\n');
    }
    pendingPermissionRequests.delete(petId);
    return;
  }

  if (pendingPermissionRequests.has(petId)) {
    pendingPermissionRequests.delete(petId);
    mainWindow.webContents.send('ai-stream', {
      petId,
      data: { type: 'error', content: '권한 요청이 거부되었습니다.' }
    });
    mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
  }
});

// --- Claude CLI (권한 승인 지원) ---
function sendClaude(petId, systemPrompt, message, model, history, options = {}) {
  return new Promise((resolve) => {
    if (options.bypassPermissions) {
      pendingPermissionRequests.delete(petId);
    }

    // 이전 대화를 역할별 transcript로 명시해 멀티턴 맥락이 흐려지지 않도록 한다.
    let fullMessage = message;
    if (history && history.length > 0) {
      const historyText = history.map((entry, index) => {
        const speaker = entry.role === 'user' ? 'User' : 'Assistant';
        return `[Turn ${index + 1}] ${speaker}\n${entry.content}`;
      }).join('\n\n');
      fullMessage = `[Conversation so far]\n${historyText}\n\n[Latest user message]\n${message}`;
    }

    // --no-input 제거하여 권한 승인 인터랙션 지원
    const args = ['-p', fullMessage, '--output-format', 'stream-json', '--verbose'];
    if (model) args.push('--model', model);
    if (options.bypassPermissions) {
      args.push('--permission-mode', 'bypassPermissions');
    }

    const home = process.env.HOME || process.env.USERPROFILE || '';
    const claudePaths = [
      path.join(home, '.local/bin/claude'),   // 가장 흔한 위치 (우선)
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      '/opt/homebrew/opt/claude/bin/claude',
    ];
    let cliPath = null;
    for (const p of claudePaths) {
      if (fs.existsSync(p)) { cliPath = p; break; }
    }

    if (!cliPath) {
      const errMsg = `Claude CLI를 찾을 수 없습니다.\n확인한 경로:\n${claudePaths.join('\n')}\n\nhttps://claude.ai/download 에서 설치하세요.`;
      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: errMsg } });
      mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
      return resolve({ code: -1 });
    }

    // PATH에 ~/.local/bin 추가 (패키지 앱 환경에서 누락될 수 있음)
    const extraPath = `${path.join(home, '.local/bin')}:/usr/local/bin:/opt/homebrew/bin`;
    const env = {
      ...process.env,
      PATH: `${extraPath}:${process.env.PATH || '/usr/bin:/bin'}`,
      CLAUDE_CODE_SYSTEM_PROMPT: systemPrompt
    };
    // Claude CLI가 중첩 세션을 감지하지 않도록 관련 환경변수 제거
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;
    delete env.CLAUDE_CODE_SESSION_ID;

    console.log(`[Claude] spawn: ${cliPath}`);
    console.log(`[Claude] args: ${args.slice(0, 3).join(' ')} ...`);
    console.log(`[Claude] cwd: ${workingDirectory}`);

    const proc = spawn(cliPath, args, {
      cwd: workingDirectory,
      env,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // stdin을 즉시 닫아야 Claude CLI가 대기 상태로 멈추지 않음
    // 권한 승인 필요 시에는 entry.proc.stdin.write('y\n') 후 다시 end() 호출
    proc.stdin.on('error', () => {});
    proc.stdin.end();

    const entry = {
      proc,
      waitingPermission: false,
      permissionTimer: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, total: 0 },
      request: { petId, systemPrompt, message, model, history },
      restartWithBypassPermissions: false,
      suppressStreamEnd: false,
      deniedByUser: false,
      finalAssistantText: ''
    };
    activeProcesses.set(petId, entry);
    let buffer = '';
    let lastEventTime = Date.now();

    proc.stdout.on('data', (data) => {
      lastEventTime = Date.now();
      console.log(`[Claude stdout] ${data.toString().slice(0, 100)}`);
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const assistantText = extractAssistantText(parsed);
          if (assistantText) {
            entry.finalAssistantText = assistantText;
          }
          if (!options.bypassPermissions) {
            const permInfo = detectPermissionNeeded(parsed);
            if (permInfo) {
              pendingPermissionRequests.set(petId, {
                petId,
                systemPrompt,
                message,
                model,
                history,
                toolName: permInfo.toolName
              });
            }
          }
          mainWindow.webContents.send('ai-stream', { petId, data: parsed });

          // 토큰 정보 추출 - 여러 형식 지원
          if (parsed.usage) {
            entry.tokenUsage.inputTokens = (parsed.usage.input_tokens || parsed.usage.promptTokenCount || 0);
            entry.tokenUsage.outputTokens = (parsed.usage.output_tokens || parsed.usage.candidatesTokenCount || 0);
            entry.tokenUsage.total = entry.tokenUsage.inputTokens + entry.tokenUsage.outputTokens;
            console.log(`[Token] usage: ${JSON.stringify(parsed.usage)}`);
            console.log(`[Token] input: ${entry.tokenUsage.inputTokens}, output: ${entry.tokenUsage.outputTokens}, total: ${entry.tokenUsage.total}`);
            if (entry.tokenUsage.total > 0) {
              mainWindow.webContents.send('token-usage-update', {
                petId,
                inputTokens: entry.tokenUsage.inputTokens,
                outputTokens: entry.tokenUsage.outputTokens,
                totalTokens: entry.tokenUsage.total
              });
            }
          }

          // 전체 parsed 객체 로깅 (디버깅용)
          if (parsed.type === 'message_start' || parsed.type === 'message_delta' || parsed.type === 'message_stop') {
            console.log(`[Debug] ${parsed.type}: ${JSON.stringify(parsed).slice(0, 200)}`);
          }

          // 권한 승인 필요 감지: tool_use 관련 이벤트
          const permInfo = detectPermissionNeeded(parsed);
          if (permInfo) {
            entry.waitingPermission = true;
            entry.pendingToolName = permInfo.toolName;
            clearTimeout(entry.permissionTimer);
            entry.permissionTimer = setTimeout(() => {
              if (entry.waitingPermission) {
                mainWindow.webContents.send('permission-needed', {
                  petId,
                  toolName: entry.pendingToolName
                });
              }
            }, 800);
          }

          // tool 결과가 오면 permission 대기 해제
          if (parsed.type === 'content_block_stop' || parsed.type === 'result' ||
              (parsed.type === 'assistant' && parsed.message)) {
            entry.waitingPermission = false;
            clearTimeout(entry.permissionTimer);
          }

          // API 소진 감지
          if (parsed.type === 'error' && isApiExhausted(JSON.stringify(parsed))) {
            emitApiExhausted(parsed.error?.message || 'API 한도 초과');
          }
        } catch {
          mainWindow.webContents.send('ai-stream', { petId, data: { type: 'text', content: line } });
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const t = data.toString().trim();
      if (!t) return;
      console.error(`[Claude stderr] ${t}`);

      // stderr에서 토큰 정보 추출 (폴백)
      const inputMatch = t.match(/input\s+tokens?:\s*(\d+)/i);
      const outputMatch = t.match(/output\s+tokens?:\s*(\d+)/i);
      if (inputMatch) {
        entry.tokenUsage.inputTokens = Math.max(entry.tokenUsage.inputTokens, parseInt(inputMatch[1]));
      }
      if (outputMatch) {
        entry.tokenUsage.outputTokens = Math.max(entry.tokenUsage.outputTokens, parseInt(outputMatch[1]));
      }

      // stderr에서 권한 승인 프롬프트 감지
      const lowerT = t.toLowerCase();
      if (lowerT.includes('allow') || lowerT.includes('approve') ||
          lowerT.includes('permission') || lowerT.includes('confirm') ||
          lowerT.includes('y/n') || lowerT.includes('yes/no') ||
          lowerT.includes('do you want')) {
        entry.waitingPermission = true;
        mainWindow.webContents.send('permission-needed', { petId });
      }

      // 중첩 세션 오류 감지 → 사용자에게 명확한 메시지
      if (lowerT.includes('nested') || lowerT.includes('claudecode')) {
        mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: `⚠️ Claude CLI 중첩 세션 오류\n앱을 터미널이 아닌 Finder에서 실행하거나\nnpm start 대신 빌드된 앱(.app)을 사용하세요.` } });
        mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
        return;
      }

      // API 소진 감지
      if (isApiExhausted(t)) {
        emitApiExhausted(t);
      }

      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: t } });
    });

    proc.on('close', (code) => {
      console.log(`[Claude] process closed, code=${code}, buffer="${buffer.slice(0,100)}"`);
      clearTimeout(entry.permissionTimer);

      if (entry.restartWithBypassPermissions) {
        activeProcesses.delete(petId);
        sendClaude(
          entry.request.petId,
          entry.request.systemPrompt,
          entry.request.message,
          entry.request.model,
          entry.request.history,
          { bypassPermissions: true }
        );
        resolve({ code: 0, restarted: true });
        return;
      }

      if (entry.deniedByUser) {
        activeProcesses.delete(petId);
        mainWindow.webContents.send('ai-stream', {
          petId,
          data: { type: 'error', content: '권한 요청이 거부되었습니다.' }
        });
        mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
        resolve({ code: -1, denied: true });
        return;
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          const assistantText = extractAssistantText(parsed);
          if (assistantText) {
            entry.finalAssistantText = assistantText;
          }
          if (!options.bypassPermissions) {
            const permInfo = detectPermissionNeeded(parsed);
            if (permInfo) {
              pendingPermissionRequests.set(petId, {
                petId,
                systemPrompt,
                message,
                model,
                history,
                toolName: permInfo.toolName
              });
            }
          }
          mainWindow.webContents.send('ai-stream', { petId, data: parsed });
        } catch {
          mainWindow.webContents.send('ai-stream', { petId, data: { type: 'text', content: buffer } });
        }
      }

      const missingFileWarning = buildMissingFileWarning(entry);
      if (missingFileWarning) {
        mainWindow.webContents.send('ai-stream', {
          petId,
          data: { type: 'text', content: missingFileWarning }
        });
      }

      // 최종 토큰 정보 전송
      if (entry.tokenUsage.total > 0) {
        mainWindow.webContents.send('token-usage-final', {
          petId,
          inputTokens: entry.tokenUsage.inputTokens,
          outputTokens: entry.tokenUsage.outputTokens,
          totalTokens: entry.tokenUsage.total
        });
      }

      activeProcesses.delete(petId);
      if (!options.bypassPermissions && entry.waitingPermission) {
        pendingPermissionRequests.set(petId, {
          petId,
          systemPrompt,
          message,
          model,
          history,
          toolName: entry.pendingToolName || '권한 요청'
        });
      }
      if (!entry.suppressStreamEnd) {
        mainWindow.webContents.send('ai-stream-end', { petId, code });
      }
      resolve({ code });
    });

    proc.on('error', (err) => {
      clearTimeout(entry.permissionTimer);
      activeProcesses.delete(petId);
      const errMsg = `Claude CLI 실행 실패: ${err.message}\nclaude CLI가 설치되어 있는지 확인하세요.`;
      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: errMsg } });
      mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
      resolve({ code: -1 });
    });
  });
}

// 권한 승인 필요 감지 + 도구 이름 추출
const TOOL_LABELS = {
  bash: '터미널 명령 실행',
  str_replace_editor: '파일 편집',
  read_file: '파일 읽기',
  write_file: '파일 쓰기',
  list_files: '파일 목록 조회',
  search_files: '파일 검색',
  computer: '컴퓨터 조작',
  web_search: '웹 검색',
  browser: '브라우저 실행',
};
function detectPermissionNeeded(parsed) {
  if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
    const name = parsed.content_block.name || '도구';
    return { toolName: TOOL_LABELS[name] || name };
  }
  if (parsed.type === 'tool_use') {
    const name = parsed.name || '도구';
    return { toolName: TOOL_LABELS[name] || name };
  }
  if (parsed.type === 'input_request' || parsed.type === 'permission_request') {
    return { toolName: parsed.tool ? (TOOL_LABELS[parsed.tool] || parsed.tool) : '권한 요청' };
  }
  return null;
}

// --- OpenAI API ---
function sendOpenAI(petId, systemPrompt, message, model, apiKey, history) {
  return new Promise((resolve) => {
    if (!apiKey) {
      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: 'OpenAI API 키가 설정되지 않았습니다.\nAI 설정에서 API 키를 입력해주세요.' } });
      mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
      return resolve({ code: -1 });
    }

    const messages = [{ role: 'system', content: systemPrompt }];
    if (history && history.length > 0) {
      messages.push(...history);
    }
    messages.push({ role: 'user', content: message });

    const body = JSON.stringify({
      model: model || 'gpt-4o',
      messages,
      stream: true
    });

    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }, (res) => {
      // HTTP 429 = Rate limit
      if (res.statusCode === 429 || res.statusCode === 402) {
        let errData = '';
        res.on('data', (chunk) => { errData += chunk.toString(); });
        res.on('end', () => {
          emitApiExhausted(`OpenAI API 한도 초과 (${res.statusCode})`);
          mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: `OpenAI API 한도 초과: ${errData}` } });
          mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
          resolve({ code: -1 });
        });
        return;
      }

      let buffer = '';
      const abortController = { abort: () => req.destroy() };
      activeProcesses.set(petId, abortController);

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                mainWindow.webContents.send('ai-stream', { petId, data: { type: 'text', content } });
              }
              // Error in response
              if (parsed.error) {
                if (isApiExhausted(parsed.error.message)) {
                  emitApiExhausted(parsed.error.message);
                }
              }
            } catch {}
          }
        }
      });

      res.on('end', () => {
        activeProcesses.delete(petId);
        mainWindow.webContents.send('ai-stream-end', { petId, code: 0 });
        resolve({ code: 0 });
      });

      res.on('error', (err) => {
        activeProcesses.delete(petId);
        mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: err.message } });
        mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
        resolve({ code: -1 });
      });
    });

    req.on('error', (err) => {
      activeProcesses.delete(petId);
      if (isApiExhausted(err.message)) {
        emitApiExhausted(err.message);
      }
      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: `OpenAI 연결 실패: ${err.message}` } });
      mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
      resolve({ code: -1 });
    });

    req.write(body);
    req.end();
  });
}

// --- Google Gemini API ---
function sendGemini(petId, systemPrompt, message, model, apiKey, history) {
  return new Promise((resolve) => {
    if (!apiKey) {
      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: 'Gemini API 키가 설정되지 않았습니다.\nAI 설정에서 API 키를 입력해주세요.' } });
      mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
      return resolve({ code: -1 });
    }

    const modelName = model || 'gemini-2.0-flash';
    const contents = [];
    if (history && history.length > 0) {
      contents.push(...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })));
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      if (res.statusCode === 429 || res.statusCode === 402) {
        let errData = '';
        res.on('data', (chunk) => { errData += chunk.toString(); });
        res.on('end', () => {
          emitApiExhausted(`Gemini API 한도 초과 (${res.statusCode})`);
          mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: `Gemini API 한도 초과: ${errData}` } });
          mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
          resolve({ code: -1 });
        });
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk.toString(); });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            mainWindow.webContents.send('ai-stream', { petId, data: { type: 'text', content: text } });
          } else if (parsed.error) {
            if (isApiExhausted(parsed.error.message)) {
              emitApiExhausted(parsed.error.message);
            }
            mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: parsed.error.message } });
          }
        } catch {
          mainWindow.webContents.send('ai-stream', { petId, data: { type: 'text', content: data } });
        }
        mainWindow.webContents.send('ai-stream-end', { petId, code: 0 });
        resolve({ code: 0 });
      });
    });

    req.on('error', (err) => {
      if (isApiExhausted(err.message)) {
        emitApiExhausted(err.message);
      }
      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: `Gemini 연결 실패: ${err.message}` } });
      mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
      resolve({ code: -1 });
    });

    req.write(body);
    req.end();
  });
}

// --- Ollama (로컬) ---
function sendOllama(petId, systemPrompt, message, model, config) {
  return new Promise((resolve) => {
    // Ollama URL 파싱 (기본값: http://localhost:11434)
    const ollamaUrl = (config?.ollamaUrl || 'http://localhost:11434').trim();
    let hostname = '127.0.0.1';
    let port = 11434;
    let protocol = 'http';

    try {
      const url = new URL(ollamaUrl);
      protocol = url.protocol.replace(':', '');
      hostname = url.hostname;
      port = parseInt(url.port) || (protocol === 'https' ? 443 : 80);
    } catch {}

    // Ollama는 "system" 파라미터를 지원하지 않으므로 프롬프트에 포함
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${message}` : message;

    const body = JSON.stringify({
      model: model || 'llama3',
      prompt: fullPrompt,
      stream: true
    });

    const httpModule = protocol === 'https' ? require('https') : http;
    const req = httpModule.request({
      hostname,
      port,
      path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let buffer = '';
      const abortController = { abort: () => req.destroy() };
      activeProcesses.set(petId, abortController);

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              mainWindow.webContents.send('ai-stream', { petId, data: { type: 'text', content: parsed.response } });
            }
            if (parsed.error && isApiExhausted(parsed.error)) {
              emitApiExhausted(parsed.error);
            }
          } catch {}
        }
      });

      res.on('end', () => {
        activeProcesses.delete(petId);
        mainWindow.webContents.send('ai-stream-end', { petId, code: 0 });
        resolve({ code: 0 });
      });
    });

    req.on('error', (err) => {
      mainWindow.webContents.send('ai-stream', { petId, data: { type: 'error', content: `Ollama 연결 실패: ${err.message}\n설정: ${ollamaUrl}\nOllama가 실행 중인지 확인하세요.` } });
      mainWindow.webContents.send('ai-stream-end', { petId, code: -1 });
      resolve({ code: -1 });
    });

    req.write(body);
    req.end();
  });
}

// === IPC: 설정 ===
ipcMain.handle('get-config', async () => loadConfig());
ipcMain.handle('save-config', async (event, config) => {
  saveConfig(config);
  // 언어 변경 시 트레이 메뉴 갱신
  if (tray) rebuildTrayMenu();
  return true;
});

// === IPC: 응답 중단 ===
ipcMain.on('ai-abort', (event, { petId }) => {
  const entry = activeProcesses.get(petId);
  if (entry) {
    if (entry.proc) entry.proc.kill();
    else if (entry.kill) entry.kill();
    else if (entry.abort) entry.abort();
    clearTimeout(entry.permissionTimer);
    activeProcesses.delete(petId);
  }
});

// === IPC: 파일 트리 ===
ipcMain.handle('get-file-tree', async (event, { dirPath }) => {
  try { return buildFileTree(dirPath || workingDirectory, 0, 3); }
  catch { return []; }
});

function buildFileTree(dir, depth, maxDepth) {
  if (depth >= maxDepth) return [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => {
        const fullPath = path.join(dir, e.name);
        const item = { name: e.name, path: fullPath, isDir: e.isDirectory() };
        if (e.isDirectory() && depth < maxDepth - 1) item.children = buildFileTree(fullPath, depth + 1, maxDepth);
        return item;
      })
      .sort((a, b) => a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name));
  } catch { return []; }
}

ipcMain.handle('select-working-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], defaultPath: workingDirectory });
  if (!result.canceled && result.filePaths[0]) { workingDirectory = result.filePaths[0]; return workingDirectory; }
  return null;
});

ipcMain.handle('get-working-directory', async () => workingDirectory);

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTimestamp(date = new Date()) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function ensureChatDir() {
  const dir = path.join(workingDirectory || process.env.HOME || '.', 'Chat');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ipcMain.handle('start-chat-log', async (event, { participants }) => {
  try {
    const chatDir = ensureChatDir();
    const filename = `Chat-${formatTimestamp()}.md`;
    const filePath = path.join(chatDir, filename);
    const header = [
      '# Pet Collaboration Chat',
      '',
      `Date: ${new Date().toLocaleString()}`,
      `Participants: ${(participants || []).join(', ')}`,
      '',
      '---',
      ''
    ].join('\n');
    fs.writeFileSync(filePath, header);
    return filePath;
  } catch (e) {
    console.error('Chat log create error:', e);
    return null;
  }
});

ipcMain.handle('append-chat-log', async (event, { filePath, line }) => {
  try {
    if (!filePath || !line) return false;
    fs.appendFileSync(filePath, line + '\n');
    return true;
  } catch (e) {
    console.error('Chat log append error:', e);
    return false;
  }
});

// 앱 종료 시 정리
app.on('before-quit', () => {
  for (const entry of activeProcesses.values()) {
    if (entry.proc) entry.proc.kill();
    else if (entry.kill) entry.kill();
    else if (entry.abort) entry.abort();
    clearTimeout(entry.permissionTimer);
  }
  activeProcesses.clear();
});

app.whenReady().then(() => { createWindow(); createTray(); });
app.on('window-all-closed', () => app.quit());
