exports.handler = async function(event) {
  // Handle CORS preflight
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Parse incoming prompt
    let prompt;
    try {
      const body = JSON.parse(event.body);
      prompt = body.prompt;
    } catch(e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
    }

    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No prompt provided' }) };
    }

    // Check API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    // Get raw text first to debug if JSON parse fails
    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch(e) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Invalid response from AI: ' + rawText.slice(0, 200) })
      };
    }

    if (data.error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: data.error.message || JSON.stringify(data.error) })
      };
    }

    if (!data.content || !data.content.length) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Empty response from AI' })
      };
    }

    const text = data.content.map(i => i.text || '').join('');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Unknown server error' })
    };
  }
};
