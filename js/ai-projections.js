// Handle disclaimer
document.addEventListener('DOMContentLoaded', () => {
    const disclaimerOverlay = document.getElementById('disclaimerOverlay');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const agreeButton = document.getElementById('agreeButton');
    const hasAgreed = localStorage.getItem('aiProjectionsDisclaimer');

    if (!hasAgreed) {
        disclaimerOverlay.style.display = 'flex';
    } else {
        disclaimerOverlay.style.display = 'none';
        initProjections();
    }

    agreeCheckbox.addEventListener('change', () => {
        agreeButton.classList.toggle('active', agreeCheckbox.checked);
    });

    agreeButton.addEventListener('click', () => {
        if (agreeCheckbox.checked) {
            localStorage.setItem('aiProjectionsDisclaimer', 'true');
            disclaimerOverlay.style.opacity = '0';
            setTimeout(() => {
                disclaimerOverlay.style.display = 'none';
                initProjections();
            }, 300);
        }
    });
});

// Initialize projections
async function initProjections() {
    const tokens = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB'];
    
    for (const token of tokens) {
        await updateProjection(token);
    }

    // Update every 5 minutes
    setInterval(() => {
        tokens.forEach(token => updateProjection(token));
    }, 5 * 60 * 1000);
}

// Update projection for a specific token
async function updateProjection(token) {
    try {
        // Use MEXC API endpoint
        const symbol = `${token}USDT`;
        const response = await fetch(`/api/mexc/klines?symbol=${symbol}&interval=1d&limit=30`);
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Invalid data format received');
        }
        
        // Process historical data - MEXC returns [timestamp, open, high, low, close, volume, ...]
        const prices = data.map(candle => parseFloat(candle[4])); // Using close price
        const volumes = data.map(candle => parseFloat(candle[5]));
        
        // Generate AI projection
        const projection = generateProjection(prices, volumes);
        
        // Update UI
        updateProjectionUI(token, projection);
    } catch (error) {
        console.error(`Error updating projection for ${token}:`, error);
        // Show fallback UI with error state
        showErrorState(token);
    }
}

// Show error state in UI
function showErrorState(token) {
    const container = document.getElementById(`${token.toLowerCase()}Projection`);
    if (!container) return;

    const metrics = container.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        metric.textContent = 'N/A';
    });

    container.querySelector('.confidence-fill').style.width = '0%';
    container.querySelector('.confidence-value').textContent = 'N/A';
}

// Generate AI projection based on historical data
function generateProjection(prices, volumes) {
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
    
    return {
        currentPrice: lastPrice,
        projectedLow: lastPrice * (1 - Math.abs(projectedChange) * downwardBias),
        projectedHigh: lastPrice * (1 + Math.abs(projectedChange) * upwardBias),
        confidence: (70 + momentumImpact * 20) * (1 - volatility), // Lower confidence with higher volatility
        volatility: volatilityFactor * 100,
        momentum: momentum > 0 ? 'Bullish' : 'Bearish'
    };
}

// Helper functions for technical calculations
function calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return standardDeviation(returns);
}

function calculateMomentum(prices) {
    const shortTerm = average(prices.slice(-7));
    const longTerm = average(prices.slice(-30));
    return (shortTerm - longTerm) / longTerm;
}

function calculateVolumeTrend(volumes) {
    const recentVolume = average(volumes.slice(-7));
    const historicalVolume = average(volumes.slice(-30));
    return (recentVolume - historicalVolume) / historicalVolume;
}

function standardDeviation(values) {
    const avg = average(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(average(squareDiffs));
}

function average(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
}

// Update UI with projection data
function updateProjectionUI(token, projection) {
    const container = document.getElementById(`${token.toLowerCase()}Projection`);
    if (!container) return;

    // Update price and projection ranges
    container.querySelector('.current-price').textContent = formatUSD(projection.currentPrice);
    container.querySelector('.projected-low').textContent = formatUSD(projection.projectedLow);
    container.querySelector('.projected-high').textContent = formatUSD(projection.projectedHigh);
    
    // Update confidence bar
    const confidenceBar = container.querySelector('.confidence-fill');
    confidenceBar.style.width = `${projection.confidence}%`;
    container.querySelector('.confidence-value').textContent = `${projection.confidence.toFixed(1)}%`;
    
    // Update metrics
    container.querySelector('.volatility-value').textContent = `${projection.volatility.toFixed(1)}%`;
    container.querySelector('.momentum-value').textContent = projection.momentum;
    
    // Update chart if using Chart.js
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
            labels: ['Now', '1d', '2d', '3d', '4d', '5d', '6d', '7d'],
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

// Add timeframe selector functionality
document.addEventListener('DOMContentLoaded', () => {
    const timeframeButtons = document.querySelectorAll('.timeframe-btn');
    timeframeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const parent = e.target.closest('.projection-card');
            parent.querySelectorAll('.timeframe-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Get token symbol from parent card id
            const token = parent.id.replace('Projection', '').toUpperCase();
            updateProjection(token);
        });
    });
});

// Utility functions
function formatUSD(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function getTokenId(symbol) {
    const tokenMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'XRP': 'ripple',
        'ADA': 'cardano',
        'BNB': 'binancecoin'
    };
    return tokenMap[symbol];
}
