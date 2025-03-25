// src/main.rs
use crate::auth::{
    finish_authentication, finish_register, get_current_user, start_authentication, start_register,
};
use crate::routes::polls;
use crate::startup::AppState;
use axum::{
    extract::Extension,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use dotenvy::dotenv;
use http::{header, Method};
use std::env;
use std::net::SocketAddr;
use tokio::signal;
use tower_http::cors::CorsLayer;
use tower_sessions::{
    cookie::{time::Duration, SameSite},
    Expiry, SessionManagerLayer,
};
use tower_sessions_mongodb_store::{mongodb::Client, MongoDBStore};

#[macro_use]
extern crate tracing;

mod auth;
mod error;
mod models;
mod routes;
mod startup;
mod websocket;

#[tokio::main]
async fn main() {
    dotenv().ok();
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "INFO");
    }
    tracing_subscriber::fmt::init();

    let app_state = AppState::new().await;

    // Load MongoDB session store
    let mongo_uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set in environment variables");
    let client = Client::with_uri_str(&mongo_uri).await.expect("Failed to connect to MongoDB");
    let session_store = MongoDBStore::new(client, "polling-app".to_string());

    // CORS Configuration
    let rp_origin = env::var("RP_ORIGIN").expect("RP_ORIGIN must be set in environment variables");
    info!("CORS: Allowing origin: {}", rp_origin);

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS]) // Ensure OPTIONS is handled
        .allow_headers(vec![header::CONTENT_TYPE, header::ACCEPT, header::AUTHORIZATION])
        .allow_origin(
            rp_origin
                .parse::<axum::http::HeaderValue>()
                .expect("RP_ORIGIN must be a valid header value"),
        )
        .allow_credentials(true); // Required for cookies/auth headers

    // Session management
    let session_layer = SessionManagerLayer::new(session_store)
        .with_name("webauthnrs")
        .with_same_site(SameSite::None)
        .with_secure(true)
        .with_expiry(Expiry::OnInactivity(Duration::seconds(360)))
        .with_http_only(true)
        .with_path("/");

    // Router setup
    let app = Router::new()
        .route("/register_start/:username", post(start_register).options(preflight_response))
        .route("/register_finish", post(finish_register).options(preflight_response))
        .route("/login_start/:username", post(start_authentication).options(preflight_response))
        .route("/login_finish", post(finish_authentication).options(preflight_response))
        .route("/api/user", get(get_current_user).options(preflight_response))
        .route("/api/logout", get(crate::auth::logout).options(preflight_response))
        .merge(polls::router(app_state.broadcast_tx.clone()))
        .route("/ws", get(crate::websocket::websocket_handler))
        .layer(Extension(app_state))
        .layer(cors) // Attach CORS
        .layer(session_layer)
        .fallback(handler_404);

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid number");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Unable to spawn TCP listener");

    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

// Handles 404 errors
async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "Nothing to see here")
}

// ✅ Explicitly handle OPTIONS requests (CORS Preflight)
async fn preflight_response() -> impl IntoResponse {
    StatusCode::NO_CONTENT // 204 response for CORS preflight
}

// ✅ Graceful shutdown signal
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>(); // No-op on Windows

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
