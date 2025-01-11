// Traditional Markets Handler
export class TraditionalMarkets {
    constructor() {
        this.charts = {};
        this.data = {
            indices: {},
            commodities: {},
            forex: {}
        };
        this.timeframe = '1d';
        this.correlationMatrix = [];
        
        // API Configuration
        this.ALPHA_VANTAGE_API_KEY = 'YOUR_ALPHA_VANTAGE_KEY'; // We'll need to set this up
        this.symbols = {
            indices: {
                'sp500': '^GSPC',
                'nasdaq': '^IXIC',
                'djia': '^DJI'
            },
            commodities: {
                'gold': 'GC=F',
                'silver': 'SI=F',
                'oil': 'CL=F'
            },
            forex: {
                'eurusd': 'EUR/USD',
                'gbpusd': 'GBP/USD',
                'usdjpy': 'USD/JPY'
            }
        };
        this.indices = {
            '^GSPC': { name: 'S&P 500', id: 'sp500' },
            '^IXIC': { name: 'NASDAQ', id: 'nasdaq' },
            '^DJI': { name: 'DJIA', id: 'djia' }
        };
        
        this.commodities = {
            'GC=F': { name: 'Gold', id: 'gold' },
            'SI=F': { name: 'Silver', id: 'silver' },
            'CL=F': { name: 'Oil', id: 'oil' }
        };

        this.updateInterval = 60000; // 1 minute
    }

    async initialize() {
        this.initializeCharts();
        this.setupEventListeners();
        try {
            await this.fetchAllData();
            setInterval(() => this.fetchAllData(), this.updateInterval);
        } catch (error) {
            console.error('Error initializing traditional markets:', error);
        }
    }

