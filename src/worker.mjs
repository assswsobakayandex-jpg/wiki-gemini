export default {
  async fetch(request) {
    // Простой ответ на любой запрос для теста
    return new Response(JSON.stringify({ 
      status: "ok", 
      message: "Proxy is working!",
      url: request.url 
    }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://ru.wiki-md.com"
      }
    });
  }
};
