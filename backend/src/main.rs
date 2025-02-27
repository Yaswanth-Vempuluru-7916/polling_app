use axum::{routing::get, Router};
use crate::config::AppConfig;
use crate::db::init_db;
use crate::routes::auth::auth_routes;
use crate::routes::auth::AppState;
use crate::services::auth_service::AuthService;
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod models;
mod services;
mod routes;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::load();
    let addr = config.addr;

    let pool = init_db(&config)
        .await
        .expect("Failed to initialize database");

    let auth_service = AuthService::new();
    let app_state = AppState { pool, auth_service };

    let app = Router::new()
        .route("/", get(|| async { "Hello, Axum!" }))
        .nest("/api/auth", auth_routes())
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    println!("🚀 Server running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}