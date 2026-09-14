import { GoogleGenAI } from "@google/genai";

let client = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

function cleanReply(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/__(.*?)__/gs, "$1")
    .replace(/\*(.*?)\*/gs, "$1")
    .replace(/_(.*?)_/gs, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[•*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function randomSeed() {
  return Math.floor(Math.random() * 1000000000);
}

export async function getAIReply(message, conversation = { isNewSession: true, history: [] }) {
  const ai = getClient();
  if (!ai) return "LUMIA iri kuri internet, ariko urufunguzo rwa Gemini AI ntirurashyirwamo neza.";

  const previousConversation = (conversation.history || [])
    .map((item) => item.role === "user" ? "Umukiriya: " + item.text : "LUMIA: " + item.text)
    .join("\n");

  const context = previousConversation
    ? "Conversation history:\n" + previousConversation + "\n\nNew customer message: " + message
    : "New customer message: " + message;

  const sessionRule = conversation.isNewSession
    ? "Iki ni ikiganiro gishya. Tangiza conversation mu buryo busanzwe kandi butandukanye, ariko ntusuhuze buri gihe ukoresheje interuro imwe."
    : "Iki kiganiro kiracyakomeje. Ntusubire ku ntangiriro. Koresha context iri hejuru kandi komereza aho mwari muri conversation.";

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: `${context}\n\nVariation seed: ${randomSeed()}`,
    config: {
      temperature: 0.9,
      topP: 0.95,
      tools: [
        { googleSearch: {} }
      ],
      systemInstruction: [
        "Uri LUMIA, umufasha w'umuntu ku giti cye ukora kuri WhatsApp kandi ufasha abakiriya kuri LUMIA Marketplace.",
        "Kora nk'umufasha ufite ubwenge: banza wumve neza message nshya, urebe context, hanyuma utegure igisubizo gishya aho guterura answer wari watanze mbere.",
        "Koresha Google Search grounding igihe umukiriya akeneye amakuru mashya, amakuru yo kuri internet, ibintu bihinduka, cyangwa igihe search ishobora kongera ukuri. Gemini ikoresha Google Search tool gushakisha no gu-ground answer ku makuru agezweho.",
        "Niba ukoresheje search, komereza ku bisubizo byabonetse kandi ntuhimbe ibyo utabonye.",
        "Ku bicuruzwa, ibiciro, stock, sellers, orders na product links bya LUMIA, database/marketplace context ni source y'ingenzi. Ntuhimbe product, price, stock cyangwa link.",
        "Niba ikibazo ari rusange kandi kidakeneye amakuru mashya, koresha ubumenyi bwa model. Niba hari uncertainty cyangwa current information ikenewe, shakisha online.",
        "Nturi FAQ robot. Hindura wording, structure, examples na follow-up questions bitewe n'umuntu n'icyo abajije.",
        "Niba customer avuze Yego, Hoya, Okay, Sawa, Murakoze, Oya cyangwa response ngufi, uyumve ukoresheje conversation history; ntutangire conversation nshya.",
        "Niba ikibazo kidafite amakuru ahagije, baza follow-up imwe ngufi ifasha gusobanura.",
        "Niba customer ashaka kugura ariko atazi icyo yahitamo, mufashe guhitamo ukoresheje budget, category, use-case, brand, size, quantity cyangwa preferences yatangiye gutanga.",
        "Refusal ikoreshwa gusa ku kibazo gisobanutse kandi kidafite aho gihuriye na LUMIA Marketplace. Short conversational replies ntizihabwa refusal.",
        "Subiza mu rurimi rw'umukiriya. Kinyarwanda kigomba kuba gisanzwe, cyumvikana kandi cyanditswe neza.",
        "Koresha paragraphs ngufi kandi zisomeka kuri WhatsApp. Ntukoreshe Markdown cyangwa stars.",
        "Ntukoreshe imvugo nka 'As an AI' kandi ntwerekane reasoning.",
        `- ${sessionRule}`,
        "Intego ni ugutanga igisubizo cyiza, gihuye n'uyu mukiriya n'ubutumwa bwe, kandi gishingiye ku makuru yizewe."
      ].join("\n")
    }
  });

  const reply = cleanReply(response.text);
  return reply || "Mbabarira, sinabashije gutegura igisubizo. Ongera ugerageze.";
}
