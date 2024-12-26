import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import morgan from 'morgan';
import fetch from 'node-fetch';

// Import routes
import mexcRoutes from './routes/mexc.js';
import marketRoutes from './routes/market.js';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 8001;  // Set specific port

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Routes
app.use('/api/market', marketRoutes);
app.use('/api/mexc', mexcRoutes);

// Proxy endpoint for CoinGecko API
app.get('/api/crypto/market-chart/:coin', async (req, res) => {
    try {
        const { coin } = req.params;
        const { days = 30, interval = 'daily' } = req.query;
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        details: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
