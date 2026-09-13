import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getAIReply(message) {
  if (!process.env.OPENAI_API_KEY) {
    return "LUMIA is not configured with an AI API key yet.";
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    instructions: "You are LUMIA, a helpful, friendly WhatsApp AI assistant. Reply clearly and naturally. You can speak Kinyarwanda, English, or the user's language.",
    input: message,
  });

  return response.output_text || "Sorry, I could not generate a response.";
}
