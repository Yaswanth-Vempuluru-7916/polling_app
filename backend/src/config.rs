use dotenv::dotenv;
use std::env;
use std::net::SocketAddr;

/// Application configuration loaded from environment variables.
#[derive(Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub addr: SocketAddr,
    pub secret_key: String,
}

impl AppConfig {
    /// Loads configuration from environment variables.
    /// Panics if required variables are missing or invalid.
    pub fn load() -> Self {
        // Load .env file if present
        dotenv().ok(); // Ignore errors if .env is missing

        // Fetch database URL
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set in .env or environment");

        // Fetch port and create SocketAddr
        let port = env::var("PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse::<u16>()
            .expect("PORT must be a valid u16 number");
        let addr = SocketAddr::from(([127, 0, 0, 1], port));

        // Fetch secret key
        let secret_key = env::var("SECRET_KEY")
            .expect("SECRET_KEY must be set in .env or environment");

        AppConfig {
            database_url,
            addr,
            secret_key,
        }
    }
}