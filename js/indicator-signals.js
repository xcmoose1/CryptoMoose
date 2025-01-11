import { htxHandler, HTX_CONFIG } from './config/htx-config.js';

export class IndicatorSignals {
    constructor() {
        if (IndicatorSignals.instance) {
            return IndicatorSignals.instance;
        }
        IndicatorSignals.instance = this;

        this.elementIds = {
            volume: 'volume-indicator',
            rsi: 'rsi-indicator',
            macd: 'macd-indicator',
            bb: 'bb-indicator',
            atr: 'atr-indicator',
            pivot: 'pivot-indicator',
            vwap: 'vwap-indicator',
            williamsr: 'williamsr-indicator',
            mfi: 'mfi-indicator',
            emaShort: 'ema-short-indicator',
            emaLong: 'ema-long-indicator',
            ichimoku: 'ichimoku-indicator',
            fibonacci: 'fibonacci-indicator',
            supertrend: 'supertrend-indicator',
            marketSentiment: 'market-sentiment',
            position: 'position-signal'
        };
        
        this.timeframe = '60min';  // HTX format for 1h
        this.updateIntervals = {
            '60min': 60 * 1000,       // 1 minute
            '4hour': 4 * 60 * 1000,   // 4 minutes
            '1day': 15 * 60 * 1000,   // 15 minutes
            '1week': 30 * 60 * 1000   // 30 minutes
        };
        this.lastUpdate = {};
        this.indicators = {};
        this.errorState = false;
        this.currentPair = 'BTCUSDT';
        this.updateInterval = 60000; // 1 minute
        this.updateTimer = null;
        this.retryAttempts = 3;
        this.retryDelay = 2000;
        this.requestQueue = new RequestQueue();
        this.cache = new Map();
        this.setupEventListeners();
    }

    async init() {
        try {
            console.log('Initializing Indicator Signals...');
            
            // Wait for HTX Handler to be initialized
            if (!htxHandler.isInitialized()) {
                console.log('Waiting for HTX Handler to initialize...');
                await htxHandler.init();
            }

            // Initialize timeframes
            await this.initializeTimeframes();
            
            console.log('Indicator Signals initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Indicator Signals:', error);
            throw error;
        }
    }

    async initializeTimeframes() {
        console.log('Initializing timeframes...');
        // Initialize last update times for each timeframe
        Object.keys(this.updateIntervals).forEach(timeframe => {
            this.lastUpdate[timeframe] = 0; // Start with 0 to force initial update
            this.indicators[timeframe] = null;
        });

        // Initial load for all timeframes
        await this.updateAllTimeframes();
    }

    async updateAllTimeframes() {
        for (const timeframe of Object.keys(this.updateIntervals)) {
            await this.updateIndicators(timeframe);
        }
    }

    shouldUpdate(timeframe) {
        const now = Date.now();
        const lastUpdate = this.lastUpdate[timeframe] || 0;
        const interval = this.updateIntervals[timeframe];
        return now - lastUpdate >= interval;
    }

    async updateIndicators(timeframe) {
        try {
            const params = new URLSearchParams({
                symbol: this.currentPair.toLowerCase(),
                period: timeframe,
                size: 200
            });

            const cacheKey = `${this.currentPair}-${timeframe}`;
            const now = Date.now();
            const cachedData = this.cache?.get(cacheKey);

            // Use cached data if it's fresh enough
            if (cachedData && (now - cachedData.timestamp) < this.updateIntervals[timeframe]) {
                console.log('Using cached data for', timeframe);
                this.updateUI(timeframe, cachedData.data);
                return cachedData.data;
            }

            try {
                const response = await htxHandler.getKlines(this.currentPair, timeframe, 200);
                
                if (!Array.isArray(response) || response.length === 0) {
                    console.warn('No kline data received, using cached data if available');
                    if (cachedData) {
                        this.updateUI(timeframe, cachedData.data);
                        return cachedData.data;
                    }
                    throw new Error('No kline data received');
                }

                // Process kline data
                const data = this.processKlineData(response);
                
                // Cache the new data
                this.cache.set(cacheKey, {
                    data,
                    timestamp: now
                });

                this.updateUI(timeframe, data);
                this.clearError();
                return data;

            } catch (error) {
                if (error.message.includes('request limit')) {
                    // If we hit rate limit, use cached data and retry later
                    console.warn('Rate limit hit, using cached data');
                    if (cachedData) {
                        this.updateUI(timeframe, cachedData.data);
                        return cachedData.data;
                    }
                }
                throw error;
            }

        } catch (error) {
            this.handleError(error);
            // Return dummy data to prevent UI breaks
            return this.getDummyData();
        }
    }

