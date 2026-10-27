
const express = require("express");

const app = express();
app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";

app.get("/", (_req, res) => {
  res.json({ status: "online", app: "Imperio AI API" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(503).json({
        error: "O servidor ainda não tem a chave do OpenRouter configurada."
      });
    }

    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return res.status(400).json({ error: "Envie uma lista válida de mensagens." });
    }

    const safeMessages = messages
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 4000)
      }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return res.status(400).json({ error: "A última mensagem deve ser do usuário." });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "Imperio AI"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Você é o Império AI, um assistente útil, claro e respeitoso. Não afirme que realizou ações que não realizou."
          },
          ...safeMessages
        ],
        max_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro do provedor:", response.status);
      return res.status(502).json({ error: "O provedor de IA não conseguiu responder. Verifique o modelo e os créditos." });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string") {
      return res.status(502).json({ error: "O provedor não retornou uma resposta válida." });
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Falha na solicitação de chat:", error.message);
    return res.status(500).json({ error: "Erro interno ao processar a mensagem." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Imperio AI API iniciado na porta ${PORT}`);
});
