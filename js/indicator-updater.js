import { HTX_CONFIG, htxHandler } from './config/htx-config.js';

class IndicatorUpdater {
    constructor() {
        this.currentPair = HTX_CONFIG.MARKET_CONFIG.DEFAULT_SYMBOL;
        this.interval = HTX_CONFIG.MARKET_CONFIG.DEFAULT_INTERVAL;
        this.updateInterval = HTX_CONFIG.MARKET_CONFIG.UPDATE_INTERVAL;
        this.retryDelay = HTX_CONFIG.MARKET_CONFIG.RETRY_DELAY;
        this.maxRetries = HTX_CONFIG.MARKET_CONFIG.MAX_RETRIES;
        this.indicators = {
            rsi: null,
            bb: null,
            macd: null,
            ema: null,
            price: null,
            volume: null
        };
    }

    async init() {
        try {
            console.log('Initializing indicators...');
            // Initial update of all indicators
            await this.updateIndicators();
            
            // Set up hourly updates
            const now = new Date();
            const minutesToNextHour = 60 - now.getMinutes();
            const msToNextHour = (minutesToNextHour * 60 * 1000) - (now.getSeconds() * 1000);
            
            // First update at the start of next hour
            setTimeout(async () => {
                await this.updateIndicators();
                // Then update every hour
                setInterval(() => this.updateIndicators(), this.updateInterval);
            }, msToNextHour);
            
            console.log(`Next update in ${Math.round(msToNextHour / 1000 / 60)} minutes`);
        } catch (error) {
            console.error('Error in init:', error);
        }
    }

    async updateIndicators() {
        try {
            console.log('Updating indicators...');
            const data = await this.fetchIndicatorData();
            if (!data) return;
            
            // Store all indicator values
            this.indicators = data;
            
            // Update all UI elements at once
            this.updateAllIndicatorUI();
            
            console.log('Indicators updated successfully');
        } catch (error) {
            console.error('Error updating indicators:', error);
        }
    }

    updateAllIndicatorUI() {
        // Update RSI
        const rsiElement = document.getElementById('rsi-indicator');
        if (rsiElement) {
            let rsiSignal = 'Neutral';
            if (this.indicators.rsi > 70) rsiSignal = 'Bearish';
            else if (this.indicators.rsi < 30) rsiSignal = 'Bullish';
            rsiElement.textContent = `${Math.round(this.indicators.rsi)}`;
            rsiElement.className = `indicator ${rsiSignal.toLowerCase()}`;
        }
        
        // Update Bollinger Bands
        const bbElement = document.getElementById('bb-indicator');
        if (bbElement) {
            let bbSignal = 'Neutral';
            if (this.indicators.price > this.indicators.bb.upper) bbSignal = 'Bearish';
            else if (this.indicators.price < this.indicators.bb.lower) bbSignal = 'Bullish';
            bbElement.textContent = bbSignal;
            bbElement.className = `indicator ${bbSignal.toLowerCase()}`;
        }
        
        // Update MACD
        const macdElement = document.getElementById('macd-indicator');
        if (macdElement) {
            let macdSignal = 'Neutral';
            if (this.indicators.macd.histogram > 0) macdSignal = 'Bullish';
            else if (this.indicators.macd.histogram < 0) macdSignal = 'Bearish';
            macdElement.textContent = macdSignal;
            macdElement.className = `indicator ${macdSignal.toLowerCase()}`;
        }
        
        // Update EMA
        const emaElement = document.getElementById('ema-indicator');
        if (emaElement) {
            let emaSignal = 'Neutral';
            if (this.indicators.price > this.indicators.ema.ema50) emaSignal = 'Bullish';
            else if (this.indicators.price < this.indicators.ema.ema50) emaSignal = 'Bearish';
            emaElement.textContent = emaSignal;
            emaElement.className = `indicator ${emaSignal.toLowerCase()}`;
        }

        // Update Market Sentiment
        const sentimentElement = document.getElementById('market-sentiment');
        if (sentimentElement) {
            const valueElement = sentimentElement.querySelector('.indicator-value');
            if (valueElement) {
                let overallSentiment = this.calculateOverallSentiment();
                valueElement.textContent = overallSentiment;
                valueElement.className = `indicator-value ${overallSentiment.toLowerCase()}`;
            }
        }

        // Update Volume
        const volumeElement = document.getElementById('volume-indicator');
        if (volumeElement) {
            const valueElement = volumeElement.querySelector('.indicator-value');
            if (valueElement) {
                valueElement.textContent = this.indicators.volume;
                valueElement.className = 'indicator-value';
            }
        }

        // Update Price
        const priceElement = document.getElementById('price-indicator');
        if (priceElement) {
            const valueElement = priceElement.querySelector('.indicator-value');
            if (valueElement) {
                const price = typeof this.indicators.price === 'number' 
                    ? `$${this.indicators.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}` 
                    : this.indicators.price;
                valueElement.textContent = price;
                valueElement.className = 'indicator-value';
            }
        }
    }

