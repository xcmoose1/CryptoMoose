// API Configuration

export const HTX_API = {
    BASE_URL: 'https://api.huobi.pro',
    VERSION: 'v1',
    ENDPOINTS: {
        KLINES: '/market/history/kline',
        TICKER: '/market/detail/merged',
        DEPTH: '/market/depth',
        TRADES: '/market/history/trade',
        SYMBOLS: '/v1/common/symbols',
        TICKERS: '/market/tickers'
    }
};

// Convert symbol to HTX format (lowercase)
export function formatSymbol(symbol) {
    return symbol.toLowerCase();
}

// Map intervals to HTX format
export function formatInterval(interval) {
    const intervalMap = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '60min',
        '4h': '4hour',
        '1d': '1day',
        '1w': '1week',
        '1M': '1mon'
    };
    return intervalMap[interval] || interval;
}

// Format HTX kline data to standard format
export function formatKlineData(htxData) {
    if (!htxData || !htxData.data) return [];
    
    return htxData.data.map(k => ({
        timestamp: k.id * 1000,  // Convert to milliseconds
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.amount,
        quoteVolume: k.vol,
        trades: k.count
    }));
}

// Format HTX depth data to standard format
export function formatDepthData(htxData) {
    if (!htxData || !htxData.tick) return { bids: [], asks: [] };
    
    return {
        bids: htxData.tick.bids || [],
        asks: htxData.tick.asks || []
    };
}

// Format HTX ticker data to standard format
export function formatTickerData(htxData) {
    if (!htxData || !htxData.tick) return null;
    
    return {
        symbol: htxData.ch ? htxData.ch.split('.')[1] : '',
        lastPrice: htxData.tick.close,
        bidPrice: htxData.tick.bid[0],
        askPrice: htxData.tick.ask[0],
        bidSize: htxData.tick.bid[1],
        askSize: htxData.tick.ask[1],
        volume: htxData.tick.amount,
        quoteVolume: htxData.tick.vol,
        timestamp: htxData.ts
    };
}
