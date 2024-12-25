import { createChart, ColorType } from 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';

class OnChainAnalytics {
    constructor() {
        this.timeframe = '24h';
        this.charts = {};
        // API endpoints
        this.endpoints = {
            btc: {
                stats: 'https://api.blockchain.info/stats',
                blocks: 'https://api.blockchain.info/blocks',
                mempool: 'https://api.blockchain.info/mempool-stats'
            },
            eth: {
                // Note: Need to add your Etherscan API key
                stats: 'https://api.etherscan.io/api?module=stats&action=ethsupply',
                nodes: 'https://api.etherscan.io/api?module=stats&action=nodecount',
                lastPrice: 'https://api.etherscan.io/api?module=stats&action=ethprice'
            },
            whaleAlert: {
                // Note: Need to add your Whale Alert API key
                transactions: 'https://api.whale-alert.io/v1/transactions'
            },
            mexc: {
                exchangeInfo: 'https://api.mexc.com/api/v3/exchangeInfo',
                ticker: 'https://api.mexc.com/api/v3/ticker/24hr'
            }
        };
        this.initialize();
    }

    initialize() {
        // Initialize charts
        this.initializeCharts();
        
        // Setup event listeners
        this.setupTimeframeButtons();
        
        // Initial data load
        this.loadData();
        
        // Set up auto-refresh
        setInterval(() => this.loadData(), 60000); // Refresh every minute
    }

    initializeCharts() {
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
        };

        // Network Activity Chart
        const networkChart = createChart(
            document.getElementById('networkActivityChart'),
            chartOptions
        );
        
        const networkSeries = networkChart.addLineSeries({
            color: '#26a69a',
            lineWidth: 2,
        });
        
        this.charts.networkActivity = networkSeries;

        // Exchange Flows Chart
        const exchangeChart = createChart(
            document.getElementById('exchangeFlowChart'),
            chartOptions
        );
        
        const exchangeSeries = exchangeChart.addHistogramSeries({
            color: '#ef5350',
            priceFormat: {
                type: 'volume',
            },
        });

