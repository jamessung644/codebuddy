<p align="center">
  <img src="icon.png" width="128" height="128" alt="Code Buddy Logo">
</p>

<h1 align="center">Code Buddy</h1>

<p align="center">
  <strong>Your AI coding companions that live on your macOS desktop</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS-black?style=flat-square&logo=apple" alt="macOS">
  <img src="https://img.shields.io/badge/electron-41.1.0-47848F?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License">
  <img src="https://img.shields.io/badge/pixel_art-80%C3%9764-orange?style=flat-square" alt="Pixel Art">
</p>

---

## What is Code Buddy?

Code Buddy brings adorable pixel-art pets to your macOS desktop. Each pet is an AI-powered coding companion with a specialized role — developer, designer, planner, debugger, reviewer, or tester. They wander around your screen, and you can chat with them to get help with your coding tasks.

### Key Features

- **Desktop Pets** — Cute pixel-art characters that walk, idle, think, and interact on your desktop
- **Multi-AI Support** — Chat with your pets using Claude, OpenAI GPT-4o, Google Gemini, or local Ollama models
- **Specialized Roles** — Each pet has expertise: developer, designer, planner, debugger, reviewer, tester
- **Collaboration Mode** — Gather your pets together and watch them brainstorm as a team
- **Permission System** — Pets jump and glow when Claude CLI needs your approval (click to approve!)
- **File Explorer** — Browse your project files directly in the chat panel
- **Chat Logging** — Collaboration sessions are automatically saved as Markdown files

---

## Screenshots

<table>
<tr>
<td align="center"><strong>Pets on Desktop</strong></td>
<td align="center"><strong>Chat Panel</strong></td>
</tr>
<tr>
<td>Pixel-art pets wander freely on your screen</td>
<td>Chat with any pet via the side panel</td>
</tr>
</table>

---

## Getting Started

### Prerequisites

- **macOS** (Apple Silicon or Intel)
- **Node.js** 18+
- **npm**

### Optional AI Setup

| Provider | Setup |
|----------|-------|
| **Claude** | Install [Claude CLI](https://claude.ai/code) (no API key needed) |
| **OpenAI** | Add your API key in Settings |
| **Gemini** | Add your API key in Settings |
| **Ollama** | Install [Ollama](https://ollama.ai) and pull a model |

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/codebuddy.git
cd codebuddy

# Install dependencies
npm install

# Run the app
npm start
```

### Build

```bash
# Build macOS app
npm run build
# Output: dist/mac-arm64/Code Buddy.app
```

---

## How It Works

### Pet States

| State | Description |
|-------|-------------|
| **Idle** | Standing still, occasional blinking |
| **Walk** | Moving to a random destination with leg animation |
| **Talk** | Mouth animation while showing a chat bubble |
| **Think** | Half-closed eyes, contemplating |
| **Jump** | Bouncing with sparkly eyes — needs your permission approval! |
| **Faint** | Greyed out with X eyes — API quota exhausted (auto-recovers) |

### Architecture

```
Electron Main Process (main.js)
├── AI Providers (Claude CLI / OpenAI / Gemini / Ollama)
├── Config Manager (API keys, preferences)
├── System Tray Menu
└── IPC Handlers
    │
    ├── preload.js (Context Bridge)
    │
    └── Renderer Process
        ├── app.js (UI Controller, Chat, Model Selection)
        ├── pet.js (PixelPet Canvas Renderer + Pet Logic)
        ├── prompts.js (Role-based System Prompts)
        ├── index.html (UI Layout)
        └── style.css (Glassmorphism Dark Theme)
```

### Available AI Models

| Provider | Models |
|----------|--------|
| **Claude** | Default, Sonnet 4.6, Opus 4.6, Haiku 4.5 |
| **OpenAI** | GPT-4o, GPT-4o Mini, o3 |
| **Gemini** | 2.0 Flash, 2.5 Pro |
| **Ollama** | Llama 3, CodeLlama, Mistral |

---

## Collaboration Mode

Click **"Gather"** in the tray menu or control panel to bring all pets together. They'll start a brainstorming session with role-appropriate dialogue:

- Developers discuss architecture and implementation
- Designers talk about UX and layouts
- Planners coordinate timelines and requirements
- ...and more!

Conversations are auto-saved to `Chat/Chat-YYYYMMDD-HHMMSS.md` in your working directory.

---

## Customization

### Pet Colors

8 preset colors available when creating a pet:

| Color | Hex |
|-------|-----|
| Tan/Brown | `#C4836A` |
| Blue | `#6A9EC4` |
| Green | `#8BC46A` |
| Magenta | `#C46AB8` |
| Yellow | `#C4B86A` |
| Cyan | `#6AC4B8` |
| Red | `#C46A6A` |
| Purple | `#8A6AC4` |

### Adding a New Role

1. Add system prompt in `prompts.js`
2. Add role name mappings in `pet.js` (`getRoleName()`, `getRandomGreeting()`, etc.)
3. Add `<option>` in `index.html` modal

### Adding a New AI Provider

1. Add `send{Provider}()` function in `main.js`
2. Add IPC channel in `preload.js`
3. Add dropdown option in `index.html`
4. Update `selectModel()` in `app.js`

---

## Default Pets

| Name | Role | Color |
|------|------|-------|
| Cloudy | Developer | Tan |
| Sonic | Designer | Blue |
| Haiku | Planner | Green |

---

## Tech Stack

- **Electron** 41.1.0 — Desktop app framework
- **HTML5 Canvas** — Pixel art rendering (80x64px, 4px grid)
- **Pure JavaScript** — No frontend framework needed
- **CSS** — Glassmorphism dark theme with animations

---

## Contributing

Contributions are welcome! Here are some ideas:

- [ ] Windows / Linux support
- [ ] More pet animations and states
- [ ] Custom pixel art editor
- [ ] Voice chat integration
- [ ] Plugin system for new AI providers
- [ ] Pet interaction between each other

### Steps

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with pixels and love</sub>
</p>
