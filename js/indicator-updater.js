class IndicatorUpdater {
    constructor() {
        this.currentPair = 'BTCUSDT';
        this.timeframe = '1d';
        this.updateInterval = 15000; // 15 seconds
        this.indicators = window.indicatorSignals;
    }

    async init() {
        if (!this.indicators) {
            console.error('Indicator signals not initialized');
            return;
        }

        await this.updateIndicators();
        setInterval(() => this.updateIndicators(), this.updateInterval);
    }

    async updateIndicators() {
        try {
            const data = await this.fetchIndicatorData();
            if (!data) return;

            this.indicators.updateAllIndicators({
                rsi: data.rsi,
                price: data.price,
                bb: {
                    upper: data.bb.upper,
                    middle: data.bb.middle,
                    lower: data.bb.lower
                },
                macd: {
                    value: data.macd,
                    signal: data.signal,
                    histogram: data.histogram
                }
            });
        } catch (error) {
            console.error('Error updating indicators:', error);
        }
    }

    async fetchIndicatorData() {
        try {
            const response = await fetch(`/api/indicators?symbol=${this.currentPair}&timeframe=${this.timeframe}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching indicator data:', error);
            return null;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.indicatorUpdater = new IndicatorUpdater();
    indicatorUpdater.init();
});