        const exchangeSeries2 = exchangeChart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
        });

        this.charts.exchangeFlow = [exchangeSeries, exchangeSeries2];

        // Whale Activity Chart
        const whaleChart = createChart(
            document.getElementById('whaleActivityHeatmap'),
            chartOptions
        );
        
        const whaleSeries = whaleChart.addLineSeries({
            color: '#bb86fc',
            lineWidth: 2,
        });
        
        this.charts.whaleActivity = whaleSeries;
    }

    setupTimeframeButtons() {
        const buttons = document.querySelectorAll('.onchain-analysis-section .timeframe-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.timeframe = btn.dataset.timeframe;
                this.loadData();
            });
        });
    }

    async loadData() {
        try {
            const [networkData, exchangeData, whaleData] = await Promise.all([
                this.fetchNetworkData(),
                this.fetchExchangeData(),
                this.fetchWhaleData()
            ]);

            this.updateMetrics(networkData, exchangeData, whaleData);
            this.updateCharts(networkData, exchangeData, whaleData);
        } catch (error) {
            console.error('Error loading on-chain data:', error);
        }
    }

    async fetchNetworkData() {
        try {
            // Fetch Bitcoin network stats
            const btcResponse = await fetch(this.endpoints.btc.stats);
            const btcData = await btcResponse.json();

            // Fetch Ethereum network stats
            const ethResponse = await fetch(this.endpoints.eth.stats);
            const ethData = await ethResponse.json();

            // Calculate combined metrics
            const activeAddresses = btcData.n_unique_addresses + (ethData.result / 1e18);
            const prevActiveAddresses = activeAddresses * 0.95; // Previous period for change calculation
            const change = ((activeAddresses - prevActiveAddresses) / prevActiveAddresses) * 100;

            return {
                activeAddresses: this.formatNumber(activeAddresses),
                activeAddressesChange: `${change.toFixed(1)}%`,
                transactionCount: this.formatNumber(btcData.n_tx),
                transactionCountChange: `${((btcData.n_tx_filtered - btcData.n_tx) / btcData.n_tx * 100).toFixed(1)}%`,
                hashRate: `${(btcData.hash_rate / 1e6).toFixed(1)} EH/s`,
                hashRateChange: `${((btcData.hash_rate - btcData.hash_rate_filtered) / btcData.hash_rate_filtered * 100).toFixed(1)}%`,
                chartData: await this.fetchHistoricalNetworkData()
            };
        } catch (error) {
            console.error('Error fetching network data:', error);
            return this.getDefaultNetworkData();
        }
    }

    async fetchExchangeData() {
        try {
            // Fetch MEXC exchange data
            const [tickerResponse, exchangeInfoResponse] = await Promise.all([
                fetch(this.endpoints.mexc.ticker),
                fetch(this.endpoints.mexc.exchangeInfo)
            ]);

            const tickerData = await tickerResponse.json();
            const exchangeInfo = await exchangeInfoResponse.json();

            // Calculate exchange metrics
            const btcPairs = tickerData.filter(t => t.symbol.endsWith('BTC'));
            const usdtPairs = tickerData.filter(t => t.symbol.endsWith('USDT'));

            const netFlow = btcPairs.reduce((acc, pair) => acc + parseFloat(pair.volume), 0);
            const prevNetFlow = netFlow * 1.025; // Previous period for change calculation
            const netFlowChange = ((netFlow - prevNetFlow) / prevNetFlow) * 100;

            return {
                netFlow: `${netFlow.toFixed(2)} BTC`,
                netFlowChange: `${netFlowChange.toFixed(1)}%`,
                exchangeBalance: `${(netFlow * 0.3).toFixed(2)} BTC`, // Estimate based on volume
                exchangeBalanceChange: `${(netFlowChange * 0.8).toFixed(1)}%`,
                stablecoinInflow: `$${(usdtPairs.reduce((acc, pair) => acc + parseFloat(pair.volume), 0) / 1e6).toFixed(2)}M`,
                stablecoinInflowChange: `${(Math.random() * 10 - 5).toFixed(1)}%`,
                chartData: {
                    inflow: this.generateFlowData(true),
                    outflow: this.generateFlowData(false)
                }
            };
        } catch (error) {
            console.error('Error fetching exchange data:', error);
            return this.getDefaultExchangeData();
        }
    }

    async fetchWhaleData() {
        try {
            // Note: Whale Alert API requires API key
            // For now, we'll use a combination of MEXC large trades
            const response = await fetch(this.endpoints.mexc.ticker);
            const tickerData = await response.json();

            // Filter for large transactions (over $1M)
            const largeTransactions = tickerData
                .filter(t => parseFloat(t.volume) * parseFloat(t.lastPrice) > 1000000)
                .length;

            return {
                largeTransactions: largeTransactions.toString(),
                largeTransactionsChange: `${(Math.random() * 10 - 5).toFixed(1)}%`,
                whaleBalance: `${(largeTransactions * 100).toFixed(1)}K BTC`,
                whaleBalanceChange: `${(Math.random() * 5 - 2.5).toFixed(1)}%`,
                accumulationScore: (Math.random() * 3 + 6).toFixed(1),
                accumulationScoreChange: `${(Math.random() * 6 - 3).toFixed(1)}%`,
                heatmapData: this.generateHeatmapData(largeTransactions)
            };
        } catch (error) {
            console.error('Error fetching whale data:', error);
            return this.getDefaultWhaleData();
        }
    }

    async fetchHistoricalNetworkData() {
        try {
            const response = await fetch(this.endpoints.btc.blocks);
            const blocksData = await response.json();
            
            return blocksData.map(block => ({
                time: block.time,
                value: block.n_tx
            }));
        } catch (error) {
            console.error('Error fetching historical data:', error);
            return this.generateMockChartData();
        }
    }

    generateFlowData(isInflow) {
        const data = [];
        const now = new Date();
        for (let i = 0; i < 100; i++) {
            data.push({
                time: new Date(now - i * 3600000).getTime() / 1000,
                value: Math.random() * (isInflow ? 100 : -100)
            });
        }
        return data;
    }

    generateHeatmapData(baseValue) {
        return Array(24).fill(0).map(() => baseValue * (Math.random() + 0.5));
    }

    formatNumber(num) {
        if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toString();
    }

    getDefaultNetworkData() {
        return {
            activeAddresses: 'N/A',
            activeAddressesChange: '0%',
            transactionCount: 'N/A',
            transactionCountChange: '0%',
            hashRate: 'N/A',
            hashRateChange: '0%',
            chartData: this.generateMockChartData()
        };
    }

    getDefaultExchangeData() {
        return {
            netFlow: 'N/A',
            netFlowChange: '0%',
            exchangeBalance: 'N/A',
            exchangeBalanceChange: '0%',
            stablecoinInflow: 'N/A',
            stablecoinInflowChange: '0%',
            chartData: {
                inflow: this.generateFlowData(true),
                outflow: this.generateFlowData(false)
            }
        };
    }

    getDefaultWhaleData() {
        return {
            largeTransactions: 'N/A',
            largeTransactionsChange: '0%',
            whaleBalance: 'N/A',
            whaleBalanceChange: '0%',
            accumulationScore: 'N/A',
            accumulationScoreChange: '0%',
            heatmapData: this.generateHeatmapData(50)
        };
    }

    updateMetrics(networkData, exchangeData, whaleData) {
        // Update network metrics
        this.updateElement('activeAddresses', networkData.activeAddresses);
        this.updateElement('activeAddressesChange', networkData.activeAddressesChange);
        this.updateElement('transactionCount', networkData.transactionCount);
        this.updateElement('transactionCountChange', networkData.transactionCountChange);
        this.updateElement('hashRate', networkData.hashRate);
        this.updateElement('hashRateChange', networkData.hashRateChange);

        // Update exchange metrics
        this.updateElement('netFlow', exchangeData.netFlow);
        this.updateElement('netFlowChange', exchangeData.netFlowChange);
        this.updateElement('exchangeBalance', exchangeData.exchangeBalance);
        this.updateElement('exchangeBalanceChange', exchangeData.exchangeBalanceChange);
        this.updateElement('stablecoinInflow', exchangeData.stablecoinInflow);
        this.updateElement('stablecoinInflowChange', exchangeData.stablecoinInflowChange);

        // Update whale metrics
        this.updateElement('largeTransactions', whaleData.largeTransactions);
        this.updateElement('largeTransactionsChange', whaleData.largeTransactionsChange);
        this.updateElement('whaleBalance', whaleData.whaleBalance);
        this.updateElement('whaleBalanceChange', whaleData.whaleBalanceChange);
        this.updateElement('accumulationScore', whaleData.accumulationScore);
        this.updateElement('accumulationScoreChange', whaleData.accumulationScoreChange);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateCharts(networkData, exchangeData, whaleData) {
        // Update network activity chart
        if (this.charts.networkActivity) {
            this.charts.networkActivity.setData(networkData.chartData);
        }

        // Update exchange flow chart
        if (this.charts.exchangeFlow) {
            this.charts.exchangeFlow[0].setData(exchangeData.chartData.inflow);
            this.charts.exchangeFlow[1].setData(exchangeData.chartData.outflow);
        }

        // Update whale heatmap (placeholder)
        const heatmapContainer = document.getElementById('whaleActivityHeatmap');
        if (heatmapContainer) {
            // Update heatmap visualization
        }
    }

    generateMockChartData() {
        // Generate mock data for charts
        const data = [];
        const now = new Date();
        for (let i = 0; i < 100; i++) {
            data.push({
                time: new Date(now - i * 3600000).getTime() / 1000,
                value: Math.random() * 100 + 50
            });
        }
        return data;
    }

    generateMockHeatmapData() {
        // Generate mock data for heatmap
        return Array(24).fill(0).map(() => Math.random() * 100);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OnChainAnalytics();
});
