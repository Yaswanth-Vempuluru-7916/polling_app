// src/websocket/mod.rs
use axum::{
    extract::{WebSocketUpgrade, Extension},
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::startup::AppState;
use axum::extract::ws::{Message, WebSocket};
use serde_json;

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Extension(app_state): Extension<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, app_state))
}

async fn handle_socket(socket: WebSocket, app_state: AppState) {
    info!("New WebSocket connection established");
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let ws_sender = Arc::new(Mutex::new(ws_sender));
    let tx = Arc::clone(&app_state.broadcast_tx);
    let mut rx = tx.subscribe();

    // Handle incoming messages (e.g., join_poll) and keep connection alive
    let ws_sender_clone = Arc::clone(&ws_sender);
    tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    info!("Received message: {}", text);
                    // Handle join_poll messages if needed (optional for this fix)
                }
                Ok(Message::Close(_)) => {
                    info!("Client closed WebSocket connection");
                    return;
                }
                Ok(Message::Ping(data)) => {
                    let mut sender = ws_sender_clone.lock().await;
                    if let Err(e) = sender.send(Message::Pong(data)).await {
                        error!("Failed to send pong: {:?}", e);
                        return;
                    }
                    info!("Sent pong response");
                }
                Err(e) => {
                    error!("WebSocket receive error: {:?}", e);
                    return;
                }
                _ => info!("Received non-text message, ignoring"),
            }
        }
        info!("WebSocket receiver loop ended");
    });

    // Broadcast updates and keep connection alive
    while let Ok(poll) = rx.recv().await {
        let poll_json = match serde_json::to_string(&poll) {
            Ok(json) => json,
            Err(e) => {
                error!("Failed to serialize poll: {:?}", e);
                continue;
            }
        };
        let mut sender = ws_sender.lock().await;
        if let Err(e) = sender.send(Message::Text(poll_json)).await {
            error!("Failed to broadcast poll update: {:?}", e);
            return;
        }
        info!("Broadcasted poll update: {}", poll.id.unwrap().to_hex());
    }
    info!("WebSocket broadcast loop ended");
}