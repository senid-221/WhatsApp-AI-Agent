import { Router } from "express";
import { getAIReply } from "../services/ai.js";
import { sendWhatsAppMessage, markMessageAsRead, startTypingIndicator, stopTypingIndicator } from "../services/whatsapp.js";
import { getConversation, saveConversationTurn } from "../services/conversationMemory.js";
import { getDatabase } from "../services/database.js";

const router = Router();
const MARKET_URL = String(process.env.MARKETPLACE_URL || "https://lumia-ai-portal.onrender.com/marketplace").replace(/\/$/, "");

function verifyToken(req) {
  const supplied = req.query["hub.verify_token"];
  const expected = process.env.VERIFY_TOKEN;
  return typeof supplied === "string" && typeof expected === "string" && supplied.trim() === expected.trim();
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function productLink(productId) {
  return `${MARKET_URL}?product=${encodeURIComponent(productId)}`;
}

function isSimpleAffirmation(text) {
  return /^(yego|yee|ego|yes|oya|hoya|ntabwo|none|okay|ok|sawa|murakoze|thank you|thanks|ni sawa|birashoboka|ndabyemeye)[.!?\s]*$/i.test(text.trim());
}

function isMarketplaceIntent(text) {
  const q = normalize(text);
  return /\b(gura|kugura|igiciro|price|product|igicuruzwa|order|commande|shop|market|available|mufite|mufiteho|ndashaka|shaka|laptop|phone|telefoni|imyenda|shirt|computer|solar|furniture|ibikoresho|serivisi|website|app|mobile)\b/i.test(q);
}

async function marketplaceReply(text, conversation) {
  const db = getDatabase();
  const q = normalize(text);
  const products = (await db.query(`
    SELECT id, name, category, description, price, currency, NULL::integer AS partner_id, 'marketplace' AS source
    FROM marketplace_products
    WHERE in_stock=TRUE
    UNION ALL
    SELECT pp.id, pp.name, pp.category, pp.description, pp.price, pp.currency, pp.partner_id, 'partner' AS source
    FROM partner_products pp
    JOIN marketplace_partners mp ON mp.id = pp.partner_id
    WHERE pp.in_stock=TRUE AND mp.status='approved'
    ORDER BY id
  `)).rows;

  if (isSimpleAffirmation(text) && conversation?.history?.length) {
    const last = conversation.history[conversation.history.length - 1];
    return `Nibyo 😊 ${isMarketplaceIntent(last?.text || "") ? "Mbwira igicuruzwa ushaka cyangwa nkubwire ibiciro n'amahitamo bihari." : "Hari igicuruzwa ushaka kugura cyangwa ushaka ko nkufasha guhitamo?"}`;
  }

  if (/^(hi|hello|muraho|mwiriwe|mwaramutse|amakuru)/i.test(text.trim())) {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return "Muraho! Murakaza neza kuri LUMIA Marketplace. 😊\n\nNi iki ushaka kugura? Ushobora kuvuga izina ry'igicuruzwa cyangwa category ushaka." + (categories.length ? `\n\nUrugero: ${categories.slice(0, 5).join(", ")}.` : "");
  }

  const exactMatches = products.filter(p => {
    const name = normalize(p.name);
    return name && (q === name || q.includes(name) || name.includes(q));
  });
  const words = q.split(/\s+/).filter(w => w.length > 2);
  const matches = exactMatches.length ? exactMatches : products.filter(p => {
    const hay = normalize(`${p.name} ${p.category} ${p.description || ""}`);
    return words.some(w => hay.includes(w));
  });

  if (matches.length) {
    const list = matches.slice(0, 5).map((p, i) => {
      const price = Number(p.price) > 0 ? Number(p.price).toLocaleString() + " " + (p.currency || "RWF") : "Igiciro ubisabire";
      return `${i + 1}. ${p.name}\n   ${p.description || "Igicuruzwa kiboneka muri LUMIA Marketplace."}\n   Igiciro: ${price}\n   Link: ${productLink(p.id)}`;
    }).join("\n\n");
    return `Dore ibyo nabonye bijyanye n'icyo ushaka:\n\n${list}\n\nHitamo igicuruzwa ushaka, cyangwa umbwire niba ushaka ibindi bisa na byo.`;
  }

  if (/buy|gura|order|shaka kugura|ndashaka/i.test(q)) {
    return "Ni byiza 😊 Mbwira igicuruzwa ushaka kugura, nk'urugero laptop, telefoni, imyenda, furniture cyangwa solar.";
  }

  // Only use the refusal for clearly unrelated requests, not short confirmations or natural follow-ups.
  return "Hari igicuruzwa cyangwa serivisi ushaka muri LUMIA Marketplace? 😊";
}

router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && verifyToken(req) && challenge) return res.status(200).type("text/plain").send(challenge);
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
    if (!from || !text) return;

    console.log(`LUMIA Marketplace received message from ${from}`);
    const conversation = await getConversation(from);

    const readOk = await markMessageAsRead(messageId);
    const typingOk = await startTypingIndicator(from, messageId);
    console.log(`LUMIA status: read=${readOk}, typing=${typingOk}, messageId=${messageId}`);

    try {
      const reply = await marketplaceReply(text, conversation);
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
