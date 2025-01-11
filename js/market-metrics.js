import { htxHandler } from './config/htx-config.js';

export class MarketMetrics {
    constructor() {
        if (MarketMetrics.instance) {
            return MarketMetrics.instance;
        }
        MarketMetrics.instance = this;
        
        console.log('MarketMetrics: Constructor started');
        this.updateInterval = 300000; // 5 minutes
        this.lastUpdate = 0;
        this.initialized = false;
        
        this.metrics = {
            altcoinDominance: 0,
            fearGreed: {
                value: 50,
                classification: 'Neutral',
                timestamp: Date.now()
            },
            volatility: 'Low',
            marketSummary: '',
            keyLevels: {},
            correlations: {},
            obvTrend: null
        };
        
        // Store DOM elements
        this.elements = {
            altcoinDominance: document.getElementById('altcoinDominance'),
            fearGreed: document.getElementById('altcoinFearGreed'),
            volatility: document.getElementById('marketVolatility'),
            obvTrend: document.getElementById('obvTrend'),
            marketSummary: document.getElementById('marketSummary'),
            correlations: document.getElementById('marketCorrelations'),
            tradingStrategy: document.getElementById('tradingStrategy'),
            marketOverview: document.getElementById('marketOverview')
        };
    }

    async init() {
        try {
            if (this.initialized) {
                console.log('MarketMetrics: Already initialized');
                return;
            }

            console.log('MarketMetrics: Initialization started');
            await this.updateAllMetrics();
            
            // Set up periodic updates
            setInterval(() => this.updateAllMetrics(), this.updateInterval);
            
            this.initialized = true;
            console.log('MarketMetrics: Initialization completed');
        } catch (error) {
            console.error('MarketMetrics: Error during initialization:', error);
            throw error;
        }
    }

    async updateAllMetrics() {
        try {
            console.log('MarketMetrics: Updating all metrics');
            
            const now = Date.now();
            if (now - this.lastUpdate < this.updateInterval) {
                console.log('MarketMetrics: Update skipped - too soon');
                return;
            }
            
            await Promise.allSettled([
                this.updateMarketOverview(),
                this.updateFearAndGreed(),
                this.updateVolatility(),
                this.updateCorrelations()
            ]);
            
            this.lastUpdate = now;
            console.log('MarketMetrics: All metrics updated');
        } catch (error) {
            console.error('MarketMetrics: Error updating metrics:', error);
            throw error;
        }
    }

    async updateMarketOverview() {
        try {
            const response = await htxHandler.fetchTicker('BTCUSDT');
            if (!response) {
                throw new Error('No data received for market overview');
            }
            
            const btcPrice = parseFloat(response.lastPrice);
            const btcChange = parseFloat(response.priceChangePercent);
            
            const overview = `BTC Price: $${btcPrice.toLocaleString()} | 24h Change: ${btcChange > 0 ? '+' : ''}${btcChange.toFixed(2)}%`;
            
            if (this.elements.marketOverview) {
                this.elements.marketOverview.textContent = overview;
            }
            
            return overview;
        } catch (error) {
            console.error('MarketMetrics: Error updating market overview:', error);
            throw error;
        }
    }

    async updateFearAndGreed() {
        try {
            // Calculate fear and greed based on available metrics
            const btcData = await htxHandler.getKlineData('BTCUSDT', '1d', 30);
            if (!btcData || !btcData.klines || btcData.klines.length === 0) {
                throw new Error('Invalid kline data for fear and greed calculation');
            }
            
            const klines = btcData.klines;
            const prices = klines.map(k => k.close);
            const volumes = klines.map(k => k.volume);
            
            // Calculate metrics
            const volatility = this.calculateVolatility(prices);
            const momentum = this.calculateMomentum(prices);
            const volumeMA = this.calculateVolumeMA(volumes);
            
            // Calculate fear and greed index (0-100)
            let fearGreedValue = 50; // Start at neutral
            
            // Adjust based on volatility (0-20)
            fearGreedValue += (volatility < 0.02) ? 10 : (volatility > 0.05) ? -10 : 0;
            
            // Adjust based on momentum (0-40)
            fearGreedValue += momentum > 0 ? 20 : momentum < 0 ? -20 : 0;
            
            // Adjust based on volume (0-40)
            fearGreedValue += volumeMA > 1.2 ? 20 : volumeMA < 0.8 ? -20 : 0;
            
            // Ensure value is between 0 and 100
            fearGreedValue = Math.max(0, Math.min(100, fearGreedValue));
            
            // Get classification
            let classification;
            if (fearGreedValue >= 80) classification = 'Extreme Greed';
            else if (fearGreedValue >= 60) classification = 'Greed';
            else if (fearGreedValue > 40) classification = 'Neutral';
            else if (fearGreedValue > 20) classification = 'Fear';
            else classification = 'Extreme Fear';
            
            this.metrics.fearGreed = {
                value: fearGreedValue,
                classification,
                timestamp: Date.now()
            };
            
            if (this.elements.fearGreed) {
                this.elements.fearGreed.textContent = `${classification} (${fearGreedValue})`;
                this.elements.fearGreed.className = classification.toLowerCase().replace(' ', '-');
            }
            
            return this.metrics.fearGreed;
        } catch (error) {
            console.error('MarketMetrics: Error calculating market sentiment:', error);
            throw error;
        }
    }

