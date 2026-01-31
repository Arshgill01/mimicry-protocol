# Agent Task: Mimicry Protocol - Phase 4: Immersion & Memory

**Role:** Senior Full-Stack Engineer (Python/FastAPI + React/Web Audio API)
**Project:** "Mimicry Protocol" - A high-fidelity hacker honeypot dashboard.
**Current State:** We have a functional 3D dashboard with "God Mode" controls and a 3D globe.
**Problem:** The system feels "hollow" because it is silent, and it is fragile because restarting the backend wipes all data.

**Objective:** Implement a SQLite database for data persistence and add cinematic sound effects using the Web Audio API to create a true "War Room" atmosphere.

---

## 1. Context & Requirements

To make the system production-ready and immersive for the hackathon demo, we need:

1.  **Persistence:** We must store every session, command, and status change in a database. When the Python server restarts, the dashboard must be able to "hydrate" (reload) the full history of attacks.
2.  **Audio:** The system must generate sci-fi UI sounds programmatically (no external MP3 files allowed) for key events:
    - **PING:** A high-pitched sonar beep when a new hacker connects.
    - **ALARM:** A low, pulsing warning sound when a threat (`TARPIT` or `INK`) is triggered.

---

## 2. Implementation Instructions

### Step A: Backend Persistence (`src/brain/main.py`)

**Goal:** Replace the current in-memory lists with a SQLite database.

1.  **Database Setup:**

    - Use the built-in `sqlite3` library (keep it simple, do not use an ORM like SQLAlchemy).
    - **Database File:** `honeypot.db` (create automatically on startup if missing).
    - **Schema:**
      - `sessions` table:
        - `session_id` (TEXT PRIMARY KEY)
        - `ip` (TEXT)
        - `country` (TEXT)
        - `start_time` (TEXT)
        - `status` (TEXT) - e.g., 'ACTIVE', 'TARPIT', 'INK'
      - `logs` table:
        - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
        - `session_id` (TEXT, Foreign Key)
        - `command` (TEXT)
        - `action` (TEXT)
        - `response` (TEXT)
        - `timestamp` (TEXT)

2.  **Logic Updates (Refactor `process_command`):**

    - **On New Command:**
      - Check if `session_id` exists in DB. If not, insert into `sessions` with the fake country/IP logic we already have.
      - Insert the interaction into `logs`.
    - **On Override (God Mode):**
      - Update the `status` column in the `sessions` table when the Admin triggers an override.

3.  **New API Endpoint:**
    - **Endpoint:** `GET /history`
    - **Logic:** Query all sessions and their associated logs.
    - **Response Format:** A nested JSON structure suitable for the frontend state:
      ```json
      {
        "sessions": {
          "uuid-123": {
            "id": "uuid-123",
            "country": "RU",
            "status": "ACTIVE",
            "history": [ ...logs... ]
          }
        }
      }
      ```

### Step B: Frontend Audio Engine (`dashboard/app/hooks/useCyberSounds.ts`)

**Goal:** Generate "Hacker Movie" sound effects using purely code (Web Audio API) so we don't need to manage assets.

1.  **Create Custom Hook:** `useCyberSounds()`
    - **Method `playPing()`:**
      - Create an `OscillatorNode` (type: 'sine').
      - Frequency: Start high (~1200Hz) and exponentialRamp quickly down to 0Hz over 0.1s.
      - Effect: A sharp "Bip!" sound.
    - **Method `playAlarm()`:**
      - Create an `OscillatorNode` (type: 'sawtooth').
      - Frequency: Low (~100Hz).
      - Gain: Oscillate volume up and down (0.1 to 0.5) to create a "throbbing" alarm texture.
      - Duration: Play for 1.5 seconds then stop.

### Step C: Frontend Integration (`dashboard/app/page.tsx`)

**Goal:** Connect the Brain and the Ears.

1.  **Hydration (Memory):**

    - Add a `useEffect` hook that runs once on mount.
    - `fetch('http://localhost:8000/history')`
    - Update the `activeSessions` state with the result.
    - _Result:_ The map and grid populate immediately, even if you just opened the page.

2.  **Audio Triggers:**

    - Import `useCyberSounds`.
    - **Trigger Logic (inside `ws.onmessage`):**
      - If the message contains a `session_id` we haven't seen before -> `playPing()`.
      - If `message.action` is "TARPIT" or "INK" -> `playAlarm()`.

3.  **UI Polish:**
    - Add a simple "Mute/Unmute" toggle button (Speaker Icon) in the top-right corner of the dashboard. Store this preference in React State.

---

## 3. Definition of Done

1.  **Persistence Test:** I can start the system, run 5 commands, stop the Python server, restart it, refresh the webpage, and see all 5 commands still listed.
2.  **Audio Test:**
    - Running `nc localhost 2222` triggers a "Ping" sound.
    - Running `rm -rf /` triggers an "Alarm" sound.
3.  **Code Quality:** No external dependencies for audio; DB handles locking correctly.

---

**Output:**
Please provide the full updated code for:

1.  `src/brain/main.py` (Complete file with SQLite integration)
2.  `dashboard/app/hooks/useCyberSounds.ts` (New file)
3.  `dashboard/app/page.tsx` (Complete file with Audio and Hydration logic)
