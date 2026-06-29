const messagesEl = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const promptInput = document.querySelector("#promptInput");
const sendButton = document.querySelector("#sendButton");
const concludeButton = document.querySelector("#concludeButton");
const newChat = document.querySelector("#newChat");

let history = [];

function addMessage(role, content) {
  const article = document.createElement("article");
  article.className = `message ${role}-message`;

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "You" : role === "system" ? "Notice" : "Grill Me";

  article.append(label);
  renderMessageContent(article, content);

  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderMessageContent(container, content) {
  let list = null;

  for (const block of String(content).split(/\n+/)) {
    const line = block.trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      list = null;
      const heading = document.createElement("h2");
      heading.textContent = line.slice(2).trim();
      container.append(heading);
      continue;
    }

    if (line.startsWith("## ")) {
      list = null;
      const heading = document.createElement("h3");
      heading.textContent = line.slice(3).trim();
      container.append(heading);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!list) {
        list = document.createElement("ul");
        container.append(list);
      }
      const item = document.createElement("li");
      item.textContent = line.slice(2).trim();
      list.append(item);
      continue;
    }

    list = null;
    const p = document.createElement("p");
    p.textContent = line;
    container.append(p);
  }
}

function autoresize() {
  promptInput.style.height = "auto";
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`;
}

function setLoading(loading) {
  sendButton.disabled = loading;
  concludeButton.disabled = loading || !history.some((message) => message.role === "user");
  promptInput.disabled = loading;
  sendButton.textContent = loading ? "Thinking" : "Send";
}

async function sendPrompt(content) {
  const userMessage = { role: "user", content };
  history.push(userMessage);
  addMessage("user", content);
  setLoading(true);

  try {
    const response = await fetch("/api/grill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");

    const assistantMessage = { role: "assistant", content: data.text };
    history.push(assistantMessage);
    addMessage("assistant", data.text);
  } catch (error) {
    history.pop();
    addMessage("system", error.message || "Something went wrong.");
  } finally {
    setLoading(false);
    promptInput.focus();
  }
}

async function concludeConversation() {
  if (!history.some((message) => message.role === "user")) return;

  setLoading(true);
  concludeButton.textContent = "Summarizing";

  try {
    const response = await fetch("/api/conclude", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");

    const assistantMessage = { role: "assistant", content: data.text };
    history.push(assistantMessage);
    addMessage("assistant", data.text);
  } catch (error) {
    addMessage("system", error.message || "Something went wrong.");
  } finally {
    concludeButton.textContent = "End & summarize";
    setLoading(false);
    promptInput.focus();
  }
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = promptInput.value.trim();
  if (!content) return;

  promptInput.value = "";
  autoresize();
  sendPrompt(content);
});

promptInput.addEventListener("input", autoresize);
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

newChat.addEventListener("click", () => {
  history = [];
  messagesEl.innerHTML = "";
  addMessage("assistant", "Drop the plan you want tested. I’ll ask one question at a time and include my recommended answer.");
  setLoading(false);
  promptInput.focus();
});

concludeButton.addEventListener("click", concludeConversation);

autoresize();
setLoading(false);