    processKlineData(klines) {
        const closes = klines.map(k => parseFloat(k[4]));
        const highs = klines.map(k => parseFloat(k[2]));
        const lows = klines.map(k => parseFloat(k[3]));
        const volumes = klines.map(k => parseFloat(k[5]));

        return {
            price: closes[closes.length - 1],
            volume: volumes[volumes.length - 1],
            rsi: this.calculateRSI(closes),
            macd: this.calculateMACD(closes),
            bb: this.calculateBollingerBands(closes),
            atr: this.calculateATR(highs, lows, closes),
            vwap: this.calculateVWAP(highs, lows, closes, volumes),
            williamsr: this.calculateWilliamsR(highs, lows, closes),
            mfi: this.calculateMFI(highs, lows, closes, volumes),
            ema: {
                short: this.calculateEMA(closes, 8),
                long: this.calculateEMA(closes, 20)
            }
        };
    }

    getDummyData() {
        return {
            price: 0,
            volume: 0,
            rsi: 50,
            macd: { macdLine: [0], signalLine: [0], histogram: [0] },
            bb: { upper: [0], middle: [0], lower: [0] },
            atr: 0,
            vwap: 0,
            williamsr: -50,
            mfi: 50,
            ema: {
                short: 0,
                long: 0
            }
        };
    }

    startUpdateCycle() {
        // Clear existing timer if any
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        // Create a map to track last update time for each timeframe
        const lastUpdates = new Map();

        // Function to check if an update is needed for a timeframe
        const needsUpdate = (timeframe) => {
            const now = Date.now();
            const lastUpdate = lastUpdates.get(timeframe) || 0;
            const interval = this.updateIntervals[timeframe];
            return now - lastUpdate >= interval;
        };

        // Function to update a specific timeframe
        const updateTimeframe = async (timeframe) => {
            if (!needsUpdate(timeframe)) {
                return;
            }

            try {
                await this.updateIndicators(timeframe);
                lastUpdates.set(timeframe, Date.now());
            } catch (error) {
                console.error(`Error updating ${timeframe} indicators:`, error);
            }
        };

        // Initial update for all timeframes
        Object.keys(this.updateIntervals).forEach(timeframe => {
            updateTimeframe(timeframe);
        });

        // Set up the update cycle
        this.updateTimer = setInterval(() => {
            // Get current timeframe from active button
            const activeTimeframeBtn = document.querySelector('.timeframe-btn.active');
            const currentTimeframe = activeTimeframeBtn ? activeTimeframeBtn.dataset.timeframe : '60min';

            // Always update the current timeframe if needed
            updateTimeframe(currentTimeframe);

            // Update other timeframes less frequently
            Object.keys(this.updateIntervals).forEach(timeframe => {
                if (timeframe !== currentTimeframe && needsUpdate(timeframe)) {
                    updateTimeframe(timeframe);
                }
            });
        }, 60000); // Check every 1 minute
    }

    setTimeframe(timeframe) {
        this.timeframe = timeframe;
        
        // Update UI with cached data if available
        if (this.indicators[timeframe]) {
            this.updateUI(timeframe, this.indicators[timeframe]);
        }
        
        // Update if needed
        this.updateIndicators(timeframe);
    }

