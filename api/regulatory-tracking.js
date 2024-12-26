import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Cache management
const cache = {
    risks: { data: null, timestamp: null },
    compliance: { data: null, timestamp: null },
    tax: { data: null, timestamp: null }
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour for regulatory data

async function fetchWithCache(key, fetchFunction) {
    const now = Date.now();
    if (cache[key].data && cache[key].timestamp && (now - cache[key].timestamp < CACHE_DURATION)) {
        return cache[key].data;
    }

    const data = await fetchFunction();
    cache[key] = {
        data,
        timestamp: now
    };
    return data;
}

// Legal Risk Data using CoinGecko's market data
async function fetchRiskData() {
    try {
        // Get market data from CoinGecko
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&sparkline=false&price_change_percentage=24h');
        const data = await response.json();
        
        // Process and categorize risks based on price volatility and market cap
        return data.map(coin => {
            const volatility = Math.abs(coin.price_change_percentage_24h);
            const marketCap = coin.market_cap;
            
            // Define risk levels
            let riskLevel = 'low';
            if (volatility > 20 || marketCap < 100000000) { // High volatility or small market cap
                riskLevel = 'high';
            } else if (volatility > 10 || marketCap < 1000000000) { // Medium volatility or medium market cap
                riskLevel = 'medium';
            }

            return {
                entity: coin.name,
                symbol: coin.symbol.toUpperCase(),
                riskLevel,
                marketCap,
                volatility,
                lastUpdated: coin.last_updated,
                description: `${coin.name} shows ${volatility.toFixed(2)}% 24h volatility with $${(marketCap/1000000).toFixed(2)}M market cap`
            };
        });
    } catch (error) {
        console.error('Error fetching risk data:', error);
        return [];
    }
}

// Compliance Status Data using exchange API status pages
async function fetchComplianceData() {
    try {
        const exchanges = [
            {
                name: 'Binance',
                api_status_url: 'https://api.binance.com/api/v3/time'
            },
            {
                name: 'Coinbase',
                api_status_url: 'https://api.pro.coinbase.com/time'
            },
            {
                name: 'Kraken',
                api_status_url: 'https://api.kraken.com/0/public/Time'
            }
        ];

        const results = await Promise.all(exchanges.map(async (exchange) => {
            try {
                const response = await fetch(exchange.api_status_url);
                return {
                    exchange: exchange.name,
                    status: response.ok ? 'operational' : 'issues',
                    kycRequired: true, // Most major exchanges require KYC
                    amlStatus: 'compliant',
                    restrictions: []
                };
            } catch (error) {
                return {
                    exchange: exchange.name,
                    status: 'issues',
                    kycRequired: true,
                    amlStatus: 'unknown',
                    restrictions: ['API unavailable']
                };
            }
        }));

        return results;
    } catch (error) {
        console.error('Error fetching compliance data:', error);
        return [];
    }
}

// Tax Guidelines Data (static data as free tax APIs are limited)
async function fetchTaxData() {
    // Return static tax guidelines for major regions
    return [
        {
            country: 'United States',
            cryptoTaxRate: 'Based on income tax bracket for < 1 year holds',
            nftTaxRate: '28% for collectibles',
            stakingTaxation: 'Taxed as income when received',
            miningTaxation: 'Taxed as self-employment income',
            reportingThreshold: '$10,000 for foreign accounts'
        },
        {
            country: 'European Union',
            cryptoTaxRate: 'Varies by country (0-50%)',
            nftTaxRate: 'Typically treated as digital assets',
            stakingTaxation: 'Usually taxed as income',
            miningTaxation: 'Generally business income',
            reportingThreshold: 'Varies by country'
        },
        {
            country: 'United Kingdom',
            cryptoTaxRate: 'Capital Gains Tax (10-20%)',
            nftTaxRate: 'Capital Gains Tax rates apply',
            stakingTaxation: 'Income Tax on receipt',
            miningTaxation: 'Trading or miscellaneous income',
            reportingThreshold: '£12,300 CGT allowance'
        }
    ];
}

// Combined regulatory data fetch
async function getAllRegulatoryData() {
    try {
        const [risks, compliance, tax] = await Promise.all([
            fetchWithCache('risks', fetchRiskData),
            fetchWithCache('compliance', fetchComplianceData),
            fetchWithCache('tax', fetchTaxData)
        ]);

        return {
            risks,
            compliance,
            tax,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error fetching regulatory data:', error);
        throw error;
    }
}

// Helper function to get high-risk alerts
async function getHighRiskAlerts() {
    const risks = await fetchWithCache('risks', fetchRiskData);
    return risks.filter(risk => risk.riskLevel === 'high');
}

export { 
    getAllRegulatoryData, 
    fetchRiskData, 
    fetchComplianceData, 
    fetchTaxData,
    getHighRiskAlerts 
};
