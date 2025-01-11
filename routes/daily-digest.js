import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import Parser from 'rss-parser';

dotenv.config();
const parser = new Parser();

const router = express.Router();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Cache for storing the last API response
let cache = {
    data: null,
    timestamp: null
};

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// RSS feeds for major crypto news sources
const NEWS_SOURCES = [
    {
        name: 'CoinDesk',
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/'
    },
    {
        name: 'Cointelegraph',
        url: 'https://cointelegraph.com/rss'
    },
    {
        name: 'Bitcoin Magazine',
        url: 'https://bitcoinmagazine.com/.rss/full/'
    },
    {
        name: 'Decrypt',
        url: 'https://decrypt.co/feed'
    },
    {
        name: 'The Block',
        url: 'https://www.theblock.co/rss.xml'
    },
    {
        name: 'CryptoSlate',
        url: 'https://cryptoslate.com/feed/'
    }
];

async function fetchNewsFromSources() {
    try {
        const newsPromises = NEWS_SOURCES.map(async source => {
            try {
                const feed = await parser.parseURL(source.url);
                return feed.items.slice(0, 5).map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: source.name,
                    // Some RSS feeds include categories/tags
                    categories: item.categories || [],
                    // Extract a short description if available
                    description: item.contentSnippet || item.description || ''
                }));
            } catch (error) {
                console.error(`Error fetching from ${source.name}:`, error);
                return [];
            }
        });

        const allNews = await Promise.all(newsPromises);
        // Flatten, sort by date, and get the most recent 20 articles
        return allNews
            .flat()
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 20);
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

async function generateDigestWithGPT4(newsData) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `You are CryptoMoose's lead market analyst and journalist. Create a comprehensive daily digest focusing on market sentiment, regulatory developments, and important crypto ecosystem news. Your analysis should be:

                1. Focused on broader market trends and sentiment
                2. Highlighting regulatory developments and their impact
                3. Covering major institutional and adoption news
                4. Analyzing social sentiment and community reactions

                Structure your analysis with these sections:

                1. MARKET SNAPSHOT
                - Overall market sentiment and mood
                - Key market-moving events
                - Institutional activity and adoption news
                - Notable social media trends

                2. CRITICAL DEVELOPMENTS
                - Major regulatory updates and their implications
                - Important project/protocol announcements
                - Significant partnerships or adoption news
                - Security incidents or concerns

                3. TRADING IMPLICATIONS
                - How news affects different market segments
                - Potential market reactions to developments
                - Risk factors from regulatory changes
                - Institutional interest and flow trends

                4. FORWARD OUTLOOK
                - Expected regulatory developments
                - Upcoming major events and announcements
                - Potential market catalysts
                - Areas to watch

                Format each section with clear headers and bullet points for better readability.
                Focus on how news and developments might affect the market.
                
                Recent news to analyze: ${JSON.stringify(newsData)}
                Current time: ${new Date().toISOString()}`
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
        // Check if we have cached data less than 12 hours old
        const now = Date.now();
        if (cache.data && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
            return res.json(cache.data);
        }

        // Fetch fresh news data
        const newsData = await fetchNewsFromSources();
        
        // Generate new digest
        const digest = await generateDigestWithGPT4(newsData);
        
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
