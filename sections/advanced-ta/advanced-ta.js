// @ts-check

// Advanced Technical Analysis Module
import { createChart } from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { HTX_CONFIG } from '../../js/config/htx-config.js';
import { htxWebSocket } from '../../js/websocket/htx-websocket.js';
import dataAggregator from './services/data-aggregator.js';

class AdvancedTASection {
    constructor() {
        this.initialized = false;
        this.mainChart = null;
        this.deltaFlowChart = null;
        this.mainSeries = null;
        this.deltaFlowSeries = null;
        this.timeframe = '4hour';  
        this.symbol = HTX_CONFIG.MARKET_CONFIG.DEFAULT_SYMBOL;
        this.marketData = [];
        this.subscriptions = new Set();
        this._resizeHandler = this._handleResize.bind(this);
        this.orderBookData = null;
        this.marketContext = null;
        this.dataAggregator = dataAggregator;  
    }

    async init() {
        try {
            if (this.initialized) {
                console.log('Advanced TA already initialized');
                return;
            }

            console.log('Initializing Advanced TA...');
            
            // Initialize data aggregator first
            await this.dataAggregator.init();
            console.log('Data aggregator initialized');
            
            // Initialize charts
            await this.initializeCharts();
            console.log('Charts initialized');

            // Load historical data
            await this.loadHistoricalData();
            console.log('Historical data loaded');

            // Setup WebSocket
            await this.setupWebSocket();
            console.log('WebSocket setup complete');

            // Subscribe to additional data sources
            await this.setupAdditionalDataSources();
            console.log('Additional data sources setup complete');

            // Setup event listeners
            this.setupEventListeners();
            console.log('Event listeners setup complete');

            // Start analysis
            this.startAnalysis();
            console.log('Analysis started');

            this.initialized = true;
            console.log('Advanced TA initialization complete');
        } catch (error) {
            console.error('Failed to initialize Advanced TA:', error);
            throw error;
        }
    }

    async setupWebSocket() {
        await htxWebSocket.init();
        
        // Subscribe to kline updates
        const klineChannel = HTX_CONFIG.CHANNELS.KLINE(this.symbol, this.timeframe);
        await htxWebSocket.subscribe(klineChannel, this._handleKlineUpdate.bind(this));
        this.subscriptions.add(klineChannel);

        // Subscribe to trade updates for order flow
        const tradeChannel = HTX_CONFIG.CHANNELS.TRADE(this.symbol);
        await htxWebSocket.subscribe(tradeChannel, this._handleTradeUpdate.bind(this));
        this.subscriptions.add(tradeChannel);
    }

    async setupAdditionalDataSources() {
        try {
            // Subscribe to Binance order book updates
            await this.dataAggregator.subscribeToOrderBookUpdates(this.symbol, this.handleOrderBookUpdate.bind(this));
            
            // Get initial market context
            await this.updateMarketContext();
            
            // Update market context every 5 minutes
            setInterval(() => this.updateMarketContext(), 5 * 60 * 1000);
        } catch (error) {
            console.error('Error setting up additional data sources:', error);
        }
    }

    _handleKlineUpdate(data) {
        if (!data || !data.tick) return;
        
        const candle = this._formatCandle(data.tick);
        this.marketData.push(candle);
        
        // Update chart
        this.mainSeries.update(candle);
        this.deltaFlowSeries.update({
            time: candle.time,
            value: data.tick.vol,
            color: data.tick.close >= data.tick.open ? 'rgba(0, 150, 136, 0.8)' : 'rgba(255, 82, 82, 0.8)'
        });

        // Update analysis
        this.updateAllData();
    }

    _handleTradeUpdate(data) {
        if (!data || !data.tick) return;
        this.updateOrderFlow(data.tick);
    }

    _formatCandle(tick) {
        return {
            time: tick.id * 1000,
            open: tick.open,
            high: tick.high,
            low: tick.low,
            close: tick.close
        };
    }

