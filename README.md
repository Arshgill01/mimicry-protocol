# Mimicry Protocol

**A high-fidelity honeypot system with a cyberpunk command center dashboard.**

Intercept, analyze, and respond to hacker attacks in real-time with an immersive War Room interface.

---

## Quick Start

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

### 4. Test with a simulated attacker
```bash
nc localhost 2222
# Type commands like: ls, cat /etc/passwd, rm -rf /
```

---

## Dashboard Features

### Real-Time Monitoring
- **3D Globe** — Visualize attacks originating from around the world
- **Live Activity Feed** — Watch commands as they execute in real-time
- **Session Cards** — Expandable views of each hacker session with full command history

### Threat Response (God Mode)
| Action | Description |
|--------|-------------|
| **TARPIT** | Slow down attackers with infinite delays |
| **INK** | Flood attackers with convincing fake data |
| **RESET** | Return to normal response mode |

### Analytics
- **Stats Panel** — Active sessions, threats detected, total commands
- **Command Timeline** — Hourly activity visualization with threat overlay
- **System Status** — Brain & Tentacle connectivity indicators

### Utilities
- **Search & Filter** — Find sessions by command, country, or status
- **Export** — Download all session data as JSON
- **Audio Controls** — Volume slider and ambient mode toggle

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  Tentacle (Rust)       │
                 │  SSH Honeypot :2222    │
                 └────────────────────────┘
                              │ HTTP API
                              ▼
                 ┌────────────────────────┐
                 │  Brain (Python)        │
                 │  FastAPI + Groq LLM    │
                 │  SQLite persistence    │
                 └────────────────────────┘
                              │ WebSocket
                              ▼
                 ┌────────────────────────┐
                 │  Dashboard (React)     │
                 │  Next.js + Globe.gl    │
                 └────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Dashboard | Next.js 16, React 19, Framer Motion, Globe.gl |
| Brain | FastAPI, Groq API (Llama 3.3 70B), SQLite |
| Tentacle | Rust, Tokio |
| Audio | Web Audio API (procedural synthesis) |

---

## Configuration

### Environment Variables

Create a `.env` file in the `brain/` directory:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

### Ports

| Service | Port |
|---------|------|
| Dashboard | 3000 |
| Brain API | 8000 |
| Tentacle SSH | 2222 |

---

## License

MIT License — See LICENSE file for details.

---

*Built by the Mimicry Protocol team.*
