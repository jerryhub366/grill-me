const model = process.env.OPENAI_MODEL || "gpt-5.5";
const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.cloudalpha.top").replace(/\/$/, "");
const reasoningEffort = process.env.OPENAI_REASONING_EFFORT || "low";

export const skillPrompt = `You are running Matt Pocock's "Grilling Me" skill as a focused web product.

Core behavior:
- Interview the user relentlessly about a plan, design, idea, or decision until there is a shared understanding.
- Walk down the design tree one dependency at a time.
- Ask exactly one question per turn. Never ask multiple questions in a single response.
- For each question, include your recommended answer so the user can accept it quickly.
- If the user's latest answer resolves the current question, briefly acknowledge the decision and move to the next single question.
- If context already answers something, do not ask it again.
- Keep the tone direct, constructive, and sharp without being hostile.
- Do not produce implementation plans, summaries, or long lists unless the user explicitly asks to stop grilling.

Response shape:
1. One short sentence naming what you just learned or what decision is now at stake.
2. One question.
3. A short "Recommended answer:" line.`;

export const conclusionPrompt = `You are concluding a completed grilling session about a user's plan, design, idea, or decision.

The user has chosen to stop the questioning. Do not ask another question. Do not continue the interview.
Generate a structured conclusion from the conversation.

Use this exact structure:
# Grilling Conclusion
## Core Idea
## Decisions Made
## Remaining Unknowns
## Main Risks
## Recommended Next Step

Keep it concise, specific, and useful. If the conversation has too little information, say so under Remaining Unknowns.`;

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 12000),
    }))
    .slice(-24);
}

export function messagesForConclusion(messages) {
  return [
    ...normalizeMessages(messages),
    {
      role: "user",
      content: "End the grilling session now. Do not ask another question. Produce the structured conclusion.",
    },
  ];
}

export function validateMessages(messages, emptyMessage) {
  const normalized = normalizeMessages(messages);
  if (!normalized.some((message) => message.role === "user" && message.content.trim())) {
    throw Object.assign(new Error(emptyMessage), { statusCode: 400 });
  }
  return normalized;
}

export async function callResponsesApi(messages, instructions = skillPrompt, maxOutputTokens = 260) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("OPENAI_API_KEY is not configured on the server."), { statusCode: 500 });
  }

  const payload = {
    model,
    instructions,
    input: messages,
    store: false,
    max_output_tokens: maxOutputTokens,
    reasoning: {
      effort: reasoningEffort,
    },
  };

  let response = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status === 400) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.reasoning;
    response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(fallbackPayload),
    });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `Model request failed with ${response.status}`;
    throw Object.assign(new Error(message), { statusCode: response.status });
  }

  return data.output_text || extractOutputText(data);
}

export function extractOutputText(data) {
  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.type === "text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export function getRuntimeConfig() {
  return { model, baseUrl };
}
