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
                content: `You are a crypto market analyst. Generate a comprehensive daily digest with the following sections:
                    1. Market Overview: Brief summary of current market conditions
                    2. Trending Assets: Top performing cryptocurrencies and notable movements
                    3. Key Events: Important news and developments in the crypto space
                    4. Technical Analysis: Key technical indicators and patterns for major cryptocurrencies
                    
                    Format the response in HTML with appropriate formatting and structure.`
            }],
            temperature: 0.7,
            max_tokens: 1000
        });

        const response = completion.choices[0].message.content;
        return {
            market_overview: extractSection(response, "Market Overview"),
            trending_assets: extractSection(response, "Trending Assets"),
            key_events: extractSection(response, "Key Events"),
            technical_analysis: extractSection(response, "Technical Analysis")
        };
    } catch (error) {
        console.error('Error generating digest:', error);
        throw error;
    }
}

function extractSection(text, sectionName) {
    const sections = text.split(/#{1,3}\s+/);
    const section = sections.find(s => s.toLowerCase().startsWith(sectionName.toLowerCase()));
    return section ? section.replace(sectionName, '').trim() : '';
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
