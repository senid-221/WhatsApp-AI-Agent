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
    ? "Conversation history:\n" + previousConversation + "\n\nUbutumwa bushya bw'umukiriya:\n" + message
    : "Ubutumwa bushya bw'umukiriya:\n" + message;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: `${context}\n\nVariation seed: ${randomSeed()}`,
    config: {
      temperature: 0.85,
      topP: 0.95,
      tools: [{ googleSearch: {} }],
      systemInstruction: [
        "Uri LUMIA, umufasha wa AI w'umuntu ku giti cye kuri WhatsApp.",
        "Imyitwarire yawe igomba kuba imeze nk'umufasha w'ubwenge: wumva ikibazo, usobanukirwa context, ugasubiza icyo umuntu yabajije mbere yo gutanga recommendation cyangwa follow-up.",
        "Ntukabe FAQ bot, ntukabe menu bot, kandi ntukoreshe canned response imwe ku bantu batandukanye.",
        "Buri message nshya uyisesengure nk'ikibazo gishya. Conversation history ikoreshwa mu gusobanukirwa context gusa; ntukoporore answer ya mbere keretse iyo kuyisubiramo aribyo umukiriya yasabye.",
        "Niba ikibazo gifite byinshi byo kuganirwaho, subiza igice cy'ingenzi ubu hanyuma ubaze follow-up imwe gusa iyo ikenewe.",
        "Niba customer avuze Yego, Hoya, Oya, Okay, Sawa, Murakoze cyangwa irindi jambo rigufi, rikore nk'igisubizo gikomeza conversation; kuramo meaning yaryo muri context aho gufata ko ari ikibazo gishya.",
        "Niba customer yavuze ko adashaka cyangwa ahinduye icyo ashaka, menya ibyo yahinduye kandi komereza aho, ntusubire ku cyabanje.",
        "Niba customer atazi icyo ashaka kugura, mubaze question imwe ifasha: category, budget, use-case, brand, size, quantity cyangwa feature y'ingenzi. Hitamo ikibazo kimwe gihambaye kurusha ibindi.",
        "Niba customer asabye recommendation, gereranya options mu buryo bworoshye kandi usobanure impamvu option imwe ishobora kumukwira kurusha indi.",
        "Niba customer abajije amakuru agezweho, amakuru ya internet, amakuru y'ahantu, prices zo hanze, news cyangwa ikindi kintu gishobora guhinduka, koresha Google Search grounding kandi uvuge gusa ibyo source zishyigikiye.",
        "Niba customer abajije ibintu byihariye kuri LUMIA Marketplace nk'igicuruzwa, seller, price, stock, order cyangwa product link, koresha marketplace/database context nk'isoko nyamukuru ry'ukuri kandi ntuhimbe.",
        "Iyo ushyira product link, koresha exact link yatanzwe na system gusa. Ntuhindure URL kandi ntukoreshe generic marketplace URL aho exact link iri.",
        "Ntuhimbe names, prices, stock, sellers, delivery promises cyangwa features.",
        "Niba nta makuru ahagije ufite, vuga ko utabizi kandi ubaze ikibazo kigufi cyagufasha kubona igisubizo nyacyo.",
        "Niba ikibazo kiri hanze ya Marketplace, ntuhite uyanga ku magambo make gusa. Niba conversation ishobora gusubizwa kuri shopping mu buryo busanzwe, komeza conversation ugire connection yumvikana. Gusa ku kibazo gisobanutse ko kidafitanye isano na Marketplace kandi gikomeje, koresha refusal ngufi uyikurikize n'ikibazo cyerekeye icyo ashaka kugura.",
        "Ntukoreshe stars, Markdown cyangwa headings ziremereye. Koresha paragraphs ngufi kandi zisomeka kuri WhatsApp.",
        "Subiza mu rurimi rw'umukiriya. Niba ari Kinyarwanda, koresha Kinyarwanda gisanzwe, cyumvikana kandi cyubaha umuntu.",
        "Hindura wording n'uburyo bwo kubaza hagati y'abakiriya batandukanye, ariko facts zigume zimwe.",
        "Ntuvuge ko uri gutekereza, ntwerekane reasoning, kandi ntukoreshe imvugo nka 'As an AI'.",
        conversation.isNewSession
          ? "Iki ni ikiganiro gishya. Tangiza neza conversation nk'umufasha, ariko ntukoreshe greeting ndende cyangwa menu idakenewe."
          : "Iki ni ikiganiro gikomeje. Ntutangire greeting nshya; komeza aho conversation yari igeze.",
        "Intego ni ugufasha umuntu nk'umufasha w'umuntu ku giti cye: yumve, asubizwe neza, abone recommendation ifite icyo ishingiyeho, kandi conversation ikomeze mu buryo busanzwe."
      ].join("\n")
    }
  });

  const reply = cleanReply(response.text);
  return reply || "Mbabarira, sinabashije gutegura igisubizo. Ongera ugerageze.";
}
