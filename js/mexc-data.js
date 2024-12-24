class MexcDataHandler {
    constructor() {
        this.currentPair = 'BTCUSDT';
        this.interval = '4h';  // Changed from 1h to 4h
        console.log('MexcDataHandler initialized with:', { pair: this.currentPair, interval: this.interval });
    }

    async getKlineData(symbol = this.currentPair, interval = this.interval) {
        try {
            console.log('Fetching kline data for:', { symbol, interval });
            const response = await fetch(`/api/mexc/klines?symbol=${symbol}&interval=${interval}&limit=100`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format from MEXC');
            }

            console.log('Received kline data:', { count: data.length, firstTimestamp: data[0][0], lastTimestamp: data[data.length-1][0] });

            // MEXC kline format: [timestamp, open, high, low, close, volume, closeTime, quoteVolume]
            const klines = data.map(k => ({
                timestamp: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
            }));

            // Calculate indicators
            const prices = klines.map(k => k.close);
            const volumes = klines.map(k => k.volume);

            return {
                klines,
                prices,
                volumes,
                lastPrice: prices[prices.length - 1],
                lastVolume: volumes[volumes.length - 1]
            };
        } catch (error) {
            console.error('Error fetching MEXC data:', error);
            throw error;
        }
    }
}

// Create a singleton instance
const mexcData = new MexcDataHandler();

// Export the instance
export default mexcData;

// Also make it globally available
window.mexcData = mexcData;
