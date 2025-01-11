// Historical Patterns Analysis Class
export class HistoricalPatterns {
    constructor() {
        this.patternChart = null;
        this.cyclesChart = null;
        this.patternSeries = null;
        this.cyclesSeries = null;
        this.currentSymbol = 'BTCUSDT';
        this.currentTimeframe = '1D';
        this.retryAttempts = 3;
        this.retryDelay = 2000; // Increased delay between retries
        this.cache = {};
        this.cacheExpiry = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    }

    async init() {
        try {
            console.log('Initializing Historical Patterns...');
            
            // Wait for HTXHandler to be available and initialized
            this.htxHandler = window.htxHandler;
            if (!this.htxHandler) {
                throw new Error('HTXHandler not found');
            }
            
            // Wait for HTXHandler to be initialized
            if (!this.htxHandler.isInitialized()) {
                await this.htxHandler.init();
            }

            // Wait for LightweightCharts to be available
            await this.waitForDependencies();
            
            await this.initializeCharts();
            // Add delay before first data fetch
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.fetchDataWithRetry();
            this.setupEventListeners();
            
            console.log('Historical Patterns initialized successfully');
        } catch (error) {
            console.error('Error initializing Historical Patterns:', error);
            this.handleError(error);
        }
    }

    async waitForDependencies() {
        let attempts = 0;
        while (attempts < this.retryAttempts) {
            if (window.LightweightCharts) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            attempts++;
        }
        throw new Error('LightweightCharts not available');
    }

