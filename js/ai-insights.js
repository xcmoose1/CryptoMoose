class AIInsights {
    constructor() {
        this.currentCoin = 'BTC';
        this.lastUpdated = new Date();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const coinSelect = document.getElementById('insightCoin');
        const refreshBtn = document.getElementById('refreshInsight');

        if (coinSelect) {
            coinSelect.addEventListener('change', (e) => {
                this.currentCoin = e.target.value;
                this.updateInsights();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateInsights();
                this.animateRefresh();
            });
        }
    }

    async updateInsights() {
        try {
            // Here we would normally make an API call to get insights
            // For now, we'll use mock data
            const insights = await this.fetchInsights(this.currentCoin);
            this.updateUI(insights);
            this.lastUpdated = new Date();
            this.updateLastUpdated();
        } catch (error) {
            console.error('Error updating insights:', error);
        }
    }

    async fetchInsights(coin) {
        // Mock API call - replace with actual API integration
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    technicalStance: 'Moderately Bullish',
                    metrics: {
                        rsi: 62,
                        macd: 'Bullish Cross',
                        volume: 'Above Avg'
                    },
                    priceLevels: {
                        resistance: ['85,200', '87,500', '90,000'],
                        support: ['81,800', '80,000', '78,500']
                    },
                    catalysts: [
                        'Spot ETF volume reaching new highs ($2.8B daily)',
                        'Mining difficulty increased 3.2% post-halving',
                        'Institutional inflows continue through Q1 2025'
                    ],
                    risks: [
                        'US bond yields rising (10Y at 4.8%)',
                        'Options market showing increased put volume at $80K',
                        'Short-term profit-taking possible at $85K resistance'
                    ],
                    outlook: 'High probability of testing $85K resistance given strong institutional buying and positive derivatives data. Watch for potential consolidation around $82-83K before next leg up. Risk/reward favors longs with tight stops below $80K.',
                    events: [
                        'Fed minutes release (Jan 8)',
                        'Q4 earnings from major crypto companies',
                        'European crypto regulation vote (Jan 12)'
                    ],
                    sentiment: 7.5
                });
            }, 1000);
        });
    }

    updateUI(insights) {
        // Update technical stance
        const stanceElement = document.querySelector('.stance-value');
        if (stanceElement) {
            stanceElement.textContent = insights.technicalStance;
            stanceElement.className = 'stance-value ' + this.getStanceClass(insights.technicalStance);
        }

        // Update metrics
        Object.entries(insights.metrics).forEach(([key, value]) => {
            const element = document.querySelector(`.metric .value[data-metric="${key}"]`);
            if (element) element.textContent = value;
        });

        // Update price levels
        ['resistance', 'support'].forEach(type => {
            const list = document.querySelector(`.${type} ul`);
            if (list && insights.priceLevels[type]) {
                list.innerHTML = insights.priceLevels[type]
                    .map(price => `<li>$${price}</li>`)
                    .join('');
            }
        });

        // Update catalysts
        const catalystsList = document.querySelector('.catalysts ul');
        if (catalystsList) {
            catalystsList.innerHTML = insights.catalysts
                .map(catalyst => `<li>${catalyst}</li>`)
                .join('');
        }

        // Update risks
        const risksList = document.querySelector('.risks ul');
        if (risksList) {
            risksList.innerHTML = insights.risks
                .map(risk => `<li>${risk}</li>`)
                .join('');
        }

        // Update outlook
        const outlookElement = document.querySelector('.outlook p');
        if (outlookElement) {
            outlookElement.textContent = insights.outlook;
        }

        // Update events
        const eventsList = document.querySelector('.events ul');
        if (eventsList) {
            eventsList.innerHTML = insights.events
                .map(event => `<li>${event}</li>`)
                .join('');
        }

        // Update sentiment score
        const scoreElement = document.querySelector('.sentiment-score .score');
        if (scoreElement) {
            scoreElement.textContent = insights.sentiment;
            scoreElement.className = 'score ' + this.getSentimentClass(insights.sentiment);
        }
    }

    getStanceClass(stance) {
        if (stance.toLowerCase().includes('bullish')) return 'bullish';
        if (stance.toLowerCase().includes('bearish')) return 'bearish';
        return 'neutral';
    }

    getSentimentClass(score) {
        if (score >= 7) return 'positive';
        if (score <= 4) return 'negative';
        return 'neutral';
    }

    updateLastUpdated() {
        const element = document.querySelector('.last-updated');
        if (element) {
            const timeAgo = this.getTimeAgo(this.lastUpdated);
            element.textContent = `Updated: ${timeAgo}`;
        }
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    animateRefresh() {
        const btn = document.getElementById('refreshInsight');
        if (btn) {
            btn.classList.add('rotating');
            setTimeout(() => btn.classList.remove('rotating'), 1000);
        }
    }
}

// Initialize AI Insights
document.addEventListener('DOMContentLoaded', () => {
    window.aiInsights = new AIInsights();
});
