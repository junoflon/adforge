require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: key },
    });

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
