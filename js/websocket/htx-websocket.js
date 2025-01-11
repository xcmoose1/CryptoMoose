// HTX WebSocket Manager
// @ts-check

import { HTX_CONFIG } from '../config/htx-config.js';
// pako is loaded from CDN in the HTML file

// Export the class first
export class HTXWebSocket {
    constructor() {
        this.ws = null;
        this.subscriptions = new Map();
        this.lastPongTime = Date.now();
        this.onMessage = null;
        this.retryCount = 0;
        this.retryDelay = HTX_CONFIG.MARKET_CONFIG.RETRY_DELAY;
        this.maxRetries = HTX_CONFIG.MARKET_CONFIG.MAX_RETRIES;
        this.initialized = false;
        this.pingInterval = null;
        this.pongCheckInterval = null;
    }

    async init() {
        if (this.initialized) {
            console.log('WebSocket already initialized');
            return;
        }

        return new Promise((resolve, reject) => {
            const tryConnect = async () => {
                try {
                    console.log(`Attempting connection to WebSocket endpoint: ${HTX_CONFIG.WS_URL}`);
                    
                    // Create WebSocket connection
                    this.ws = new WebSocket(HTX_CONFIG.WS_URL);
                    
                    // Set binary type to arraybuffer for proper message handling
                    this.ws.binaryType = 'arraybuffer';
                    
                    this.ws.onopen = () => {
                        console.log('WebSocket connected successfully');
                        this.initialized = true;
                        this.retryCount = 0;
                        this.startPingPong();
                        resolve();
                    };

                    this.ws.onclose = async (event) => {
                        console.log('WebSocket disconnected:', event);
                        this.initialized = false;
                        this.cleanup();
                        
                        if (this.retryCount < this.maxRetries) {
                            const delay = this.retryDelay * Math.pow(2, this.retryCount);
                            console.log(`Attempting reconnection in ${delay}ms... (${this.retryCount + 1}/${this.maxRetries})`);
                            
                            this.retryCount++;
                            setTimeout(tryConnect, delay);
                        } else {
                            console.error('Max retry attempts reached');
                            reject(new Error('Failed to establish WebSocket connection after all retries'));
                        }
                    };

                    this.ws.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        if (!this.initialized) {
                            reject(error);
                        }
                    };

                    this.ws.onmessage = async (event) => {
                        try {
                            let message;
                            
                            if (event.data instanceof ArrayBuffer) {
                                const uint8Array = new Uint8Array(event.data);
                                const text = pako.ungzip(uint8Array, { to: 'string' });
                                message = JSON.parse(text);
                            } else if (typeof event.data === 'string') {
                                message = JSON.parse(event.data);
                            } else {
                                console.error('Unknown message format:', event.data);
                                return;
                            }
                            
                            // Handle ping/pong
                            if (message.ping) {
                                this.send({ pong: message.ping }).catch(error => {
                                    console.error('Failed to send pong:', error);
                                });
                                this.lastPongTime = Date.now();
                                return;
                            }
                            
                            // Handle subscription response
                            if (message.status === 'ok' && message.subbed) {
                                console.log('Successfully subscribed to:', message.subbed);
                                return;
                            }
                            
                            // Handle error messages
                            if (message.status === 'error') {
                                console.error('Received error from server:', message);
                                return;
                            }
                            
                            // Handle subscription data
                            if (message.ch && this.subscriptions.has(message.ch)) {
                                const callback = this.subscriptions.get(message.ch);
                                if (callback && typeof callback === 'function') {
                                    callback(message.tick || message.data);
                                }
                            }
                            
                        } catch (error) {
                            console.error('Error handling message:', error);
                        }
                    };
                    
                } catch (error) {
                    console.error('Failed to initialize WebSocket:', error);
                    reject(error);
                }
            };
            
            // Start connection attempt
            tryConnect().catch(reject);
        });
    }

    startPingPong() {
        // Clear existing intervals
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.pongCheckInterval) clearInterval(this.pongCheckInterval);

        // Send ping every 5 seconds
        this.pingInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send({ ping: Date.now() }).catch(error => {
                    console.error('Failed to send ping:', error);
                });
            }
        }, 5000);

        // Check for pong responses every 15 seconds
        this.pongCheckInterval = setInterval(() => {
            const now = Date.now();
            if (now - this.lastPongTime > 15000) {
                console.warn('No pong received for 15 seconds, reconnecting...');
                this.ws.close();
            }
        }, 15000);
    }

    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    subscribe(channel, callback) {
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, callback);
            
            // Format for market websocket
            const subMsg = {
                sub: channel,
                id: Date.now()
            };
            
            this.send(subMsg).catch(error => {
                console.error('Failed to subscribe:', error);
            });
        } else {
            console.warn(`Already subscribed to channel: ${channel}`);
        }
    }

    unsubscribe(channel) {
        if (this.subscriptions.has(channel)) {
            this.subscriptions.delete(channel);
            
            // Format for market websocket
            const unsubMsg = {
                unsub: channel,
                id: Date.now()
            };
            
            this.send(unsubMsg).catch(error => {
                console.error('Failed to unsubscribe:', error);
            });
        }
    }

    async send(data) {
        if (!this.isConnected()) {
            throw new Error('WebSocket is not connected');
        }
        return new Promise((resolve, reject) => {
            try {
                this.ws.send(JSON.stringify(data));
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.pongCheckInterval) {
            clearInterval(this.pongCheckInterval);
            this.pongCheckInterval = null;
        }
        this.subscriptions.clear();
        this.lastPongTime = Date.now();
    }

    async fetchKlines(symbol, period, size = 300) {
        try {
            const url = `${HTX_CONFIG.API_ENDPOINTS.MARKET}/market/history/kline?symbol=${symbol}&period=${period}&size=${size}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.status === 'ok') {
                return data.data;
            }
            throw new Error('Failed to fetch klines data');
        } catch (error) {
            console.error('Error fetching klines:', error);
            throw error;
        }
    }

    async retryConnection() {
        if (this.retryCount >= this.maxRetries) {
            console.error('Max retry attempts reached');
            return;
        }

        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        console.log(`Retrying connection in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            await this.init();
            // Resubscribe to all channels
            for (const [channel, callback] of this.subscriptions.entries()) {
                this.subscribe(channel, callback);
            }
        } catch (error) {
            console.error('Retry failed:', error);
        }
    }
}

// Create and export singleton instance
const htxWebSocket = new HTXWebSocket();
export { htxWebSocket };  // Named export
export default htxWebSocket;
