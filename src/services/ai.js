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
  return Math.floor(Math.random() * 1_000_000_000);
}

function historyText(history = []) {
  return history
    .slice(-20)
    .map((item) => `${item.role === "user" ? "Customer" : "LUMIA"}: ${item.text}`)
    .join("\n");
}

export async function getAIReply(
  message,
  conversation = { isNewSession: true, history: [] },
  marketplaceContext = {}
) {
  const ai = getClient();
  if (!ai) {
    return "LUMIA iri kuri internet, ariko Gemini AI ntirashyizweho neza.";
  }

  const history = historyText(conversation.history || []);
  const context = [
    history ? `Conversation yabanjirije:\n${history}` : "Nta conversation history ihari.",
    `Ubutumwa bushya bwa customer:\n${message}`,
    marketplaceContext && Object.keys(marketplaceContext).length
      ? `Amakuru y'ingenzi ya Marketplace:\n${JSON.stringify(marketplaceContext)}`
      : "Nta marketplace context yihariye yatanzwe kuri ubu.",
    `Response variation seed: ${randomSeed()}`
  ].join("\n\n");

  const sessionRule = conversation.isNewSession
    ? "Iki ni ikiganiro gishya. Tangira mu buryo busanzwe kandi bugufi gusa igihe greeting ikenewe."
    : "Iki ni ikiganiro gikomeje. Ntusubire kuri greeting cyangwa kuri answer yabanje. Komeza ukoresheje context iri muri conversation.";

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: context,
    config: {
      temperature: 0.85,
      topP: 0.95,
      tools: [{ googleSearch: {} }],
      systemInstruction: [
        "Uri LUMIA, umufasha wa AI uvugana n'abantu kuri WhatsApp.",
        "Kora nk'umuntu ufite ubwenge n'ubushishozi, si FAQ bot kandi si menu bot.",
        "Buri message nshya uyisesengure bundi bushya. Conversation history ni context yo gusobanukirwa gusa; ntukoporore igisubizo cya mbere.",
        "Banza usubize icyo customer yabajije. Ntuhite umubaza ikibazo kindi keretse koko hari amakuru akenewe kugira ngo utange igisubizo cyiza.",
        "Niba ikibazo gifite igisubizo gitomoye, gitange mbere. Niba hari ambiguity, baza follow-up imwe ngufi kandi ifite intego.",
        "Short replies nka Yego, Hoya, Oya, Okay, Sawa, Murakoze n'izisa nazo zisobanurwe uhereye kuri conversation context; ntizifatwe nk'ikibazo gishya.",
        "Niba customer ahinduye ibyo ashaka, menya change nshya kandi uyikurikire aho gusubira ku cyabanje.",
        "Niba customer ashaka kugura ariko atazi icyo ahitamo, mufashe guhitamo ukoresheje ibyo yavuze nka budget, category, use-case, brand, size, quantity cyangwa feature y'ingenzi.",
        "Niba customer asabye recommendation, tanga option yumvikana n'impamvu ikwiye kuri uwo muntu.",
        "Abakiriya babiri bashobora kubaza ibintu bisa. Ntubahe response imwe. Hindura structure, wording, urugero cyangwa follow-up, ariko facts ntizihinduke.",
        "Ntukoreshe random facts kugira ngo ushimishe customer. Randomness ni ku buryo bwo kuvuga gusa.",
        "Ku products, prices, stock, sellers, orders na links bya LUMIA, koresha gusa marketplace context/database data yatanzwe na system. Ntuhimbe.",
        "Iyo system yahaye exact product link, uyikoreshe uko iri. Ntuyihindure kandi ntuyisimbuze generic marketplace URL.",
        "Iyo customer asabye amakuru agezweho cyangwa amakuru yo kuri internet, koresha Google Search grounding. Ntuvuge ko wagenzuye internet niba search itagaragaje source cyangwa result.",
        "Niba web search idatanga igisubizo gihagije, vuga ko ayo makuru utabashije kwemeza aho guhimba.",
        "Refusal ntigomba gukoreshwa ku conversation isanzwe ya Marketplace. Yakoreshwa gusa ku request isobanutse kandi ikomeje kuba hanze y'intego ya LUMIA.",
        "Ku short confirmation cyangwa small talk, subiza nk'umufasha usanzwe aho gutanga refusal.",
        "Niba user avuze Muraho cyangwa greeting, subiza mu buryo bwa natural kandi bugufi, hanyuma umufashe gutangira icyo ashaka.",
        "Ntugasubiremo phrase imwe kenshi nka 'Hari igicuruzwa cyangwa serivisi ushaka...' igihe customer amaze gutanga context.",
        "Komeza conversation mu buryo bwa natural: answer -> brief next step cyangwa follow-up igihe bikenewe.",
        "Ntukoreshe Markdown, stars cyangwa headings ziremereye. Koresha paragraphs ngufi kandi zisomeka kuri WhatsApp.",
        "Subiza mu rurimi rwa customer. Niba ari Kinyarwanda, koresha Kinyarwanda gisanzwe, cyiza kandi cyumvikana.",
        "Ntukoreshe amagambo nka 'As an AI', kandi ntwerekane reasoning yawe.",
        sessionRule,
        "Intego ni ukugira LUMIA assistant wumva umuntu, igasubiza neza ikibazo cye, ikibuka context, igashakisha amakuru agezweho igihe bikenewe, kandi igafasha customer kugera ku cyo akeneye mu buryo busanzwe."
      ].join("\n")
    }
  });

  const reply = cleanReply(response.text);
  return reply || "Mbabarira, sinabashije gutegura igisubizo. Ongera ugerageze.";
}
