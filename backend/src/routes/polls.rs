// src/routes/polls.rs
use std::sync::Arc;
use axum::{
    extract::{Extension, Json, Path},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use futures::TryStreamExt;
use tower_sessions::Session;
use serde::{Deserialize, Serialize};
use mongodb::bson::{doc, oid::ObjectId, Binary};
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
    #[serde(rename = "optionId")]
    pub option_id: i32,
}

#[derive(Deserialize)]
pub struct EditPollRequest {
    pub title: String,
    pub options: Vec<String>,
}

#[derive(Serialize)]
pub struct PollResponse {
    pub id: String,
    pub title: String,
    pub options: Vec<PollOption>,
    #[serde(rename = "isClosed")]
    pub is_closed: bool,
}

pub fn router(broadcast_tx: Arc<tokio::sync::broadcast::Sender<Poll>>) -> Router {
    Router::new()
        .route("/api/polls", post(create_poll))
        .route("/api/polls/:poll_id", get(get_poll))
        .route("/api/polls/:poll_id/vote", post(move |ext, session, path, json| vote_on_poll(ext, session, path, json, broadcast_tx.clone())))
        .route("/api/polls/manage", get(get_user_polls))
        .route("/api/polls/:poll_id/close", post(close_poll))
        .route("/api/polls/:poll_id/reset", post(reset_poll))
        .route("/api/polls/:poll_id/delete", post(delete_poll)) // New endpoint
        .route("/api/polls/:poll_id/edit", post(edit_poll)) // New endpoint
        .route("/api/polls/all", get(get_all_polls)) // New endpoint
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
    broadcast_tx: Arc<tokio::sync::broadcast::Sender<Poll>>,
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

            if let Ok(Some(updated_poll)) = collection.find_one(doc! { "_id": poll_id }).await {
                let _ = broadcast_tx.send(updated_poll);
            }
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

pub async fn get_user_polls(
    Extension(app_state): Extension<AppState>,
    session: Session,
) -> Result<impl IntoResponse, WebauthnError> {
    let user_unique_id: Uuid = session
        .get("user_id")
        .await?
        .ok_or_else(|| {
            error!("No user_id found in session for fetching polls");
            WebauthnError::CorruptSession
        })?;

    info!("Fetching polls for user_id: {}", user_unique_id);
    let collection = app_state.db.collection::<Poll>("polls");
    let uuid_binary = Binary {
        subtype: mongodb::bson::spec::BinarySubtype::Uuid,
        bytes: user_unique_id.as_bytes().to_vec(),
    };
    let cursor = collection
        .find(doc! { "creator_id": uuid_binary })
        .await
        .map_err(|e| WebauthnError::MongoDBError(e))?;

    let polls: Vec<Poll> = cursor
        .try_collect()
        .await
        .map_err(|e| WebauthnError::MongoDBError(e))?;
    info!("Found {} polls for user {}", polls.len(), user_unique_id);

    let response: Vec<PollResponse> = polls.into_iter().map(|poll| PollResponse {
        id: poll.id.unwrap().to_hex(),
        title: poll.title,
        options: poll.options,
        is_closed: poll.is_closed,
    }).collect();

    Ok(Json(response))
}

pub async fn close_poll(
    Extension(app_state): Extension<AppState>,
    session: Session,
    Path(poll_id): Path<String>,
) -> Result<impl IntoResponse, WebauthnError> {
    let user_unique_id: Uuid = session
        .get("user_id")
        .await?
        .ok_or_else(|| {
            error!("No user_id found in session for closing poll");
            WebauthnError::CorruptSession
        })?;

    let poll_id = ObjectId::parse_str(&poll_id).map_err(|_| WebauthnError::Unknown)?;
    let collection = app_state.db.collection::<Poll>("polls");
    let uuid_binary = Binary {
        subtype: mongodb::bson::spec::BinarySubtype::Uuid,
        bytes: user_unique_id.as_bytes().to_vec(),
    };

    let update_result = collection
        .update_one(
            doc! { "_id": poll_id, "creator_id": uuid_binary },
            doc! { "$set": { "is_closed": true } },
        )
        .await;

    match update_result {
        Ok(result) if result.matched_count > 0 => {
            info!("Poll {} closed by user {}", poll_id, user_unique_id);
            Ok(StatusCode::OK)
        }
        Ok(_) => {
            error!("Poll {} not found or user {} not authorized", poll_id, user_unique_id);
            Err(WebauthnError::Unknown)
        }
        Err(e) => {
            error!("Failed to close poll {}: {:?}", poll_id, e);
            Err(WebauthnError::MongoDBError(e))
        }
    }
}

pub async fn reset_poll(
    Extension(app_state): Extension<AppState>,
    session: Session,
    Path(poll_id): Path<String>,
) -> Result<impl IntoResponse, WebauthnError> {
    let user_unique_id: Uuid = session
        .get("user_id")
        .await?
        .ok_or_else(|| {
            error!("No user_id found in session for resetting poll");
            WebauthnError::CorruptSession
        })?;

    let poll_id = ObjectId::parse_str(&poll_id).map_err(|_| WebauthnError::Unknown)?;
    let collection = app_state.db.collection::<Poll>("polls");
    let uuid_binary = Binary {
        subtype: mongodb::bson::spec::BinarySubtype::Uuid,
        bytes: user_unique_id.as_bytes().to_vec(),
    };

    let update_result = collection
        .update_one(
            doc! { "_id": poll_id, "creator_id": uuid_binary },
            doc! { "$set": { "options.$[].votes": 0 } },
        )
        .await;

    match update_result {
        Ok(result) if result.matched_count > 0 => {
            info!("Poll {} votes reset by user {}", poll_id, user_unique_id);
            Ok(StatusCode::OK)
        }
        Ok(_) => {
            error!("Poll {} not found or user {} not authorized", poll_id, user_unique_id);
            Err(WebauthnError::Unknown)
        }
        Err(e) => {
            error!("Failed to reset poll {}: {:?}", poll_id, e);
            Err(WebauthnError::MongoDBError(e))
        }
    }
}

pub async fn delete_poll(
    Extension(app_state): Extension<AppState>,
    session: Session,
    Path(poll_id): Path<String>,
) -> Result<impl IntoResponse, WebauthnError> {
    let user_unique_id: Uuid = session
        .get("user_id")
        .await?
        .ok_or_else(|| {
            error!("No user_id found in session for deleting poll");
            WebauthnError::CorruptSession
        })?;

    let poll_id = ObjectId::parse_str(&poll_id).map_err(|_| WebauthnError::Unknown)?;
    let collection = app_state.db.collection::<Poll>("polls");
    let uuid_binary = Binary {
        subtype: mongodb::bson::spec::BinarySubtype::Uuid,
        bytes: user_unique_id.as_bytes().to_vec(),
    };

    let delete_result = collection
        .delete_one(doc! { "_id": poll_id, "creator_id": uuid_binary })
        .await;

    match delete_result {
        Ok(result) if result.deleted_count > 0 => {
            info!("Poll {} deleted by user {}", poll_id, user_unique_id);
            Ok(StatusCode::OK)
        }
        Ok(_) => {
            error!("Poll {} not found or user {} not authorized", poll_id, user_unique_id);
            Err(WebauthnError::Unknown)
        }
        Err(e) => {
            error!("Failed to delete poll {}: {:?}", poll_id, e);
            Err(WebauthnError::MongoDBError(e))
        }
    }
}

pub async fn edit_poll(
    Extension(app_state): Extension<AppState>,
    session: Session,
    Path(poll_id): Path<String>,
    Json(edit_data): Json<EditPollRequest>,
) -> Result<impl IntoResponse, WebauthnError> {
    let user_unique_id: Uuid = session
        .get("user_id")
        .await?
        .ok_or_else(|| {
            error!("No user_id found in session for editing poll");
            WebauthnError::CorruptSession
        })?;

    let poll_id = ObjectId::parse_str(&poll_id).map_err(|_| WebauthnError::Unknown)?;
    let collection = app_state.db.collection::<Poll>("polls");
    let uuid_binary = Binary {
        subtype: mongodb::bson::spec::BinarySubtype::Uuid,
        bytes: user_unique_id.as_bytes().to_vec(),
    };

    if edit_data.title.trim().is_empty() {
        return Err(WebauthnError::Unknown);
    }
    let valid_options: Vec<String> = edit_data.options.into_iter().filter(|opt| !opt.trim().is_empty()).collect();
    if valid_options.len() < 2 {
        return Err(WebauthnError::Unknown);
    }

    let new_options = valid_options
        .into_iter()
        .enumerate()
        .map(|(i, text)| PollOption {
            id: (i + 1) as i32,
            text,
            votes: 0, // Reset votes on edit
        })
        .collect::<Vec<PollOption>>();

    let update_result = collection
        .update_one(
            doc! { "_id": poll_id, "creator_id": uuid_binary },
            doc! { "$set": { "title": edit_data.title, "options": mongodb::bson::to_bson(&new_options)? } },
        )
        .await;

        match update_result {
            Ok(result) if result.matched_count > 0 => {
                info!("Poll {} edited by user {}", poll_id, user_unique_id);
                let updated_poll = collection.find_one(doc! { "_id": poll_id }).await?;
                if let Some(poll) = updated_poll {
                    Ok(Json(PollResponse {
                        id: poll_id.to_hex(),
                        title: poll.title,
                        options: poll.options,
                        is_closed: poll.is_closed,
                    }))
                } else {
                    error!("Poll {} not found after edit", poll_id);
                    Err(WebauthnError::Unknown)
                }
            }
            Ok(_) => {
                error!("Poll {} not found or user {} not authorized", poll_id, user_unique_id);
                Err(WebauthnError::Unknown)
            }
            Err(e) => {
                error!("Failed to edit poll {}: {:?}", poll_id, e);
                Err(WebauthnError::MongoDBError(e))
            }
        }
}

pub async fn get_all_polls(
    Extension(app_state): Extension<AppState>,
) -> Result<impl IntoResponse, WebauthnError> {
    info!("Fetching all polls");
    let collection = app_state.db.collection::<Poll>("polls");
    let cursor = collection
        .find(doc! {})
        .await
        .map_err(|e| WebauthnError::MongoDBError(e))?;

    let polls: Vec<Poll> = cursor
        .try_collect()
        .await
        .map_err(|e| WebauthnError::MongoDBError(e))?;
    info!("Found {} polls total", polls.len());

    let response: Vec<PollResponse> = polls.into_iter().map(|poll| PollResponse {
        id: poll.id.unwrap().to_hex(),
        title: poll.title,
        options: poll.options,
        is_closed: poll.is_closed,
    }).collect();

    Ok(Json(response))
}