import express from 'express';
import cors from 'cors';
import GemHunterService from '../services/gem-hunter-service.js';

const router = express.Router();
const gemHunterService = new GemHunterService();

// CORS middleware
router.use(cors({
    origin: ['http://localhost:8001', 'http://127.0.0.1:8001'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Pre-flight requests
router.options('*', cors());

// Debug endpoint to test service
router.get('/test', async (req, res) => {
    try {
        res.json({ status: 'Gem Hunter route is working' });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ error: 'Test endpoint failed' });
    }
});

// Test endpoint to send multiple requests
router.get('/test-load', async (req, res) => {
    console.log('Starting load test with 20 requests...');
    const results = [];
    
    for (let i = 0; i < 20; i++) {
        try {
            console.log(`Request ${i + 1}/20`);
            const gems = await gemHunterService.getTrendingGems();
            results.push({ success: true, count: i + 1 });
        } catch (error) {
            console.error(`Request ${i + 1} failed:`, error.message);
            results.push({ 
                success: false, 
                count: i + 1, 
                error: error.message,
                status: error.response?.status 
            });
        }
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    res.json({
        total: 20,
        results: results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
    });
});

// Get trending gems
router.get('/trending', async (req, res) => {
    console.log('Received request for trending gems');
    try {
        const trendingGems = await gemHunterService.getTrendingGems();
        console.log('Successfully fetched trending gems:', trendingGems);
        
        if (!trendingGems || trendingGems.length === 0) {
            console.log('No trending gems found');
            return res.status(404).json({ 
                error: 'No trending gems found',
                message: 'Could not find any trending gems matching the criteria'
            });
        }
        
        console.log(`Found ${trendingGems.length} trending gems`);
        res.json(trendingGems);
    } catch (error) {
        console.error('Error in /trending route:', error);
        console.error('Error stack:', error.stack);
        
        // Send a more detailed error response
        const errorResponse = {
            error: 'Failed to fetch trending gems',
            message: error.message,
            details: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : undefined
        };
        
        console.error('Sending error response:', errorResponse);
        res.status(500).json(errorResponse);
    }
});

// Search for pairs
router.get('/search', async (req, res) => {
    try {
        const { query, chain } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        const pairs = await gemHunterService.searchPairs(query, chain);
        res.json(pairs);
    } catch (error) {
        console.error('Error searching pairs:', error);
        res.status(500).json({ error: 'Failed to search pairs' });
    }
});

// Get detailed token information
router.get('/token/:address', async (req, res) => {
    try {
        const tokenInfo = await gemHunterService.getTokenInfo(req.params.address);
        res.json(tokenInfo);
    } catch (error) {
        console.error('Error getting token info:', error);
        res.status(500).json({ error: 'Failed to get token information' });
    }
});

// Get pair information
router.get('/pair/:chainId/:address', async (req, res) => {
    try {
        const pairInfo = await gemHunterService.getPairInfo(
            req.params.address,
            req.params.chainId
        );
        res.json(pairInfo);
    } catch (error) {
        console.error('Error getting pair info:', error);
        res.status(500).json({ error: 'Failed to get pair information' });
    }
});

// Get watchlist
router.get('/watchlist', async (req, res) => {
    try {
        const watchlist = await gemHunterService.getWatchlist();
        res.json(watchlist);
    } catch (error) {
        console.error('Error getting watchlist:', error);
        res.status(500).json({ error: 'Failed to get watchlist' });
    }
});

// Add to watchlist
router.post('/watchlist/add', async (req, res) => {
    try {
        const gem = req.body;
        await gemHunterService.addToWatchlist(gem);
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        res.status(500).json({ error: 'Failed to add to watchlist' });
    }
});

// Remove from watchlist
router.post('/watchlist/remove', async (req, res) => {
    try {
        const { symbol } = req.body;
        await gemHunterService.removeFromWatchlist(symbol);
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({ error: 'Failed to remove from watchlist' });
    }
});

export default router;
