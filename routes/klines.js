import express from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { 
    HTX_CONFIG,
    HTX_INTERVALS,
    formatSymbol,
    formatKlineData
} from '../js/config/htx-config.js';

const router = express.Router();

const ERROR_CODES = {
    INVALID_SYMBOL: 2002,
    INVALID_PARAMETER: 2000,
    RATE_LIMIT: 429,
    SERVER_ERROR: 500
};

// Rate limiter middleware
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100, // HTX allows more requests per minute
    message: {
        code: ERROR_CODES.RATE_LIMIT,
        msg: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

router.use(apiLimiter);

function sendResponse(res, data, status = 200) {
    res.status(status).json({
        code: status,
        msg: status === 200 ? 'success' : 'error',
        data: data
    });
}

// Request validation middleware
function validateRequest(req, res, next) {
    const { symbol, interval } = req.query;
    
    try {
        if (!symbol) {
            return res.status(400).json({ 
                code: ERROR_CODES.INVALID_PARAMETER,
                msg: 'Symbol parameter is required'
            });
        }

        // Format and validate symbol
        const htxSymbol = formatSymbol(symbol);
        if (!/^[A-Z0-9-]+$/.test(htxSymbol)) {
            return res.status(400).json({
                code: ERROR_CODES.INVALID_SYMBOL,
                msg: 'Invalid symbol format'
            });
        }

        // Validate and map interval
        let mappedInterval;
        try {
            mappedInterval = validateAndMapInterval(interval);
        } catch (error) {
            return res.status(400).json({
                code: ERROR_CODES.INVALID_PARAMETER,
                msg: error.message
            });
        }

        req.validatedParams = {
            symbol: htxSymbol,
            interval: mappedInterval,
            size: parseInt(req.query.limit) || 100
        };

        next();
    } catch (error) {
        return res.status(400).json({
            code: ERROR_CODES.INVALID_PARAMETER,
            msg: error.message
        });
    }
}

// Validate and map interval
function validateAndMapInterval(interval) {
    if (!interval) {
        return HTX_INTERVALS.ONE_MINUTE;
    }

    // Map common intervals to HTX format
    const intervalMap = {
        '1m': HTX_INTERVALS.ONE_MINUTE,
        '3m': HTX_INTERVALS.THREE_MINUTES,
        '5m': HTX_INTERVALS.FIVE_MINUTES,
        '15m': HTX_INTERVALS.FIFTEEN_MINUTES,
        '30m': HTX_INTERVALS.THIRTY_MINUTES,
        '1h': HTX_INTERVALS.ONE_HOUR,
        '2h': HTX_INTERVALS.TWO_HOURS,
        '4h': HTX_INTERVALS.FOUR_HOURS,
        '6h': HTX_INTERVALS.SIX_HOURS,
        '12h': HTX_INTERVALS.TWELVE_HOURS,
        '1d': HTX_INTERVALS.ONE_DAY,
        '1w': HTX_INTERVALS.ONE_WEEK,
        '1M': HTX_INTERVALS.ONE_MONTH
    };

    const mappedInterval = intervalMap[interval];
    if (!mappedInterval) {
        throw new Error('Invalid interval. Supported intervals: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d, 1w, 1M');
    }

    return mappedInterval;
}

async function fetchKlineData(symbol, interval, size = 1000) {
    try {
        const response = await axios.get(`${HTX_CONFIG.FALLBACK_URL}/market/history/kline`, {
            params: {
                symbol: symbol.toLowerCase(),
                period: interval,
                size: size
            },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.data || !Array.isArray(response.data.data)) {
            throw new Error('Invalid response format from HTX API');
        }

        return response.data.data;
    } catch (error) {
        console.error('HTX API Error:', {
            endpoint: '/market/history/kline',
            params: { symbol, interval, size },
            error: error.message,
            response: error?.response?.data
        });
        throw error;
    }
}

// Get klines data
router.get('/', validateRequest, async (req, res) => {
    try {
        const { symbol, interval, size } = req.validatedParams;
        console.log('Requesting HTX klines with:', { symbol, interval, size });
        
        const data = await fetchKlineData(symbol, interval, size);
        sendResponse(res, data);
    } catch (error) {
        console.error('Klines API Error:', error);
        sendResponse(res, {
            error: error.response?.data?.['err-msg'] || error.message,
            code: error.response?.status || ERROR_CODES.SERVER_ERROR
        }, 500);
    }
});

// Get exchange info
router.get('/exchangeInfo', async (req, res) => {
    try {
        const response = await axios.get('https://api.mexc.com/api/v3/exchangeInfo');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching exchange info:', error);
        res.status(500).json({ error: 'Failed to fetch exchange info' });
    }
});

// Get 24hr ticker
router.get('/ticker/24hr', async (req, res) => {
    try {
        const { symbol } = req.query;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol parameter is required' });
        }
        
        const response = await axios.get(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching 24hr ticker:', error);
        res.status(500).json({ error: 'Failed to fetch 24hr ticker data' });
    }
});

// Get latest price
router.get('/ticker/price', async (req, res) => {
    try {
        const { symbol } = req.query;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol parameter is required' });
        }
        
        const response = await axios.get(`https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching price ticker:', error);
        res.status(500).json({ error: 'Failed to fetch price data' });
    }
});

// Get ticker data
router.get('/ticker', async (req, res) => {
    try {
        const { symbol } = req.query;
        if (!symbol) {
            return res.status(400).json({ error: 'Symbol parameter is required' });
        }
        
        const htxSymbol = formatSymbol(symbol);
        const response = await axios.get(`${HTX_CONFIG.BASE_URL}${HTX_CONFIG.ENDPOINTS.TICKER}`, {
            params: { symbol: htxSymbol }
        });
        
        if (response.data.status !== 'ok' || !response.data.tick) {
            throw new Error('Invalid response from HTX API');
        }
        
        const formattedData = formatTickerData(response.data);
        res.json(formattedData);
    } catch (error) {
        console.error('Error fetching ticker:', error);
        res.status(500).json({ 
            error: 'Failed to fetch ticker data',
            details: error.response?.data?.['err-msg'] || error.message
        });
    }
});

// HTX API proxy routes
const HTX_API_URL = 'https://api-aws.huobi.pro';

// Helper function to make API requests
async function makeHuobiRequest(endpoint, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = `${HTX_API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Origin': 'https://www.huobi.com',
                'Referer': 'https://www.huobi.com/'
            }
        });

        if (!response.data) {
            throw new Error('Invalid response from Huobi API');
        }

        return response.data;
    } catch (error) {
        console.error('Huobi API request failed:', error);
        throw error;
    }
}

// Get server time
router.get('/htx/time', async (req, res) => {
    try {
        const data = await makeHuobiRequest('/v1/common/timestamp');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get klines data
router.get('/htx/klines', async (req, res) => {
    try {
        const { symbol, period, size } = req.query;
        const data = await makeHuobiRequest('/market/history/kline', {
            symbol: symbol?.toLowerCase(),
            period,
            size
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get ticker data
router.get('/htx/ticker', async (req, res) => {
    try {
        const { symbol } = req.query;
        const data = await makeHuobiRequest('/market/detail/merged', {
            symbol: symbol?.toLowerCase()
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get market depth
router.get('/htx/depth', async (req, res) => {
    try {
        const { symbol, type } = req.query;
        const data = await makeHuobiRequest('/market/depth', {
            symbol: symbol?.toLowerCase(),
            type
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent trades
router.get('/htx/trades', async (req, res) => {
    try {
        const { symbol, size } = req.query;
        const data = await makeHuobiRequest('/market/history/trade', {
            symbol: symbol?.toLowerCase(),
            size
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for HTX klines
router.get('/market/history/kline', async (req, res) => {
    try {
        const { symbol, period, size } = req.query;
        const response = await axios.get('https://api.htx.com/market/history/kline', {
            params: {
                symbol,
                period,
                size
            },
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching klines:', error.message);
        res.status(500).json({ 
            status: 'error',
            message: error.message 
        });
    }
});

// Proxy endpoint for HTX timestamp
router.get('/timestamp', async (req, res) => {
    try {
        const response = await axios.get('https://api.htx.com/v1/common/timestamp');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching timestamp:', error.message);
        res.status(500).json({ 
            status: 'error',
            message: error.message 
        });
    }
});

export default router;
