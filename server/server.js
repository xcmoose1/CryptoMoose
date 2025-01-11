// Load environment variables first, before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables synchronously before any other imports
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
    console.error('Missing required environment variables:');
    console.error('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
    console.error('TELEGRAM_CHANNEL_ID:', process.env.TELEGRAM_CHANNEL_ID);
    process.exit(1);
}

console.log('Environment variables loaded:');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
console.log('TELEGRAM_CHANNEL_ID:', process.env.TELEGRAM_CHANNEL_ID);

// Now import everything else
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import axios from 'axios';
import { WebSocketServer } from 'ws';
import http from 'http';
import opportunitiesRouter from '../routes/opportunities.js';
import dailyDigestRouter from '../routes/daily-digest.js';
import klineRoutes from '../routes/klines.js';
import advancedTARoutes from '../routes/advanced-ta.js';
import gemHunterRouter from '../routes/gem-hunter.js';
import socialMetricsRouter from '../routes/social-metrics.js';
import marketIntelligenceRouter from '../routes/market-intelligence.js';
import indicatorsRouter from '../routes/indicators.js';
import { getAllOpportunities, fetchIDOCalendar } from '../api/investment-opportunities.js';
import { getAllRegulatoryData, getHighRiskAlerts } from '../api/regulatory-tracking.js';
import authRoutes from '../routes/auth.js';
import userRoutes from '../routes/user.js';
import aiRoutes from '../routes/ai-insights.js';
import dailyUpdateRouter from '../routes/daily-update.js';
import { HTXDailyService } from '../services/htx-daily.service.js';
import signalsRouter from '../signals/routes/signals-routes.js';

// Rate Limiter implementation
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.weightLimit = 100;  // HTX limit per second
        this.ipLimit = 100;     // requests per second
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }

    cleanup() {
        const now = Date.now();
        for (const [ip, data] of this.requests.entries()) {
            if (now - data.timestamp > 60000) { // Remove entries older than 1 minute
                this.requests.delete(ip);
            }
        }
    }

    throttle(ip, weight = 1) {
        const now = Date.now();
        let data = this.requests.get(ip);
        
        if (!data) {
            data = {
                count: 0,
                weight: 0,
                timestamp: now
            };
            this.requests.set(ip, data);
        }
        
        // Reset counters if more than a second has passed
        if (now - data.timestamp > 1000) {
            data.count = 0;
            data.weight = 0;
            data.timestamp = now;
        }
        
        // Check limits
        if (data.count >= this.ipLimit || data.weight + weight > this.weightLimit) {
            return false;
        }
        
        // Update counters
        data.count++;
        data.weight += weight;
        return true;
    }
}

// Create Express app
const app = express();
const rateLimiter = new RateLimiter();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for client connections
const wss = new WebSocketServer({ server, path: '/htx-ws' });

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

    // Set up ping-pong
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Store subscriptions for this connection
    ws.subscriptions = new Set();

    // Handle messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data);

            // Handle subscription requests
            if (data.sub) {
                console.log('Subscription request:', data.sub);
                ws.subscriptions.add(data.sub);
                
                // Send subscription confirmation
                ws.send(JSON.stringify({
                    status: 'ok',
                    subbed: data.sub,
                    ts: Date.now()
                }));

                // Send initial data for the subscription
                if (data.sub.includes('kline')) {
                    const [_, symbol, __, period] = data.sub.split('.');
                    try {
                        const response = await fetch(`${process.env.HTX_API_URL}/market/history/kline?symbol=${symbol}&period=${period}&size=200`);
                        const klineData = await response.json();
                        if (klineData.status === 'ok') {
                            ws.send(JSON.stringify({
                                ch: data.sub,
                                ts: Date.now(),
                                tick: klineData.data[0]
                            }));
                        }
                    } catch (error) {
                        console.error('Error fetching initial kline data:', error);
                    }
                }
            }

            // Handle unsubscribe requests
            if (data.unsub) {
                console.log('Unsubscribe request:', data.unsub);
                ws.subscriptions.delete(data.unsub);
                ws.send(JSON.stringify({
                    status: 'ok',
                    unsubbed: data.unsub,
                    ts: Date.now()
                }));
            }

            // Handle pong messages
            if (data.pong) {
                ws.isAlive = true;
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    });

    // Handle close
    ws.on('close', () => {
        console.log('Client disconnected');
        ws.subscriptions.clear();
    });

    // Send initial ping
    ws.send(JSON.stringify({ ping: Date.now() }));
});

