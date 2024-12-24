import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import axios from 'axios'; // Import axios

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Cache for AI analysis
const analysisCache = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// AI Analysis endpoint
app.post('/ai/analyze', async (req, res) => {
    try {
        const marketData = req.body;
        const cacheKey = `${marketData.pair}-${marketData.timeframe}`;
        const currentTime = Date.now();
        
        // Check cache first
        if (analysisCache.has(cacheKey)) {
            const cachedAnalysis = analysisCache.get(cacheKey);
            if (currentTime - cachedAnalysis.timestamp < CACHE_DURATION) {
                console.log('Returning cached analysis');
                return res.json({ analysis: cachedAnalysis.analysis });
            }
        }
        
        // Format the technical indicators
        const technicalAnalysis = `RSI (14): ${marketData.indicators.rsi}
BB Upper: $${marketData.indicators.bb.upper}
BB Middle: $${marketData.indicators.bb.middle}
BB Lower: $${marketData.indicators.bb.lower}
MACD Line: ${marketData.indicators.macd.macd}
Signal Line: ${marketData.indicators.macd.signal}
MACD Histogram: ${marketData.indicators.macd.histogram}`;

        const prompt = `Analyze this market data for ${marketData.pair} and provide friendly, easy-to-read insights. Here's the current data:

Current Price: $${marketData.currentPrice}
24h Change: ${marketData.priceChange24h}%
24h Volume: ${marketData.volume24h}
Timeframe: ${marketData.timeframe}

Technical Indicators:
${technicalAnalysis}

Format your response in these sections:

🎯 Market Snapshot:
• Current situation
• Key price levels
• Important trends

📊 Technical Signals:
• What the indicators are saying
• Pattern formations
• Volume analysis

💡 Trading Ideas:
• Potential opportunities
• Risk levels
• Price targets

Keep it engaging and use emojis to highlight important points! Make complex concepts easy to understand.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: "You are CryptoMoose AI, a friendly and engaging cryptocurrency trading analyst who makes complex market analysis easy to understand. Your style is professional yet approachable, using emojis and clear language to explain market concepts. Keep your analysis concise, actionable, and easy to digest. Use emojis strategically to highlight key points and maintain engagement."
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 500
        });

        const analysis = completion.choices[0].message.content;
        
        // Cache the new analysis
        analysisCache.set(cacheKey, {
            analysis,
            timestamp: currentTime
        });
        
        res.json({ analysis });
        
    } catch (error) {
        console.error('Error in AI analysis:', error);
        res.status(500).json({ 
            error: 'Failed to generate analysis',
            details: error.message 
        });
    }
});

// Altcoin Market Analysis endpoint
app.post('/ai/altcoin-analysis', async (req, res) => {
    try {
        const marketData = req.body;
        const cacheKey = 'altcoin-analysis';
        const currentTime = Date.now();
        
        // Check cache first
        if (analysisCache.has(cacheKey)) {
            const cachedAnalysis = analysisCache.get(cacheKey);
            if (currentTime - cachedAnalysis.timestamp < CACHE_DURATION) {
                console.log('Returning cached altcoin analysis');
                return res.json(cachedAnalysis.analysis);
            }
        }

        const prompt = `Analyze the current altcoin market conditions and provide professional yet engaging trading insights. Here's the market data:

ETH Dominance: ${marketData.ethDominance}%
Top 10 Dominance: ${marketData.top10Dominance}%
Market Volatility: ${marketData.marketVolatility}
Large Cap 24h Change: ${marketData.largeCap24h}%
Mid Cap 24h Change: ${marketData.midCap24h}%
Small Cap 24h Change: ${marketData.smallCap24h}%

Provide two sections:

1. Market Overview 📊
- Current market sentiment and key trends
- Major market movements and their implications
- Key levels to watch
Use emojis and highlight important numbers/trends

2. Trading Strategy 🎯
- Clear actionable strategy based on current conditions
- Risk management considerations
- Key entry/exit scenarios to watch for
Make it specific and actionable, but don't recommend specific coins

Format with emojis, use *bold* for important points, and _italics_ for emphasis. Keep it concise but impactful.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: "You are an expert cryptocurrency trader specializing in altcoin markets. Provide precise, technical, and engaging market analysis. Your insights should combine technical analysis, market structure, and inter-market dynamics. Be specific about market conditions and opportunities, but never recommend specific coins. Use emojis and formatting to highlight key points."
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 500
        });

        const analysis = {
            marketOverview: completion.choices[0].message.content.split('\n\n')[0],
            tradingStrategy: completion.choices[0].message.content.split('\n\n')[1]
        };
        
        // Cache the new analysis
        analysisCache.set(cacheKey, {
            analysis,
            timestamp: currentTime
        });
        
        res.json(analysis);
        
    } catch (error) {
        console.error('Error in altcoin market analysis:', error);
        res.status(500).json({ 
            error: 'Failed to generate altcoin analysis',
            details: error.message 
        });
    }
});

