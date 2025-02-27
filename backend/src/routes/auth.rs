use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use crate::db::DbPool;
use crate::models::user::NewUser;
use crate::services::auth_service::AuthService;
use serde_json::json;
use webauthn_rs::prelude::*;

/// App state including the database pool and auth service.
#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub auth_service: AuthService,
}

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/register/options", get(register_options))
        .route("/register", post(register))
        .route("/login/options", get(login_options))
        .route("/login", post(login))
}

async fn register_options(State(state): State<AppState>, Json(username): Json<String>) -> impl IntoResponse {
    let options = state.auth_service.generate_registration_options(&username).await;
    Json(options)
}

#[axum::debug_handler]
async fn register(
    State(state): State<AppState>,
    Json(payload): Json<(NewUser, RegisterPublicKeyCredential)>,
) -> impl IntoResponse {
    let (new_user, response) = payload;

    match state.auth_service.register_user(&state.pool, new_user, response).await {
        Ok(user) => (
            StatusCode::CREATED,
            Json(json!({ "message": "User registered", "user": user })),
        ).into_response(),
        Err(err) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": err.to_string() })),
        ).into_response(),
    }
}

async fn login_options(State(state): State<AppState>) -> impl IntoResponse {
    let options = state.auth_service.generate_authentication_options().await;
    Json(options)
}

#[axum::debug_handler]
async fn login(
    State(state): State<AppState>,
    Json(payload): Json<(String, PublicKeyCredential)>,
) -> impl IntoResponse {
    let (username, response) = payload;

    match state.auth_service.login_user(&state.pool, &username, response).await {
        Ok(user) => (
            StatusCode::OK,
            Json(json!({ "message": "Login successful", "user": user })),
        ).into_response(),
        Err(err) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": err.to_string() })),
        ).into_response(),
    }
}