class HTXMarketData {
    constructor() {
        this.ws = new HTXWebSocket();
        this.currentSegment = 'top';
        this.activeTimeframe = '1h';
        this.projectionData = new Map();
    }

    async initialize() {
        await this.subscribeToSegment(this.currentSegment);
    }

    async subscribeToSegment(segment) {
        // Unsubscribe from previous symbols
        if (this.currentSegment !== segment) {
            const prevSymbols = HTX_CONFIG.SUPPORTED_SEGMENTS[this.currentSegment];
            prevSymbols.forEach(symbol => {
                this.ws.unsubscribe(`${symbol}USDT`, this.activeTimeframe);
            });
        }

        // Subscribe to new segment
        this.currentSegment = segment;
        const symbols = HTX_CONFIG.SUPPORTED_SEGMENTS[segment];
        
        symbols.forEach(symbol => {
            this.ws.subscribe(`${symbol}USDT`, this.activeTimeframe, (data) => {
                this.updateProjectionData(symbol, data);
            });
        });
    }

    updateProjectionData(symbol, data) {
        const projectionCard = document.querySelector(`[data-symbol="${symbol}"]`);
        if (!projectionCard) return;

        // Update price and change data
        const price = data.close;
        const change = ((data.close - data.open) / data.open) * 100;
        
        // Update DOM elements
        projectionCard.querySelector('.current-price').textContent = `$${price.toFixed(4)}`;
        const changeElement = projectionCard.querySelector('.price-change');
        changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeElement.classList.toggle('positive', change >= 0);
        changeElement.classList.toggle('negative', change < 0);

        // Store data for AI analysis
        this.projectionData.set(symbol, {
            price,
            change,
            volume: data.vol,
            high: data.high,
            low: data.low,
            timestamp: data.ts
        });
    }

    async getHistoricalData(symbol, timeframe = '1d', limit = 30) {
        const response = await fetch(`${HTX_CONFIG.REST_URL}/market/history/kline?symbol=${symbol}USDT&period=${timeframe}&size=${limit}`);
        const data = await response.json();
        return data.data;
    }

    async generateProjections(symbol) {
        const historicalData = await this.getHistoricalData(symbol);
        const currentData = this.projectionData.get(symbol);
        
        // Simple projection based on moving averages and volume
        const ma7 = historicalData.slice(0, 7).reduce((acc, cur) => acc + cur.close, 0) / 7;
        const ma30 = historicalData.reduce((acc, cur) => acc + cur.close, 0) / 30;
        const volumeAvg = historicalData.reduce((acc, cur) => acc + cur.vol, 0) / 30;
        
        const trend = ma7 > ma30 ? 'bullish' : 'bearish';
        const volumeStrength = currentData.volume > volumeAvg ? 'high' : 'low';
        
        return {
            shortTerm: trend === 'bullish' ? currentData.price * 1.05 : currentData.price * 0.95,
            midTerm: trend === 'bullish' ? currentData.price * 1.15 : currentData.price * 0.85,
            confidence: trend === 'bullish' && volumeStrength === 'high' ? 'high' : 'medium',
            trend,
            volumeStrength
        };
    }
}