    calculateVolatility(prices, period = 20) {
        if (prices.length < period) return 0;
        
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const mean = returns.reduce((a, b) => a + b) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    calculateMomentum(prices, period = 14) {
        if (prices.length < period) return 0;
        return (prices[prices.length - 1] - prices[prices.length - period]) / prices[prices.length - period];
    }

    calculateVolumeMA(volumes, period = 20) {
        if (volumes.length < period) return 1;
        
        const recentAvg = volumes.slice(-period).reduce((a, b) => a + b) / period;
        const oldAvg = volumes.slice(-period*2, -period).reduce((a, b) => a + b) / period;
        
        return recentAvg / oldAvg;
    }

    async updateVolatility() {
        try {
            const btcData = await htxHandler.getKlineData('BTCUSDT', '1h', 24);
            if (!btcData || !btcData.klines || btcData.klines.length === 0) {
                throw new Error('Invalid kline data for volatility calculation');
            }
            
            const prices = btcData.klines.map(k => k.close);
            const volatility = this.calculateVolatility(prices);
            
            let volatilityLevel;
            if (volatility < 0.02) volatilityLevel = 'Low';
            else if (volatility < 0.05) volatilityLevel = 'Medium';
            else volatilityLevel = 'High';
            
            this.metrics.volatility = volatilityLevel;
            
            if (this.elements.volatility) {
                this.elements.volatility.textContent = volatilityLevel;
                this.elements.volatility.className = `volatility-${volatilityLevel.toLowerCase()}`;
            }
            
            return volatilityLevel;
        } catch (error) {
            console.error('MarketMetrics: Error updating volatility:', error);
            throw error;
        }
    }

    async updateCorrelations() {
        try {
            const pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
            const correlations = {};
            
            for (let i = 0; i < pairs.length; i++) {
                for (let j = i + 1; j < pairs.length; j++) {
                    const pair1 = pairs[i];
                    const pair2 = pairs[j];
                    
                    const [data1, data2] = await Promise.all([
                        htxHandler.getKlineData(pair1, '1d', 30),
                        htxHandler.getKlineData(pair2, '1d', 30)
                    ]);
                    
                    if (!data1?.klines || !data2?.klines) continue;
                    
                    const prices1 = data1.klines.map(k => k.close);
                    const prices2 = data2.klines.map(k => k.close);
                    
                    const correlation = this.calculateCorrelation(prices1, prices2);
                    correlations[`${pair1}-${pair2}`] = correlation;
                }
            }
            
            this.metrics.correlations = correlations;
            
            if (this.elements.correlations) {
                const correlationHtml = Object.entries(correlations)
                    .map(([pair, value]) => `${pair}: ${value.toFixed(2)}`)
                    .join('<br>');
                this.elements.correlations.innerHTML = correlationHtml;
            }
            
            return correlations;
        } catch (error) {
            console.error('MarketMetrics: Error updating correlations:', error);
            throw error;
        }
    }

    calculateCorrelation(array1, array2) {
        if (array1.length !== array2.length) return 0;
        
        const n = array1.length;
        const mean1 = array1.reduce((a, b) => a + b) / n;
        const mean2 = array2.reduce((a, b) => a + b) / n;
        
        let num = 0;
        let den1 = 0;
        let den2 = 0;
        
        for (let i = 0; i < n; i++) {
            const diff1 = array1[i] - mean1;
            const diff2 = array2[i] - mean2;
            num += diff1 * diff2;
            den1 += diff1 * diff1;
            den2 += diff2 * diff2;
        }
        
        if (den1 === 0 || den2 === 0) return 0;
        return num / Math.sqrt(den1 * den2);
    }
}

// Create and export singleton instance
export const marketMetrics = new MarketMetrics();

// Make it globally available
window.marketMetrics = marketMetrics;
