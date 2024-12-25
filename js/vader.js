// VADER (Valence Aware Dictionary and sEntiment Reasoner) - JavaScript Implementation
class SentimentIntensityAnalyzer {
    constructor() {
        this.lexicon = {
            'bullish': 4.0,
            'bearish': -4.0,
            'moon': 4.0,
            'dump': -3.0,
            'pump': 2.0,
            'dip': -2.0,
            'crash': -4.0,
            'rally': 3.0,
            'fud': -3.0,
            'scam': -4.0,
            'gem': 3.0,
            'shill': -2.0,
            'hodl': 2.0,
            'rekt': -3.0,
            'profit': 2.0,
            'loss': -2.0,
            'green': 2.0,
            'red': -2.0,
            'up': 1.0,
            'down': -1.0,
            'high': 1.0,
            'low': -1.0,
            'bull': 3.0,
            'bear': -3.0,
            'long': 1.0,
            'short': -1.0,
            'buy': 1.0,
            'sell': -1.0,
            'good': 1.0,
            'bad': -1.0,
            'great': 3.0,
            'terrible': -3.0,
            'amazing': 4.0,
            'awful': -4.0,
            'excellent': 4.0,
            'poor': -2.0,
            'strong': 2.0,
            'weak': -2.0,
            'positive': 2.0,
            'negative': -2.0,
            'bullrun': 4.0,
            'bearmarket': -4.0,
            'adoption': 3.0,
            'partnership': 2.0,
            'upgrade': 2.0,
            'downgrade': -2.0,
            'hack': -4.0,
            'secure': 2.0,
            'vulnerability': -3.0,
            'breakthrough': 3.0,
            'failure': -3.0,
            'success': 3.0,
            'innovation': 2.0,
            'problem': -2.0,
            'solution': 2.0,
            'delay': -1.0,
            'launch': 2.0,
            'cancel': -2.0,
            'support': 1.0,
            'resistance': -1.0,
            'breakout': 3.0,
            'breakdown': -3.0
        };
    }

    polarity_scores(text) {
        text = text.toLowerCase();
        let words = text.match(/\b[\w']+\b/g) || [];
        
        let pos_sum = 0;
        let neg_sum = 0;
        let neu_count = 0;
        
        words.forEach(word => {
            if (this.lexicon[word]) {
                if (this.lexicon[word] > 0) pos_sum += this.lexicon[word];
                else if (this.lexicon[word] < 0) neg_sum += Math.abs(this.lexicon[word]);
            } else {
                neu_count++;
            }
        });
        
        let total = pos_sum + neg_sum + neu_count;
        
        // Normalize scores
        let pos = pos_sum / total;
        let neg = neg_sum / total;
        let neu = neu_count / total;
        
        // Calculate compound score
        let compound = (pos_sum - neg_sum) / (pos_sum + neg_sum + 0.000001);
        compound = Math.tanh(compound);
        
        return {
            'pos': pos,
            'neg': neg,
            'neu': neu,
            'compound': compound
        };
    }
}

export const vader = {
    SentimentIntensityAnalyzer: SentimentIntensityAnalyzer
};
