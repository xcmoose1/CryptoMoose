// HTX API configuration specific for segment projections
const HTX_SEGMENTS = {
    WS_URL: 'wss://api-aws.huobi.pro/ws',
    REST_URL: 'https://api-aws.huobi.pro',
    SUPPORTED_SEGMENTS: {
        'top': [
            'BTC', 'ETH', 'SOL', 'XRP', 'BNB',
            'ADA', 'AVAX', 'MATIC', 'DOT', 'LINK'
        ],
        'defi': [
            'UNI', 'AAVE', 'MKR', 'SUSHI', 'CRV',
            'SNX', 'COMP', '1INCH', 'YFI', 'LDO'
        ],
        'layer1': [
            'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR',
            'ATOM', 'FTM', 'ONE', 'ALGO', 'HBAR'
        ],
        'gaming': [
            'AXS', 'SAND', 'MANA', 'ENJ', 'GALA',
            'ILV', 'ALICE', 'TLM', 'HERO', 'UFO'
        ],
        'infrastructure': [
            'LINK', 'GRT', 'FIL', 'AR', 'RNDR',
            'THETA', 'CHZ', 'ROSE', 'BAND', 'API3'
        ],
        'ai': [
            'OCEAN', 'FET', 'AGIX', 'NMR', 'ALI',
            'RAD', 'RNDR', 'CTXC', 'CKB', 'GRT'
        ],
        'memes': [
            'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK',
            'BABYDOGE', 'ELON', 'SAMO', 'WOJAK', 'MEME'
        ],
        'depin': [
            'HNT', 'RNDR', 'STRK', 'MOBILE', 'PLA',
            'POKT', 'IOST', 'GLM', 'STORJ', 'FIL'
        ],
        'web3': [
            'IMX', 'LRC', 'OP', 'ARB', 'MASK',
            'ENS', 'BLUR', 'ID', 'DYDX', 'GMX'
        ]
    }
};

class HTXSegmentData {
    constructor() {
        this.ws = null;
        this.subscriptions = new Set();
        this.callbacks = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.connect();
    }

