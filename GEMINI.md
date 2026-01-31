# Agent Task: Mimicry Protocol - Phase 3.2: The Cyber-Warfare Visuals

**Role:** Creative Frontend Engineer (Three.js/React + UI/UX)
**Project:** "Mimicry Protocol" - A hacker honeypot dashboard.
**Current State:** We have a grid of active "Session Cards" tracking hackers.
**Objective:** Implement the "War Room" aesthetic. This involves a 3D Cyber-Globe visualizing attacks and a global CRT/Scanline post-processing effect to make the UI look like a retro-futuristic terminal.

---

## 1. Context & Requirements

The dashboard currently functions but looks too "clean." We need to dial up the "Hollywood Hacker" factor.

**Key Features to Add:**

1.  **3D Cyber Globe:** A WebGL globe that visualizes active sessions as "Threat Vectors" (arcs) connecting the attacker's location to our server.
2.  **CRT Overlay:** A global CSS effect that adds scanlines, screen flicker, and a slight curvature vignette to mimic an old monitor.
3.  **Data Enrichment:** The Python backend must now provide (fake) Latitude/Longitude coordinates so we can plot these points on the map.

---

## 2. Implementation Instructions

### Step A: Backend Update (`src/brain/main.py`)

**Goal:** Provide geospatial data for the globe.

1.  **Update `process_command`**:
    - In the `manager.broadcast` payload, add `lat` and `lng`.
    - **Logic:**
      - Define a helper `get_fake_coords(session_id)`.
      - Use `hash(session_id)` to deterministically pick coordinates from a list of "High Threat" locations (e.g., Moscow, Beijing, Pyongyang, Sao Paulo, Langley).
      - _Why deterministic?_ So the same session ID always appears at the same spot on the map, even if the page refreshes.
    - **Payload Example:**
      ```python
      {
        "session_id": "...",
        "lat": 55.7558, # Moscow
        "lng": 37.6173,
        # ... existing fields
      }
      ```

### Step B: Frontend Dependencies

**Instruction:**

- Add `react-globe.gl` and `three` to the project.
  - (Agent Note: If you cannot run npm commands, provide the `npm install react-globe.gl three` command in the output for the user).

### Step C: The Globe Component (`dashboard/app/components/CyberGlobe.tsx`)

**Goal:** A dark, moody holographic globe.

1.  **Create `CyberGlobe.tsx`**:
    - Use `react-globe.gl`.
    - **Visuals:**
      - `globeImageUrl`: Use a dark/night texture (or `//unpkg.com/three-globe/example/img/earth-dark.jpg`).
      - `backgroundColor`: `rgba(0,0,0,0)` (Transparent).
      - `atmosphereColor`: "green".
    - **Data Layers:**
      - **Points:** Render a red pulsing ring at the `lat/lng` of every **Active Session**.
      - **Arcs:** Draw a green curve from the Attacker's `lat/lng` to "Home Base" (pick a fixed coordinate, e.g., San Francisco).
      - **Arc Speed:** The animation speed should increase if the session status is `TARPIT` or `INK`.

### Step D: The CRT Effect (`dashboard/app/globals.css`)

**Goal:** Global retro-terminal atmosphere.

1.  **Add CSS Variables & Keyframes:**
    - Create a `.crt-overlay` class that sits on top of everything (`z-index: 50`, `pointer-events: none`).
    - **Scanlines:** A repeating linear gradient background that moves slightly.
    - **Flicker:** A subtle opacity animation (97% to 100%).
    - **Vignette:** A radial gradient to darken the corners.

### Step E: Integration (`dashboard/app/page.tsx`)

**Goal:** Layout assembly.

1.  **Update Layout:**
    - Insert the `<CyberGlobe />` component at the top of the page (The "World View" Zone).
    - Ensure the `activeSessions` state is passed to the Globe to render the points/arcs real-time.
    - Wrap the entire main div in the `crt-overlay` class (or add a div for it).

---

## 3. Definition of Done

1.  **Backend:** `src/brain/main.py` sends coordinates.
2.  **Visuals:** The dashboard now has a 3D globe at the top.
3.  **Interaction:** When I connect via `nc localhost 2222`, a new arc appears on the globe connecting a random country to my server.
4.  **Aesthetics:** The whole screen has a subtle scanline effect.

---

**Output:**
Please provide the full updated code for:

1.  `src/brain/main.py`
2.  `dashboard/app/globals.css`
3.  `dashboard/app/components/CyberGlobe.tsx` (New File)
4.  `dashboard/app/page.tsx`
