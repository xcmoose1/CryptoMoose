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

// Configure technical indicators
// pkg.setConfig('precision', 8);

// Utility function to calculate RSI
function calculateRSI(data, period = 14) {
    const input = {
        values: data.map(candle => parseFloat(candle[4])), // Close prices
        period: period
    };
    // return RSI.calculate(input);
}

// Calculate MACD
function calculateMACD(data) {
    const input = {
        values: data.map(candle => parseFloat(candle[4])), // Close prices
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
    };
    // return MACD.calculate(input);
}

// Calculate Bollinger Bands
function calculateBollingerBands(data) {
    const input = {
        period: 20,
        values: data.map(candle => parseFloat(candle[4])), // Close prices
        stdDev: 2
    };
    // return BollingerBands.calculate(input);
}

// Detect chart patterns
function detectPatterns(data) {
    const patterns = [];
    const closes = data.map(candle => parseFloat(candle[4]));
    const highs = data.map(candle => parseFloat(candle[2]));
    const lows = data.map(candle => parseFloat(candle[3]));

    // Head and Shoulders
    // const headAndShoulders = pkg.headAndShoulders({
    //     high: highs,
    //     low: lows,
    //     close: closes
    // });
    // if (headAndShoulders) patterns.push({ name: 'Head and Shoulders', confidence: 85 });

    // Double Top
    // const doubleTop = pkg.doubleTop({
    //     high: highs,
    //     low: lows,
    //     close: closes
    // });
    // if (doubleTop) patterns.push({ name: 'Double Top', confidence: 80 });

    // Double Bottom
    // const doubleBottom = pkg.doubleBottom({
    //     high: highs,
    //     low: lows,
    //     close: closes
    // });
    // if (doubleBottom) patterns.push({ name: 'Double Bottom', confidence: 80 });

    return patterns;
}

// Calculate Support and Resistance levels
function calculateSupportResistance(data) {
    const closes = data.map(candle => parseFloat(candle[4]));
    const highs = data.map(candle => parseFloat(candle[2]));
    const lows = data.map(candle => parseFloat(candle[3]));

    // Find pivot points
    // const pivotPoints = pkg.pivotPoints({
    //     high: highs,
    //     low: lows,
    //     close: closes,
    //     period: 14
    // });

    // Find support and resistance levels using pivot points
    const levels = {
        resistance: [],
        support: []
    };

    // Add pivot points as potential levels
    // pivotPoints.forEach(pivot => {
    //     if (pivot > closes[closes.length - 1]) {
    //         levels.resistance.push(pivot);
    //     } else {
    //         levels.support.push(pivot);
    //     }
    // });

    return levels;
}

// Find divergences
function findDivergences(data) {
    const closes = data.map(candle => parseFloat(candle[4]));
    // const rsi = calculateRSI(data);
    // const macd = calculateMACD(data);

    const divergences = {
        rsi: [],
        macd: []
    };

    // RSI Divergence
    // for (let i = rsi.length - 1; i >= 10; i--) {
    //     // Bullish Divergence: Price making lower lows but RSI making higher lows
    //     if (closes[i] < closes[i - 1] && rsi[i] > rsi[i - 1]) {
    //         divergences.rsi.push({
    //             type: 'bullish',
    //             price: closes[i],
    //             indicator: rsi[i],
    //             index: i
    //         });
    //     }
    //     // Bearish Divergence: Price making higher highs but RSI making lower highs
    //     else if (closes[i] > closes[i - 1] && rsi[i] < rsi[i - 1]) {
    //         divergences.rsi.push({
    //             type: 'bearish',
    //             price: closes[i],
    //             indicator: rsi[i],
    //             index: i
    //         });
    //     }
    // }

    // MACD Divergence
    // for (let i = macd.length - 1; i >= 10; i--) {
    //     if (closes[i] < closes[i - 1] && macd[i].histogram > macd[i - 1].histogram) {
    //         divergences.macd.push({
    //             type: 'bullish',
    //             price: closes[i],
    //             indicator: macd[i].histogram,
    //             index: i
    //         });
    //     }
    //     else if (closes[i] > closes[i - 1] && macd[i].histogram < macd[i - 1].histogram) {
    //         divergences.macd.push({
    //             type: 'bearish',
    //             price: closes[i],
    //             indicator: macd[i].histogram,
    //             index: i
    //         });
    //     }
    // }

    return divergences;
}

// API Endpoints

// Get multi-timeframe data
router.get('/mtf/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const timeframes = [
            HTX_INTERVALS.FIFTEEN_MINUTES,
            HTX_INTERVALS.ONE_HOUR,
            HTX_INTERVALS.FOUR_HOURS,
            HTX_INTERVALS.ONE_DAY
        ];
        
        const mtfData = {};
        
        for (const timeframe of timeframes) {
            try {
                // Try HTX
                const htxSymbol = formatSymbol(symbol);
                const htxInterval = validateAndMapInterval(timeframe);
                const htxResponse = await axios.get(`${HTX_CONFIG.BASE_URL}${HTX_CONFIG.ENDPOINTS.KLINES}`, {
                    params: {
                        symbol: htxSymbol,
                        period: htxInterval,
                        size: 100
                    }
                });
                mtfData[timeframe] = formatKlineData(htxResponse.data);
            } catch (htxError) {
                console.error(`HTX API failed for ${timeframe}:`, htxError.message);
                mtfData[timeframe] = [];
            }
        }

        res.json(mtfData);
    } catch (error) {
        console.error('Error fetching MTF data:', error);
        res.status(500).json({ error: 'Failed to fetch MTF data' });
    }
});

