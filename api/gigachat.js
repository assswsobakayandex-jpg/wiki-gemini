// api/gigachat.js — исправленная версия
let gigaToken = null;
let tokenExpiry = 0;

// Простая генерация UUID для Vercel
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function getGigaChatToken(clientSecret) {
  const now = Date.now();
  if (gigaToken && now < tokenExpiry) {
    return gigaToken;
  }
  
  try {
    const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': generateUUID(),
        'Authorization': `Basic ${clientSecret}`
      },
      body: 'scope=GIGACHAT_API_PERS'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    gigaToken = data.access_token;
    tokenExpiry = now + (data.expires_at || 30 * 60 * 1000);
    return gigaToken;
  } catch (error) {
    console.error('Ошибка получения токена:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  // CORS
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
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Неверный формат запроса' });
    }
    
    const clientSecret = 'MDE5ZDBhYzItNGQ5MS03ZWQ3LTk0ZDAtMDE5MmNiYjFkZGMwOjVmNmYxNmIzLWVlZmQtNDFjNC1hYjdiLTAyYzUxOWY4NzA3MQ==';
    
    const token = await getGigaChatToken(clientSecret);
    
    console.log('Токен получен, отправляем запрос к GigaChat...');
    
    const gigachatResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: 'GigaChat-2-Lite',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      })
    });
    
    const data = await gigachatResponse.json();
    
    if (!gigachatResponse.ok) {
      console.error('GigaChat error:', data);
      return res.status(gigachatResponse.status).json({
        error: 'Ошибка GigaChat API',
        details: data
      });
    }
    
    res.json({
      choices: [{
        message: {
          content: data.choices[0].message.content
        }
      }]
    });
    
  } catch (error) {
    console.error('Ошибка в прокси GigaChat:', error);
    res.status(500).json({ error: error.message });
  }
};
