// Segment data with tokens
const segments = {
    top: [
        { symbol: 'BTC', name: 'Bitcoin', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
        { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { symbol: 'XRP', name: 'XRP', icon: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
        { symbol: 'BNB', name: 'BNB', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
        { symbol: 'SOL', name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' }
    ],
    defi: [
        { symbol: 'UNI', name: 'Uniswap', icon: 'https://cryptologos.cc/logos/uniswap-uni-logo.png' },
        { symbol: 'AAVE', name: 'Aave', icon: 'https://cryptologos.cc/logos/aave-aave-logo.png' },
        { symbol: 'MKR', name: 'Maker', icon: 'https://cryptologos.cc/logos/maker-mkr-logo.png' },
        { symbol: 'COMP', name: 'Compound', icon: 'https://cryptologos.cc/logos/compound-comp-logo.png' },
        { symbol: 'CRV', name: 'Curve', icon: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png' },
        { symbol: 'SNX', name: 'Synthetix', icon: 'https://cryptologos.cc/logos/synthetix-network-token-snx-logo.png' },
        { symbol: 'SUSHI', name: 'SushiSwap', icon: 'https://cryptologos.cc/logos/sushiswap-sushi-logo.png' },
        { symbol: '1INCH', name: '1inch', icon: 'https://cryptologos.cc/logos/1inch-1inch-logo.png' },
        { symbol: 'BAL', name: 'Balancer', icon: 'https://cryptologos.cc/logos/balancer-bal-logo.png' },
        { symbol: 'YFI', name: 'Yearn', icon: 'https://cryptologos.cc/logos/yearn-finance-yfi-logo.png' }
    ],
    layer1: [
        { symbol: 'ETH', name: 'Ethereum', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
        { symbol: 'SOL', name: 'Solana', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
        { symbol: 'ADA', name: 'Cardano', icon: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
        { symbol: 'AVAX', name: 'Avalanche', icon: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
        { symbol: 'DOT', name: 'Polkadot', icon: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
        { symbol: 'NEAR', name: 'NEAR', icon: 'https://cryptologos.cc/logos/near-protocol-near-logo.png' },
        { symbol: 'ATOM', name: 'Cosmos', icon: 'https://cryptologos.cc/logos/cosmos-atom-logo.png' },
        { symbol: 'FTM', name: 'Fantom', icon: 'https://cryptologos.cc/logos/fantom-ftm-logo.png' },
        { symbol: 'ONE', name: 'Harmony', icon: 'https://cryptologos.cc/logos/harmony-one-logo.png' },
        { symbol: 'ALGO', name: 'Algorand', icon: 'https://cryptologos.cc/logos/algorand-algo-logo.png' }
    ],
    gaming: [
        { symbol: 'AXS', name: 'Axie Infinity', icon: 'https://cryptologos.cc/logos/axie-infinity-axs-logo.png' },
        { symbol: 'SAND', name: 'The Sandbox', icon: 'https://cryptologos.cc/logos/the-sandbox-sand-logo.png' },
        { symbol: 'MANA', name: 'Decentraland', icon: 'https://cryptologos.cc/logos/decentraland-mana-logo.png' },
        { symbol: 'ENJ', name: 'Enjin', icon: 'https://cryptologos.cc/logos/enjin-coin-enj-logo.png' },
        { symbol: 'GALA', name: 'Gala Games', icon: 'https://cryptologos.cc/logos/gala-gala-logo.png' },
        { symbol: 'ILV', name: 'Illuvium', icon: 'https://cryptologos.cc/logos/illuvium-ilv-logo.png' },
        { symbol: 'YGG', name: 'Yield Guild', icon: 'https://cryptologos.cc/logos/yield-guild-games-ygg-logo.png' },
        { symbol: 'MAGIC', name: 'Magic', icon: 'https://cryptologos.cc/logos/magic-magic-logo.png' },
        { symbol: 'IMX', name: 'Immutable X', icon: 'https://cryptologos.cc/logos/immutable-x-imx-logo.png' },
        { symbol: 'ATLAS', name: 'Star Atlas', icon: 'https://cryptologos.cc/logos/star-atlas-atlas-logo.png' }
    ],
    infrastructure: [
        { symbol: 'LINK', name: 'Chainlink', icon: 'https://cryptologos.cc/logos/chainlink-link-logo.png' },
        { symbol: 'GRT', name: 'The Graph', icon: 'https://cryptologos.cc/logos/the-graph-grt-logo.png' },
        { symbol: 'AR', name: 'Arweave', icon: 'https://cryptologos.cc/logos/arweave-ar-logo.png' },
        { symbol: 'FIL', name: 'Filecoin', icon: 'https://cryptologos.cc/logos/filecoin-fil-logo.png' },
        { symbol: 'MATIC', name: 'Polygon', icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
        { symbol: 'LRC', name: 'Loopring', icon: 'https://cryptologos.cc/logos/loopring-lrc-logo.png' },
        { symbol: 'REN', name: 'Ren', icon: 'https://cryptologos.cc/logos/ren-ren-logo.png' },
        { symbol: 'BAND', name: 'Band', icon: 'https://cryptologos.cc/logos/band-protocol-band-logo.png' },
        { symbol: 'API3', name: 'API3', icon: 'https://cryptologos.cc/logos/api3-api3-logo.png' },
        { symbol: 'OCEAN', name: 'Ocean', icon: 'https://cryptologos.cc/logos/ocean-protocol-ocean-logo.png' }
    ],
    ai: [
        { symbol: 'AGIX', name: 'SingularityNET', icon: 'https://cryptologos.cc/logos/singularitynet-agix-logo.png' },
        { symbol: 'FET', name: 'Fetch.ai', icon: 'https://cryptologos.cc/logos/fetch-ai-fet-logo.png' },
        { symbol: 'OCEAN', name: 'Ocean Protocol', icon: 'https://cryptologos.cc/logos/ocean-protocol-ocean-logo.png' },
        { symbol: 'NMR', name: 'Numeraire', icon: 'https://cryptologos.cc/logos/numeraire-nmr-logo.png' },
        { symbol: 'RLC', name: 'iExec RLC', icon: 'https://cryptologos.cc/logos/rlc-rlc-logo.png' },
        { symbol: 'ALI', name: 'Alethea AI', icon: 'https://cryptologos.cc/logos/alethea-artificial-liquid-intelligence-token-ali-logo.png' },
        { symbol: 'ROSE', name: 'Oasis Network', icon: 'https://cryptologos.cc/logos/oasis-network-rose-logo.png' },
        { symbol: 'RAD', name: 'Radicle', icon: 'https://cryptologos.cc/logos/radicle-rad-logo.png' },
        { symbol: 'DBC', name: 'DeepBrain Chain', icon: 'https://cryptologos.cc/logos/deepbrain-chain-dbc-logo.png' },
        { symbol: 'GRT', name: 'The Graph', icon: 'https://cryptologos.cc/logos/the-graph-grt-logo.png' }
    ],
    memes: [
        { symbol: 'DOGE', name: 'Dogecoin', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
        { symbol: 'SHIB', name: 'Shiba Inu', icon: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png' },
        { symbol: 'PEPE', name: 'Pepe', icon: 'https://cryptologos.cc/logos/pepe-pepe-logo.png' },
        { symbol: 'FLOKI', name: 'Floki', icon: 'https://cryptologos.cc/logos/floki-floki-logo.png' },
        { symbol: 'BONK', name: 'Bonk', icon: 'https://cryptologos.cc/logos/bonk-bonk-logo.png' },
        { symbol: 'WOJAK', name: 'Wojak', icon: 'https://cryptologos.cc/logos/wojak-wojak-logo.png' },
        { symbol: 'MEME', name: 'Memecoin', icon: 'https://cryptologos.cc/logos/memecoin-meme-logo.png' },
        { symbol: 'ELON', name: 'Dogelon Mars', icon: 'https://cryptologos.cc/logos/dogelon-mars-elon-logo.png' },
        { symbol: 'BABYDOGE', name: 'Baby Doge', icon: 'https://cryptologos.cc/logos/baby-doge-coin-babydoge-logo.png' },
        { symbol: 'SNEK', name: 'Snek', icon: 'https://cryptologos.cc/logos/snek-snek-logo.png' }
    ],
    depin: [
        { symbol: 'HNT', name: 'Helium', icon: 'https://cryptologos.cc/logos/helium-hnt-logo.png' },
        { symbol: 'RNDR', name: 'Render', icon: 'https://cryptologos.cc/logos/render-token-rndr-logo.png' },
        { symbol: 'STORJ', name: 'Storj', icon: 'https://cryptologos.cc/logos/storj-storj-logo.png' },
        { symbol: 'LPT', name: 'Livepeer', icon: 'https://cryptologos.cc/logos/livepeer-lpt-logo.png' },
        { symbol: 'GLM', name: 'Golem', icon: 'https://cryptologos.cc/logos/golem-glm-logo.png' },
        { symbol: 'POKT', name: 'Pocket Network', icon: 'https://cryptologos.cc/logos/pocket-network-pokt-logo.png' },
        { symbol: 'IOTA', name: 'IOTA', icon: 'https://cryptologos.cc/logos/iota-miota-logo.png' },
        { symbol: 'PLA', name: 'PlayDapp', icon: 'https://cryptologos.cc/logos/playdapp-pla-logo.png' },
        { symbol: 'MOBX', name: 'MobieCoin', icon: 'https://cryptologos.cc/logos/mobiecoin-mobx-logo.png' },
        { symbol: 'WOZX', name: 'Efforce', icon: 'https://cryptologos.cc/logos/efforce-wozx-logo.png' }
    ],
    rwa: [
        { symbol: 'RWA', name: 'RWA Inc.', icon: 'https://cryptologos.cc/logos/realworld-rwx-logo.png' },
        { symbol: 'LINK', name: 'Chainlink', icon: 'https://cryptologos.cc/logos/chainlink-link-logo.png' },
        { symbol: 'MKR', name: 'Maker', icon: 'https://cryptologos.cc/logos/maker-mkr-logo.png' },
        { symbol: 'ONDO', name: 'Ondo Finance', icon: 'https://cryptologos.cc/logos/ondo-finance-ondo-logo.png' },
        { symbol: 'PENDLE', name: 'Pendle', icon: 'https://cryptologos.cc/logos/pendle-pendle-logo.png' },
        { symbol: 'POLYX', name: 'Polymesh', icon: 'https://cryptologos.cc/logos/polymesh-polyx-logo.png' },
        { symbol: 'GFI', name: 'Goldfinch', icon: 'https://cryptologos.cc/logos/goldfinch-gfi-logo.png' },
        { symbol: 'TRU', name: 'TrueFi', icon: 'https://cryptologos.cc/logos/truefi-tru-logo.png' },
        { symbol: 'CTC', name: 'Creditcoin', icon: 'https://cryptologos.cc/logos/creditcoin-ctc-logo.png' },
        { symbol: 'OM', name: 'MANTRA', icon: 'https://cryptologos.cc/logos/mantra-dao-om-logo.png' }
    ]
};

// Handle disclaimer
document.addEventListener('DOMContentLoaded', () => {
    const disclaimerOverlay = document.getElementById('disclaimerOverlay');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const agreeButton = document.getElementById('agreeButton');
    const hasAgreed = localStorage.getItem('segmentProjectionsDisclaimer');

    if (!hasAgreed) {
        disclaimerOverlay.style.display = 'flex';
    } else {
        disclaimerOverlay.style.display = 'none';
        initSegments();
    }

    agreeCheckbox.addEventListener('change', () => {
        agreeButton.classList.toggle('active', agreeCheckbox.checked);
    });

    agreeButton.addEventListener('click', () => {
        if (agreeCheckbox.checked) {
            localStorage.setItem('segmentProjectionsDisclaimer', 'true');
            disclaimerOverlay.style.opacity = '0';
            setTimeout(() => {
                disclaimerOverlay.style.display = 'none';
                initSegments();
            }, 300);
        }
    });

    // Handle segment navigation
    const segmentBtns = document.querySelectorAll('.segment-btn');
    segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const segment = btn.dataset.segment;
            showSegment(segment);
        });
    });
});

// Show selected segment
function showSegment(segmentId) {
    // Update buttons
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.segment === segmentId);
    });

    // Update sections
    document.querySelectorAll('.segment-section').forEach(section => {
        section.classList.toggle('active', section.id === `${segmentId}-segment`);
    });

    // Load segment data
    loadSegmentData(segmentId);
}

// Load segment data
async function loadSegmentData(segmentId) {
    const container = document.querySelector(`#${segmentId}-segment .projection-grid`);
    container.innerHTML = ''; // Clear existing content

    const tokens = segments[segmentId];
    tokens.forEach(token => {
        const card = createProjectionCard(token);
        container.appendChild(card);
    });

    // Update projections for all tokens in segment
    updateSegmentProjections(segmentId);
}

// Create projection card
function createProjectionCard(token) {
    const card = document.createElement('div');
    card.className = 'projection-card';
    card.id = `${token.symbol.toLowerCase()}Projection`;
    
    card.innerHTML = `
        <div class="token-header">
            <div class="token-info">
                <img src="${token.icon}" alt="${token.symbol}" class="token-icon">
                <span class="token-name">${token.name}</span>
            </div>
            <span class="token-price current-price">Loading...</span>
        </div>
        <canvas id="${token.symbol.toLowerCase()}Chart" class="projection-chart"></canvas>
        <div class="projection-metrics">
            <div class="metric">
                <div class="metric-label">Projected Low</div>
                <div class="metric-value projected-low">Loading...</div>
            </div>
            <div class="metric">
                <div class="metric-label">Projected High</div>
                <div class="metric-value projected-high">Loading...</div>
            </div>
            <div class="metric">
                <div class="metric-label">Volatility</div>
                <div class="metric-value volatility-value">Loading...</div>
            </div>
            <div class="metric">
                <div class="metric-label">Momentum</div>
                <div class="metric-value momentum-value">Loading...</div>
            </div>
        </div>
        <div class="confidence-level">
            <span>AI Confidence:</span>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: 0%"></div>
            </div>
            <span class="confidence-value">0%</span>
        </div>
        <div class="timeframe-selector">
            <button class="timeframe-btn active" data-days="7">7D</button>
            <button class="timeframe-btn" data-days="14">14D</button>
            <button class="timeframe-btn" data-days="30">30D</button>
            <button class="timeframe-btn" data-days="60">60D</button>
        </div>
    `;

    // Add click handlers for timeframe buttons
    const timeframeBtns = card.querySelectorAll('.timeframe-btn');
    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            timeframeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update projection with new timeframe
            const days = parseInt(btn.dataset.days);
            updateProjection(token.symbol, days);
        });
    });

    return card;
}

// Update projections for all tokens in a segment
async function updateSegmentProjections(segmentId) {
    const tokens = segments[segmentId];
    for (const token of tokens) {
        await updateProjection(token.symbol);
    }
}

// Initialize segments
function initSegments() {
    // Show first segment by default
    showSegment('top');
}

// Update projection for a specific token
async function updateProjection(token, days = 7) {
    try {
        // Use MEXC API endpoint
        const symbol = `${token}USDT`;
        const response = await fetch(`/api/mexc/klines?symbol=${symbol}&interval=1d&limit=${days + 30}`); // Get extra historical data for better predictions
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Invalid data format received');
        }
        
        // Process historical data - MEXC returns [timestamp, open, high, low, close, volume, ...]
        const prices = data.map(candle => parseFloat(candle[4])); // Using close price
        const volumes = data.map(candle => parseFloat(candle[5]));
        
        // Generate AI projection
        const projection = generateProjection(prices, volumes, days);
        
        // Update UI
        updateProjectionUI(token, projection, days);
    } catch (error) {
        console.error(`Error updating projection for ${token}:`, error);
        // Show fallback UI with error state
        showErrorState(token);
    }
}

// Generate AI projection based on historical data
function generateProjection(prices, volumes, days = 7) {
    const lastPrice = prices[prices.length - 1];
    const volatility = calculateVolatility(prices);
    const momentum = calculateMomentum(prices);
    const volumeTrend = calculateVolumeTrend(volumes);
    
    // Increase the impact of volatility and momentum
    const volatilityFactor = volatility * 2.5; // Increased from default
    const momentumImpact = Math.abs(momentum) * 1.5; // Increased momentum impact
    
    // Calculate projected change with more variance
    const baseChange = (momentum * 0.6 + volumeTrend * 0.4) * volatilityFactor;
    const randomVariance = (Math.random() - 0.5) * volatility * 0.5;
    const projectedChange = baseChange + randomVariance;
    
    // Add asymmetric ranges based on momentum
    const upwardBias = momentum > 0 ? 1.2 : 0.8;
    const downwardBias = momentum < 0 ? 1.2 : 0.8;
    
    // Scale projections based on timeframe with diminishing returns
    const timeframeScale = Math.sqrt(days / 7) * (1 + Math.log10(days / 7) * 0.2);
    
    // Adjust confidence based on timeframe
    const timeframeConfidence = Math.max(0, 1 - Math.log10(days / 7) * 0.3);
    
    return {
        currentPrice: lastPrice,
        projectedLow: lastPrice * (1 - Math.abs(projectedChange) * downwardBias * timeframeScale),
        projectedHigh: lastPrice * (1 + Math.abs(projectedChange) * upwardBias * timeframeScale),
        confidence: (70 + momentumImpact * 20) * (1 - volatility) * timeframeConfidence,
        volatility: volatilityFactor * 100 * Math.sqrt(days / 7),
        momentum: momentum > 0 ? 'Bullish' : 'Bearish',
        days: days
    };
}

// Calculate volatility from price data
function calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
}

// Calculate momentum from price data
function calculateMomentum(prices) {
    const periods = [1, 3, 7, 14]; // Multiple timeframes for momentum
    let momentum = 0;
    
    periods.forEach((period, index) => {
        const weight = 1 / Math.pow(2, index); // More weight to recent periods
        const start = prices.length - period - 1;
        const end = prices.length - 1;
        if (start >= 0) {
            momentum += ((prices[end] - prices[start]) / prices[start]) * weight;
        }
    });
    
    return momentum;
}

// Calculate volume trend
function calculateVolumeTrend(volumes) {
    const recentVolume = volumes.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const oldVolume = volumes.slice(0, -7).reduce((a, b) => a + b, 0) / (volumes.length - 7);
    return (recentVolume - oldVolume) / oldVolume;
}

// Update UI with projection data
function updateProjectionUI(token, projection, days = 7) {
    const container = document.getElementById(`${token.toLowerCase()}Projection`);
    if (!container) return;

    // Update price displays
    container.querySelector('.current-price').textContent = formatUSD(projection.currentPrice);
    container.querySelector('.projected-low').textContent = formatUSD(projection.projectedLow);
    container.querySelector('.projected-high').textContent = formatUSD(projection.projectedHigh);
    container.querySelector('.volatility-value').textContent = `${projection.volatility.toFixed(1)}%`;
    container.querySelector('.momentum-value').textContent = projection.momentum;
    
    // Update confidence bar
    const confidenceBar = container.querySelector('.confidence-fill');
    const confidenceValue = container.querySelector('.confidence-value');
    confidenceBar.style.width = `${projection.confidence}%`;
    confidenceValue.textContent = `${projection.confidence.toFixed(1)}%`;

    // Update chart
    updateChart(token, projection);
}

// Update projection chart
function updateChart(token, projection) {
    const chartCanvas = document.getElementById(`${token.toLowerCase()}Chart`);
    if (!chartCanvas) return;

    // Create gradients
    const ctx = chartCanvas.getContext('2d');
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 200);
    gradientFill.addColorStop(0, 'rgba(255, 136, 0, 0.2)');
    gradientFill.addColorStop(1, 'rgba(255, 136, 0, 0)');

    const gradientLine = ctx.createLinearGradient(0, 0, 0, 200);
    gradientLine.addColorStop(0, 'rgba(255, 136, 0, 1)');
    gradientLine.addColorStop(1, 'rgba(255, 68, 68, 1)');

    // Generate projection points
    const {upperBound, lowerBound, midLine} = generateProjectionPoints(projection);

    // Generate labels based on timeframe
    const labels = generateTimeLabels(projection.days);

    // Destroy existing chart if it exists
    if (window.charts && window.charts[token]) {
        window.charts[token].destroy();
    }

    // Initialize charts object if it doesn't exist
    if (!window.charts) {
        window.charts = {};
    }

    // Create new chart
    window.charts[token] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Upper Bound',
                    data: upperBound,
                    borderColor: gradientLine,
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Projection',
                    data: midLine,
                    borderColor: gradientLine,
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Lower Bound',
                    data: lowerBound,
                    borderColor: gradientLine,
                    borderWidth: 1,
                    pointRadius: 0,
                    backgroundColor: gradientFill,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += formatUSD(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatUSD(value);
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Generate projection points for chart
function generateProjectionPoints(projection) {
    const points = 8;
    const upperBound = [];
    const lowerBound = [];
    const midLine = [];
    
    const volatilityFactor = projection.volatility / 100;
    const range = projection.projectedHigh - projection.projectedLow;
    const midPoint = (projection.projectedHigh + projection.projectedLow) / 2;
    
    for (let i = 0; i < points; i++) {
        const progress = i / (points - 1);
        
        // Add more dynamic variance
        const volatilityAdjustment = Math.sin(progress * Math.PI * 2) * volatilityFactor * range * 0.3;
        const trendAdjustment = Math.sin(progress * Math.PI) * range * 0.2;
        
        // Add some randomness to make lines less uniform
        const upperNoise = (Math.random() - 0.5) * range * 0.1;
        const lowerNoise = (Math.random() - 0.5) * range * 0.1;
        const midNoise = (Math.random() - 0.5) * range * 0.05;
        
        upperBound.push(midPoint + (range/2) * progress + volatilityAdjustment + trendAdjustment + upperNoise);
        lowerBound.push(midPoint - (range/2) * progress - volatilityAdjustment - trendAdjustment + lowerNoise);
        midLine.push(midPoint + trendAdjustment * 0.5 + midNoise);
    }
    
    return {upperBound, lowerBound, midLine};
}

// Generate time labels for chart
function generateTimeLabels(days) {
    const labels = ['Now'];
    const intervals = {
        7: 1,   // 1 day intervals
        14: 2,  // 2 day intervals
        30: 4,  // 4 day intervals
        60: 8   // 8 day intervals
    };
    
    const interval = intervals[days] || 1;
    for (let i = 1; i < 8; i++) {
        labels.push(`${i * interval}d`);
    }
    return labels;
}

// Format number as USD
function formatUSD(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Add some CSS for the new timeframe button
const style = document.createElement('style');
style.textContent = `
    .timeframe-selector {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
    }
    
    .timeframe-btn {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: var(--color-glass);
        color: var(--color-text);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
    }
    
    .timeframe-btn:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    .timeframe-btn.active {
        background: linear-gradient(45deg, rgba(255, 68, 68, 0.2), rgba(255, 136, 0, 0.2));
        border-color: rgba(255, 136, 0, 0.3);
        color: #ff8800;
    }
`;
document.head.appendChild(style);
