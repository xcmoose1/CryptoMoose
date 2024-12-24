import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();
const MEXC_API_BASE = 'https://api.mexc.com/api/v3';

// Helper function to handle MEXC API calls
async function fetchMEXCData(endpoint, params = {}) {
    try {
        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        
        const url = `${MEXC_API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;
        console.log('Fetching MEXC data from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`MEXC API responded with status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('MEXC API Error:', error);
        throw error;
    }
}

// Get klines (candlestick) data
router.get('/klines', async (req, res) => {
    try {
        const { symbol, interval } = req.query;
        const klines = await fetchMEXCData('/klines', {
            symbol,
            interval,
            limit: 500
        });

        res.header('Access-Control-Allow-Origin', '*');
        res.json(klines);
    } catch (error) {
        console.error('Error fetching klines:', error);
        res.status(500).json({ 
            error: 'Failed to fetch klines from MEXC',
            details: error.message
        });
    }
});

// Get 24hr ticker price change statistics
router.get('/ticker/24hr', async (req, res) => {
    try {
        const { symbol } = req.query;
        const endpoint = '/ticker/24hr';
        const params = symbol ? { symbol } : {};
        
        const data = await fetchMEXCData(endpoint, params);
        res.header('Access-Control-Allow-Origin', '*');
        res.json(data);
    } catch (error) {
        console.error('Error fetching 24hr ticker:', error);
        res.status(500).json({ 
            error: 'Failed to fetch 24hr ticker from MEXC',
            details: error.message
        });
    }
});

export default router;
