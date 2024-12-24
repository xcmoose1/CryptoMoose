const express = require('express');
const router = express.Router();
const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;

router.get('/timeseries', async (req, res) => {
    try {
        const { symbol, interval } = req.query;
        
        // Convert interval to Yahoo Finance format
        const yahooInterval = interval === 'daily' ? '1d' : '60m';
        
        // Get data from Yahoo Finance
        const result = await yahooFinance.historical(symbol, {
            period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            period2: new Date(),
            interval: yahooInterval
        });

        // Format data to match our frontend expectations
        const formattedData = {
            'Time Series (60min)': result.reduce((acc, item) => {
                acc[item.date.toISOString()] = {
                    '1. open': item.open.toString(),
                    '2. high': item.high.toString(),
                    '3. low': item.low.toString(),
                    '4. close': item.close.toString(),
                    '5. volume': item.volume.toString()
                };
                return acc;
            }, {})
        };

        // Add CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        res.json(formattedData);
    } catch (error) {
        console.error('Yahoo Finance API Error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Yahoo Finance' });
    }
});

module.exports = router;
