import express from 'express';
import OpenAI from 'openai';
import { HTXDailyService } from '../services/htx-daily.service.js';

const router = express.Router();
const htxDailyService = new HTXDailyService();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

router.post('/', async (req, res) => {
    try {
        // Get current BTC price using isolated HTX service
        const btcPrice = await htxDailyService.getCurrentPrice('BTC');
        console.log('Current BTC Price from HTX:', btcPrice);
        
        const prompt = `You are a professional crypto analyst. Based on the current BTC price of $${btcPrice}, provide a detailed daily market update in the following JSON format. Make sure all price levels are within 10% of the current price of $${btcPrice}.

{
    "technical_stance": "bullish|bearish|neutral",
    "metrics": {
        "rsi": "value",
        "macd": "status",
        "volume": "status"
    },
    "price_levels": {
        "resistance": ["price1", "price2", "price3"],
        "support": ["price1", "price2", "price3"]
    },
    "catalysts": [
        "catalyst1",
        "catalyst2",
        "catalyst3"
    ],
    "risks": [
        "risk1",
        "risk2",
        "risk3"
    ],
    "outlook": "detailed 7-day outlook",
    "events": [
        "event1",
        "event2",
        "event3"
    ],
    "sentiment_score": "0-10"
}

Important: Use the EXACT current price of $${btcPrice} as reference. Support levels should be below current price, resistance levels above. Price levels should be realistic and close to current market price.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const update = JSON.parse(completion.choices[0].message.content);
        console.log('Generated update:', update);
        res.json(update);
    } catch (error) {
        console.error('Error generating daily update:', error);
        res.status(500).json({ error: 'Failed to generate daily update', details: error.message });
    }
});

// Test endpoint to verify router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Daily update router is working' });
});

export default router;