    calculateOverallSentiment() {
        let bullishCount = 0;
        let bearishCount = 0;

        // Count bullish/bearish signals
        if (this.indicators.rsi < 30) bullishCount++;
        else if (this.indicators.rsi > 70) bearishCount++;

        if (this.indicators.macd.histogram > 0) bullishCount++;
        else if (this.indicators.macd.histogram < 0) bearishCount++;

        if (this.indicators.price > this.indicators.ema.ema50) bullishCount++;
        else if (this.indicators.price < this.indicators.ema.ema50) bearishCount++;

        // Determine overall sentiment
        if (bullishCount > bearishCount) return 'Bullish';
        if (bearishCount > bullishCount) return 'Bearish';
        return 'Neutral';
    }

    async fetchIndicatorData() {
        try {
            console.log(`Fetching indicator data for ${this.currentPair}...`);
            
            // Construct the API endpoint
            const endpoint = HTX_CONFIG.ENDPOINTS.MARKET.KLINE;
            const params = {
                symbol: this.currentPair,
                period: this.interval,
                size: 200
            };
            
            // Make the request
            const url = `${HTX_CONFIG.REST_URL}${endpoint}?${new URLSearchParams(params)}`;
            console.log('Fetching from URL:', url);
            
            const response = await fetch(url);
            if (!response.ok) {
                const text = await response.text();
                console.error('API Error Response:', text);
                throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
            }
            
            const data = await response.json();
            console.log('Received kline data:', data);
            
            if (!data || data.status !== 'ok' || !data.data || !data.data.length) {
                console.error('Invalid API response:', data);
                throw new Error('Invalid response from HTX API');
            }

            const klines = data.data;
            
            // Extract price data
            const closes = klines.map(k => parseFloat(k.close));
            const highs = klines.map(k => parseFloat(k.high));
            const lows = klines.map(k => parseFloat(k.low));
            const volumes = klines.map(k => parseFloat(k.vol));

            // Calculate all indicators
            const currentPrice = closes[closes.length - 1];
            const rsiValue = this.calculateRSI(closes);
            const bbValue = this.calculateBollingerBands(closes);
            const macdValue = this.calculateMACD(closes);
            const emaValue = this.calculateEMA(closes);
            
            // Format volume
            const currentVolume = this.formatVolume(volumes[volumes.length - 1]);
            
            return {
                price: currentPrice,
                volume: currentVolume,
                rsi: rsiValue,
                bb: bbValue,
                macd: macdValue,
                ema: emaValue
            };
            
        } catch (error) {
            console.error('Error fetching indicator data:', error);
            // Return default values on error
            return {
                price: null,
                volume: 'N/A',
                rsi: 50,
                bb: { upper: null, middle: null, lower: null },
                macd: { macd: 0, signal: 0, histogram: 0 },
                ema: { ema50: null, ema200: null }
            };
        }
    }

    formatVolume(volume) {
        if (volume >= 1000000000) {
            return `${(volume / 1000000000).toFixed(2)}B`;
        } else if (volume >= 1000000) {
            return `${(volume / 1000000).toFixed(2)}M`;
        } else if (volume >= 1000) {
            return `${(volume / 1000).toFixed(2)}K`;
        } else {
            return volume.toFixed(2);
        }
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const diff = prices[prices.length - i] - prices[prices.length - i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        
        if (losses === 0) return 100;
        
        const rs = gains / losses;
        return 100 - (100 / (1 + rs));
    }

    calculateBollingerBands(prices, period = 20, multiplier = 2) {
        if (prices.length < period) return { upper: null, middle: null, lower: null };
        
        const sma = prices.slice(-period).reduce((a, b) => a + b) / period;
        const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
        const standardDeviation = Math.sqrt(squaredDiffs.reduce((a, b) => a + b) / period);
        
        return {
            upper: sma + (multiplier * standardDeviation),
            middle: sma,
            lower: sma - (multiplier * standardDeviation)
        };
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod + signalPeriod) {
            return { macd: 0, signal: 0, histogram: 0 };
        }

        const fastEMA = this.calculateEMAValue(prices, fastPeriod);
        const slowEMA = this.calculateEMAValue(prices, slowPeriod);
        const macdLine = fastEMA - slowEMA;
        const signalLine = this.calculateEMAValue([...Array(signalPeriod - 1).fill(0), macdLine], signalPeriod);
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: macdLine - signalLine
        };
    }

    calculateEMA(prices) {
        return {
            ema50: this.calculateEMAValue(prices, 50),
            ema200: this.calculateEMAValue(prices, 200)
        };
    }

    calculateEMAValue(prices, period) {
        if (prices.length < period) return prices[prices.length - 1];
        
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
        
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }
        
        return ema;
    }
}

// Create a singleton instance
const indicatorUpdater = new IndicatorUpdater();

// Export the instance
export { indicatorUpdater };

// Also make it globally available for debugging
window.indicatorUpdater = indicatorUpdater;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    indicatorUpdater.init();
});
