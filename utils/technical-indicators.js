export class TechnicalIndicators {
    static calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) {
            return Array(prices.length).fill(50);
        }

        let gains = [];
        let losses = [];
        
        // Calculate price changes and separate into gains and losses
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }

        // Calculate initial average gain and loss
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

        const rsi = [50]; // Initial value

        // Calculate RSI values
        for (let i = period; i < prices.length; i++) {
            avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;

            const rs = avgGain / (avgLoss || 1); // Avoid division by zero
            rsi.push(100 - (100 / (1 + rs)));
        }

        return rsi;
    }

    static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) {
            return {
                macdLine: [],
                signalLine: [],
                histogram: []
            };
        }

        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        
        const macdLine = fastEMA.map((fast, i) => 
            fast - (slowEMA[i] || 0)
        ).slice(slowPeriod - 1);

        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        
        const histogram = macdLine.map((macd, i) => 
            macd - (signalLine[i] || 0)
        );

        return {
            macdLine,
            signalLine,
            histogram
        };
    }

    static calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) {
            return {
                upper: [],
                middle: [],
                lower: []
            };
        }

        const middle = this.calculateSMA(prices, period);
        const upper = [];
        const lower = [];

        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1);
            const std = this.calculateStandardDeviation(slice);
            upper.push(middle[i - period + 1] + (stdDev * std));
            lower.push(middle[i - period + 1] - (stdDev * std));
        }

        return { upper, middle, lower };
    }

    static calculateATR(highs, lows, closes, period = 14) {
        if (highs.length < 2) return [];

        const trueRanges = [Math.abs(highs[0] - lows[0])];
        
        for (let i = 1; i < highs.length; i++) {
            const tr1 = Math.abs(highs[i] - lows[i]);
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }

        return this.calculateSmoothedAverage(trueRanges, period);
    }

    static calculatePivotPoints(highs, lows, closes) {
        if (highs.length < 1) return {};

        const h = highs[highs.length - 1];
        const l = lows[lows.length - 1];
        const c = closes[closes.length - 1];

        const pp = (h + l + c) / 3;
        
        return {
            pp,
            r1: (2 * pp) - l,
            r2: pp + (h - l),
            r3: h + 2 * (pp - l),
            s1: (2 * pp) - h,
            s2: pp - (h - l),
            s3: l - 2 * (h - pp)
        };
    }

    static calculateVWAP(prices, volumes) {
        if (prices.length !== volumes.length || prices.length === 0) return [];

        let cumVolume = 0;
        let cumPV = 0;
        return prices.map((price, i) => {
            cumVolume += volumes[i];
            cumPV += price * volumes[i];
            return cumPV / cumVolume;
        });
    }

    static calculateWilliamsR(highs, lows, closes, period = 14) {
        if (closes.length < period) return [];

        const result = [];
        
        for (let i = period - 1; i < closes.length; i++) {
            const highInPeriod = Math.max(...highs.slice(i - period + 1, i + 1));
            const lowInPeriod = Math.min(...lows.slice(i - period + 1, i + 1));
            const close = closes[i];
            
            const wr = ((highInPeriod - close) / (highInPeriod - lowInPeriod)) * -100;
            result.push(wr);
        }

        return result;
    }

    static calculateMFI(highs, lows, closes, volumes, period = 14) {
        if (closes.length < period + 1) return [];

        const typicalPrices = closes.map((close, i) => 
            (highs[i] + lows[i] + close) / 3
        );

        const moneyFlow = typicalPrices.map((tp, i) => tp * volumes[i]);
        const positiveFlow = [];
        const negativeFlow = [];

        for (let i = 1; i < typicalPrices.length; i++) {
            if (typicalPrices[i] > typicalPrices[i - 1]) {
                positiveFlow.push(moneyFlow[i]);
                negativeFlow.push(0);
            } else if (typicalPrices[i] < typicalPrices[i - 1]) {
                positiveFlow.push(0);
                negativeFlow.push(moneyFlow[i]);
            } else {
                positiveFlow.push(0);
                negativeFlow.push(0);
            }
        }

        const result = [];
        
        for (let i = period - 1; i < positiveFlow.length; i++) {
            const positiveSum = positiveFlow.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            const negativeSum = negativeFlow.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            
            const mfi = 100 - (100 / (1 + (positiveSum / (negativeSum || 1))));
            result.push(mfi);
        }

        return result;
    }

    static calculateEMA(data, period) {
        if (!Array.isArray(data) || data.length < period) {
            return [];
        }

        const k = 2 / (period + 1);
        let ema = [data[0]];  // First EMA is same as first price

        for (let i = 1; i < data.length; i++) {
            if (isNaN(data[i])) {
                ema.push(ema[i - 1]); // Use previous EMA if current price is invalid
                continue;
            }
            ema.push(data[i] * k + ema[i - 1] * (1 - k));
        }

        return ema;
    }

    static calculateIchimoku(highs, lows, closes, conversionPeriod = 9, basePeriod = 26, spanBPeriod = 52, displacement = 26) {
        if (!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes) ||
            highs.length < spanBPeriod || lows.length < spanBPeriod || closes.length < spanBPeriod) {
            return {
                tenkan: null,
                kijun: null,
                senkouA: null,
                senkouB: null,
                currentPrice: null,
                cloudTop: null,
                cloudBottom: null,
                cloud: 'NEUTRAL'
            };
        }

        try {
            // Calculate Tenkan-sen (Conversion Line)
            const tenkanPeriodHigh = Math.max(...highs.slice(-conversionPeriod));
            const tenkanPeriodLow = Math.min(...lows.slice(-conversionPeriod));
            const tenkan = (tenkanPeriodHigh + tenkanPeriodLow) / 2;

            // Calculate Kijun-sen (Base Line)
            const kijunPeriodHigh = Math.max(...highs.slice(-basePeriod));
            const kijunPeriodLow = Math.min(...lows.slice(-basePeriod));
            const kijun = (kijunPeriodHigh + kijunPeriodLow) / 2;

            // Calculate Senkou Span A (Leading Span A)
            const senkouA = (tenkan + kijun) / 2;

            // Calculate Senkou Span B (Leading Span B)
            const senkouPeriodHigh = Math.max(...highs.slice(-spanBPeriod));
            const senkouPeriodLow = Math.min(...lows.slice(-spanBPeriod));
            const senkouB = (senkouPeriodHigh + senkouPeriodLow) / 2;

            const currentPrice = closes[closes.length - 1];
            const cloudTop = Math.max(senkouA, senkouB);
            const cloudBottom = Math.min(senkouA, senkouB);

            if (isNaN(cloudTop) || isNaN(cloudBottom) || isNaN(currentPrice)) {
                throw new Error('Invalid Ichimoku calculation results');
            }

            return {
                tenkan,
                kijun,
                senkouA,
                senkouB,
                currentPrice,
                cloudTop,
                cloudBottom,
                cloud: currentPrice > cloudTop ? 'BULLISH' : currentPrice < cloudBottom ? 'BEARISH' : 'NEUTRAL'
            };
        } catch (error) {
            console.error('Error in Ichimoku calculation:', error);
            return {
                tenkan: null,
                kijun: null,
                senkouA: null,
                senkouB: null,
                currentPrice: null,
                cloudTop: null,
                cloudBottom: null,
                cloud: 'NEUTRAL'
            };
        }
    }

    static calculateFibonacci(highs, lows, closes) {
        if (!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes) ||
            highs.length === 0 || lows.length === 0 || closes.length === 0) {
            return {
                levels: {},
                currentLevel: '0',
                retracement: 0,
                currentPrice: null
            };
        }

        try {
            // Get the recent high and low
            const validHighs = highs.filter(h => !isNaN(h) && h !== null);
            const validLows = lows.filter(l => !isNaN(l) && l !== null);
            
            if (validHighs.length === 0 || validLows.length === 0) {
                throw new Error('No valid high/low values');
            }

            const high = Math.max(...validHighs);
            const low = Math.min(...validLows);
            const currentPrice = closes[closes.length - 1];

            if (isNaN(high) || isNaN(low) || isNaN(currentPrice)) {
                throw new Error('Invalid price values');
            }

            const diff = high - low;
            const levels = {
                '0': low,
                '0.236': parseFloat((low + diff * 0.236).toFixed(2)),
                '0.382': parseFloat((low + diff * 0.382).toFixed(2)),
                '0.5': parseFloat((low + diff * 0.5).toFixed(2)),
                '0.618': parseFloat((low + diff * 0.618).toFixed(2)),
                '0.786': parseFloat((low + diff * 0.786).toFixed(2)),
                '1': high
            };

            // Find current retracement level
            let currentLevel = '0';
            let retracement = 0;
            
            Object.entries(levels).forEach(([level, price]) => {
                if (currentPrice >= price) {
                    currentLevel = level;
                    retracement = parseFloat(level);
                }
            });

            return {
                levels,
                currentLevel,
                retracement,
                currentPrice: parseFloat(currentPrice.toFixed(2))
            };
        } catch (error) {
            console.error('Error in Fibonacci calculation:', error);
            return {
                levels: {},
                currentLevel: '0',
                retracement: 0,
                currentPrice: null
            };
        }
    }

    static calculateSupertrend(highs, lows, closes, period = 10, multiplier = 3) {
        if (!highs.length || !lows.length || !closes.length || highs.length < period) {
            return {
                trend: 'NEUTRAL',
                value: null,
                upperBand: null,
                lowerBand: null
            };
        }

        try {
            const atr = this.calculateATR(highs, lows, closes, period);
            if (!atr.length) {
                return {
                    trend: 'NEUTRAL',
                    value: null,
                    upperBand: null,
                    lowerBand: null
                };
            }

            const basicUpperBand = closes.map((close, i) => {
                const value = (highs[i] + lows[i]) / 2 + multiplier * (atr[i] || atr[atr.length - 1]);
                return isNaN(value) ? null : value;
            });

            const basicLowerBand = closes.map((close, i) => {
                const value = (highs[i] + lows[i]) / 2 - multiplier * (atr[i] || atr[atr.length - 1]);
                return isNaN(value) ? null : value;
            });

            let upperBand = [...basicUpperBand];
            let lowerBand = [...basicLowerBand];
            let trend = 'NEUTRAL';
            let supertrendValue = closes[closes.length - 1];

            for (let i = 1; i < closes.length; i++) {
                if (basicUpperBand[i] === null || upperBand[i - 1] === null || closes[i - 1] === null) {
                    upperBand[i] = basicUpperBand[i];
                } else if (basicUpperBand[i] < upperBand[i - 1] || closes[i - 1] > upperBand[i - 1]) {
                    upperBand[i] = basicUpperBand[i];
                } else {
                    upperBand[i] = upperBand[i - 1];
                }

                if (basicLowerBand[i] === null || lowerBand[i - 1] === null || closes[i - 1] === null) {
                    lowerBand[i] = basicLowerBand[i];
                } else if (basicLowerBand[i] > lowerBand[i - 1] || closes[i - 1] < lowerBand[i - 1]) {
                    lowerBand[i] = basicLowerBand[i];
                } else {
                    lowerBand[i] = lowerBand[i - 1];
                }
            }

            const lastClose = closes[closes.length - 1];
            const lastUpper = upperBand[upperBand.length - 1];
            const lastLower = lowerBand[lowerBand.length - 1];

            if (lastClose !== null && lastUpper !== null && lastLower !== null) {
                if (lastClose > lastUpper) {
                    trend = 'BULLISH';
                    supertrendValue = lastLower;
                } else if (lastClose < lastLower) {
                    trend = 'BEARISH';
                    supertrendValue = lastUpper;
                }
            }

            return {
                trend,
                value: supertrendValue,
                upperBand: lastUpper,
                lowerBand: lastLower
            };
        } catch (error) {
            console.error('Error calculating Supertrend:', error);
            return {
                trend: 'NEUTRAL',
                value: null,
                upperBand: null,
                lowerBand: null
            };
        }
    }

    static calculateSMA(prices, period) {
        if (prices.length < period) return [];

        const result = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b);
            result.push(sum / period);
        }
        return result;
    }

    static calculateSmoothedAverage(data, period) {
        if (data.length < period) return [];

        const result = [data.slice(0, period).reduce((a, b) => a + b) / period];
        
        for (let i = period; i < data.length; i++) {
            result.push(((result[result.length - 1] * (period - 1)) + data[i]) / period);
        }

        return result;
    }

    static calculateStandardDeviation(data) {
        const mean = data.reduce((a, b) => a + b) / data.length;
        const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b) / data.length;
        return Math.sqrt(variance);
    }
}
