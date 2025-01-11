import { createChart, ColorType } from 'lightweight-charts';

class MultiAssetChart {
    constructor() {
        this.chart = null;
        this.series = {};
        this.timeframe = '4h';
        this.symbols = {
            crypto: ['BTCUSDT', 'ETHUSDT'],
            traditional: ['^GOLD', '^GSPC', '^IXIC']  // Gold, S&P 500, NASDAQ
        };
        this.colors = {
            BTCUSDT: '#F7931A',
            ETHUSDT: '#62688F',
            '^GOLD': '#FFD700',
            '^GSPC': '#4CAF50',
            '^IXIC': '#2196F3'
        };
        this.initialize();
    }

    initialize() {
        const container = document.getElementById('multiAssetChart');
        
        this.chart = createChart(container, {
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

        // Initialize series
        Object.entries(this.symbols).forEach(([type, symbols]) => {
            symbols.forEach(symbol => {
                this.series[symbol] = this.chart.addLineSeries({
                    color: this.colors[symbol],
                    lineWidth: 2,
                    priceFormat: {
                        type: 'price',
                        precision: type === 'crypto' ? 2 : 1,
                    },
                });
            });
        });

        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.timeframe-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.timeframe = btn.dataset.timeframe;
                this.loadData();
            });
        });
    }

    async loadData() {
        try {
            // Load crypto data from Bybit
            for (const symbol of this.symbols.crypto) {
                const response = await fetch(`/api/bybit/kline?symbol=${symbol}&interval=${this.timeframe}`);
                const data = await response.json();
                
                const formattedData = data.map(candle => ({
                    time: candle.timestamp / 1000,
                    value: parseFloat(candle.close),
                }));
                
                this.series[symbol].setData(this.normalizeData(formattedData));
            }

            // Load traditional market data from Yahoo Finance
            for (const symbol of this.symbols.traditional) {
                const response = await fetch(`/api/yahoo/history?symbol=${symbol}&interval=${this.timeframe}`);
                const data = await response.json();
                
                const formattedData = data.map(price => ({
                    time: new Date(price.timestamp).getTime() / 1000,
                    value: price.close,
                }));
                
                this.series[symbol].setData(this.normalizeData(formattedData));
            }

            this.updateCorrelationAnalysis();
        } catch (error) {
            console.error('Error loading multi-asset data:', error);
        }
    }

    normalizeData(data) {
        const firstValue = data[0].value;
        return data.map(item => ({
            time: item.time,
            value: (item.value / firstValue - 1) * 100  // Percentage change from first value
        }));
    }

    async updateCorrelationAnalysis() {
        try {
            const response = await fetch('/api/correlation-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timeframe: this.timeframe,
                    data: Object.entries(this.series).map(([symbol, series]) => ({
                        symbol,
                        data: series.data()
                    }))
                })
            });

            const analysis = await response.json();
            document.getElementById('correlationInsight').innerHTML = analysis.insight;
        } catch (error) {
            console.error('Error updating correlation analysis:', error);
        }
    }
}

// Initialize the chart when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MultiAssetChart();
});
