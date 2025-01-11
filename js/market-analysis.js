// Error Handler
class ErrorHandler {
    static handleApiError(error, context) {
        console.error(`Error in ${context}:`, {
            message: error.message,
            code: error.response?.data?.code,
            status: error.response?.status
        });

        if (error.response?.data?.code) {
            switch (error.response.data.code) {
                case -1121:
                    return { error: 'Invalid trading pair', level: 'warning' };
                case -1003:
                    return { error: 'Rate limit exceeded', level: 'warning' };
                default:
                    return { error: 'Unknown error occurred', level: 'error' };
            }
        }
        return { error: 'Network or server error', level: 'error' };
    }
}

// Data Cache
class DataCache {
    constructor() {
        this.cache = new Map();
        this.maxAge = 15000; // 15 seconds
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }
}

// Request Queue for Rate Limiting
class RequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.rateLimit = 100; // requests per second
        this.requestCount = 0;
        this.resetTime = Date.now() + 1000;
    }

    async add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ request, resolve, reject });
            if (!this.processing) {
                this.process();
            }
        });
    }

    async process() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const now = Date.now();

        if (now > this.resetTime) {
            this.requestCount = 0;
            this.resetTime = now + 1000;
        }

        if (this.requestCount >= this.rateLimit) {
            await new Promise(resolve => setTimeout(resolve, this.resetTime - now));
            this.process();
            return;
        }

        const { request, resolve, reject } = this.queue.shift();
        this.requestCount++;

        try {
            const result = await request();
            resolve(result);
        } catch (error) {
            reject(error);
        }

        setTimeout(() => this.process(), 1000 / this.rateLimit);
    }
}

import htxWebSocket from './websocket/htx-websocket.js';
import { formatSymbol, HTX_CONFIG } from './config/htx-config.js';
import marketAnalysisChart from './charts/market-analysis-chart.js';

export class MarketAnalysis {
    constructor() {
        this.currentSymbol = 'BTCUSDT';
        this.defaultInterval = '1min';
        this.retryDelay = 1000;
        this.maxRetries = 3;
        this.updateInterval = 30000;
        this.cache = new DataCache();
        this.requestQueue = new RequestQueue();
    }

    async init() {
        try {
            await marketAnalysisChart.init();
            return true;
        } catch (error) {
            console.error('Failed to initialize Market Analysis:', error);
            throw error;
        }
    }

    async updateSymbol(symbol) {
        try {
            this.currentSymbol = formatSymbol(symbol);
            await marketAnalysisChart.updateSymbol(this.currentSymbol);
        } catch (error) {
            console.error('Failed to update symbol:', error);
            throw error;
        }
    }

    async setTimeframe(timeframe) {
        try {
            await marketAnalysisChart.updateInterval(timeframe);
        } catch (error) {
            console.error('Failed to update timeframe:', error);
            throw error;
        }
    }
}

const marketAnalysis = new MarketAnalysis();
export { marketAnalysis };
