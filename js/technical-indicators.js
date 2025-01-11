// Advanced Technical Indicators Implementation
class TechnicalIndicators {
    // EMA 8/21 Implementation
    static calculateEMA821(prices) {
        const ema8 = this.calculateEMA(prices, 8);
        const ema21 = this.calculateEMA(prices, 21);
        
        const lastEma8 = ema8[ema8.length - 1];
        const lastEma21 = ema21[ema21.length - 1];
        const prevEma8 = ema8[ema8.length - 2];
        const prevEma21 = ema21[ema21.length - 2];

        // Determine trend and crossover
        const currentCross = lastEma8 > lastEma21;
        const previousCross = prevEma8 > prevEma21;
        
        let signal = 'Neutral';
        if (currentCross && !previousCross) {
            signal = 'Bullish'; // Golden Cross
        } else if (!currentCross && previousCross) {
            signal = 'Bearish'; // Death Cross
        } else if (currentCross) {
            signal = 'bullish-trend';
        } else {
            signal = 'bearish-trend';
        }

        return {
            ema8: lastEma8,
            ema21: lastEma21,
            signal,
            values: { ema8, ema21 }
        };
    }

    // Supertrend Implementation
    static calculateSupertrend(klines, period = 10, multiplier = 3) {
        const highs = klines.map(k => parseFloat(k[2]));
        const lows = klines.map(k => parseFloat(k[3]));
        const closes = klines.map(k => parseFloat(k[4]));

        // Calculate ATR
        const atr = this.calculateATR(klines, period);
        const supertrend = [];
        let trend = [];
        
        // Calculate Basic Upper and Lower Bands
        for (let i = 0; i < klines.length; i++) {
            const basicUpperBand = ((highs[i] + lows[i]) / 2) + (multiplier * atr[i]);
            const basicLowerBand = ((highs[i] + lows[i]) / 2) - (multiplier * atr[i]);
            
            // Initialize with basic bands
            if (i === 0) {
                supertrend.push({ upper: basicUpperBand, lower: basicLowerBand });
                trend.push(closes[i] > basicUpperBand ? 1 : -1);
                continue;
            }

            // Calculate Final Upper and Lower Bands
            let finalUpperBand = basicUpperBand;
            let finalLowerBand = basicLowerBand;

            if (basicUpperBand < supertrend[i-1].upper || closes[i-1] > supertrend[i-1].upper) {
                finalUpperBand = basicUpperBand;
            } else {
                finalUpperBand = supertrend[i-1].upper;
            }

            if (basicLowerBand > supertrend[i-1].lower || closes[i-1] < supertrend[i-1].lower) {
                finalLowerBand = basicLowerBand;
            } else {
                finalLowerBand = supertrend[i-1].lower;
            }

            // Determine trend
            if (closes[i] > finalUpperBand) {
                trend.push(1); // Uptrend
            } else if (closes[i] < finalLowerBand) {
                trend.push(-1); // Downtrend
            } else {
                trend.push(trend[i-1]);
            }

            supertrend.push({ upper: finalUpperBand, lower: finalLowerBand });
        }

        const currentTrend = trend[trend.length - 1];
        const previousTrend = trend[trend.length - 2];
        
        let signal = 'Neutral';
        if (currentTrend === 1 && previousTrend === -1) {
            signal = 'Bullish';
        } else if (currentTrend === -1 && previousTrend === 1) {
            signal = 'Bearish';
        } else if (currentTrend === 1) {
            signal = 'bullish-trend';
        } else {
            signal = 'bearish-trend';
        }

        return {
            trend: currentTrend,
            signal,
            value: supertrend[supertrend.length - 1],
            values: supertrend
        };
    }

    // Williams %R Implementation
    static calculateWilliamsR(klines, period = 14) {
        const highs = klines.map(k => parseFloat(k[2]));
        const lows = klines.map(k => parseFloat(k[3]));
        const closes = klines.map(k => parseFloat(k[4]));
        
        const williamsR = [];
        
        for (let i = period - 1; i < klines.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
            const currentClose = closes[i];
            
            const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
            williamsR.push(wr);
        }

        const lastWR = williamsR[williamsR.length - 1];
        
        let signal = 'Neutral';
        if (lastWR < -80) {
            signal = 'Bullish'; // Oversold
        } else if (lastWR > -20) {
            signal = 'Bearish'; // Overbought
        }

        return {
            value: lastWR,
            signal,
            values: williamsR
        };
    }

