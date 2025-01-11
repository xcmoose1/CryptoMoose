import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Cache management with rate limiting
const cache = {
    ido: { data: null, timestamp: null },
    staking: { data: null, timestamp: null },
    nft: { data: null, timestamp: null },
    governance: { data: null, timestamp: null },
    idoCalendar: { data: null, timestamp: null, requestCount: 0, lastRequestTime: null }
};

// Constants for rate limiting
const RATE_LIMIT = {
    REQUESTS_PER_MINUTE: 100,
    DAILY_CREDITS: 400,
    MONTHLY_CREDITS: 10000
};

// Cache duration increased to reduce API calls
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Rate limiting function
function canMakeRequest(key) {
    const now = Date.now();
    const cacheEntry = cache[key];

    // Initialize request tracking if not exists
    if (!cacheEntry.requestCount || !cacheEntry.lastRequestTime) {
        cacheEntry.requestCount = 0;
        cacheEntry.lastRequestTime = now;
    }

    // Reset counter if a minute has passed
    if (now - cacheEntry.lastRequestTime >= 60000) {
        cacheEntry.requestCount = 0;
        cacheEntry.lastRequestTime = now;
    }

    // Check if we're within rate limits
    if (cacheEntry.requestCount >= RATE_LIMIT.REQUESTS_PER_MINUTE) {
        return false;
    }

    cacheEntry.requestCount++;
    return true;
}

async function fetchWithCache(key, fetchFunction) {
    const now = Date.now();
    
    // Return cached data if valid
    if (cache[key].data && cache[key].timestamp && (now - cache[key].timestamp < CACHE_DURATION)) {
        return cache[key].data;
    }

    // Check rate limits before making request
    if (!canMakeRequest(key)) {
        console.warn(`Rate limit exceeded for ${key}. Using cached data if available.`);
        return cache[key].data || [];
    }

    try {
        const data = await fetchFunction();
        cache[key] = {
            data,
            timestamp: now,
            requestCount: (cache[key].requestCount || 0) + 1,
            lastRequestTime: now
        };
        return data;
    } catch (error) {
        console.error(`Error fetching ${key} data:`, error);
        // Return cached data if available, empty array if not
        return cache[key].data || [];
    }
}

// IDO/ICO Data using CoinGecko
async function fetchIDOData() {
    try {
        // Get trending coins from CoinGecko
        const response = await fetch('https://api.coingecko.com/api/v3/search/trending');
        const data = await response.json();
        
        // Transform the data to match our needs
        return data.coins.map(coin => ({
            name: coin.item.name,
            symbol: coin.item.symbol.toUpperCase(),
            market_cap_rank: coin.item.market_cap_rank,
            price_btc: coin.item.price_btc,
            thumb: coin.item.thumb,
            score: coin.item.score
        }));
    } catch (error) {
        console.error('Error fetching IDO data:', error);
        return [];
    }
}

// Staking and Yield Data using DefiLlama's free API
async function fetchStakingData() {
    try {
        const response = await fetch('https://api.llama.fi/protocols');
        const data = await response.json();
        
        // Filter and sort by TVL
        return data
            .filter(protocol => protocol.category === 'Staking' || protocol.category === 'Yield')
            .sort((a, b) => b.tvl - a.tvl)
            .slice(0, 10)
            .map(protocol => ({
                name: protocol.name,
                tvl: protocol.tvl,
                category: protocol.category,
                chain: protocol.chain
            }));
    } catch (error) {
        console.error('Error fetching staking data:', error);
        return [];
    }
}

// NFT Data using OpenSea's free API endpoints
async function fetchNFTData() {
    try {
        // Use CoinGecko's NFT data as alternative
        const response = await fetch('https://api.coingecko.com/api/v3/nfts/list');
        const data = await response.json();
        
        return data.slice(0, 10).map(nft => ({
            name: nft.name,
            symbol: nft.symbol,
            contract_address: nft.contract_address,
            asset_platform_id: nft.asset_platform_id
        }));
    } catch (error) {
        console.error('Error fetching NFT data:', error);
        return [];
    }
}

