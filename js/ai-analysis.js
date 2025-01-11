// AI Analysis Module
class AIAnalysis {
    constructor() {
        this.initialized = false;
        this.lastAnalysisTime = 0;
        this.analysisInterval = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
        this.currentPair = 'BTCUSDT';
        this.cachedInsights = {
            priceAction: null,
            sentiment: null,
            signals: null,
            altcoins: null,
            lastUpdate: 0
        };
    }

    async init() {
        try {
            this.initialized = true;
            // Load cached insights from localStorage if available
            const cached = localStorage.getItem('aiInsights');
            if (cached) {
                this.cachedInsights = JSON.parse(cached);
                this.lastAnalysisTime = this.cachedInsights.lastUpdate;
            }
            console.log('AI Analysis initialized with rate limit of 4 hours');
        } catch (error) {
            console.error('Error initializing AI analysis:', error);
        }
    }

    async updateAIInsights(marketData) {
        try {
            const currentTime = Date.now();
            const timeSinceLastUpdate = currentTime - this.lastAnalysisTime;
            
            // Check if we need to update (4-hour interval)
            if (timeSinceLastUpdate < this.analysisInterval) {
                console.log(`Using cached AI insights. Next update in ${Math.floor((this.analysisInterval - timeSinceLastUpdate) / (60 * 1000))} minutes`);
                this.displayCachedInsights();
                return;
            }
            
            console.log('Updating AI insights...');
            this.lastAnalysisTime = currentTime;
            this.currentPair = marketData.pair;
            
            // Update main insights
            await this.updateMainInsights(marketData);
            
            // Update altcoin insights
            await this.updateAltcoinInsights(marketData);
            
            // Cache the new insights
            this.cacheInsights();
            
        } catch (error) {
            console.error('Error updating AI insights:', error);
            // On error, display cached insights if available
            this.displayCachedInsights();
        }
    }

    async updateMainInsights(marketData) {
        try {
            // Update price action insight
            const priceActionEl = document.getElementById('priceActionInsight');
            if (priceActionEl) {
                const analysis = await this.analyzePriceAction(marketData);
                this.cachedInsights.priceAction = analysis;
                priceActionEl.textContent = analysis;
            }

            // Update market sentiment
            const sentimentEl = document.getElementById('marketSentimentInsight');
            if (sentimentEl) {
                const sentiment = await this.analyzeSentiment(marketData);
                this.cachedInsights.sentiment = sentiment;
                sentimentEl.textContent = sentiment;
            }

            // Update trading signals
            const signalEl = document.getElementById('tradingSignalInsight');
            if (signalEl) {
                const signals = await this.generateSignals(marketData);
                this.cachedInsights.signals = signals;
                signalEl.textContent = signals;
            }
        } catch (error) {
            console.error('Error updating main insights:', error);
            throw error;
        }
    }

    displayCachedInsights() {
        // Display cached insights if available
        if (this.cachedInsights.priceAction) {
            const priceActionEl = document.getElementById('priceActionInsight');
            if (priceActionEl) {
                priceActionEl.textContent = this.cachedInsights.priceAction;
            }
        }

        if (this.cachedInsights.sentiment) {
            const sentimentEl = document.getElementById('marketSentimentInsight');
            if (sentimentEl) {
                sentimentEl.textContent = this.cachedInsights.sentiment;
            }
        }

        if (this.cachedInsights.signals) {
            const signalEl = document.getElementById('tradingSignalInsight');
            if (signalEl) {
                signalEl.textContent = this.cachedInsights.signals;
            }
        }

        // Update last update time display
        const lastUpdateEl = document.getElementById('lastAIUpdate');
        if (lastUpdateEl) {
            const timeAgo = Math.floor((Date.now() - this.lastAnalysisTime) / (60 * 1000));
            lastUpdateEl.textContent = `Last updated ${timeAgo} minutes ago`;
        }
    }

    cacheInsights() {
        this.cachedInsights.lastUpdate = Date.now();
        localStorage.setItem('aiInsights', JSON.stringify(this.cachedInsights));
    }

