use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

/// Represents a user in the polling app.
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,                    // Unique identifier for the user
    pub username: String,            // Display name, unique in the DB
    #[serde(with = "time::serde::iso8601")]
    pub created_at: OffsetDateTime,  // Timestamp of user creation
}

impl User {
    /// Creates a new user with a generated UUID and current timestamp.
    pub fn new(username: String) -> Self {
        User {
            id: Uuid::new_v4(),
            username,
            created_at: OffsetDateTime::now_utc(),
        }
    }
}

/// Represents data needed to create a new user.
#[derive(Debug, Deserialize)]
pub struct NewUser {
    pub username: String,
}