    async initializeCharts() {
        try {
            // Get chart containers
            const patternContainer = document.getElementById('pattern-chart');
            const cyclesContainer = document.getElementById('cycles-chart');

            if (!patternContainer || !cyclesContainer) {
                throw new Error('Chart containers not found');
            }

            // Initialize Pattern Recognition Chart
            this.patternChart = window.LightweightCharts.createChart(patternContainer, {
                width: patternContainer.clientWidth,
                height: 300,
                layout: {
                    background: { color: '#16181a' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#1e222d' },
                    horzLines: { color: '#1e222d' },
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            // Initialize Market Cycles Chart
            this.cyclesChart = window.LightweightCharts.createChart(cyclesContainer, {
                width: cyclesContainer.clientWidth,
                height: 300,
                layout: {
                    background: { color: '#16181a' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: '#1e222d' },
                    horzLines: { color: '#1e222d' },
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            // Add series to charts
            this.patternSeries = this.patternChart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350'
            });

            this.cyclesSeries = this.cyclesChart.addLineSeries({
                color: '#2196F3',
                lineWidth: 2,
            });

            // Handle window resize
            window.addEventListener('resize', () => {
                if (this.patternChart && this.cyclesChart) {
                    this.patternChart.resize(patternContainer.clientWidth, 300);
                    this.cyclesChart.resize(cyclesContainer.clientWidth, 300);
                    this.patternChart.timeScale().fitContent();
                    this.cyclesChart.timeScale().fitContent();
                }
            });

            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Error initializing charts:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Setup timeframe selector
        const timeframeSelector = document.getElementById('timeframe-selector');
        if (timeframeSelector) {
            timeframeSelector.addEventListener('change', async (e) => {
                this.currentTimeframe = e.target.value;
                await this.fetchDataWithRetry();
            });
        }

        // Setup symbol selector
        const symbolSelector = document.getElementById('symbol-selector');
        if (symbolSelector) {
            symbolSelector.addEventListener('change', async (e) => {
                this.currentSymbol = e.target.value;
                await this.fetchDataWithRetry();
            });
        }
    }

    async fetchDataWithRetry() {
        let lastError;
        for (let i = 0; i < this.retryAttempts; i++) {
            try {
                await this.updatePatterns();
                return;
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error);
                lastError = error;
                if (i < this.retryAttempts - 1) {
                    // Exponential backoff
                    const delay = this.retryDelay * Math.pow(2, i);
                    console.log(`Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        this.handleError(lastError);
        throw lastError;
    }

    async updatePatterns() {
        try {
            console.log('Updating patterns for:', this.currentSymbol, this.currentTimeframe);
            
            const cacheKey = `${this.currentSymbol}-${this.currentTimeframe}`;
            const now = Date.now();
            
            // Check cache first
            if (this.cache[cacheKey] && (now - this.cache[cacheKey].timestamp) < this.cacheExpiry) {
                console.log('Using cached data from', new Date(this.cache[cacheKey].timestamp));
                return this.updateChartsWithData(this.cache[cacheKey].data);
            }

            // Format interval correctly for HTX
            const period = this.getInterval(this.currentTimeframe);
            const symbol = this.currentSymbol.toLowerCase();
            
            // Use HTXHandler to fetch kline data with smaller size
            const endpoint = `/market/history/kline?symbol=${symbol}&period=${period}&size=100`;
            console.log('Fetching data from endpoint:', endpoint);
            
            // Add delay before API call
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await this.htxHandler.makeRequest(endpoint);
            
            console.log('API Response:', response);
            
            if (!response || !response.data || !Array.isArray(response.data)) {
                console.error('Invalid or empty response:', response);
                throw new Error('Invalid or empty data received from API');
            }

            // Cache the new data
            this.cache[cacheKey] = {
                timestamp: now,
                data: response.data
            };

            // Update charts with the new data
            await this.updateChartsWithData(response.data);

        } catch (error) {
            console.error('Error updating patterns:', error);
            this.handleError(error);
            throw error;
        }
    }

    calculateSMA(data, period = 20) {
        const sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                // Not enough data for SMA yet, use close price
                sma.push({
                    time: data[i].time,
                    value: data[i].close
                });
                continue;
            }

            const sum = data.slice(i - period + 1, i + 1)
                .reduce((acc, candle) => acc + candle.close, 0);
            
            sma.push({
                time: data[i].time,
                value: sum / period
            });
        }
        return sma;
    }

    async updateChartsWithData(data) {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                console.error('Invalid data received:', data);
                return;
            }

            console.log('Received data length:', data.length);
            console.log('First candle:', data[0]);
            
            // Transform HTX kline data format
            const chartData = data
                .filter(candle => {
                    // Strict validation of input data
                    if (!candle || typeof candle !== 'object') return false;
                    
                    const values = [
                        candle.id,
                        candle.open,
                        candle.close,
                        candle.low,
                        candle.high
                    ];
                    
                    return values.every(val => val !== null && val !== undefined && !isNaN(Number(val)));
                })
                .map(candle => {
                    // Convert all values to numbers and ensure they're valid
                    const timestamp = Number(candle.id);
                    const open = Number(candle.open);
                    const close = Number(candle.close);
                    const low = Number(candle.low);
                    const high = Number(candle.high);

                    // Convert to seconds if in milliseconds
                    const timeInSeconds = timestamp > 2000000000 ? Math.floor(timestamp / 1000) : timestamp;
                    
                    return {
                        time: timeInSeconds,
                        open,
                        high,
                        low,
                        close
                    };
                });

            console.log('Transformed chart data:', chartData.length, 'candles');
            if (chartData.length > 0) {
                console.log('Sample transformed candle:', chartData[0]);
            } else {
                console.warn('No valid candles after transformation');
                return;
            }

            // Sort data by timestamp to ensure proper ordering
            chartData.sort((a, b) => a.time - b.time);

            // Validate final data
            const isValidData = chartData.every(candle => 
                typeof candle.time === 'number' && !isNaN(candle.time) &&
                typeof candle.open === 'number' && !isNaN(candle.open) &&
                typeof candle.high === 'number' && !isNaN(candle.high) &&
                typeof candle.low === 'number' && !isNaN(candle.low) &&
                typeof candle.close === 'number' && !isNaN(candle.close) &&
                candle.high >= candle.low &&
                candle.high >= Math.min(candle.open, candle.close) &&
                candle.low <= Math.max(candle.open, candle.close)
            );

            if (!isValidData) {
                console.error('Invalid data after transformation');
                return;
            }

            // Update pattern chart
            if (this.patternSeries && chartData.length > 0) {
                try {
                    this.patternSeries.setData(chartData);
                    this.patternChart.timeScale().fitContent();
                } catch (error) {
                    console.error('Error updating pattern chart:', error);
                }
            }

            // Basic pattern analysis
            const lastCandle = chartData[chartData.length - 1];
            const firstCandle = chartData[0];
            
            if (lastCandle && firstCandle) {
                const priceChange = ((lastCandle.close - firstCandle.close) / firstCandle.close * 100).toFixed(2);
                const confidence = Math.abs(parseFloat(priceChange));
                
                let pattern = 'Neutral';
                let target = 'Neutral';
                
                if (priceChange > 0) {
                    pattern = confidence > 5 ? 'Strong Uptrend' : 'Weak Uptrend';
                    target = 'Bullish';
                } else if (priceChange < 0) {
                    pattern = confidence > 5 ? 'Strong Downtrend' : 'Weak Downtrend';
                    target = 'Bearish';
                }

                this.updateElement('currentPattern', pattern);
                this.updateElement('patternConfidence', `${confidence}%`);
                this.updateElement('patternTarget', target);
            } else {
                this.updateElement('currentPattern', 'No Pattern');
                this.updateElement('patternConfidence', '-');
                this.updateElement('patternTarget', '-');
            }

            // Update cycles chart with SMA
            if (this.cyclesSeries && chartData.length > 0) {
                try {
                    const cyclesData = this.calculateSMA(chartData);
                    console.log('Cycles data calculated:', cyclesData.length, 'points');
                    this.cyclesSeries.setData(cyclesData);
                    this.cyclesChart.timeScale().fitContent();
                } catch (error) {
                    console.error('Error updating cycles chart:', error);
                }
            }
        } catch (error) {
            console.error('Error updating charts:', error);
            this.updateElement('currentPattern', 'Error');
            this.updateElement('patternConfidence', '-');
            this.updateElement('patternTarget', '-');
        }
    }

    getInterval(timeframe) {
        // Convert timeframe to HTX format
        const map = {
            '1m': '1min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '60min',
            '4h': '4hour',
            '1d': '1day',
            '1w': '1week',
            '1M': '1mon'
        };
        return map[timeframe] || '1day';
    }

    handleError(error) {
        console.error('Historical Patterns Error:', error);

        // Update UI elements to show error state
        ['currentPattern', 'patternConfidence', 'patternTarget'].forEach(id => {
            this.updateElement(id, 'Error loading data');
        });

        // Add error overlay to charts
        this.showChartError(this.patternChart, 'Pattern chart data unavailable');
        this.showChartError(this.cyclesChart, 'Cycle data unavailable');
    }

    showChartError(chart, message) {
        if (chart && chart.container) {
            // Remove existing error overlays
            const existingOverlay = chart.container.querySelector('.chart-error-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }

            // Create new error overlay
            const errorOverlay = document.createElement('div');
            errorOverlay.className = 'chart-error-overlay';
            errorOverlay.textContent = message;
            chart.container.appendChild(errorOverlay);
        }
    }

    clearError() {
        // Remove error classes from UI elements
        ['currentPattern', 'patternConfidence', 'patternTarget'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.remove('error');
            }
        });

        // Remove error overlays from charts
        [this.patternChart, this.cyclesChart].forEach(chart => {
            if (chart && chart.container) {
                const overlay = chart.container.querySelector('.chart-error-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        });
    }

    updateElement(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }
}

// Create and export singleton instance
const historicalPatterns = new HistoricalPatterns();
export { historicalPatterns };
