class HTXWebSocket {
    constructor() {
        this.ws = null;
        this.subscriptions = new Set();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.callbacks = new Map();
        this.connect();
    }

    connect() {
        this.ws = new WebSocket(HTX_CONFIG.WS_URL);
        
        this.ws.onopen = () => {
            console.log('Connected to HTX WebSocket');
            this.reconnectAttempts = 0;
            // Resubscribe to previous channels
            this.subscriptions.forEach(sub => this.send(sub));
        };

        this.ws.onclose = () => {
            console.log('Disconnected from HTX WebSocket');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.connect();
                }, 2000 * Math.pow(2, this.reconnectAttempts));
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.ping) {
                this.send({ pong: data.ping });
                return;
            }
            
            // Handle market data updates
            if (data.ch && this.callbacks.has(data.ch)) {
                this.callbacks.get(data.ch)(data.tick);
            }
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    subscribe(symbol, timeframe, callback) {
        const channel = `market.${symbol}.kline.${timeframe}`;
        const sub = {
            sub: channel,
            id: `${symbol}-${timeframe}`
        };
        
        this.subscriptions.add(sub);
        this.callbacks.set(channel, callback);
        this.send(sub);
    }

    unsubscribe(symbol, timeframe) {
        const channel = `market.${symbol}.kline.${timeframe}`;
        const unsub = {
            unsub: channel,
            id: `${symbol}-${timeframe}`
        };
        
        this.subscriptions.delete(unsub);
        this.callbacks.delete(channel);
        this.send(unsub);
    }
};