    setupEventListeners() {
        // Trading pair change event
        const tradingPairSelect = document.getElementById('tradingPair');
        if (tradingPairSelect) {
            tradingPairSelect.addEventListener('change', (e) => {
                this.currentPair = e.target.value;
                this.updateIndicators();
            });
        }

        // Timeframe buttons event
        const timeframeButtons = document.querySelectorAll('.timeframe-btn');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active state
                timeframeButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                // Update timeframe and indicators
                this.setTimeframe(e.target.dataset.timeframe);
            });
        });
    }

    async init() {
        try {
            this.initializeElements();
            if (!this.validateElements()) {
                throw new Error('Failed to initialize all required indicator elements');
            }
            console.log('Indicator Signals initialized successfully');
            await this.updateIndicators();
            this.startUpdateCycle();
            return true;
        } catch (error) {
            console.error('Failed to initialize Indicator Signals:', error);
            this.handleError(error);
            throw error;
        }
    }

    initializeElements() {
        Object.entries(this.elementIds).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (element) {
                this.indicators[key] = element;
                // Clear any previous error states
                element.classList.remove('error', 'bullish', 'bearish', 'neutral');
                
                // Update loading state
                const valueElement = element.querySelector('.indicator-value');
                if (valueElement) {
                    valueElement.textContent = 'Loading...';
                }
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        });
    }

    validateElements() {
        const missingElements = Object.entries(this.elementIds)
            .filter(([key]) => !this.indicators[key])
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.warn('Missing indicator elements:', missingElements);
            return false;
        }
        return true;
    }

    handleError(error) {
        this.errorState = true;
        Object.values(this.indicators).forEach(element => {
            if (element) {
                element.classList.add('error');
                element.classList.remove('bullish', 'bearish', 'neutral');
                const valueElement = element.querySelector('.indicator-value');
                if (valueElement) {
                    valueElement.textContent = 'Error';
                }
            }
        });
        console.error('Indicator error:', error);
    }

    clearError() {
        this.errorState = false;
        Object.values(this.indicators).forEach(element => {
            if (element) {
                element.classList.remove('error', 'bullish', 'bearish', 'neutral');
                const valueElement = element.querySelector('.indicator-value');
                if (valueElement) {
                    valueElement.textContent = 'Loading...';
                }
            }
        });
    }

    updateIndicator(type, value, signal) {
        const element = this.indicators[type];
        if (!element) {
            console.warn(`No element found for indicator type: ${type}`);
            return;
        }

        // Remove previous signal classes
        element.classList.remove('bullish', 'bearish', 'neutral');
        
        // Add new signal class
        if (signal) {
            element.classList.add(signal.toLowerCase());
        }

        // Update the value
        const valueElement = element.querySelector('.indicator-value');
        if (valueElement) {
            valueElement.textContent = this.formatIndicatorValue(type, value, signal);
        } else {
            console.warn(`No value element found for indicator type: ${type}`);
        }
    }

    formatIndicatorValue(type, value, signal) {
        if (value === undefined || value === null) {
            return 'N/A';
        }

        try {
            switch (type) {
                case 'rsi':
                    return typeof value === 'number' ? value.toFixed(2) : 'N/A';
                case 'macd':
                    if (value && value.macdLine && Array.isArray(value.macdLine) && value.macdLine.length > 0) {
                        const macd = value.macdLine[value.macdLine.length - 1];
                        const signal = value.signalLine[value.signalLine.length - 1];
                        const hist = value.histogram[value.histogram.length - 1];
                        if (typeof macd === 'number' && typeof signal === 'number' && typeof hist === 'number') {
                            return `MACD: ${macd.toFixed(2)} | Signal: ${signal.toFixed(2)} | Hist: ${hist.toFixed(2)}`;
                        }
                    }
                    if (Array.isArray(value)) {
                        const lastValue = value[value.length - 1];
                        return typeof lastValue === 'number' ? lastValue.toFixed(2) : 'N/A';
                    }
                    return 'N/A';
                case 'bb':
                case 'bollinger':
                    if (value && value.middle && Array.isArray(value.middle)) {
                        const mid = value.middle[value.middle.length - 1];
                        const upper = value.upper[value.upper.length - 1];
                        const lower = value.lower[value.lower.length - 1];
                        if (typeof mid === 'number' && typeof upper === 'number' && typeof lower === 'number') {
                            return `M: ${mid.toFixed(2)} | U: ${upper.toFixed(2)} | L: ${lower.toFixed(2)}`;
                        }
                    }
                    return 'N/A';
                case 'atr':
                case 'vwap':
                case 'williamsr':
                case 'mfi':
                    if (Array.isArray(value)) {
                        const lastValue = value[value.length - 1];
                        return typeof lastValue === 'number' ? lastValue.toFixed(2) : 'N/A';
                    }
                    return typeof value === 'number' ? value.toFixed(2) : 'N/A';
                case 'pivot':
                case 'pivots':
                    if (value && typeof value.pp === 'number') {
                        return `PP: ${value.pp.toFixed(2)} | R1: ${value.r1.toFixed(2)} | S1: ${value.s1.toFixed(2)}`;
                    }
                    return 'N/A';
                case 'emaShort':
                    return value && typeof value.ema8 === 'number' && typeof value.ema20 === 'number' 
                        ? `8: ${value.ema8.toFixed(2)} | 20: ${value.ema20.toFixed(2)}` 
                        : 'N/A';
                case 'emaLong':
                    return value && typeof value.ema50 === 'number' && typeof value.ema200 === 'number'
                        ? `50: ${value.ema50.toFixed(2)} | 200: ${value.ema200.toFixed(2)}`
                        : 'N/A';
                case 'ichimoku':
                    return value && value.cloud && value.signal 
                        ? `Cloud: ${value.cloud} | ${value.signal}`
                        : 'N/A';
                case 'fibonacci':
                    return value && value.level && typeof value.price === 'number'
                        ? `${value.level}: ${value.price.toFixed(2)}`
                        : 'N/A';
                case 'supertrend':
                    return value && value.trend && typeof value.value === 'number'
                        ? `${value.trend}: ${value.value.toFixed(2)}`
                        : 'N/A';
                default:
                    return typeof value === 'number' ? value.toFixed(2) : String(value);
            }
        } catch (error) {
            console.error(`Error formatting value for ${type}:`, error);
            return 'N/A';
        }
    }

    async fetchWithRetry(endpoint, attempts = this.retryAttempts) {
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await fetch(endpoint);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(JSON.stringify({
                        status: response.status,
                        statusText: response.statusText,
                        error: errorData
                    }));
                }
                
                const data = await response.json();
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid response format');
                }
                
                return data;
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error);
                if (i === attempts - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
            }
        }
    }

    validateIndicatorData(data) {
        try {
            if (!data || !data.code || data.code !== 200 || !data.data || !data.data.indicators) {
                console.error('Invalid response structure:', data);
                return false;
            }

            // Basic structure validation is enough
            return true;
        } catch (error) {
            console.error('Error validating indicator data:', error);
            return false;
        }
    }

    async updateUI(timeframe, data) {
        try {
            // Update price and volume
            this.updateIndicatorValue('volume', data.volume);
            
            // Update RSI
            this.updateIndicatorValue('rsi', data.rsi);
            
            // Update MACD
            this.updateIndicatorValue('macd', data.macd);
            
            // Update Bollinger Bands
            this.updateIndicatorValue('bb', data.bb);
            
            // Update ATR
            this.updateIndicatorValue('atr', data.atr);
            
            // Update VWAP
            this.updateIndicatorValue('vwap', data.vwap);
            
            // Update Williams %R
            this.updateIndicatorValue('williamsr', data.williamsr);
            
            // Update MFI
            this.updateIndicatorValue('mfi', data.mfi);
            
            // Update EMAs
            this.updateIndicatorValue('emaShort', data.ema.short);
            this.updateIndicatorValue('emaLong', data.ema.long);
            
            // Update market sentiment
            this.updateMarketSentiment(data);
            
            // Clear any previous errors
            this.clearError();
        } catch (error) {
            console.error('Error updating UI:', error);
            this.handleError(error);
        }
    }

    updateIndicatorValue(type, value) {
        const element = document.getElementById(this.elementIds[type]);
        if (!element) {
            console.warn(`Element not found for indicator: ${type}`);
            return;
        }

        // Remove previous classes
        element.classList.remove('bullish', 'bearish', 'neutral');

        let signal = this.getSignal(type, value);
        let displayValue = this.formatValue(type, value);

        // Add new class based on signal
        element.classList.add(signal.toLowerCase());
        
        // Update the text
        element.textContent = displayValue;
    }

    getSignal(type, value) {
        if (value === null || value === undefined) return 'neutral';

        switch (type) {
            case 'rsi':
                if (value > 70) return 'bearish';
                if (value < 30) return 'bullish';
                break;
            case 'macd':
                return value > 0 ? 'bullish' : 'bearish';
            case 'williamsr':
                if (value > -20) return 'bearish';
                if (value < -80) return 'bullish';
                break;
            case 'mfi':
                if (value > 80) return 'bearish';
                if (value < 20) return 'bullish';
                break;
        }
        return 'neutral';
    }

    formatValue(type, value) {
        if (value === null || value === undefined) return 'N/A';

        switch (type) {
            case 'volume':
                return this.formatVolume(value);
            case 'rsi':
            case 'mfi':
                return value.toFixed(2);
            case 'macd':
                return value.toFixed(4);
            case 'williamsr':
                return value.toFixed(2) + '%';
            case 'emaShort':
            case 'emaLong':
                return value.toFixed(2);
            default:
                return value.toString();
        }
    }

    formatVolume(volume) {
        if (volume >= 1e9) {
            return (volume / 1e9).toFixed(2) + 'B';
        } else if (volume >= 1e6) {
            return (volume / 1e6).toFixed(2) + 'M';
        } else if (volume >= 1e3) {
            return (volume / 1e3).toFixed(2) + 'K';
        }
        return volume.toFixed(2);
    }

    updateMarketSentiment(data) {
        const element = document.getElementById(this.elementIds.marketSentiment);
        if (!element) return;

        const valueElement = element.querySelector('.value');
        if (!valueElement) return;

        let sentiment = this.calculateMarketSentiment(data);
        valueElement.textContent = sentiment.text;
        valueElement.className = 'value ' + sentiment.class;
    }

    calculateMarketSentiment(data) {
        let bullishSignals = 0;
        let bearishSignals = 0;

        // Count signals from each indicator
        if (data.rsi < 30) bullishSignals++;
        else if (data.rsi > 70) bearishSignals++;

        if (data.macd > 0) bullishSignals++;
        else if (data.macd < 0) bearishSignals++;

        if (data.williamsr < -80) bullishSignals++;
        else if (data.williamsr > -20) bearishSignals++;

        if (data.mfi < 20) bullishSignals++;
        else if (data.mfi > 80) bearishSignals++;

        // Calculate sentiment
        const totalSignals = bullishSignals + bearishSignals;
        const sentimentScore = (bullishSignals - bearishSignals) / totalSignals;

        if (sentimentScore > 0.5) {
            return { text: 'Strongly Bullish', class: 'bullish' };
        } else if (sentimentScore > 0) {
            return { text: 'Moderately Bullish', class: 'bullish' };
        } else if (sentimentScore < -0.5) {
            return { text: 'Strongly Bearish', class: 'bearish' };
        } else if (sentimentScore < 0) {
            return { text: 'Moderately Bearish', class: 'bearish' };
        }
        return { text: 'Neutral', class: 'neutral' };
    }

    handleUpdateError(error) {
        let errorMessage = 'Error updating indicators';
        
        try {
            const errorDetail = JSON.parse(error.message);
            if (errorDetail.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (errorDetail.status === 429) {
                errorMessage = 'Too many requests. Please wait.';
            }
        } catch (e) {
            errorMessage = error.message;
        }

        this.handleError(errorMessage);
        
        // Trigger retry after delay if appropriate
        if (error.message.includes('500')) {
            setTimeout(() => this.updateIndicators(), 5000);
        }
    }

    stopUpdateCycle() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    updateSymbol(symbol) {
        this.currentPair = symbol;
        this.updateIndicators();
    }

    updateTimeframe(timeframe) {
        this.timeframe = timeframe;
        this.updateIndicators();
    }

    // Technical Indicator Calculations
    calculateRSI(prices, period = 14) {
        if (prices.length < period) {
            return null;
        }

        let gains = [];
        let losses = [];

        // Calculate price changes
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }

        // Calculate initial average gain and loss
        let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

        // Calculate subsequent values using smoothing
        for (let i = period; i < gains.length; i++) {
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
        }

        if (avgLoss === 0) {
            return 100;
        }

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) {
            return null;
        }

        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        
        return fastEMA - slowEMA;
    }

    calculateEMA(prices, period) {
        if (prices.length < period) {
            return null;
        }

        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }

        return ema;
    }

    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) {
            return null;
        }

        const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
        const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
        const std = Math.sqrt(variance);

        const upperBand = sma + (stdDev * std);
        const lowerBand = sma - (stdDev * std);
        const currentPrice = prices[prices.length - 1];

        // Return position relative to bands (-1 to 1)
        return (currentPrice - lowerBand) / (upperBand - lowerBand) * 2 - 1;
    }

    calculateATR(highs, lows, closes, period = 14) {
        if (highs.length < period || lows.length < period || closes.length < period) {
            return null;
        }

        let trs = [Math.abs(highs[0] - lows[0])]; // First TR is just the first day's range

        // Calculate subsequent TRs
        for (let i = 1; i < highs.length; i++) {
            const tr = Math.max(
                Math.abs(highs[i] - lows[i]), // Current day's range
                Math.abs(highs[i] - closes[i - 1]), // Current high - previous close
                Math.abs(lows[i] - closes[i - 1]) // Current low - previous close
            );
            trs.push(tr);
        }

        // Calculate ATR using Wilder's smoothing
        let atr = trs.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
        for (let i = period; i < trs.length; i++) {
            atr = ((atr * (period - 1)) + trs[i]) / period;
        }

        return atr;
    }

    calculateVWAP(highs, lows, closes, volumes) {
        if (!highs.length || !lows.length || !closes.length || !volumes.length) {
            return null;
        }

        let cumulativeTPV = 0; // Cumulative Typical Price * Volume
        let cumulativeVolume = 0;

        for (let i = 0; i < closes.length; i++) {
            const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
            cumulativeTPV += typicalPrice * volumes[i];
            cumulativeVolume += volumes[i];
        }

        return cumulativeVolume === 0 ? null : cumulativeTPV / cumulativeVolume;
    }

    calculateWilliamsR(highs, lows, closes, period = 14) {
        if (highs.length < period || lows.length < period || closes.length < period) {
            return null;
        }

        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        const currentClose = closes[closes.length - 1];

        const highestHigh = Math.max(...recentHighs);
        const lowestLow = Math.min(...recentLows);

        if (highestHigh === lowestLow) {
            return -50; // Neutral when price hasn't moved
        }

        return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    }

    calculateMFI(highs, lows, closes, volumes, period = 14) {
        if (highs.length < period || lows.length < period || closes.length < period || volumes.length < period) {
            return null;
        }

        let positiveMF = 0;
        let negativeMF = 0;

        // Calculate typical prices
        const typicalPrices = highs.map((high, i) => (high + lows[i] + closes[i]) / 3);

        // Calculate raw money flow values
        for (let i = 1; i < typicalPrices.length; i++) {
            const rawMoneyFlow = typicalPrices[i] * volumes[i];
            if (typicalPrices[i] > typicalPrices[i - 1]) {
                positiveMF += rawMoneyFlow;
            } else {
                negativeMF += rawMoneyFlow;
            }
        }

        if (negativeMF === 0) {
            return 100;
        }

        const moneyFlowRatio = positiveMF / negativeMF;
        return 100 - (100 / (1 + moneyFlowRatio));
    }
}

