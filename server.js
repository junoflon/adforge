require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Claude API proxy ---
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

function getClaudeKeys() {
  const keys = [];
  if (process.env.CLAUDE_API_KEY_1) keys.push(process.env.CLAUDE_API_KEY_1);
  if (process.env.CLAUDE_API_KEY_2) keys.push(process.env.CLAUDE_API_KEY_2);
  if (process.env.CLAUDE_API_KEY_3) keys.push(process.env.CLAUDE_API_KEY_3);
  if (keys.length === 0 && process.env.CLAUDE_API_KEY) {
    keys.push(process.env.CLAUDE_API_KEY);
  }
  return keys;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.post('/api/claude', async (req, res) => {
  try {
    const { prompt, max_tokens, system } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const keys = getClaudeKeys();
    if (keys.length === 0) {
      return res.status(500).json({ error: 'No Claude API keys configured' });
    }

    const body = {
      model: CLAUDE_MODEL,
      max_tokens: max_tokens || 1024,
      messages: [{ role: 'user', content: prompt }],
    };
    if (system) {
      body.system = system;
    }

    let lastError = null;
    for (let i = 0; i < keys.length; i++) {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': keys[i],
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.status === 429) {
        console.log(`[Claude] key#${i + 1} rate limited, trying next...`);
        lastError = data;
        if (i < keys.length - 1) await sleep(2000);
        continue;
      }

      const tokensUsed = data.usage ? data.usage.input_tokens + data.usage.output_tokens : 0;
      console.log(`[Claude] key#${i + 1}, tokens: ${tokensUsed}, status: ${response.status}`);

      return res.status(response.status).json(data);
    }

    console.log('[Claude] All keys exhausted (rate limited)');
    return res.status(429).json(lastError || { error: 'All API keys rate limited' });
  } catch (err) {
    console.error('[Claude] Error:', err.message);
    res.status(500).json({ error: 'Claude API request failed' });
  }
});

app.post('/api/foreplay-proxy', async (req, res) => {
  try {
    const { endpoint, params, apiKey } = req.body;
    const key = process.env.FOREPLAY_API_KEY || apiKey;

    if (!key) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const url = new URL(`https://public.api.foreplay.co${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.append(k, v);
      });
    }

    console.log('[Proxy]', url.toString());
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: key },
    });

    console.log('[Proxy] status:', response.status);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
