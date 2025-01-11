// @ts-check

// Traditional Markets Module
import { htxWebSocket } from '/js/websocket/htx-websocket.js';
import { HTX_CONFIG } from '/js/config/htx-config.js';

class TraditionalMarketsSection {
    constructor() {
        this.initialized = false;
        this.currentMarket = 'stocks';
        this.currentTimeframe = '1d';
        this.charts = {};
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await this.setupEventListeners();
            await this.setupWebSocket();
            await this.initializeCharts();
            await this.updateAllData();
            this.startPeriodicUpdates();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize traditional markets:', error);
            throw error;
        }
    }

    async setupWebSocket() {
        await htxWebSocket.init();
        // Add WebSocket setup logic here
    }

    setupEventListeners() {
        // Market selector
        const marketSelect = document.getElementById('marketSelect');
        if (marketSelect) {
            marketSelect.addEventListener('change', (e) => {
                this.handleMarketChange(e.target.value);
            });
        }

        // Timeframe selector
        const timeframeSelect = document.getElementById('timeframeSelect');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.handleTimeframeChange(e.target.value);
            });
        }
    }

    async initializeCharts() {
        const chartContainers = ['marketChart', 'correlationChart'];
        
        for (const containerId of chartContainers) {
            const container = document.getElementById(containerId);
            if (!container) continue;

            this.charts[containerId] = LightweightCharts.createChart(container, {
                width: container.clientWidth,
                height: 400,
                layout: {
                    background: { color: 'transparent' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                },
            });
        }
    }

    async updateAllData() {
        try {
            await Promise.all([
                this.updateMarketData(),
                this.updateCorrelations(),
                this.updateIndicators()
            ]);
        } catch (error) {
            console.error('Failed to update market data:', error);
            throw error;
        }
    }

    startPeriodicUpdates() {
        setInterval(() => this.updateAllData(), 5 * 60 * 1000);
    }

    async handleMarketChange(market) {
        this.currentMarket = market;
        await this.updateAllData();
    }

    async handleTimeframeChange(timeframe) {
        this.currentTimeframe = timeframe;
        await this.updateAllData();
    }
}

// Create and export singleton instance
export const traditionalMarkets = new TraditionalMarketsSection();
