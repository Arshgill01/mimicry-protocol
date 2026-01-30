from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class CommandRequest(BaseModel):
    session_id: str
    command: str

@app.post("/process_command")
async def process_command(request: CommandRequest):
    print(f"Received command: {request.command} from session: {request.session_id}")
    return {"response": f"root@ubuntu:~# Command received: {request.command}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