// Yahoo Finance API endpoint
app.get('/api/yahoo/history', async (req, res) => {
    try {
        const { symbol, interval } = req.query;
        const yahooInterval = interval === '4h' ? '60m' : '1d';
        const range = interval === '4h' ? '5d' : '30d';
        
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${range}`);
        const data = await response.json();
        
        const timestamps = data.chart.result[0].timestamp;
        const quotes = data.chart.result[0].indicators.quote[0];
        
        const formattedData = timestamps.map((timestamp, i) => ({
            timestamp: timestamp * 1000,
            close: quotes.close[i]
        }));

        if (interval === '4h') {
            // Convert 1h data to 4h by taking every 4th point
            const fourHourData = formattedData.filter((_, i) => i % 4 === 0);
            res.json(fourHourData);
        } else {
            res.json(formattedData);
        }
    } catch (error) {
        console.error('Error fetching Yahoo Finance data:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

// Correlation Analysis endpoint
app.post('/api/correlation-analysis', async (req, res) => {
    try {
        const { timeframe, data } = req.body;
        
        const prompt = `Analyze the correlation between Bitcoin, Ethereum, Gold, S&P 500, and NASDAQ over the ${timeframe} timeframe. Here's the percentage change data:

${data.map(d => `${d.symbol}: ${d.data.slice(-1)[0].value.toFixed(2)}% change`).join('\n')}

Provide a concise analysis of:
1. Which assets are moving together
2. Any notable divergences
3. What this means for market sentiment

Use emojis and formatting (*bold* for important points, _italics_ for emphasis) to highlight key insights.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: "You are an expert in multi-asset correlation analysis. Provide clear, concise insights about how different assets are moving in relation to each other. Use technical terms when relevant but keep the analysis accessible. Use emojis and formatting to highlight key points."
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 250
        });

        res.json({ insight: completion.choices[0].message.content });
        
    } catch (error) {
        console.error('Error generating correlation analysis:', error);
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
});

// Sector Metrics endpoint
app.get('/api/sector/metrics', async (req, res) => {
    try {
        const { sector } = req.query;
        const cacheKey = `sector-metrics-${sector}`;
        
        if (analysisCache.has(cacheKey)) {
            const cachedData = analysisCache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
                return res.json(cachedData.data);
            }
        }

        // Fetch sector data from MEXC or other data source
        const metrics = await fetchSectorMetrics(sector);
        
        analysisCache.set(cacheKey, {
            data: metrics,
            timestamp: Date.now()
        });
        
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching sector metrics:', error);
        res.status(500).json({ error: 'Failed to fetch sector metrics' });
    }
});

