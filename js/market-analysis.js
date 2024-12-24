class MarketAnalysis {
    constructor() {
        // Chart properties
        this.chart = null;
        this.candlestickSeries = null;
        this.ma20Series = null;
        this.ma50Series = null;
        this.ma200Series = null;

        // Data properties
        this.timeframe = '1d';
        this.currentPair = 'BTCUSDT';
        this.pairs = ['BTCUSDT', 'ETHUSDT'];
        this.chartData = [];
        
        // Indicator settings
        this.indicators = {
            ma20: { enabled: true, color: '#2196F3', period: 20 },
            ma50: { enabled: true, color: '#4CAF50', period: 50 },
            ma200: { enabled: true, color: '#FFC107', period: 200 }
        };

        // Start initialization
        this.init();
    }

    async init() {
        try {
            // Create and setup chart
            await this.createChart();
            
            // Setup timeframe buttons
            const timeframeButtons = document.querySelectorAll('.timeframe-btn');
            timeframeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const timeframe = button.dataset.timeframe;
                    this.updateTimeframe(timeframe);
                });
            });

            // Initial data fetch and update
            await this.updateAllData();
            
            // Set up periodic updates
            setInterval(() => this.updateAllData(), 15000);
            
            console.log('Market Analysis initialized successfully');
        } catch (error) {
            console.error('Error initializing Market Analysis:', error);
        }
    }

    async createChart() {
        try {
            const chartContainer = document.getElementById('priceChart');
            if (!chartContainer) {
                console.error('Chart container not found');
                return;
            }

            // Set container height explicitly
            chartContainer.style.height = '600px';
            
            // Create the chart with fixed dimensions
            this.chart = LightweightCharts.createChart(chartContainer, {
                width: chartContainer.clientWidth,
                height: 600, // Fixed height
                layout: {
                    background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
                    textColor: '#d1d4dc',
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                },
                rightPriceScale: {
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.2,  // Increased bottom margin for volume
                    },
                    borderVisible: false,
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderVisible: false,
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                    vertLine: {
                        width: 1,
                        color: 'rgba(224, 227, 235, 0.1)',
                        style: 0,
                    },
                    horzLine: {
                        visible: true,
                        labelVisible: true,
                    },
                },
            });

            // Handle window resize
            window.addEventListener('resize', () => {
                if (this.chart) {
                    this.chart.applyOptions({
                        width: chartContainer.clientWidth,
                        height: 600 // Keep height fixed on resize
                    });
                }
            });

            // Create main series
            this.candlestickSeries = this.chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderUpColor: '#26a69a',
                borderDownColor: '#ef5350',
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });

            // Add volume series
            // this.volumeSeries = this.chart.addHistogramSeries({
            //     color: '#26a69a',
            //     priceFormat: {
            //         type: 'volume',
            //     },
            //     priceScaleId: '', // Set as an overlay
            //     scaleMargins: {
            //         top: 0.8, // Position above the bottom
            //         bottom: 0,
            //     },
            // });

            // Create MA series
            this.ma20Series = this.chart.addLineSeries({
                color: this.indicators.ma20.color,
                lineWidth: 2,
                title: 'MA20'
            });

            this.ma50Series = this.chart.addLineSeries({
                color: this.indicators.ma50.color,
                lineWidth: 2,
                title: 'MA50'
            });

            this.ma200Series = this.chart.addLineSeries({
                color: this.indicators.ma200.color,
                lineWidth: 2,
                title: 'MA200'
            });

        } catch (error) {
            console.error('Error creating chart:', error);
        }
    }

    async fetchKlines(symbol, interval) {
        try {
            const response = await fetch(`/api/mexc/klines?symbol=${symbol}&interval=${interval}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching klines:', error);
            return null;
        }
    }

    calculateMA(data, period) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push({ time: data[i].time, value: null });
                continue;
            }
            
            let sum = 0;
            for (let j = 0; j < period; j++) {
                // Ensure we're getting a valid close price
                const closePrice = data[i - j].close;
                if (typeof closePrice !== 'number' || isNaN(closePrice)) {
                    console.warn('Invalid close price found:', closePrice);
                    result.push({ time: data[i].time, value: null });
                    continue;
                }
                sum += closePrice;
            }
            const ma = sum / period;
            if (!isNaN(ma)) {
                result.push({
                    time: data[i].time,
                    value: ma
                });
            } else {
                result.push({ time: data[i].time, value: null });
            }
        }
        return result;
    }

    async updateTimeframe(timeframe) {
        try {
            // Update UI
            const timeframeButtons = document.querySelectorAll('.timeframe-btn');
            timeframeButtons.forEach(button => button.classList.remove('active'));
            const activeButton = document.querySelector(`[data-timeframe="${timeframe}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }

            this.timeframe = timeframe;
            await this.updateAllData();
        } catch (error) {
            console.error('Error updating timeframe:', error);
        }
    }

    async updateAllData() {
        try {
            const klines = await this.fetchKlines(this.currentPair, this.timeframe);
            
            if (klines && klines.length > 0) {
                await this.updateChartData(klines);
            }
        } catch (error) {
            console.error('Error updating data:', error);
        }
    }

    async updateChartData(klines) {
        try {
            if (!Array.isArray(klines) || klines.length === 0) {
                console.error('Invalid klines data:', klines);
                return;
            }

            // Process candlestick data
            const candleData = klines.map(candle => {
                const [timestamp, open, high, low, close] = candle;
                return {
                    time: timestamp / 1000,
                    open: parseFloat(open),
                    high: parseFloat(high),
                    low: parseFloat(low),
                    close: parseFloat(close)
                };
            }).filter(candle => 
                !isNaN(candle.open) && 
                !isNaN(candle.high) && 
                !isNaN(candle.low) && 
                !isNaN(candle.close)
            );

            if (candleData.length === 0) {
                console.error('No valid candle data after processing');
                return;
            }

            // Update chart series
            this.candlestickSeries.setData(candleData);

            // Calculate and update MAs
            if (this.indicators.ma20.enabled && candleData.length > this.indicators.ma20.period) {
                const ma20Data = this.calculateMA(candleData, this.indicators.ma20.period);
                this.ma20Series.setData(ma20Data);
            }

            if (this.indicators.ma50.enabled && candleData.length > this.indicators.ma50.period) {
                const ma50Data = this.calculateMA(candleData, this.indicators.ma50.period);
                this.ma50Series.setData(ma50Data);
            }

            if (this.indicators.ma200.enabled && candleData.length > this.indicators.ma200.period) {
                const ma200Data = this.calculateMA(candleData, this.indicators.ma200.period);
                this.ma200Series.setData(ma200Data);
            }

            // Update latest price
            const latestCandle = candleData[candleData.length - 1];
            this.updatePriceInfo(latestCandle);

            // Fit content
            this.chart.timeScale().fitContent();

        } catch (error) {
            console.error('Error updating chart data:', error);
        }
    }

    updatePriceInfo(latestCandle) {
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (priceElement && changeElement) {
            const currentPrice = latestCandle.close;
            const priceChange = ((currentPrice - latestCandle.open) / latestCandle.open) * 100;
            
            priceElement.textContent = `$${currentPrice.toFixed(2)}`;
            changeElement.textContent = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
            changeElement.className = priceChange >= 0 ? 'positive' : 'negative';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.marketAnalysis = new MarketAnalysis();
});
