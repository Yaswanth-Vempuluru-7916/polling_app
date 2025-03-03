// src/main.rs
use axum::{extract::Extension, http::StatusCode, response::IntoResponse, routing::{get, post}, Router};
use std::net::SocketAddr;
#[cfg(feature = "wasm")]
use std::path::PathBuf;
use tower_sessions::{
    cookie::{time::Duration, SameSite},
    Expiry, MemoryStore, SessionManagerLayer,
};
use tower_http::cors::CorsLayer;
use http::{Method, header};
use crate::auth::{finish_authentication, finish_register, start_authentication, start_register, get_current_user};
use crate::startup::AppState;
use crate::routes::polls;

#[macro_use]
extern crate tracing;

mod auth;
mod startup;
mod error;
mod models;
mod routes;
mod websocket;

#[cfg(all(feature = "javascript", feature = "wasm", not(doc)))]
compile_error!("Feature \"javascript\" and feature \"wasm\" cannot be enabled at the same time");

#[tokio::main]
async fn main() {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "INFO");
    }
    tracing_subscriber::fmt::init();

    let app_state = AppState::new().await;

    let session_store = MemoryStore::default();

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(vec![header::CONTENT_TYPE])
        .allow_origin("http://localhost:3000".parse::<axum::http::HeaderValue>().unwrap())
        .allow_credentials(true);

        let app = Router::new()
        .route("/register_start/:username", post(start_register))
        .route("/register_finish", post(finish_register))
        .route("/login_start/:username", post(start_authentication))
        .route("/login_finish", post(finish_authentication))
        .route("/api/user", get(get_current_user)) // Added for frontend user fetch
        .merge(polls::router(app_state.broadcast_tx.clone()))
        .route("/ws", axum::routing::get(crate::websocket::websocket_handler))
        .layer(Extension(app_state))
        .layer(
            SessionManagerLayer::new(session_store)
                .with_name("webauthnrs")
                .with_same_site(SameSite::Strict)
                .with_secure(false)
                .with_expiry(Expiry::OnInactivity(Duration::seconds(360))),
        )
        .layer(cors)
        .fallback(handler_404);

    #[cfg(feature = "wasm")]
    if !PathBuf::from("./assets/wasm").exists() {
        panic!("Can't find WASM files to serve!");
    }

    #[cfg(feature = "wasm")]
    let app = Router::new()
        .merge(app)
        .nest_service("/", tower_http::services::ServeDir::new("assets/wasm"));

    #[cfg(feature = "javascript")]
    let app = Router::new()
        .merge(app)
        .nest_service("/", tower_http::services::ServeDir::new("assets/js"));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Unable to spawn tcp listener");

    axum::serve(listener, app).await.unwrap();
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "Nothing to see here")
}