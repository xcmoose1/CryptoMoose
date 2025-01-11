// Social Metrics Module
class SocialMetricsUI {
    constructor() {
        this.initSentimentChart();
        this.initEventListeners();
        this.loadData();
    }

    async loadData() {
        try {
            // In a real app, this would be an API call
            const data = {
                sentiment: {
                    labels: ['7 Days Ago', '6 Days Ago', '5 Days Ago', '4 Days Ago', '3 Days Ago', '2 Days Ago', 'Today'],
                    values: [65, 70, 68, 72, 75, 71, 73]
                },
                influencers: [
                    {
                        name: 'CryptoAnalyst',
                        handle: '@CryptoExpert',
                        followers: '245K',
                        impact: 92,
                        category: 'all-stars'
                    },
                    {
                        name: 'TradingPro',
                        handle: '@ProTrader',
                        followers: '189K',
                        impact: 88,
                        category: 'top-traders'
                    }
                ],
                feed: [
                    {
                        author: 'CryptoAnalyst',
                        time: '5m ago',
                        content: 'Bitcoin showing strong support at current levels. Technical indicators suggest potential breakout in the next 24 hours.',
                        sentiment: 'positive'
                    }
                ],
                news: [
                    {
                        title: 'Bitcoin Shows Strong Support at Current Levels',
                        source: 'CryptoNews',
                        time: '5m ago',
                        sentiment: 'positive'
                    }
                ],
                topics: [
                    {
                        name: 'Layer 2 Solutions',
                        trend: 45,
                        mentions: '24.5K',
                        sentiment: 85
                    }
                ],
                insights: [
                    {
                        title: 'Bullish Signal Detected',
                        description: 'Multiple technical indicators showing bullish convergence',
                        confidence: 85
                    }
                ]
            };

            this.updateUI(data);
        } catch (error) {
            console.error('Error loading social metrics data:', error);
        }
    }

    initSentimentChart() {
        const ctx = document.getElementById('sentimentChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.sentimentChart) {
            this.sentimentChart.destroy();
        }

        this.sentimentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Community Sentiment',
                    data: [],
                    borderColor: 'rgb(0, 255, 157)',
                    backgroundColor: 'rgba(0, 255, 157, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    initEventListeners() {
        // Category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.filterInfluencers(tab.dataset.category);
            });
        });
    }

    updateUI(data) {
        this.updateSentimentChart(data.sentiment);
        this.updateInfluencers(data.influencers);
        this.updateFeed(data.feed);
        this.updateNews(data.news);
        this.updateTopics(data.topics);
        this.updateInsights(data.insights);
    }

    updateSentimentChart(sentiment) {
        this.sentimentChart.data.labels = sentiment.labels;
        this.sentimentChart.data.datasets[0].data = sentiment.values;
        this.sentimentChart.update();
    }

    updateInfluencers(influencers) {
        const list = document.querySelector('.influencer-list');
        if (!list) return;

        list.innerHTML = influencers.map(influencer => `
            <div class="influencer-card" data-category="${influencer.category}">
                <div class="influencer-info">
                    <div class="influencer-name">
                        ${influencer.name}
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="influencer-handle">${influencer.handle}</div>
                    <div class="influencer-stats">
                        <span><i class="fas fa-users"></i> ${influencer.followers}</span>
                        <span><i class="fas fa-bolt"></i> ${influencer.impact} Impact</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateFeed(feed) {
        const list = document.querySelector('.feed-list');
        if (!list) return;

        list.innerHTML = feed.map(item => `
            <div class="feed-item">
                <div class="feed-header">
                    <div class="feed-avatar"></div>
                    <div class="feed-meta">
                        <div class="feed-author">${item.author}</div>
                        <div class="feed-time">${item.time}</div>
                    </div>
                </div>
                <p>${item.content}</p>
                <div class="sentiment-tags">
                    <span class="sentiment-tag ${item.sentiment}">
                        <i class="fas fa-circle"></i>
                        ${item.sentiment}
                    </span>
                </div>
            </div>
        `).join('');
    }

    updateNews(news) {
        const list = document.querySelector('.news-list');
        if (!list) return;

        list.innerHTML = news.map(item => `
            <div class="news-item">
                <div class="news-content">
                    <div class="news-title">${item.title}</div>
                    <div class="news-meta">
                        <span>${item.source}</span>
                        <span>${item.time}</span>
                        <span class="sentiment ${item.sentiment}">
                            <i class="fas fa-circle"></i>
                            ${item.sentiment}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateTopics(topics) {
        const list = document.querySelector('.topics-list');
        if (!list) return;

        list.innerHTML = topics.map(topic => `
            <div class="topic-card">
                <div class="topic-header">
                    <div class="topic-name">${topic.name}</div>
                    <div class="topic-trend up">
                        <i class="fas fa-arrow-up"></i> ${topic.trend}%
                    </div>
                </div>
                <div class="topic-stats">
                    <span>${topic.mentions} mentions</span>
                    <span>${topic.sentiment}% positive</span>
                </div>
            </div>
        `).join('');
    }

    updateInsights(insights) {
        const container = document.querySelector('.action-cards');
        if (!container) return;

        container.innerHTML = insights.map(insight => `
            <div class="action-card">
                <div class="insight-header">
                    <h4>${insight.title}</h4>
                    <div class="confidence">${insight.confidence}% confidence</div>
                </div>
                <p>${insight.description}</p>
            </div>
        `).join('');
    }

    filterInfluencers(category) {
        document.querySelectorAll('.influencer-card').forEach(card => {
            if (category === 'all-stars' || card.dataset.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.socialMetrics = new SocialMetricsUI();
});
