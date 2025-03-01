// src/websocket/mod.rs
use axum::{
    extract::{ws::WebSocketUpgrade, Extension},
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast::{self, Sender};
use crate::startup::AppState;
use crate::models::Poll;
use axum::extract::ws::{Message, WebSocket};
use mongodb::bson::{doc, oid::ObjectId};
use serde_json;
use tokio::sync::Mutex;


pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Extension(app_state): Extension<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, app_state))
}

async fn handle_socket(socket: WebSocket, app_state: AppState) {
    let (ws_sender, mut ws_receiver) = socket.split();
    let ws_sender = Arc::new(Mutex::new(ws_sender)); // Wrap sender in Arc<Mutex>
    let (tx, mut rx) = broadcast::channel::<Poll>(100);
    let tx = Arc::new(tx);

    // Clone `ws_sender` before moving into async blocks
    let ws_sender_clone = Arc::clone(&ws_sender);
    let app_state_clone = app_state.clone();
    let tx_clone = tx.clone();

    tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            if let Message::Text(text) = msg {
                if text.starts_with("join_poll:") {
                    let poll_id = text.strip_prefix("join_poll:").unwrap();
                    if let Ok(poll_id) = ObjectId::parse_str(poll_id) {
                        let collection = app_state_clone.db.collection::<Poll>("polls");
                        if let Ok(Some(poll)) = collection.find_one(doc! { "_id": poll_id }).await {
                            let poll_json = serde_json::to_string(&poll).unwrap();

                            // Lock ws_sender to send a message
                            let mut sender = ws_sender_clone.lock().await;
                            let _ = sender.send(Message::Text(poll_json)).await;

                            let _ = tx_clone.send(poll);
                        }
                    }
                }
            }
        }
    });

    // Broadcast updates to connected clients
    while let Ok(poll) = rx.recv().await {
        let poll_json = serde_json::to_string(&poll).unwrap();

        // Lock ws_sender before sending the message
        let mut sender = ws_sender.lock().await;
        let _ = sender.send(Message::Text(poll_json)).await;
    }
}
pub fn get_broadcast_sender() -> Arc<Sender<Poll>> {
    let (tx, _) = broadcast::channel::<Poll>(100);
    Arc::new(tx)
}