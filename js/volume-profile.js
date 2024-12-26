class VolumeProfileTools {
    constructor() {
        this.currentPair = 'BTCUSDT';
        this.charts = {
            poc: null,
            vwap: null,
            depth: null
        };
        this.chartOptions = {
            width: 0,
            height: 300,
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        };
    }

    async initialize() {
        await this.initializeCharts();
        await this.updateData();
        
        // Update data every minute
        setInterval(() => this.updateData(), 60000);
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    async initializeCharts() {
        // Initialize POC Chart
        this.charts.poc = LightweightCharts.createChart(
            document.getElementById('pocChart'),
            this.chartOptions
        );

        // Initialize VWAP Chart
        this.charts.vwap = LightweightCharts.createChart(
            document.getElementById('vwapChart'),
            this.chartOptions
        );

        // Initialize Depth Chart
        this.charts.depth = LightweightCharts.createChart(
            document.getElementById('depthHeatmap'),
            this.chartOptions
        );

        this.handleResize();
    }

    handleResize() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.timeScale) {
                const parent = chart.chartElement.parentElement;
                if (parent) {
                    const width = parent.clientWidth;
                    chart.applyOptions({ width });
                }
            }
        });
    }

    async updateData() {
        try {
            const [klineData, depthData] = await Promise.all([
                this.fetchKlineData(),
                this.fetchOrderBookData()
            ]);

            await Promise.all([
                this.updatePOC(klineData),
                this.updateVWAP(klineData),
                this.updateDepth(depthData)
            ]);
        } catch (error) {
            console.error('Error updating volume profile data:', error);
        }
    }

    async fetchKlineData() {
        const response = await fetch(`/api/mexc/klines?symbol=${this.currentPair}&interval=1h&limit=24`);
        if (!response.ok) throw new Error('Failed to fetch kline data');
        return response.json();
    }

    async fetchOrderBookData() {
        const response = await fetch(`/api/mexc/depth?symbol=${this.currentPair}&limit=100`);
        if (!response.ok) throw new Error('Failed to fetch order book data');
        return response.json();
    }

    async updatePOC(klineData) {
        const volumeProfile = this.processVolumeProfile(klineData);
        const poc = this.findPOC(volumeProfile);

        // Update POC display
        document.getElementById('currentPOC').textContent = `$${poc.price.toFixed(2)}`;
        document.getElementById('pocVolume').textContent = `${poc.volume.toFixed(2)}`;

        // Update POC chart
        const series = this.charts.poc.addHistogramSeries({
            color: 'rgba(0, 255, 136, 0.5)',
            priceFormat: { type: 'price', precision: 2 },
        });

        const data = Object.entries(volumeProfile).map(([price, volume]) => ({
            time: klineData[0][0] / 1000,
            value: volume,
            color: parseFloat(price) === poc.price ? 'rgba(0, 255, 136, 0.8)' : 'rgba(0, 255, 136, 0.3)'
        }));

        series.setData(data);
    }

    async updateVWAP(klineData) {
        const vwap = this.calculateVWAP(klineData);
        
        // Update VWAP display
        document.getElementById('dailyVWAP').textContent = `$${vwap.toFixed(2)}`;

        // Update VWAP chart
        const series = this.charts.vwap.addLineSeries({
            color: 'rgba(0, 255, 136, 1)',
            lineWidth: 2,
        });

        const data = klineData.map(k => ({
            time: k[0] / 1000,
            value: parseFloat(k[4])
        }));

        series.setData(data);
    }

    async updateDepth(depthData) {
        const { buyWalls, sellWalls } = this.processOrderBook(depthData);

        // Update display
        document.getElementById('buyWall').textContent = buyWalls[0] ? 
            `$${buyWalls[0].price.toFixed(2)}` : 'N/A';
        document.getElementById('sellWall').textContent = sellWalls[0] ? 
            `$${sellWalls[0].price.toFixed(2)}` : 'N/A';

        // Update depth chart
        const series = this.charts.depth.addHistogramSeries({
            color: 'rgba(0, 255, 136, 0.5)',
            priceFormat: { type: 'price', precision: 2 },
        });

        const data = [...buyWalls, ...sellWalls].map(wall => ({
            time: Date.now() / 1000,
            value: wall.volume,
            color: wall.type === 'buy' ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 68, 68, 0.5)'
        }));

        series.setData(data);
    }

    processVolumeProfile(klineData) {
        const profile = {};
        klineData.forEach(k => {
            const price = parseFloat(k[4]); // Close price
            const volume = parseFloat(k[5]); // Volume
            const priceKey = Math.round(price * 100) / 100;
            profile[priceKey] = (profile[priceKey] || 0) + volume;
        });
        return profile;
    }

    findPOC(volumeProfile) {
        let maxVolume = 0;
        let pocPrice = 0;
        
        Object.entries(volumeProfile).forEach(([price, volume]) => {
            if (volume > maxVolume) {
                maxVolume = volume;
                pocPrice = parseFloat(price);
            }
        });
        
        return { price: pocPrice, volume: maxVolume };
    }

    calculateVWAP(klineData) {
        let sumPV = 0;
        let sumV = 0;
        
        klineData.forEach(k => {
            const typicalPrice = (parseFloat(k[2]) + parseFloat(k[3]) + parseFloat(k[4])) / 3;
            const volume = parseFloat(k[5]);
            sumPV += typicalPrice * volume;
            sumV += volume;
        });
        
        return sumPV / sumV;
    }

    processOrderBook(depthData) {
        const buyWalls = this.processOrders(depthData.bids, 'buy');
        const sellWalls = this.processOrders(depthData.asks, 'sell');
        return { buyWalls, sellWalls };
    }

    processOrders(orders, type) {
        const walls = [];
        let currentVolume = 0;
        let lastPrice = 0;
        
        orders.forEach(order => {
            const [price, volume] = order.map(parseFloat);
            if (Math.abs(price - lastPrice) < 1) {
                currentVolume += volume;
            } else {
                if (currentVolume > 10) {
                    walls.push({ price: lastPrice, volume: currentVolume, type });
                }
                currentVolume = volume;
            }
            lastPrice = price;
        });
        
        return walls.sort((a, b) => b.volume - a.volume);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const volumeProfile = new VolumeProfileTools();
    volumeProfile.initialize().catch(console.error);
});
