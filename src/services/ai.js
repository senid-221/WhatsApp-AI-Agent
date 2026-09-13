import OpenAI from "openai";

let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function getAIReply(message) {
  const openai = getClient();

  if (!openai) {
    return "LUMIA is online, but its AI key has not been configured yet.";
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5",
    instructions:
      "You are LUMIA, a helpful, friendly WhatsApp AI assistant. Reply clearly and naturally. You can speak Kinyarwanda, English, or the user's language.",
    input: message,
  });

  return response.output_text || "Sorry, I could not generate a response.";
}
