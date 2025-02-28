// src/models/mod.rs
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use mongodb::bson::doc;
use webauthn_rs::prelude::Passkey; // Reused from your auth setup

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PollOption {
    pub id: i32, // Matches frontend PollOption.id
    pub text: String,
    pub votes: i32, // Initialize to 0, increment on votes
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Poll {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<mongodb::bson::oid::ObjectId>, // MongoDB ObjectId
    pub title: String,
    pub options: Vec<PollOption>,
    pub creator_id: Uuid, // Links to UserData.unique_id
    pub is_closed: bool, // For poll management (close/reset)
    pub created_at: mongodb::bson::DateTime, // Timestamp
}

// Re-export UserData from startup for convenience (if needed elsewhere)
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UserData {
    pub username: String,
    #[serde(deserialize_with = "deserialize_uuid", serialize_with = "serialize_uuid")]
    pub unique_id: Uuid,
    pub passkeys: Vec<Passkey>,
}

fn deserialize_uuid<'de, D>(deserializer: D) -> Result<Uuid, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: String = Deserialize::deserialize(deserializer)?;
    Uuid::parse_str(&s).map_err(serde::de::Error::custom)
}

fn serialize_uuid<S>(uuid: &Uuid, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&uuid.to_string())
}