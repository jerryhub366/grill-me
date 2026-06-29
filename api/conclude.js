import { callResponsesApi, conclusionPrompt, messagesForConclusion, validateMessages } from "../lib/grill.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const messages = validateMessages(req.body?.messages, "There is no conversation to conclude yet.");
    const startedAt = performance.now();
    const text = await callResponsesApi(messagesForConclusion(messages), conclusionPrompt, 650);
    const durationMs = Math.round(performance.now() - startedAt);
    res.status(200).json({ text, durationMs });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || "Unexpected server error." });
  }
}
