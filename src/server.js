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

app.use("/webhook", whatsappRouter);

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
