// Bybit Market Data Handler
import { TechnicalIndicators, updateOBVIndicator } from './indicators.js';

class BybitDataHandler {
    constructor() {
        this.baseUrl = 'https://api.bybit.com/v5';
        this.wsUrl = 'wss://stream.bybit.com/v5/public/spot';
        this.ws = null;
        this.subscribers = new Map();
        this.reconnectTimeout = null;
        this.orderBook = new Map();
        this.orderBookDepth = 25; // Number of levels to maintain
        this.lastRefreshTime = 0;
        this.refreshInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        this.countdownInterval = null;
        this.initCountdownTimer();
    }

    initCountdownTimer() {
        // Clear existing interval if any
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        const updateCountdown = () => {
            const now = Date.now();
            const nextRefresh = this.lastRefreshTime + this.refreshInterval;
            const timeLeft = nextRefresh - now;

            if (timeLeft <= 0) {
                document.getElementById('refreshCountdown').textContent = 'Refreshing...';
                return;
            }

            // Convert to hours, minutes, seconds
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            // Format with leading zeros
            const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            document.getElementById('refreshCountdown').textContent = formatted;
        };

        // Update immediately and then every second
        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }

    // Initialize WebSocket connection
    initWebSocket(symbols) {
        try {
            // Check if enough time has passed since last refresh
            const currentTime = Date.now();
            if (currentTime - this.lastRefreshTime < this.refreshInterval) {
                console.log('Skipping refresh - not enough time has passed');
                return;
            }

            this.lastRefreshTime = currentTime;
            this.initCountdownTimer(); // Reset countdown timer

            // Close existing connection if any
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            // Create new WebSocket connection
            console.log('Initializing WebSocket connection...');
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected successfully');
                this.onopen(symbols);
            };

            this.ws.onmessage = (event) => {
                try {
                    this.onmessage(event);
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                // Fallback to REST API on WebSocket error
                this.fetchKlines(this.currentPair, this.currentTimeframe)
                    .then(klines => {
                        if (klines && klines.length > 0) {
                            this.notifySubscribers('kline', klines);
                        }
                    })
                    .catch(err => console.error('Error fetching fallback data:', err));
            };

            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
                // Attempt to reconnect after 5 seconds
                if (!this.reconnectTimeout) {
                    this.reconnectTimeout = setTimeout(() => {
                        this.reconnectTimeout = null;
                        this.initWebSocket(symbols);
                    }, 5000);
                }
            };

        } catch (error) {
            console.error('Error initializing WebSocket:', error);
        }
    }

    onopen(symbols) {
        console.log('WebSocket connected');
        
        // Subscribe to kline data with updated timeframes
        const timeframes = ['60', '240', '720', 'D']; // 1h, 4h, 12h, 1D
        symbols.forEach(symbol => {
            timeframes.forEach(timeframe => {
                const subscription = {
                    "op": "subscribe",
                    "args": [`kline.${timeframe}.${symbol}`]
                };
                console.log('Subscribing to:', subscription);
                this.ws.send(JSON.stringify(subscription));
            });
            
            // Subscribe to orderbook
            this.ws.send(JSON.stringify({
                "op": "subscribe",
                "args": [`orderbook.25.${symbol}`]
            }));
        });
    }

    async onmessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.topic && data.topic.startsWith('orderbook')) {
                this.handleOrderBookUpdate(data);
            } else if (data.topic && data.topic.startsWith('kline')) {
                this.handleKlineUpdate(data);
            }
            
            this.notifySubscribers(data.topic, data);
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }

    handleOrderBookUpdate(data) {
        const symbol = data.topic.split('.')[2];
        
        if (!this.orderBook.has(symbol)) {
            this.orderBook.set(symbol, {
                bids: new Map(),
                asks: new Map()
            });
        }
        
        const orderBook = this.orderBook.get(symbol);
        
        // Update bids and asks
        if (data.data && data.data.b) { // bids
            data.data.b.forEach(([price, size]) => {
                if (parseFloat(size) === 0) {
                    orderBook.bids.delete(price);
                } else {
                    orderBook.bids.set(price, parseFloat(size));
                }
            });
        }
        
        if (data.data && data.data.a) { // asks
            data.data.a.forEach(([price, size]) => {
                if (parseFloat(size) === 0) {
                    orderBook.asks.delete(price);
                } else {
                    orderBook.asks.set(price, parseFloat(size));
                }
            });
        }
        
        // Maintain orderbook depth
        this.trimOrderBook(orderBook.bids);
        this.trimOrderBook(orderBook.asks);
        
        // Notify subscribers
        this.notifySubscribers(`orderbook.${symbol}`, {
            bids: Array.from(orderBook.bids.entries()),
            asks: Array.from(orderBook.asks.entries())
        });
    }

    trimOrderBook(book) {
        const sortedEntries = Array.from(book.entries())
            .sort(([priceA], [priceB]) => parseFloat(priceB) - parseFloat(priceA))
            .slice(0, this.orderBookDepth);
        
        book.clear();
        sortedEntries.forEach(([price, size]) => book.set(price, size));
    }

    getOrderBook(symbol) {
        return this.orderBook.get(symbol) || { bids: new Map(), asks: new Map() };
    }

    handleKlineUpdate(data) {
        console.log('Received kline data:', data);
        if (data.topic && data.data) {
            this.notifySubscribers(data.topic, data.data);
        }
    }

    onerror(error) {
        console.error('WebSocket error:', error);
    }

    onclose() {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        this.reconnectTimeout = setTimeout(() => this.initWebSocket([]), 5000);
    }

    // Subscribe to updates for a specific symbol and timeframe
    subscribe(topic, callback) {
        console.log('Subscribing to topic:', topic);
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set());
        }
        this.subscribers.get(topic).add(callback);
    }

    // Notify subscribers of updates
    notifySubscribers(topic, data) {
        console.log('Notifying subscribers for topic:', topic, 'with data:', data);
        if (this.subscribers.has(topic)) {
            this.subscribers.get(topic).forEach(callback => callback(data));
        }
    }

    // Fetch historical kline data
    async fetchKlines(symbol, interval = '60', limit = 100) {
        // Map timeframe to Bybit V5 API interval format
        const intervalMap = {
            '15': '15',
            '60': '60',
            '240': '240',
            '720': '720',
            'D': 'D'
        };

        const bybitInterval = intervalMap[interval] || '60';
        console.log('Fetching klines for:', symbol, 'interval:', bybitInterval);

        try {
            // Updated URL format for V5 API
            const url = `${this.baseUrl}/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`;
            console.log('Fetching from URL:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Raw Bybit response:', data);

            // Check for API error
            if (data.retCode !== 0) {
                console.error('API Error:', data.retMsg);
                return [];
            }

            // Check the exact structure of the response
            if (!data.result || !data.result.list) {
                console.error('Unexpected API response structure:', data);
                return [];
            }

            // Bybit V5 API returns data in reverse chronological order
            const klines = data.result.list
                .map(k => [
                    parseInt(k[0]),      // timestamp
                    parseFloat(k[1]),    // open
                    parseFloat(k[2]),    // high
                    parseFloat(k[3]),    // low
                    parseFloat(k[4]),    // close
                    parseFloat(k[5])     // volume
                ])
                .reverse(); // Reverse to get chronological order

            console.log('Processed klines:', klines);
            return klines;
        } catch (error) {
            console.error('Error fetching kline data:', error);
            return [];
        }
    }

    // Calculate RSI
    calculateRSI(klines, period = 14) {
        if (klines.length < period + 1) {
            return [];
        }

        const closes = klines.map(k => k.close);
        let gains = 0;
        let losses = 0;

        // Calculate initial averages
        for (let i = 1; i <= period; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff >= 0) {
                gains += diff;
            } else {
                losses -= diff;
            }
        }

        gains /= period;
        losses /= period;

        const rsiValues = [];
        let rs = gains / losses;
        let rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);

        // Calculate RSI for remaining periods
        for (let i = period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            let gain = 0;
            let loss = 0;

            if (diff >= 0) {
                gain = diff;
            } else {
                loss = -diff;
            }

            gains = ((gains * (period - 1)) + gain) / period;
            losses = ((losses * (period - 1)) + loss) / period;

            rs = gains / losses;
            rsi = 100 - (100 / (1 + rs));
            rsiValues.push(rsi);
        }

        return rsiValues;
    }

    // Calculate Bollinger Bands
    calculateBollingerBands(klines, period = 20, stdDev = 2) {
        if (klines.length < period) {
            return [];
        }

        const closes = klines.map(k => k.close);
        const bands = [];

        for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            const sma = slice.reduce((a, b) => a + b, 0) / period;
            const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
            const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
            const standardDeviation = Math.sqrt(variance);

            bands.push({
                middle: sma,
                upper: sma + (standardDeviation * stdDev),
                lower: sma - (standardDeviation * stdDev)
            });
        }

        return bands;
    }

    // Calculate EMA
    calculateEMA(klines, period) {
        if (klines.length < period) {
            return [];
        }

        const closes = klines.map(k => k.close);
        const k = 2 / (period + 1);
        const emaValues = [];

        // Calculate initial SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += closes[i];
        }
        let ema = sum / period;
        emaValues.push(ema);

        // Calculate EMA for remaining periods
        for (let i = period; i < closes.length; i++) {
            ema = (closes[i] * k) + (ema * (1 - k));
            emaValues.push(ema);
        }

        return emaValues;
    }

    // Calculate MACD
    calculateMACD(klines, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (klines.length < slowPeriod + signalPeriod) {
            return [];
        }

        const closes = klines.map(k => k.close);
        const macdValues = [];

        // Calculate fast and slow EMAs
        const fastEMA = this.calculateEMA(klines, fastPeriod);
        const slowEMA = this.calculateEMA(klines, slowPeriod);

        // Calculate MACD line
        const macdLine = [];
        for (let i = slowPeriod - 1; i < closes.length; i++) {
            const fastIndex = i - (slowPeriod - fastPeriod);
            macdLine.push(fastEMA[fastIndex] - slowEMA[i - (slowPeriod - 1)]);
        }

        // Calculate signal line (9-day EMA of MACD line)
        const k = 2 / (signalPeriod + 1);
        const signalLine = [];
        
        // Initial signal value (SMA of first 9 MACD values)
        let sum = 0;
        for (let i = 0; i < signalPeriod; i++) {
            sum += macdLine[i];
        }
        let signal = sum / signalPeriod;
        signalLine.push(signal);

        // Calculate remaining signal values
        for (let i = signalPeriod; i < macdLine.length; i++) {
            signal = (macdLine[i] * k) + (signal * (1 - k));
            signalLine.push(signal);
        }

        // Calculate histogram
        for (let i = 0; i < signalLine.length; i++) {
            macdValues.push({
                macd: macdLine[i + signalPeriod - 1],
                signal: signalLine[i],
                histogram: macdLine[i + signalPeriod - 1] - signalLine[i]
            });
        }

        return macdValues;
    }

    // Update technical indicators
    updateTechnicalIndicators(candles) {
        // Existing indicator updates
        this.updateRSI(candles);
        this.updateMACD(candles);
        this.updateMovingAverages(candles);
        this.updateBollingerBands(candles);
        
        // Add OBV update
        updateOBVIndicator(candles);
    }

    // Clean up WebSocket connection
    cleanup() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.subscribers.clear();
    }
}

export default BybitDataHandler;
