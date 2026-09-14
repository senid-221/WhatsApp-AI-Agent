import { Router } from "express";
import { getAIReply } from "../services/ai.js";
import { sendWhatsAppMessage, showTypingIndicator } from "../services/whatsapp.js";
import { getConversation, saveConversationTurn } from "../services/conversationMemory.js";
import { getDatabase } from "../services/database.js";

const router = Router();
const MARKET_URL = process.env.MARKETPLACE_URL || "https://lumia-ai-portal.onrender.com/marketplace";

function verifyToken(req) {
  const supplied = req.query["hub.verify_token"];
  const expected = process.env.VERIFY_TOKEN;
  return typeof supplied === "string" && typeof expected === "string" && supplied.trim() === expected.trim();
}

async function marketplaceReply(text, phone) {
  const db = getDatabase();
  const q = text.toLowerCase();
  const products = (await db.query("SELECT id,name,category,description,price,currency FROM marketplace_products WHERE in_stock=TRUE ORDER BY id")).rows;

  if (/^(hi|hello|muraho|mwiriwe|mwaramutse|amakuru)/i.test(q)) {
    const categories = [...new Set(products.map(p => p.category))];
    return "Muraho! Murakaza neza kuri LUMIA Marketplace. 😊\n\nNi iki ushaka kugura? Hitamo category cyangwa andika izina ry'igicuruzwa:\n" + categories.map((c,i)=>`${i+1}. ${c}`).join("\n");
  }

  const words = q.split(/\s+/).filter(w=>w.length>2);
  const matches = products.filter(p => {
    const hay = `${p.name} ${p.category} ${p.description||""}`.toLowerCase();
    return words.some(w=>hay.includes(w));
  });

  if (matches.length) {
    const list = matches.slice(0,5).map((p,i) => {
      const price = Number(p.price)>0 ? Number(p.price).toLocaleString()+" "+p.currency : "Igiciro ubisabire";
      return `${i+1}. ${p.name}\n   ${p.description||"Igicuruzwa cyiza kiboneka muri LUMIA Marketplace."}\n   Igiciro: ${price}\n   Link: ${MARKET_URL}?product=${p.id}`;
    }).join("\n\n");
    return `Dore ibicuruzwa bijyanye n'ibyo ushaka:\n\n${list}\n\nAndika izina cyangwa numero y'igicuruzwa ushaka, cyangwa fungura link kugira ngo ugure.`;
  }

  if (/buy|gura|order|shaka kugura|ndashaka/i.test(q)) {
    return "Ni byiza! 😊 Mbwira igicuruzwa ushaka kugura. Urashobora guhitamo: imyenda, laptops, desktops, mobile phones, flat screens, solar panels, furniture, sports, health & care, toys, websites cyangwa mobile apps.";
  }

  return "Murakoze kutwandikira. 😊 LUMIA AI yemerewe gutanga amakuru ajyanye gusa na LUMIA Marketplace: ibicuruzwa, services, ibiciro, ubwiza bw'ibicuruzwa n'uburyo bwo kugura. Mumbabarire, sinshobora gutanga andi makuru atajyanye na LUMIA Marketplace.\n\nMbwira igicuruzwa ushaka kugura.";
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
    const from = message.from;
    const text = message.text?.body?.trim();
    const messageId = message.id;
    if (!from || !text) return;

    console.log("LUMIA Marketplace received message from " + from);
    const conversation = await getConversation(from);
    try { await showTypingIndicator(messageId); } catch (e) { console.warn("Typing indicator error:", e.message); }

    const reply = await marketplaceReply(text, from);
    await sendWhatsAppMessage(from, reply);
    await saveConversationTurn(from, text, reply);
  } catch (error) {
    console.error("LUMIA webhook error:", error.response?.data || error.message);
  }
});

export default router;
