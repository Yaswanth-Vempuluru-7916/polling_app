use axum::{routing::get, Router};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Build our application with a route
    let app = Router::new()
        .route("/", get(|| async { "Hello, Axum!" }))
        .layer(TraceLayer::new_for_http()); // Adding the unused TraceLayer

    // Set up the socket address
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));

    println!("🚀 Server running at http://{}", addr);

    // Run the server
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}