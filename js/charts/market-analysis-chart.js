// Market Analysis Chart Manager
import { HTX_CONFIG, formatKlineData } from '../config/htx-config.js';
import { htxWebSocket } from '../websocket/htx-websocket.js';
import { createChart } from 'lightweight-charts';

class MarketAnalysisChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.currentSymbol = 'btcusdt';
        this.currentInterval = '1min';
        this.subscriptions = new Map();
        this.resizeObserver = null;
        this.initialized = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.colors = {
            volumeUp: '#26a69a',
            volumeDown: '#ef5350',
            candleUp: '#26a69a',
            candleDown: '#ef5350'
        };
        this.chartOptions = {
            layout: {
                background: { type: 'solid', color: '#1e222d' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2b2b43' },
                horzLines: { color: '#2b2b43' },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: '#758696',
                    width: 1,
                    style: 1,
                },
                horzLine: {
                    color: '#758696',
                    width: 1,
                    style: 1,
                },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
                borderColor: '#2b2b43',
            },
        };
    }

    async init() {
        try {
            console.log('Initializing market analysis chart...');
            
            // Initialize container
            const container = document.getElementById(this.containerId);
            if (!container) {
                throw new Error(`Container ${this.containerId} not found`);
            }

            // Create chart
            this.chart = createChart(container, this.chartOptions);
            
            // Add series
            this.candlestickSeries = this.chart.addCandlestickSeries({
                upColor: this.colors.candleUp,
                downColor: this.colors.candleDown,
                borderVisible: false,
                wickUpColor: this.colors.candleUp,
                wickDownColor: this.colors.candleDown
            });

            this.volumeSeries = this.chart.addHistogramSeries({
                color: this.colors.volumeUp,
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '',
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });

            // Setup resize observer
            this.setupResizeObserver(container);

            // Initialize WebSocket
            await this.initializeWebSocket();

            // Load initial data
            await this.loadInitialData();

            this.initialized = true;
            console.log('Market analysis chart initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize market analysis chart:', error);
            throw error;
        }
    }

    async initializeWebSocket() {
        try {
            // Initialize WebSocket connection
            await htxWebSocket.init();

            // Set up WebSocket handlers
            htxWebSocket.setHandlers({
                onMessage: this.handleWebSocketMessage.bind(this),
                onError: this.handleWebSocketError.bind(this),
                onClose: this.handleWebSocketClose.bind(this),
                onOpen: this.handleWebSocketOpen.bind(this)
            });

            // Subscribe to market data
            this.subscribeToMarketData();
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            throw error;
        }
    }

    handleWebSocketMessage(data) {
        try {
            if (data.ch && data.tick) {
                const [market, symbol, type, interval] = data.ch.split('.');
                if (type === 'kline' && symbol === this.currentSymbol && interval === this.currentInterval) {
                    const kline = formatKlineData([data.tick])[0];
                    this.updateChart(kline);
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    handleWebSocketError(error) {
        console.error('WebSocket error:', error);
    }

    handleWebSocketClose() {
        console.log('WebSocket connection closed');
    }

    handleWebSocketOpen() {
        console.log('WebSocket connection opened');
        this.subscribeToMarketData();
    }

    subscribeToMarketData() {
        if (!htxWebSocket.isConnected()) {
            console.warn('WebSocket not connected, cannot subscribe');
            return;
        }

        const channel = `market.${this.currentSymbol}.kline.${this.currentInterval}`;
        htxWebSocket.subscribe(channel, this.handleWebSocketMessage.bind(this));
    }

    async loadInitialData() {
        try {
            const response = await fetch(`${HTX_CONFIG.BASE_URL}${HTX_CONFIG.ENDPOINTS.KLINES}?symbol=${this.currentSymbol}&period=${this.currentInterval}&size=200`);
            const data = await response.json();
            
            if (data.status === 'ok' && Array.isArray(data.data)) {
                const klines = formatKlineData(data.data);
                this.candlestickSeries.setData(klines);
                
                const volumes = klines.map(k => ({
                    time: k.time,
                    value: k.volume,
                    color: k.close >= k.open ? this.colors.volumeUp : this.colors.volumeDown
                }));
                this.volumeSeries.setData(volumes);
            } else {
                throw new Error('Invalid kline data format');
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        }
    }

    updateChart(kline) {
        try {
            this.candlestickSeries.update(kline);
            this.volumeSeries.update({
                time: kline.time,
                value: kline.volume,
                color: kline.close >= kline.open ? this.colors.volumeUp : this.colors.volumeDown
            });
        } catch (error) {
            console.error('Failed to update chart:', error);
        }
    }

    setupResizeObserver(container) {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !this.chart) return;
            
            const newRect = entries[0].contentRect;
            this.chart.applyOptions({
                width: newRect.width,
                height: newRect.height
            });
        });

        this.resizeObserver.observe(container);
    }

    cleanup() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }

        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.initialized = false;
    }

    changeSymbol(symbol) {
        this.currentSymbol = symbol.toLowerCase();
        this.loadInitialData();
        this.subscribeToMarketData();
    }

    changeInterval(interval) {
        this.currentInterval = interval;
        this.loadInitialData();
        this.subscribeToMarketData();
    }
}

// Create singleton instance
const marketAnalysisChart = new MarketAnalysisChart('marketAnalysisChart');
export default marketAnalysisChart;
