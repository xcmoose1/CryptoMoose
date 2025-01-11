class SectorPerformance {
    constructor() {
        this.sectors = {
            'DeFi': ['AAVE', 'UNI', 'LINK', 'SNX', 'COMP'],
            'Layer1': ['ETH', 'SOL', 'ADA', 'AVAX', 'DOT'],
            'Exchange': ['BNB', 'FTT', 'CRO', 'OKB', 'HT'],
            'Gaming': ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA'],
            'Infrastructure': ['MATIC', 'ATOM', 'FTM', 'ONE', 'NEAR']
        };
        this.lastUpdate = 0;
        this.updateInterval = 300000; // 5 minutes
    }

    async init() {
        try {
            await this.updateSectorData();
            setInterval(() => this.updateSectorData(), this.updateInterval);
        } catch (error) {
            console.error('Error initializing sector performance:', error);
        }
    }

    async updateSectorData() {
        try {
            const currentTime = Date.now();
            if (currentTime - this.lastUpdate < this.updateInterval) {
                return;
            }

            const sectorData = {};
            
            // Fetch data for each sector
            for (const [sector, tokens] of Object.entries(this.sectors)) {
                const performances = await Promise.all(
                    tokens.map(token => this.fetchTokenPerformance(token + 'USDT'))
                );
                
                // Calculate average sector performance
                const validPerformances = performances.filter(p => p !== null);
                if (validPerformances.length > 0) {
                    sectorData[sector] = {
                        performance: validPerformances.reduce((a, b) => a + b, 0) / validPerformances.length,
                        tokens: tokens.map((token, i) => ({
                            symbol: token,
                            performance: performances[i]
                        })).filter(t => t.performance !== null)
                    };
                }
            }

            // Update UI
            this.updateSectorUI(sectorData);
            
            this.lastUpdate = currentTime;
        } catch (error) {
            console.error('Error updating sector data:', error);
            this.handleError();
        }
    }

    async fetchTokenPerformance(symbol) {
        try {
            const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.ret_code === 0 && data.result?.list?.[0]) {
                const ticker = data.result.list[0];
                return parseFloat(ticker.price24hPcnt) * 100; // Convert to percentage
            }
            
            return null;
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return null;
        }
    }

    updateSectorUI(sectorData) {
        const container = document.getElementById('sectorPerformance');
        if (!container) return;

        // Sort sectors by performance
        const sortedSectors = Object.entries(sectorData)
            .sort(([,a], [,b]) => b.performance - a.performance);

        let html = '<div class="sector-grid">';
        
        for (const [sector, data] of sortedSectors) {
            const performanceClass = this.getPerformanceClass(data.performance);
            
            html += `
                <div class="sector-card ${performanceClass}">
                    <div class="sector-header">
                        <h4>${sector}</h4>
                        <span class="sector-performance">${data.performance.toFixed(2)}%</span>
                    </div>
                    <div class="token-list">
                        ${data.tokens.map(token => `
                            <div class="token-item">
                                <span class="token-symbol">${token.symbol}</span>
                                <span class="token-performance ${this.getPerformanceClass(token.performance)}">
                                    ${token.performance.toFixed(2)}%
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        html += `<div class="update-time">Last updated: ${new Date().toLocaleTimeString()}</div>`;
        
        container.innerHTML = html;
    }

    getPerformanceClass(performance) {
        if (performance >= 5) return 'performance-high';
        if (performance >= 2) return 'performance-medium-high';
        if (performance <= -5) return 'performance-low';
        if (performance <= -2) return 'performance-medium-low';
        return 'performance-neutral';
    }

    handleError() {
        const container = document.getElementById('sectorPerformance');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load sector performance data</p>
                </div>
            `;
        }
    }
}

export default SectorPerformance;
