import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request) {
    // OPTIONS запросы
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Только POST для API
    if (request.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders
      });
    }

    // Проверяем путь
    const url = new URL(request.url);
    if (!url.pathname.includes("/v1/chat/completions")) {
      return new Response("Not found", { 
        status: 404,
        headers: corsHeaders
      });
    }

    try {
      // ИСПРАВЛЕНО: получаем заголовки через request.headers (объект)
      const authHeader = request.headers.get 
        ? request.headers.get("Authorization")
        : request.headers["authorization"]; // для Vercel

      const apiKey = authHeader?.split(" ")[1];

      if (!apiKey) {
        throw new Error("No API key provided");
      }

      // Получаем тело запроса
      const body = await request.json();
      
      console.log("Получен запрос. API Key:", apiKey.substring(0, 10) + "...");

      // Отправляем в Gemini
      const geminiBody = {
        contents: body.messages.map(msg => ({
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.content }]
        }))
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geminiBody)
        }
      );

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        console.error("Странный ответ от Gemini:", data);
        throw new Error("Нет ответа от Gemini");
      }

      // Преобразуем в OpenAI формат
      const result = {
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
        }]
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error("Ошибка в прокси:", error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};