// Sector Insights endpoint
app.get('/api/sector/insights', async (req, res) => {
    try {
        const { sector } = req.query;
        const cacheKey = `sector-insights-${sector}`;
        
        if (analysisCache.has(cacheKey)) {
            const cachedData = analysisCache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
                return res.json(cachedData.data);
            }
        }

        const prompt = `Analyze the current state of the ${sector} sector in the cryptocurrency market. Consider:

1. Recent trends and developments
2. Market structure and dynamics
3. Key opportunities and risks

Format the response with emojis and markdown (*bold* for important points, _italics_ for emphasis).
Keep each section concise but informative. Focus on actionable insights.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `You are an expert cryptocurrency analyst specializing in the ${sector} sector. Provide clear, actionable insights about market trends, opportunities, and risks. Use technical terms when relevant but keep the analysis accessible.`
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 500
        });

        const insights = {
            trends: completion.choices[0].message.content.split('\n\n')[0],
            structure: completion.choices[0].message.content.split('\n\n')[1],
            opportunities: completion.choices[0].message.content.split('\n\n')[2]
        };

        analysisCache.set(cacheKey, {
            data: insights,
            timestamp: Date.now()
        });

        res.json(insights);
    } catch (error) {
        console.error('Error generating sector insights:', error);
        res.status(500).json({ error: 'Failed to generate sector insights' });
    }
});

// Sector Assets endpoint
app.get('/api/sector/assets', async (req, res) => {
    try {
        const { sector } = req.query;
        const cacheKey = `sector-assets-${sector}`;
        
        if (analysisCache.has(cacheKey)) {
            const cachedData = analysisCache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < CACHE_DURATION) {
                return res.json(cachedData.data);
            }
        }

        // Fetch top assets for the sector from MEXC or other data source
        const assets = await fetchSectorAssets(sector);
        
        analysisCache.set(cacheKey, {
            data: assets,
            timestamp: Date.now()
        });
        
        res.json(assets);
    } catch (error) {
        console.error('Error fetching sector assets:', error);
        res.status(500).json({ error: 'Failed to fetch sector assets' });
    }
});

// MEXC API endpoint
app.get('/api/mexc/tickers', async (req, res) => {
    try {
        const response = await fetch('https://api.mexc.com/api/v3/ticker/24hr');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching MEXC data:', error);
        res.status(500).json({ error: 'Failed to fetch MEXC data' });
    }
});

// MEXC API proxy endpoint
app.get('/api/mexc/klines', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        console.log('Received request with params:', { symbol, interval, limit });
        
        // Validate inputs
        if (!symbol || !interval) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Map intervals to MEXC format
        const intervalMap = {
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
            '1w': '1w',
            '1M': '1M'
        };

        const mexcInterval = intervalMap[interval.toLowerCase()];
        console.log('Mapped interval:', { original: interval, mapped: mexcInterval });
        
        if (!mexcInterval) {
            return res.status(400).json({ 
                error: `Invalid interval: ${interval}. Valid intervals are: ${Object.keys(intervalMap).join(', ')}` 
            });
        }
        
        // Forward request to MEXC
        const mexcUrl = `https://api.mexc.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${mexcInterval}&limit=${limit || 100}`;
        console.log('Fetching from MEXC:', mexcUrl);
        
        const response = await axios.get(mexcUrl);
        const klines = response.data;
        
        if (!Array.isArray(klines)) {
            return res.status(500).json({ error: 'Invalid response from MEXC' });
        }
        
        console.log('Successfully fetched', klines.length, 'klines from MEXC');
        res.json(klines);
        
    } catch (error) {
        console.error('Error fetching from MEXC:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// MEXC ticker endpoint
app.get('/api/mexc/ticker/24hr', async (req, res) => {
    try {
        const response = await fetch('https://api.mexc.com/api/v3/ticker/24hr');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching ticker data:', error);
        res.status(404).json({ error: error.message });
    }
});

// Map timeframes to MEXC format
const timeframeMap = {
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
    '1w': '1w',
    '1M': '1M'
};

// Indicators endpoint
app.get('/api/indicators', async (req, res) => {
    try {
        const { symbol, timeframe } = req.query;
        
        // Validate inputs
        if (!symbol || !timeframe) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const mexcTimeframe = timeframeMap[timeframe.toLowerCase()];
        if (!mexcTimeframe) {
            return res.status(400).json({ error: `Invalid timeframe: ${timeframe}. Valid timeframes are: ${Object.keys(timeframeMap).join(', ')}` });
        }
        
        // Fetch klines data from MEXC
        const klinesUrl = `https://api.mexc.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${mexcTimeframe}&limit=100`;
        console.log('Fetching from MEXC:', klinesUrl);
        
        const response = await axios.get(klinesUrl);
        const klines = response.data;
        
        if (!Array.isArray(klines) || klines.length === 0) {
            return res.status(500).json({ error: 'Invalid response from MEXC' });
        }
        
        console.log('Successfully parsed', klines.length, 'klines from MEXC');
        
        // Extract price data - MEXC format: [timestamp, open, high, low, close, volume, closeTime, quoteVolume]
        const prices = klines.map(k => parseFloat(k[4])); // closing prices
        const highs = klines.map(k => parseFloat(k[2])); // high prices
        const lows = klines.map(k => parseFloat(k[3])); // low prices
        const volumes = klines.map(k => parseFloat(k[5])); // volumes
        
        // Calculate indicators
        const rsi = calculateRSI(prices);
        const bb = calculateBollingerBands(prices);
        const macd = calculateMACD(prices);
        const ema50 = calculateEMA(prices, 50);
        const ema200 = calculateEMA(prices, 200);
        
        const result = {
            rsi: rsi[rsi.length - 1],
            bb: {
                upper: bb.upper[bb.upper.length - 1],
                middle: bb.middle[bb.middle.length - 1],
                lower: bb.lower[bb.lower.length - 1]
            },
            macd: {
                macd: macd.macd[macd.macd.length - 1],
                signal: macd.signal[macd.signal.length - 1],
                histogram: macd.histogram[macd.histogram.length - 1]
            },
            ema: {
                ema50: ema50[ema50.length - 1],
                ema200: ema200[ema200.length - 1]
            },
            price: prices[prices.length - 1],
            volume: volumes[volumes.length - 1]
        };
        
        console.log('Calculated indicators:', result);
        res.json(result);
    } catch (error) {
        console.error('Error calculating indicators:', error);
        res.status(500).json({ error: error.message || 'Failed to calculate indicators' });
    }
});

async function fetchSectorMetrics(sector) {
    // Implement sector metrics fetching logic here
    // This would typically involve aggregating data from multiple sources
    return {
        marketCap: '$0',
        volume: '$0',
        change: '0%',
        dominance: '0%'
    };
}

async function fetchSectorAssets(sector) {
    // Implement sector assets fetching logic here
    // This would typically involve fetching and filtering data from exchanges
    return [];
}

// Start server
const PORT = process.env.PORT || 8001;  
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Calculate RSI
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
        return Array(prices.length).fill(50);
    }

    let gains = [];
    let losses = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? -change : 0);
    }
    
    // Calculate average gains and losses
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;
    
    let rsi = [];
    rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    
    // Calculate RSI for remaining prices
    for (let i = period; i < prices.length - 1; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    }
    
    return rsi;
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
        return {
            upper: Array(prices.length).fill(0),
            middle: Array(prices.length).fill(0),
            lower: Array(prices.length).fill(0)
        };
    }

    let upper = [];
    let middle = [];
    let lower = [];
    
    for (let i = period - 1; i < prices.length; i++) {
        const slice = prices.slice(i - period + 1, i + 1);
        const sma = slice.reduce((a, b) => a + b) / period;
        const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period);
        
        middle.push(sma);
        upper.push(sma + (stdDev * std));
        lower.push(sma - (stdDev * std));
    }
    
    // Pad the beginning with the first value
    const padding = Array(period - 1).fill(0);
    upper = [...padding, ...upper];
    middle = [...padding, ...middle];
    lower = [...padding, ...lower];
    
    return { upper, middle, lower };
}

// Calculate MACD
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod + signalPeriod) {
        return {
            macd: Array(prices.length).fill(0),
            signal: Array(prices.length).fill(0),
            histogram: Array(prices.length).fill(0)
        };
    }

    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);
    
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
    const signalLine = calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
    
    return {
        macd: macdLine,
        signal: signalLine,
        histogram: histogram
    };
}

// Calculate EMA
function calculateEMA(prices, period) {
    if (prices.length < period) {
        return Array(prices.length).fill(prices[0] || 0);
    }

    const multiplier = 2 / (period + 1);
    let ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
        ema.push((prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    }
    
    return ema;
}
