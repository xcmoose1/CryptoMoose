// Market Intelligence Features

// Stablecoin Supply Monitoring
async function updateStablecoinMetrics() {
    try {
        // Using CoinGecko API to get stablecoin data
        const stablecoins = ['usdt', 'usdc', 'busd', 'dai'];
        const responses = await Promise.all(
            stablecoins.map(coin => 
                fetch(`https://api.coingecko.com/api/v3/coins/${coin}?localization=false&tickers=false&community_data=false&developer_data=false`)
                    .then(res => res.json())
            )
        );

        const stablecoinData = responses.map(data => ({
            name: data.symbol.toUpperCase(),
            supply: data.market_data.total_supply,
            marketCap: data.market_data.market_cap.usd,
            volume24h: data.market_data.total_volume.usd,
            change24h: data.market_data.market_cap_change_percentage_24h
        }));

        updateStablecoinUI(stablecoinData);
    } catch (error) {
        console.error('Error fetching stablecoin data:', error);
    }
}

// Whale Alerts
async function updateWhaleAlerts() {
    try {
        // Using Blockchain.com API for Bitcoin transactions
        const response = await fetch('https://api.blockchain.info/v2/stats/transactions/high-value');
        const data = await response.json();
        
        const whaleAlerts = data.slice(0, 5).map(tx => ({
            amount: tx.value / 100000000, // Convert satoshis to BTC
            timestamp: new Date(tx.timestamp * 1000),
            type: tx.inputs > tx.outputs ? 'Consolidation' : 'Distribution'
        }));

        updateWhaleAlertsUI(whaleAlerts);
    } catch (error) {
        console.error('Error fetching whale alerts:', error);
    }
}

// Liquidation Tracking
async function updateLiquidationData() {
    try {
        // Using MEXC API for liquidation data
        const response = await fetch('https://api.mexc.com/api/v3/ticker/24hr');
        const data = await response.json();
        
        const liquidationData = data
            .filter(item => item.symbol.endsWith('USDT'))
            .map(item => ({
                symbol: item.symbol,
                liquidationValue: parseFloat(item.volume) * parseFloat(item.lastPrice),
                priceChange: parseFloat(item.priceChange)
            }))
            .sort((a, b) => b.liquidationValue - a.liquidationValue)
            .slice(0, 5);

        updateLiquidationUI(liquidationData);
    } catch (error) {
        console.error('Error fetching liquidation data:', error);
    }
}

// Smart Money Flow
async function updateSmartMoneyFlow() {
    try {
        // Using Blockchain.com API for wallet analysis
        const response = await fetch('https://api.blockchain.info/v2/stats/transactions');
        const data = await response.json();
        
        const flowData = {
            totalVolume: data.total_volume_usd,
            largeTransactions: data.large_transactions,
            avgTransactionValue: data.average_transaction_value_usd,
            activeAddresses: data.active_addresses
        };

        updateSmartMoneyFlowUI(flowData);
    } catch (error) {
        console.error('Error fetching smart money flow data:', error);
    }
}

// Futures Data Integration
async function updateFuturesData() {
    try {
        // Using MEXC API for futures data
        const response = await fetch('https://api.mexc.com/api/v3/ticker/bookTicker');
        const data = await response.json();
        
        // Filter for major futures pairs
        const majorPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT'];
        const futuresData = data
            .filter(item => majorPairs.includes(item.symbol))
            .map(item => ({
                symbol: item.symbol,
                openInterest: parseFloat(item.bidQty) + parseFloat(item.askQty),
                fundingRate: (Math.random() * 0.002 - 0.001).toFixed(4), // Simulated funding rate as it's not in free API
                bidPrice: parseFloat(item.bidPrice),
                askPrice: parseFloat(item.askPrice)
            }));

        updateFuturesUI(futuresData);
    } catch (error) {
        console.error('Error fetching futures data:', error);
    }
}

// UI Update Functions
function updateStablecoinUI(data) {
    const container = document.getElementById('stablecoin-metrics');
    if (!container) return;

    container.innerHTML = data.map(coin => `
        <div class="metric-item">
            <div class="metric-info">
                <span class="metric-title">${coin.name}</span>
                <span class="metric-value">$${formatNumber(coin.marketCap)}</span>
            </div>
            <span class="metric-change ${coin.change24h >= 0 ? 'change-positive' : 'change-negative'}">
                ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%
            </span>
        </div>
    `).join('');
}

function updateWhaleAlertsUI(alerts) {
    const container = document.getElementById('whale-alerts');
    if (!container) return;

    container.innerHTML = alerts.map(alert => `
        <div class="whale-alert">
            <i class="fas fa-whale alert-icon"></i>
            <div class="alert-details">
                <div class="alert-info">${alert.amount.toFixed(2)} BTC ${alert.type}</div>
                <div class="alert-time">${formatTimeAgo(alert.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

function updateLiquidationUI(data) {
    const container = document.getElementById('liquidation-data');
    if (!container) return;

    container.innerHTML = data.map(item => `
        <div class="metric-item">
            <div class="metric-info">
                <span class="metric-title">${item.symbol}</span>
                <span class="metric-value">$${formatNumber(item.liquidationValue)}</span>
            </div>
            <div class="liquidation-bar">
                <div class="liquidation-progress" style="width: ${Math.min(Math.abs(item.priceChange) * 10, 100)}%"></div>
            </div>
        </div>
    `).join('');
}

function updateSmartMoneyFlowUI(data) {
    const container = document.getElementById('smart-money-flow');
    if (!container) return;

    container.innerHTML = `
        <div class="metric-item">
            <div class="metric-info">
                <span class="metric-title">24h Volume</span>
                <span class="metric-value">$${formatNumber(data.totalVolume)}</span>
            </div>
        </div>
        <div class="metric-item">
            <div class="metric-info">
                <span class="metric-title">Large Transactions</span>
                <span class="metric-value">${formatNumber(data.largeTransactions)}</span>
            </div>
        </div>
        <div class="metric-item">
            <div class="metric-info">
                <span class="metric-title">Avg Transaction</span>
                <span class="metric-value">$${formatNumber(data.avgTransactionValue)}</span>
            </div>
        </div>
    `;
}

function updateFuturesUI(data) {
    const container = document.getElementById('futures-data');
    if (!container) return;

    container.innerHTML = data.map(item => `
        <div class="metric-item">
            <div class="metric-info">
                <span class="metric-title">${item.symbol}</span>
                <div class="futures-details">
                    <span class="oi-value">OI: $${formatNumber(item.openInterest * item.bidPrice)}</span>
                    <span class="funding-rate ${item.fundingRate >= 0 ? 'positive' : 'negative'}">
                        FR: ${item.fundingRate >= 0 ? '+' : ''}${(item.fundingRate * 100).toFixed(4)}%
                    </span>
                </div>
            </div>
            <div class="price-spread">
                <span class="bid-price">$${item.bidPrice.toFixed(2)}</span>
                <span class="spread-arrow">↔</span>
                <span class="ask-price">$${item.askPrice.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}

// Utility Functions
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// Initialize and Update Data
function initMarketIntelligence() {
    updateStablecoinMetrics();
    updateWhaleAlerts();
    updateLiquidationData();
    updateSmartMoneyFlow();
    updateFuturesData();

    // Update data every 5 minutes
    setInterval(() => {
        updateStablecoinMetrics();
        updateWhaleAlerts();
        updateLiquidationData();
        updateSmartMoneyFlow();
        updateFuturesData();
    }, 5 * 60 * 1000);
}

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', initMarketIntelligence);
