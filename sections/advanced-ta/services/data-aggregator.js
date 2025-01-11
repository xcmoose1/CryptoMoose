// @ts-check

// Data Aggregator for Advanced TA Section
class AdvancedTADataAggregator {
    constructor() {
        this.BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
        this.BINANCE_REST_URL = 'https://api.binance.com/api/v3';
        this.COINGECKO_URL = 'https://api.coingecko.com/api/v3';
        this.binanceWs = null;
        this.subscriptions = new Map();
        this.symbolMap = new Map([
            ['btcusdt', 'bitcoin'],  // HTX to CoinGecko symbol mapping
            ['ethusdt', 'ethereum']
        ]);
    }

    async init() {
        try {
            // We don't initialize WebSocket connections until needed
            console.log('Advanced TA Data Aggregator initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize data aggregator:', error);
            return false;
        }
    }

    // Binance Order Book Methods
    async getOrderBookSnapshot(symbol) {
        try {
            const response = await fetch(`${this.BINANCE_REST_URL}/depth?symbol=${symbol.toUpperCase()}&limit=1000`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching order book snapshot:', error);
            return null;
        }
    }

    // CoinGecko Market Context Methods
    async getMarketContext(symbol) {
        try {
            const geckoId = this.symbolMap.get(symbol.toLowerCase());
            if (!geckoId) throw new Error('Symbol not mapped');

            const response = await fetch(
                `${this.COINGECKO_URL}/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`
            );
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching market context:', error);
            return null;
        }
    }

    // Binance WebSocket Methods
    async subscribeToOrderBookUpdates(symbol, callback) {
        if (!this.binanceWs || this.binanceWs.readyState !== WebSocket.OPEN) {
            await this.initBinanceWebSocket();
        }

        const stream = `${symbol.toLowerCase()}@depth@100ms`;
        if (!this.subscriptions.has(stream)) {
            const sub = {
                method: 'SUBSCRIBE',
                params: [stream],
                id: Date.now()
            };
            this.binanceWs.send(JSON.stringify(sub));
            this.subscriptions.set(stream, callback);
        }
    }

    async initBinanceWebSocket() {
        return new Promise((resolve, reject) => {
            this.binanceWs = new WebSocket(this.BINANCE_WS_URL);

            this.binanceWs.onopen = () => {
                console.log('Binance WebSocket connected');
                resolve();
            };

            this.binanceWs.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.stream) {
                    const callback = this.subscriptions.get(data.stream);
                    if (callback) callback(data.data);
                }
            };

            this.binanceWs.onerror = (error) => {
                console.error('Binance WebSocket error:', error);
                reject(error);
            };

            this.binanceWs.onclose = () => {
                console.log('Binance WebSocket closed');
                // Implement reconnection logic if needed
            };
        });
    }

    unsubscribeFromOrderBookUpdates(symbol) {
        if (!this.binanceWs || this.binanceWs.readyState !== WebSocket.OPEN) return;

        const stream = `${symbol.toLowerCase()}@depth@100ms`;
        if (this.subscriptions.has(stream)) {
            const unsub = {
                method: 'UNSUBSCRIBE',
                params: [stream],
                id: Date.now()
            };
            this.binanceWs.send(JSON.stringify(unsub));
            this.subscriptions.delete(stream);
        }
    }

    // Cleanup
    destroy() {
        if (this.binanceWs) {
            this.binanceWs.close();
            this.binanceWs = null;
        }
        this.subscriptions.clear();
    }
}

// Create and export singleton instance
const dataAggregator = new AdvancedTADataAggregator();
export default dataAggregator;
