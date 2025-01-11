import axios from 'axios';
import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

class SocialMetricsService {
    constructor() {
        this.CACHE_FILE = path.join(process.cwd(), 'data', 'social_metrics_cache.json');
        this.CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
        this.rssParser = new Parser();
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        
        // Initialize axios instance
        this.axios = axios.create({
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'CryptoMoose/1.0'
            }
        });

        this.ensureCacheFile();
    }

    ensureCacheFile() {
        if (!fs.existsSync(path.dirname(this.CACHE_FILE))) {
            fs.mkdirSync(path.dirname(this.CACHE_FILE), { recursive: true });
        }
        if (!fs.existsSync(this.CACHE_FILE)) {
            fs.writeFileSync(this.CACHE_FILE, JSON.stringify({
                lastUpdated: null,
                data: {}
            }));
        }
    }

    async getInfluencerTweets(username) {
        try {
            // Use Nitter's RSS feed
            const feed = await this.rssParser.parseURL(`https://nitter.net/${username}/rss`);
            return feed.items.slice(0, 5).map(item => ({
                text: item.content,
                date: new Date(item.pubDate),
                link: item.link
            }));
        } catch (error) {
            console.error(`Error fetching tweets for ${username}:`, error);
            return [];
        }
    }

    async getRedditSentiment(subreddit = 'cryptocurrency') {
        try {
            const response = await this.axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`);
            const posts = response.data.data.children;
            
            // Extract relevant data
            const redditData = posts.map(post => ({
                title: post.data.title,
                score: post.data.score,
                comments: post.data.num_comments,
                url: `https://reddit.com${post.data.permalink}`
            }));

            // Analyze sentiment using GPT-4
            const sentiment = await this.analyzeSentiment(
                redditData.map(post => post.title).join('\\n')
            );

            return {
                posts: redditData,
                sentiment
            };
        } catch (error) {
            console.error('Error fetching Reddit data:', error);
            return { posts: [], sentiment: null };
        }
    }

    async getGitHubActivity(repo) {
        try {
            const response = await this.axios.get(`https://api.github.com/repos/${repo}/events`);
            return response.data.slice(0, 10).map(event => ({
                type: event.type,
                actor: event.actor.login,
                date: new Date(event.created_at)
            }));
        } catch (error) {
            console.error(`Error fetching GitHub activity for ${repo}:`, error);
            return [];
        }
    }

    async getCryptoNews() {
        try {
            // Use CryptoCompare's free news API instead of CryptoPanic
            const response = await this.axios.get('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular');
            return response.data.Data.slice(0, 10).map(news => ({
                title: news.title,
                url: news.url,
                source: news.source_info?.name || news.source,
                date: new Date(news.published_on * 1000),
                categories: news.categories,
                sentiment: news.title.toLowerCase().includes('up') || news.title.toLowerCase().includes('bull') ? 'positive' :
                         news.title.toLowerCase().includes('down') || news.title.toLowerCase().includes('bear') ? 'negative' : 'neutral'
            }));
        } catch (error) {
            console.error('Error fetching crypto news:', error);
            return [];
        }
    }

    async analyzeSentiment(text) {
        try {
            const response = await this.axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "You are a cryptocurrency sentiment analyst. Analyze the given text and return a JSON object with: overall_sentiment (positive/negative/neutral), confidence_score (0-1), and key_topics (array of strings)."
                }, {
                    role: "user",
                    content: text
                }],
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error('Error analyzing sentiment:', error);
            return null;
        }
    }

    async getSocialMetrics() {
        try {
            // Check cache first
            const cache = JSON.parse(fs.readFileSync(this.CACHE_FILE));
            if (cache.lastUpdated && (Date.now() - new Date(cache.lastUpdated).getTime() < this.CACHE_DURATION)) {
                return cache.data;
            }

            // Fetch new data
            const [redditData, news] = await Promise.all([
                this.getRedditSentiment(),
                this.getCryptoNews()
            ]);

            // Fetch influencer tweets
            const influencers = ['cryptocred', 'cryptokaleo', 'pentosh1'];
            const tweets = await Promise.all(
                influencers.map(username => this.getInfluencerTweets(username))
            );

            const metrics = {
                reddit: redditData,
                news: news,
                tweets: tweets.flat(),
                lastUpdated: new Date().toISOString()
            };

            // Update cache
            fs.writeFileSync(this.CACHE_FILE, JSON.stringify({
                lastUpdated: new Date().toISOString(),
                data: metrics
            }, null, 2));

            return metrics;
        } catch (error) {
            console.error('Error getting social metrics:', error);
            throw error;
        }
    }
}

export default new SocialMetricsService();
