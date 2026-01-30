# Project: Mimicry Protocol - Phase 3: The Dashboard (The Eyes)

## 1. Current Status

We have a functioning backend:

- Rust (`/tentacle`) handles raw TCP connections.
- Python (`/brain`) provides LLM intelligence and defense strategies (`TARPIT`, `INK`).

## 2. Phase 3 Objectives

We need a **Real-Time Web Dashboard** to visualize attacks as they happen.

- **Data Flow Update:** The Python Brain will act as the "Broadcaster." When it processes a command, it will send the data to the Rust Tentacle (as before) AND broadcast it to the Frontend via WebSocket.
- **The UI:** A "Cyberpunk/Hacker" aesthetic dashboard showing live logs, threat levels, and the status of the Octopus.

---

## 3. Implementation Steps

### 3.1 Backend Update: Add WebSockets to Python (`/brain/main.py`)

**Task:** Enable real-time communication with the browser.

1.  **WebSocket Manager:** Add a `ConnectionManager` class to handle active WebSocket connections (connect, disconnect, broadcast).
2.  **Endpoint:** Create a standard WebSocket endpoint: `@app.websocket("/ws")`.
3.  **Broadcast Logic:** Modify the existing `process_command` function.
    - Right before returning the JSON response to Rust, **await** a broadcast message to all connected Websockets.
    - **Message Format:**
      ```json
      {
        "timestamp": "HH:MM:SS",
        "ip": "127.0.0.1", // Mock this or pass from Rust if available
        "command": "rm -rf /",
        "action": "TARPIT", // or REPLY, INK
        "response_snippet": "Permission denied..."
      }
      ```

### 3.2 Frontend Setup (`/dashboard`)

**Task:** Initialize the visualization layer.

1.  **Stack:** create a new Next.js project: `npx create-next-app@latest dashboard` (TypeScript, Tailwind, App Router).
2.  **Dependencies:** Install `lucide-react` for icons and `framer-motion` for animations.

### 3.3 The UI Components

**Design Goal:** Dark mode, monospace fonts, "Command Center" vibe.

**Create a main page (`page.tsx`) with two primary sections:**

#### Section A: The "Octopus State" (Visual Indicator)

- A large central status indicator.
- **State Logic:**
  - **Idle:** Green Ring / Pulse. Text: "SYSTEM: WAITING".
  - **Active (REPLY):** Yellow Ring / Fast Pulse. Text: "MIMICRY: ACTIVE".
  - **Defense (TARPIT/INK):** Red or Blue Ring / Aggressive Animation. Text: "DEFENSE MODE: INK DEPLOYED".

#### Section B: The Live Attack Log (Terminal View)

- A scrolling container that mimics a terminal window.
- It connects to `ws://localhost:8000/ws` on mount.
- When a message arrives, prepend it to the list.
- **Styling:**
  - Normal commands (`ls`): White text.
  - Threats (`rm -rf`): Red text.
  - Octopus Responses: Dimmed gray text.

### 3.4 Detailed Implementation Prompts (Code Generation)

**Step 1:**
"Update `brain/main.py` to include `WebSocket` from `fastapi` and a `ConnectionManager`. Broadcast every processed command event to connected clients."

**Step 2:**
"Create the Next.js `dashboard` page. Use a `useWebSocket` hook to connect to the backend. Store the logs in a React state array. Render the logs in a styled 'terminal' window using Tailwind CSS (bg-black, text-green-400, font-mono)."

**Step 3:**
"Add the visual flair. Use `framer-motion` to create a 'Status Circle' component that changes color (Green/Yellow/Red) based on the last received `action` from the WebSocket. If the action is `TARPIT`, the screen should visually 'glitch' or turn red."

### 3.5 Definition of Done

1.  I start Python, Rust, and the Next.js dev server.
2.  I open `localhost:3000` (Dashboard).
3.  I run `nc localhost 2222` and type `ls`.
4.  **Result:** The Dashboard instantly updates showing the command `ls` and the status "MIMICRY ACTIVE".
5.  I type `rm -rf`.
6.  **Result:** The Dashboard flashes RED, shows "TARPIT ACTIVE", and logs the threat.

**Action:**
Please generate the code for the Python WebSocket update first, then the Next.js page component.
