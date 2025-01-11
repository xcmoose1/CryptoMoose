// Market Visualization Handler
class MarketVisualization {
    constructor(chartInstance, htxHandler) {
        this.chart = chartInstance;
        this.htxHandler = htxHandler;
        this.currentSymbol = 'BTCUSDT';
        this.volumeBarColors = {
            up: 'rgba(0, 255, 127, 0.3)',
            down: 'rgba(255, 82, 82, 0.3)'
        };
        this.retryDelay = 1000;
        this.maxRetries = 3;
        this.updateInterval = 30000; // 30 seconds
    }

    init() {
        this.setupCorrelationMatrix();
        this.setupOrderBookHeatmap();
        this.addVolumeToChart();
        this.startUpdates();
    }

    setupCorrelationMatrix() {
        const correlationDiv = document.getElementById('correlationMatrix');
        this.correlationMatrix = document.createElement('div');
        this.correlationMatrix.className = 'correlation-grid';
        correlationDiv.appendChild(this.correlationMatrix);
        this.updateCorrelationMatrix();
    }

    async updateCorrelationMatrix() {
        const assets = ['BTC', 'SPY', 'QQQ', 'GLD'];
        const correlations = await this.htxHandler.getCorrelations(assets);
        
        this.correlationMatrix.innerHTML = '';
        
        // Create header row
        const headerRow = document.createElement('div');
        headerRow.className = 'correlation-row';
        headerRow.innerHTML = '<div class="correlation-cell"></div>' + 
            assets.map(asset => `<div class="correlation-cell">${asset}</div>`).join('');
        this.correlationMatrix.appendChild(headerRow);

        // Create correlation rows
        assets.forEach(asset1 => {
            const row = document.createElement('div');
            row.className = 'correlation-row';
            
            // Add row header
            row.innerHTML = `<div class="correlation-cell">${asset1}</div>`;
            
            // Add correlation values
            assets.forEach(asset2 => {
                const correlation = correlations[`${asset1}-${asset2}`] || 1;
                const cell = document.createElement('div');
                cell.className = 'correlation-cell';
                cell.style.backgroundColor = this.getCorrelationColor(correlation);
                cell.textContent = correlation.toFixed(2);
                row.appendChild(cell);
            });
            
            this.correlationMatrix.appendChild(row);
        });
    }

    getCorrelationColor(correlation) {
        const value = Math.abs(correlation);
        const hue = correlation > 0 ? 120 : 0; // Green for positive, Red for negative
        return `hsla(${hue}, 80%, 50%, ${value})`;
    }

    setupOrderBookHeatmap() {
        this.orderBookContainer = document.getElementById('orderBookHeatmap');
        this.updateOrderBook();
    }

    async updateOrderBook() {
        const orderBook = await this.htxHandler.getOrderBook(this.currentSymbol);
        const maxVolume = Math.max(
            ...orderBook.bids.map(bid => parseFloat(bid[1])),
            ...orderBook.asks.map(ask => parseFloat(ask[1]))
        );

        this.orderBookContainer.innerHTML = `
            <div class="orderbook-side asks">
                ${this.createOrderBookRows(orderBook.asks.slice(0, 10), maxVolume, false)}
            </div>
            <div class="orderbook-side bids">
                ${this.createOrderBookRows(orderBook.bids.slice(0, 10), maxVolume, true)}
            </div>
        `;
    }

    createOrderBookRows(orders, maxVolume, isBids) {
        return orders.map(([price, volume]) => {
            const volumePercentage = (parseFloat(volume) / maxVolume) * 100;
            const backgroundColor = isBids ? 
                `rgba(0, 255, 127, ${volumePercentage / 100})` : 
                `rgba(255, 82, 82, ${volumePercentage / 100})`;
            
            return `
                <div class="orderbook-row" style="background: linear-gradient(to left, ${backgroundColor} ${volumePercentage}%, transparent ${volumePercentage}%)">
                    <span class="price">${parseFloat(price).toFixed(2)}</span>
                    <span class="volume">${parseFloat(volume).toFixed(4)}</span>
                </div>
            `;
        }).join('');
    }

