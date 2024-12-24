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
        this.timeframe = '1h';
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
                this.timeframe = btn.dataset.timeframe;
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

    updateSignal(indicatorName, signal, strength) {
        const indicator = this.indicators[indicatorName];
        if (!indicator) {
            console.error('Indicator not found:', indicatorName);
            return;
        }

        const signalText = indicator.querySelector('.signal-text');
        const dots = indicator.querySelectorAll('.signal-dot');

        if (!signalText || !dots) {
            console.error('Signal elements not found for:', indicatorName);
            return;
        }

        // Update signal text
        signalText.textContent = this.capitalizeFirst(signal);

        // Update signal color
        indicator.classList.remove('bullish', 'bearish', 'neutral');
        indicator.classList.add(signal.toLowerCase());

        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.remove('active');
            if (index < strength) {
                dot.classList.add('active');
            }
        });
    }

    async updateIndicators() {
        try {
            // Fetch klines data from MEXC
            const response = await fetch(`/api/mexc/klines?symbol=${this.currentPair}&interval=${this.timeframe}&limit=100`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text();
            console.log('Raw response:', text);
            
            let klines;
            try {
                klines = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse JSON:', text);
                throw new Error('Invalid JSON response');
            }
            
            console.log('Parsed klines data:', klines);

            if (!Array.isArray(klines) || klines.length === 0) {
                throw new Error('Invalid klines data received');
            }

            // Extract data series
            const opens = klines.map(k => parseFloat(k[1]));
            const highs = klines.map(k => parseFloat(k[2]));
            const lows = klines.map(k => parseFloat(k[3]));
            const closes = klines.map(k => parseFloat(k[4]));
            const volumes = klines.map(k => parseFloat(k[5]));

            // Calculate all indicators
            const volumeSignal = this.getVolumeSignal(volumes);
            const rsiValue = this.calculateRSI(closes);
            const rsiSignal = this.getRSISignal(rsiValue);
            const ema50 = this.calculateEMA(closes, 50);
            const ema200 = this.calculateEMA(closes, 200);
            const emaSignal = this.getEMACrossSignal(ema50, ema200);
            const { macd, signal, histogram } = this.calculateMACD(closes);
            const macdSignal = this.getMACDSignal(macd[macd.length-1], signal[signal.length-1], histogram[histogram.length-1]);
            const { upper, lower, middle } = this.calculateBB(closes);
            const bbSignal = this.getBBSignal(closes[closes.length-1], upper[upper.length-1], lower[lower.length-1], middle[middle.length-1]);
            const atr = this.calculateATR(highs, lows, closes);
            const atrSignal = this.getATRSignal(atr[atr.length-1], closes[closes.length-1]);
            const pivots = this.calculatePivotPoints(highs, lows, closes);
            const pivotSignal = this.getPivotSignal(closes[closes.length-1], pivots);
            const vwap = this.calculateVWAP(highs, lows, closes, volumes);
            const vwapSignal = this.getVWAPSignal(closes[closes.length-1], vwap[vwap.length-1]);
            const orderFlowSignal = this.analyzeOrderFlow(opens, closes, highs, lows, volumes);
            const liquiditySignal = this.analyzeLiquidity(highs, lows, volumes);

            // Update individual indicators
            this.updateSignal('volume', volumeSignal.signal, volumeSignal.strength);
            this.updateSignal('rsi', rsiSignal.signal, rsiSignal.strength);
            this.updateSignal('ema', emaSignal.signal, emaSignal.strength);
            this.updateSignal('macd', macdSignal.signal, macdSignal.strength);
            this.updateSignal('bb', bbSignal.signal, bbSignal.strength);
            this.updateSignal('atr', atrSignal.signal, atrSignal.strength);
            this.updateSignal('pivot', pivotSignal.signal, pivotSignal.strength);
            this.updateSignal('vwap', vwapSignal.signal, vwapSignal.strength);
            this.updateSignal('orderflow', orderFlowSignal.signal, orderFlowSignal.strength);
            this.updateSignal('liquidity', liquiditySignal.signal, liquiditySignal.strength);

            // Calculate and update overall market sentiment
            const signals = [
                { signal: volumeSignal, weight: 1 },
                { signal: rsiSignal, weight: 1.5 },
                { signal: emaSignal, weight: 2 },
                { signal: macdSignal, weight: 1.5 },
                { signal: bbSignal, weight: 1 },
                { signal: atrSignal, weight: 0.5 },
                { signal: pivotSignal, weight: 1 },
                { signal: vwapSignal, weight: 1.5 },
                { signal: orderFlowSignal, weight: 2 },
                { signal: liquiditySignal, weight: 1 }
            ];

            const sentiment = this.calculateOverallSentiment(signals);
            this.updateMarketSentiment(sentiment);

        } catch (error) {
            console.error('Error updating indicators:', error);
        }
    }

    calculateOverallSentiment(signals) {
        let totalScore = 0;
        let totalWeight = 0;

        signals.forEach(({ signal, weight }) => {
            let signalScore;
            switch (signal.signal) {
                case 'bullish':
                    signalScore = signal.strength;
                    break;
                case 'bearish':
                    signalScore = -signal.strength;
                    break;
                default:
                    signalScore = 0;
            }
            totalScore += signalScore * weight;
            totalWeight += weight;
        });

        const normalizedScore = totalScore / totalWeight;

        if (normalizedScore >= 1.5) return { sentiment: 'Strongly Bullish', score: normalizedScore };
        if (normalizedScore >= 0.5) return { sentiment: 'Bullish', score: normalizedScore };
        if (normalizedScore > -0.5) return { sentiment: 'Neutral', score: normalizedScore };
        if (normalizedScore > -1.5) return { sentiment: 'Bearish', score: normalizedScore };
        return { sentiment: 'Strongly Bearish', score: normalizedScore };
    }

    updateMarketSentiment(sentiment) {
        const sentimentElement = document.querySelector('#marketSentiment .sentiment-value');
        if (sentimentElement) {
            sentimentElement.textContent = sentiment.sentiment;
            // Add color based on sentiment
            sentimentElement.className = 'sentiment-value';
            if (sentiment.sentiment.includes('Bullish')) {
                sentimentElement.classList.add('bullish');
            } else if (sentiment.sentiment.includes('Bearish')) {
                sentimentElement.classList.add('bearish');
            } else {
                sentimentElement.classList.add('neutral');
            }
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Technical Indicator Calculations
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

    calculateBB(prices, period = 20, multiplier = 2) {
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
        
        return ema;
    }

    calculateATR(highs, lows, closes, period = 14) {
        const trueRanges = [];
        for (let i = 1; i < highs.length; i++) {
            const prevClose = closes[i - 1];
            const tr = Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - prevClose),
                Math.abs(lows[i] - prevClose)
            );
            trueRanges.push(tr);
        }
        return this.calculateEMA(trueRanges, period);
    }

    calculateVWAP(highs, lows, closes, volumes) {
        let cumulativeTPV = 0;
        let cumulativeVolume = 0;
        
        for (let i = 0; i < closes.length; i++) {
            const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
            cumulativeTPV += typicalPrice * volumes[i];
            cumulativeVolume += volumes[i];
        }
        
        return cumulativeTPV / cumulativeVolume;
    }

    calculatePivotPoints(highs, lows, closes) {
        const high = Math.max(...highs);
        const low = Math.min(...lows);
        const close = closes[closes.length - 1];
        
        const pp = (high + low + close) / 3;
        const r1 = (2 * pp) - low;
        const s1 = (2 * pp) - high;
        const r2 = pp + (high - low);
        const s2 = pp - (high - low);
        
        return { pp, r1, s1, r2, s2 };
    }

    analyzeOrderFlow(opens, closes, highs, lows, volumes) {
        const lastIndex = opens.length - 1;
        let bullishCandles = 0;
        let bearishCandles = 0;
        
        // Analyze last 5 candles
        for (let i = lastIndex - 4; i <= lastIndex; i++) {
            if (i >= 0) {  
                if (closes[i] > opens[i]) bullishCandles++;
                if (closes[i] < opens[i]) bearishCandles++;
            }
        }
        
        // Calculate average volume
        const recentVolumes = volumes.slice(-5);
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
        const lastVolume = volumes[lastIndex];
        
        if (bullishCandles >= 4 && lastVolume > avgVolume * 1.5) {
            return { signal: 'bullish', strength: 3 };
        } else if (bearishCandles >= 4 && lastVolume > avgVolume * 1.5) {
            return { signal: 'bearish', strength: 3 };
        } else if (bullishCandles > bearishCandles && lastVolume > avgVolume) {
            return { signal: 'bullish', strength: 2 };
        } else if (bearishCandles > bullishCandles && lastVolume > avgVolume) {
            return { signal: 'bearish', strength: 2 };
        }
        
        return { signal: 'neutral', strength: 1 };
    }

    analyzeLiquidity(highs, lows, volumes) {
        const lastIndex = highs.length - 1;
        const lookback = 20;
        
        // Calculate volume EMA
        const volumeEMA = this.calculateEMA(volumes, lookback);
        const lastVolume = volumes[lastIndex];
        
        // Find recent swing highs and lows
        let swingHighs = 0;
        let swingLows = 0;
        
        // Look at the last 5 candles
        for (let i = lastIndex - 4; i <= lastIndex; i++) {
            if (i > 0 && i < highs.length - 1) {
                // Swing high: current high higher than previous and next high
                if (highs[i] > highs[i-1] && highs[i] > highs[i+1]) {
                    swingHighs++;
                }
                // Swing low: current low lower than previous and next low
                if (lows[i] < lows[i-1] && lows[i] < lows[i+1]) {
                    swingLows++;
                }
            }
        }
        
        // Analyze liquidity based on swing points and volume
        if (swingHighs >= 2 && lastVolume > volumeEMA * 1.2) {
            return { signal: 'bullish', strength: 3 }; // High liquidity at resistance
        } else if (swingLows >= 2 && lastVolume > volumeEMA * 1.2) {
            return { signal: 'bearish', strength: 3 }; // High liquidity at support
        } else if (lastVolume > volumeEMA) {
            return { signal: 'neutral', strength: 2 }; // Moderate liquidity
        }
        
        return { signal: 'neutral', strength: 1 }; // Low liquidity
    }

    // Signal Generation Methods
    getVolumeSignal(volumes) {
        const last5Volumes = volumes.slice(-5);
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b) / 20;
        const trend = last5Volumes.reduce((acc, vol) => acc + (vol > avgVolume ? 1 : -1), 0);
        
        if (trend >= 4) return { signal: 'bullish', strength: 3 };
        if (trend <= -4) return { signal: 'bearish', strength: 3 };
        if (trend > 0) return { signal: 'bullish', strength: 2 };
        if (trend < 0) return { signal: 'bearish', strength: 2 };
        return { signal: 'neutral', strength: 1 };
    }

    getRSISignal(value) {
        if (value > 70) {
            return { signal: 'bearish', strength: 3 };
        } else if (value < 30) {
            return { signal: 'bullish', strength: 3 };
        } else if (value > 60) {
            return { signal: 'bearish', strength: 2 };
        } else if (value < 40) {
            return { signal: 'bullish', strength: 2 };
        } else {
            return { signal: 'neutral', strength: 1 };
        }
    }

    getEMACrossSignal(ema50, ema200) {
        const diff = ((ema50 - ema200) / ema200) * 100;
        
        if (diff > 2) return { signal: 'bullish', strength: 3 };
        if (diff < -2) return { signal: 'bearish', strength: 3 };
        if (diff > 0) return { signal: 'bullish', strength: 2 };
        if (diff < 0) return { signal: 'bearish', strength: 2 };
        return { signal: 'neutral', strength: 1 };
    }

    getMACDSignal(macd, signal, histogram) {
        const histPercent = Math.abs(histogram / macd) * 100;
        
        if (histogram > 0 && histPercent > 10) {
            return { signal: 'bullish', strength: 3 };
        } else if (histogram < 0 && histPercent > 10) {
            return { signal: 'bearish', strength: 3 };
        } else if (histogram > 0) {
            return { signal: 'bullish', strength: 2 };
        } else if (histogram < 0) {
            return { signal: 'bearish', strength: 2 };
        } else {
            return { signal: 'neutral', strength: 1 };
        }
    }

    getBBSignal(price, upper, lower, middle) {
        const percentage = ((price - lower) / (upper - lower)) * 100;
        
        if (percentage > 95) {
            return { signal: 'bearish', strength: 3 };
        } else if (percentage < 5) {
            return { signal: 'bullish', strength: 3 };
        } else if (percentage > 80) {
            return { signal: 'bearish', strength: 2 };
        } else if (percentage < 20) {
            return { signal: 'bullish', strength: 2 };
        } else {
            return { signal: 'neutral', strength: 1 };
        }
    }

    getATRSignal(atr, currentPrice) {
        const atrPercent = (atr / currentPrice) * 100;
        
        if (atrPercent > 5) return { signal: 'bearish', strength: 3 };
        if (atrPercent > 3) return { signal: 'bearish', strength: 2 };
        if (atrPercent < 0.5) return { signal: 'bullish', strength: 2 };
        return { signal: 'neutral', strength: 1 };
    }

    getPivotSignal(price, pivots) {
        if (price > pivots.r2) return { signal: 'bearish', strength: 3 };
        if (price < pivots.s2) return { signal: 'bullish', strength: 3 };
        if (price > pivots.r1) return { signal: 'bearish', strength: 2 };
        if (price < pivots.s1) return { signal: 'bullish', strength: 2 };
        return { signal: 'neutral', strength: 1 };
    }

    getVWAPSignal(price, vwap) {
        const deviation = ((price - vwap) / vwap) * 100;
        
        if (deviation > 2) return { signal: 'bearish', strength: 3 };
        if (deviation < -2) return { signal: 'bullish', strength: 3 };
        if (deviation > 1) return { signal: 'bearish', strength: 2 };
        if (deviation < -1) return { signal: 'bullish', strength: 2 };
        return { signal: 'neutral', strength: 1 };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing IndicatorSignals...');
    window.indicatorSignals = new IndicatorSignals();
});
