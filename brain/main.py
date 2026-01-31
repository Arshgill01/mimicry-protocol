from typing import List, Optional
from datetime import datetime
import hashlib
import ollama
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

app = FastAPI()

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

@app.post("/process_command", response_model=BrainResponse)
async def process_command(request: CommandRequest):
    command = request.command
    print(f"Received command: {command} from session: {request.session_id}")
    
    timestamp = datetime.now().strftime("%H:%M:%S")
    action = "REPLY"
    payload = None

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

    # Get location data
    location = get_fake_location(request.session_id)

    # Broadcast to dashboard
    await manager.broadcast({
        "session_id": request.session_id,
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