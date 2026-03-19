import { Buffer } from "node:buffer";

export default {
  async fetch(request) {
    // Обработка OPTIONS (preflight)
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

    // Только POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Получаем API ключ из заголовка - БЕЗОПАСНЫЙ СПОСОБ
      const authHeader = request.headers.get 
        ? request.headers.get("Authorization") 
        : request.headers.authorization;
      
      const apiKey = authHeader?.split(" ")[1];
      
      if (!apiKey) {
        throw new Error("No API key");
      }

      const body = await request.json();
      
      // Отправляем в Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: body.messages.map(msg => ({
              role: msg.role === "assistant" ? "model" : msg.role,
              parts: [{ text: msg.content }]
            }))
          })
        }
      );

      const data = await response.json();

      return new Response(JSON.stringify({
        id: "chatcmpl-" + Math.random().toString(36).substring(2),
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
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://ru.wiki-md.com"
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://ru.wiki-md.com"
        }
      });
    }
  }
};
