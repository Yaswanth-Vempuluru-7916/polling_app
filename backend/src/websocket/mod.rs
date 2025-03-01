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
    let tx = Arc::clone(&app_state.broadcast_tx); // Use shared channel
    let mut rx = tx.subscribe(); // Subscribe to the shared channel

    // Handle incoming messages (e.g., join_poll)
    let ws_sender_clone = Arc::clone(&ws_sender);
    let app_state_clone = app_state.clone();
    tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            if let Message::Text(text) = msg {
                if text.starts_with("join_poll:") {
                    let poll_id = text.strip_prefix("join_poll:").unwrap();
                    if let Ok(poll_id) = ObjectId::parse_str(poll_id) {
                        let collection = app_state_clone.db.collection::<Poll>("polls");
                        if let Ok(Some(poll)) = collection.find_one(doc! { "_id": poll_id }).await {
                            let poll_json = serde_json::to_string(&poll).unwrap();
                            let mut sender = ws_sender_clone.lock().await;
                            let _ = sender.send(Message::Text(poll_json)).await;
                        }
                    }
                }
            }
        }
    });

    // Broadcast updates to this client
    while let Ok(poll) = rx.recv().await {
        let poll_json = serde_json::to_string(&poll).unwrap();
        let mut sender = ws_sender.lock().await;
        let _ = sender.send(Message::Text(poll_json)).await;
    }
}