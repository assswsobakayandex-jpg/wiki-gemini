// Рабочая версия для Node.js на Vercel
module.exports = async (req, res) => {
  // Устанавливаем CORS-заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Отвечаем на preflight OPTIONS запрос
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Простой JSON-ответ для проверки
  res.status(200).json({
    status: 'ok',
    message: 'Proxy is working!',
    url: req.url,
    method: req.method
  });
};
