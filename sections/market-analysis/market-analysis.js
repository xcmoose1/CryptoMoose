// @ts-check

// Market Analysis Module
import { createChart } from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { HTX_CONFIG } from '../../js/config/htx-config.js';
import { htxWebSocket } from '../../js/websocket/htx-websocket.js';
import { indicatorUpdater } from '../../js/indicator-updater.js';

class MarketAnalysisSection {
    constructor() {
        this.chart = null;
        this.candleSeries = null;
        this.volumeSeries = null;
        this.initialized = false;
        this.currentPair = HTX_CONFIG.MARKET_CONFIG.DEFAULT_SYMBOL;
        this.currentTimeframe = HTX_CONFIG.MARKET_CONFIG.DEFAULT_INTERVAL;
        this.ws = htxWebSocket;
        this.sentiment = null;
        this.position = null;
        this.debugElement = null;
        this._resizeHandler = null;
    }

    logDebug(message, isError = false) {
        console.log(message);
        this.debugElement = this.debugElement || document.getElementById('debug-status');
        if (this.debugElement) {
            const timestamp = new Date().toLocaleTimeString();
            const color = isError ? '#ff4444' : '#44ff44';
            this.debugElement.innerHTML += `<div style="color: ${color}">[${timestamp}] ${message}</div>`;
            this.debugElement.scrollTop = this.debugElement.scrollHeight;
        }
    }

    setupIndicators() {
        // Setup indicators after DOM is ready
        setTimeout(() => {
            this.indicators = {
                volume: document.getElementById('volume-indicator'),
                rsi: document.getElementById('rsi-indicator'),
                macd: document.getElementById('macd-indicator'),
                stoch: document.getElementById('stoch-indicator'),
                bb: document.getElementById('bb-indicator'),
                ema: document.getElementById('ema-indicator'),
                adx: document.getElementById('adx-indicator'),
                obv: document.getElementById('obv-indicator')
            };
            this.sentiment = document.getElementById('market-sentiment');
            this.position = document.getElementById('position-signal');
            
            // Initialize indicator updater
            indicatorUpdater.init().catch(error => {
                this.logDebug(`Failed to initialize indicators: ${error}`, true);
            });
        }, 0);
    }

    async init() {
        if (this.initialized) {
            console.log('Market analysis already initialized');
            return;
        }

        try {
            console.log('Initializing market analysis...');
            
            // Setup indicators first
            this.setupIndicators();
            
            // Initialize WebSocket first
            console.log('Initializing WebSocket...');
            await this.ws.init();
            
            // Setup chart
            console.log('Setting up chart...');
            await this.setupChart();
            
            // Load initial data
            console.log('Loading initial data...');
            await this.updateAllData();
            
            // Subscribe to market data
            console.log('Subscribing to market data...');
            await this.subscribeToMarketData();

            this.initialized = true;
            console.log('Market analysis initialized successfully');
        } catch (error) {
            console.error('Failed to initialize market analysis:', error);
            this.initialized = false;
            throw error;
        }
    }

    async setupChart() {
        try {
            console.log('Setting up chart...');
            const container = document.getElementById('marketAnalysisChart');
            if (!container) {
                throw new Error('Chart container not found');
            }

            // If chart already exists, clean it up first
            if (this.chart) {
                console.log('Removing existing chart...');
                container.innerHTML = '';
                this.chart.remove();
                this.chart = null;
                this.candleSeries = null;
                this.volumeSeries = null;
            }

            // Wait for the container to be properly sized
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('Chart container dimensions:', {
                width: container.clientWidth,
                height: container.clientHeight
            });

            // Set minimum dimensions if container is too small
            const width = Math.max(container.clientWidth || 800, 800);
            const height = Math.max(container.clientHeight || 400, 400);

            // Create chart with default options
            this.chart = createChart(container, {
                width: width,
                height: height,
                layout: {
                    background: { type: 'solid', color: '#1e222d' },
                    textColor: '#ddd',
                },
                grid: {
                    vertLines: { color: '#2b2b43' },
                    horzLines: { color: '#2b2b43' },
                },
                crosshair: {
                    mode: 1,
                },
                rightPriceScale: {
                    borderColor: '#485c7b',
                    visible: true,
                    borderVisible: true,
                },
                timeScale: {
                    borderColor: '#485c7b',
                    timeVisible: true,
                    secondsVisible: false,
                    borderVisible: true,
                },
                handleScroll: {
                    mouseWheel: true,
                    pressedMouseMove: true,
                },
                handleScale: {
                    axisPressedMouseMove: true,
                    mouseWheel: true,
                    pinch: true,
                }
            });

            // Add candlestick series
            this.candleSeries = this.chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                priceFormat: {
                    type: 'price',
                    precision: 2,
                    minMove: 0.01,
                }
            });

