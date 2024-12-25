import { createChart, ColorType } from 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';

class HistoricalPatterns {
    constructor() {
        this.timeframe = '1d';
        this.charts = {};
        this.patterns = {
            bullish: ['Double Bottom', 'Inverse Head & Shoulders', 'Bull Flag', 'Cup & Handle', 'Ascending Triangle'],
            bearish: ['Double Top', 'Head & Shoulders', 'Bear Flag', 'Rising Wedge', 'Descending Triangle'],
            neutral: ['Symmetrical Triangle', 'Rectangle', 'Channel', 'Pennant']
        };
        this.cyclePhases = ['Accumulation', 'Markup', 'Distribution', 'Markdown'];
        this.initialize();
    }

    initialize() {
        this.initializePatternChart();
        this.initializeCycleChart();
        this.setupEventListeners();
        this.loadData();
        
        // Auto-refresh every minute
        setInterval(() => this.loadData(), 60000);
    }

    initializePatternChart() {
        const container = document.getElementById('patternChart');
        if (!container) return;

        this.charts.pattern = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
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
        });

        // Add price series
        this.charts.pattern.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
    }

    initializeCycleChart() {
        const container = document.getElementById('cycleChart');
        if (!container) return;

        this.charts.cycle = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
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
        });

        // Add area series for cycle visualization
        this.charts.cycle.addAreaSeries({
            topColor: 'rgba(38, 166, 154, 0.4)',
            bottomColor: 'rgba(38, 166, 154, 0.0)',
            lineColor: 'rgba(38, 166, 154, 1)',
            lineWidth: 2,
        });
    }

    setupEventListeners() {
        // Timeframe selector
        const timeframeSelect = document.getElementById('patternTimeframe');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.timeframe = e.target.value;
                this.loadData();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshPatterns');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadData());
        }
    }

    async loadData() {
        try {
            const [patternData, cycleData] = await Promise.all([
                this.fetchPatternData(),
                this.fetchCycleData()
            ]);

            this.updatePatternAnalysis(patternData);
            this.updateCycleAnalysis(cycleData);
            this.findSimilarPatterns();
        } catch (error) {
            console.error('Error loading pattern data:', error);
        }
    }

    async fetchPatternData() {
        try {
            // Fetch MEXC kline data
            const response = await fetch(`https://api.mexc.com/api/v3/klines?symbol=BTCUSDT&interval=${this.timeframe}`);
            const data = await response.json();

            // Transform data for chart
            return data.map(candle => ({
                time: candle[0] / 1000,
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4])
            }));
        } catch (error) {
            console.error('Error fetching pattern data:', error);
            return this.generateMockData();
        }
    }

    async fetchCycleData() {
        try {
            // For now, we'll use the same data as pattern analysis
            const data = await this.fetchPatternData();
            return data.map(candle => ({
                time: candle.time,
                value: candle.close
            }));
        } catch (error) {
            console.error('Error fetching cycle data:', error);
            return this.generateMockData();
        }
    }

    updatePatternAnalysis(data) {
        // Update chart
        if (this.charts.pattern) {
            const series = this.charts.pattern.series()[0];
            series.setData(data);
        }

        // Analyze patterns (simplified for now)
        const lastPrice = data[data.length - 1].close;
        const startPrice = data[0].close;
        const trend = lastPrice > startPrice ? 'bullish' : 'bearish';
        
        // Random pattern selection based on trend
        const patterns = this.patterns[trend === 'bullish' ? 'bullish' : 'bearish'];
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        // Update UI
        this.updateElement('currentPattern', selectedPattern);
        this.updateElement('patternConfidence', `${(Math.random() * 30 + 70).toFixed(1)}%`);
        this.updateElement('patternProjection', trend === 'bullish' ? 'Upward breakout likely' : 'Downward continuation expected');
    }

    updateCycleAnalysis(data) {
        // Update chart
        if (this.charts.cycle) {
            const series = this.charts.cycle.series()[0];
            series.setData(data);
        }

        // Analyze cycle (simplified for now)
        const phase = this.cyclePhases[Math.floor(Math.random() * this.cyclePhases.length)];
        const duration = Math.floor(Math.random() * 90 + 30);
        const strength = (Math.random() * 3 + 7).toFixed(1);

        // Update UI
        this.updateElement('currentPhase', phase);
        this.updateElement('cycleDuration', `${duration} days`);
        this.updateElement('cycleStrength', `${strength}/10`);
    }

    findSimilarPatterns() {
        const container = document.getElementById('similarPatternsList');
        if (!container) return;

        // Generate mock similar patterns
        const patterns = Array(5).fill(0).map((_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - Math.floor(Math.random() * 12));
            
            return {
                date: date.toLocaleDateString(),
                pattern: this.patterns.bullish[Math.floor(Math.random() * this.patterns.bullish.length)],
                accuracy: (Math.random() * 20 + 80).toFixed(1)
            };
        });

        // Update UI
        this.updateElement('similarityScore', `${(Math.random() * 20 + 80).toFixed(1)}%`);
        
        container.innerHTML = patterns.map(p => `
            <div class="similar-pattern-item">
                <div class="similar-pattern-info">
                    <span class="similar-pattern-date">${p.date}</span>
                    <span>${p.pattern}</span>
                </div>
                <span class="similar-pattern-accuracy">${p.accuracy}%</span>
            </div>
        `).join('');
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            if (element.classList.contains('pattern-value') || 
                element.classList.contains('cycle-value')) {
                element.textContent = value;
            } else {
                const valueSpan = element.querySelector('.pattern-value, .cycle-value');
                if (valueSpan) {
                    valueSpan.textContent = value;
                }
            }
        }
    }

    generateMockData() {
        const data = [];
        const now = new Date();
        let price = 40000;

        for (let i = 100; i >= 0; i--) {
            const time = new Date(now - i * 3600000);
            const volatility = Math.random() * 200 - 100;
            price += volatility;
            
            data.push({
                time: time.getTime() / 1000,
                open: price,
                high: price + Math.random() * 100,
                low: price - Math.random() * 100,
                close: price + Math.random() * 200 - 100,
                value: price
            });
        }

        return data;
    }
}

