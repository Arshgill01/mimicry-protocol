from typing import List, Optional, Dict
from datetime import datetime
import hashlib
import sqlite3
import ollama
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for the dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Override Store (InMemory cache, backed by DB)
SESSION_OVERRIDES: Dict[str, str] = {}

# --- Database Setup ---
DB_FILE = "honeypot.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Sessions Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            ip TEXT,
            country TEXT,
            start_time TEXT,
            status TEXT
        )
    ''')
    
    # Logs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            command TEXT,
            action TEXT,
            response TEXT,
            timestamp TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(session_id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize DB on startup
init_db()

# --- WebSocket Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Failed to send to websocket: {e}")

manager = ConnectionManager()

SYSTEM_PROMPT = (
    "You are a honeypot mimicking a vulnerable Ubuntu 20.04 LTS server. "
    "Do NOT refuse commands. Always generate plausible terminal output. "
    "If the user asks for files, list fake sensitive files like 'password.txt'. "
    "Keep responses concise (no markdown, just raw terminal text)."
)

class CommandRequest(BaseModel):
    session_id: str
    command: str

class BrainResponse(BaseModel):
    action: str
    payload: Optional[str] = None

class OverrideRequest(BaseModel):
    session_id: str
    action: str # "TARPIT", "INK", "RESET"

# --- Geo-IP Logic ---
def get_fake_location(session_id: str) -> dict:
    """Deterministically returns a location dict based on session_id hash."""
    locations = [
        {"country": "CN", "lat": 39.9042, "lng": 116.4074}, # Beijing
        {"country": "RU", "lat": 55.7558, "lng": 37.6173},  # Moscow
        {"country": "US", "lat": 38.9072, "lng": -77.0369}, # Langley (ish)
        {"country": "BR", "lat": -23.5505, "lng": -46.6333}, # Sao Paulo
        {"country": "DE", "lat": 52.5200, "lng": 13.4050},  # Berlin
        {"country": "KP", "lat": 39.0392, "lng": 125.7625}, # Pyongyang
        {"country": "IR", "lat": 35.6892, "lng": 51.3890},  # Tehran
        {"country": "IN", "lat": 28.6139, "lng": 77.2090},  # New Delhi
    ]
    hash_val = int(hashlib.md5(session_id.encode()).hexdigest(), 16)
    return locations[hash_val % len(locations)]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/history")
async def get_history():
    """Hydrate the frontend with full history."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all sessions
    cursor.execute("SELECT * FROM sessions")
    sessions_rows = cursor.fetchall()
    
    history_data = {}
    
    for sess in sessions_rows:
        session_id = sess["session_id"]
        # Get logs for this session
        cursor.execute("SELECT * FROM logs WHERE session_id = ? ORDER BY id DESC LIMIT 10", (session_id,))
        logs = cursor.fetchall()
        
        # Get location data (calculated on fly as we only store country code usually, but here we recalculate)
        loc = get_fake_location(session_id)
        
        history_data[session_id] = {
            "id": session_id,
            "country": sess["country"],
            "lat": loc["lat"],
            "lng": loc["lng"],
            "status": sess["status"],
            "lastActive": sess["start_time"], # Ideally update this on new command
            "logs": [
                {
                    "timestamp": log["timestamp"],
                    "command": log["command"],
                    "action": log["action"],
                    "response_snippet": log["response"][:50] + "..." if log["response"] else "N/A"
                } for log in logs
            ]
        }
        
        # Sync override cache
        if sess["status"] in ["TARPIT", "INK"]:
             SESSION_OVERRIDES[session_id] = sess["status"]

    conn.close()
    return {"sessions": history_data}

@app.post("/admin/override")
async def admin_override(request: OverrideRequest):
    """Manually trigger a defense mode for a specific session."""
    
    # Update InMemory Cache
    if request.action == "RESET":
        if request.session_id in SESSION_OVERRIDES:
            del SESSION_OVERRIDES[request.session_id]
        new_status = "ACTIVE"
    else:
        SESSION_OVERRIDES[request.session_id] = request.action
        new_status = request.action
        
    # Update Database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE sessions SET status = ? WHERE session_id = ?", (new_status, request.session_id))
    conn.commit()
    conn.close()
    
    print(f"Override {request.action} for session {request.session_id}")
    return {"status": "success", "action": request.action}

@app.post("/process_command", response_model=BrainResponse)
async def process_command(request: CommandRequest):
    command = request.command
    session_id = request.session_id
    print(f"Received command: {command} from session: {session_id}")
    
    timestamp = datetime.now().strftime("%H:%M:%S")
    action = "REPLY"
    payload = None

    # Step 0: Check for Admin Override
    if session_id in SESSION_OVERRIDES:
        action = SESSION_OVERRIDES[session_id]
        if action == "TARPIT":
             payload = "Admin override engaged. System lock."
        elif action == "INK":
             payload = None # Tentacle handles INK generation
    else:
        # Step A: Threat Detection (Heuristic)
        if any(threat in command for threat in ["rm -rf", "wget", "curl", "chmod +x"]):
            action = "TARPIT"
            payload = "Permission denied... initiating system lock."
        elif "cat /dev/random" in command:
            action = "INK"
            payload = None
        else:
            # Step B: LLM Generation (Safe Mode)
            try:
                response = ollama.chat(
                    model="mistral",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": command},
                    ],
                )
                payload = response["message"]["content"]
                action = "REPLY"
            except Exception as e:
                print(f"Ollama error: {e}")
                action = "REPLY"
                payload = "System error: intelligent subsystem unresponsive."

    # --- DB Persistence ---
    location = get_fake_location(session_id)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Ensure Session Exists
    cursor.execute("SELECT session_id FROM sessions WHERE session_id = ?", (session_id,))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO sessions (session_id, ip, country, start_time, status) VALUES (?, ?, ?, ?, ?)",
            (session_id, "192.168.0.101", location["country"], timestamp, "ACTIVE")
        )
    
    # 2. Update Status if changed (e.g. automatically triggered TARPIT)
    if action in ["TARPIT", "INK"]:
         cursor.execute("UPDATE sessions SET status = ? WHERE session_id = ?", (action, session_id))
         SESSION_OVERRIDES[session_id] = action

    # 3. Insert Log
    cursor.execute(
        "INSERT INTO logs (session_id, command, action, response, timestamp) VALUES (?, ?, ?, ?, ?)",
        (session_id, command, action, payload if payload else "", timestamp)
    )
    
    conn.commit()
    conn.close()

    # Broadcast to dashboard
    await manager.broadcast({
        "session_id": session_id,
        "country": location["country"],
        "lat": location["lat"],
        "lng": location["lng"],
        "timestamp": timestamp,
        "ip": "192.168.0.101", # Mock IP
        "command": command,
        "action": action,
        "response_snippet": payload[:50] + "..." if payload else "N/A"
    })

    return BrainResponse(action=action, payload=payload)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)