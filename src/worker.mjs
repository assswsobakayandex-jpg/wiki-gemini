export default {
  async fetch(request) {
    // Простой ответ на любой запрос
    return new Response(JSON.stringify({
      message: "Proxy is alive!",
      url: request.url,
      method: request.method
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
