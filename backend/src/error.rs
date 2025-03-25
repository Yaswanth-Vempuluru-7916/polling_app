use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum WebauthnError {
    #[error("unknown webauthn error")]
    Unknown,
    #[error("Corrupt Session")]
    CorruptSession,
    #[error("User Not Found")]
    UserNotFound,
    #[error("User Has No Credentials")]
    UserHasNoCredentials,
    #[error("Deserialising Session failed: {0}")]
    InvalidSessionState(#[from] tower_sessions::session::Error),
    #[error("MongoDB error: {0}")]
    MongoDBError(#[from] mongodb::error::Error),
    #[error("BSON serialization error: {0}")]
    BsonError(#[from] mongodb::bson::ser::Error),
    #[error("UUID parsing error: {0}")]
    UuidError(#[from] mongodb::bson::uuid::Error),
}

impl IntoResponse for WebauthnError {
    fn into_response(self) -> Response {
        let (status, body) = match self {
            WebauthnError::CorruptSession => (StatusCode::UNAUTHORIZED, "Corrupt Session"),
            WebauthnError::UserNotFound => (StatusCode::NOT_FOUND, "User Not Found"),
            WebauthnError::Unknown => (StatusCode::BAD_REQUEST, "Unknown Error"),
            WebauthnError::UserHasNoCredentials => (StatusCode::BAD_REQUEST, "User Has No Credentials"),
            WebauthnError::InvalidSessionState(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Deserialising Session failed"),
            WebauthnError::MongoDBError(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            WebauthnError::BsonError(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            WebauthnError::UuidError(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        };
        (status, body).into_response()
    }
}