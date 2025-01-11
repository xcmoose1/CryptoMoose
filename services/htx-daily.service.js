import { htxConfig } from '../config/daily-update.config.js';

export class HTXDailyService {
    constructor() {
        this.baseUrl = 'https://api.huobi.pro';  // Using public API endpoint
    }

    async getCurrentPrice(symbol) {
        try {
            // Using HTX's public market detail ticker endpoint
            const response = await fetch(`${this.baseUrl}/market/detail/merged?symbol=${symbol.toLowerCase()}usdt`);
            
            if (!response.ok) {
                throw new Error(`HTX API error: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'ok' && data.tick) {
                return data.tick.close;  // Current price
            } else {
                throw new Error('Invalid response format from HTX');
            }
        } catch (error) {
            console.error('Error fetching price from HTX:', error);
            throw error;
        }
    }
}