// Request Queue implementation
class RequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.rateLimit = 100; // HTX allows 100 requests per second
        this.requestCount = 0;
        this.resetTime = Date.now() + 1000;
        this.retryDelay = 1000;
        this.maxRetries = 3;
    }

    async add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ 
                request, 
                resolve, 
                reject,
                retries: 0
            });
            if (!this.processing) {
                this.process();
            }
        });
    }

    async process() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const now = Date.now();

        // Reset counter if we've passed the reset time
        if (now >= this.resetTime) {
            this.requestCount = 0;
            this.resetTime = now + 1000;
        }

        // Check if we've hit the rate limit
        if (this.requestCount >= this.rateLimit) {
            const waitTime = this.resetTime - now;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.process();
            return;
        }

        const { request, resolve, reject, retries } = this.queue[0];

        try {
            const response = await request();
            this.requestCount++;
            this.queue.shift();
            resolve(response);
        } catch (error) {
            if (retries < this.maxRetries && this.shouldRetry(error)) {
                // Move to end of queue with incremented retry count
                const item = this.queue.shift();
                item.retries++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
                this.queue.push(item);
            } else {
                this.queue.shift();
                reject(error);
            }
        }

        // Process next request
        this.process();
    }

    shouldRetry(error) {
        // Retry on network errors or specific API errors
        return error.code === 'ECONNRESET' || 
               error.code === 'ETIMEDOUT' ||
               error.status === 500 || // Internal Server Error
               error.status === 502 || // Bad Gateway
               error.status === 503 || // Service Unavailable
               error.status === 504;   // Gateway Timeout
    }
}

// Create and export singleton instance
const indicatorSignals = new IndicatorSignals();
export { indicatorSignals };
