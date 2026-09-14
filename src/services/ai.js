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
  return text.replace(/\*\*(.*?)\*\*/gs, "$1").replace(/__(.*?)__/gs, "$1").replace(/\*(.*?)\*/gs, "$1").replace(/_(.*?)_/gs, "$1").replace(/^\s{0,3}#{1,6}\s*/gm, "").replace(/^\s*[•*]\s+/gm, "• ").replace(/\n{3,}/g, "\n\n").trim();
}

function randomSeed() {
  return Math.floor(Math.random() * 1000000000);
}

export async function getAIReply(message, conversation = { isNewSession: true, history: [] }) {
  const ai = getClient();
  if (!ai) return "Lumia iri kuri internet, ariko urufunguzo rwa Gemini AI ntirurashyirwamo neza.";

  const previousConversation = conversation.history
    .map((item) => item.role === "user" ? "Umukiriya: " + item.text : "LUMIA: " + item.text)
    .join("\n");

  const context = previousConversation
    ? "Ikiganiro cyabanje:\n" + previousConversation + "\n\nUbutumwa bushya bw'umukiriya: " + message
    : message;

  const sessionRule = conversation.isNewSession
    ? "Iki ni ikiganiro gishya nyuma y'amasaha 12 cyangwa arenga. Ushobora gusuhuza umukiriya niba bikwiye, ariko ntubikore ku gahato."
    : "Iki kiganiro kiracyakomeje. Ntongera gusuhuza umukiriya nk'aho ari bwo mutangiye kuganira. Komeza uhereye ku byo mwaganiriyeho.";

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    contents: `${context}\n\nVariation seed: ${randomSeed()}`,
    config: {
      temperature: 0.9,
      topP: 0.95,
      systemInstruction: "Uri LUMIA, umufasha wa AI wa LUMIA Marketplace ukoresha WhatsApp.\n\nAmategeko y'ingenzi:\n" +
        "- Bika context y'ikiganiro watanzwe kandi usubize uhereye ku byo umukiriya na LUMIA bari bamaze kuganiraho.\n" +
        "- " + sessionRule + "\n" +
        "- Niba abakiriya babiri babajije ikibazo gisa, ntusubize interuro imwe buri gihe. Hindura imvugo, interuro, uko utangira, urugero uko utanga ibisobanuro cyangwa ikibazo cyo gukurikizaho, ariko ukomeze ukuri kw'amakuru.\n" +
        "- Hitamo response imwe isa n'iy'umuntu mu buryo bwa randomly selected phrasing, ariko ntuhindure igiciro, izina ry'igicuruzwa, link, cyangwa andi makuru y'ukuri.\n" +
        "- Ntukoreshe random facts cyangwa kubeshya kugira ngo ibisubizo bitandukanye.\n" +
        "- Niba ikibazo gisaba amakuru y'ibicuruzwa, koresha gusa amakuru ahari muri LUMIA Marketplace context.\n" +
        "- Niba umukoresha yanditse mu Kinyarwanda, subiza mu Kinyarwanda cyiza kandi cyanditswe neza.\n" +
        "- Subiza mu rurimi umukoresha yakoresheje, keretse agusabye guhindura ururimi.\n" +
        "- Ntukoreshe Markdown cyangwa stars mu gisubizo.\n" +
        "- Ntukavuge ko uri gutekereza kandi ntwerekane reasoning yawe.\n" +
        "- Ba umunyabuntu, usobanutse kandi ugire ibisubizo bifite ireme."
    }
  });

  const reply = cleanReply(response.text);
  return reply || "Mbabarira, sinabashije gutegura igisubizo. Ongera ugerageze.";
}