    async analyzePriceAction(marketData) {
        const { currentPrice, priceChange24h, indicators } = marketData;
        const { rsi, bb, macd } = indicators;
        let analysis = [];

        // Price Action Analysis
        analysis.push(`Current ${this.currentPair} price: $${currentPrice.toFixed(2)} (${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}% 24h)`);

        // RSI Analysis
        if (rsi > 70) {
            analysis.push(`Strong overbought conditions detected (RSI: ${rsi.toFixed(2)}). Consider taking profits or setting tight stop losses.`);
        } else if (rsi < 30) {
            analysis.push(`Strong oversold conditions detected (RSI: ${rsi.toFixed(2)}). Watch for potential reversal and accumulation opportunities.`);
        } else if (rsi > 60) {
            analysis.push(`Bullish momentum building (RSI: ${rsi.toFixed(2)}). Current trend favors longs with proper risk management.`);
        } else if (rsi < 40) {
            analysis.push(`Bearish pressure present (RSI: ${rsi.toFixed(2)}). Consider reducing position sizes or waiting for confirmation.`);
        } else {
            analysis.push(`Neutral RSI levels (${rsi.toFixed(2)}) suggesting consolidation. Watch for breakout signals.`);
        }

        // Bollinger Bands Analysis
        const bbWidth = ((bb.upper - bb.lower) / bb.middle) * 100;
        if (currentPrice > bb.upper) {
            analysis.push(`Price extended above upper Bollinger Band ($${bb.upper.toFixed(2)}). High volatility with ${bbWidth.toFixed(1)}% band width. Watch for potential mean reversion.`);
        } else if (currentPrice < bb.lower) {
            analysis.push(`Price compressed below lower Bollinger Band ($${bb.lower.toFixed(2)}). High volatility with ${bbWidth.toFixed(1)}% band width. Watch for potential bounce.`);
        } else if (bbWidth < 2) {
            analysis.push(`Extremely tight Bollinger Bands (${bbWidth.toFixed(1)}% width) suggesting imminent volatility expansion.`);
        } else if (bbWidth > 5) {
            analysis.push(`Wide Bollinger Bands (${bbWidth.toFixed(1)}% width) indicating high volatility period.`);
        }

        // MACD Analysis
        const macdStrength = Math.abs(macd.histogram);
        if (macd.histogram > 0 && macd.histogram > macd.signal) {
            analysis.push(`Strong bullish MACD momentum (${macd.histogram.toFixed(3)}). Histogram increasing with ${macdStrength.toFixed(3)} strength.`);
        } else if (macd.histogram < 0 && macd.histogram < macd.signal) {
            analysis.push(`Strong bearish MACD pressure (${macd.histogram.toFixed(3)}). Histogram decreasing with ${macdStrength.toFixed(3)} strength.`);
        } else if (macd.histogram > 0) {
            analysis.push(`Moderate bullish MACD signal (${macd.histogram.toFixed(3)}). Watch for continuation patterns.`);
        } else if (macd.histogram < 0) {
            analysis.push(`Moderate bearish MACD signal (${macd.histogram.toFixed(3)}). Watch for reversal patterns.`);
        }

        return analysis.join('\n\n');
    }

    async analyzeSentiment(marketData) {
        const { priceChange24h, volume24h, indicators } = marketData;
        let sentiment = [];
        
        // Volume Analysis
        if (volume24h > 0) {
            const volumeChange = volume24h.change || 0;
            if (volumeChange > 50) {
                sentiment.push(`Exceptional volume surge (${this.formatVolume(volume24h)}) with ${volumeChange.toFixed(1)}% increase. Strong market participation suggesting potential trend continuation.`);
            } else if (volumeChange > 20) {
                sentiment.push(`Above average volume (${this.formatVolume(volume24h)}) with ${volumeChange.toFixed(1)}% increase. Growing market interest.`);
            } else if (volumeChange < -50) {
                sentiment.push(`Significant volume decline (${this.formatVolume(volume24h)}) with ${Math.abs(volumeChange).toFixed(1)}% decrease. Possible trend exhaustion or consolidation ahead.`);
            } else if (volumeChange < -20) {
                sentiment.push(`Below average volume (${this.formatVolume(volume24h)}) with ${Math.abs(volumeChange).toFixed(1)}% decrease. Declining market interest.`);
            }
        }

        // Price Momentum Analysis
        if (priceChange24h > 10) {
            sentiment.push(`Exceptional bullish momentum with ${priceChange24h.toFixed(2)}% price surge in 24h. Watch for potential profit taking levels.`);
        } else if (priceChange24h > 5) {
            sentiment.push(`Strong bullish momentum with ${priceChange24h.toFixed(2)}% gain in 24h. Consider trailing stop losses to protect profits.`);
        } else if (priceChange24h < -10) {
            sentiment.push(`Severe bearish pressure with ${Math.abs(priceChange24h).toFixed(2)}% decline in 24h. Watch for oversold bounce opportunities.`);
        } else if (priceChange24h < -5) {
            sentiment.push(`Notable bearish pressure with ${Math.abs(priceChange24h).toFixed(2)}% drop in 24h. Consider reducing exposure or hedging positions.`);
        } else {
            sentiment.push(`Price consolidating with ${priceChange24h.toFixed(2)}% 24h change. Watch for range breakout signals.`);
        }

        // Market Structure Analysis
        const { rsi, macd } = indicators;
        if (rsi > 60 && macd.histogram > 0) {
            sentiment.push(`Strong market structure with both RSI (${rsi.toFixed(1)}) and MACD (${macd.histogram.toFixed(3)}) showing bullish alignment.`);
        } else if (rsi < 40 && macd.histogram < 0) {
            sentiment.push(`Weak market structure with both RSI (${rsi.toFixed(1)}) and MACD (${macd.histogram.toFixed(3)}) showing bearish alignment.`);
        } else {
            sentiment.push(`Mixed market structure with RSI at ${rsi.toFixed(1)} and MACD at ${macd.histogram.toFixed(3)}. Watch for clear directional signals.`);
        }

        return sentiment.join('\n\n');
    }

