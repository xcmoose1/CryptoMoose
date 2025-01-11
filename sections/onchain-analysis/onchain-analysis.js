// @ts-check

// Onchain Analysis Module
import { htxWebSocket } from '/js/websocket/htx-websocket.js';
import { HTX_CONFIG } from '/js/config/htx-config.js';

class OnchainAnalysisSection {
    constructor() {
        this.initialized = false;
        this.currentMetric = 'all';
        this.currentTimeframe = '1d';
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await this.setupEventListeners();
            await this.setupWebSocket();
            await this.updateAllData();
            this.startPeriodicUpdates();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize onchain analysis:', error);
            throw error;
        }
    }

    async setupWebSocket() {
        await htxWebSocket.init();
        // Add WebSocket setup logic here
    }

    setupEventListeners() {
        // Metric selector
        const metricSelect = document.getElementById('metricSelect');
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                this.handleMetricChange(e.target.value);
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

    async updateAllData() {
        try {
            await Promise.all([
                this.updateOnchainMetrics(),
                this.updateAddressAnalysis(),
                this.updateFlowAnalysis()
            ]);
        } catch (error) {
            console.error('Failed to update onchain data:', error);
            throw error;
        }
    }

    startPeriodicUpdates() {
        setInterval(() => this.updateAllData(), 5 * 60 * 1000);
    }
}

// Create and export singleton instance
export const onchainAnalysis = new OnchainAnalysisSection();
