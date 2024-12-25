class AdvancedTechnicalAnalysis {
    constructor() {
        this.charts = {};
        this.currentTimeframe = '4h';
        this.activeTool = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize all charts
            await this.initializeCharts();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadData(this.currentTimeframe);
            
            // Start auto-refresh
            this.startAutoRefresh();
        } catch (error) {
            console.error('Error initializing Advanced TA:', error);
        }
    }

    async initializeCharts() {
        const chartOptions = {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: 1,
            },
        };

        // Initialize MTF Chart
        this.charts.mtf = LightweightCharts.createChart(
            document.getElementById('mtfChart'),
            chartOptions
        );

        // Initialize Pattern Chart
        this.charts.pattern = LightweightCharts.createChart(
            document.getElementById('patternChart'),
            chartOptions
        );

        // Initialize S/R Chart
        this.charts.sr = LightweightCharts.createChart(
            document.getElementById('srChart'),
            chartOptions
        );

        // Initialize Divergence Chart
        this.charts.divergence = LightweightCharts.createChart(
            document.getElementById('divergenceChart'),
            chartOptions
        );

        // Add series to each chart
        this.addChartSeries();
    }

    addChartSeries() {
        // MTF Chart Series
        this.series = {
            mtf: {
                main: this.charts.mtf.addCandlestickSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                }),
                volume: this.charts.mtf.addHistogramSeries({
                    color: '#26a69a',
                    priceFormat: {
                        type: 'volume',
                    },
                    priceScaleId: '',
                    scaleMargins: {
                        top: 0.8,
                        bottom: 0,
                    },
                }),
            },
            pattern: {
                main: this.charts.pattern.addCandlestickSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                }),
            },
            sr: {
                main: this.charts.sr.addCandlestickSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                }),
            },
            divergence: {
                main: this.charts.divergence.addCandlestickSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                }),
                rsi: this.charts.divergence.addLineSeries({
                    color: '#2962FF',
                    lineWidth: 2,
                    priceScaleId: 'rsi',
                    scaleMargins: {
                        top: 0.8,
                        bottom: 0,
                    },
                }),
            },
        };
    }

    setupEventListeners() {
        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTimeframe = e.target.dataset.timeframe;
                this.loadData(this.currentTimeframe);
            });
        });

        // Tool buttons
        document.querySelectorAll('.tool-item').forEach(tool => {
            tool.addEventListener('click', (e) => {
                const toolId = e.currentTarget.id;
                this.activateTool(toolId);
            });
        });
    }

    async loadData(timeframe) {
        try {
            const symbol = 'BTCUSDT'; // Default symbol
            const response = await fetch(`/api/klines?symbol=${symbol}&interval=${timeframe}`);
            const data = await response.json();

            if (data && data.length > 0) {
                // Process and update charts
                this.updateCharts(data);
                
                // Analyze patterns
                this.detectPatterns(data);
                
                // Find support/resistance
                this.findSupportResistance(data);
                
                // Scan for divergences
                this.scanDivergences(data);
                
                // Update indicators
                this.updateIndicators(data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    updateCharts(data) {
        const candleData = data.map(candle => ({
            time: candle[0] / 1000,
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));

        // Update all charts with the new data
        this.series.mtf.main.setData(candleData);
        this.series.pattern.main.setData(candleData);
        this.series.sr.main.setData(candleData);
        this.series.divergence.main.setData(candleData);

        // Update volume
        const volumeData = candleData.map(candle => ({
            time: candle.time,
            value: candle.volume,
            color: candle.close > candle.open ? '#26a69a' : '#ef5350'
        }));
        this.series.mtf.volume.setData(volumeData);
    }

    detectPatterns(data) {
        // Implement pattern detection logic here
        // For now, using placeholder data
        const patterns = [
            { name: 'Double Bottom', confidence: '85%', location: 'Current' },
            { name: 'Bull Flag', confidence: '75%', location: 'Forming' }
        ];

        const patternsContainer = document.getElementById('detectedPatterns');
        patternsContainer.innerHTML = patterns.map(pattern => `
            <div class="pattern-item">
                <span class="label">${pattern.name}</span>
                <span class="value">${pattern.confidence}</span>
            </div>
        `).join('');
    }

    findSupportResistance(data) {
        // Implement S/R detection logic here
        // For now, using placeholder data
        const levels = {
            resistance: this.calculateResistance(data),
            support: this.calculateSupport(data)
        };

        document.getElementById('keyResistance').textContent = levels.resistance.toFixed(2);
        document.getElementById('keySupport').textContent = levels.support.toFixed(2);

        // Add horizontal lines to SR chart
        this.addSRLines(levels);
    }

    calculateResistance(data) {
        const closes = data.map(candle => parseFloat(candle[4]));
        return Math.max(...closes);
    }

    calculateSupport(data) {
        const closes = data.map(candle => parseFloat(candle[4]));
        return Math.min(...closes);
    }

    addSRLines(levels) {
        // Add horizontal lines for S/R levels
        this.series.sr.main.createPriceLine({
            price: levels.resistance,
            color: '#ef5350',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'R',
        });

        this.series.sr.main.createPriceLine({
            price: levels.support,
            color: '#26a69a',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'S',
        });
    }

    scanDivergences(data) {
        // Calculate RSI
        const rsi = this.calculateRSI(data);
        
        // Update RSI series
        const rsiData = rsi.map((value, index) => ({
            time: data[index][0] / 1000,
            value: value
        }));
        this.series.divergence.rsi.setData(rsiData);

        // Check for divergences
        const divergences = this.findDivergences(data, rsi);
        
        // Update UI
        document.getElementById('rsiDivergence').textContent = divergences.rsi;
        document.getElementById('macdDivergence').textContent = divergences.macd;
    }

    calculateRSI(data, period = 14) {
        const closes = data.map(candle => parseFloat(candle[4]));
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < closes.length; i++) {
            const difference = closes[i] - closes[i - 1];
            gains.push(difference > 0 ? difference : 0);
            losses.push(difference < 0 ? Math.abs(difference) : 0);
        }

        const rsi = [];
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

        for (let i = period; i < closes.length; i++) {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));

            avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
        }

        return rsi;
    }

    findDivergences(data, rsi) {
        // Implement divergence detection logic here
        // For now, return placeholder data
        return {
            rsi: 'Bullish Divergence Detected',
            macd: 'No Divergence'
        };
    }

    updateIndicators(data) {
        // Calculate and update trend strength and momentum
        const trendStrength = this.calculateTrendStrength(data);
        const momentum = this.calculateMomentum(data);

        document.getElementById('trendStrength').textContent = trendStrength;
        document.getElementById('momentum').textContent = momentum;
    }

    calculateTrendStrength(data) {
        // Implement trend strength calculation
        // For now, return placeholder data
        return 'Strong Uptrend (85%)';
    }

    calculateMomentum(data) {
        // Implement momentum calculation
        // For now, return placeholder data
        return 'Increasing (65)';
    }

    activateTool(toolId) {
        // Deactivate all tools
        document.querySelectorAll('.tool-item').forEach(tool => tool.classList.remove('active'));
        
        // Activate selected tool
        document.getElementById(toolId).classList.add('active');
        this.activeTool = toolId;

        // Show tool-specific settings
        this.showToolSettings(toolId);
    }

    showToolSettings(toolId) {
        const settingsContainer = document.getElementById('toolSettings');
        let settingsHTML = '';

        switch (toolId) {
            case 'fibTool':
                settingsHTML = `
                    <div class="fib-settings">
                        <label>Levels:</label>
                        <div class="fib-levels">
                            <label><input type="checkbox" checked> 0.236</label>
                            <label><input type="checkbox" checked> 0.382</label>
                            <label><input type="checkbox" checked> 0.5</label>
                            <label><input type="checkbox" checked> 0.618</label>
                            <label><input type="checkbox" checked> 0.786</label>
                        </div>
                    </div>
                `;
                break;
            case 'trendlineTool':
                settingsHTML = `
                    <div class="trendline-settings">
                        <label>Style:</label>
                        <select>
                            <option>Solid</option>
                            <option>Dashed</option>
                            <option>Dotted</option>
                        </select>
                        <label>Auto-extend:</label>
                        <input type="checkbox" checked>
                    </div>
                `;
                break;
            // Add other tool settings
        }

        settingsContainer.innerHTML = settingsHTML;
    }

    startAutoRefresh() {
        // Refresh data every minute
        setInterval(() => this.loadData(this.currentTimeframe), 60000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdvancedTechnicalAnalysis();
});
