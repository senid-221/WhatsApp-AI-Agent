import express from "express";
import dotenv from "dotenv";
import whatsappRouter from "./routes/whatsapp.js";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ name: "LUMIA", status: "online" });
});

app.use("/webhook", whatsappRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`LUMIA backend running on port ${port}`));
