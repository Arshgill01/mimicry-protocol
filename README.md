# 🦑 Mimicry Protocol

A high-fidelity honeypot system with a cyberpunk command center dashboard. Intercept, analyze, and respond to hacker attacks in real-time.

![Dashboard](dashboard/app/favicon.ico)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- Rust (for Tentacle SSH honeypot)

### 1. Start Brain (FastAPI Backend)
```bash
cd brain
pip install -r requirements.txt
python main.py
```
Brain runs on `http://localhost:8000`

### 2. Start Dashboard (Next.js Frontend)
```bash
cd dashboard
npm install
npm run dev
```
Dashboard runs on `http://localhost:3000`

### 3. Start Tentacle (Rust SSH Honeypot)
```bash
cd tentacle
cargo run
```
SSH Honeypot listens on port `2222`

### 4. Test with a fake attacker
```bash
nc localhost 2222
# Type commands like: ls, cat /etc/passwd, rm -rf /
```

---

## 🎮 Dashboard Features

### Real-Time Monitoring
- **3D Globe** - See attacks originating from around the world
- **Live Activity Feed** - Watch commands as they happen
- **Session Cards** - Expandable views of each hacker session

### Threat Response (God Mode)
- **TARPIT** - Slow down the attacker with infinite delays
- **INK** - Flood the attacker with fake data
- **RESET** - Return to normal response mode

### Analytics
- **Stats Panel** - Active sessions, threats, commands
- **Command Timeline** - Hourly activity visualization
- **System Status** - Brain & Tentacle connectivity

### Features
- **Search & Filter** - Find sessions by command, country, status
- **Export JSON** - Download all session data
- **Volume Control** - Adjust alert/ambient sound levels
- **Ambient Mode** - Enable subtle background hum for immersion

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  🐙 Tentacle (Rust)    │
                 │  SSH Honeypot :2222    │
                 └────────────────────────┘
                              │ HTTP API
                              ▼
                 ┌────────────────────────┐
                 │  🧠 Brain (Python)     │
                 │  FastAPI + Groq LLM    │
                 │  SQLite persistence    │
                 └────────────────────────┘
                              │ WebSocket
                              ▼
                 ┌────────────────────────┐
                 │  🖥️ Dashboard (React)  │
                 │  Next.js + Globe.gl    │
                 └────────────────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Dashboard | Next.js 16, React 19, Framer Motion, Globe.gl |
| Brain | FastAPI, Groq API (Llama 3.3 70B), SQLite |
| Tentacle | Rust, Tokio, Tokio-SSH |
| Audio | Web Audio API (procedural sounds) |

---

## 🔧 Configuration

### Environment Variables (Brain)
```bash
export GROQ_API_KEY="your_groq_api_key"
```

### Ports
| Service | Port |
|---------|------|
| Dashboard | 3000 |
| Brain API | 8000 |
| Tentacle SSH | 2222 |

---

## 📝 License

MIT License - See LICENSE file for details.

---

Built with 🦑 by the Mimicry Protocol team.
