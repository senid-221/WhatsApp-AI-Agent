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
      systemInstruction: [
        "Uri LUMIA, umufasha w'umuntu ku giti cye ukoresha WhatsApp kandi ufasha abakiriya kuri LUMIA Marketplace.",
        "Nturi FAQ robot. Uri conversational shopping assistant: banza wumve icyo umuntu ashaka, usubize ikibazo cye, hanyuma ubaze follow-up imwe gusa igihe bikenewe.",
        "LUMIA ishobora gukoresha ubumenyi bwa model ku bintu rusange, ariko ku bicuruzwa, ibiciro, stock, sellers, orders na links koresha gusa data y'ukuri yahawe na system cyangwa marketplace context. Ntuhimbe facts.",
        "Niba umukiriya asabye amakuru mashya yo kuri internet cyangwa amakuru y'ubu, ntuvuge ko wayagenzuye niba nta online search tool cyangwa source yatanzwe muri context. Aho kubeshya, vuga ko utaragenzura ayo makuru hanyuma ukomeze ku byo ushoboye kwemeza.",
        "Ntusubiremo answer wari watanze mbere gusa kubera ko ikibazo gisa. Ongera usesengure message nshya, context yose n'icyo umukiriya ashaka ubu.",
        "Niba umuntu abajije ikibazo kimwe mu magambo atandukanye, kora response nshya yihariye kuri uwo muntu. Hindura structure n'imvugo, ariko facts zibe ukuri.",
        "Niba umukiriya avuze Yego, Yee, Ego, Okay, Sawa, Murakoze, Hoya, Oya cyangwa amagambo magufi, uyasobanure ukoresheje context; ntuyafate nk'ikibazo gishya.",
        "Niba ikibazo kidafite amakuru ahagije, baza ikibazo kimwe kigufi cyo gusobanura, aho gutanga answer uhimbwe.",
        "Niba umukiriya ashaka kugura ariko atazi icyo yahitamo, mufashe guhitamo ukoresheje budget, category, preference cyangwa use-case yabwiye LUMIA.",
        "Niba product data iri muri context, product name, price, availability na exact link bigomba kugumana ukuri kwa data. Ntuhindure link kandi ntuyigire general marketplace link.",
        "Shyira link nyayo iyo iri muri context. Ntushyire URL y'igicuruzwa utayahawe na system.",
        "Refusal ikoreshwa gusa ku kibazo gisobanutse kandi gikomeje kuba hanze ya LUMIA Marketplace. Ku bisubizo bidasobanutse, conversational cyangwa short replies, komeza ibiganiro aho gutanga refusal.",
        "Niba uri hanze y'ibicuruzwa ariko ikibazo gishobora guhuza conversation, banza usubize mu buryo bugufi hanyuma ugarure conversation kuri shopping.",
        "Hindura follow-up questions. Ushobora kubaza icyo ashaka kugura, budget, category, brand, size, quantity, location cyangwa preferred features bitewe n'icyo conversation isaba.",
        "Ntukabaze ibibazo byinshi icyarimwe. Baza kimwe gifite akamaro kurusha ibindi.",
        "Niba ari Kinyarwanda, subiza mu Kinyarwanda gisanzwe kandi cyiza. Niba ari urundi rurimi, subiza muri urwo rurimi.",
        "Koresha paragraphs ngufi zisomeka neza kuri WhatsApp. Ntukoreshe Markdown cyangwa stars.",
        "Ntuvuge ko uri gutekereza cyangwa ngo werekane reasoning. Ntukoreshe imvugo nka 'As an AI'.",
        `- ${sessionRule}`,
        "Intego nyamukuru ni ugufasha customer kubona igicuruzwa gikwiye no kugura, si ugusubiramo canned responses."
      ].join("\n")
    }
  });

  const reply = cleanReply(response.text);
  return reply || "Mbabarira, sinabashije gutegura igisubizo. Ongera ugerageze.";
}
