use crate::db::DbPool;
use crate::models::user::NewUser;
use sqlx::{query, query_as, FromRow, PgPool, Postgres, Row}; // Added Row trait here
use webauthn_rs::prelude::*;
use std::collections::HashMap;
use tokio::sync::Mutex;
use std::sync::Arc;
use time::OffsetDateTime;
use serde::Serialize;
use uuid::Uuid;

// Define ChallengeStore with correct type
type ChallengeStore = Arc<Mutex<HashMap<Uuid, PasskeyRegistration>>>;
type AuthChallengeStore = Arc<Mutex<HashMap<Uuid, PasskeyAuthentication>>>;

#[derive(Clone)]
pub struct AuthService {
    webauthn: Webauthn,
    reg_challenges: ChallengeStore,
    auth_challenges: AuthChallengeStore,
}

// Fix the FromRow implementation
#[derive(Serialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub created_at: OffsetDateTime,
}

// Implement FromRow manually instead of using the derive macro
impl<'r> FromRow<'r, sqlx::postgres::PgRow> for User {
    fn from_row(row: &'r sqlx::postgres::PgRow) -> Result<Self, sqlx::Error> {
        Ok(User {
            id: row.try_get("id")?,
            username: row.try_get("username")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

impl User {
    pub fn new(username: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            username,
            created_at: OffsetDateTime::now_utc(),
        }
    }
}

impl AuthService {
    pub fn new() -> Self {
        let rp_id = "localhost";
        let rp_origin = Url::parse("http://localhost:3000").expect("Invalid RP origin");
        let webauthn = WebauthnBuilder::new(rp_id, &rp_origin)
            .expect("Invalid WebAuthn config")
            .build()
            .expect("Failed to build Webauthn");

        Self {
            webauthn,
            reg_challenges: Arc::new(Mutex::new(HashMap::new())),
            auth_challenges: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    pub async fn generate_registration_options(&self, username: &str) -> CreationChallengeResponse {
        let user_id = Uuid::new_v4();
        let user_unique_id = user_id.into();
        
        // Get both parts from the webauthn method
        let (challenge, registration_state) = self.webauthn
            .start_passkey_registration(
                user_unique_id,
                username,
                username,
                None, // No excluded credentials
            )
            .expect("Failed to generate challenge");

        // Store the registration_state instead of the challenge
        let mut challenges = self.reg_challenges.lock().await;
        challenges.insert(user_id, registration_state);

        // Return just the CreationChallengeResponse
        challenge
    }
    
    pub async fn register_user(
        &self,
        pool: &DbPool,
        new_user: NewUser,
        reg_response: RegisterPublicKeyCredential,
    ) -> Result<User, String> {
        let user = User::new(new_user.username.clone());

        let mut challenges = self.reg_challenges.lock().await;
        let registration_state = challenges
            .remove(&user.id)
            .ok_or("No registration challenge found")?;

        // Fix finish_passkey_registration arguments - PasskeyRegistration should be second
        let passkey = self
            .webauthn
            .finish_passkey_registration(&reg_response, &registration_state)
            .map_err(|e| format!("Registration failed: {:?}", e))?;

        // Insert user into database
        let inserted_user = sqlx::query_as::<_, User>(
            "INSERT INTO users (id, username, created_at) VALUES ($1, $2, $3) RETURNING *"
        )
        .bind(user.id)
        .bind(&user.username)
        .bind(user.created_at)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to insert user: {:?}", e))?;

        // TODO: Store passkey
        Ok(inserted_user)
    }

    pub async fn generate_authentication_options(&self) -> RequestChallengeResponse {
        // This will return both RequestChallengeResponse and PasskeyAuthentication
        let (auth_challenge, authentication_state) = self.webauthn
            .start_passkey_authentication(&[]) // Empty slice for allowed credentials
            .expect("Failed to generate challenge");
            
        // Store the authentication_state with a temp ID for now
        let user_id = Uuid::new_v4(); // Temporary ID for storing the challenge
        let mut challenges = self.auth_challenges.lock().await;
        challenges.insert(user_id, authentication_state);
        
        auth_challenge
    }

    pub async fn login_user(
        &self,
        pool: &DbPool,
        username: &str,
        auth_response: PublicKeyCredential,
    ) -> Result<User, String> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = $1")
            .bind(username)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("User not found: {:?}", e))?;

        // Get the stored authentication state (would need to be improved in production)
        let mut challenges = self.auth_challenges.lock().await;
        let authentication_state = challenges
            .values()
            .next()
            .cloned()
            .ok_or("No authentication challenge found")?;
        
        // Fix finish_passkey_authentication arguments - PasskeyAuthentication should be second
        let auth_result = self
            .webauthn
            .finish_passkey_authentication(&auth_response, &authentication_state)
            .map_err(|e| format!("Authentication failed: {:?}", e))?;

        // TODO: Verify that the authenticated credential belongs to this user

        Ok(user)
    }
}