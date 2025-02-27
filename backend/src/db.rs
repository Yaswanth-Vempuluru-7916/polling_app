use sqlx::{Pool, Postgres, postgres::PgPoolOptions};
use crate::config::AppConfig;
use std::time::Duration;

/// Database connection pool type alias for convenience.
pub type DbPool = Pool<Postgres>;

/// Initializes the database connection pool and runs migrations.
pub async fn init_db(config: &AppConfig) -> Result<DbPool, sqlx::Error> {
    // Create a connection pool with max 5 connections and a 10-second timeout
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    // Run migrations to set up the schema
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}