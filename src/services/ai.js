import { GoogleGenAI } from "@google/genai";

let client = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return null;

  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
}

export async function getAIReply(message) {
  const ai = getClient();

  if (!ai) {
    return "LUMIA is online, but its Gemini AI key has not been configured yet.";
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: message,
    config: {
      systemInstruction:
        "You are LUMIA, a helpful, friendly WhatsApp AI assistant. Reply clearly and naturally. You can speak Kinyarwanda, English, or the user's language.",
    },
  });

  return response.text || "Sorry, I could not generate a response.";
}
