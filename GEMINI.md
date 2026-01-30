# Project: Mimicry Protocol (Octopus Hackathon Submission)

## 1. Context & Vision

We are building "Mimicry Protocol," a next-generation Cybersecurity Honeypot for the Octopus Hackathon.

**The Core Metaphor:** Traditional firewalls are static walls. Mimicry is an **Octopus**.

1.  **Camouflage:** It mimics a vulnerable server (e.g., an Ubuntu terminal) to lure hackers in.
2.  **Intelligence:** It uses an LLM to generate realistic responses to hacker commands, learning their intent.
3.  **Ink (Defense):** When a threat is confirmed, it "deploys ink"—using low-level network tricks (tarpits, infinite loops) to waste the attacker's time.

## 2. The Master Architecture

The system follows a "Split-Brain" architecture to ensure high performance and stability:

- **The Tentacles (Rust):** A high-performance, async TCP Server. It handles raw connections, manages sockets, and executes low-level network defense (Tarpit).
- **The Brain (Python):** A logic layer using FastAPI and a local LLM (Ollama). It analyzes the hacker's input and generates the fake terminal output.
- **The Nervous System:** HTTP/JSON communication between Rust and Python.

---

## 3. Phase 1: The Skeleton (Current Task)

**Objective:** Build the "Hello World" of the honeypot. We need a Rust server that listens for connections and forwards the input to a Python backend, which replies with a mocked response.

**Constraints for this Phase:**

- **Do NOT** build the Frontend/Dashboard yet.
- **Do NOT** implement the complex "Tarpit/Ink" defense logic yet.
- **Do NOT** worry about WebSockets yet.
- Focus purely on: `User -> Rust TCP -> Python API -> Rust TCP -> User`.

### 3.1 Tech Stack Requirements

- **Rust (The Proxy):**
  - Use `tokio` for async runtime (essential for handling multiple hackers).
  - Use `reqwest` to send HTTP requests to the Python Brain.
  - Use `tokio::net::TcpListener`.
- **Python (The Brain):**
  - Use `FastAPI` for the server.
  - Use `uvicorn` to run it.
  - (Optional for now) Prepare the structure for `ollama` integration, but a simple text return is fine for step 1.

### 3.2 Implementation Steps (Execute these in order)

#### Step A: Python Backend Setup (`/brain`)

Create a folder named `brain`. Initialize a Python environment.
Create a file `main.py` with a FastAPI app:

1.  Endpoint: `POST /process_command`
2.  Input JSON: `{"session_id": "string", "command": "string"}`
3.  Logic:
    - Log the received command to the console.
    - Return a JSON response: `{"response": "root@ubuntu:~# Command received: [command]"}`.
4.  Run this server on port `8000`.

#### Step B: Rust TCP Server Setup (`/tentacle`)

Create a folder named `tentacle` (initialize with `cargo new tentacle`).
In `main.rs`:

1.  Bind a `TcpListener` to `0.0.0.0:2222`.
2.  Accept incoming connections in a loop.
3.  Spawn a new `tokio` task for each connection.
4.  **Inside the loop:**
    - Read data from the socket.
    - Convert bytes to UTF-8 string.
    - Send a POST request to `http://localhost:8000/process_command` with the data.
    - Await the response from Python.
    - Write the response back to the socket.

### 3.3 Definition of Done

1.  I can start the Python server.
2.  I can start the Rust server.
3.  I can open a terminal and run `nc localhost 2222` (or `telnet`).
4.  When I type "hello", I see the Python server log it, and my terminal displays the response from Python.

**Action:**
Please generate the folder structure, the `requirements.txt` for Python, the `Cargo.toml` for Rust, and the code for `main.py` and `main.rs`.