    async getHistoricalData(symbol) {
        try {
            console.log(`Fetching historical data for ${symbol}...`);
            const response = await fetch(`${HTX_SEGMENTS.REST_URL}/market/history/kline?symbol=${symbol.toLowerCase()}usdt&period=1day&size=30`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Received data for ${symbol}:`, data);
            if (data.status === 'ok' && Array.isArray(data.data)) {
                return data.data;
            }
            return [];
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
            return [];
        }
    }

    async generateProjections(symbol) {
        try {
            const historicalData = await this.getHistoricalData(symbol);
            if (!historicalData.length) {
                return this.getDefaultProjections();
            }

            // Calculate key technical indicators
            const prices = historicalData.map(d => d.close);
            const volumes = historicalData.map(d => d.vol || d.volume);
            
            // Calculate moving averages
            const sma7 = this.calculateSMA(prices, 7);
            const sma25 = this.calculateSMA(prices, 25);
            const ema12 = this.calculateEMA(prices, 12);
            const ema26 = this.calculateEMA(prices, 26);
            
            // Calculate MACD
            const macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];
            const macdSignal = this.calculateEMA(
                ema12.map((v, i) => v - ema26[i]).slice(-9), 
                9
            )[8];
            
            // Calculate RSI
            const rsi = this.calculateRSI(prices);
            
            // Volume analysis
            const volumeMA = this.calculateSMA(volumes, 7);
            const volumeStrength = volumes[0] > volumeMA[volumeMA.length - 1] ? 'high' : 'low';
            
            // Price momentum
            const momentum = (prices[0] - prices[6]) / prices[6];
            
            // Determine trend
            const shortTrend = sma7[sma7.length - 1] > sma7[sma7.length - 2] ? 'bullish' : 'bearish';
            const longTrend = sma25[sma25.length - 1] > sma25[sma25.length - 2] ? 'bullish' : 'bearish';
            const trend = shortTrend === longTrend ? shortTrend : 'neutral';

            // Calculate volatility
            const volatility = this.calculateVolatility(prices);
            
            // Generate price projections
            const currentPrice = prices[0];
            let shortTermMult = 1;
            let midTermMult = 1;
            let longTermMult = 1;
            
            // Factor in technical signals
            if (macd > macdSignal) shortTermMult += 0.002;
            if (macd < macdSignal) shortTermMult -= 0.002;
            if (rsi > 70) shortTermMult -= 0.003;
            if (rsi < 30) shortTermMult += 0.003;
            if (momentum > 0) shortTermMult += 0.001;
            if (momentum < 0) shortTermMult -= 0.001;
            
            // Adjust mid-term multiplier based on trend strength
            midTermMult = shortTermMult * (trend === 'neutral' ? 1 : (trend === 'bullish' ? 1.5 : 0.5));
            
            // Adjust long-term multiplier based on macro trend
            longTermMult = midTermMult * (longTrend === 'bullish' ? 1.8 : 0.6);
            
            // Calculate confidence based on signal alignment
            const signals = [
                macd > macdSignal,
                rsi > 50,
                momentum > 0,
                volumeStrength === 'high',
                trend === 'bullish'
            ];
            const alignedSignals = signals.filter(s => s).length;
            let confidence;
            if (alignedSignals >= 4) confidence = 'high';
            else if (alignedSignals >= 3) confidence = 'medium';
            else confidence = 'low';

            return {
                currentPrice,
                shortTerm: currentPrice * (1 + (volatility * shortTermMult)),
                midTerm: currentPrice * (1 + (volatility * 2 * midTermMult)),
                longTerm: currentPrice * (1 + (volatility * 4 * longTermMult)),
                confidence,
                trend,
                volumeStrength
            };
        } catch (error) {
            console.error(`Error generating projections for ${symbol}:`, error);
            return this.getDefaultProjections();
        }
    }

    getDefaultProjections() {
        return {
            currentPrice: null,
            shortTerm: null,
            midTerm: null,
            longTerm: null,
            confidence: 'low',
            trend: 'neutral',
            volumeStrength: 'low'
        };
    }

    calculateSMA(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
        return result;
    }

    calculateEMA(data, period) {
        const k = 2 / (period + 1);
        const result = [data[0]];
        for (let i = 1; i < data.length; i++) {
            result.push(data[i] * k + result[i - 1] * (1 - k));
        }
        return result;
    }

    calculateRSI(prices) {
        const changes = prices.slice(1).map((price, i) => price - prices[i]);
        const gains = changes.map(change => change > 0 ? change : 0);
        const losses = changes.map(change => change < 0 ? -change : 0);
        
        const avgGain = gains.slice(-14).reduce((a, b) => a + b) / 14;
        const avgLoss = losses.slice(-14).reduce((a, b) => a + b) / 14;
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateVolatility(data) {
        const returns = data.slice(1).map((price, i) => Math.log(price / data[i]));
        const mean = returns.reduce((a, b) => a + b) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    connect() {
        console.log('Connecting to HTX WebSocket...');
        this.ws = new WebSocket(HTX_SEGMENTS.WS_URL);
        
        this.ws.onopen = () => {
            console.log('Connected to HTX WebSocket');
            this.reconnectAttempts = 0;
            this.subscriptions.forEach(sub => {
                console.log('Resubscribing to:', sub);
                this.send(sub);
            });
        };

        this.ws.onclose = () => {
            console.log('Disconnected from HTX WebSocket');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, 2000 * Math.pow(2, this.reconnectAttempts));
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        this.ws.onmessage = async (event) => {
            try {
                let text;
                if (event.data instanceof Blob) {
                    try {
                        console.log('Received blob data, attempting to decompress...');
                        text = await this.decompress(event.data);
                    } catch (e) {
                        console.log('Decompression failed, falling back to raw text');
                        text = await event.data.text();
                    }
                } else {
                    text = event.data;
                }

                const data = JSON.parse(text);
                console.log('Received WebSocket message:', data);

                if (data.ping) {
                    console.log('Received ping, sending pong');
                    this.send({ pong: data.ping });
                    return;
                }
                
                if (data.ch && this.callbacks.has(data.ch)) {
                    console.log('Processing market data for channel:', data.ch);
                    this.callbacks.get(data.ch)(data.tick);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
    }

    subscribe(symbol, callback) {
        const channel = `market.${symbol.toLowerCase()}usdt.kline.1min`;
        console.log(`Subscribing to channel: ${channel}`);
        const sub = {
            sub: channel,
            id: symbol
        };
        
        this.subscriptions.add(sub);
        this.callbacks.set(channel, callback);
        this.send(sub);
    }

    unsubscribe(symbol) {
        const channel = `market.${symbol.toLowerCase()}usdt.kline.1min`;
        const unsub = {
            unsub: channel,
            id: symbol
        };
        
        this.subscriptions.delete(unsub);
        this.callbacks.delete(channel);
        this.send(unsub);
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('Sending WebSocket message:', data);
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not ready, message not sent:', data);
        }
    }

    async decompress(blob) {
        const ds = new DecompressionStream('gzip');
        const decompressedStream = blob.stream().pipeThrough(ds);
        const decompressedBlob = await new Response(decompressedStream).blob();
        return await decompressedBlob.text();
    }
}
