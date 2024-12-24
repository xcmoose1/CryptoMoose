class TraditionalMarketsHandler {
    constructor() {
        this.symbols = {
            '^GSPC': 'S&P 500',
            'GLD': 'Gold ETF',
            'UUP': 'US Dollar',
            '^VIX': 'VIX Index',
            'QQQ': 'Nasdaq 100'
        };
        this.yahooApiBase = 'https://query1.finance.yahoo.com/v8/finance/chart/';
        this.correlationData = new Map();
        this.lastUpdate = 0;
        this.updateInterval = 300000; // 5 minutes
    }

    async init() {
        try {
            console.log('Initializing traditional markets handler...');
            await this.updateTraditionalData();
            console.log('Traditional markets handler initialized successfully');
        } catch (error) {
            console.error('Error initializing traditional markets handler:', error);
            this.handleError('Initialization failed');
        }
    }

    async updateTraditionalData() {
        try {
            console.log('Updating traditional market data...');
            const now = Math.floor(Date.now() / 1000);
            const oneDayAgo = now - (24 * 60 * 60);
            
            // Fetch data for each symbol
            const promises = Object.keys(this.symbols).map(async symbol => {
                try {
                    // Use proper Yahoo Finance API endpoint
                    const url = `${this.yahooApiBase}${symbol}?period1=${oneDayAgo}&period2=${now}&interval=5m`;
                    console.log(`Fetching data for ${symbol} from:`, url);
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    if (!data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                        throw new Error('Invalid data structure from Yahoo Finance');
                    }
                    
                    // Clean the price data (remove null values)
                    const prices = data.chart.result[0].indicators.quote[0].close.filter(price => price !== null);
                    
                    return {
                        symbol,
                        prices
                    };
                } catch (error) {
                    console.error(`Error fetching data for ${symbol}:`, error);
                    return { symbol, prices: null };
                }
            });

            const results = await Promise.all(promises);
            let hasValidData = false;
            
            // Store the data
            results.forEach(({ symbol, prices }) => {
                if (prices && prices.length > 0) {
                    this.correlationData.set(symbol, prices);
                    hasValidData = true;
                }
            });

            if (!hasValidData) {
                throw new Error('No valid data received from any source');
            }

            // Update correlation display
            await this.updateCorrelationDisplay();
            
            this.lastUpdate = Date.now();
            console.log('Traditional market data updated successfully');
            this.updateUpdateTime();
        } catch (error) {
            console.error('Error updating traditional market data:', error);
            this.handleError('Update failed');
        }
    }

    calculateCorrelation(array1, array2) {
        try {
            // Ensure arrays are of equal length
            const minLength = Math.min(array1.length, array2.length);
            const validPairs = [];
            
            // Create pairs of valid data points
            for (let i = 0; i < minLength; i++) {
                if (array1[i] !== null && array2[i] !== null && 
                    !isNaN(array1[i]) && !isNaN(array2[i])) {
                    validPairs.push({
                        x: array1[i],
                        y: array2[i]
                    });
                }
            }

            const n = validPairs.length;
            if (n < 2) return 0;

            // Calculate means
            const xMean = validPairs.reduce((sum, pair) => sum + pair.x, 0) / n;
            const yMean = validPairs.reduce((sum, pair) => sum + pair.y, 0) / n;

            // Calculate correlation coefficient
            let numerator = 0;
            let xDenominator = 0;
            let yDenominator = 0;

            validPairs.forEach(pair => {
                const xDiff = pair.x - xMean;
                const yDiff = pair.y - yMean;
                numerator += xDiff * yDiff;
                xDenominator += xDiff * xDiff;
                yDenominator += yDiff * yDiff;
            });

            const correlation = numerator / Math.sqrt(xDenominator * yDenominator);
            return isNaN(correlation) ? 0 : correlation;
        } catch (error) {
            console.error('Error calculating correlation:', error);
            return 0;
        }
    }

    async updateCorrelationDisplay() {
        try {
            console.log('Updating correlation display...');
            const correlationMatrix = document.querySelector('.correlation-grid');
            if (!correlationMatrix) {
                console.error('Correlation grid element not found');
                return;
            }

            correlationMatrix.innerHTML = '';

            // Get BTC price data
            const btcPrices = await this.getBTCPrices();
            if (!btcPrices) {
                throw new Error('Failed to fetch BTC prices');
            }

            Object.entries(this.symbols).forEach(([symbol, name]) => {
                const traditionalPrices = this.correlationData.get(symbol);
                if (!traditionalPrices) return;

                const correlation = this.calculateCorrelation(btcPrices, traditionalPrices);
                const correlationClass = this.getCorrelationClass(correlation);

                const cell = document.createElement('div');
                cell.className = `correlation-cell ${correlationClass}`;
                cell.innerHTML = `
                    <div class="correlation-name">${name}</div>
                    <div class="correlation-value">${(correlation * 100).toFixed(1)}%</div>
                `;
                correlationMatrix.appendChild(cell);
            });

            console.log('Correlation display updated successfully');
        } catch (error) {
            console.error('Error updating correlation display:', error);
            this.handleError('Failed to update correlations');
        }
    }

    getCorrelationClass(correlation) {
        const abs = Math.abs(correlation);
        if (abs >= 0.7) return 'correlation-high';
        if (abs >= 0.4) return 'correlation-medium';
        return 'correlation-low';
    }

    async getBTCPrices() {
        try {
            console.log('Fetching BTC prices...');
            const response = await fetch('https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=5&limit=200');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.ret_code === 0 && data.result?.list) {
                return data.result.list.map(candle => parseFloat(candle[4])).reverse(); // Close prices
            }
            throw new Error('Invalid data structure from Bybit');
        } catch (error) {
            console.error('Error fetching BTC prices:', error);
            return null;
        }
    }

    handleError(message) {
        const correlationMatrix = document.querySelector('.correlation-grid');
        if (correlationMatrix) {
            correlationMatrix.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
        this.updateUpdateTime(true);
    }

    updateUpdateTime(isError = false) {
        const timeEl = document.getElementById('correlationUpdateTime');
        if (timeEl) {
            const time = new Date().toLocaleTimeString();
            timeEl.textContent = isError ? 
                `Last update failed at ${time}` : 
                `Last updated: ${time}`;
            timeEl.className = isError ? 'update-time error' : 'update-time';
        }
    }
}

export default TraditionalMarketsHandler;