// Governance Data using Snapshot's public GraphQL API
async function fetchGovernanceData() {
    try {
        const response = await fetch('https://hub.snapshot.org/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                    query {
                        proposals(
                            first: 10,
                            skip: 0,
                            where: {
                                state: "active"
                            }
                            orderBy: "created",
                            orderDirection: desc
                        ) {
                            id
                            title
                            body
                            choices
                            start
                            end
                            state
                            space {
                                id
                                name
                            }
                        }
                    }
                `
            }),
        });

        const data = await response.json();
        return data.data.proposals;
    } catch (error) {
        console.error('Error fetching governance data:', error);
        return [];
    }
}

// IDO/ICO Calendar Data using CryptoRank API with rate limiting
async function fetchIDOCalendar() {
    return fetchWithCache('idoCalendar', async () => {
        try {
            const API_KEY = process.env.CRYPTORANK_API_KEY;
            if (!API_KEY) {
                console.error('CRYPTORANK_API_KEY not found in environment variables');
                return [];
            }

            // CryptoRank API endpoints with API key
            const endpoints = [
                `https://api.cryptorank.io/v1/ico-projects?api_key=${API_KEY}&limit=100&state=upcoming`,
                `https://api.cryptorank.io/v1/ico-projects?api_key=${API_KEY}&limit=100&state=ongoing`
            ];

            // Fetch data from all endpoints with delay between requests
            const combinedData = [];
            for (const url of endpoints) {
                try {
                    console.log('Fetching data from:', url.replace(API_KEY, '***'));
                    const response = await fetch(url);
                    const responseData = await response.json();
                    
                    if (responseData.status?.errorCode) {
                        console.error('CryptoRank API error:', responseData.status);
                        continue;
                    }
                    
                    if (!responseData.data) {
                        console.warn('No data in response from CryptoRank API');
                        continue;
                    }

                    responseData.data.forEach(item => {
                        // Convert dates to ISO format
                        const startDate = item.icoStart ? new Date(item.icoStart * 1000).toISOString() : null;
                        const endDate = item.icoEnd ? new Date(item.icoEnd * 1000).toISOString() : null;

                        if (!startDate || !endDate) {
                            console.warn(`Skipping IDO ${item.name} due to missing dates`);
                            return;
                        }

                        const processedItem = {
                            name: item.name || 'Unknown Project',
                            symbol: item.symbol || '???',
                            description: item.description || 'No description available',
                            startDate: startDate,
                            endDate: endDate,
                            price: {
                                value: item.price || 0,
                                currency: item.currency || 'USD'
                            },
                            platform: item.platform || 'Unknown',
                            category: item.category || 'Other',
                            website: item.links?.website || null,
                            whitepaper: item.links?.whitepaper || null,
                            social: {
                                telegram: item.links?.telegram || null,
                                twitter: item.links?.twitter || null,
                                discord: item.links?.discord || null,
                                medium: item.links?.medium || null
                            },
                            tokenMetrics: {
                                totalSupply: item.totalSupply || 0,
                                initialSupply: item.initialSupply || 0,
                                initialMarketCap: item.initialMarketCap || 0,
                                price: item.price || 0
                            },
                            fundingStages: (item.fundingStages || []).map(stage => ({
                                name: stage.name || 'Unknown Stage',
                                price: stage.price || 0,
                                start: stage.start ? new Date(stage.start * 1000).toISOString() : null,
                                end: stage.end ? new Date(stage.end * 1000).toISOString() : null,
                                raised: stage.raised || 0
                            })),
                            kycRequired: item.kycRequired || false,
                            restrictions: item.restrictions || [],
                            status: item.status || 'upcoming'
                        };

                        // Add risk assessment
                        processedItem.riskAssessment = {
                            level: assessRiskLevel(processedItem),
                            factors: getRiskFactors(processedItem)
                        };

                        combinedData.push(processedItem);
                    });
                } catch (error) {
                    console.error('Error processing endpoint:', url.replace(API_KEY, '***'), error);
                }
                
                // Add delay between requests to stay within rate limits
                await new Promise(resolve => setTimeout(resolve, 600));
            }

            // Sort by start date
            combinedData.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            console.log(`Successfully fetched ${combinedData.length} IDO projects`);
            return combinedData;
        } catch (error) {
            console.error('Error fetching IDO calendar:', error);
            return [];
        }
    });
}

// Enhanced risk assessment based on more data points
function assessRiskLevel(project) {
    let riskScore = 0;
    
    // Essential information
    if (!project.website) riskScore += 2;
    if (!project.description) riskScore += 1;
    if (!project.whitepaper) riskScore += 2;
    
    // Social presence
    let socialScore = 0;
    if (project.social.telegram) socialScore++;
    if (project.social.twitter) socialScore++;
    if (project.social.discord) socialScore++;
    if (project.social.medium) socialScore++;
    if (socialScore < 2) riskScore += 2;
    
    // Token metrics
    if (!project.tokenMetrics.totalSupply || !project.tokenMetrics.initialSupply) riskScore += 1;
    if (!project.tokenMetrics.initialMarketCap) riskScore += 1;
    
    // Platform reputation
    const reputablePlatforms = ['Binance', 'Coinlist', 'Polkastarter', 'DAOMaker', 'PinkSale'];
    if (!reputablePlatforms.includes(project.platform)) riskScore += 1;
    
    // KYC and restrictions
    if (!project.kycRequired) riskScore += 2;
    if (project.restrictions?.length > 0) riskScore += 1;
    
    // Categorize risk
    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
}

// Enhanced risk factors
function getRiskFactors(project) {
    const factors = [];
    
    if (!project.website) factors.push('No official website');
    if (!project.description) factors.push('Limited project information');
    if (!project.whitepaper) factors.push('No whitepaper available');
    
    let socialCount = 0;
    if (project.social.telegram) socialCount++;
    if (project.social.twitter) socialCount++;
    if (project.social.discord) socialCount++;
    if (project.social.medium) socialCount++;
    if (socialCount < 2) factors.push('Limited social media presence');
    
    if (!project.tokenMetrics.totalSupply || !project.tokenMetrics.initialSupply) {
        factors.push('Incomplete token metrics');
    }
    
    if (!project.tokenMetrics.initialMarketCap) {
        factors.push('Initial market cap not disclosed');
    }
    
    if (!project.kycRequired) {
        factors.push('No KYC requirements');
    }
    
    if (project.restrictions?.length > 0) {
        factors.push('Geographic restrictions apply');
    }
    
    return factors;
}

// Combined data fetch
async function getAllOpportunities() {
    try {
        const [ido, staking, nft, governance, idoCalendar] = await Promise.all([
            fetchWithCache('ido', fetchIDOData),
            fetchWithCache('staking', fetchStakingData),
            fetchWithCache('nft', fetchNFTData),
            fetchWithCache('governance', fetchGovernanceData),
            fetchWithCache('idoCalendar', fetchIDOCalendar)
        ]);

        return {
            ido,
            staking,
            nft,
            governance,
            idoCalendar,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        throw error;
    }
}

export { 
    getAllOpportunities, 
    fetchIDOData, 
    fetchStakingData, 
    fetchNFTData, 
    fetchGovernanceData,
    fetchIDOCalendar 
};
