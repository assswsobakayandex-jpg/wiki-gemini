import { Buffer } from "node:buffer";

// CORS headers - разрешаем ваш сайт
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const handleOPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
};

const fixCors = ({ headers, status, statusText }) => {
  headers = new Headers(headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return { headers, status, statusText };
};

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return handleOPTIONS();
    }
    
    const errHandler = (err) => {
      console.error(err);
      return new Response(err.message, fixCors({ status: err.status ?? 500 }));
    };
    
    try {
      const auth = request.headers.get("Authorization");
      const apiKey = auth?.split(" ")[1];
      
      const { pathname } = new URL(request.url);
      
      // Проверяем путь - должен быть /v1/chat/completions
      if (pathname !== "/v1/chat/completions") {
        throw new HttpError("Not Found", 404);
      }
      
      if (request.method !== "POST") {
        throw new HttpError("Method not allowed", 405);
      }
      
      const body = await request.json();
      
      // Отправляем запрос к Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: body.messages.map(msg => ({
              role: msg.role === "assistant" ? "model" : msg.role,
              parts: [{ text: msg.content }]
            }))
          })
        }
      );
      
      const data = await response.json();
      
      // Преобразуем ответ в OpenAI формат
      const openAIResponse = {
        id: "chatcmpl-" + Math.random().toString(36).substring(2, 15),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gemini-1.5-flash",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: data.candidates[0].content.parts[0].text
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
      return new Response(JSON.stringify(openAIResponse), fixCors({
        headers: { "Content-Type": "application/json" },
        status: 200
      }));
      
    } catch (err) {
      return errHandler(err);
    }
  }
};
