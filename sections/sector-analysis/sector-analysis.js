// @ts-check

// Sector Analysis Module
import { htxWebSocket } from '/js/websocket/htx-websocket.js';
import { HTX_CONFIG } from '/js/config/htx-config.js';

class SectorAnalysisSection {
    constructor() {
        this.initialized = false;
        this.currentSector = 'gaming';
        this.init();
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
            console.error('Failed to initialize sector analysis:', error);
            throw error;
        }
    }

    setupEventListeners() {
        const sectorButtons = document.querySelectorAll('.sector-btn');
        sectorButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleSectorChange(button.dataset.sector);
            });
        });
    }

    async handleSectorChange(sector) {
        // Update active button
        document.querySelectorAll('.sector-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sector === sector);
        });

        this.currentSector = sector;
        await this.updateAllData();
    }

    async setupWebSocket() {
        await htxWebSocket.init();
        // Add WebSocket setup logic here
    }

    async updateAllData() {
        try {
            await Promise.all([
                this.updateSectorMetrics(),
                this.updateSectorInsights(),
                this.updateTopAssets()
            ]);
        } catch (error) {
            console.error('Failed to update sector data:', error);
            throw error;
        }
    }

    startPeriodicUpdates() {
        // Update every 5 minutes
        setInterval(() => this.updateAllData(), 5 * 60 * 1000);
    }

    async updateSectorMetrics() {
        try {
            const metrics = await this.fetchSectorMetrics();
            
            document.getElementById('sectorMarketCap').textContent = this.formatMarketCap(metrics.marketCap);
            document.getElementById('sectorVolume').textContent = this.formatVolume(metrics.volume);
            document.getElementById('sectorChange').textContent = this.formatPercentage(metrics.change);
            document.getElementById('sectorDominance').textContent = this.formatPercentage(metrics.dominance);
        } catch (error) {
            console.error('Error updating sector metrics:', error);
            this.showError('metrics');
        }
    }

    async updateSectorInsights() {
        try {
            const insights = await this.fetchSectorInsights();
            
            document.getElementById('sectorTrends').textContent = insights.trends;
            document.getElementById('marketStructure').textContent = insights.structure;
            document.getElementById('sectorOpportunities').textContent = insights.opportunities;
        } catch (error) {
            console.error('Error updating sector insights:', error);
            this.showError('insights');
        }
    }

    async updateTopAssets() {
        const assetsList = document.getElementById('topAssetsList');
        
        try {
            const assets = await this.fetchTopAssets();
            assetsList.innerHTML = this.formatTopAssets(assets);
        } catch (error) {
            console.error('Error updating top assets:', error);
            assetsList.innerHTML = '<div class="error-message">Error loading assets</div>';
        }
    }

    // Data fetching methods - implement these based on your API
    async fetchSectorMetrics() {
        // Implement API call for sector metrics
        return {
            marketCap: 0,
            volume: 0,
            change: 0,
            dominance: 0
        };
    }

    async fetchSectorInsights() {
        // Implement API call for sector insights
        return {
            trends: '',
            structure: '',
            opportunities: ''
        };
    }

    async fetchTopAssets() {
        // Implement API call for top assets
        return [];
    }

    // Formatting methods
    formatMarketCap(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 2
        }).format(value);
    }

    formatVolume(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 2
        }).format(value);
    }

    formatPercentage(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    }

    formatTopAssets(assets) {
        if (!assets.length) return '<div class="loading-message">No assets found</div>';

        return assets.map(asset => `
            <div class="asset-row">
                <span class="asset-name">${asset.name}</span>
                <span class="asset-price">${this.formatMarketCap(asset.price)}</span>
                <span class="asset-change ${asset.change >= 0 ? 'positive' : 'negative'}">
                    ${this.formatPercentage(asset.change)}
                </span>
                <span class="asset-volume">${this.formatVolume(asset.volume)}</span>
                <span class="asset-trend">${asset.trend}</span>
            </div>
        `).join('');
    }

    showError(section) {
        const errorMessages = {
            metrics: 'Error loading sector metrics',
            insights: 'Error loading sector insights',
            assets: 'Error loading top assets'
        };

        // Update relevant section with error message
        document.querySelectorAll(`.${section}-section .value`).forEach(el => {
            el.textContent = errorMessages[section];
        });
    }
}

// Create and export singleton instance
export const sectorAnalysis = new SectorAnalysisSection();
