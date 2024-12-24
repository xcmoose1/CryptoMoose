import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

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
                content: "You are an expert cryptocurrency trader specializing in altcoin markets. Provide precise, technical, and engaging market analysis. Your insights should combine technical analysis, market structure, and inter-market dynamics. Be specific about market conditions and opportunities, but never recommend specific coins. Use emojis and formatting to make key points stand out."
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

        // Fetch sector data from Bybit or other data source
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

        // Fetch top assets for the sector from Bybit or other data source
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

// MEXC API endpoint for klines data
app.get('/api/mexc/klines', async (req, res) => {
    let { symbol = 'BTCUSDT', interval = '1h', limit = 100 } = req.query;
    
    // Format symbols
    symbol = symbol.toUpperCase();
    
    // Convert intervals
    const intervalMap = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '30m': '30m',
        '1h': '1h',
        '4h': '4h',
        '12h': '12h',
        '1d': '1d',
        '1w': '1w'
    };

    const mexcInterval = intervalMap[interval] || '1h';
    const bybitInterval = interval.replace('h', '') === '1' ? '60' : 
                         interval.replace('h', '') === '4' ? '240' :
                         interval.replace('h', '') === '12' ? '720' :
                         interval.replace('d', '') === '1' ? 'D' :
                         interval.replace('w', '') === '1' ? 'W' : '60';
    
    console.log(`Fetching klines for ${symbol} on ${interval} timeframe`);
    
    try {
        let retries = 3;
        let lastError;

        while (retries > 0) {
            try {
                console.log(`Attempt ${4-retries}: Fetching from MEXC API`);
                const mexcUrl = `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${mexcInterval}&limit=${limit}`;
                console.log('MEXC URL:', mexcUrl);
                const response = await fetch(mexcUrl);
                
                if (!response.ok) {
                    throw new Error(`MEXC API responded with status: ${response.status}`);
                }
                
                const text = await response.text();
                console.log('Raw MEXC response:', text);
                
                try {
                    const data = JSON.parse(text);
                    console.log(`Successfully parsed ${data.length} klines from MEXC`);
                    return res.json(data);
                } catch (parseError) {
                    console.error('Failed to parse MEXC response:', parseError);
                    throw new Error('Invalid JSON from MEXC');
                }
            } catch (error) {
                console.error(`Attempt ${4-retries} failed:`, error.message);
                lastError = error;
                retries--;
                
                if (retries > 0) {
                    console.log('Trying Bybit as fallback...');
                    try {
                        // Format symbol for Bybit (remove USDT suffix)
                        const bybitSymbol = symbol.replace('USDT', '') + 'USDT';
                        const bybitUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${bybitSymbol}&interval=${bybitInterval}&limit=${limit}`;
                        console.log('Bybit URL:', bybitUrl);
                        const bybitResponse = await fetch(bybitUrl);
                        
                        if (!bybitResponse.ok) {
                            throw new Error(`Bybit API responded with status: ${bybitResponse.status}`);
                        }
                        
                        const text = await bybitResponse.text();
                        console.log('Raw Bybit response:', text);
                        
                        try {
                            const bybitData = JSON.parse(text);
                            console.log('Successfully parsed Bybit response:', bybitData);
                            if (bybitData.result && bybitData.result.list) {
                                // Transform Bybit data to match MEXC format
                                const transformedData = bybitData.result.list.map(item => [
                                    parseInt(item[0]), // timestamp
                                    parseFloat(item[1]), // open
                                    parseFloat(item[2]), // high
                                    parseFloat(item[3]), // low
                                    parseFloat(item[4]), // close
                                    parseFloat(item[5]), // volume
                                    parseInt(item[0]) + getIntervalMs(interval), // close time
                                    0 // ignore quote asset volume
                                ]);
                                return res.json(transformedData);
                            } else {
                                throw new Error('Invalid Bybit data structure');
                            }
                        } catch (parseError) {
                            console.error('Failed to parse Bybit response:', parseError);
                            throw new Error('Invalid JSON from Bybit');
                        }
                    } catch (bybitError) {
                        console.error('Bybit attempt failed:', bybitError.message);
                    }
                    
                    console.log(`Waiting before retry... ${retries} attempts left`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        throw new Error('All API attempts failed');
    } catch (error) {
        console.error('All attempts failed:', error.message);
        res.status(503).json({ 
            error: 'Service temporarily unavailable',
            details: error.message 
        });
    }
});

// Helper function to convert interval to milliseconds
function getIntervalMs(interval) {
    const unit = interval.slice(-1);
    const value = parseInt(interval);
    
    switch(unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000; // default to 1h
    }
}

// MEXC ticker endpoint
app.get('/api/mexc/ticker/24hr', async (req, res) => {
    try {
        const response = await fetch('https://api.mexc.com/api/v3/ticker/24hr');
        if (!response.ok) {
            // If MEXC fails, try Bybit as fallback
            const bybitResponse = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
            if (!bybitResponse.ok) {
                throw new Error('Failed to fetch data from both MEXC and Bybit');
            }
            const bybitData = await bybitResponse.json();
            // Transform Bybit data to match MEXC format
            const transformedData = bybitData.result.list.map(item => ({
                symbol: item.symbol,
                lastPrice: item.lastPrice,
                volume: item.volume24h,
                priceChange: item.price24hPcnt,
                high: item.highPrice24h,
                low: item.lowPrice24h
            }));
            return res.json(transformedData);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching ticker data:', error);
        res.status(404).json({ error: error.message });
    }
});

// Technical indicators endpoint
app.get('/api/indicators', async (req, res) => {
    try {
        const { symbol, timeframe } = req.query;
        const klinesResponse = await fetch(`https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=100`);
        if (!klinesResponse.ok) {
            throw new Error(`HTTP error! status: ${klinesResponse.status}`);
        }
        const klines = await klinesResponse.json();

        // Extract price data
        const closes = klines.map(k => parseFloat(k[4]));
        const price = closes[closes.length - 1];

        // Calculate RSI
        const rsi = calculateRSI(closes);

        // Calculate Bollinger Bands
        const bb = calculateBollingerBands(closes);

        // Calculate MACD
        const macd = calculateMACD(closes);

        res.json({
            price,
            rsi: rsi[rsi.length - 1],
            bb: {
                upper: bb.upper[bb.upper.length - 1],
                middle: bb.middle[bb.middle.length - 1],
                lower: bb.lower[bb.lower.length - 1]
            },
            macd: macd.macd[macd.macd.length - 1],
            signal: macd.signal[macd.signal.length - 1],
            histogram: macd.histogram[macd.histogram.length - 1]
        });
    } catch (error) {
        console.error('Error calculating indicators:', error);
        res.status(500).json({ error: error.message });
    }
});

// Technical indicator calculations
function calculateRSI(prices, period = 14) {
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < period + 1; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) {
            avgGain = (avgGain * 13 + diff) / period;
            avgLoss = (avgLoss * 13) / period;
        } else {
            avgGain = (avgGain * 13) / period;
            avgLoss = (avgLoss * 13 - diff) / period;
        }
    }
    
    const rs = avgGain / avgLoss;
    return prices.map((_, i) => {
        if (i < period) return 0;
        return 100 - (100 / (1 + rs));
    });
}

function calculateBollingerBands(prices, period = 20, multiplier = 2) {
    const sma = prices.slice(-period).reduce((a, b) => a + b) / period;
    const squaredDiffs = prices.slice(-period).map(p => Math.pow(p - sma, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / period);
    
    return {
        upper: prices.map((_, i) => {
            if (i < period) return 0;
            return sma + (multiplier * stdDev);
        }),
        middle: prices.map((_, i) => {
            if (i < period) return 0;
            return sma;
        }),
        lower: prices.map((_, i) => {
            if (i < period) return 0;
            return sma - (multiplier * stdDev);
        })
    };
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const ema12 = calculateEMA(prices, fastPeriod);
    const ema26 = calculateEMA(prices, slowPeriod);
    const macdLine = ema12.map((e, i) => e - ema26[i]);
    const signalLine = calculateEMA(macdLine, signalPeriod);
    
    return {
        macd: macdLine,
        signal: signalLine,
        histogram: macdLine.map((m, i) => m - signalLine[i])
    };
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    return prices.map((p, i) => {
        if (i === 0) return ema;
        ema = (p * k) + (ema * (1 - k));
        return ema;
    });
}

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
