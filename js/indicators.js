// Technical Indicators Calculator
class TechnicalIndicators {
    static calculateOBV(candles) {
        let obv = 0;
        const obvValues = [];
        
        for (let i = 0; i < candles.length; i++) {
            const currentClose = parseFloat(candles[i].close);
            const previousClose = i > 0 ? parseFloat(candles[i - 1].close) : currentClose;
            const volume = parseFloat(candles[i].volume);
            
            if (currentClose > previousClose) {
                obv += volume;
            } else if (currentClose < previousClose) {
                obv -= volume;
            }
            // If prices are equal, OBV remains the same
            
            obvValues.push(obv);
        }
        
        // Calculate OBV trend and signal
        const lastOBV = obvValues[obvValues.length - 1];
        const prevOBV = obvValues[obvValues.length - 2];
        const obvChange = ((lastOBV - prevOBV) / prevOBV) * 100;
        
        // Calculate 20-period EMA of OBV for signal line
        const emaLength = 20;
        const obvEMA = this.calculateEMA(obvValues, emaLength);
        const lastEMA = obvEMA[obvEMA.length - 1];
        
        // Determine trend and signal
        const trend = lastOBV > prevOBV ? 'Bullish' : 'Bearish';
        const signal = lastOBV > lastEMA ? 'Buy' : 'Sell';
        
        return {
            value: Math.round(lastOBV),
            trend,
            signal,
            change: obvChange.toFixed(2) + '%'
        };
    }

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
}

// Update OBV values in the UI
function updateOBVIndicator(candles) {
    const obv = TechnicalIndicators.calculateOBV(candles);
    
    document.getElementById('obvValue').textContent = obv.value.toLocaleString();
    document.getElementById('obvTrend').textContent = obv.trend;
    document.getElementById('obvSignal').textContent = obv.signal;
    document.getElementById('obvChange').textContent = obv.change;
    
    // Add appropriate classes for styling
    document.getElementById('obvTrend').className = obv.trend.toLowerCase();
    document.getElementById('obvSignal').className = obv.signal.toLowerCase();
    document.getElementById('obvChange').className = parseFloat(obv.change) >= 0 ? 'positive' : 'negative';
}

// Export the functions
export { TechnicalIndicators, updateOBVIndicator };
