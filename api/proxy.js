module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://ru.wiki-md.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Читаем тело запроса
    let body = '';
    req.on('data', chunk => { body += chunk; });
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });

    const { messages } = JSON.parse(body);
    const apiKey = req.headers.authorization?.split(' ')[1];

    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    // Сначала получаем список доступных моделей
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const modelsData = await modelsResponse.json();
    
    // Ищем модель, которая поддерживает generateContent
    const validModel = modelsData.models.find(m => 
      m.name.includes('gemini') && 
      m.supportedGenerationMethods?.includes('generateContent')
    );

    if (!validModel) {
      return res.status(500).json({ 
        error: 'No suitable Gemini model found',
        availableModels: modelsData.models.map(m => m.name)
      });
    }

    console.log('Using model:', validModel.name);

    // Отправляем запрос к найденной модели
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${validModel.name}:generateContent?key=${apiKey}`,
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

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Gemini API error',
        details: data.error?.message || 'Unknown error'
      });
    }

    const result = {
      id: 'chatcmpl-' + Math.random().toString(36).substring(2, 15),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: validModel.name,
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
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
};
