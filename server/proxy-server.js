const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3001;

app.use(cors());

// Proxy endpoint for MEXC API
app.get('/api/mexc/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const queryString = new URLSearchParams(req.query).toString();
        const url = `https://api.mexc.com/api/v3/${endpoint}?${queryString}`;
        
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: 'Failed to fetch data from MEXC' });
    }
});

app.listen(port, () => {
    console.log(`Proxy server running on http://localhost:${port}`);
});
