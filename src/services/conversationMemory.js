import { getDatabase } from "./database.js";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const MAX_HISTORY_MESSAGES = 30;

export async function getConversation(phone) {
  const db = getDatabase();

  const sessionResult = await db.query(
    "SELECT session_started_at, last_user_message_at FROM conversation_sessions WHERE phone = $1",
    [phone]
  );

  const session = sessionResult.rows[0];

  if (!session) {
    return { isNewSession: true, history: [] };
  }

  const lastUserMessageAt = new Date(session.last_user_message_at).getTime();
  const isNewSession = Date.now() - lastUserMessageAt >= TWELVE_HOURS_MS;

  if (isNewSession) {
    return { isNewSession: true, history: [] };
  }

  const messagesResult = await db.query(
    "SELECT role, text FROM (SELECT id, role, text FROM conversation_messages WHERE phone = $1 AND session_started_at = $2 ORDER BY id DESC LIMIT $3) recent ORDER BY id ASC",
    [phone, session.session_started_at, MAX_HISTORY_MESSAGES]
  );

  return {
    isNewSession: false,
    history: messagesResult.rows,
  };
}

export async function saveConversationTurn(phone, userMessage, assistantMessage) {
  const db = getDatabase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      "SELECT session_started_at, last_user_message_at FROM conversation_sessions WHERE phone = $1 FOR UPDATE",
      [phone]
    );

    const existing = existingResult.rows[0];
    const now = new Date();

    const expired =
      !existing ||
      now.getTime() - new Date(existing.last_user_message_at).getTime() >=
        TWELVE_HOURS_MS;

    const sessionStartedAt = expired
      ? now
      : new Date(existing.session_started_at);

    await client.query(
      "INSERT INTO conversation_sessions (phone, session_started_at, last_user_message_at, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (phone) DO UPDATE SET session_started_at = EXCLUDED.session_started_at, last_user_message_at = EXCLUDED.last_user_message_at, updated_at = NOW()",
      [phone, sessionStartedAt, now]
    );

    await client.query(
      "INSERT INTO conversation_messages (phone, session_started_at, role, text) VALUES ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)",
      [phone, sessionStartedAt, userMessage, assistantMessage]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
