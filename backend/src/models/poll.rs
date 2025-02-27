use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

/// Represents a poll in the app.
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Poll {
    pub id: Uuid,                    // Unique identifier for the poll
    pub creator_id: Uuid,            // References the user who created it
    pub title: String,               // Poll question or title
    pub is_closed: bool,             // Whether voting is still allowed
    #[serde(with = "time::serde::iso8601")]
    pub created_at: OffsetDateTime,  // Timestamp of poll creation
}

impl Poll {
    /// Creates a new poll with a generated UUID and current timestamp.
    pub fn new(creator_id: Uuid, title: String) -> Self {
        Poll {
            id: Uuid::new_v4(),
            creator_id,
            title,
            is_closed: false,
            created_at: OffsetDateTime::now_utc(),
        }
    }
}

/// Represents an option for a poll.
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PollOption {
    pub id: Uuid,                    // Unique identifier for the option
    pub poll_id: Uuid,               // References the poll it belongs to
    pub option_text: String,         // Text of the option (e.g., "Yes", "No")
    #[serde(with = "time::serde::iso8601")]
    pub created_at: OffsetDateTime,  // Timestamp of option creation
}

impl PollOption {
    /// Creates a new poll option with a generated UUID and current timestamp.
    pub fn new(poll_id: Uuid, option_text: String) -> Self {
        PollOption {
            id: Uuid::new_v4(),
            poll_id,
            option_text,
            created_at: OffsetDateTime::now_utc(),
        }
    }
}

/// Represents a vote cast in a poll.
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Vote {
    pub id: Uuid,                    // Unique identifier for the vote
    pub user_id: Uuid,               // References the user who voted
    pub poll_id: Uuid,               // References the poll
    pub option_id: Uuid,             // References the chosen option
    #[serde(with = "time::serde::iso8601")]
    pub created_at: OffsetDateTime,  // Timestamp of the vote
}

impl Vote {
    /// Creates a new vote with a generated UUID and current timestamp.
    pub fn new(user_id: Uuid, poll_id: Uuid, option_id: Uuid) -> Self {
        Vote {
            id: Uuid::new_v4(),
            user_id,
            poll_id,
            option_id,
            created_at: OffsetDateTime::now_utc(),
        }
    }
}

/// Data for creating a new poll with options.
#[derive(Debug, Deserialize)]
pub struct NewPoll {
    pub title: String,
    pub options: Vec<String>,  // List of option texts
}