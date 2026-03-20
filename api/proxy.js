// api/proxy.js — версия с задержкой между запросами
let lastRequestTime = 0;
const MIN_INTERVAL = 4000; // 4 секунды между запросами к Google

module.exports = async (req, res) => {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', 'https://ru.wiki-md.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен. Используйте POST.' });
  }

  try {
    const { messages } = req.body;
    const apiKey = req.headers.authorization?.split(' ')[1];

    if (!apiKey) {
      return res.status(401).json({ error: 'API ключ не предоставлен' });
    }

    // ЗАДЕРЖКА МЕЖДУ ЗАПРОСАМИ
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_INTERVAL) {
      const waitTime = MIN_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ Ждём ${waitTime}мс перед следующим запросом...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();

    // Запрос к Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-001:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(msg => ({
            parts: [{ text: msg.content }]
          }))
        })
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Ошибка Gemini:', geminiData);
      return res.status(geminiResponse.status).json({
        error: 'Ошибка Gemini API',
        details: geminiData.error?.message
      });
    }

    res.json({
      choices: [{
        message: {
          content: geminiData.candidates[0].content.parts[0].text
        }
      }]
    });

  } catch (error) {
    console.error('Ошибка в прокси:', error);
    res.status(500).json({ error: error.message });
  }
};
