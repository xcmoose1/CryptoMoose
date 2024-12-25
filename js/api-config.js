// API Configuration Service
class APIConfig {
    constructor() {
        // Store API keys
        this.ALPHAVANTAGE_API_KEY = 'YEN7HZTF619XVWSC';
        this.FINNHUB_API_KEY = 'ctm6l7hr01qvk0t3gitgctm6l7hr01qvk0t3giu0';
        
        this.ALPHAVANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
        this.FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
    }

    // AlphaVantage API calls
    async getCryptoIntraday(symbol, market = 'USD') {
        const url = `${this.ALPHAVANTAGE_BASE_URL}?function=CRYPTO_INTRADAY&symbol=${symbol}&market=${market}&interval=5min&apikey=${this.ALPHAVANTAGE_API_KEY}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching AlphaVantage data:', error);
            return null;
        }
    }

    async getCryptoNews() {
        const url = `${this.ALPHAVANTAGE_BASE_URL}?function=NEWS_SENTIMENT&topics=cryptocurrency&apikey=${this.ALPHAVANTAGE_API_KEY}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching AlphaVantage news:', error);
            return null;
        }
    }

    // Finnhub API calls
    async getCryptoCandles(symbol, resolution = 'D') {
        const to = Math.floor(Date.now() / 1000);
        const from = to - 7 * 24 * 60 * 60; // Last 7 days
        const url = `${this.FINNHUB_BASE_URL}/crypto/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${this.FINNHUB_API_KEY}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching Finnhub data:', error);
            return null;
        }
    }

    async getCryptoSentiment(symbol) {
        const url = `${this.FINNHUB_BASE_URL}/crypto/sentiment?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching Finnhub sentiment:', error);
            return null;
        }
    }
}

// Initialize and export config
const apiConfig = new APIConfig();
export default apiConfig;
