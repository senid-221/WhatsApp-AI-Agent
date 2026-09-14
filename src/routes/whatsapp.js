import { Router } from "express";
import { getAIReply } from "../services/ai.js";
import { sendWhatsAppMessage, showTypingIndicator, stopTypingIndicator } from "../services/whatsapp.js";
import { getConversation, saveConversationTurn } from "../services/conversationMemory.js";
import { getDatabase } from "../services/database.js";

const router = Router();
const MARKET_URL = String(process.env.MARKETPLACE_URL || "https://lumia-ai-portal.onrender.com/marketplace").replace(/\/$/, "");

function verifyToken(req) {
  const supplied = req.query["hub.verify_token"];
  const expected = process.env.VERIFY_TOKEN;
  return typeof supplied === "string" && typeof expected === "string" && supplied.trim() === expected.trim();
}

function productLink(productId) {
  return `${MARKET_URL}?product=${encodeURIComponent(productId)}`;
}

async function getMarketplaceContext() {
  const db = getDatabase();
  const result = await db.query(`
    SELECT id, name, category, description, price, currency, in_stock,
           NULL::integer AS partner_id, 'marketplace' AS source
    FROM marketplace_products
    WHERE in_stock = TRUE
    UNION ALL
    SELECT pp.id, pp.name, pp.category, pp.description, pp.price, pp.currency, pp.in_stock,
           pp.partner_id, 'partner' AS source
    FROM partner_products pp
    JOIN marketplace_partners mp ON mp.id = pp.partner_id
    WHERE pp.in_stock = TRUE AND mp.status = 'approved'
    ORDER BY name ASC, id ASC
  `);

  return result.rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description || "",
    price: Number(p.price || 0),
    currency: p.currency || "RWF",
    inStock: Boolean(p.in_stock),
    partnerId: p.partner_id,
    source: p.source,
    exactLink: productLink(p.id)
  }));
}

function buildMarketplaceContext(products) {
  return [
    "LUMIA Marketplace live catalogue:",
    JSON.stringify(products),
    "Use this catalogue as the source of truth for LUMIA products, prices, availability, partner products and exact product links.",
    "Only recommend products that exist in this catalogue.",
    "When sharing a product link, copy the exactLink for that product exactly.",
    "Never invent a product, price, seller, stock status, feature, delivery promise or URL."
  ].join("\n");
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

    const from = String(message.from || "").trim();
    const text = String(message.text?.body || "").trim();
    const messageId = String(message.id || "").trim();
    if (!from || !text || !messageId) return;

    console.log(`LUMIA received WhatsApp message from ${from}`);

    const conversation = await getConversation(from);
    const products = await getMarketplaceContext();
    const marketplaceContext = buildMarketplaceContext(products);

    const ux = await showTypingIndicator(from, messageId);
    console.log(`LUMIA WhatsApp UX: read=${ux.read} typing=${ux.typing} messageId=${messageId}`);

    try {
      const aiInput = [
        marketplaceContext,
        "",
        `Customer message:\n${text}`,
        "",
        "Respond to the customer message above using the conversation context supplied to you. Do not simply repeat the previous answer."
      ].join("\n");

      const reply = await getAIReply(aiInput, conversation);
      await sendWhatsAppMessage(from, reply);
      await saveConversationTurn(from, text, reply);
    } finally {
      await stopTypingIndicator(messageId);
    }
  } catch (error) {
    console.error("LUMIA webhook error:", error.response?.data || error.message);
  }
});

export default router;
