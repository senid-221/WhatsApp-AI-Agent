import express from "express";
import dotenv from "dotenv";
import whatsappRouter from "./routes/whatsapp.js";
import { initDatabase } from "./services/database.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (req, res) => {
  res.status(200).json({ name: "LUMIA", status: "online" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "LUMIA" });
});

app.get("/api/marketplace/products", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query("SELECT * FROM marketplace_products WHERE in_stock = TRUE ORDER BY id DESC");
    res.json({ products: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Unable to load products" });
  }
});

app.post("/api/marketplace/orders", async (req, res) => {
  try {
    const { customerName, phone, productId, quantity = 1 } = req.body;
    if (!customerName || !phone || !productId) return res.status(400).json({ error: "customerName, phone and productId are required" });
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query(
      "INSERT INTO marketplace_orders (customer_name, phone, product_id, quantity) VALUES ($1,$2,$3,$4) RETURNING *",
      [customerName, phone, productId, quantity]
    );
    res.status(201).json({ order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Unable to create order" });
  }
});

app.get("/api/portal/marketplace/orders", async (req, res) => {
  try {
    const { getDatabase } = await import("./services/database.js");
    const result = await getDatabase().query(
      "SELECT o.*, p.name AS product_name, p.image_url FROM marketplace_orders o LEFT JOIN marketplace_products p ON p.id=o.product_id ORDER BY o.created_at DESC"
    );
    res.json({ orders: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Unable to load orders" });
  }
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

app.get("/api/portal/history", async (req, res) => {
  try {
    const customer = String(req.query.customer || "");
    if (!customer) return res.status(400).json({ error: "customer is required" });
    const { getDatabase } = await import("./services/database.js");
    const db = getDatabase();
    const result = await db.query(
      "SELECT role, text, created_at FROM conversation_messages WHERE phone = $1 ORDER BY created_at ASC",
      [customer]
    );
    res.json({ customer, messages: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Unable to load history" });
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
