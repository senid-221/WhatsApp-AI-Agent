const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const conversations = new Map();

export function getConversation(phone) {
  const conversation = conversations.get(phone);
  if (!conversation) return { isNewSession: true, history: [] };
  const isNewSession = Date.now() - conversation.lastUserMessageAt > TWELVE_HOURS_MS;
  return isNewSession ? { isNewSession: true, history: [] } : { isNewSession: false, history: conversation.history };
}

export function saveConversationTurn(phone, userMessage, assistantMessage) {
  const current = conversations.get(phone);
  const expired = !current || Date.now() - current.lastUserMessageAt > TWELVE_HOURS_MS;
  const history = expired ? [] : current.history;
  history.push({ role: "user", text: userMessage }, { role: "assistant", text: assistantMessage });
  conversations.set(phone, { lastUserMessageAt: Date.now(), history: history.slice(-20) });
}