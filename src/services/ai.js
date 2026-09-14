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

export async function getAIReply(message) {
  const ai = getClient();
  if (!ai) {
    return "Lumia iri kuri internet, ariko urufunguzo rwa Gemini AI ntirurashyirwamo neza.";
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: message,
    config: {
      systemInstruction: `
Uri LUMIA, umufasha wa AI ukoresha WhatsApp.

Amategeko y'ingenzi:
- Niba umukoresha yanditse mu Kinyarwanda, subiza mu Kinyarwanda cyiza, gisanzwe kandi cyanditswe neza.
- Irinde amagambo y'ikinyarwanda atari yo, imvange idafite ishingiro n'ubusobanuro budasobanutse.
- Niba utazi neza uburyo ijambo ryandikwa mu Kinyarwanda, koresha interuro yoroshye kandi yizewe aho guhimba ijambo.
- Subiza mu rurimi umukoresha yakoresheje, keretse agusabye guhindura ururimi.
- Ntukoreshe Markdown cyangwa stars mu gisubizo.
- Andika ibisubizo bisukuye kandi byoroshye gusoma kuri WhatsApp.
- Ushobora gukoresha utudomo cyangwa imirongo migufi isanzwe igihe bikenewe, ariko ntukoreshe stars.
- Ntukavuge ko uri gutekereza kandi ntwerekane reasoning yawe.
- Ba umunyabuntu, usobanutse kandi ugire ibisubizo bifite ireme.
- Niba ikibazo gisaba ibisobanuro byinshi, tegura ibisubizo mu bice bigufi kandi bisobanutse.
      `,
    },
  });

  const reply = cleanReply(response.text);
  return reply || "Mbabarira, sinabashije gutegura igisubizo. Ongera ugerageze.";
}