    initializeCharts() {
        const chartOptions = {
            layout: {
                background: { color: 'transparent' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        };

        ['indices', 'commodities', 'forex'].forEach(type => {
            const container = document.getElementById(`${type}-chart`);
            if (container) {
                this.charts[type] = LightweightCharts.createChart(container, chartOptions);
            }
        });
    }

    setupEventListeners() {
        document.querySelectorAll('.timeframe-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const timeframe = e.target.dataset.timeframe;
                this.updateTimeframe(timeframe);
                
                // Update active button state
                e.target.closest('.timeframe-selector').querySelectorAll('.timeframe-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
    }

    async fetchAllData() {
        try {
            await Promise.all([
                this.fetchIndicesData(),
                this.fetchCommoditiesData(),
                this.fetchForexData()
            ]);

            this.calculateCorrelations();
            this.updateUI();
            this.generateMarketInsights();
        } catch (error) {
            console.error('Error fetching market data:', error);
        }
    }

    async fetchIndicesData() {
        try {
            for (const symbol of Object.keys(this.indices)) {
                const response = await fetch(`/api/yahoo/chart/${encodeURIComponent(symbol)}?range=${this.timeframe}&interval=5m`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                
                if (data.chart?.result?.[0]) {
                    const result = data.chart.result[0];
                    const quotes = result.indicators.quote[0];
                    const timestamps = result.timestamp;
                    const lastIndex = quotes.close.length - 1;

                    this.data.indices[this.indices[symbol].id] = {
                        value: quotes.close[lastIndex].toFixed(2),
                        change: (quotes.close[lastIndex] - quotes.close[0]).toFixed(2),
                        changePercent: ((quotes.close[lastIndex] - quotes.close[0]) / quotes.close[0] * 100).toFixed(2),
                        history: timestamps.map((time, i) => ({
                            time: time * 1000,
                            value: quotes.close[i]
                        }))
                    };
                }
            }
            this.updateIndicesUI();
        } catch (error) {
            console.error('Error fetching indices data:', error);
        }
    }

    async fetchCommoditiesData() {
        try {
            for (const symbol of Object.keys(this.commodities)) {
                const response = await fetch(`/api/yahoo/chart/${encodeURIComponent(symbol)}?range=${this.timeframe}&interval=5m`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                
                if (data.chart?.result?.[0]) {
                    const result = data.chart.result[0];
                    const quotes = result.indicators.quote[0];
                    const timestamps = result.timestamp;
                    const lastIndex = quotes.close.length - 1;

                    this.data.commodities[this.commodities[symbol].id] = {
                        value: quotes.close[lastIndex].toFixed(2),
                        change: (quotes.close[lastIndex] - quotes.close[0]).toFixed(2),
                        changePercent: ((quotes.close[lastIndex] - quotes.close[0]) / quotes.close[0] * 100).toFixed(2),
                        history: timestamps.map((time, i) => ({
                            time: time * 1000,
                            value: quotes.close[i]
                        }))
                    };
                }
            }
            this.updateCommoditiesUI();
        } catch (error) {
            console.error('Error fetching commodities data:', error);
        }
    }

    async fetchForexData() {
        for (const [key, pair] of Object.entries(this.symbols.forex)) {
            try {
                const response = await fetch(`https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${pair.split('/')[0]}&to_symbol=${pair.split('/')[1]}&interval=5min&apikey=${this.ALPHA_VANTAGE_API_KEY}`);
                const data = await response.json();
                
                if (data['Time Series FX (5min)']) {
                    const timeSeries = data['Time Series FX (5min)'];
                    const times = Object.keys(timeSeries).sort();
                    const values = times.map(time => parseFloat(timeSeries[time]['4. close']));
                    
                    this.data.forex[key] = {
                        value: values[values.length - 1].toFixed(4),
                        change: (values[values.length - 1] - values[0]).toFixed(4),
                        changePercent: ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(2),
                        history: times.map((time, i) => ({
                            time: new Date(time).getTime(),
                            value: values[i]
                        }))
                    };
                }
            } catch (error) {
                console.error(`Error fetching ${key} data:`, error);
            }
        }
        this.updateForexUI();
    }

    updateUI() {
        this.updateIndicesUI();
        this.updateCommoditiesUI();
        this.updateForexUI();
        this.updateCorrelationMatrix();
    }

    updateIndicesUI() {
        const indices = ['sp500', 'nasdaq', 'djia'];
        indices.forEach(index => {
            const data = this.data.indices[index];
            if (data) {
                const element = document.getElementById(index);
                if (element) {
                    element.querySelector('.index-value').textContent = data.value;
                    this.updateChangeValues(element, data);
                }
            }
        });
        this.updateChart('indices', this.data.indices.sp500?.history);
    }

    updateCommoditiesUI() {
        const commodities = ['gold', 'silver', 'oil'];
        commodities.forEach(commodity => {
            const data = this.data.commodities[commodity];
            if (data) {
                const element = document.getElementById(commodity);
                if (element) {
                    element.querySelector('.commodity-value').textContent = data.value;
                    this.updateChangeValues(element, data);
                }
            }
        });
        this.updateChart('commodities', this.data.commodities.gold?.history);
    }

    updateForexUI() {
        const pairs = ['eurusd', 'gbpusd', 'usdjpy'];
        pairs.forEach(pair => {
            const data = this.data.forex[pair];
            if (data) {
                const element = document.getElementById(pair);
                if (element) {
                    element.querySelector('.forex-value').textContent = data.value;
                    this.updateChangeValues(element, data);
                }
            }
        });
        this.updateChart('forex', this.data.forex.eurusd?.history);
    }

    updateChangeValues(element, data) {
        const changeValue = element.querySelector('.change-value');
        const changePercent = element.querySelector('.change-percent');
        
        changeValue.textContent = data.change;
        changePercent.textContent = `${data.changePercent}%`;
        
        const isPositive = parseFloat(data.change) >= 0;
        changeValue.className = `change-value ${isPositive ? 'positive' : 'negative'}`;
        changePercent.className = `change-percent ${isPositive ? 'positive' : 'negative'}`;
    }

    updateChart(type, data) {
        const chart = this.charts[type];
        if (!chart || !data) return;

        // Clear existing series
        chart.removeSeries();

        // Create new series with updated data
        const series = chart.addLineSeries({
            color: 'rgba(76, 175, 80, 1)',
            lineWidth: 2,
        });

        series.setData(data);
    }

    calculateCorrelations() {
        const assets = [
            ...Object.keys(this.data.indices),
            ...Object.keys(this.data.commodities),
            ...Object.keys(this.data.forex)
        ];

        this.correlationMatrix = assets.map(asset1 => {
            return assets.map(asset2 => {
                return this.calculateCorrelation(
                    this.getAssetHistory(asset1),
                    this.getAssetHistory(asset2)
                );
            });
        });
    }

    getAssetHistory(asset) {
        const data = 
            this.data.indices[asset]?.history ||
            this.data.commodities[asset]?.history ||
            this.data.forex[asset]?.history;
        
        return data ? data.map(item => item.value) : [];
    }

    calculateCorrelation(array1, array2) {
        if (array1.length !== array2.length || array1.length === 0) return 0;

        const mean1 = array1.reduce((a, b) => a + b) / array1.length;
        const mean2 = array2.reduce((a, b) => a + b) / array2.length;

        const variance1 = array1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0);
        const variance2 = array2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0);

        const covariance = array1.reduce((a, b, i) => a + (b - mean1) * (array2[i] - mean2), 0);

        return covariance / Math.sqrt(variance1 * variance2);
    }

    updateCorrelationMatrix() {
        const container = document.getElementById('correlation-matrix');
        if (!container || !this.correlationMatrix.length) return;

        const assets = [
            ...Object.keys(this.data.indices),
            ...Object.keys(this.data.commodities),
            ...Object.keys(this.data.forex)
        ];

        container.innerHTML = `
            <div class="correlation-grid">
                ${this.correlationMatrix.map((row, i) => `
                    <div class="correlation-row">
                        ${row.map((correlation, j) => `
                            <div class="correlation-cell" style="background: ${this.getCorrelationColor(correlation)}">
                                <span class="correlation-value">${correlation.toFixed(2)}</span>
                                <span class="correlation-assets">${assets[i]} vs ${assets[j]}</span>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        `;
    }

    getCorrelationColor(correlation) {
        const value = Math.abs(correlation);
        const alpha = Math.min(value, 1);
        return `rgba(${correlation >= 0 ? '76, 175, 80' : '244, 67, 54'}, ${alpha})`;
    }

    async generateMarketInsights() {
        const insights = [];

        // Market Trends Analysis
        insights.push({
            icon: 'fa-chart-line',
            title: 'Market Trends',
            content: this.analyzeTrends()
        });

        // Cross-Asset Correlations
        insights.push({
            icon: 'fa-project-diagram',
            title: 'Cross-Market Correlations',
            content: this.analyzeCorrelations()
        });

        // Market Conditions
        insights.push({
            icon: 'fa-thermometer-half',
            title: 'Market Conditions',
            content: this.analyzeMarketConditions()
        });

        // Update insights UI
        const container = document.getElementById('trad-markets-ai-insights');
        if (container) {
            container.innerHTML = insights.map(insight => `
                <div class="insight-card">
                    <div class="insight-header">
                        <i class="fas ${insight.icon}"></i>
                        <span>${insight.title}</span>
                    </div>
                    <div class="insight-body">
                        <p>${insight.content}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    analyzeTrends() {
        const trends = [];
        
        // Analyze indices
        for (const [key, data] of Object.entries(this.data.indices)) {
            if (data) {
                const trend = parseFloat(data.changePercent);
                const strength = Math.abs(trend);
                const direction = trend >= 0 ? 'bullish' : 'bearish';
                trends.push(`${this.formatAssetName(key)} is showing ${direction} momentum (${trend.toFixed(2)}%)`);
            }
        }

        // Analyze correlations between markets
        const significantCorrelations = this.findSignificantCorrelations();
        if (significantCorrelations.length > 0) {
            trends.push("Notable correlations: " + significantCorrelations.join(", "));
        }

        return trends.join(". ");
    }

    analyzeCorrelations() {
        const correlations = this.findSignificantCorrelations();
        if (correlations.length === 0) return "No significant correlations detected at this time.";
        return `Key correlations: ${correlations.join(". ")}`;
    }

    analyzeMarketConditions() {
        const conditions = [];
        
        // Analyze overall market sentiment
        const indexPerformance = Object.values(this.data.indices)
            .filter(data => data)
            .map(data => parseFloat(data.changePercent));
        
        const avgPerformance = indexPerformance.reduce((a, b) => a + b, 0) / indexPerformance.length;
        
        conditions.push(`Overall market sentiment is ${this.getMarketSentiment(avgPerformance)}`);
        
        // Add commodity insights
        const goldChange = this.data.commodities.gold?.changePercent;
        if (goldChange) {
            conditions.push(`Gold ${parseFloat(goldChange) >= 0 ? 'rising' : 'falling'} indicates ${parseFloat(goldChange) >= 0 ? 'risk-off' : 'risk-on'} sentiment`);
        }

        return conditions.join(". ");
    }

    findSignificantCorrelations() {
        const significantCorrelations = [];
        const assets = [
            ...Object.keys(this.data.indices),
            ...Object.keys(this.data.commodities),
            ...Object.keys(this.data.forex)
        ];

        this.correlationMatrix.forEach((row, i) => {
            row.forEach((correlation, j) => {
                if (i < j && Math.abs(correlation) > 0.7) {
                    significantCorrelations.push(
                        `${this.formatAssetName(assets[i])} and ${this.formatAssetName(assets[j])} are ${correlation > 0 ? 'positively' : 'negatively'} correlated (${(correlation * 100).toFixed(1)}%)`
                    );
                }
            });
        });

        return significantCorrelations;
    }

    formatAssetName(key) {
        const names = {
            'sp500': 'S&P 500',
            'nasdaq': 'NASDAQ',
            'djia': 'Dow Jones',
            'gold': 'Gold',
            'silver': 'Silver',
            'oil': 'Crude Oil',
            'eurusd': 'EUR/USD',
            'gbpusd': 'GBP/USD',
            'usdjpy': 'USD/JPY'
        };
        return names[key] || key;
    }

    getMarketSentiment(performance) {
        if (performance > 2) return 'strongly bullish';
        if (performance > 0.5) return 'moderately bullish';
        if (performance > -0.5) return 'neutral';
        if (performance > -2) return 'moderately bearish';
        return 'strongly bearish';
    }

    startDataUpdates() {
        // Update data every minute
        setInterval(() => this.fetchAllData(), 60000);
    }

    updateTimeframe(timeframe) {
        this.timeframe = timeframe;
        this.fetchAllData();
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const tradMarketsHandler = new TraditionalMarkets();
    tradMarketsHandler.initialize();

    // Mobile Navigation Handler
    const navToggle = document.querySelector('.nav-toggle');
    const scrollNav = document.querySelector('.scroll-nav');
    
    if (navToggle && scrollNav) {
        navToggle.addEventListener('click', () => {
            scrollNav.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close navigation when clicking outside
        document.addEventListener('click', (e) => {
            if (!scrollNav.contains(e.target) && !navToggle.contains(e.target)) {
                scrollNav.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });

        // Close navigation when clicking a link
        const navLinks = scrollNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                scrollNav.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }
});
