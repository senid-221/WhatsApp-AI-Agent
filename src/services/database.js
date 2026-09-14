import pg from "pg";

const { Pool } = pg;
let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in Render.");
  }

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error.message);
    });
  }

  return pool;
}

export async function initDatabase() {
  const db = getPool();

  await db.query(
    "CREATE TABLE IF NOT EXISTS conversation_sessions (phone TEXT PRIMARY KEY, session_started_at TIMESTAMPTZ NOT NULL, last_user_message_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );

  await db.query(
    "CREATE TABLE IF NOT EXISTS conversation_messages (id BIGSERIAL PRIMARY KEY, phone TEXT NOT NULL, session_started_at TIMESTAMPTZ NOT NULL, role TEXT NOT NULL CHECK (role IN ('user', 'assistant')), text TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );

  await db.query(
    "CREATE INDEX IF NOT EXISTS conversation_messages_phone_session_idx ON conversation_messages (phone, session_started_at, id)"
  );

  console.log("LUMIA PostgreSQL database connected");
}

export function getDatabase() {
  return getPool();
}
