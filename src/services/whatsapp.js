import axios from "axios";


function cleanToken(value) {
  return typeof value === "string" ? value.trim().replace(/^Bearer\s+/i, "") : "";
}

function getConfig() {
  // Prefer the explicit production variable. WHATSAPP_TOKEN is only a legacy fallback.
  const accessToken = cleanToken(process.env.WHATSAPP_ACCESS_TOKEN) || cleanToken(process.env.WHATSAPP_TOKEN);
  const phoneNumberId = String(process.env.PHONE_NUMBER_ID || "").trim();

  if (!accessToken) throw new Error("Missing WhatsApp access token. Set WHATSAPP_ACCESS_TOKEN in Render.");
  if (!phoneNumberId) throw new Error("Missing PHONE_NUMBER_ID in Render.");

  return { accessToken, phoneNumberId };
}

function getUrl(phoneNumberId) {
  return `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
}

function getHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}

function apiError(error) {
  return error?.response?.data?.error || null;
}

export async function showTypingIndicator(messageId) {
  if (!messageId) return false;

  try {
    const { accessToken, phoneNumberId } = getConfig();

    // WhatsApp requires the incoming message to be marked as read first.
    await axios.post(
      getUrl(phoneNumberId),
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
      },
      { headers: getHeaders(accessToken), timeout: 10000 }
    );

    // Start the official Cloud API typing indicator after marking the message as read.\n    // The indicator remains active while the response is being prepared.\n    await axios.post(\n      getUrl(phoneNumberId),\n      {\n        messaging_product: "whatsapp",\n        status: "read",\n        message_id: messageId,\n        typing_indicator: { type: "text" }\n      },\n      { headers: getHeaders(accessToken), timeout: 10000 }\n    );\n\n    console.log("LUMIA marked message as read and started typing indicator.");

    return true;
  } catch (error) {
    const meta = apiError(error);
    const code = meta?.code;
    const status = error?.response?.status;

    // Typing is optional. Never allow it to stop the customer's reply.
    if (status === 401 || code === 190) {
      console.warn("LUMIA read/typing authentication failed. Check WHATSAPP_ACCESS_TOKEN and PHONE_NUMBER_ID.");
    } else {
      console.warn("LUMIA typing indicator unavailable:", meta?.message || error.message);
    }

    return false;
  }
}

export async function sendWhatsAppMessage(to, text) {
  const { accessToken, phoneNumberId } = getConfig();

  try {
    const response = await axios.post(
      getUrl(phoneNumberId),
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text }
      },
      { headers: getHeaders(accessToken), timeout: 15000 }
    );

    return response.data;
  } catch (error) {
    const meta = apiError(error);
    if (error?.response?.status === 401 || meta?.code === 190) {
      console.error("WhatsApp send authentication failed. Render must use a valid WHATSAPP_ACCESS_TOKEN for this PHONE_NUMBER_ID.");
    }
    throw error;
  }
}

export function validateWhatsAppConfig() {
  const { accessToken, phoneNumberId } = getConfig();
  console.log(`WhatsApp configuration loaded (PHONE_NUMBER_ID ending: ...${phoneNumberId.slice(-4)}, token length: ${accessToken.length})`);
}
