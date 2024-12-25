// UI Updater Service
import socialInsights from './social-insights.js';

class UIUpdater {
    constructor() {
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
    }

    async initialize() {
        await this.updateAll();
        setInterval(() => this.updateAll(), this.updateInterval);
    }

    async updateAll() {
        const [trends, news, fearGreed] = await Promise.all([
            socialInsights.getRedditTrends(),
            socialInsights.getCryptoPanicNews(),
            socialInsights.getFearGreedIndex()
        ]);

        if (trends) this.updateNarratives(trends);
        if (news) this.updateSentiment(news, fearGreed);
        
        const actions = socialInsights.generateActionItems(trends, fearGreed);
        this.updateActionItems(actions);
    }

    updateNarratives(trends) {
        const narrativeCards = document.querySelector('.narrative-cards');
        narrativeCards.innerHTML = '';

        trends.slice(0, 3).forEach(trend => {
            const sentimentClass = trend.sentiment > 0.2 ? 'hot' : 
                                 trend.sentiment < -0.2 ? 'cold' : 'neutral';
            
            const sentimentPercent = Math.round((trend.sentiment + 1) * 50); // Convert to 0-100 scale
            const icon = trend.sentiment > 0 ? 'arrow-up' : 
                        trend.sentiment < 0 ? 'arrow-down' : 'minus';

            const card = document.createElement('div');
            card.className = `narrative-card ${sentimentClass}`;
            card.innerHTML = `
                <div class="narrative-header">
                    <span class="trend-badge">
                        <i class="fas fa-${icon}"></i> ${sentimentPercent}% ${
                            sentimentClass === 'hot' ? 'Bullish' :
                            sentimentClass === 'cold' ? 'Bearish' : 'Neutral'
                        }
                    </span>
                    <span class="mention-count">${trend.mentions} mentions</span>
                </div>
                <h4>${trend.topic}</h4>
                <p>${this.generateTrendDescription(trend)}</p>
                <div class="key-voices">
                    <small>Top Posts: ${this.formatTopPosts(trend.posts)}</small>
                </div>
            `;
            narrativeCards.appendChild(card);
        });
    }

    generateTrendDescription(trend) {
        const sentiment = trend.sentiment > 0 ? 'positive' :
                         trend.sentiment < 0 ? 'negative' : 'mixed';
        const intensity = Math.abs(trend.sentiment) > 0.5 ? 'strong' : 'moderate';
        
        return `Community showing ${intensity} ${sentiment} sentiment. ${
            trend.mentions} community discussions with ${trend.upvotes} total upvotes.`;
    }

    formatTopPosts(posts) {
        return posts.slice(0, 2)
            .map(post => `<a href="${post.url}" target="_blank">${
                post.title.length > 50 ? post.title.substring(0, 47) + '...' : post.title
            }</a>`)
            .join(' • ');
    }

    updateSentiment(news, fearGreed) {
        const bullishList = document.querySelector('.sentiment-card .positive + .sentiment-list');
        const bearishList = document.querySelector('.sentiment-card .negative + .sentiment-list');

        // Clear existing lists
        bullishList.innerHTML = '';
        bearishList.innerHTML = '';

        // Analyze news sentiment
        const analyzedNews = news.map(item => ({
            ...item,
            sentiment: socialInsights.vader.polarity_scores(item.title).compound
        }));

        // Add bullish signals
        const bullishNews = analyzedNews.filter(item => item.sentiment > 0)
            .sort((a, b) => b.sentiment - a.sentiment)
            .slice(0, 3);

        bullishNews.forEach(item => {
            const strength = item.sentiment > 0.5 ? '↑↑↑' : 
                           item.sentiment > 0.3 ? '↑↑' : '↑';
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="signal-strength">${strength}</span>
                ${item.title}
            `;
            bullishList.appendChild(li);
        });

        // Add bearish signals
        const bearishNews = analyzedNews.filter(item => item.sentiment < 0)
            .sort((a, b) => a.sentiment - b.sentiment)
            .slice(0, 3);

        bearishNews.forEach(item => {
            const strength = item.sentiment < -0.5 ? '↓↓↓' : 
                           item.sentiment < -0.3 ? '↓↓' : '↓';
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="signal-strength">${strength}</span>
                ${item.title}
            `;
            bearishList.appendChild(li);
        });

        // Add Fear & Greed Index if available
        if (fearGreed) {
            const sentiment = fearGreed.value < 20 ? 'Extreme Fear' :
                            fearGreed.value < 40 ? 'Fear' :
                            fearGreed.value < 60 ? 'Neutral' :
                            fearGreed.value < 80 ? 'Greed' : 'Extreme Greed';
            
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="signal-strength">${fearGreed.value < 50 ? '↓' : '↑'}</span>
                Fear & Greed Index: ${sentiment} (${fearGreed.value})
            `;
            (fearGreed.value < 50 ? bearishList : bullishList).appendChild(li);
        }
    }

    updateActionItems(actions) {
        const actionCards = document.querySelector('.action-cards');
        actionCards.innerHTML = '';

        actions.forEach(action => {
            const card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = `
                <div class="action-icon">
                    <i class="fas fa-${action.icon}"></i>
                </div>
                <div class="action-content">
                    <h4>${action.title}</h4>
                    <p>${action.description}</p>
                </div>
            `;
            actionCards.appendChild(card);
        });
    }
}

// Initialize and start updates
const uiUpdater = new UIUpdater();
document.addEventListener('DOMContentLoaded', () => uiUpdater.initialize());