            // Add volume series
            this.volumeSeries = this.chart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '', // Set to empty string for overlay
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });

            // Handle window resize
            if (!this._resizeHandler) {
                this._resizeHandler = () => {
                    if (this.chart) {
                        const newWidth = Math.max(container.clientWidth || 800, 800);
                        const newHeight = Math.max(container.clientHeight || 400, 400);
                        this.chart.resize(newWidth, newHeight);
                    }
                };
                window.addEventListener('resize', this._resizeHandler);
            }

            console.log('Chart setup complete');
            console.log('Candle series:', this.candleSeries);
            console.log('Volume series:', this.volumeSeries);
        } catch (error) {
            console.error('Failed to setup chart:', error);
            throw error;
        }
    }

    async updateAllData() {
        try {
            console.log('Fetching historical data...');
            const historicalData = await this.fetchHistoricalData();
            
            if (!Array.isArray(historicalData) || historicalData.length === 0) {
                console.warn('No historical data received');
                return;
            }

            // Sort data by timestamp
            historicalData.sort((a, b) => a.time - b.time);

            // Validate and format data
            const validData = historicalData.filter(candle => {
                return candle && 
                       typeof candle.time === 'number' && !isNaN(candle.time) &&
                       typeof candle.open === 'number' && !isNaN(candle.open) &&
                       typeof candle.high === 'number' && !isNaN(candle.high) &&
                       typeof candle.low === 'number' && !isNaN(candle.low) &&
                       typeof candle.close === 'number' && !isNaN(candle.close) &&
                       typeof candle.volume === 'number' && !isNaN(candle.volume);
            });

            if (validData.length === 0) {
                console.warn('No valid candles in historical data');
                return;
            }

            console.log(`Setting ${validData.length} historical candles`);
            
            // Set data to chart
            if (this.candleSeries) {
                this.candleSeries.setData(validData);
            }

            // Set volume data
            if (this.volumeSeries) {
                const volumeData = validData.map(candle => ({
                    time: candle.time,
                    value: candle.volume,
                    color: candle.close >= candle.open ? 'rgba(0, 150, 136, 0.8)' : 'rgba(255, 82, 82, 0.8)'
                }));
                this.volumeSeries.setData(volumeData);
            }

            // Subscribe to updates after setting initial data
            this.subscribeToMarketData();
        } catch (error) {
            console.error('Error updating data:', error);
        }
    }

    async fetchHistoricalData() {
        try {
            console.log('Fetching historical data...');
            const symbol = this.currentPair;
            const period = this.currentTimeframe;
            
            // Construct the API endpoint
            const endpoint = HTX_CONFIG.ENDPOINTS.MARKET.KLINE;
            const params = {
                symbol: symbol,
                period: period,
                size: 300  // Get last 300 candles
            };

            // Make the request to the REST API
            const url = `${HTX_CONFIG.REST_URL}${endpoint}?${new URLSearchParams(params)}`;
            console.log('Fetching from URL:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Historical data response:', data);

            if (!data || !data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid response format');
            }

            // Transform the data into the format expected by lightweight-charts
            return data.data.map(candle => ({
                time: candle.id,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close),
                volume: parseFloat(candle.vol)
            })).filter(candle => 
                !isNaN(candle.time) && 
                !isNaN(candle.open) && 
                !isNaN(candle.high) && 
                !isNaN(candle.low) && 
                !isNaN(candle.close) && 
                !isNaN(candle.volume)
            );
        } catch (error) {
            console.error('Error fetching historical data:', error);
            throw new Error(`Failed to fetch historical data: ${error.message}`);
        }
    }

    handleKlineUpdate(message) {
        try {
            console.log('Received kline update:', message);
            if (!message || !message.tick) {
                console.warn('Invalid kline message received:', message);
                return;
            }

            const tick = message.tick;
            if (!tick || typeof tick !== 'object') {
                console.warn('Invalid tick data:', tick);
                return;
            }

            // Parse and validate all numeric values
            const candleData = {
                time: parseInt(tick.id),
                open: parseFloat(tick.open),
                high: parseFloat(tick.high),
                low: parseFloat(tick.low),
                close: parseFloat(tick.close)
            };

            // Validate all fields are numbers and not NaN
            if (Object.values(candleData).some(val => typeof val !== 'number' || isNaN(val))) {
                console.warn('Invalid numeric values in candle data:', candleData);
                return;
            }

            console.log('Updating chart with candle:', candleData);
            
            if (this.candleSeries) {
                this.candleSeries.update(candleData);
            }

            if (this.volumeSeries && typeof tick.vol !== 'undefined') {
                const volume = parseFloat(tick.vol);
                if (!isNaN(volume)) {
                    const volumeData = {
                        time: candleData.time,
                        value: volume,
                        color: candleData.close >= candleData.open ? 'rgba(0, 150, 136, 0.8)' : 'rgba(255, 82, 82, 0.8)'
                    };
                    this.volumeSeries.update(volumeData);
                }
            }
        } catch (error) {
            console.error('Error in handleKlineUpdate:', error);
            console.log('Message that caused error:', message);
        }
    }

    setupEventListeners() {
        // Trading pair selector
        const pairSelect = document.getElementById('tradingPair');
        if (pairSelect) {
            pairSelect.value = this.currentPair; // Set initial value
            pairSelect.addEventListener('change', async (e) => {
                try {
                    await this.changeSymbol(e.target.value);
                } catch (error) {
                    console.error('Error handling pair change:', error);
                    this.showError('pair-change', error.message);
                }
            });
        }

        // Timeframe buttons
        const timeframeButtons = document.querySelectorAll('.timeframe-btn');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                try {
                    const timeframe = e.target.dataset.timeframe;
                    await this.changeInterval(timeframe);
                    
                    // Update active state
                    timeframeButtons.forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                } catch (error) {
                    console.error('Error handling timeframe change:', error);
                    this.showError('timeframe-change', error.message);
                }
            });
        });
    }

    async changeSymbol(symbol) {
        this.currentPair = symbol.toLowerCase();
        await this.updateAllData();
        this.chart.applyOptions({
            title: `Market Analysis - ${this.currentPair}`
        });
    }

    getTimeframeValue(timeframe) {
        return HTX_CONFIG.TIMEFRAMES[timeframe] || HTX_CONFIG.DEFAULTS.TIMEFRAME;
    }

    async changeInterval(interval) {
        const newTimeframe = this.getTimeframeValue(interval);
        if (newTimeframe !== this.currentTimeframe) {
            console.log(`Changing timeframe from ${this.currentTimeframe} to ${newTimeframe}`);
            this.currentTimeframe = newTimeframe;
            await this.updateAllData();
        }
    }

    subscribeToMarketData() {
        try {
            console.log('Subscribing to market data...');
            
            // Subscribe to market details (like our test page)
            htxWebSocket.subscribe(
                `market.${this.currentPair}.detail`,
                this.handleDetailUpdate.bind(this)
            );

            // Subscribe to kline updates
            htxWebSocket.subscribe(
                `market.${this.currentPair}.kline.${this.currentTimeframe}`,
                this.handleKlineUpdate.bind(this)
            );

            // Subscribe to trade updates
            htxWebSocket.subscribe(
                `market.${this.currentPair}.trade.detail`,
                this.handleTradeUpdate.bind(this)
            );

            console.log('Market data subscriptions completed');
        } catch (error) {
            console.error('Failed to subscribe to market data:', error);
            this.showError('subscription', error.message);
        }
    }

    handleDetailUpdate(message) {
        if (message.tick) {
            this.updateMarketStats(message.tick);
        }
    }

    handleTradeUpdate(message) {
        if (message.tick && message.tick.data) {
            this.updateRecentTrades(message.tick.data);
        }
    }

    updateMarketStats(tick) {
        const stats = {
            volume: this.formatVolume(tick.vol),
            high: tick.high.toFixed(2),
            low: tick.low.toFixed(2),
            change: ((tick.close - tick.open) / tick.open * 100).toFixed(2)
        };

        // Update DOM elements
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.getElementById(`market-${key}`);
            if (element) {
                element.textContent = value;
                if (key === 'change') {
                    element.classList.remove('positive', 'negative');
                    element.classList.add(parseFloat(value) >= 0 ? 'positive' : 'negative');
                }
            }
        });
    }

    updateRecentTrades(trades) {
        const tradesContainer = document.getElementById('recent-trades');
        if (!tradesContainer) return;

        trades.slice(0, 10).forEach(trade => {
            const row = document.createElement('div');
            row.className = `trade-row ${trade.direction}`;
            row.innerHTML = `
                <span class="trade-price">${trade.price.toFixed(2)}</span>
                <span class="trade-amount">${trade.amount.toFixed(4)}</span>
                <span class="trade-time">${new Date(trade.ts).toLocaleTimeString()}</span>
            `;
            tradesContainer.insertBefore(row, tradesContainer.firstChild);
            if (tradesContainer.children.length > 10) {
                tradesContainer.removeChild(tradesContainer.lastChild);
            }
        });
    }

    async updateIndicators(tickData = null) {
        try {
            // If we have real-time tick data, use it
            if (tickData) {
                this.updateIndicatorValues({
                    volume: this.formatVolume(tickData.vol),
                    rsi: this.calculateRSI(tickData),
                    macd: this.calculateMACD(tickData),
                    stoch: this.calculateStoch(tickData),
                    bb: this.calculateBollingerBands(tickData),
                    ema: this.calculateEMA(tickData),
                    adx: this.calculateADX(tickData),
                    obv: this.calculateOBV(tickData)
                });
                return;
            }

            // Otherwise fetch latest data from HTX API
            const response = await htxWebSocket.makeRequest(HTX_CONFIG.ENDPOINTS.TICKER, {
                symbol: this.currentPair
            });
            
            if (response.status === 'ok' && response.tick) {
                const tick = response.tick;
                this.updateIndicatorValues({
                    volume: this.formatVolume(tick.vol),
                    rsi: this.calculateRSI(tick),
                    macd: this.calculateMACD(tick),
                    stoch: this.calculateStoch(tick),
                    bb: this.calculateBollingerBands(tick),
                    ema: this.calculateEMA(tick),
                    adx: this.calculateADX(tick),
                    obv: this.calculateOBV(tick)
                });
            } else {
                throw new Error('Invalid ticker data');
            }
        } catch (error) {
            console.error('Failed to update indicators:', error);
            this.showError('indicators', 'Failed to update market indicators');
        }
    }

    updateIndicatorValues(values) {
        for (const [indicator, element] of Object.entries(this.indicators)) {
            if (element && values[indicator] !== undefined) {
                element.textContent = values[indicator];
                element.className = `indicator ${this.getIndicatorClass(values[indicator], indicator)}`;
            }
        }
    }

    async updateSentiment() {
        try {
            // Fetch sentiment data
            const response = await htxWebSocket.makeRequest(`${HTX_CONFIG.BASE_URL}/market/sentiment`, {
                symbol: this.currentPair
            });
            
            if (response.status === 'ok') {
                const sentiment = response.data.sentiment;
                if (this.sentiment) {
                    this.sentiment.querySelector('.value').textContent = this.formatSentiment(sentiment);
                    this.sentiment.querySelector('.value').className = `value ${sentiment.toLowerCase()}`;
                }
            }
        } catch (error) {
            console.error('Failed to update sentiment:', error);
            if (this.sentiment) {
                this.sentiment.querySelector('.value').textContent = 'Error loading sentiment';
                this.sentiment.querySelector('.value').className = 'value error';
            }
        }
    }

    async updatePosition() {
        try {
            // Fetch position signal
            const response = await htxWebSocket.makeRequest(`${HTX_CONFIG.BASE_URL}/market/position`, {
                symbol: this.currentPair
            });
            
            if (response.status === 'ok') {
                const position = response.data.position;
                if (this.position) {
                    this.position.querySelector('.value').textContent = position;
                    this.position.querySelector('.value').className = `value ${position.toLowerCase()}`;
                }
            }
        } catch (error) {
            console.error('Failed to update position:', error);
            if (this.position) {
                this.position.querySelector('.value').textContent = 'Error loading position';
                this.position.querySelector('.value').className = 'value error';
            }
        }
    }

    startPeriodicUpdates() {
        setInterval(() => {
            this.updateAllData().catch(error => {
                console.error('Error in periodic update:', error);
            });
        }, this.updateInterval);
    }

    showError(type, message) {
        this.logDebug(`Error (${type}): ${message}`, true);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'background: rgba(255,0,0,0.1); color: #ff4444; padding: 10px; border-radius: 4px; margin: 10px 0;';
        errorDiv.textContent = `Error (${type}): ${message}`;
        
        const chartContainer = document.getElementById('marketAnalysisChart');
        if (chartContainer) {
            chartContainer.parentNode.insertBefore(errorDiv, chartContainer);
        }
    }

    setLoadingState(elements, loading = true, error = false) {
        for (const element of Object.values(elements)) {
            if (element) {
                if (loading) {
                    element.classList.add('loading');
                    element.classList.remove('error');
                    element.textContent = 'Loading...';
                } else if (error) {
                    element.classList.remove('loading');
                    element.classList.add('error');
                    element.textContent = 'Error';
                } else {
                    element.classList.remove('loading', 'error');
                }
            }
        }
    }

    cleanup() {
        try {
            console.log('Cleaning up market analysis...');
            
            // Remove resize listener
            if (this._resizeHandler) {
                window.removeEventListener('resize', this._resizeHandler);
                this._resizeHandler = null;
            }

            // Clean up chart
            if (this.chart) {
                const container = document.getElementById('marketAnalysisChart');
                if (container) {
                    container.innerHTML = '';
                }
                this.chart.remove();
                this.chart = null;
                this.candleSeries = null;
                this.volumeSeries = null;
            }

            // Reset state
            this.initialized = false;
            
            console.log('Market analysis cleanup complete');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    // Helper functions for calculations and formatting
    formatVolume(volume) {
        if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
        if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
        if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
        return volume.toFixed(2);
    }

    formatSentiment(sentiment) {
        return sentiment.charAt(0).toUpperCase() + sentiment.slice(1).toLowerCase();
    }

    getIndicatorClass(value, indicator) {
        // Add indicator-specific classification logic
        switch (indicator) {
            case 'rsi':
                if (value > 70) return 'overbought';
                if (value < 30) return 'oversold';
                return 'neutral';
            case 'macd':
                return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
            case 'volume':
                return value > 0 ? 'positive' : 'neutral';
            default:
                return 'neutral';
        }
    }

    // Placeholder calculation functions - replace with actual implementations
    calculateRSI(tick) { return '50.00'; }
    calculateMACD(tick) { return '0.00'; }
    calculateStoch(tick) { return '50.00'; }
    calculateBollingerBands(tick) { return '0.00'; }
    calculateEMA(tick) { return '0.00'; }
    calculateADX(tick) { return '0.00'; }
    calculateOBV(tick) { return '0.00'; }
}

// Create and export singleton instance
const marketAnalysis = new MarketAnalysisSection();

// Define initialization function
async function init() {
    console.log('Market Analysis init called');
    try {
        if (!window.pako) {
            throw new Error('Pako library not found. Make sure it is loaded before initializing.');
        }
        console.log('Pako library found');

        if (!htxWebSocket) {
            throw new Error('HTX WebSocket module not found');
        }
        console.log('HTX WebSocket module found');

        await marketAnalysis.init();
        console.log('Market Analysis initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Market Analysis:', error);
        const debugElement = document.getElementById('debug-status');
        if (debugElement) {
            debugElement.innerHTML += `<div style="color: #ff4444">[${new Date().toLocaleTimeString()}] Error: ${error.message}</div>`;
        }
        throw error; // Re-throw to propagate the error
    }
}

// Export everything needed
export { marketAnalysis, init };
