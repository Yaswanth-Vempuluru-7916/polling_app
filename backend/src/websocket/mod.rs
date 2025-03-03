// src/websocket/mod.rs
use axum::{
    extract::{WebSocketUpgrade, Extension},
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::startup::AppState;
use crate::models::Poll;
use axum::extract::ws::{Message, WebSocket};
use mongodb::bson::{doc, oid::ObjectId};
use serde_json;

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Extension(app_state): Extension<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, app_state))
}

async fn handle_socket(socket: WebSocket, app_state: AppState) {
    let (ws_sender, mut ws_receiver) = socket.split();
    let ws_sender = Arc::new(Mutex::new(ws_sender));
    let tx = Arc::clone(&app_state.broadcast_tx);
    let mut rx = tx.subscribe();

    let ws_sender_clone = Arc::clone(&ws_sender);
    tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if text.starts_with("join_poll:") {
                        let poll_id = text.strip_prefix("join_poll:").unwrap();
                        if let Ok(poll_id) = ObjectId::parse_str(poll_id) {
                            let collection = app_state.db.collection::<Poll>("polls");
                            match collection.find_one(doc! { "_id": poll_id }).await {
                                Ok(Some(poll)) => {
                                    let poll_json = serde_json::to_string(&poll).unwrap();
                                    let mut sender = ws_sender_clone.lock().await;
                                    if let Err(e) = sender.send(Message::Text(poll_json)).await {
                                        error!("Failed to send poll update: {:?}", e);
                                    }
                                }
                                Ok(None) => info!("Poll {} not found", poll_id),
                                Err(e) => error!("Database error fetching poll {}: {:?}", poll_id, e),
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    info!("WebSocket client closed connection");
                    break;
                }
                Err(e) => {
                    error!("WebSocket receive error: {:?}", e);
                    break;
                }
                _ => info!("Received non-text message, ignoring"),
            }
        }
        info!("WebSocket receiver loop ended");
    });

    while let Ok(poll) = rx.recv().await {
        let poll_json = serde_json::to_string(&poll).unwrap();
        let mut sender = ws_sender.lock().await;
        if let Err(e) = sender.send(Message::Text(poll_json)).await {
            error!("Failed to broadcast poll update: {:?}", e);
            break;
        }
    }
    info!("WebSocket broadcast loop ended");
}