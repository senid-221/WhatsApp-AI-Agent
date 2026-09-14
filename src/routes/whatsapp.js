import { Router } from "express";
import { getAIReply } from "../services/ai.js";
import { sendWhatsAppMessage, showTypingIndicator } from "../services/whatsapp.js";

const router = Router();

function verifyToken(req) {
  const supplied = req.query["hub.verify_token"];
  const expected = process.env.VERIFY_TOKEN;
  return typeof supplied === "string" && typeof expected === "string" && supplied.trim() === expected.trim();
}

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && verifyToken(req) && challenge) {
    return res.status(200).type("text/plain").send(challenge);
  }

  return res.status(403).send("Forbidden");
});

router.post("/", async (req, res) => {
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== "text") return;

    const from = message.from;
    const text = message.text?.body?.trim();
    const messageId = message.id;
    if (!from || !text) return;

    console.log(`LUMIA received message from ${from}`);

    try {
      await showTypingIndicator(messageId);
    } catch (typingError) {
      console.warn("LUMIA typing indicator error:", typingError.response?.data || typingError.message);
    }

    const reply = await getAIReply(text);
    await sendWhatsAppMessage(from, reply);
  } catch (error) {
    console.error("LUMIA webhook error:", error.response?.data || error.message);
  }
});

export default router;
