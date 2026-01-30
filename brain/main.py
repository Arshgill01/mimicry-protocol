from typing import List, Optional
from datetime import datetime
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

    # Broadcast to dashboard
    await manager.broadcast({
        "timestamp": timestamp,
        "ip": "127.0.0.1", # Mock IP for now, passed from Rust in real scenario
        "command": command,
        "action": action,
        "response_snippet": payload[:50] + "..." if payload else "N/A"
    })

    return BrainResponse(action=action, payload=payload)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)