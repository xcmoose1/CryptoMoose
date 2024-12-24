class IndicatorUpdater {
    constructor() {
        this.currentPair = 'BTCUSDT';
        this.interval = '4h';
        this.updateInterval = 15000; // 15 seconds
    }

    async init() {
        await this.updateIndicators();
        setInterval(() => this.updateIndicators(), this.updateInterval);
    }

    async updateIndicators() {
        try {
            const data = await this.fetchIndicatorData();
            if (!data) return;
            
            // Update each indicator individually
            if (data.rsi) {
                let rsiSignal = 'Neutral';
                if (data.rsi > 70) rsiSignal = 'Overbought';
                else if (data.rsi < 30) rsiSignal = 'Oversold';
                this.updateIndicatorUI('rsi-signal', rsiSignal);
            }
            
            if (data.bb && data.price) {
                let bbSignal = 'Neutral';
                if (data.price > data.bb.upper) bbSignal = 'Overbought';
                else if (data.price < data.bb.lower) bbSignal = 'Oversold';
                this.updateIndicatorUI('bb-signal', bbSignal);
            }
            
            if (data.macd) {
                let macdSignal = 'Neutral';
                if (data.macd.histogram > 0 && data.macd.macd > data.macd.signal) macdSignal = 'Bullish';
                else if (data.macd.histogram < 0 && data.macd.macd < data.macd.signal) macdSignal = 'Bearish';
                this.updateIndicatorUI('macd-signal', macdSignal);
            }
            
            if (data.ema && data.price) {
                let emaSignal = 'Neutral';
                if (data.price > data.ema.ema50 && data.ema.ema50 > data.ema.ema200) emaSignal = 'Bullish';
                else if (data.price < data.ema.ema50 && data.ema.ema50 < data.ema.ema200) emaSignal = 'Bearish';
                this.updateIndicatorUI('ema-signal', emaSignal);
            }
        } catch (error) {
            console.error('Error updating indicators:', error);
        }
    }

    async fetchIndicatorData() {
        try {
            return await window.mexcData.getKlineData(this.currentPair, this.interval);
        } catch (error) {
            console.error('Error fetching indicator data:', error);
            return null;
        }
    }

    updateIndicatorUI(elementId, signal) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const signalColors = {
            Bullish: '#22c55e',
            Bearish: '#ef4444',
            Neutral: '#6b7280',
            Overbought: '#7c3aed',
            Oversold: '#2563eb'
        };
        
        element.textContent = signal;
        element.style.color = signalColors[signal] || signalColors.Neutral;
    }
}

// Create a singleton instance
const indicatorUpdater = new IndicatorUpdater();

// Export the instance
export default indicatorUpdater;

// Also make it globally available
window.indicatorUpdater = indicatorUpdater;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    indicatorUpdater.init();
});
