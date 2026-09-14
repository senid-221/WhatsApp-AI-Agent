import axios from "axios";

function cleanToken(value) {
  return typeof value === "string" ? value.trim().replace(/^Bearer\s+/i, "") : "";
}

function getConfig() {
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

async function markMessageAsRead(messageId, config) {
  const { accessToken, phoneNumberId } = config;
  return axios.post(
    getUrl(phoneNumberId),
    {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId
    },
    { headers: getHeaders(accessToken), timeout: 10000 }
  );
}

async function startTypingIndicator(messageId, config) {
  const { accessToken, phoneNumberId } = config;
  return axios.post(
    getUrl(phoneNumberId),
    {
      messaging_product: "whatsapp",
      typing_indicator: {
        type: "text"
      },
      message_id: messageId
    },
    { headers: getHeaders(accessToken), timeout: 10000 }
  );
}

export async function showTypingIndicator(messageId) {
  if (!messageId) return false;

  try {
    const config = getConfig();

    // Mark the incoming message as read first.
    await markMessageAsRead(messageId, config);
    console.log("LUMIA marked incoming WhatsApp message as read.");

    // Then start WhatsApp's typing indicator using the Cloud API payload.
    await startTypingIndicator(messageId, config);
    console.log("LUMIA started WhatsApp typing indicator.");

    return true;
  } catch (error) {
    const meta = apiError(error);
    const code = meta?.code;
    const status = error?.response?.status;

    if (status === 401 || code === 190) {
      console.warn("LUMIA read/typing authentication failed. Check WHATSAPP_ACCESS_TOKEN and PHONE_NUMBER_ID.");
    } else {
      console.warn("LUMIA read/typing indicator unavailable:", meta?.message || error.message);
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
