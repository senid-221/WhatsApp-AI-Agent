import { Router } from "express";
import { getAIReply } from "../services/ai.js";
import { sendWhatsAppMessage } from "../services/whatsapp.js";

const router = Router();

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Webhook verification request", { mode, hasToken: Boolean(token), hasChallenge: Boolean(challenge) });

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send("Forbidden");
});

router.post("/", async (req, res) => {
  // Acknowledge Meta quickly to avoid webhook retries/timeouts.
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== "text") return;

    const from = message.from;
    const text = message.text?.body?.trim();
    if (!from || !text) return;

    const reply = await getAIReply(text);
    await sendWhatsAppMessage(from, reply);
  } catch (error) {
    console.error("LUMIA webhook error:", error.response?.data || error.message);
  }
});

export default router;
