// src/main.rs
use crate::auth::{
    finish_authentication, finish_register, get_current_user, start_authentication, start_register,
};
use crate::routes::polls;
use crate::startup::AppState;
use axum::{
    extract::Extension,
    http::{self, StatusCode, Method as HttpMethod},
    response::IntoResponse,
    routing::{get, post, options},
    Router,
};
use dotenvy::dotenv;
use http::{header, Method};
use std::net::SocketAddr;
use std::env;
#[cfg(feature = "wasm")]
use std::path::PathBuf;
use tower_http::cors::{CorsLayer, Any};
use tower_sessions::{
    cookie::{time::Duration as SessionDuration, SameSite}, // CHANGE: Rename to avoid conflict
    Expiry, SessionManagerLayer,
};
use tower_sessions_mongodb_store::{mongodb::Client, MongoDBStore};
use tokio::signal;

#[macro_use]
extern crate tracing;

mod auth;
mod error;
mod models;
mod routes;
mod startup;
mod websocket;

#[cfg(all(feature = "javascript", feature = "wasm", not(doc)))]
compile_error!("Feature \"javascript\" and feature \"wasm\" cannot be enabled at the same time");

#[tokio::main]
async fn main() {
    dotenv().ok();
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "INFO");
    }
    tracing_subscriber::fmt::init();

    let app_state = AppState::new().await;

    let mongo_uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set in environment variables");
    let client = Client::with_uri_str(&mongo_uri).await.expect("Failed to connect to MongoDB");
    let session_store = MongoDBStore::new(client, "polling-app".to_string());

    let rp_origin = env::var("RP_ORIGIN").expect("RP_ORIGIN must be set in environment variables");
    info!("CORS: Allowing origin: {}", rp_origin);
    let cors = CorsLayer::new()
        .allow_methods([HttpMethod::GET, HttpMethod::POST, HttpMethod::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT, header::AUTHORIZATION])
        .allow_origin(
            rp_origin
                .parse::<http::HeaderValue>()
                .expect("RP_ORIGIN must be a valid header value"),
        )
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(86400)); // CHANGE: Use std::time::Duration

    let session_layer = SessionManagerLayer::new(session_store)
        .with_name("webauthnrs")
        .with_same_site(SameSite::None)
        .with_secure(true)
        .with_expiry(Expiry::OnInactivity(SessionDuration::seconds(360))) // CHANGE: Use SessionDuration
        .with_http_only(true)
        .with_path("/");

    let app = Router::new()
        .route("/register_start/:username", post(start_register).options(cors_options_handler))
        .route("/register_finish", post(finish_register).options(cors_options_handler))
        .route("/login_start/:username", post(start_authentication).options(cors_options_handler))
        .route("/login_finish", post(finish_authentication).options(cors_options_handler))
        .route("/api/user", get(get_current_user))
        .route("/api/logout", get(crate::auth::logout))
        .merge(polls::router(app_state.broadcast_tx.clone()))
        .route(
            "/ws",
            axum::routing::get(crate::websocket::websocket_handler),
        )
        .layer(Extension(app_state))
        .layer(cors)
        .layer(session_layer)
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

    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid number");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Unable to spawn tcp listener");

    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, "Nothing to see here")
}

async fn cors_options_handler() -> impl IntoResponse {
    info!("Handling OPTIONS request for CORS preflight");
    StatusCode::OK
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}