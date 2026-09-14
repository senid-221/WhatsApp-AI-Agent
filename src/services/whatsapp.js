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

export async function markMessageAsRead(messageId) {
  if (!messageId) return false;
  try {
    const { accessToken, phoneNumberId } = getConfig();
    await axios.post(
      getUrl(phoneNumberId),
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
      },
      { headers: getHeaders(accessToken), timeout: 10000 }
    );
    console.log("LUMIA marked incoming WhatsApp message as read.");
    return true;
  } catch (error) {
    const meta = apiError(error);
    console.warn("LUMIA read receipt failed:", meta?.message || error.message);
    return false;
  }
}

export async function startTypingIndicator(to, messageId) {
  if (!to || !messageId) return false;
  try {
    const { accessToken, phoneNumberId } = getConfig();
    await axios.post(
      getUrl(phoneNumberId),
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        message: undefined,
        typing_indicator: {
          type: "text"
        }
      },
      { headers: getHeaders(accessToken), timeout: 10000 }
    );
    console.log("LUMIA started WhatsApp typing indicator.");
    return true;
  } catch (error) {
    const meta = apiError(error);
    console.warn("LUMIA typing indicator failed:", meta?.message || error.message);
    return false;
  }
}

export async function sendTypingIndicator(messageId, to) {
  return startTypingIndicator(to, messageId);
}

export async function stopTypingIndicator(messageId) {
  return Boolean(messageId);
}

export async function showTypingIndicator(to, messageId) {
  const read = await markMessageAsRead(messageId);
  const typing = await startTypingIndicator(to, messageId);
  return { read, typing };
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
