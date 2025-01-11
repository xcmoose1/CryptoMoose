import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default class GemHunterService {
    constructor() {
        this.COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        this.WATCHLIST_FILE = path.join(process.cwd(), 'data', 'watchlist.json');
        this.CACHE_FILE = path.join(process.cwd(), 'data', 'gem_cache.json');
        this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        this.axios = axios.create({
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'CryptoMoose/1.0'
            }
        });
        this.ensureFilesExist();
    }

    ensureFilesExist() {
        const dataDir = path.dirname(this.WATCHLIST_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Ensure watchlist file exists
        if (!fs.existsSync(this.WATCHLIST_FILE)) {
            fs.writeFileSync(this.WATCHLIST_FILE, JSON.stringify({
                gems: [],
                lastUpdated: new Date().toISOString()
            }));
        }
        
        // Ensure cache file exists
        if (!fs.existsSync(this.CACHE_FILE)) {
            fs.writeFileSync(this.CACHE_FILE, JSON.stringify({
                gems: [],
                lastUpdated: null
            }));
        }
    }

    async getWatchlist() {
        try {
            const data = JSON.parse(fs.readFileSync(this.WATCHLIST_FILE, 'utf8'));
            return data.gems || [];
        } catch (error) {
            console.error('Error reading watchlist:', error);
            return [];
        }
    }

    async addToWatchlist(gem) {
        try {
            const watchlist = await this.getWatchlist();
            const exists = watchlist.some(g => g.symbol === gem.symbol);
            
            if (!exists) {
                gem.addedAt = new Date().toISOString();
                gem.initialPrice = gem.price;
                gem.initialMarketCap = gem.marketCap;
                watchlist.push(gem);
                
                fs.writeFileSync(this.WATCHLIST_FILE, JSON.stringify({
                    gems: watchlist,
                    lastUpdated: new Date().toISOString()
                }, null, 2));
            }
        } catch (error) {
            console.error('Error adding to watchlist:', error);
        }
    }

    async removeFromWatchlist(symbol) {
        try {
            const watchlist = await this.getWatchlist();
            const updatedWatchlist = watchlist.filter(g => g.symbol !== symbol);
            
            fs.writeFileSync(this.WATCHLIST_FILE, JSON.stringify({
                gems: updatedWatchlist,
                lastUpdated: new Date().toISOString()
            }, null, 2));
        } catch (error) {
            console.error('Error removing from watchlist:', error);
        }
    }

    async getTrendingGems() {
        try {
            console.log('Fetching from CoinGecko...');
            
            // Get fresh data from CoinGecko
            const response = await this.axios.get(
                `${this.COINGECKO_API_URL}/coins/markets`, {
                    params: {
                        vs_currency: 'usd',
                        order: 'volume_desc',
                        per_page: 250,
                        page: 1,
                        sparkline: false
                    }
                }
            );

            if (!Array.isArray(response.data)) {
                throw new Error('Invalid response from CoinGecko');
            }

            console.log(`Found ${response.data.length} coins`);

            const processedCoins = response.data
                .filter(coin => {
                    const marketCap = parseFloat(coin.market_cap || 0);
                    const volume24h = parseFloat(coin.total_volume || 0);
                    const volumeToMcap = volume24h / marketCap;
                    const priceChange = parseFloat(coin.price_change_percentage_24h || 0);

                    // Exclude common rug pull patterns
                    if (volumeToMcap > 1.5) return false; // Very strict volume/mcap ratio
                    if (Math.abs(priceChange) > 25) return false; // Strict price change limit
                    if (marketCap < 300000) return false; // Higher minimum market cap
                    
                    // Exclude suspicious token names (common in rugs)
                    const suspiciousTerms = ['castle', 'diamond', 'moon', 'safe', 'gem', 'gold', 'rocket', 'elon'];
                    if (suspiciousTerms.some(term => 
                        coin.name.toLowerCase().includes(term) || 
                        coin.symbol.toLowerCase().includes(term)
                    )) {
                        return false;
                    }

                    // Exclude suspicious patterns
                    if (volumeToMcap > 2) return false; // More strict volume filter
                    if (Math.abs(coin.price_change_percentage_24h) > 30) return false; // More strict price change
                    if (marketCap < 200000) return false; // Higher min market cap

                    return (
                        marketCap <= 10000000 && // Max $10M mcap
                        volume24h > 1000 && // Minimum $1K volume
                        !coin.symbol.toLowerCase().includes('weth') && // Exclude wrapped ETH
                        !coin.symbol.toLowerCase().includes('wbtc') // Exclude wrapped BTC
                    );
                })
                .map(coin => {
                    try {
                        const score = this.calculateGemScore(coin);
                        // Only process coins with score > 65
                        if (score <= 65) return null;

                        const gem = {
                            name: coin.name,
                            symbol: coin.symbol.toUpperCase(),
                            marketCap: parseFloat(coin.market_cap || 0),
                            volume24h: parseFloat(coin.total_volume || 0),
                            priceChange24h: parseFloat(coin.price_change_percentage_24h || 0),
                            liquidity: parseFloat(coin.total_volume || 0) / 2,
                            price: parseFloat(coin.current_price || 0),
                            url: `https://www.coingecko.com/en/coins/${coin.id}`,
                            score: score,
                            redFlags: []
                        };

                        // Generate insights
                        gem.insights = this.generateFallbackInsights(gem);

                        // Auto-add to watchlist if score is very high
                        if (score >= 85) {
                            this.addToWatchlist(gem);
                        }

                        return gem;
                    } catch (err) {
                        console.error('Error processing coin:', err);
                        return null;
                    }
                })
                .filter(coin => coin !== null)
                .sort((a, b) => b.score - a.score) // Sort by score descending
                .slice(0, 6); // Get top 6 coins

            if (processedCoins.length === 0) {
                throw new Error('No coins matched the filtering criteria');
            }

            // Update cache with new data
            fs.writeFileSync(this.CACHE_FILE, JSON.stringify({
                gems: processedCoins,
                lastUpdated: new Date().toISOString()
            }, null, 2));

            console.log('Updated cache with new gems data');
            return processedCoins;

        } catch (error) {
            console.error('Error in getTrendingGems:', error);
            
            // If API call fails, try to return cached data even if expired
            try {
                const cache = JSON.parse(fs.readFileSync(this.CACHE_FILE, 'utf8'));
                if (cache.gems && cache.gems.length > 0) {
                    console.log('Returning expired cache data due to API error');
                    return cache.gems;
                }
            } catch (cacheError) {
                console.error('Error reading cache:', cacheError);
            }
            
            throw error;
        }
    }

    async generateGPTInsights(gem) {
        try {
            const prompt = `Analyze this cryptocurrency data and provide 2-3 concise, insightful observations about its potential as an investment opportunity. Be specific and analytical, focusing on the metrics provided. Keep each insight under 100 characters:

Token: ${gem.name} (${gem.symbol})
Market Cap: $${gem.marketCap.toLocaleString()}
24h Volume: $${gem.volume24h.toLocaleString()}
24h Price Change: ${gem.priceChange24h.toFixed(2)}%
Volume/MCap Ratio: ${(gem.volume24h/gem.marketCap).toFixed(2)}`;

            const response = await this.axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "You are a cryptocurrency analyst providing brief, data-driven insights about trading opportunities. Focus on market metrics and technical analysis. Be concise and specific."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 150
            }, {
                headers: {
                    'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const insights = response.data.choices[0].message.content
                .split('\n')
                .filter(line => line.trim())
                .slice(0, 2);

            return insights;
        } catch (error) {
            console.error('Error generating GPT insights:', error);
            return this.generateFallbackInsights(gem);
        }
    }

    calculateGemScore(coin) {
        try {
            // Base score starts at 50
            let score = 50;

            // Volume to Market Cap ratio (higher is better, but not too high)
            const volumeToMcap = (coin.total_volume || 0) / (coin.market_cap || 1);
            score += Math.min(35, volumeToMcap * 50); // Reasonable multiplier

            // Price change bonus/penalty
            const priceChange = parseFloat(coin.price_change_percentage_24h || 0);
            if (priceChange > 0) {
                score += Math.min(10, priceChange / 2);
            } else {
                score -= Math.min(10, Math.abs(priceChange) / 2);
            }

            // Market cap scoring (prefer smaller caps)
            const mcap = parseFloat(coin.market_cap || 0);
            if (mcap < 1000000) score += 15;        // < $1M
            else if (mcap < 5000000) score += 10;   // < $5M
            else if (mcap < 10000000) score += 5;   // < $10M

            // Volume scoring (prefer higher volume relative to market cap)
            const volumeScore = Math.min(15, (volumeToMcap * 20)); // Reasonable multiplier
            score += volumeScore;

            return Math.max(0, Math.min(100, Math.round(score)));
        } catch (error) {
            console.error('Error calculating gem score:', error);
            return 50; // Default score
        }
    }

    generateFallbackInsights(gem) {
        const insights = [];
        
        // Volume to Market Cap Analysis
        const volumeToMcap = (gem.volume24h || 0) / (gem.marketCap || 1);
        if (volumeToMcap > 1) {
            insights.push(`Strong trading activity with ${volumeToMcap.toFixed(1)}x daily volume vs market cap`);
        } else if (volumeToMcap > 0.5) {
            insights.push(`Healthy trading volume at ${(volumeToMcap * 100).toFixed(1)}% of market cap`);
        }

        // Price Movement Analysis
        if (gem.priceChange24h > 15) {
            insights.push(`Significant upward momentum with ${gem.priceChange24h.toFixed(1)}% gain`);
        } else if (gem.priceChange24h < -15) {
            insights.push(`Potential dip buying opportunity at ${gem.priceChange24h.toFixed(1)}% below recent price`);
        } else if (Math.abs(gem.priceChange24h) < 5) {
            insights.push(`Price consolidation phase with stable ${gem.priceChange24h.toFixed(1)}% movement`);
        }

        return insights.slice(0, 2);
    }

    getChainName(chainId) {
        const chainMap = {
            'ethereum': 'Ethereum',
            'bsc': 'BNB Chain',
            'polygon': 'Polygon',
            'arbitrum': 'Arbitrum',
            'optimism': 'Optimism',
            'avalanche': 'Avalanche',
            'fantom': 'Fantom',
            'base': 'Base'
        };
        return chainMap[chainId] || chainId;
    }

    getDexName(dexId) {
        if (!dexId) return 'Unknown DEX';
        return dexId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
