class MarketMetrics {
    constructor() {
        console.log('MarketMetrics: Constructor started');
        this.updateInterval = 300000; // 5 minutes
        this.lastUpdate = 0;
        this.metrics = {
            altcoinDominance: 0,
            altcoinFearGreed: null,
            volatility: 'Low',
            marketSummary: '',
            keyLevels: {},
            correlations: {},
            obvTrend: null
        };
        
        // Store DOM elements
        console.log('MarketMetrics: Looking for DOM elements...');
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

        // Log if elements are not found
        Object.entries(this.elements).forEach(([key, element]) => {
            console.log(`MarketMetrics: ${key} element ${element ? 'found' : 'NOT FOUND'}`);
        });
    }

    async init() {
        console.log('MarketMetrics: Initialization started');
        try {
            console.log('MarketMetrics: Starting initial metrics update');
            await this.updateAllMetrics();
            console.log('MarketMetrics: Initial metrics update completed');
            
            console.log('MarketMetrics: Setting up intervals');
            this.setupIntervals();
        } catch (error) {
            console.error('MarketMetrics: Error during initialization:', error);
            this.handleError(error);
        }
    }

    setupIntervals() {
        console.log('MarketMetrics: Setting up update interval');
        setInterval(async () => {
            try {
                await this.updateAllMetrics();
                console.log('MarketMetrics: Periodic update completed');
            } catch (error) {
                console.error('MarketMetrics: Error during periodic update:', error);
                this.handleError(error);
            }
        }, this.updateInterval);
    }

    async updateAllMetrics() {
        console.log('MarketMetrics: Starting metrics update');
        try {
            const results = await Promise.allSettled([
                this.updateAltcoinDominance(),
                this.updateFearAndGreed(),
                this.updateVolatility(),
                this.updateCorrelations(),
                this.updateMarketOverview(),
                this.updateTradingStrategy()
            ]);
            
            results.forEach((result, index) => {
                const metrics = ['altcoin dominance', 'fear and greed', 'volatility', 'correlations', 'market overview', 'trading strategy'];
                console.log(`MarketMetrics: ${metrics[index]} update ${result.status}`);
                if (result.status === 'rejected') {
                    console.error(`MarketMetrics: ${metrics[index]} update failed:`, result.reason);
                }
            });

            console.log('MarketMetrics: All metrics updated, updating UI');
            this.updateUI();
        } catch (error) {
            console.error('MarketMetrics: Error updating metrics:', error);
            this.handleError(error);
        }
    }

    async updateAltcoinDominance() {
        console.log('MarketMetrics: Fetching altcoin dominance');
        try {
            // Get BTC price and volume from MEXC
            const btcResponse = await fetch('/api/mexc/ticker/24hr');
            if (!btcResponse.ok) {
                throw new Error(`HTTP error! status: ${btcResponse.status}`);
            }
            const allData = await btcResponse.json();
            
            // Calculate total market volume and BTC volume
            let totalVolume = 0;
            let btcVolume = 0;
            
            allData.forEach(ticker => {
                if (ticker.symbol === 'BTCUSDT') {
                    btcVolume = parseFloat(ticker.volume) * parseFloat(ticker.lastPrice);
                }
                if (ticker.symbol.endsWith('USDT')) {
                    totalVolume += parseFloat(ticker.volume) * parseFloat(ticker.lastPrice);
                }
            });
            
            // Calculate altcoin dominance based on volume
            this.metrics.altcoinDominance = (((totalVolume - btcVolume) / totalVolume) * 100).toFixed(2);
            console.log('MarketMetrics: Altcoin dominance updated:', this.metrics.altcoinDominance);
        } catch (error) {
            console.error('MarketMetrics: Error fetching altcoin dominance:', error);
            throw error;
        }
    }

