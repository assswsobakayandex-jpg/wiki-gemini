import { Buffer } from "node:buffer";

export default {
  async fetch(request) {
    // 1. Обработка OPTIONS (preflight) для CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }

    // 2. Разрешаем только POST запросы
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      // 3. БЕЗОПАСНО получаем API ключ (работает в любом окружении)
      const headers = {};
      request.headers.forEach((value, key) => { headers[key] = value; });
      const authHeader = headers["authorization"];
      const apiKey = authHeader?.split(" ")[1];

      if (!apiKey) {
        return new Response(JSON.stringify({ error: "No API key provided" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 4. Получаем и проверяем тело запроса
      const body = await request.json();
      if (!body.messages || !Array.isArray(body.messages)) {
        throw new Error("Invalid request body");
      }

      // 5. Формируем запрос к Gemini API
      const geminiBody = {
        contents: body.messages.map(msg => ({
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.content }]
        }))
      };

      // 6. Отправляем запрос к Google
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody)
        }
      );

      const geminiData = await geminiResponse.json();

      // 7. Проверяем ответ от Google
      if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Unexpected Gemini response:", geminiData);
        throw new Error("Invalid response from Gemini");
      }

      // 8. Преобразуем в формат OpenAI и возвращаем с CORS-заголовками
      const openAIResponse = {
        id: "chatcmpl-" + Math.random().toString(36).substring(2, 15),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gemini-1.5-flash",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: geminiData.candidates[0].content.parts[0].text
          },
          finish_reason: "stop"
        }]
      };

      return new Response(JSON.stringify(openAIResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://ru.wiki-md.com"
        }
      });

    } catch (error) {
      // 9. Подробная ошибка для отладки
      console.error("Proxy Error:", error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://ru.wiki-md.com"
        }
      });
    }
  }
};
