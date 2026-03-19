module.exports = async (req, res) => {
  // Устанавливаем CORS-заголовки для вашего сайта
  res.setHeader('Access-Control-Allow-Origin', 'https://ru.wiki-md.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Обработка OPTIONS-запроса (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Разрешаем только POST-запросы для API
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен. Используйте POST.' });
  }

  try {
    const { messages } = req.body;
    const apiKey = req.headers.authorization?.split(' ')[1];

    if (!apiKey) {
      return res.status(401).json({ error: 'API ключ не предоставлен' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Неверный формат запроса' });
    }

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