    // Keltner Channels Implementation
    static calculateKeltnerChannels(klines, emaPeriod = 20, atrPeriod = 10, multiplier = 2) {
        const closes = klines.map(k => parseFloat(k[4]));
        const atr = this.calculateATR(klines, atrPeriod);
        const ema = this.calculateEMA(closes, emaPeriod);
        
        const upper = [];
        const lower = [];
        const middle = ema;

        for (let i = 0; i < klines.length; i++) {
            if (i < Math.max(emaPeriod, atrPeriod) - 1) {
                upper.push(null);
                lower.push(null);
                continue;
            }

            upper.push(middle[i] + (multiplier * atr[i]));
            lower.push(middle[i] - (multiplier * atr[i]));
        }

        const lastClose = closes[closes.length - 1];
        const lastUpper = upper[upper.length - 1];
        const lastLower = lower[lower.length - 1];
        const lastMiddle = middle[middle.length - 1];

        let signal = 'Neutral';
        if (lastClose > lastUpper) {
            signal = 'Bearish'; // Overbought
        } else if (lastClose < lastLower) {
            signal = 'Bullish'; // Oversold
        }

        return {
            upper: lastUpper,
            middle: lastMiddle,
            lower: lastLower,
            signal,
            values: { upper, middle, lower }
        };
    }

    // Money Flow Index Implementation
    static calculateMFI(klines, period = 14) {
        const typicalPrices = klines.map(k => {
            const high = parseFloat(k[2]);
            const low = parseFloat(k[3]);
            const close = parseFloat(k[4]);
            return (high + low + close) / 3;
        });
        
        const volumes = klines.map(k => parseFloat(k[5]));
        const moneyFlow = typicalPrices.map((tp, i) => tp * volumes[i]);
        
        let positiveFlow = 0;
        let negativeFlow = 0;
        const mfi = [];
        
        for (let i = 1; i < klines.length; i++) {
            if (i < period) {
                if (typicalPrices[i] > typicalPrices[i-1]) {
                    positiveFlow += moneyFlow[i];
                } else {
                    negativeFlow += moneyFlow[i];
                }
                
                if (i === period - 1) {
                    const mfiValue = 100 - (100 / (1 + positiveFlow / negativeFlow));
                    mfi.push(mfiValue);
                } else {
                    mfi.push(null);
                }
                continue;
            }

            if (typicalPrices[i] > typicalPrices[i-1]) {
                positiveFlow = positiveFlow - (positiveFlow / period) + moneyFlow[i];
                negativeFlow = negativeFlow - (negativeFlow / period);
            } else {
                positiveFlow = positiveFlow - (positiveFlow / period);
                negativeFlow = negativeFlow - (negativeFlow / period) + moneyFlow[i];
            }

            const mfiValue = 100 - (100 / (1 + positiveFlow / negativeFlow));
            mfi.push(mfiValue);
        }

        const lastMFI = mfi[mfi.length - 1];
        
        let signal = 'Neutral';
        if (lastMFI > 80) {
            signal = 'Bearish'; // Overbought
        } else if (lastMFI < 20) {
            signal = 'Bullish'; // Oversold
        }

        return {
            value: lastMFI,
            signal,
            values: mfi
        };
    }

    // Helper function for EMA calculation
    static calculateEMA(values, period) {
        const multiplier = 2 / (period + 1);
        const ema = [values[0]];
        
        for (let i = 1; i < values.length; i++) {
            ema.push(
                (values[i] - ema[i - 1]) * multiplier + ema[i - 1]
            );
        }
        
        return ema;
    }

    // Helper function for ATR calculation
    static calculateATR(klines, period = 14) {
        const highs = klines.map(k => parseFloat(k[2]));
        const lows = klines.map(k => parseFloat(k[3]));
        const closes = klines.map(k => parseFloat(k[4]));
        
        const tr = [0];
        for (let i = 1; i < klines.length; i++) {
            const hl = highs[i] - lows[i];
            const hc = Math.abs(highs[i] - closes[i - 1]);
            const lc = Math.abs(lows[i] - closes[i - 1]);
            tr.push(Math.max(hl, hc, lc));
        }
        
        return this.calculateEMA(tr, period);
    }
}

// Make functions available globally
window.technicalIndicators = TechnicalIndicators;
