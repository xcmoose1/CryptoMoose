// Signals System Configuration
const SIGNALS_CONFIG = {
    // HTX WebSocket and REST API endpoints
    WS_URL: 'wss://api.htx.com/ws',
    REST_URL: 'https://api.htx.com',
    
    // Trading pairs to monitor
    TRADING_PAIRS: [
        'HBAR/USDT',
        'TON/USDT',
        'ALGO/USDT',
        'GRT/USDT',
        'CHZ/USDT',
        'VET/USDT',
        'MANA/USDT',
        'ZIL/USDT',
        'IOTA/USDT',
        'GALA/USDT',
        'ZRX/USDT',
        'ENJ/USDT',
        'AUDIO/USDT',
        'FLOW/USDT',
        'MASK/USDT',
        'ANKR/USDT',
        'FTM/USDT',
        'ARB/USDT',
        'KAVA/USDT',
        'ONE/USDT',
        'CFX/USDT',
        'SKL/USDT',
        'SUI/USDT',
        'UNI/USDT',
        'BTC/USDT'
    ],

    // Technical Analysis Parameters
    ANALYSIS: {
        EMA: {
            FAST_PERIOD: 9,
            SLOW_PERIOD: 21
        },
        RSI: {
            PERIOD: 14,
            OVERBOUGHT: 70,
            OVERSOLD: 30
        },
        VOLUME: {
            MA_PERIOD: 20,
            THRESHOLD: 1.5 // 1.5x average volume required
        }
    },

    // Signal Generation Parameters
    SIGNALS: {
        COOLDOWN_PERIOD: 3600000, // 1 hour in milliseconds
        MIN_TREND_STRENGTH: 1.03,
        PROFIT_FACTOR: 2.5,
        MAX_CONCURRENT_TRADES: 3,
        RISK_PER_TRADE: 0.02 // 2% risk per trade
    },

    // Timeframe Settings
    TIMEFRAME: '1h',
    
    // WebSocket channels
    CHANNELS: {
        KLINE: (symbol, period) => `market.${symbol.toLowerCase()}.kline.${period}`,
        TRADE: symbol => `market.${symbol.toLowerCase()}.trade.detail`
    },

    // API rate limiting
    RATE_LIMITS: {
        MAX_REQUESTS_PER_SECOND: 10,
        DELAY_BETWEEN_REQUESTS: 100 // milliseconds
    },

    // Telegram Configuration - using environment variables
    TELEGRAM: {
        BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
        CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID || ''
    }
};

// HTX WebSocket Configuration
const HTX_CONFIG = {
    wsEndpoint: 'wss://api.htx.com/ws',  
    pairs: ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'],
    timeframes: ['1min', '5min', '15min'],
    maxSignals: 20
};

// Signal Types
const SIGNAL_TYPES = {
    BUY: 'buy',
    SELL: 'sell'
};

// WebSocket channels
const CHANNELS = {
    kline: 'market.$symbol.kline.$period',
    depth: 'market.$symbol.depth.step0',
    trade: 'market.$symbol.trade.detail'
};

// Reconnection settings
const RECONNECT_CONFIG = {
    maxAttempts: 5,
    delay: 5000, // 5 seconds
    backoffFactor: 1.5
};

// Status Messages
const STATUS_MESSAGES = {
    CONNECTING: 'Connecting...',
    CONNECTED: 'Connected',
    DISCONNECTED: 'Disconnected',
    ERROR: 'Connection Error'
};

// Set environment variables for Telegram
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
    console.error('Error: Telegram credentials not found in environment variables');
    console.error('Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID in your .env file');
}

export { SIGNALS_CONFIG };
