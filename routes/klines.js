import express from 'express';
import axios from 'axios';

const router = express.Router();

// Get klines data
router.get('/', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        console.log('Received request with params:', { symbol, interval, limit });

        // Map timeframe if needed
        const mappedInterval = mapTimeframe(interval);
        console.log('Mapped interval:', { original: interval, mapped: mappedInterval });

        // Construct URL
        const url = `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${mappedInterval}&limit=${limit || 100}`;
        console.log('Fetching from MEXC:', url);

        const response = await axios.get(url);
        console.log(`Successfully fetched ${response.data.length} klines from MEXC`);

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching klines:', error);
        res.status(500).json({ error: 'Failed to fetch klines data' });
    }
});

// Helper function to map timeframes
function mapTimeframe(interval) {
    const mappings = {
        '1m': '1m',
        '3m': '3m',
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1h': '1h',
        '2h': '2h',
        '4h': '4h',
        '6h': '6h',
        '8h': '8h',
        '12h': '12h',
        '1d': '1d',
        '3d': '3d',
        '1w': '1w',
        '1M': '1M'
    };

    return mappings[interval] || interval;
}

export default router;
