// HTX Configuration
// @ts-check

// Configuration object for HTX API
export const HTX_CONFIG = {
    // Base URLs
    WS_URL: 'wss://api.htx.com/ws',
    REST_URL: 'https://api.htx.com',
    
    // Market data configuration
    MARKET_CONFIG: {
        DEFAULT_SYMBOL: 'btcusdt',
        DEFAULT_INTERVAL: '1min',
        SUPPORTED_INTERVALS: ['1min', '5min', '15min', '30min', '60min', '4hour', '1day'],
        MAX_KLINES: 2000,
        UPDATE_INTERVAL: 1000,
        RETRY_DELAY: 2000,
        MAX_RETRIES: 3,
        ENDPOINT_SWITCH_DELAY: 5000
    },
    
    // WebSocket channels
    CHANNELS: {
        KLINE: (symbol, period) => `market.${symbol}.kline.${period}`,
        TRADE: symbol => `market.${symbol}.trade.detail`,
        DEPTH: symbol => `market.${symbol}.depth.step0`,
        DETAIL: symbol => `market.${symbol}.detail`
    },
    
    // REST API endpoints
    ENDPOINTS: {
        MARKET: {
            KLINE: '/market/history/kline',
            DETAIL: '/market/detail',
            TICKERS: '/market/tickers',
            DEPTH: '/market/depth',
            TRADE: '/market/history/trade'
        }
    },
    
    // API rate limits
    RATE_LIMITS: {
        REQUESTS_PER_SECOND: 10,
        ORDERS_PER_SECOND: 5,
        WEIGHT_PER_MINUTE: 1200
    },
    
    // Market pairs
    DEFAULT_PAIRS: ['btcusdt', 'ethusdt', 'xrpusdt'],
    
    // Timeframes mapping from display to API values
    TIMEFRAMES: {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '60min',
        '4h': '4hour',
        '1d': '1day'
    },
    
    // Default values
    DEFAULTS: {
        PAIR: 'btcusdt',
        TIMEFRAME: '1min'
    },
    
    VERSION: 'v1',
    RETRY_DELAY: 1000,  // 1 second
    MAX_RETRIES: 3,
    TIMEOUT: 10000,
};

export const HTX_INTERVALS = {
    ONE_MINUTE: '1min',
    THREE_MINUTES: '3min',
    FIVE_MINUTES: '5min',
    FIFTEEN_MINUTES: '15min',
    THIRTY_MINUTES: '30min',
    ONE_HOUR: '60min',
    TWO_HOURS: '120min',
    FOUR_HOURS: '4hour',
    SIX_HOURS: '6hour',
    TWELVE_HOURS: '12hour',
    ONE_DAY: '1day',
    ONE_WEEK: '1week',
    ONE_MONTH: '1mon'
};

// Format functions
export function formatSymbol(symbol) {
    return symbol.toLowerCase() + (symbol.endsWith('usdt') ? '' : 'usdt');
}

export function formatKlineData(data) {
    if (!data || !Array.isArray(data)) {
        return [];
    }
    
    return data.map(kline => ({
        time: kline.id * 1000,
        open: parseFloat(kline.open),
        high: parseFloat(kline.high),
        low: parseFloat(kline.low),
        close: parseFloat(kline.close),
        volume: parseFloat(kline.vol)
    }));
}

export class HTXHandler {
    constructor() {
        this.baseUrl = HTX_CONFIG.REST_URL;
        this.apiKey = '';
        this.apiSecret = '';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async init() {
        try {
            // Initialize any required resources
            console.log('HTX Handler initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize HTX Handler:', error);
            throw error;
        }
    }

    async makeRequest(endpoint, params = {}) {
        const url = new URL(this.baseUrl + endpoint);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getKlines(symbol, period, size = 500) {
        try {
            const params = {
                symbol: formatSymbol(symbol),
                period: this.timeframeToPeriod(period),
                size: size
            };
            
            const data = await this.makeRequest(HTX_CONFIG.ENDPOINTS.MARKET.KLINE, params);
            if (data.status === 'ok' && data.data) {
                return formatKlineData(data.data);
            }
            throw new Error('Invalid kline data received');
        } catch (error) {
            console.error('Failed to fetch klines:', error);
            throw error;
        }
    }

    timeframeToPeriod(timeframe) {
        const mapping = {
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
        return mapping[timeframe] || timeframe;
    }
}

// Create singleton instance
export const htxHandler = new HTXHandler();
