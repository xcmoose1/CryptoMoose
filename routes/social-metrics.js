import express from 'express';
import socialMetricsService from '../services/social-metrics-service.js';

const router = express.Router();

router.get('/api/social-metrics', async (req, res) => {
    try {
        const metrics = await socialMetricsService.getSocialMetrics();
        res.json(metrics);
    } catch (error) {
        console.error('Error in social metrics route:', error);
        res.status(500).json({ error: 'Failed to fetch social metrics' });
    }
});

router.get('/api/social-metrics/reddit', async (req, res) => {
    try {
        const subreddit = req.query.subreddit || 'cryptocurrency';
        const data = await socialMetricsService.getRedditSentiment(subreddit);
        res.json(data);
    } catch (error) {
        console.error('Error in Reddit metrics route:', error);
        res.status(500).json({ error: 'Failed to fetch Reddit metrics' });
    }
});

router.get('/api/social-metrics/github/:owner/:repo', async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const data = await socialMetricsService.getGitHubActivity(`${owner}/${repo}`);
        res.json(data);
    } catch (error) {
        console.error('Error in GitHub metrics route:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub metrics' });
    }
});

router.get('/api/social-metrics/news', async (req, res) => {
    try {
        const news = await socialMetricsService.getCryptoNews();
        res.json(news);
    } catch (error) {
        console.error('Error in news route:', error);
        res.status(500).json({ error: 'Failed to fetch crypto news' });
    }
});

export default router;
