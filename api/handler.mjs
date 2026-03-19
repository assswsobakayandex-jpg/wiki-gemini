// Минимальный рабочий обработчик для Vercel
module.exports = async (req, res) => {
  // Устанавливаем CORS-заголовки для вашего сайта
  res.setHeader('Access-Control-Allow-Origin', 'https://ru.wiki-md.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Обработка OPTIONS-запроса (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен. Используйте POST.' });
  }

  try {
    // Получаем данные из тела запроса
    const { messages } = req.body;
    const apiKey = req.headers.authorization?.split(' ')[1];

    // Проверяем наличие API-ключа
    if (!apiKey) {
      return res.status(401).json({ error: 'API ключ не предоставлен' });
    }

    // Проверяем наличие сообщений
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Неверный формат запроса: ожидается массив messages' });
    }

    // Формируем запрос к Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

    // Получаем ответ от Gemini
    const geminiData = await geminiResponse.json();

    // Проверяем, не вернул ли Gemini ошибку
    if (!geminiResponse.ok) {
      console.error('Ошибка Gemini API:', geminiData);
      return res.status(geminiResponse.status).json({
        error: 'Ошибка Gemini API',
        details: geminiData.error?.message || 'Неизвестная ошибка'
      });
    }

    // Проверяем структуру ответа от Gemini
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Неожиданный ответ от Gemini:', geminiData);
      return res.status(500).json({ error: 'Неверный формат ответа от Gemini' });
    }

    // Возвращаем успешный ответ в формате, понятном вашему скрипту
    res.json({
      choices: [{
        message: {
          content: geminiData.candidates[0].content.parts[0].text
        }
      }]
    });

  } catch (error) {
    // Логируем ошибку и возвращаем её клиенту
    console.error('Ошибка в прокси:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера', 
      message: error.message 
    });
  }
};
