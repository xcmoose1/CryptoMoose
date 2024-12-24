import mexcHandler from './mexc-data.js';

class IndicatorSignals {
    constructor() {
        console.log('IndicatorSignals constructor called');
        this.indicators = {
            volume: document.querySelector('#volume'),
            rsi: document.querySelector('#rsi'),
            ema: document.querySelector('#ema'),
            macd: document.querySelector('#macd'),
            bb: document.querySelector('#bb'),
            atr: document.querySelector('#atr'),
            pivot: document.querySelector('#pivot'),
            vwap: document.querySelector('#vwap'),
            orderflow: document.querySelector('#orderflow'),
            liquidity: document.querySelector('#liquidity')
        };
        console.log('Indicators found:', this.indicators);
        
        // Initialize controls
        this.pairSelector = document.querySelector('#tradingPair');
        this.timeframeButtons = document.querySelectorAll('.timeframe-btn');
        
        this.currentPair = this.pairSelector ? this.pairSelector.value : 'BTCUSDT';
        this.interval = '4h';
        this.updateInterval = 15000; // 15 seconds
        
        // Setup event listeners
        if (this.pairSelector) {
            this.pairSelector.addEventListener('change', () => {
                console.log('Pair changed to:', this.pairSelector.value);
                this.currentPair = this.pairSelector.value;
                this.updateIndicators();
            });
        }
        
        this.timeframeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Timeframe changed to:', btn.dataset.timeframe);
                this.timeframeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.interval = btn.dataset.timeframe;
                this.updateIndicators();
            });
        });
        
        this.init();
    }

    async init() {
        console.log('IndicatorSignals init called');
        await this.updateIndicators();
        console.log('First update complete, setting interval');
        setInterval(() => this.updateIndicators(), this.updateInterval);
    }

    async updateIndicators() {
        try {
            const data = await this.fetchMexcData();
            if (!data) {
                console.warn('No data received from MEXC');
                return;
            }

            const { prices, volumes, klines } = data;
            const lastPrice = prices[prices.length - 1];
            const lastVolume = volumes[volumes.length - 1];

            // Calculate indicators
            const rsi = this.calculateRSI(prices);
            const bb = this.calculateBollingerBands(prices);
            const macd = this.calculateMACD(prices);
            const ema = this.calculateEMA(prices);
            const atr = this.calculateATR(klines);
            const pivot = this.calculatePivotPoints(klines);
            const vwap = this.calculateVWAP(klines);
            const volumeSignal = this.analyzeVolume(volumes);
            const orderFlow = this.analyzeOrderFlow(klines);
            const liquidity = this.analyzeLiquidity(klines);

            // Update RSI signal
            let rsiSignal = 'Neutral';
            if (rsi > 70) rsiSignal = 'Overbought';
            else if (rsi < 30) rsiSignal = 'Oversold';
            this.updateIndicatorUI(this.indicators.rsi, rsiSignal);

            // Update Bollinger Bands signal
            let bbSignal = 'Neutral';
            if (lastPrice > bb.upper) bbSignal = 'Overbought';
            else if (lastPrice < bb.lower) bbSignal = 'Oversold';
            this.updateIndicatorUI(this.indicators.bb, bbSignal);

            // Update MACD signal
            let macdSignal = 'Neutral';
            if (macd.histogram > 0 && macd.macd > macd.signal) macdSignal = 'Bullish';
            else if (macd.histogram < 0 && macd.macd < macd.signal) macdSignal = 'Bearish';
            this.updateIndicatorUI(this.indicators.macd, macdSignal);

            // Update EMA signal
            let emaSignal = 'Neutral';
            if (lastPrice > ema.ema50 && ema.ema50 > ema.ema200) emaSignal = 'Bullish';
            else if (lastPrice < ema.ema50 && ema.ema50 < ema.ema200) emaSignal = 'Bearish';
            this.updateIndicatorUI(this.indicators.ema, emaSignal);

            // Update Volume signal
            this.updateIndicatorUI(this.indicators.volume, volumeSignal);

            // Update ATR signal
            let atrSignal = 'Neutral';
            if (atr.value > atr.average * 1.5) atrSignal = 'High';
            else if (atr.value < atr.average * 0.5) atrSignal = 'Low';
            this.updateIndicatorUI(this.indicators.atr, atrSignal);

            // Update Pivot Points signal
            let pivotSignal = 'Neutral';
            if (lastPrice > pivot.r1) pivotSignal = 'Bullish';
            else if (lastPrice < pivot.s1) pivotSignal = 'Bearish';
            this.updateIndicatorUI(this.indicators.pivot, pivotSignal);

            // Update VWAP signal
            let vwapSignal = 'Neutral';
            if (lastPrice > vwap.value * 1.02) vwapSignal = 'Bullish';
            else if (lastPrice < vwap.value * 0.98) vwapSignal = 'Bearish';
            this.updateIndicatorUI(this.indicators.vwap, vwapSignal);

            // Update Order Flow signal
            this.updateIndicatorUI(this.indicators.orderflow, orderFlow);

            // Update Liquidity signal
            this.updateIndicatorUI(this.indicators.liquidity, liquidity);

        } catch (error) {
            console.error('Error updating indicators:', error);
        }
    }

    async fetchMexcData() {
        try {
            console.log('Fetching MEXC data with:', { pair: this.currentPair, interval: this.interval });
            const response = await mexcHandler.getKlineData(this.currentPair, this.interval);
            console.log('Received MEXC data:', { 
                pricesLength: response.prices.length,
                volumesLength: response.volumes.length,
                lastPrice: response.prices[response.prices.length - 1],
                lastVolume: response.volumes[response.volumes.length - 1] 
            });
            return response;
        } catch (error) {
            console.error('Error fetching MEXC data:', error);
            return null;
        }
    }

    updateIndicatorUI(element, signal) {
        if (!element) {
            console.warn('Missing indicator element');
            return;
        }
        
        console.log('Updating indicator UI:', { 
            elementId: element.id, 
            signal: signal 
        });

        const signalText = element.querySelector('.signal-text');
        if (signalText) {
            signalText.textContent = signal;
            
            // Update color based on signal
            element.classList.remove('bullish', 'bearish', 'neutral', 'overbought', 'oversold');
            element.classList.add(signal.toLowerCase());
            
            // Update dots
            const dots = element.querySelectorAll('.signal-dot');
            dots.forEach(dot => {
                dot.classList.remove('active');
                if (signal === 'Bullish' || signal === 'Overbought') {
                    dots[2].classList.add('active');
                } else if (signal === 'Bearish' || signal === 'Oversold') {
                    dots[0].classList.add('active');
                } else {
                    dots[1].classList.add('active');
                }
            });
        } else {
            console.warn('Signal text element not found in:', element.id);
        }
    }

    getSignalColor(signal) {
        if (!signal) return '#f0b90b'; // Default to yellow/neutral
        
        switch(signal.toLowerCase()) {
            case 'bullish':
            case 'buy':
            case 'oversold':
                return '#26a69a'; // Green
            case 'bearish':
            case 'sell':
            case 'overbought':
                return '#ef5350'; // Red
            default:
                return '#f0b90b'; // Yellow/Neutral
        }
    }

    calculateRSI(prices, period = 14) {
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i < period + 1; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        for (let i = period + 1; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                avgGain = (avgGain * 13 + difference) / period;
                avgLoss = (avgLoss * 13) / period;
            } else {
                avgGain = (avgGain * 13) / period;
                avgLoss = (avgLoss * 13 - difference) / period;
            }
        }
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateBollingerBands(prices, period = 20, multiplier = 2) {
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
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        const macdLine = fastEMA - slowEMA;
        const signalLine = this.calculateEMA([macdLine], signalPeriod);
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: macdLine - signalLine
        };
    }

    calculateEMA(prices, period) {
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }
        
        return { ema50: ema, ema200: ema };
    }

    calculateATR(klines, period = 14) {
        let tr = [];
        let atr = 0;
        
        // Calculate True Range
        for (let i = 1; i < klines.length; i++) {
            const high = klines[i].high;
            const low = klines[i].low;
            const prevClose = klines[i-1].close;
            
            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            tr.push(Math.max(tr1, tr2, tr3));
        }
        
        // Calculate ATR
        atr = tr.slice(0, period).reduce((a, b) => a + b) / period;
        
        // Calculate Average ATR for comparison
        const average = tr.reduce((a, b) => a + b) / tr.length;
        
        return { value: atr, average };
    }

    calculatePivotPoints(klines) {
        const lastCandle = klines[klines.length - 1];
        const high = lastCandle.high;
        const low = lastCandle.low;
        const close = lastCandle.close;
        
        const pp = (high + low + close) / 3;
        const r1 = (2 * pp) - low;
        const s1 = (2 * pp) - high;
        
        return { pp, r1, s1 };
    }

    calculateVWAP(klines) {
        let cumVolume = 0;
        let cumVolumePrice = 0;
        
        klines.forEach(candle => {
            const typicalPrice = (candle.high + candle.low + candle.close) / 3;
            cumVolume += candle.volume;
            cumVolumePrice += typicalPrice * candle.volume;
        });
        
        return { value: cumVolumePrice / cumVolume };
    }

    analyzeVolume(volumes) {
        const lastVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
        
        if (lastVolume > avgVolume * 2) return 'High';
        if (lastVolume < avgVolume * 0.5) return 'Low';
        return 'Neutral';
    }

    analyzeOrderFlow(klines) {
        const lastCandles = klines.slice(-5);
        let buyPressure = 0;
        let sellPressure = 0;
        
        lastCandles.forEach(candle => {
            const bodySize = Math.abs(candle.close - candle.open);
            if (candle.close > candle.open) {
                buyPressure += bodySize * candle.volume;
            } else {
                sellPressure += bodySize * candle.volume;
            }
        });
        
        if (buyPressure > sellPressure * 1.5) return 'Bullish';
        if (sellPressure > buyPressure * 1.5) return 'Bearish';
        return 'Neutral';
    }

    analyzeLiquidity(klines) {
        const lastCandles = klines.slice(-10);
        const avgVolume = lastCandles.reduce((a, b) => a + b.volume, 0) / lastCandles.length;
        const spreadSum = lastCandles.reduce((a, b) => a + (b.high - b.low), 0) / lastCandles.length;
        
        if (avgVolume > 1000000 && spreadSum < 0.001) return 'High';
        if (avgVolume < 100000 || spreadSum > 0.005) return 'Low';
        return 'Neutral';
    }

    // Create a singleton instance
    static instance;

    static getInstance() {
        if (!IndicatorSignals.instance) {
            IndicatorSignals.instance = new IndicatorSignals();
        }
        return IndicatorSignals.instance;
    }
}

// Export the instance
export default IndicatorSignals.getInstance();

// Also make it globally available
window.indicatorSignals = IndicatorSignals.getInstance();