    addVolumeToChart() {
        const volumeDataset = {
            label: 'Volume',
            data: [],
            type: 'bar',
            backgroundColor: this.volumeBarColors.up,
            yAxisID: 'volume',
            order: 1
        };

        this.chart.data.datasets.push(volumeDataset);
        
        // Add volume scale
        this.chart.options.scales.volume = {
            position: 'right',
            grid: {
                drawOnChartArea: false
            },
            ticks: {
                callback: value => `${(value / 1000000).toFixed(1)}M`
            }
        };

        this.chart.update();
    }

    startUpdates() {
        // Update correlation matrix every 5 minutes
        setInterval(() => this.updateCorrelationMatrix(), 5 * 60 * 1000);
        
        // Update order book every 5 seconds
        setInterval(() => this.updateOrderBook(), 5000);
    }
}

// Multi-Asset Analysis Class
class MultiAssetAnalysis {
    constructor() {
        this.chart = null;
        this.timeframe = '1d';  // Default to daily
        this.assets = {
            crypto: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'],
            defi: ['UNIUSDT', 'AAVEUSDT', 'MKRUSDT']
        };
        this.colors = {
            'BTCUSDT': '#F7931A',   // Bitcoin orange
            'ETHUSDT': '#627EEA',    // Ethereum blue
            'BNBUSDT': '#F3BA2F',    // Binance yellow
            'SOLUSDT': '#14F195',    // Solana green
            'DOGEUSDT': '#BA9F33',   // Dogecoin gold
            'UNIUSDT': '#FF007A',    // Uniswap pink
            'AAVEUSDT': '#B6509E',   // Aave purple
            'MKRUSDT': '#1AAB9B'     // Maker green
        };
        this.series = [];
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        await this.updateChart();
        // Update every 5 minutes
        setInterval(() => this.updateChart(), 5 * 60 * 1000);
    }

    setupEventListeners() {
        document.querySelectorAll('.timeframe-selector .timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const active = document.querySelector('.timeframe-selector .active');
                if (active) active.classList.remove('active');
                btn.classList.add('active');
                this.timeframe = btn.dataset.timeframe;
                this.updateChart();
            });
        });
    }

    async fetchData(symbol, timeframe) {
        try {
            console.log(`Fetching data for ${symbol} with timeframe ${timeframe}`);
            const response = await fetch(`/api/mexc/klines?symbol=${symbol}&interval=${timeframe}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Got ${data.length} data points for ${symbol}`);

            return data.map(candle => ({
                time: candle[0] / 1000,  // Convert milliseconds to seconds
                value: parseFloat(candle[4])  // Use closing price
            }));
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            return [];
        }
    }

    normalizeData(data) {
        if (!data || data.length === 0) return [];
        
        const baseValue = data[0].value;
        if (baseValue === 0) return data;
        
        return data.map(item => ({
            time: item.time,
            value: ((item.value / baseValue - 1) * 100).toFixed(2)
        }));
    }

    async updateChart() {
        try {
            // Clear existing series
            if (this.chart) {
                this.series.forEach(series => this.chart.removeSeries(series));
                this.series = [];
            }

            // Create chart if it doesn't exist
            if (!this.chart) {
                const chartProperties = {
                    width: 1000,
                    height: 600,
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                    },
                    layout: {
                        background: { color: 'transparent' },
                        textColor: '#d1d4dc',
                    },
                    grid: {
                        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
                    },
                };

                const container = document.getElementById('multiAssetChart');
                if (!container) {
                    throw new Error('Chart container not found');
                }

                this.chart = LightweightCharts.createChart(container, chartProperties);
            }

            // Fetch and add data for all assets
            const allAssets = [...this.assets.crypto, ...this.assets.defi];
            for (const symbol of allAssets) {
                const data = await this.fetchData(symbol, this.timeframe);
                if (data.length > 0) {
                    const normalizedData = this.normalizeData(data);
                    
                    const series = this.chart.addLineSeries({
                        color: this.colors[symbol],
                        lineWidth: 2,
                        title: symbol.replace('USDT', '')
                    });
                    
                    series.setData(normalizedData);
                    this.series.push(series);
                }
            }

            // Fit content
            this.chart.timeScale().fitContent();

        } catch (error) {
            console.error('Error updating chart:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.multiAssetAnalysis = new MultiAssetAnalysis();
});
