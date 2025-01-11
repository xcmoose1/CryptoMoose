import express from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { TechnicalIndicators } from '../utils/technical-indicators.js';
import { HTX_CONFIG } from '../js/config/htx-config.js';

const router = express.Router();

// Constants
const VALID_INTERVALS = {
    '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
};

const ERROR_CODES = {
    INVALID_SYMBOL: -1121,
    INVALID_PARAMETER: -1100,
    RATE_LIMIT: -1003,
    SERVER_ERROR: -1001,
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATA_ERROR: 'DATA_ERROR'
};

// Rate limiter middleware
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // Increased for development
    message: {
        code: ERROR_CODES.RATE_LIMIT,
        msg: 'error',
        data: {
            error: 'Too many requests',
            details: 'Please try again later'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiter to all routes
router.use(apiLimiter);

// Standard response format
function sendResponse(res, data, status = 200) {
    res.status(status).json({
        code: status,
        msg: status === 200 ? 'success' : 'error',
        data: data
    });
}

// Request validation middleware
function validateIndicatorRequest(req, res, next) {
    const { symbol, interval } = req.query;
    
    if (!symbol || !interval) {
        return res.status(400).json({
            code: ERROR_CODES.VALIDATION_ERROR,
            msg: 'error',
            data: {
                error: 'Missing required parameters',
                details: 'Both symbol and interval are required'
            }
        });
    }

    const validIntervals = ['1h', '4h', '1d', '1w'];
    if (!validIntervals.includes(interval)) {
        return res.status(400).json({
            code: ERROR_CODES.VALIDATION_ERROR,
            msg: 'error',
            data: {
                error: 'Invalid interval',
                details: `Interval must be one of: ${validIntervals.join(', ')}`
            }
        });
    }

    req.validatedParams = { symbol: symbol.toUpperCase(), interval };
    next();
}

// Helper function to format indicator values
function formatIndicatorValue(indicator, value) {
    switch (indicator) {
        case 'rsi':
            const rsiValue = value[value.length - 1];
            return {
                value: rsiValue,
                signal: getSignal('rsi', rsiValue)
            };
        case 'macd':
            return {
                value: value,
                signal: value.histogram > 0 ? 'Bullish' : 'Bearish'
            };
        case 'bollinger':
            const lastIndex = value.middle.length - 1;
            const bandwidth = ((value.upper[lastIndex] - value.lower[lastIndex]) / 
                             value.middle[lastIndex]) * 100;
            return {
                value: bandwidth,
                signal: getBollingerSignal(value)
            };
        default:
            return {
                value: value,
                signal: 'Neutral'
            };
    }
}

// Helper function to get signal based on indicator value
function getSignal(indicator, value) {
    if (!value) return 'NEUTRAL';
    
    switch (indicator) {
        case 'rsi':
            if (value > 70) return 'BEARISH';
            if (value < 30) return 'BULLISH';
            return 'NEUTRAL';
        
        case 'macd':
            if (!value.histogram) return 'NEUTRAL';
            return value.histogram > 0 ? 'BULLISH' : 'BEARISH';
        
        case 'williamsr':
            if (value > -20) return 'BEARISH';
            if (value < -80) return 'BULLISH';
            return 'NEUTRAL';
        
        case 'mfi':
            if (value > 80) return 'BEARISH';
            if (value < 20) return 'BULLISH';
            return 'NEUTRAL';
        
        default:
            return 'NEUTRAL';
    }
}

function getBollingerSignal(bands) {
    if (!bands || !bands.upper || !bands.lower || !bands.middle) return 'NEUTRAL';
    
    const lastPrice = bands.middle[bands.middle.length - 1];
    const upperBand = bands.upper[bands.upper.length - 1];
    const lowerBand = bands.lower[bands.lower.length - 1];
    
    if (lastPrice > upperBand) return 'BEARISH';
    if (lastPrice < lowerBand) return 'BULLISH';
    return 'NEUTRAL';
}

function getEMASignal(emaShort, emaLong) {
    if (!emaShort || !emaLong) return 'NEUTRAL';
    
    const shortTerm = emaShort.ema8 > emaShort.ema20;
    const longTerm = emaLong.ema50 > emaLong.ema200;
    
    if (shortTerm && longTerm) return 'BULLISH';
    if (!shortTerm && !longTerm) return 'BEARISH';
    return 'NEUTRAL';
}

function getIchimokuSignal(ichimoku) {
    if (!ichimoku || !ichimoku.conversion || !ichimoku.base) return 'NEUTRAL';
    
    const conversionLine = ichimoku.conversion[ichimoku.conversion.length - 1];
    const baseLine = ichimoku.base[ichimoku.base.length - 1];
    
    if (conversionLine > baseLine) return 'BULLISH';
    if (conversionLine < baseLine) return 'BEARISH';
    return 'NEUTRAL';
}

function getFibonacciSignal(fibonacci) {
    if (!fibonacci || !fibonacci.levels) return 'NEUTRAL';
    
    const currentPrice = fibonacci.currentPrice;
    const levels = fibonacci.levels;
    
    if (currentPrice > levels[0.618]) return 'BEARISH';
    if (currentPrice < levels[0.382]) return 'BULLISH';
    return 'NEUTRAL';
}

// Error handler middleware
function handleApiError(error, req, res) {
    console.error('API Error:', error);
    
    let errorResponse = {
        code: 500,
        msg: 'error',
        data: {
            error: 'Failed to process request',
            details: error.message
        }
    };

    if (error.response) {
        // API error response
        errorResponse.data.details = `HTX API Error: ${error.response.status} - ${error.response.data?.['err-msg'] || error.response.statusText}`;
    } else if (error.request) {
        // Network error
        errorResponse.data.details = 'Network error: Unable to reach HTX API';
    }

    res.status(500).json(errorResponse);
}

// Test route
router.get('/test', (req, res) => {
    console.log('Test route hit');
    res.json({ status: 'ok', message: 'Indicators router is working' });
});

// Main indicators endpoint
router.get('/', validateIndicatorRequest, async (req, res) => {
    console.log('Received request for indicators:', req.query);
    try {
        const { symbol, interval } = req.validatedParams;
        console.log('Validated params:', { symbol, interval });
        
        const htxSymbol = symbol.toLowerCase().replace('usdt', 'usdt');  // Ensure lowercase and proper format
        console.log('HTX symbol:', htxSymbol);
        
        // Map intervals to HTX format
        const intervalMap = {
            '1h': '60min',
            '4h': '4hour',
            '1d': '1day',
            '1w': '1week'
        };
        
        const htxInterval = intervalMap[interval] || '60min'; // Default to 1 hour if invalid
        
        console.log('Making request to HTX API with params:', {
            symbol: htxSymbol,
            period: htxInterval,
            size: 500  // Increased from 200 to ensure we have enough data points
        });

        // Fetch klines data from HTX
        const response = await axios.get(`${HTX_CONFIG.BASE_URL}/market/history/kline`, {
            params: { 
                symbol: htxSymbol,
                period: htxInterval,
                size: 500  // Increased from 200 to ensure we have enough data points
            },
            timeout: 5000
        });

        console.log('HTX API Response:', JSON.stringify(response.data, null, 2));

        if (!response.data || !response.data.status || response.data.status !== 'ok' || !Array.isArray(response.data.data)) {
            console.error('Invalid response structure:', response.data);
            throw new Error('Invalid response format from HTX API');
        }

        // HTX returns data in reverse chronological order
        const klines = response.data.data.reverse();
        
        // Validate klines data
        if (!klines.length) {
            throw new Error('No klines data received');
        }

        // Log a sample of the kline data to debug
        console.log('Sample kline data:', klines[0]);

        // Validate and parse klines data with proper error handling
        const closes = [];
        const highs = [];
        const lows = [];
        const volumes = [];

        for (const kline of klines) {
            // Check if kline is an object (new format) or array (old format)
            if (typeof kline === 'object' && !Array.isArray(kline)) {
                // New format - object with named properties
                const close = parseFloat(kline.close);
                const high = parseFloat(kline.high);
                const low = parseFloat(kline.low);
                const volume = parseFloat(kline.vol); // HTX uses 'vol' for volume

                if (!isNaN(close)) closes.push(close);
                if (!isNaN(high)) highs.push(high);
                if (!isNaN(low)) lows.push(low);
                if (!isNaN(volume) && volume > 0) volumes.push(volume);
            } else if (Array.isArray(kline) && kline.length >= 6) {
                // Old format - array format
                const [timestamp, open, high, low, close, volume] = kline;
                
                const parsedClose = parseFloat(close);
                const parsedHigh = parseFloat(high);
                const parsedLow = parseFloat(low);
                const parsedVolume = parseFloat(volume);

                if (!isNaN(parsedClose)) closes.push(parsedClose);
                if (!isNaN(parsedHigh)) highs.push(parsedHigh);
                if (!isNaN(parsedLow)) lows.push(parsedLow);
                if (!isNaN(parsedVolume) && parsedVolume > 0) volumes.push(parsedVolume);
            } else {
                console.warn('Invalid kline format:', kline);
                continue;
            }
        }

        // Validate we have enough data points
        const minRequiredPoints = 20; // Minimum points needed for calculations
        if (closes.length < minRequiredPoints || highs.length < minRequiredPoints || 
            lows.length < minRequiredPoints) {
            throw new Error(`Insufficient data points. Need at least ${minRequiredPoints} valid points. Got: closes=${closes.length}, highs=${highs.length}, lows=${lows.length}`);
        }

        // Log the number of valid data points we got
        console.log('Valid data points:', {
            closes: closes.length,
            highs: highs.length,
            lows: lows.length,
            volumes: volumes.length
        });

        // Create indicators object with proper error handling
        const indicators = {};
        
        try {
            indicators.rsi = {
                value: TechnicalIndicators.calculateRSI(closes),
                signal: getSignal('rsi', TechnicalIndicators.calculateRSI(closes))
            };
        } catch (error) {
            console.error('Error calculating RSI:', error);
            indicators.rsi = { value: null, signal: 'NEUTRAL' };
        }

        try {
            indicators.macd = {
                value: TechnicalIndicators.calculateMACD(closes),
                signal: getSignal('macd', TechnicalIndicators.calculateMACD(closes))
            };
        } catch (error) {
            console.error('Error calculating MACD:', error);
            indicators.macd = { value: null, signal: 'NEUTRAL' };
        }

        try {
            indicators.bollinger = {
                value: TechnicalIndicators.calculateBollingerBands(closes),
                signal: getBollingerSignal(TechnicalIndicators.calculateBollingerBands(closes))
            };
        } catch (error) {
            console.error('Error calculating Bollinger Bands:', error);
            indicators.bollinger = { value: null, signal: 'NEUTRAL' };
        }

        try {
            indicators.atr = {
                value: TechnicalIndicators.calculateATR(highs, lows, closes),
                signal: 'NEUTRAL'
            };
        } catch (error) {
            console.error('Error calculating ATR:', error);
            indicators.atr = { value: null, signal: 'NEUTRAL' };
        }

        try {
            indicators.pivots = {
                value: TechnicalIndicators.calculatePivotPoints(highs[highs.length - 1], lows[lows.length - 1], closes[closes.length - 1]),
                signal: 'NEUTRAL'
            };
        } catch (error) {
            console.error('Error calculating Pivot Points:', error);
            indicators.pivots = { value: null, signal: 'NEUTRAL' };
        }

        try {
            indicators.vwap = {
                value: volumes.length > 0 ? TechnicalIndicators.calculateVWAP(closes, volumes) : null,
                signal: 'NEUTRAL'
            };
        } catch (error) {
            console.error('Error calculating VWAP:', error);
            indicators.vwap = { value: null, signal: 'NEUTRAL' };
        }

        try {
            indicators.williamsr = {
                value: TechnicalIndicators.calculateWilliamsR(highs, lows, closes),
                signal: getSignal('williamsr', TechnicalIndicators.calculateWilliamsR(highs, lows, closes))
            };
        } catch (error) {
            console.error('Error calculating Williams %R:', error);
            indicators.williamsr = { value: null, signal: 'NEUTRAL' };
        }

        try {
            indicators.mfi = {
                value: volumes.length > 0 ? TechnicalIndicators.calculateMFI(highs, lows, closes, volumes) : null,
                signal: volumes.length > 0 ? getSignal('mfi', TechnicalIndicators.calculateMFI(highs, lows, closes, volumes)) : 'NEUTRAL'
            };
        } catch (error) {
            console.error('Error calculating MFI:', error);
            indicators.mfi = { value: null, signal: 'NEUTRAL' };
        }

        try {
            const ema8 = TechnicalIndicators.calculateEMA(closes, 8);
            const ema20 = TechnicalIndicators.calculateEMA(closes, 20);
            indicators.emaShort = {
                value: {
                    ema8: ema8.length > 0 ? ema8[ema8.length - 1] : null,
                    ema20: ema20.length > 0 ? ema20[ema20.length - 1] : null
                },
                signal: ema8.length > 0 && ema20.length > 0 ? 
                    getEMASignal({ ema8: ema8[ema8.length - 1], ema20: ema20[ema20.length - 1] }) : 'NEUTRAL'
            };
        } catch (error) {
            console.error('Error calculating Short EMAs:', error);
            indicators.emaShort = { 
                value: { ema8: null, ema20: null }, 
                signal: 'NEUTRAL' 
            };
        }

        try {
            const ema50 = TechnicalIndicators.calculateEMA(closes, 50);
            const ema200 = TechnicalIndicators.calculateEMA(closes, 200);
            indicators.emaLong = {
                value: {
                    ema50: ema50.length > 0 ? ema50[ema50.length - 1] : null,
                    ema200: ema200.length > 0 ? ema200[ema200.length - 1] : null
                },
                signal: ema50.length > 0 && ema200.length > 0 ? 
                    getEMASignal({ ema50: ema50[ema50.length - 1], ema200: ema200[ema200.length - 1] }) : 'NEUTRAL'
            };
        } catch (error) {
            console.error('Error calculating Long EMAs:', error);
            indicators.emaLong = { 
                value: { ema50: null, ema200: null }, 
                signal: 'NEUTRAL' 
            };
        }

        try {
            const ichimoku = TechnicalIndicators.calculateIchimoku(highs, lows, closes);
            indicators.ichimoku = {
                value: ichimoku,
                signal: getIchimokuSignal(ichimoku)
            };
        } catch (error) {
            console.error('Error calculating Ichimoku:', error);
            indicators.ichimoku = { value: null, signal: 'NEUTRAL' };
        }

        try {
            const fibonacci = TechnicalIndicators.calculateFibonacci(highs, lows, closes);
            indicators.fibonacci = {
                value: fibonacci,
                signal: getFibonacciSignal(fibonacci)
            };
        } catch (error) {
            console.error('Error calculating Fibonacci:', error);
            indicators.fibonacci = { value: null, signal: 'NEUTRAL' };
        }

        try {
            const supertrend = TechnicalIndicators.calculateSupertrend(highs, lows, closes);
            indicators.supertrend = {
                value: supertrend,
                signal: supertrend.trend
            };
        } catch (error) {
            console.error('Error calculating Supertrend:', error);
            indicators.supertrend = { value: null, signal: 'NEUTRAL' };
        }

        // Calculate market sentiment and position based on all indicators
        try {
            let bullishCount = 0;
            let bearishCount = 0;
            let totalCount = 0;

            // Count bullish and bearish signals from all indicators
            Object.values(indicators).forEach(indicator => {
                if (indicator && indicator.signal) {
                    totalCount++;
                    if (indicator.signal === 'BULLISH') bullishCount++;
                    if (indicator.signal === 'BEARISH') bearishCount++;
                }
            });

            // Calculate sentiment percentage
            const sentimentPercentage = totalCount > 0 ? (bullishCount / totalCount) * 100 : 50;

            // Determine market sentiment
            let marketSentiment;
            if (sentimentPercentage >= 70) marketSentiment = 'BULLISH';
            else if (sentimentPercentage <= 30) marketSentiment = 'BEARISH';
            else marketSentiment = 'NEUTRAL';

            // Determine position based on key indicators
            let position;
            const emaShortBullish = indicators.emaShort?.signal === 'BULLISH';
            const emaLongBullish = indicators.emaLong?.signal === 'BULLISH';
            const macdBullish = indicators.macd?.signal === 'BULLISH';
            const rsiBullish = indicators.rsi?.signal === 'BULLISH';

            if (emaShortBullish && emaLongBullish && (macdBullish || rsiBullish)) {
                position = 'LONG';
            } else if (!emaShortBullish && !emaLongBullish && (!macdBullish || !rsiBullish)) {
                position = 'SHORT';
            } else {
                position = 'NEUTRAL';
            }

            // Add to response
            indicators.marketSentiment = {
                value: sentimentPercentage,
                signal: marketSentiment
            };

            indicators.position = {
                value: position,
                signal: position
            };

        } catch (error) {
            console.error('Error calculating market sentiment and position:', error);
            indicators.marketSentiment = { value: 50, signal: 'NEUTRAL' };
            indicators.position = { value: 'NEUTRAL', signal: 'NEUTRAL' };
        }

        console.log('Calculated indicators:', JSON.stringify(indicators, null, 2));
        const responseToSend = { indicators };
        console.log('Sending response:', JSON.stringify(responseToSend, null, 2));
        sendResponse(res, responseToSend);

    } catch (error) {
        handleApiError(error, req, res);
    }
});

export default router;
