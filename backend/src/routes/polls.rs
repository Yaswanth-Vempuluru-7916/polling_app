// src/routes/polls.rs
use axum::{
    extract::{Extension, Json},
    http::StatusCode,
    response::IntoResponse,
};
use tower_sessions::Session;
use serde::Deserialize;
use mongodb::bson::doc;
use chrono::Utc;
use crate::error::WebauthnError;
use crate::startup::AppState;
use crate::models::{Poll, PollOption};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreatePollRequest {
    pub title: String,
    pub options: Vec<String>,
}

pub async fn create_poll(
    Extension(app_state): Extension<AppState>,
    session: Session,
    Json(poll_data): Json<CreatePollRequest>,
) -> Result<impl IntoResponse, WebauthnError> {
    // Check if user is authenticated via session
    let user_unique_id: Uuid = session
        .get("user_id") // Assuming we'll set this on login (to be added later)
        .await?
        .ok_or_else(|| {
            error!("No user_id found in session for poll creation");
            WebauthnError::CorruptSession
        })?;

    // Validate poll data
    if poll_data.title.trim().is_empty() {
        return Err(WebauthnError::Unknown); // Could add a specific error later
    }
    let valid_options: Vec<String> = poll_data.options.into_iter().filter(|opt| !opt.trim().is_empty()).collect();
    if valid_options.len() < 2 {
        return Err(WebauthnError::Unknown); // Could add "TooFewOptions" error
    }

    // Create poll struct
    let poll = Poll {
        id: None, // MongoDB will generate this
        title: poll_data.title,
        options: valid_options
            .into_iter()
            .enumerate()
            .map(|(i, text)| PollOption {
                id: (i + 1) as i32, // Match frontend IDs starting at 1
                text,
                votes: 0,
            })
            .collect(),
        creator_id: user_unique_id,
        is_closed: false,
        created_at: mongodb::bson::DateTime::from_system_time(Utc::now().into()), // Corrected conversion
    };

    // Insert into MongoDB
    let collection = app_state.db.collection::<Poll>("polls");
    match collection.insert_one(&poll).await { // Removed second argument 'None'
        Ok(result) => {
            info!("Poll created by user {}: {:?}", user_unique_id, result.inserted_id);
            Ok(StatusCode::OK) // Could return poll ID in a JSON response later
        }
        Err(e) => {
            error!("Failed to insert poll into MongoDB: {:?}", e);
            Err(WebauthnError::MongoDBError(e))
        }
    }
}