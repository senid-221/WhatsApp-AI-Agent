import axios from "axios";

export async function sendWhatsAppMessage(to, text) {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error(
      "Missing WhatsApp access token. Set WHATSAPP_ACCESS_TOKEN in Render."
    );
  }

  if (!phoneNumberId) {
    throw new Error("Missing PHONE_NUMBER_ID in Render.");
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        "Content-Type": "application/json",
      },
    }
  );
}
