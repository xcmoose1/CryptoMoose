// HTX WebSocket configuration
const HTX_CONFIG = {
    WS_URL: 'wss://api.htx.com/ws/v2',
    REST_URL: 'https://api.htx.com/v2',
    SUPPORTED_SEGMENTS: {
        'top': ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'],
        'defi': ['UNI', 'AAVE', 'MKR', 'COMP', 'SNX'],
        'layer1': ['SOL', 'ADA', 'AVAX', 'DOT', 'NEAR'],
        'gaming': ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA'],
        'infrastructure': ['LINK', 'GRT', 'FIL', 'AR', 'RNDR'],
        'ai': ['OCEAN', 'FET', 'AGIX', 'NMR', 'ALI'],
        'memes': ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'],
        'depin': ['HNT', 'WLD', 'MOBILE', 'RNDR', 'PLA'],
        'rwa': ['MNT', 'USDT', 'USDC', 'DAI', 'PAXG']
    },
    UPDATE_INTERVAL: 5000, // 5 seconds
    TIMEFRAMES: ['1m', '5m', '15m', '1h', '4h', '1d']
};
