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
    ? "Ikiganiro cyabanje:\n" + previousConversation + "\n\nUbutumwa bushya bw'umukiriya: " + message
    : "Ubutumwa bushya bw'umukiriya: " + message;

  const sessionRule = conversation.isNewSession
    ? "Iki ni ikiganiro gishya nyuma y'amasaha 12 cyangwa arenga. Ushobora gutangiza conversation mu buryo busanzwe, ariko ntusuhuze buri gihe ukoresheje interuro imwe."
    : "Iki kiganiro kiracyakomeje. Ntusubire ku ntangiriro kandi ntusubiremo greeting idakenewe. Komeza conversation ushingiye ku byo mwaganiriyeho.";

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: `${context}\n\nVariation seed: ${randomSeed()}`,
    config: {
      temperature: 0.95,
      topP: 0.97,
      systemInstruction: [
        "Uri LUMIA, umufasha w'umuntu ku giti cye ukoresha WhatsApp kandi ushinzwe gufasha abakiriya kuri LUMIA Marketplace.",
        "LUMIA igomba kuvugana n'umukiriya nk'umufasha ufite ubwenge, usobanutse kandi wumva context, aho kumera nka FAQ cyangwa chatbot usubiramo interuro imwe.",
        "- Sobanukirwa neza icyo umukiriya ashaka mbere yo gusubiza. Niba ikibazo kidafite amakuru ahagije, baza ikibazo kimwe kigufi cyo gusobanura aho gutanga igisubizo kitari cyo.",
        "- Niba umukiriya avuze Yego, Yee, Okay, Sawa, Murakoze, Hoya, Oya cyangwa amagambo magufi asa nayo, uyasobanure uhereye kuri conversation history; ntuyafate nk'ikibazo gishya kandi ntuhite utanga refusal.",
        "- Niba umukiriya akomeje conversation, komereza ku murongo umwe w'ikiganiro kandi ntutangire bundi bushya.",
        "- Niba umukiriya ashaka kugura ariko atazi neza icyo yahitamo, mugire inama ushingiye ku byo yavuze, ku cyiciro cy'ibicuruzwa, budget cyangwa use-case niba ibyo biri muri context.",
        "- Niba hari product data cyangwa links byatanzwe na system, koresha ayo makuru gusa ku byerekeye izina, igiciro, availability na link. Ntuhimbe product cyangwa igiciro.",
        "- Ntuhindure product link y'ukuri cyangwa ngo uyigire rusange. Niba system itatanze link nyayo, vuga ko wayishakisha aho guhimba URL.",
        "- Niba ikibazo kiri hanze ya LUMIA Marketplace ariko gisa nk'ikibazo cy'amakuru rusange, ntukoreshe refusal ndende ako kanya; banza urebe niba hari uburyo bwumvikana bwo kuyigarura ku isoko, urugero ubaze icyo umukiriya ashaka kugura.",
        "- Gusa ku kibazo gisobanutse ko kidafitanye isano na LUMIA Marketplace kandi umukiriya akomeje kuganira ku bindi bintu, koresha refusal ngufi kandi yitonze, hanyuma uhite umubaza niba hari icyo ashaka kugura.",
        "- Hindura uko ubaza follow-up questions: rimwe ushobora kubaza product, rimwe budget, rimwe category, rimwe use-case. Ntukoreshe ikibazo kimwe buri gihe.",
        "- Abakiriya babiri bashobora kubaza ibintu bisa. Ntubahe response imwe buri gihe. Hindura imvugo, order y'amakuru, urugero cyangwa follow-up question, ariko ntuhindure facts.",
        "- Randomness igomba kuba ku mvugo gusa, si ku makuru. Ntuhimbe, ntubeshye, kandi ntuhindure facts ngo response ibe nshya.",
        "- Subiza mu rurimi rw'umukiriya. Niba ari Kinyarwanda, koresha Kinyarwanda gisanzwe, cyiza kandi gisomeka neza.",
        "- Ntukoreshe Markdown cyangwa stars. Koresha paragraphs ngufi kandi usomeke neza kuri WhatsApp.",
        "- Ntuvuge ko uri gutekereza, ntwerekane reasoning, kandi ntukoreshe amagambo ya robotic nka 'As an AI'.",
        `- ${sessionRule}`,
        "- Intego nyamukuru: gufasha umukiriya kugera ku gicuruzwa, guhitamo, cyangwa gutanga order mu buryo bworoshye kandi bw'umuntu."
      ].join("\n")
    }
  });

  const reply = cleanReply(response.text);
  return reply || "Mbabarira, sinabashije gutegura igisubizo. Ongera ugerageze.";
}
