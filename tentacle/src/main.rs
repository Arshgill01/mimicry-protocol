use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;

#[derive(Serialize)]
struct CommandRequest {
    session_id: String,
    command: String,
}

#[derive(Deserialize)]
struct CommandResponse {
    action: String,
    payload: Option<String>,
}

#[tokio::main] async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("0.0.0.0:2222").await?;
    println!("Tentacle listening on 0.0.0.0:2222");

    loop {
        let (mut socket, addr) = listener.accept().await?;
        println!("New connection from: {}", addr);

        tokio::spawn(async move {
            let session_id = Uuid::new_v4().to_string();
            let mut buf = [0; 1024];

            // Send initial banner and prompt
            if let Err(e) = socket.write_all(b"Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-91-generic x86_64)\n\nroot@ubuntu:~# ").await {
                eprintln!("Failed to write welcome message: {}", e);
                return;
            }

            loop {
                // Read data from the socket
                let n = match socket.read(&mut buf).await {
                    Ok(n) if n == 0 => return, // Connection closed
                    Ok(n) => n,
                    Err(e) => {
                        eprintln!("Failed to read from socket: {}", e);
                        return;
                    }
                };

                let command = String::from_utf8_lossy(&buf[0..n]).to_string();
                let request_body = CommandRequest {
                    session_id: session_id.clone(),
                    command: command.trim().to_string(),
                };

                // Send POST request to Python Brain
                let client = reqwest::Client::new();
                let res = match client.post("http://localhost:8000/process_command")
                    .json(&request_body)
                    .send()
                    .await {
                        Ok(res) => res,
                        Err(e) => {
                            eprintln!("Failed to contact Brain: {}", e);
                            continue;
                        }
                    };
                
                let brain_resp: CommandResponse = match res.json().await {
                    Ok(data) => data,
                    Err(e) => {
                         eprintln!("Failed to parse Brain response: {}", e);
                         continue;
                    }
                };

                // Handle the action from Brain
                match brain_resp.action.as_str() {
                    "REPLY" => {
                        if let Some(payload) = brain_resp.payload {
                            if let Err(e) = socket.write_all(payload.as_bytes()).await {
                                eprintln!("Failed to write payload: {}", e);
                                return;
                            }
                            // Add a newline if payload doesn't end with one, but usually LLM output might vary.
                            // Adding a newline for safety before prompt.
                            let _ = socket.write_all(b"\n").await;
                        }
                        // Write prompt
                        if let Err(e) = socket.write_all(b"root@ubuntu:~# ").await {
                            eprintln!("Failed to write prompt: {}", e);
                            return;
                        }
                    },
                    "TARPIT" => {
                        println!("Activating TARPIT for session {}", session_id);
                        if let Some(payload) = brain_resp.payload {
                            let _ = socket.write_all(payload.as_bytes()).await;
                            let _ = socket.write_all(b"\n").await;
                        }
                        // Infinite loop: write 1 byte every 10 seconds
                        loop {
                            if let Err(_) = socket.write_all(b" ").await {
                                break;
                            }
                            tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
                        }
                        return; // Connection is effectively dead/stuck
                    },
                    "INK" => {
                        println!("Activating INK for session {}", session_id);
                        let mut rng = StdRng::from_entropy();
                        let mut garbage = [0u8; 4096];
                        
                        loop {
                            rng.fill(&mut garbage);
                            if let Err(_) = socket.write_all(&garbage).await {
                                break;
                            }
                            // No sleep, flood the socket
                        }
                        return;
                    },
                    _ => {
                        eprintln!("Unknown action received: {}", brain_resp.action);
                        let _ = socket.write_all(b"Error: Internal Protocol Mismatch\nroot@ubuntu:~# ").await;
                    }
                }
            }
        });
    }
}