// Get technical analysis data
router.get('/analysis/:symbol/:timeframe', async (req, res) => {
    try {
        const { symbol, timeframe } = req.params;
        let klineData;

        try {
            // Try HTX
            const htxSymbol = formatSymbol(symbol);
            const htxInterval = validateAndMapInterval(timeframe);
            const htxResponse = await axios.get(`${HTX_CONFIG.BASE_URL}${HTX_CONFIG.ENDPOINTS.KLINES}`, {
                params: {
                    symbol: htxSymbol,
                    period: htxInterval,
                    size: 100
                }
            });
            klineData = formatKlineData(htxResponse.data);
        } catch (htxError) {
            console.error('HTX API failed:', htxError.message);
            throw new Error('Failed to fetch data from HTX');
        }
        
        // Calculate all technical indicators
        const analysis = {
            rsi: calculateRSI(klineData),
            macd: calculateMACD(klineData),
            bollingerBands: calculateBollingerBands(klineData),
            patterns: detectPatterns(klineData),
            supportResistance: calculateSupportResistance(klineData),
            divergences: findDivergences(klineData)
        };

        res.json(analysis);
    } catch (error) {
        console.error('Error in technical analysis:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get volume profile
router.get('/volume-profile/:symbol/:timeframe', async (req, res) => {
    try {
        const { symbol, timeframe } = req.params;
        const htxSymbol = formatSymbol(symbol);
        const htxInterval = validateAndMapInterval(timeframe);
        const htxResponse = await axios.get(`${HTX_CONFIG.BASE_URL}${HTX_CONFIG.ENDPOINTS.KLINES}`, {
            params: {
                symbol: htxSymbol,
                period: htxInterval,
                size: 100
            }
        });
        const data = formatKlineData(htxResponse.data);

        // Calculate volume profile
        const volumeProfile = data.reduce((acc, candle) => {
            const price = parseFloat(candle[4]); // Close price
            const volume = parseFloat(candle[5]);
            const priceLevel = Math.floor(price / 10) * 10; // Round to nearest 10

            if (!acc[priceLevel]) {
                acc[priceLevel] = 0;
            }
            acc[priceLevel] += volume;
            return acc;
        }, {});

        res.json(volumeProfile);
    } catch (error) {
        console.error('Error calculating volume profile:', error);
        res.status(500).json({ error: 'Failed to calculate volume profile' });
    }
});

// Get key levels
router.get('/key-levels/:symbol/:timeframe', async (req, res) => {
    try {
        const { symbol, timeframe } = req.params;
        const htxSymbol = formatSymbol(symbol);
        const htxInterval = validateAndMapInterval(timeframe);
        const htxResponse = await axios.get(`${HTX_CONFIG.BASE_URL}${HTX_CONFIG.ENDPOINTS.KLINES}`, {
            params: {
                symbol: htxSymbol,
                period: htxInterval,
                size: 100
            }
        });
        const data = formatKlineData(htxResponse.data);

        // Calculate key levels using various methods
        const closes = data.map(candle => parseFloat(candle[4]));
        const highs = data.map(candle => parseFloat(candle[2]));
        const lows = data.map(candle => parseFloat(candle[3]));

        const keyLevels = {
            pivotPoints: [],
            psychologicalLevels: calculatePsychologicalLevels(closes),
            volumeNodes: calculateVolumeNodes(data)
        };

        res.json(keyLevels);
    } catch (error) {
        console.error('Error calculating key levels:', error);
        res.status(500).json({ error: 'Failed to calculate key levels' });
    }
});

// Helper functions for key levels
function calculatePsychologicalLevels(closes) {
    const currentPrice = closes[closes.length - 1];
    const levels = [];
    const range = 0.2; // 20% range

    const minPrice = currentPrice * (1 - range);
    const maxPrice = currentPrice * (1 + range);

    // Round numbers (100, 1000, 10000)
    for (let price = minPrice; price <= maxPrice; price *= 10) {
        levels.push(Math.round(price / 100) * 100);
        levels.push(Math.round(price / 1000) * 1000);
        levels.push(Math.round(price / 10000) * 10000);
    }

    return levels.filter(level => level >= minPrice && level <= maxPrice);
}

function calculateVolumeNodes(data) {
    const volumeProfile = {};
    data.forEach(candle => {
        const price = parseFloat(candle[4]);
        const volume = parseFloat(candle[5]);
        const priceLevel = Math.round(price / 10) * 10;

        if (!volumeProfile[priceLevel]) {
            volumeProfile[priceLevel] = 0;
        }
        volumeProfile[priceLevel] += volume;
    });

    // Find local maxima in volume profile
    const nodes = [];
    Object.entries(volumeProfile).forEach(([price, volume], index, array) => {
        if (index > 0 && index < array.length - 1) {
            const prevVolume = array[index - 1][1];
            const nextVolume = array[index + 1][1];
            if (volume > prevVolume && volume > nextVolume) {
                nodes.push({
                    price: parseFloat(price),
                    volume: volume
                });
            }
        }
    });

    return nodes;
}

export default router;
