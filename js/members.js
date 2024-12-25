import BybitDataHandler from './bybit-data.js';
import MarketAnalysis from './market-analysis.js';
import AIAnalysis from './ai-analysis.js';
import MarketMetrics from './market-metrics.js';
import TraditionalMarketsHandler from './traditional-markets.js';
import MarketVisualization from './market-visualization.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize data handlers
        const bybitHandler = new BybitDataHandler();
        const marketAnalysis = new MarketAnalysis();
        const aiAnalysis = new AIAnalysis();
        const marketMetrics = new MarketMetrics();
        const tradMarketsHandler = new TraditionalMarketsHandler();
        
        // Initialize market analysis (this will create the chart)
        await marketAnalysis.init();
        
        // Initialize market metrics
        await marketMetrics.init();
        
        // Initialize AI analysis
        await aiAnalysis.init();

        // Initialize sector performance
        const sectorPerformance = {
            sectors: {
                'DeFi': ['AAVE', 'UNI', 'LINK', 'SNX', 'COMP'],
                'Layer1': ['ETH', 'SOL', 'ADA', 'AVAX', 'DOT'],
                'Exchange': ['BNB', 'FTT', 'CRO', 'OKB', 'HT'],
                'Gaming': ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA'],
                'Infrastructure': ['MATIC', 'ATOM', 'FTM', 'ONE', 'NEAR']
            },
            lastUpdate: 0,
            updateInterval: 300000, // 5 minutes

            async updateSectorData() {
                try {
                    const currentTime = Date.now();
                    if (currentTime - this.lastUpdate < this.updateInterval) {
                        return;
                    }

                    const sectorData = {};
                    
                    // Fetch data for each sector
                    for (const [sector, tokens] of Object.entries(this.sectors)) {
                        const performances = await Promise.all(
                            tokens.map(token => this.fetchTokenPerformance(token + 'USDT'))
                        );
                        
                        // Calculate average sector performance
                        const validPerformances = performances.filter(p => p !== null);
                        if (validPerformances.length > 0) {
                            sectorData[sector] = {
                                performance: validPerformances.reduce((a, b) => a + b, 0) / validPerformances.length,
                                tokens: tokens.map((token, i) => ({
                                    symbol: token,
                                    performance: performances[i]
                                })).filter(t => t.performance !== null)
                            };
                        }
                    }

                    // Update UI
                    this.updateSectorUI(sectorData);
                    
                    this.lastUpdate = currentTime;
                } catch (error) {
                    console.error('Error updating sector data:', error);
                    this.handleError();
                }
            },

            async fetchTokenPerformance(symbol) {
                try {
                    const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    if (data.ret_code === 0 && data.result?.list?.[0]) {
                        const ticker = data.result.list[0];
                        return parseFloat(ticker.price24hPcnt) * 100; // Convert to percentage
                    }
                    
                    return null;
                } catch (error) {
                    console.error(`Error fetching data for ${symbol}:`, error);
                    return null;
                }
            },

            updateSectorUI(sectorData) {
                const container = document.getElementById('sectorPerformance');
                if (!container) return;

                // Sort sectors by performance
                const sortedSectors = Object.entries(sectorData)
                    .sort(([,a], [,b]) => b.performance - a.performance);

                let html = '<div class="sector-grid">';
                
                for (const [sector, data] of sortedSectors) {
                    const performanceClass = this.getPerformanceClass(data.performance);
                    
                    html += `
                        <div class="sector-card ${performanceClass}">
                            <div class="sector-header">
                                <h4>${sector}</h4>
                                <span class="sector-performance">${data.performance.toFixed(2)}%</span>
                            </div>
                            <div class="token-list">
                                ${data.tokens.map(token => `
                                    <div class="token-item">
                                        <span class="token-symbol">${token.symbol}</span>
                                        <span class="token-performance ${this.getPerformanceClass(token.performance)}">
                                            ${token.performance.toFixed(2)}%
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                html += '</div>';
                html += `<div class="update-time">Last updated: ${new Date().toLocaleTimeString()}</div>`;
                
                container.innerHTML = html;
            },

            getPerformanceClass(performance) {
                if (performance >= 5) return 'performance-high';
                if (performance >= 2) return 'performance-medium-high';
                if (performance <= -5) return 'performance-low';
                if (performance <= -2) return 'performance-medium-low';
                return 'performance-neutral';
            },

            handleError() {
                const container = document.getElementById('sectorPerformance');
                if (container) {
                    container.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Unable to load sector performance data</p>
                        </div>
                    `;
                }
            }
        };

        // Start sector performance updates
        await sectorPerformance.updateSectorData();
        setInterval(() => sectorPerformance.updateSectorData(), sectorPerformance.updateInterval);

        // Initialize market visualization
        const marketViz = new MarketVisualization(marketAnalysis.chart, bybitHandler, tradMarketsHandler);
        await marketViz.init();
        
        // Initialize traditional markets data
        await tradMarketsHandler.init();
        
        // Set up periodic updates for traditional markets
        setInterval(() => tradMarketsHandler.updateTraditionalData(), 300000); // 5 minutes
        
        // Initialize WebSocket connection
        await bybitHandler.initWebSocket(['BTCUSDT']);
        
        // Initialize timeframe buttons
        const timeframeButtons = document.querySelectorAll('.timeframe-btn');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', async () => {
                // Remove active class from all buttons
                timeframeButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                
                // Get selected timeframe
                const timeframe = button.getAttribute('data-timeframe');
                marketAnalysis.currentTimeframe = timeframe;
                
                // Update chart data
                await marketAnalysis.updateAllData();
                
                // Update market metrics
                await marketMetrics.updateMetrics();
                
                // Update AI insights
                await aiAnalysis.updateAIInsights({
                    pair: marketAnalysis.currentPair,
                    timeframe: marketAnalysis.currentTimeframe,
                    currentPrice: marketAnalysis.lastPrice,
                    priceChange24h: marketAnalysis.priceChange24h,
                    volume24h: marketAnalysis.volume24h,
                    indicators: marketAnalysis.indicators
                });
            });
        });
        
        // Setup pair selector
        const pairSelector = document.getElementById('tradingPair');
        if (pairSelector) {
            pairSelector.addEventListener('change', async () => {
                const pair = pairSelector.value;
                
                // Update WebSocket subscription
                await bybitHandler.initWebSocket([pair]);
                
                // Update chart data
                await marketAnalysis.updateAllData();
                
                // Update market metrics
                await marketMetrics.updateMetrics();
                
                // Update AI insights
                await aiAnalysis.updateAIInsights({
                    pair,
                    timeframe: marketAnalysis.currentTimeframe,
                    currentPrice: marketAnalysis.lastPrice,
                    priceChange24h: marketAnalysis.priceChange24h,
                    volume24h: marketAnalysis.volume24h,
                    indicators: marketAnalysis.indicators
                });
            });
        }
        
        // Initial data load
        await marketAnalysis.updateAllData();
        await marketMetrics.updateMetrics();
        
        // Set up periodic updates
        setInterval(() => marketAnalysis.updateAllData(), 15000); // 15 seconds
        setInterval(() => marketMetrics.updateMetrics(), 300000); // 5 minutes
        
        console.log('All components initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// On-Chain Analytics Functions
async function loadOnChainData(timeframe = '24h') {
    try {
        // Simulated data for now - replace with actual API calls later
        const networkData = {
            activeAddresses: '125,432',
            activeAddressesChange: '+5.2%',
            transactionCount: '892,156',
            transactionCountChange: '+3.8%',
            hashRate: '245.3 EH/s',
            hashRateChange: '+2.1%'
        };

        const exchangeData = {
            netFlow: '-12,345 BTC',
            netFlowChange: '-2.5%',
            exchangeBalance: '2.1M BTC',
            exchangeBalanceChange: '-1.3%',
            stablecoinInflow: '$892M',
            stablecoinInflowChange: '+4.7%'
        };

        const whaleData = {
            largeTransactions: '456',
            largeTransactionsChange: '+6.9%',
            whaleBalance: '8.2M BTC',
            whaleBalanceChange: '+0.8%',
            accumulationScore: '7.8',
            accumulationScoreChange: '+3.2%'
        };

        // Update Network Activity
        document.getElementById('activeAddresses').textContent = networkData.activeAddresses;
        document.getElementById('activeAddressesChange').textContent = networkData.activeAddressesChange;
        document.getElementById('transactionCount').textContent = networkData.transactionCount;
        document.getElementById('transactionCountChange').textContent = networkData.transactionCountChange;
        document.getElementById('hashRate').textContent = networkData.hashRate;
        document.getElementById('hashRateChange').textContent = networkData.hashRateChange;

        // Update Exchange Flows
        document.getElementById('netFlow').textContent = exchangeData.netFlow;
        document.getElementById('netFlowChange').textContent = exchangeData.netFlowChange;
        document.getElementById('exchangeBalance').textContent = exchangeData.exchangeBalance;
        document.getElementById('exchangeBalanceChange').textContent = exchangeData.exchangeBalanceChange;
        document.getElementById('stablecoinInflow').textContent = exchangeData.stablecoinInflow;
        document.getElementById('stablecoinInflowChange').textContent = exchangeData.stablecoinInflowChange;

        // Update Whale Activity
        document.getElementById('largeTransactions').textContent = whaleData.largeTransactions;
        document.getElementById('largeTransactionsChange').textContent = whaleData.largeTransactionsChange;
        document.getElementById('whaleBalance').textContent = whaleData.whaleBalance;
        document.getElementById('whaleBalanceChange').textContent = whaleData.whaleBalanceChange;
        document.getElementById('accumulationScore').textContent = whaleData.accumulationScore;
        document.getElementById('accumulationScoreChange').textContent = whaleData.accumulationScoreChange;

        // Initialize charts
        initializeCharts();

    } catch (error) {
        console.error('Error loading on-chain data:', error);
    }
}

function initializeCharts() {
    // Network Activity Chart
    const networkChart = LightweightCharts.createChart(
        document.getElementById('networkActivityChart'),
        chartOptions
    );
    
    // Exchange Flows Chart
    const exchangeChart = LightweightCharts.createChart(
        document.getElementById('exchangeFlowChart'),
        chartOptions
    );
    
    // Whale Activity Heatmap
    const whaleChart = LightweightCharts.createChart(
        document.getElementById('whaleActivityHeatmap'),
        chartOptions
    );

    // Add sample data to charts
    addSampleDataToChart(networkChart);
    addSampleDataToChart(exchangeChart);
    addSampleDataToChart(whaleChart);
}

// Historical Patterns Functions
async function loadHistoricalPatterns() {
    try {
        // Simulated data for pattern recognition
        const patternData = {
            currentPattern: 'Bull Flag Formation',
            confidence: '78%',
            projection: '+12% potential upside'
        };

        const cycleData = {
            currentPhase: 'Accumulation',
            duration: '45 days',
            strength: 'Strong'
        };

        const similarPatterns = [
            { date: 'Dec 2020', accuracy: '89%', outcome: '+125%' },
            { date: 'Jul 2019', accuracy: '76%', outcome: '+65%' },
            { date: 'Mar 2019', accuracy: '82%', outcome: '+85%' }
        ];

        // Update Pattern Recognition
        document.querySelector('#pattern-recognition .current-pattern').textContent = patternData.currentPattern;
        document.querySelector('#pattern-recognition .confidence').textContent = patternData.confidence;
        document.querySelector('#pattern-recognition .projection').textContent = patternData.projection;

        // Update Market Cycles
        document.querySelector('#market-cycles .current-phase').textContent = cycleData.currentPhase;
        document.querySelector('#market-cycles .duration').textContent = cycleData.duration;
        document.querySelector('#market-cycles .strength').textContent = cycleData.strength;

        // Update Similar Patterns
        const similarPatternsContainer = document.querySelector('#similar-patterns .patterns-list');
        similarPatternsContainer.innerHTML = similarPatterns.map(pattern => `
            <div class="pattern-item">
                <span class="date">${pattern.date}</span>
                <span class="accuracy">${pattern.accuracy}</span>
                <span class="outcome">${pattern.outcome}</span>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading historical patterns:', error);
    }
}

// Initialize both sections
document.addEventListener('DOMContentLoaded', () => {
    loadOnChainData();
    loadHistoricalPatterns();

    // Add timeframe button listeners
    document.querySelectorAll('.timeframe-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.timeframe-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            loadOnChainData(e.target.dataset.timeframe);
        });
    });
});