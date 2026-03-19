module.exports = async (req, res) => {
  // Устанавливаем CORS-заголовки для вашего сайта
  res.setHeader('Access-Control-Allow-Origin', 'https://ru.wiki-md.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Отвечаем на preflight OPTIONS запрос
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const apiKey = req.headers.authorization?.split(' ')[1];

    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    console.log('Sending to Gemini:', JSON.stringify({ messages }));

    // Отправляем запрос к Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
          }))
        })
      }
    );

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data));

    // Проверяем, не вернул ли Gemini ошибку
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Gemini API error',
        details: data.error?.message || 'Unknown error'
      });
    }

    // Проверяем структуру ответа
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response structure:', data);
      return res.status(500).json({
        error: 'Invalid response from Gemini',
        details: data
      });
    }

    // Преобразуем в формат OpenAI
    const result = {
      id: 'chatcmpl-' + Math.random().toString(36).substring(2, 15),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gemini-1.5-flash',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.candidates[0].content.parts[0].text
        },
        finish_reason: 'stop'
      }]
    };

    res.json(result);

  } catch (error) {
    console.error('Proxy internal error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
};