    async generateSignals(marketData) {
        const { indicators, currentPrice } = marketData;
        const { rsi, bb, macd } = indicators;
        let signals = [];

        // Entry Signals
        if (rsi < 30 && currentPrice < bb.lower) {
            signals.push(`⚡ Strong Buy Signal: Oversold RSI (${rsi.toFixed(2)}) with price below lower BB ($${bb.lower.toFixed(2)})`);
        } else if (rsi > 70 && currentPrice > bb.upper) {
            signals.push(`⚡ Strong Sell Signal: Overbought RSI (${rsi.toFixed(2)}) with price above upper BB ($${bb.upper.toFixed(2)})`);
        }

        // Trend Signals
        if (macd.histogram > 0 && macd.signal > 0) {
            signals.push(`📈 Bullish Trend: MACD histogram (${macd.histogram.toFixed(3)}) expanding above signal line`);
        } else if (macd.histogram < 0 && macd.signal < 0) {
            signals.push(`📉 Bearish Trend: MACD histogram (${macd.histogram.toFixed(3)}) expanding below signal line`);
        }

        // Volatility Signals
        const bbWidth = ((bb.upper - bb.lower) / bb.middle) * 100;
        if (bbWidth < 2) {
            signals.push(`🎯 Volatility Squeeze: BB width at ${bbWidth.toFixed(1)}% - Prepare for potential breakout`);
        } else if (bbWidth > 5) {
            signals.push(`⚠️ High Volatility: BB width at ${bbWidth.toFixed(1)}% - Trade with caution`);
        }

        // Risk Levels
        signals.push(`🎯 Key Levels:\n   Support: $${bb.lower.toFixed(2)}\n   Middle: $${bb.middle.toFixed(2)}\n   Resistance: $${bb.upper.toFixed(2)}`);

        return signals.join('\n\n');
    }

    async analyzeAltcoinMarket(marketData) {
        const { currentPrice, priceChange24h } = marketData;
        
        // Generate market analysis based on current pair
        const analysis = [];
        
        if (this.currentPair === 'BTCUSDT') {
            analysis.push('Bitcoin dominance affecting overall market sentiment');
            if (priceChange24h > 0) {
                analysis.push('Altcoins likely to follow BTC\'s upward momentum');
            } else {
                analysis.push('Altcoins may experience pressure due to BTC decline');
            }
        } else {
            analysis.push(`${this.currentPair.replace('USDT', '')} showing independent movement`);
            analysis.push(`Current price at ${currentPrice.toFixed(2)} with ${priceChange24h.toFixed(2)}% 24h change`);
        }
        
        return analysis.join('. ');
    }

    async analyzeAltcoinTrends(marketData) {
        const { indicators } = marketData;
        const trends = [];
        
        // Analyze trends based on current pair
        if (this.currentPair === 'BTCUSDT') {
            trends.push('Bitcoin leading market direction');
            if (indicators.rsi > 50) {
                trends.push('Altcoin season potential increasing');
            } else {
                trends.push('Market favoring BTC accumulation');
            }
        } else {
            const symbol = this.currentPair.replace('USDT', '');
            if (indicators.macd.histogram > 0) {
                trends.push(`${symbol} showing strength against BTC`);
            } else {
                trends.push(`${symbol} following general market trend`);
            }
        }
        
        return trends.join('. ');
    }

    async generateAltcoinRecommendations(marketData) {
        const { indicators, priceChange24h } = marketData;
        const symbol = this.currentPair.replace('USDT', '');
        const recommendations = [];

        // Generate specific recommendations based on technical indicators
        if (indicators.rsi < 30) {
            recommendations.push(`Consider accumulating ${symbol} during oversold conditions`);
        } else if (indicators.rsi > 70) {
            recommendations.push(`Watch for profit-taking opportunities in ${symbol}`);
        }

        if (priceChange24h > 5) {
            recommendations.push('Set trailing stop-loss to protect gains');
        } else if (priceChange24h < -5) {
            recommendations.push('Watch for reversal patterns and oversold bounces');
        }

        if (indicators.macd.histogram > 0) {
            recommendations.push('Momentum favors upside continuation');
        } else {
            recommendations.push('Consider reducing position size in bearish conditions');
        }
        
        return recommendations.join('. ');
    }

    formatVolume(volume) {
        if (volume >= 1e9) {
            return (volume / 1e9).toFixed(2) + 'B';
        } else if (volume >= 1e6) {
            return (volume / 1e6).toFixed(2) + 'M';
        } else if (volume >= 1e3) {
            return (volume / 1e3).toFixed(2) + 'K';
        }
        return volume.toFixed(2);
    }
}

export default AIAnalysis;
