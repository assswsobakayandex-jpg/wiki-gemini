// src/worker.mjs - ИСПРАВЛЕННАЯ ВЕРСИЯ ДЛЯ VERCEL

export default {
  async fetch(request) {
    // --- 1. Обработка CORS preflight (OPTIONS) ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // --- 2. Разрешаем только POST запросы ---
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
          },
        }
      );
    }

    // --- 3. Проверяем правильность пути API ---
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/v1/chat/completions")) {
      return new Response(
        JSON.stringify({ error: "Not found. Use /v1/chat/completions" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
          },
        }
      );
    }

    // --- 4. Основная логика ---
    try {
      // БЕЗОПАСНО получаем API ключ из заголовка Authorization
      const headers = {};
      request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      const authHeader = headers["authorization"];
      const apiKey = authHeader?.split(" ")[1];

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "No API key provided in Authorization header" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
            },
          }
        );
      }

      // Получаем тело запроса от вашего сайта
      const clientRequest = await request.json();
      if (!clientRequest.messages || !Array.isArray(clientRequest.messages)) {
        throw new Error("Invalid request body. 'messages' array is required.");
      }

      // Преобразуем запрос в формат, понятный Gemini API
      const geminiRequestBody = {
        contents: clientRequest.messages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.content }],
        })),
      };

      // Отправляем запрос к настоящему Gemini API
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiRequestBody),
        }
      );

      const geminiData = await geminiResponse.json();

      // Проверяем, не вернул ли Gemini ошибку
      if (!geminiResponse.ok) {
        console.error("Gemini API error:", geminiData);
        return new Response(
          JSON.stringify({
            error: "Gemini API error",
            details: geminiData.error?.message || "Unknown error",
          }),
          {
            status: geminiResponse.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
            },
          }
        );
      }

      // Извлекаем текст ответа от Gemini
      const geminiText =
        geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!geminiText) {
        throw new Error("Invalid or empty response from Gemini");
      }

      // Формируем ответ в формате, который ожидает ваш сайт (OpenAI Compatible)
      const openAIFormattedResponse = {
        id: "chatcmpl-" + Math.random().toString(36).substring(2, 15),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gemini-1.5-flash",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: geminiText,
            },
            finish_reason: "stop",
          },
        ],
      };

      // Возвращаем успешный ответ на ваш сайт
      return new Response(JSON.stringify(openAIFormattedResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
        },
      });
    } catch (error) {
      // Ловим и возвращаем любые внутренние ошибки
      console.error("Proxy internal error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://ru.wiki-md.com",
          },
        }
      );
    }
  },
};
