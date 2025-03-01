// src/routes/polls.rs
use axum::{
    extract::{Extension, Json, Path},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use tower_sessions::Session;
use serde::{Deserialize, Serialize};
use mongodb::bson::{doc, oid::ObjectId};
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

#[derive(Deserialize)]
pub struct VoteRequest {
    #[serde(rename = "optionId")] // Match frontend's camelCase
    pub option_id: i32,
}

#[derive(Serialize)]
pub struct PollResponse {
    pub id: String,
    pub title: String,
    pub options: Vec<PollOption>,
    #[serde(rename = "isClosed")]
    pub is_closed: bool,
}

pub fn router() -> Router {
    Router::new()
        .route("/api/polls", post(create_poll))
        .route("/api/polls/:poll_id", get(get_poll))
        .route("/api/polls/:poll_id/vote", post(vote_on_poll))
}

pub async fn create_poll(
    Extension(app_state): Extension<AppState>,
    session: Session,
    Json(poll_data): Json<CreatePollRequest>,
) -> Result<impl IntoResponse, WebauthnError> {
    let user_unique_id: Uuid = session
        .get("user_id")
        .await?
        .ok_or_else(|| {
            error!("No user_id found in session for poll creation");
            WebauthnError::CorruptSession
        })?;

    if poll_data.title.trim().is_empty() {
        return Err(WebauthnError::Unknown);
    }
    let valid_options: Vec<String> = poll_data.options.into_iter().filter(|opt| !opt.trim().is_empty()).collect();
    if valid_options.len() < 2 {
        return Err(WebauthnError::Unknown);
    }

    let poll = Poll {
        id: None,
        title: poll_data.title.clone(),
        options: valid_options
            .into_iter()
            .enumerate()
            .map(|(i, text)| PollOption {
                id: (i + 1) as i32,
                text,
                votes: 0,
            })
            .collect(),
        creator_id: user_unique_id,
        is_closed: false,
        created_at: mongodb::bson::DateTime::from_system_time(Utc::now().into()),
    };

    let collection = app_state.db.collection::<Poll>("polls");
    match collection.insert_one(&poll).await {
        Ok(result) => {
            info!("Poll created by user {}: {:?}", user_unique_id, result.inserted_id);
            let poll_id = result.inserted_id.as_object_id().unwrap().to_hex();
            let response = PollResponse {
                id: poll_id,
                title: poll.title,
                options: poll.options,
                is_closed: poll.is_closed,
            };
            Ok(Json(response))
        }
        Err(e) => {
            error!("Failed to insert poll into MongoDB: {:?}", e);
            Err(WebauthnError::MongoDBError(e))
        }
    }
}

pub async fn get_poll(
    Extension(app_state): Extension<AppState>,
    Path(poll_id): Path<String>,
) -> Result<impl IntoResponse, WebauthnError> {
    let poll_id = ObjectId::parse_str(&poll_id).map_err(|_| WebauthnError::Unknown)?;
    let collection = app_state.db.collection::<Poll>("polls");

    match collection.find_one(doc! { "_id": poll_id }).await {
        Ok(Some(poll)) => {
            let response = PollResponse {
                id: poll.id.unwrap().to_hex(),
                title: poll.title,
                options: poll.options,
                is_closed: poll.is_closed,
            };
            Ok(Json(response))
        }
        Ok(None) => {
            error!("Poll with ID {} not found", poll_id);
            Err(WebauthnError::Unknown)
        }
        Err(e) => {
            error!("Failed to fetch poll {}: {:?}", poll_id, e);
            Err(WebauthnError::MongoDBError(e))
        }
    }
}

pub async fn vote_on_poll(
    Extension(app_state): Extension<AppState>,
    session: Session,
    Path(poll_id): Path<String>,
    Json(vote): Json<VoteRequest>,
) -> Result<impl IntoResponse, WebauthnError> {
    let poll_id = ObjectId::parse_str(&poll_id).map_err(|_| WebauthnError::Unknown)?;
    let collection = app_state.db.collection::<Poll>("polls");

    let voted_key = format!("voted_{}", poll_id);
    if session.get::<bool>(&voted_key).await?.unwrap_or(false) {
        info!("User already voted on poll {}", poll_id);
        return Err(WebauthnError::Unknown);
    }

    let update_result = collection
        .update_one(
            doc! { "_id": poll_id, "is_closed": false, "options.id": vote.option_id },
            doc! { "$inc": { "options.$.votes": 1 } },
        )
        .await;

    match update_result {
        Ok(result) if result.matched_count > 0 => {
            session.insert(&voted_key, true).await?;
            info!("Vote recorded for poll {} on option {}", poll_id, vote.option_id);
            Ok(StatusCode::OK)
        }
        Ok(_) => {
            error!("Poll {} not found, closed, or option {} invalid", poll_id, vote.option_id);
            Err(WebauthnError::Unknown)
        }
        Err(e) => {
            error!("Failed to update vote for poll {}: {:?}", poll_id, e);
            Err(WebauthnError::MongoDBError(e))
        }
    }
}