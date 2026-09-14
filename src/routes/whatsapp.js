import { Router } from "express";
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

async function marketplaceReply(text) {
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

  if (/^(hi|hello|muraho|mwiriwe|mwaramutse|amakuru)/i.test(text.trim())) {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return "Muraho! Murakaza neza kuri LUMIA Marketplace. 😊\n\nNi iki ushaka kugura? Hitamo category cyangwa andika izina ry'igicuruzwa:\n" + categories.map((c, i) => `${i + 1}. ${c}`).join("\n");
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
    return `Dore ibicuruzwa bijyanye n'ibyo ushaka:\n\n${list}\n\nAndika izina cyangwa numero y'igicuruzwa ushaka, cyangwa fungura link kugira ngo ugure.`;
  }

  if (/buy|gura|order|shaka kugura|ndashaka/i.test(q)) {
    return "Ni byiza! 😊 Mbwira igicuruzwa ushaka kugura. Urashobora guhitamo: imyenda, laptops, desktops, mobile phones, flat screens, solar panels, furniture, sports, health & care, toys, websites cyangwa mobile apps.";
  }

  return "Murakoze kutwandikira. 😊 Developer wa LUMIA yambujije gutanga andi makuru adafite aho ahuriye na LUMIA Marketplace. Mumbabarire.\n\nMbwira igicuruzwa ushaka kugura.";
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
    await getConversation(from);

    // Read the customer's incoming message immediately.
    const readOk = await markMessageAsRead(messageId);

    // Typing indicator must target the customer's WhatsApp number.
    const typingOk = await startTypingIndicator(from, messageId);
    console.log(`LUMIA status: read=${readOk}, typing=${typingOk}, messageId=${messageId}`);

    try {
      const reply = await marketplaceReply(text);
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