    async loadHistoricalData() {
        try {
            console.log('Fetching historical data...');
            const symbol = this.symbol;
            const period = this.timeframe;
            
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
            this.marketData = data.data.map(candle => ({
                time: candle.id,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close),
                volume: parseFloat(candle.vol)
            })).filter(candle => 
                candle && 
                typeof candle.time === 'number' && !isNaN(candle.time) &&
                typeof candle.open === 'number' && !isNaN(candle.open) &&
                typeof candle.high === 'number' && !isNaN(candle.high) &&
                typeof candle.low === 'number' && !isNaN(candle.low) &&
                typeof candle.close === 'number' && !isNaN(candle.close) &&
                typeof candle.volume === 'number' && !isNaN(candle.volume)
            );

            // Sort data by timestamp
            this.marketData.sort((a, b) => a.time - b.time);

            // Update chart with historical data
            if (this.mainSeries && this.marketData.length > 0) {
                this.mainSeries.setData(this.marketData);
            }

            // Update volume series
            if (this.deltaFlowSeries && this.marketData.length > 0) {
                const volumeData = this.marketData.map(candle => ({
                    time: candle.time,
                    value: candle.volume,
                    color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                }));
                this.deltaFlowSeries.setData(volumeData);
            }

            return this.marketData;
        } catch (error) {
            console.error('Error loading historical data:', error);
            throw error;
        }
    }

    async handleOrderBookUpdate(data) {
        this.orderBookData = data;
        await this.updateSmartMoneyAnalysis();
    }

    async updateSmartMoneyAnalysis() {
        try {
            // Update order book analysis
            if (this.orderBookData) {
                await this.updateOrderBookAnalysis();
            }

            // Update liquidity analysis
            await this.updateLiquidityAnalysis();

            // Update institutional analysis
            await this.updateInstitutionalAnalysis();
        } catch (error) {
            console.error('Error updating smart money analysis:', error);
        }
    }

    async updateOrderBookAnalysis() {
        const orderBookDiv = document.getElementById('orderBookAnalysis');
        if (!orderBookDiv || !this.orderBookData) return;

        // Calculate order book imbalance
        const bids = this.orderBookData.bids;
        const asks = this.orderBookData.asks;
        
        const bidVolume = bids.reduce((sum, [_, volume]) => sum + parseFloat(volume), 0);
        const askVolume = asks.reduce((sum, [_, volume]) => sum + parseFloat(volume), 0);
        
        const imbalanceRatio = bidVolume / (bidVolume + askVolume);
        
        // Update imbalance meter
        const imbalanceMeter = orderBookDiv.querySelector('.imbalance-meter');
        if (imbalanceMeter) {
            imbalanceMeter.style.setProperty('--imbalance', `${imbalanceRatio * 100}%`);
            imbalanceMeter.classList.toggle('bullish', imbalanceRatio > 0.5);
            imbalanceMeter.classList.toggle('bearish', imbalanceRatio < 0.5);
        }

        // Find key levels
        const levels = this.findKeyLevels(bids, asks);
        const levelsList = orderBookDiv.querySelector('.levels-list');
        if (levelsList) {
            levelsList.innerHTML = levels.map(level => `
                <div class="level-item ${level.type}">
                    <span class="price">$${level.price.toFixed(2)}</span>
                    <span class="volume">${this.formatVolume(level.volume)} ${level.type}</span>
                </div>
            `).join('');
        }
    }

    findKeyLevels(bids, asks) {
        const levels = [];
        const volumeThreshold = this.calculateVolumeThreshold([...bids, ...asks]);

        // Find support levels (large bid walls)
        bids.forEach(([price, volume]) => {
            if (parseFloat(volume) > volumeThreshold) {
                levels.push({
                    price: parseFloat(price),
                    volume: parseFloat(volume),
                    type: 'support'
                });
            }
        });

        // Find resistance levels (large ask walls)
        asks.forEach(([price, volume]) => {
            if (parseFloat(volume) > volumeThreshold) {
                levels.push({
                    price: parseFloat(price),
                    volume: parseFloat(volume),
                    type: 'resistance'
                });
            }
        });

        return levels.sort((a, b) => b.volume - a.volume).slice(0, 5);
    }

    calculateVolumeThreshold(orders) {
        const volumes = orders.map(([_, volume]) => parseFloat(volume));
        const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const stdDev = Math.sqrt(
            volumes.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / volumes.length
        );
        return mean + (2 * stdDev); // 2 standard deviations above mean
    }

    async updateLiquidityAnalysis() {
        const liquidityDiv = document.getElementById('liquidityAnalysis');
        if (!liquidityDiv || !this.marketData || !this.orderBookData) return;

        // Find liquidity zones
        const zones = this.findLiquidityZones();
        const zonesList = liquidityDiv.querySelector('.zones-list');
        
        if (zonesList) {
            zonesList.innerHTML = zones.map(zone => `
                <div class="zone-item">
                    <span class="price-range">$${zone.low.toFixed(2)} - $${zone.high.toFixed(2)}</span>
                    <span class="strength ${zone.strength > 0.7 ? 'high' : zone.strength > 0.3 ? 'medium' : 'low'}">
                        ${Math.round(zone.strength * 100)}% strength
                    </span>
                </div>
            `).join('');
        }
    }

    findLiquidityZones() {
        const zones = [];
        const priceRange = 0.02; // 2% range for each zone

        if (!this.marketData.length) return zones;

        const currentPrice = this.marketData[this.marketData.length - 1].close;
        const highestPrice = Math.max(...this.marketData.map(d => d.high));
        const lowestPrice = Math.min(...this.marketData.map(d => d.low));

        // Create price zones
        for (let price = lowestPrice; price <= highestPrice; price *= (1 + priceRange)) {
            const zoneHigh = price * (1 + priceRange);
            const zoneLow = price;

            // Calculate zone strength based on volume and order book
            const volumeInZone = this.marketData.reduce((sum, candle) => {
                if (candle.low <= zoneHigh && candle.high >= zoneLow) {
                    return sum + candle.volume;
                }
                return sum;
            }, 0);

            const orderBookVolume = [...this.orderBookData.bids, ...this.orderBookData.asks]
                .filter(([price]) => price >= zoneLow && price <= zoneHigh)
                .reduce((sum, [_, volume]) => sum + parseFloat(volume), 0);

            const totalVolume = this.marketData.reduce((sum, candle) => sum + candle.volume, 0);
            const strength = (volumeInZone / totalVolume + orderBookVolume / totalVolume) / 2;

            if (strength > 0.1) { // Only show significant zones
                zones.push({ low: zoneLow, high: zoneHigh, strength });
            }
        }

        return zones.sort((a, b) => b.strength - a.strength).slice(0, 5);
    }

    async updateInstitutionalAnalysis() {
        const institutionalDiv = document.getElementById('institutionalAnalysis');
        if (!institutionalDiv || !this.marketData) return;

        // Find large orders
        const largeOrders = this.findLargeOrders();
        const ordersList = institutionalDiv.querySelector('.large-orders-list');
        
        if (ordersList) {
            ordersList.innerHTML = largeOrders.map(order => `
                <div class="order-item ${order.side}">
                    <span class="time">${this.formatTime(order.time)}</span>
                    <span class="details">
                        ${order.side === 'buy' ? '↑' : '↓'} $${order.price.toFixed(2)}
                    </span>
                    <span class="volume">${this.formatVolume(order.volume)}</span>
                </div>
            `).join('');
        }
    }

    findLargeOrders() {
        if (!this.marketData.length) return [];

        const volumeThreshold = this.calculateVolumeThreshold(
            this.marketData.map(d => [d.close, d.volume])
        );

        return this.marketData
            .filter(candle => candle.volume > volumeThreshold)
            .map(candle => ({
                time: candle.time,
                price: candle.close,
                volume: candle.volume,
                side: candle.close > candle.open ? 'buy' : 'sell'
            }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5);
    }

    formatVolume(volume) {
        if (volume >= 1000000) {
            return `${(volume / 1000000).toFixed(2)}M`;
        }
        if (volume >= 1000) {
            return `${(volume / 1000).toFixed(2)}K`;
        }
        return volume.toFixed(2);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async updateMarketContext() {
        try {
            this.marketContext = await this.dataAggregator.getMarketContext(this.symbol);
        } catch (error) {
            console.error('Error updating market context:', error);
        }
    }

    setupEventListeners() {
        const timeframeSelector = document.getElementById('taTimeframe');
        if (timeframeSelector) {
            timeframeSelector.addEventListener('change', (e) => {
                this.timeframe = e.target.value;
                this.loadHistoricalData();
            });
        }

        // Add tab switching functionality
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                const tabId = button.dataset.tab;
                document.getElementById(`${tabId}Analysis`).classList.add('active');
            });
        });

        // Add resize handler
        this._resizeHandler = this._handleResize.bind(this);
        window.addEventListener('resize', this._resizeHandler);
    }

    async unsubscribeAll() {
        for (const channel of this.subscriptions) {
            await htxWebSocket.unsubscribe(channel);
        }
        this.subscriptions.clear();
    }

    _handleResize() {
        if (this.mainChart && this.deltaFlowChart) {
            const container = document.getElementById('advancedChart');
            if (container) {
                this.mainChart.applyOptions({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
            }
            const deltaFlowContainer = document.getElementById('deltaFlowChart');
            if (deltaFlowContainer) {
                this.deltaFlowChart.applyOptions({
                    width: deltaFlowContainer.clientWidth,
                    height: deltaFlowContainer.clientHeight
                });
            }
        }
    }

    async initializeCharts() {
        // Initialize main chart
        this.mainChart = LightweightCharts.createChart(document.getElementById('advancedChart'), {
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1f2937' },
                horzLines: { color: '#1f2937' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#1f2937',
            },
            timeScale: {
                borderColor: '#1f2937',
                timeVisible: true,
            },
        });

        // Initialize delta flow chart
        this.deltaFlowChart = LightweightCharts.createChart(document.getElementById('deltaFlowChart'), {
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1f2937' },
                horzLines: { color: '#1f2937' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#1f2937',
            },
            timeScale: {
                borderColor: '#1f2937',
                timeVisible: true,
            },
        });

        // Create series for both charts
        this.mainSeries = this.mainChart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        this.deltaFlowSeries = this.deltaFlowChart.addHistogramSeries({
            color: '#2962FF',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });

        await this.loadHistoricalData();
    }

    async updateAllData() {
        if (!this.marketData || this.marketData.length === 0) {
            await this.loadHistoricalData();
        }

        try {
            await Promise.all([
                this.updateMarketStructure(),
                this.updateSmartMoneyLevels(),
                this.updateOrderFlow()
            ]);
        } catch (error) {
            console.error('Failed to update TA data:', error);
        }
    }

    startAnalysis() {
        this.updateAllData();
        // Update every 5 minutes
        setInterval(() => this.updateAllData(), 5 * 60 * 1000);
    }

    async updateMarketStructure() {
        const container = document.getElementById('marketStructure');
        if (!container) return;

        try {
            const analysis = this.analyzeMarketStructure();
            container.innerHTML = this.formatMarketStructure(analysis);
        } catch (error) {
            console.error('Error updating market structure:', error);
            container.innerHTML = '<div class="error">Error analyzing market structure</div>';
        }
    }

    analyzeMarketStructure() {
        if (this.marketData.length < 10) return null;

        const recentData = this.marketData.slice(-10);
        const trend = this._calculateTrend(recentData);
        const support = this._findSupport(recentData);
        const resistance = this._findResistance(recentData);

        return {
            trend,
            support,
            resistance,
            timestamp: Date.now()
        };
    }

    _calculateTrend(data) {
        const closes = data.map(d => d.close);
        const sma5 = this._calculateSMA(closes, 5);
        const sma10 = this._calculateSMA(closes, 10);
        
        return {
            direction: sma5 > sma10 ? 'bullish' : 'bearish',
            strength: Math.abs(sma5 - sma10) / sma10 * 100
        };
    }

    _calculateSMA(data, period) {
        const sum = data.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    }

    _findSupport(data) {
        const lows = data.map(d => d.low);
        return Math.min(...lows);
    }

    _findResistance(data) {
        const highs = data.map(d => d.high);
        return Math.max(...highs);
    }

    formatMarketStructure(analysis) {
        if (!analysis) return '<div class="loading">Insufficient data...</div>';

        return `
            <div class="structure-item ${analysis.trend.direction}">
                <span class="label">Trend:</span>
                <span class="value">${analysis.trend.direction.toUpperCase()} (${analysis.trend.strength.toFixed(2)}%)</span>
            </div>
            <div class="structure-item">
                <span class="label">Support:</span>
                <span class="value">${analysis.support.toFixed(2)}</span>
            </div>
            <div class="structure-item">
                <span class="label">Resistance:</span>
                <span class="value">${analysis.resistance.toFixed(2)}</span>
            </div>
        `;
    }

    async updateSmartMoneyLevels() {
        const container = document.getElementById('smartMoneyLevels');
        if (!container) return;

        try {
            const levels = this.calculateSmartMoneyLevels();
            container.innerHTML = this.formatSmartMoneyLevels(levels);
        } catch (error) {
            console.error('Error updating smart money levels:', error);
            container.innerHTML = '<div class="error">Error calculating levels</div>';
        }
    }

    calculateSmartMoneyLevels() {
        if (this.marketData.length < 20) return null;

        const recentData = this.marketData.slice(-20);
        const volume = recentData.map(d => d.volume);
        const prices = recentData.map(d => d.close);

        const highVolumeLevels = this._findHighVolumeLevels(recentData);
        const liquidityLevels = this._findLiquidityLevels(recentData);

        return {
            highVolume: highVolumeLevels,
            liquidity: liquidityLevels,
            timestamp: Date.now()
        };
    }

    _findHighVolumeLevels(data) {
        const volumeThreshold = this._calculateVolumeThreshold(data);
        return data
            .filter(d => d.volume > volumeThreshold)
            .map(d => ({
                price: d.close,
                volume: d.volume
            }));
    }

    _calculateVolumeThreshold(data) {
        const volumes = data.map(d => d.volume);
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        return avgVolume * 1.5; // 50% above average
    }

    _findLiquidityLevels(data) {
        // Simplified liquidity analysis
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        
        return {
            resistance: Math.max(...highs),
            support: Math.min(...lows)
        };
    }

    formatSmartMoneyLevels(levels) {
        if (!levels) return '<div class="loading">Insufficient data...</div>';

        const highVolumeLevelsHtml = levels.highVolume
            .map(level => `
                <div class="level-item">
                    <span class="price">${level.price.toFixed(2)}</span>
                    <span class="volume">${level.volume.toFixed(0)}</span>
                </div>
            `)
            .join('');

        return `
            <div class="levels-container">
                <div class="liquidity-levels">
                    <div class="level-item resistance">
                        <span class="label">Major Resistance:</span>
                        <span class="value">${levels.liquidity.resistance.toFixed(2)}</span>
                    </div>
                    <div class="level-item support">
                        <span class="label">Major Support:</span>
                        <span class="value">${levels.liquidity.support.toFixed(2)}</span>
                    </div>
                </div>
                <div class="volume-levels">
                    <h5>High Volume Levels</h5>
                    ${highVolumeLevelsHtml}
                </div>
            </div>
        `;
    }

    async updateOrderFlow(tradeData = null) {
        const container = document.getElementById('orderFlow');
        if (!container) return;

        try {
            const analysis = this.analyzeOrderFlow(tradeData);
            container.innerHTML = this.formatOrderFlow(analysis);
        } catch (error) {
            console.error('Error updating order flow:', error);
            container.innerHTML = '<div class="error">Error analyzing order flow</div>';
        }
    }

    analyzeOrderFlow(tradeData) {
        if (!tradeData) return null;

        const trades = Array.isArray(tradeData) ? tradeData : [tradeData];
        const buyVolume = trades
            .filter(t => t.direction === 'buy')
            .reduce((sum, t) => sum + t.amount, 0);
        const sellVolume = trades
            .filter(t => t.direction === 'sell')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            buyVolume,
            sellVolume,
            ratio: buyVolume / (buyVolume + sellVolume),
            largeOrders: trades.filter(t => t.amount > this._calculateLargeOrderThreshold(trades)),
            timestamp: Date.now()
        };
    }

    _calculateLargeOrderThreshold(trades) {
        const amounts = trades.map(t => t.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        return avgAmount * 2; // 2x average is considered large
    }

    formatOrderFlow(analysis) {
        if (!analysis) return '<div class="loading">Waiting for trade data...</div>';

        const ratio = (analysis.ratio * 100).toFixed(1);
        const direction = analysis.ratio > 0.5 ? 'bullish' : 'bearish';

        return `
            <div class="order-flow-container ${direction}">
                <div class="flow-item">
                    <span class="label">Buy Volume:</span>
                    <span class="value">${analysis.buyVolume.toFixed(2)}</span>
                </div>
                <div class="flow-item">
                    <span class="label">Sell Volume:</span>
                    <span class="value">${analysis.sellVolume.toFixed(2)}</span>
                </div>
                <div class="flow-item">
                    <span class="label">Buy Ratio:</span>
                    <span class="value">${ratio}%</span>
                </div>
                <div class="large-orders">
                    <h5>Large Orders (Last 5)</h5>
                    ${this._formatLargeOrders(analysis.largeOrders.slice(-5))}
                </div>
            </div>
        `;
    }

    _formatLargeOrders(orders) {
        if (!orders.length) return '<div class="no-data">No large orders detected</div>';

        return orders
            .map(order => `
                <div class="order-item ${order.direction}">
                    <span class="time">${new Date(order.ts).toLocaleTimeString()}</span>
                    <span class="amount">${order.amount.toFixed(4)}</span>
                    <span class="price">${order.price.toFixed(2)}</span>
                </div>
            `)
            .join('');
    }

    // Cleanup method
    destroy() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        
        if (this.mainChart) {
            this.mainChart.remove();
            this.mainChart = null;
        }

        if (this.deltaFlowChart) {
            this.deltaFlowChart.remove();
            this.deltaFlowChart = null;
        }

        this.unsubscribeAll();
        this.dataAggregator.destroy();
        this.initialized = false;
    }
}

// Create and export singleton instance
const advancedTA = new AdvancedTASection();

// Define initialization function
async function init() {
    console.log('Advanced TA init called');
    try {
        if (!window.pako) {
            throw new Error('Pako library not found. Make sure it is loaded before initializing.');
        }
        console.log('Pako library found');

        if (!htxWebSocket) {
            throw new Error('HTX WebSocket module not found');
        }
        console.log('HTX WebSocket module found');

        await advancedTA.init();
        console.log('Advanced TA initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Advanced TA:', error);
        throw error;
    }
}

// Export everything needed
export { advancedTA, init };
