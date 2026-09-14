import express from "express";
import dotenv from "dotenv";
import whatsappRouter from "./routes/whatsapp.js";
import { initDatabase } from "./services/database.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.status(200).json({ name: "LUMIA", status: "online" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "LUMIA" });
});

app.get("/api/portal/conversations", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const db = getDatabase();
    const result = await db.query("SELECT phone, MAX(created_at) AS last_message_at, COUNT(*)::int AS message_count FROM conversation_messages GROUP BY phone ORDER BY last_message_at DESC");
    res.json({ conversations: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/webhook", whatsappRouter);

app.get("/api/portal/overview", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const db = getDatabase();
    const conversations = await db.query("SELECT COUNT(*)::int AS count FROM conversation_sessions");
    const messages = await db.query("SELECT COUNT(*)::int AS count FROM conversation_messages");
    const contacts = await db.query("SELECT COUNT(DISTINCT phone)::int AS count FROM conversation_messages");

    res.json({
      agent: { name: "LUMIA", status: "online", memoryHours: 12, database: "PostgreSQL" },
      stats: {
        conversations: conversations.rows[0].count,
        messages: messages.rows[0].count,
        contacts: contacts.rows[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;

async function startServer() {
  await initDatabase();

  app.listen(port, "0.0.0.0", () => {
    console.log(`LUMIA backend running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("LUMIA failed to start:", error.message);
  process.exit(1);
});