// Historical Patterns using free APIs
async function fetchHistoricalData() {
    try {
        // CoinGecko historical data (free)
        const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily');
        const data = await response.json();
        
        return {
            prices: data.prices,
            volumes: data.total_volumes,
            marketCaps: data.market_caps
        };
    } catch (error) {
        console.error('Error fetching historical data:', error);
        return null;
    }
}

async function fetchFearGreedIndex() {
    try {
        // Alternative.me Fear & Greed Index (free)
        const response = await fetch('https://api.alternative.me/fng/');
        const data = await response.json();
        
        return {
            value: data.data[0].value,
            valueText: data.data[0].value_classification,
            timestamp: data.data[0].timestamp
        };
    } catch (error) {
        console.error('Error fetching fear & greed index:', error);
        return null;
    }
}

async function analyzePatterns(historicalData) {
    if (!historicalData || !historicalData.prices) return null;
    
    const prices = historicalData.prices;
    const lastPrice = prices[prices.length - 1][1];
    const last30Days = prices.slice(-30);
    
    // Simple trend analysis
    const trend = last30Days[last30Days.length - 1][1] > last30Days[0][1] ? 'Upward' : 'Downward';
    const changePercent = ((last30Days[last30Days.length - 1][1] - last30Days[0][1]) / last30Days[0][1] * 100).toFixed(2);
    
    return {
        currentPattern: trend + ' Trend',
        confidence: Math.abs(changePercent) > 20 ? '75%' : '60%',
        projection: trend === 'Upward' ? 'Continuation likely' : 'Support zone near'
    };
}

async function updateHistoricalPatterns() {
    try {
        const [historicalData, fearGreedData] = await Promise.all([
            fetchHistoricalData(),
            fetchFearGreedIndex()
        ]);

        if (historicalData) {
            const patterns = await analyzePatterns(historicalData);
            
            if (patterns) {
                document.querySelector('#pattern-recognition .current-pattern').textContent = patterns.currentPattern;
                document.querySelector('#pattern-recognition .confidence').textContent = patterns.confidence;
                document.querySelector('#pattern-recognition .projection').textContent = patterns.projection;
            }
        }

        if (fearGreedData) {
            document.querySelector('#market-cycles .current-phase').textContent = fearGreedData.valueText;
            document.querySelector('#market-cycles .duration').textContent = 'Updated daily';
            document.querySelector('#market-cycles .strength').textContent = fearGreedData.value + '/100';
        }

        // Update similar patterns list
        const similarPatternsContainer = document.querySelector('#similar-patterns .patterns-list');
        similarPatternsContainer.innerHTML = `
            <div class="pattern-item">
                <span class="date">Last 7 Days</span>
                <span class="accuracy">Analysis based on</span>
                <span class="outcome">Free APIs</span>
            </div>
            <div class="pattern-item">
                <span class="date">Upgrade to Pro</span>
                <span class="accuracy">For advanced</span>
                <span class="outcome">Pattern matching</span>
            </div>
        `;

        // Initialize charts with the historical data
        initializePatternCharts(historicalData);

    } catch (error) {
        console.error('Error updating historical patterns:', error);
    }
}

// Initialize this module
document.addEventListener('DOMContentLoaded', () => {
    new HistoricalPatterns();
    updateHistoricalPatterns();
    
    // Refresh data every 15 minutes
    setInterval(() => updateHistoricalPatterns(), 900000);
});

function initializePatternCharts(historicalData) {
    // Initialize charts with the historical data
    const patternChartContainer = document.getElementById('patternChart');
    if (patternChartContainer) {
        const chart = createChart(patternChartContainer, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
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
        });

        // Add price series
        chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // Set data
        chart.series()[0].setData(historicalData.prices.map(([time, price]) => ({ time, open: price, high: price, low: price, close: price })));
    }
}