// Ping all clients periodically
const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
            console.log('Terminating inactive connection');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.send(JSON.stringify({ ping: Date.now() }));
    });
}, 30000);

// Simulate market data updates
const marketDataInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return;

        ws.subscriptions.forEach(async (sub) => {
            try {
                if (sub.includes('kline')) {
                    const [_, symbol, __, period] = sub.split('.');
                    const response = await fetch(`${process.env.HTX_API_URL}/market/history/kline?symbol=${symbol}&period=${period}&size=1`);
                    const data = await response.json();
                    if (data.status === 'ok') {
                        ws.send(JSON.stringify({
                            ch: sub,
                            ts: Date.now(),
                            tick: data.data[0]
                        }));
                    }
                }
            } catch (error) {
                console.error('Error sending market data update:', error);
            }
        });
    });
}, 1000);

// Clean up on server close
wss.on('close', () => {
    clearInterval(pingInterval);
    clearInterval(marketDataInterval);
});

// Middleware
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Create a separate instance for daily updates
const htxDailyService = new HTXDailyService();

// API Routes
app.use('/htx-api', klineRoutes);  // Mount kline routes under /htx-api
app.use('/api/indicators', indicatorsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/daily-digest', dailyDigestRouter);
app.use('/api/gem-hunter', gemHunterRouter);
app.use('/api/social-metrics', socialMetricsRouter);
app.use('/api/market-intelligence', marketIntelligenceRouter);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/daily-update', dailyUpdateRouter);
app.use('/signals', signalsRouter);

// Mock endpoints for sentiment and position data
app.get('/api/htx/market/sentiment', (req, res) => {
    res.json({
        status: 'ok',
        data: {
            sentiment: 'Neutral',
            timestamp: Date.now()
        }
    });
});

app.get('/api/htx/market/position', (req, res) => {
    res.json({
        status: 'ok',
        data: {
            position: 'Hold',
            timestamp: Date.now()
        }
    });
});

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            // Set JavaScript module MIME type
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
    }
}));

// Serve node_modules with proper MIME types
app.use('/node_modules', express.static(path.join(__dirname, '..', 'node_modules'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
    }
}));

// Serve section files with proper MIME types
app.use('/sections', express.static(path.join(__dirname, '..', 'sections'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
    }
}));

// Serve CSS files
app.use('/css', express.static(path.join(__dirname, '..', 'css')));

// Serve JavaScript files with proper MIME types
app.use('/js', express.static(path.join(__dirname, '..', 'js'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
    }
}));

// Serve images
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// Root route handler
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'members.html'));
});

// Rate limiting middleware for HTX API
app.use('/api/htx', async (req, res, next) => {
    try {
        const clientIP = req.ip || req.connection.remoteAddress;
        if (!rateLimiter.throttle(clientIP)) {
            return res.status(429).json({
                code: 429,
                msg: 'Too many requests. Please try again later.',
                data: null
            });
        }
        next();
    } catch (error) {
        next(error);
    }
});

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
});

// HTX timeframe mapping
const HTX_TIMEFRAMES = {
    '1m': '1min',
    '3m': '3min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '60min',
    '2h': '120min',
    '4h': '4hour',
    '6h': '6hour',
    '12h': '12hour',
    '1d': '1day',
    '1w': '1week',
    '1M': '1mon'
};

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
