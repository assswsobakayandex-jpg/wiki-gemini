export default async function handler(request) {
  // Простой ответ на любой запрос
  return new Response(JSON.stringify({
    status: "ok",
    message: "Proxy works!",
    url: request.url
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export const config = {
  runtime: "nodejs"
};
