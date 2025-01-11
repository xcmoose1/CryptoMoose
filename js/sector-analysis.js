import { HTX_CONFIG } from './config/htx-config.js';

export class SectorAnalysis {
    constructor() {
        this.sectors = {
            'gaming': {
                name: 'Gaming',
                tokens: ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA', 'IMX', 'MAGIC', 'SUPER', 'UFO', 'ATLAS'],
                description: 'Gaming and Metaverse tokens focused on virtual worlds and in-game assets.'
            },
            'l1': {
                name: 'Layer 1',
                tokens: ['ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'ATOM', 'FTM', 'ONE', 'ALGO'],
                description: 'Base layer blockchain protocols providing smart contract functionality.'
            },
            'l2': {
                name: 'Layer 2',
                tokens: ['MATIC', 'ARB', 'OP', 'IMX', 'METIS', 'ZKS', 'STRK', 'MUTE', 'RSK', 'BOBA'],
                description: 'Scaling solutions built on top of Layer 1 blockchains.'
            },
            'defi': {
                name: 'DeFi',
                tokens: ['UNI', 'AAVE', 'MKR', 'SNX', 'COMP', 'CRV', 'SUSHI', '1INCH', 'BAL', 'YFI'],
                description: 'Decentralized finance protocols for lending, trading, and yield generation.'
            },
            'launchpads': {
                name: 'Launchpads',
                tokens: ['CAKE', 'SFP', 'BSCPAD', 'PAID', 'SEED', 'GAFI', 'DAO', 'LABS', 'TLM', 'SALE'],
                description: 'Platforms for launching new cryptocurrency projects and token sales.'
            },
            'ai': {
                name: 'AI',
                tokens: ['OCEAN', 'FET', 'AGIX', 'NMR', 'RLC', 'RAI', 'ALI', 'RNDR', 'GRT', 'API3'],
                description: 'Projects leveraging artificial intelligence and machine learning.'
            },
            'depin': {
                name: 'DePIN',
                tokens: ['FIL', 'AR', 'HNT', 'POKT', 'MOBX', 'IOST', 'GLM', 'STORJ', 'ANKR', 'PLA'],
                description: 'Decentralized Physical Infrastructure Networks.'
            },
            'privacy': {
                name: 'Privacy',
                tokens: ['XMR', 'ZEC', 'SCRT', 'ROSE', 'KEEP', 'NYM', 'MASK', 'PRQ', 'DERO', 'BEAM'],
                description: 'Privacy-focused cryptocurrencies and protocols.'
            },
            'memes': {
                name: 'Memes',
                tokens: ['DOGE', 'SHIB', 'FLOKI', 'PEPE', 'BONK', 'WIF', 'MEME', 'WOJAK', 'SNEK', 'RATS'],
                description: 'Community-driven meme tokens and social currencies.'
            }
        };
        
        this.currentSector = 'gaming';
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.lastUpdate = 0;
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        await this.checkForUpdate();
        setInterval(() => this.checkForUpdate(), this.updateInterval);
    }

    setupEventListeners() {
        const buttons = document.querySelectorAll('.sector-btn');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const sector = e.target.dataset.sector;
                this.switchSector(sector);
            });
        });
    }

    async switchSector(sector) {
        if (!this.sectors[sector]) return;
        
        // Update active button
        document.querySelectorAll('.sector-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sector === sector);
        });

        this.currentSector = sector;
        await this.loadSectorData();
        await this.generateSectorInsights();
    }

    async loadSectorData() {
        try {
            const sectorTokens = this.sectors[this.currentSector].tokens;
            const tickerPromises = sectorTokens.map(async token => {
                try {
                    const symbol = token.toLowerCase() + 'usdt';
                    const response = await fetch(`${HTX_CONFIG.BASE_URL}${HTX_CONFIG.ENDPOINTS.TICKER}?symbol=${symbol}`);
                    if (!response.ok) return null;
                    const data = await response.json();
                    if (data.status === 'ok' && data.tick) {
                        return {
                            symbol: token + 'USDT',
                            lastPrice: data.tick.close,
                            priceChange: data.tick.close - data.tick.open,
                            priceChangePercent: ((data.tick.close - data.tick.open) / data.tick.open * 100).toFixed(2),
                            volume: data.tick.amount,
                            quoteVolume: data.tick.vol,
                            count: data.tick.count
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error fetching data for ${token}:`, error);
                    return null;
                }
            });
            
            const responses = await Promise.all(tickerPromises);
            const data = responses.filter(Boolean);

            const sectorData = this.calculateSectorMetrics(data);
            this.updateSectorUI(sectorData);
            this.updateTopPerformersForSector(data);
        } catch (error) {
            console.error('Error loading sector data:', error);
            this.updateSectorUI({
                marketCap: 'Error loading',
                volume: 'Error loading',
                change: 'N/A',
                dominance: 'N/A',
                trends: 'Error loading sector trends',
                structure: 'Error loading market structure',
                opportunities: 'Error loading opportunities',
                topAssets: []
            });
        }
    }

    calculateSectorMetrics(data) {
        const sector = this.sectors[this.currentSector];
        let totalMarketCap = 0;
        let totalVolume = 0;
        let totalChange = 0;
        let validTokens = 0;

        sector.tokens.forEach(token => {
            const ticker = data.find(t => t.symbol === `${token}USDT`);
            if (ticker) {
                const price = parseFloat(ticker.lastPrice);
                const volume = parseFloat(ticker.volume);
                const change = parseFloat(ticker.priceChangePercent);

                if (!isNaN(price) && !isNaN(volume) && !isNaN(change)) {
                    totalMarketCap += price * volume; // Approximate market cap
                    totalVolume += volume;
                    totalChange += change;
                    validTokens++;
                }
            }
        });

        return {
            marketCap: totalMarketCap,
            volume: totalVolume,
            change: validTokens > 0 ? totalChange / validTokens : 0,
            dominance: (totalMarketCap / this.calculateTotalMarketCap(data)) * 100
        };
    }

    calculateTotalMarketCap(data) {
        return data.reduce((total, ticker) => {
            const price = parseFloat(ticker.lastPrice);
            const volume = parseFloat(ticker.volume);
            return total + (price * volume);
        }, 0);
    }

    updateSectorUI(data) {
        try {
            if (!data) return;

            // Get DOM elements
            const sectorNameEl = document.getElementById('sectorName');
            const sectorChangeEl = document.getElementById('sectorChange');
            const sectorVolumeEl = document.getElementById('sectorVolume');
            const sectorMarketCapEl = document.getElementById('sectorMarketCap');

            // Check if elements exist before updating
            if (!sectorNameEl || !sectorChangeEl || !sectorVolumeEl || !sectorMarketCapEl) {
                console.warn('Sector UI elements not found, skipping update');
                return;
            }

            // Update sector metrics
            const changeValue = typeof data.change === 'number' ? data.change.toFixed(2) + '%' : '0%';
            const changeClass = parseFloat(changeValue) >= 0 ? 'positive' : 'negative';
            
            // Update DOM elements
            sectorNameEl.textContent = data.name || 'Loading...';
            sectorChangeEl.textContent = changeValue;
            sectorChangeEl.className = `change ${changeClass}`;
            sectorVolumeEl.textContent = data.volume || 'Loading...';
            sectorMarketCapEl.textContent = data.marketCap || 'Loading...';
        } catch (error) {
            console.error('Error updating sector UI:', error);
        }
    }

    async generateSectorInsights() {
        const sector = this.sectors[this.currentSector];
        
        // Generate trends insight
        const trendsEl = document.getElementById('sectorTrends');
        if (trendsEl) {
            trendsEl.textContent = `${sector.name} sector shows significant activity with evolving market dynamics. ${sector.description}`;
        }

        // Generate market structure insight
        const structureEl = document.getElementById('marketStructure');
        if (structureEl) {
            structureEl.textContent = `Market structure analysis for ${sector.name} tokens indicates key support and resistance levels. Monitor volume profiles for potential breakouts.`;
        }

        // Generate opportunities insight
        const opportunitiesEl = document.getElementById('sectorOpportunities');
        if (opportunitiesEl) {
            opportunitiesEl.textContent = `Watch for emerging opportunities in ${sector.name} tokens showing strong fundamentals and technical setups. Consider dollar-cost averaging during market dips.`;
        }
    }

    updateTopPerformersForSector(data) {
        const sector = this.sectors[this.currentSector];
        const performers = sector.tokens
            .map(token => {
                const ticker = data.find(t => t.symbol === `${token}USDT`);
                if (!ticker) return null;
                return {
                    symbol: token,
                    change: parseFloat(ticker.priceChangePercent).toFixed(2),
                    price: ticker.lastPrice,
                    volume: ticker.volume
                };
            })
            .filter(token => token !== null)
            .sort((a, b) => parseFloat(b.change) - parseFloat(a.change))
            .slice(0, 10);

        this.updateTopPerformersUI(performers);
    }

    formatCurrency(value) {
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toFixed(2)}`;
    }

    async checkForUpdate() {
        const now = Date.now();
        if (now - this.lastUpdate >= this.updateInterval) {
            await this.loadSectorData();
            this.lastUpdate = now;
        }
    }

    updateTopPerformersUI(performers) {
        const container = document.getElementById('topAssetsList');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Add each performer
        performers.forEach(({ symbol, change, price, volume }) => {
            const row = document.createElement('div');
            row.className = 'asset-row';
            
            // Get trend based on 24h change
            const trend = parseFloat(change) >= 0 ? 'bullish' : 'bearish';
            const trendIcon = parseFloat(change) >= 0 ? '📈' : '📉';
            
            row.innerHTML = `
                <span class="asset-name">${symbol}</span>
                <span class="asset-price">$${price || '0.00'}</span>
                <span class="asset-change ${parseFloat(change) >= 0 ? 'positive' : 'negative'}">${change}%</span>
                <span class="asset-volume">${this.formatVolume(volume || 0)}</span>
                <span class="asset-trend ${trend}">${trendIcon}</span>
            `;
            container.appendChild(row);
        });

        // Add CSS if not already present
        if (!document.getElementById('sectorAnalysisStyles')) {
            const style = document.createElement('style');
            style.id = 'sectorAnalysisStyles';
            style.textContent = `
                .asset-row {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    align-items: center;
                }
                .asset-row:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
                .asset-name {
                    font-weight: 500;
                }
                .asset-price {
                    font-family: monospace;
                }
                .asset-change.positive {
                    color: #00ff88;
                }
                .asset-change.negative {
                    color: #ff4d4d;
                }
                .asset-volume {
                    color: #888;
                }
                .asset-trend {
                    text-align: center;
                }
                .asset-trend.bullish {
                    color: #00ff88;
                }
                .asset-trend.bearish {
                    color: #ff4d4d;
                }
            `;
            document.head.appendChild(style);
        }
    }

    formatVolume(volume) {
        if (volume < 1000) return volume.toFixed(2);
        if (volume < 1000000) return (volume / 1000).toFixed(2) + 'K';
        return (volume / 1000000).toFixed(2) + 'M';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sectorAnalysis = new SectorAnalysis();
});
