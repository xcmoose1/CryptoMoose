import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import fetch from 'node-fetch';

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

async function fetchCryptoNews() {
    try {
        // Using CryptoCompare News API (free)
        const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&limit=50');
        const data = await response.json();
        
        // Filter news from the last 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentNews = data.Data.filter(item => {
            const publishTime = item.published_on * 1000; // Convert to milliseconds
            return publishTime > oneDayAgo;
        });

        return recentNews;
    } catch (error) {
        console.error('Error fetching news:', error);
        throw error;
    }
}

async function generateDigestWithGPT4() {
    try {
        // First, fetch the latest news
        const newsData = await fetchCryptoNews();
        
        // Format news data for GPT
        const newsContext = newsData.map(item => 
            `Title: ${item.title}\nBody: ${item.body}\nSource: ${item.source}\n---\n`
        ).join('\n');

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `You are CryptoMoose's expert crypto analyst. Your task is to create an insightful summary of today's crypto news.

                Here's how to approach it:
                1. Read through all the news articles provided
                2. Identify the most important developments and their potential impact
                3. Create a cohesive narrative that helps readers understand what's really going on
                4. Add your unique insights about what this means for the crypto space

                Your response should be structured as:
                1. "The Big Picture" - A 2-3 sentence overview of the current crypto landscape
                2. "Key Developments" - The 2-3 most important specific events/news
                3. "CryptoMoose's Take" - Your analytical insights about what this means and what to watch for

                Make it engaging but professional. Be insightful but avoid hype or excessive speculation.
                Format in HTML with appropriate tags and structure.`
            },
            {
                role: "user",
                content: `Here are today's crypto news articles:\n\n${newsContext}`
            }],
            temperature: 0.7,
            max_tokens: 1000
        });

        const response = completion.choices[0].message.content;
        return {
            big_picture: extractSection(response, "The Big Picture"),
            key_developments: extractSection(response, "Key Developments"),
            moose_take: extractSection(response, "CryptoMoose's Take")
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
