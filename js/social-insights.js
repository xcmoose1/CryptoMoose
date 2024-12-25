// Social Insights Service
import apiConfig from './api-config.js';
import { vader } from './vader.js';

class SocialInsightsService {
    constructor() {
        this.REDDIT_API_BASE = 'https://www.reddit.com/r/cryptocurrency/hot.json';
        this.CRYPTOPANIC_API = 'https://cryptopanic.com/api/v1/posts/';
        this.FEAR_GREED_API = 'https://api.alternative.me/fng/';
        
        // Initialize VADER Sentiment Analyzer
        this.vader = new vader.SentimentIntensityAnalyzer();
    }

    async getRedditTrends() {
        try {
            const response = await fetch(`${this.REDDIT_API_BASE}?limit=100`);
            const data = await response.json();
            const posts = data.data.children.map(child => child.data);
            
            // Analyze posts
            const trends = this.analyzePosts(posts);
            return trends;
        } catch (error) {
            console.error('Error fetching Reddit trends:', error);
            return null;
        }
    }

    analyzePosts(posts) {
        const topics = {};
        
        posts.forEach(post => {
            // Get sentiment scores
            const sentiment = this.vader.polarity_scores(post.title);
            
            // Categorize post
            const category = this.categorizePost(post.title);
            
            if (!topics[category]) {
                topics[category] = {
                    mentions: 0,
                    sentiment: 0,
                    upvotes: 0,
                    posts: []
                };
            }
            
            topics[category].mentions++;
            topics[category].sentiment += sentiment.compound;
            topics[category].upvotes += post.ups;
            topics[category].posts.push({
                title: post.title,
                url: post.url,
                sentiment: sentiment.compound
            });
        });

        // Calculate average sentiment and sort by mentions
        return Object.entries(topics)
            .map(([topic, data]) => ({
                topic,
                mentions: data.mentions,
                sentiment: data.sentiment / data.mentions,
                upvotes: data.upvotes,
                posts: data.posts
            }))
            .sort((a, b) => b.mentions - a.mentions);
    }

    categorizePost(title) {
        const categories = {
            'L2': ['layer 2', 'l2', 'arbitrum', 'optimism', 'scaling'],
            'DeFi': ['defi', 'yield', 'lending', 'dao'],
            'Gaming': ['gaming', 'gamefi', 'p2e', 'play to earn'],
            'NFT': ['nft', 'digital art', 'collectible'],
            'Meme': ['doge', 'shib', 'pepe', 'meme']
        };

        title = title.toLowerCase();
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => title.includes(keyword))) {
                return category;
            }
        }
        return 'Other';
    }

    async getCryptoPanicNews() {
        try {
            const response = await fetch(`${this.CRYPTOPANIC_API}?public=true`);
            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error('Error fetching CryptoPanic news:', error);
            return null;
        }
    }

    async getFearGreedIndex() {
        try {
            const response = await fetch(this.FEAR_GREED_API);
            const data = await response.json();
            return data.data[0];
        } catch (error) {
            console.error('Error fetching Fear & Greed Index:', error);
            return null;
        }
    }

    async getAllInsights() {
        try {
            const [
                redditTrends,
                cryptoPanicNews,
                fearGreedIndex,
                alphaVantageNews,
                finnhubSentiment
            ] = await Promise.all([
                this.getRedditTrends(),
                this.getCryptoPanicNews(),
                this.getFearGreedIndex(),
                apiConfig.getCryptoNews(),
                apiConfig.getCryptoSentiment('BINANCE:BTCUSDT')
            ]);

            // Combine all data sources for better insights
            const combinedTrends = this.combineTrends(
                redditTrends,
                alphaVantageNews,
                finnhubSentiment
            );

            return {
                trends: combinedTrends,
                news: cryptoPanicNews,
                fearGreed: fearGreedIndex
            };
        } catch (error) {
            console.error('Error getting all insights:', error);
            return null;
        }
    }

    combineTrends(redditTrends, alphaNews, finnhubSentiment) {
        const combined = { ...redditTrends };

        // Add AlphaVantage news sentiment
        if (alphaNews?.feed) {
            alphaNews.feed.forEach(item => {
                const category = this.categorizePost(item.title);
                if (combined[category]) {
                    combined[category].mentions++;
                    combined[category].sentiment += this.vader.polarity_scores(item.title).compound;
                    combined[category].sources = combined[category].sources || [];
                    combined[category].sources.push({
                        title: item.title,
                        url: item.url,
                        source: 'AlphaVantage'
                    });
                }
            });
        }

        // Add Finnhub sentiment
        if (finnhubSentiment) {
            Object.keys(combined).forEach(category => {
                combined[category].marketSentiment = finnhubSentiment.sentiment;
            });
        }

        return combined;
    }

    generateActionItems(trends, fearGreedIndex) {
        const actions = [];
        
        // Analyze top trends
        trends.forEach(trend => {
            if (trend.sentiment > 0.5 && trend.mentions > 10) {
                actions.push({
                    type: 'research',
                    icon: 'search',
                    title: `Research ${trend.topic}`,
                    description: `Strong positive sentiment with ${trend.mentions} mentions. Consider researching ${trend.topic} projects.`
                });
            } else if (trend.sentiment < -0.3 && trend.mentions > 10) {
                actions.push({
                    type: 'caution',
                    icon: 'shield-alt',
                    title: `Monitor ${trend.topic}`,
                    description: `Negative sentiment detected. Monitor ${trend.topic} developments before making decisions.`
                });
            }
        });

        // Add Fear & Greed based action
        if (fearGreedIndex.value < 20) {
            actions.push({
                type: 'opportunity',
                icon: 'clock',
                title: 'Extreme Fear',
                description: 'Market in extreme fear. Historical buying opportunity, but maintain caution.'
            });
        } else if (fearGreedIndex.value > 80) {
            actions.push({
                type: 'warning',
                icon: 'exclamation-triangle',
                title: 'Extreme Greed',
                description: 'Market showing extreme greed. Consider taking profits or reducing exposure.'
            });
        }

        return actions;
    }
}

// Initialize and export service
const socialInsights = new SocialInsightsService();
export default socialInsights;
