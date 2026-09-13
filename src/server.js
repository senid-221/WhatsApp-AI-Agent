import express from "express";
import dotenv from "dotenv";
import whatsappRouter from "./routes/whatsapp.js";

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
app.listen(port, "0.0.0.0", () => {
  console.log(`LUMIA backend running on port ${port}`);
});
