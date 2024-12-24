import express from 'express';
import yahooFinance from 'yahoo-finance2';

const router = express.Router();

// Convert interval to Yahoo Finance format
function getYahooInterval(interval) {
    switch (interval) {
        case '1m': return '1m';
        case '5m': return '5m';
        case '15m': return '15m';
        case '30m': return '30m';
        case '1h': return '1h';
        case '4h': return '1d';  // Use daily data for 4h
        case '1d': return '1d';
        default: return '1d';
    }
}

router.get('/timeseries', async (req, res) => {
    try {
        const { symbol, interval } = req.query;
        const yahooInterval = getYahooInterval(interval);
        
        // Calculate time range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);  // Get 30 days of data
        
        console.log(`Fetching data for ${symbol} with interval ${yahooInterval}`);
        console.log('Date range:', { startDate, endDate });

        // Get data from Yahoo Finance
        const result = await yahooFinance.historical(symbol, {
            interval: yahooInterval,
            start: startDate,
            end: endDate,
            events: 'history',
            timezone: 'America/New_York'  // Use a specific timezone
        });

        if (!result || result.length === 0) {
            throw new Error('No data returned from Yahoo Finance');
        }

        console.log(`Got ${result.length} data points for ${symbol}`);

        // Format data to match our frontend expectations
        const formattedData = result.map(item => ({
            time: Math.floor(new Date(item.date).getTime() / 1000),
            value: item.adjClose || item.close
        }));

        // Add CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        res.json(formattedData);
    } catch (error) {
        console.error('Yahoo Finance API Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch data from Yahoo Finance',
            details: error.message,
            symbol: req.query.symbol,
            interval: req.query.interval
        });
    }
});

export default router;
