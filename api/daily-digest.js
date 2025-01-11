import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';

dotenv.config();

const router = express.Router();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Cache for storing the last API response
let cache = {
    data: null,
    timestamp: null
};

async function generateDigestWithGPT4() {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `You are CryptoMoose's lead market analyst and journalist. Your task is to create a comprehensive daily market analysis that helps traders make informed decisions. Your writing style should be:

                1. Professional yet accessible
                2. Data-driven with clear reasoning
                3. Focused on trading implications
                4. Balanced between technical and fundamental analysis

                Structure your analysis with these sections:

                1. MARKET SNAPSHOT
                - Key market movements in crypto, stocks, and forex
                - Important correlations and divergences
                - Notable volume and sentiment indicators

                2. CRITICAL DEVELOPMENTS
                - Major news affecting crypto markets
                - Regulatory updates
                - Institutional movements
                - Technical breakouts or breakdowns

                3. TRADING IMPLICATIONS
                - Potential market scenarios
                - Key support/resistance levels
                - Risk factors to monitor
                - Opportunities across different timeframes

                4. FORWARD OUTLOOK
                - Short-term market expectations
                - Key events to watch
                - Risk management considerations

                Format each section with clear headers and bullet points for better readability.
                Focus on actionable insights rather than just news reporting.`
            }],
            temperature: 0.7,
            max_tokens: 2000
        });

        const response = completion.choices[0].message.content;
        return {
            marketOverview: extractSection(response, "MARKET SNAPSHOT"),
            cryptoNews: extractSection(response, "CRITICAL DEVELOPMENTS"),
            traditionalMarkets: extractSection(response, "TRADING IMPLICATIONS"),
            outlook: extractSection(response, "FORWARD OUTLOOK")
        };
    } catch (error) {
        console.error('Error generating digest:', error);
        throw error;
    }
}

function extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[\\s\\S]*?(?=(?:MARKET SNAPSHOT|CRITICAL DEVELOPMENTS|TRADING IMPLICATIONS|FORWARD OUTLOOK|$))`, 'i');
    const match = text.match(regex);
    return match ? match[0].replace(sectionName, '').trim() : '';
}

router.get('/', async (req, res) => {
    try {
        // Check if we have cached data less than 24 hours old
        const now = Date.now();
        if (cache.data && cache.timestamp && (now - cache.timestamp < 24 * 60 * 60 * 1000)) {
            return res.json(cache.data);
        }

        // Generate new digest
        const digest = await generateDigestWithGPT4();
        
        // Update cache
        cache = {
            data: digest,
            timestamp: now
        };

        res.json(digest);
    } catch (error) {
        console.error('Error in daily digest endpoint:', error);
        res.status(500).json({ error: 'Failed to generate daily digest' });
    }
});

export default router;