    async updateFearAndGreed() {
        console.log('MarketMetrics: Calculating market sentiment');
        try {
            // Get 24hr data for BTC
            const response = await fetch('/api/mexc/ticker/24hr');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Find BTC data
            const btcData = data.find(ticker => ticker.symbol === 'BTCUSDT');
            if (!btcData) {
                throw new Error('BTC data not found');
            }
            
            // Calculate sentiment based on price change and volume
            const priceChange = parseFloat(btcData.priceChange);
            const volume = parseFloat(btcData.volume);
            
            let sentiment = 50; // Neutral base
            
            // Adjust for price change
            if (priceChange > 5) sentiment += 20;
            else if (priceChange > 2) sentiment += 10;
            else if (priceChange < -5) sentiment -= 20;
            else if (priceChange < -2) sentiment -= 10;
            
            // Adjust for volume (compared to 7-day average)
            // For now, using a simplified approach
            if (volume > 1000) sentiment += 10;
            else if (volume < 500) sentiment -= 10;
            
            // Classify sentiment
            let classification;
            if (sentiment >= 80) classification = 'Extreme Greed';
            else if (sentiment >= 60) classification = 'Greed';
            else if (sentiment >= 40) classification = 'Neutral';
            else if (sentiment >= 20) classification = 'Fear';
            else classification = 'Extreme Fear';
            
            this.metrics.altcoinFearGreed = {
                value: sentiment.toFixed(0),
                classification: classification
            };
            
            console.log('MarketMetrics: Market sentiment updated:', this.metrics.altcoinFearGreed);
        } catch (error) {
            console.error('MarketMetrics: Error calculating market sentiment:', error);
            throw error;
        }
    }

    async updateVolatility() {
        console.log('MarketMetrics: Calculating volatility');
        try {
            // Get 24h data with 5-minute intervals for more accurate volatility
            const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=288');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            console.log('MarketMetrics: Processing volatility data');
            // Extract closing prices
            const prices = data.map(candle => parseFloat(candle[4]));
            
            // Calculate log returns
            const logReturns = [];
            for (let i = 1; i < prices.length; i++) {
                logReturns.push(Math.log(prices[i] / prices[i-1]));
            }
            
            // Calculate annualized volatility
            const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
            const squaredDiffs = logReturns.map(r => Math.pow(r - mean, 2));
            const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
            const stdDev = Math.sqrt(variance);
            const annualizedVol = stdDev * Math.sqrt(365 * 24 * 12); // Annualize from 5-min data
            
            // Dynamic thresholds based on recent market conditions
            const volPercentile = this.calculatePercentile(annualizedVol);
            
            if (volPercentile < 25) {
                this.metrics.volatility = 'Low';
            } else if (volPercentile < 75) {
                this.metrics.volatility = 'Medium';
            } else {
                this.metrics.volatility = 'High';
            }
            
            console.log('MarketMetrics: Volatility updated:', this.metrics.volatility, 'Annualized:', annualizedVol.toFixed(2));
        } catch (error) {
            console.error('MarketMetrics: Error calculating volatility:', error);
            throw error;
        }
    }

    calculatePercentile(value) {
        // Historical volatility ranges for crypto markets
        const volRanges = [
            30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 
            110, 120, 130, 140, 150
        ];
        
        let count = 0;
        for (let range of volRanges) {
            if (value <= range) count++;
        }
        
        return (count / volRanges.length) * 100;
    }

    async updateCorrelations() {
        console.log('MarketMetrics: Updating correlations');
        try {
            const assets = {
                'BTC': 'BTCUSDT',
                'ETH': 'ETHUSDT',
                'GOLD': 'XAUUSD',
                'SPX': 'SPX500',
                'NDX': 'NASDAQ'
            };

            // Fetch historical data for all assets
            const historicalData = {};
            for (const [key, symbol] of Object.entries(assets)) {
                if (symbol.endsWith('USDT')) {
                    historicalData[key] = await this.fetchCryptoData(symbol);
                } else {
                    historicalData[key] = await this.fetchTradFiData(symbol);
                }
            }

            // Calculate correlations
            const correlations = {};
            Object.keys(assets).forEach(asset1 => {
                correlations[asset1] = {};
                Object.keys(assets).forEach(asset2 => {
                    if (asset1 !== asset2) {
                        correlations[asset1][asset2] = this.calculateCorrelation(
                            historicalData[asset1],
                            historicalData[asset2]
                        );
                    }
                });
            });

            // Update UI
            this.metrics.correlations = correlations;
            this.updateUI();
        } catch (error) {
            console.error('MarketMetrics: Error updating correlations:', error);
            this.handleError(error);
        }
    }

    calculateCorrelation(data1, data2) {
        if (data1.length !== data2.length) {
            const minLength = Math.min(data1.length, data2.length);
            data1 = data1.slice(0, minLength);
            data2 = data2.slice(0, minLength);
        }

        const mean1 = data1.reduce((a, b) => a + b, 0) / data1.length;
        const mean2 = data2.reduce((a, b) => a + b, 0) / data2.length;

        const variance1 = data1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0);
        const variance2 = data2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0);

        const covariance = data1.reduce((a, b, i) => {
            return a + ((b - mean1) * (data2[i] - mean2));
        }, 0);

        return covariance / Math.sqrt(variance1 * variance2);
    }

    async fetchCryptoData(symbol) {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=30`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.map(candle => parseFloat(candle[4])); // Close prices
    }

    async fetchTradFiData(symbol) {
        // Simplified for example - in reality, you'd need to integrate with a TradFi data provider
        // For now, return mock data that follows general market patterns
        return Array.from({length: 30}, (_, i) => {
            return 100 + Math.sin(i / 5) * 10 + Math.random() * 2;
        });
    }

    async updateMarketOverview() {
        console.log('MarketMetrics: Updating market overview');
        try {
            const marketData = {
                altcoinFearGreed: this.metrics.altcoinFearGreed,
                altcoinDominance: this.metrics.altcoinDominance,
                volatility: this.metrics.volatility,
                obvTrend: this.metrics.obvTrend
            };

            // Generate market overview based on metrics
            let overview = '';
            
            // Fear & Greed Analysis
            if (marketData.altcoinFearGreed) {
                const fearGreedValue = parseInt(marketData.altcoinFearGreed.value);
                if (fearGreedValue <= 20) {
                    overview += 'Market sentiment is extremely fearful - potential buying opportunity. ';
                } else if (fearGreedValue <= 40) {
                    overview += 'Market shows fear - watch for reversal signals. ';
                } else if (fearGreedValue <= 60) {
                    overview += 'Market sentiment is neutral. ';
                } else if (fearGreedValue <= 80) {
                    overview += 'Market shows greed - consider taking profits. ';
                } else {
                    overview += 'Market is extremely greedy - be cautious of potential correction. ';
                }
            }

            // Altcoin Dominance Analysis
            const altcoinDom = parseFloat(marketData.altcoinDominance);
            if (altcoinDom > 55) {
                overview += 'High altcoin dominance suggests alt season potential. ';
            } else if (altcoinDom < 45) {
                overview += 'Low altcoin dominance suggests BTC dominance. ';
            } else {
                overview += 'Balanced market between BTC and altcoins. ';
            }

            // Volatility Analysis
            if (marketData.volatility === 'High') {
                overview += 'High volatility - use wider stops and smaller positions. ';
            } else if (marketData.volatility === 'Low') {
                overview += 'Low volatility - potential breakout setup forming. ';
            }

            this.metrics.marketOverview = overview.trim();
            this.updateUI();
        } catch (error) {
            console.error('MarketMetrics: Error updating market overview:', error);
            this.handleError(error);
        }
    }

    async updateTradingStrategy() {
        console.log('MarketMetrics: Updating trading strategy');
        try {
            const marketData = {
                altcoinFearGreed: this.metrics.altcoinFearGreed,
                altcoinDominance: this.metrics.altcoinDominance,
                volatility: this.metrics.volatility,
                obvTrend: this.metrics.obvTrend
            };

            // Generate trading strategy based on current market conditions
            let strategy = '';
            
            // Fear & Greed based strategy
            if (marketData.altcoinFearGreed) {
                const fearGreedValue = parseInt(marketData.altcoinFearGreed.value);
                if (fearGreedValue <= 20) {
                    strategy += 'Consider accumulating during extreme fear. DCA approach recommended. ';
                } else if (fearGreedValue >= 80) {
                    strategy += 'Consider taking profits and reducing exposure. ';
                }
            }

            // Volatility based strategy
            switch (marketData.volatility) {
                case 'High':
                    strategy += 'Reduce position sizes by 25-50%. Use wider stops. Focus on major pairs. ';
                    break;
                case 'Medium':
                    strategy += 'Standard position sizing. Balance between major and alt pairs. ';
                    break;
                case 'Low':
                    strategy += 'Watch for breakout setups. Consider range trading strategies. ';
                    break;
            }

            // Altcoin dominance based strategy
            const altcoinDom = parseFloat(marketData.altcoinDominance);
            if (altcoinDom > 55) {
                strategy += 'Focus on quality altcoins with strong fundamentals. ';
            } else if (altcoinDom < 45) {
                strategy += 'Focus on BTC and major pairs. ';
            }

            // OBV Trend based strategy
            if (marketData.obvTrend === 'Up') {
                strategy += 'Trend following strategy preferred. Look for pullback entries. ';
            } else if (marketData.obvTrend === 'Down') {
                strategy += 'Counter-trend trades require strict risk management. ';
            }

            this.metrics.tradingStrategy = strategy.trim();
            this.updateUI();
        } catch (error) {
            console.error('MarketMetrics: Error updating trading strategy:', error);
            this.handleError(error);
        }
    }

    updateUI() {
        console.log('MarketMetrics: Starting UI update');
        try {
            // Update altcoin dominance
            if (this.elements.altcoinDominance) {
                this.elements.altcoinDominance.textContent = `${this.metrics.altcoinDominance}%`;
                console.log('MarketMetrics: Updated altcoin dominance UI');
            }

            // Update fear and greed
            if (this.elements.fearGreed) {
                const fearGreed = this.metrics.altcoinFearGreed;
                if (fearGreed) {
                    this.elements.fearGreed.textContent = `${fearGreed.value} - ${fearGreed.classification}`;
                    this.elements.fearGreed.className = `metric-value ${fearGreed.classification.toLowerCase().replace(' ', '-')}`;
                    console.log('MarketMetrics: Updated fear and greed UI');
                }
            }

            // Update volatility
            if (this.elements.volatility) {
                this.elements.volatility.textContent = this.metrics.volatility;
                this.elements.volatility.className = `metric-value volatility-${this.metrics.volatility.toLowerCase()}`;
                console.log('MarketMetrics: Updated volatility UI');
            }

            // Update OBV trend
            if (this.elements.obvTrend) {
                this.elements.obvTrend.textContent = this.metrics.obvTrend || 'N/A';
                this.elements.obvTrend.className = this.getOBVTrendClass(this.metrics.obvTrend);
                console.log('MarketMetrics: Updated OBV trend UI');
            }

            // Update market summary
            if (this.elements.marketSummary) {
                this.elements.marketSummary.textContent = this.metrics.marketSummary;
                console.log('MarketMetrics: Updated market summary UI');
            }

            // Update correlations
            if (this.elements.correlations) {
                this.updateCorrelationUI(this.metrics.correlations);
                console.log('MarketMetrics: Updated correlations UI');
            }

            // Update trading strategy
            if (this.elements.tradingStrategy) {
                this.elements.tradingStrategy.textContent = this.metrics.tradingStrategy;
                console.log('MarketMetrics: Updated trading strategy UI');
            }

            // Update market overview
            if (this.elements.marketOverview) {
                this.elements.marketOverview.textContent = this.metrics.marketOverview;
                console.log('MarketMetrics: Updated market overview UI');
            }
        } catch (error) {
            console.error('MarketMetrics: Error updating UI:', error);
            this.handleError(error);
        }
    }

    handleError(error) {
        console.error('MarketMetrics: Error occurred:', error);
        // Update UI to show error state
        const elements = [
            this.elements.altcoinDominance,
            this.elements.fearGreed,
            this.elements.volatility,
            this.elements.obvTrend,
            this.elements.marketSummary,
            this.elements.correlations,
            this.elements.tradingStrategy,
            this.elements.marketOverview
        ];

        elements.forEach(element => {
            if (element && element.textContent === 'Loading...') {
                element.textContent = 'Error loading data';
                element.classList.add('error-state');
            }
        });
    }

    getOBVTrendClass(obvTrend) {
        if (obvTrend === 'Up') {
            return 'obv-trend-up';
        } else if (obvTrend === 'Down') {
            return 'obv-trend-down';
        } else {
            return 'obv-trend-neutral';
        }
    }

    updateCorrelationUI(correlations) {
        const correlationElements = document.querySelectorAll('.correlation');
        correlationElements.forEach(element => {
            const asset1 = element.getAttribute('data-asset1');
            const asset2 = element.getAttribute('data-asset2');
            const correlation = correlations[asset1][asset2];
            element.textContent = correlation.toFixed(2);
            if (correlation > 0.5) {
                element.classList.add('strong-correlation');
            } else if (correlation < -0.5) {
                element.classList.add('strong-anti-correlation');
            } else {
                element.classList.remove('strong-correlation', 'strong-anti-correlation');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.marketMetrics = new MarketMetrics();
    marketMetrics.init().catch(error => {
        console.error('Failed to initialize MarketMetrics:', error);
    });
});
