// Volume Profile Tools Manager
import { HTX_CONFIG, HTX_INTERVALS, formatKlineData, htxHandler } from './config/htx-config.js';
import htxWebSocket from './websocket/htx-websocket.js';

class VolumeProfileTools {
    constructor() {
        this.chartWidth = 800;
        this.chartHeight = 400;
        this.numPriceLevels = 100;
        this.timeframes = ['1d', '1w', '1M'];
        this.currentPair = 'btcusdt';
        this.colors = {
            background: '#1e1e2d',
            text: '#d1d4dc',
            grid: '#363a45',
            poc: 'rgba(255, 0, 0, 0.8)',
            buyVolume: 'rgba(76, 175, 80, 0.6)',
            sellVolume: 'rgba(244, 67, 54, 0.6)',
            valueArea: 'rgba(100, 149, 237, 0.2)'
        };
        this.lastUpdate = null;
        this.updateInterval = 12 * 60 * 60 * 1000; // 12 hours
        this.initialized = false;
        this.chartConfigs = {
            barHeight: 1,
            padding: {
                top: 20,
                right: 60,
                bottom: 20,
                left: 60
            }
        };
        this.charts = new Map();
    }

    async init() {
        try {
            console.log('Initializing Volume Profile Tools...');
            this.initializeCanvases();
            await this.updateAllCharts();
            this.initializeVolumeControls();
            console.log('Volume Profile Tools initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Volume Profile Tools:', error);
            throw error;
        }
    }

    initializeCanvases() {
        for (const timeframe of this.timeframes) {
            // Initialize volume profile canvas
            const vpCanvas = document.getElementById(`volume-profile-${timeframe}`);
            if (vpCanvas) {
                const vpCtx = vpCanvas.getContext('2d');
                vpCanvas.width = this.chartWidth;
                vpCanvas.height = this.chartHeight;
                this.charts.set(`vp-${timeframe}`, vpCtx);
            }

            // Initialize heatmap canvas
            const hmCanvas = document.getElementById(`volume-heatmap-${timeframe}`);
            if (hmCanvas) {
                const hmCtx = hmCanvas.getContext('2d');
                hmCanvas.width = this.chartWidth;
                hmCanvas.height = this.chartHeight;
                this.charts.set(`hm-${timeframe}`, hmCtx);
            }
        }
    }

    async updateAllCharts() {
        console.log('Updating all charts...');
        const allData = {};
        
        for (const timeframe of this.timeframes) {
            try {
                console.log(`Updating ${timeframe} chart...`);
                const klineData = await this.fetchKlineData(timeframe);
                if (klineData && klineData.length > 0) {
                    const volumeProfile = this.calculateVolumeProfile(klineData);
                    allData[timeframe] = volumeProfile;
                    
                    // Update charts
                    const vpCanvas = this.charts.get(`vp-${timeframe}`);
                    const hmCanvas = this.charts.get(`hm-${timeframe}`);
                    
                    if (vpCanvas) {
                        vpCanvas.clearRect(0, 0, this.chartWidth, this.chartHeight);
                        this.generateChartImage(volumeProfile, vpCanvas, klineData);
                    }
                    if (hmCanvas) {
                        hmCanvas.clearRect(0, 0, this.chartWidth, this.chartHeight);
                        this.generateHeatmap(klineData, hmCanvas, volumeProfile.minPrice, volumeProfile.maxPrice);
                    }
                }
            } catch (error) {
                console.error(`Error updating ${timeframe} chart:`, error);
                this.displayNoDataMessage(timeframe);
            }
        }
        
        // Update AI insights with all timeframe data
        await this.updateAIInsights(allData);
    }

    async fetchKlineData(timeframe) {
        try {
            const period = htxHandler.timeframeToPeriod(timeframe);
            const size = {
                '1d': 200,   // Last 200 1-day candles
                '1w': 200,   // Last 200 1-week candles
                '1M': 200    // Last 200 1-month candles
            }[timeframe] || 200;

            console.log(`Fetching klines for ${timeframe} with period ${period} and size ${size}`);
            const data = await htxHandler.getKlines(this.currentPair, period, size);
            
            if (!data || data.length === 0) {
                throw new Error('No kline data received');
            }

            // Sort data by timestamp in ascending order
            return data.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Error fetching kline data:', error);
            throw error;
        }
    }

    async updateAIInsights(allData) {
        try {
            const insightElement = document.getElementById('volume-profile-ai-insight');
            if (!insightElement) return;

            insightElement.innerHTML = '<div class="loading">Analyzing volume profiles...</div>';

            const analysisData = {};
            for (const [timeframe, profile] of Object.entries(allData)) {
                if (profile && profile.poc) {
                    analysisData[timeframe] = {
                        poc: profile.poc.toFixed(2),
                        vah: profile.valueAreaHigh.toFixed(2),
                        val: profile.valueAreaLow.toFixed(2)
                    };
                }
            }

            const response = await fetch('/api/ai/volume-profile-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ volumeData: analysisData })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to get AI analysis');
            }

            insightElement.innerHTML = `
                <div class="ai-insight-content">
                    <h4>AI Trading Insights</h4>
                    <div class="insight-text">${data.analysis}</div>
                </div>
            `;
        } catch (error) {
            console.error('Error getting AI insights:', error);
            const insightElement = document.getElementById('volume-profile-ai-insight');
            if (insightElement) {
                insightElement.innerHTML = '<div class="error">Failed to load AI insights</div>';
            }
        }
    }

    displayNoDataMessage(timeframe) {
        const chartElement = document.getElementById(`volume-profile-${timeframe}`);
        if (chartElement) {
            chartElement.innerHTML = '<div class="no-data-message">No data available</div>';
        }
    }

    calculateVolumeProfile(klineData) {
        try {
            // Extract all prices and volumes
            const prices = klineData.map(k => parseFloat(k.close));
            const volumes = klineData.map(k => parseFloat(k.volume));
            
            // Calculate price range
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = maxPrice - minPrice;
            const priceStep = priceRange / this.numPriceLevels;

            // Initialize arrays for price levels and volumes
            const priceLevels = Array.from({ length: this.numPriceLevels }, 
                (_, i) => minPrice + (i * priceStep));
            const volumeData = Array.from({ length: this.numPriceLevels }, 
                () => ({ buy: 0, sell: 0 }));

            // Calculate volumes for each price level
            klineData.forEach(candle => {
                const close = parseFloat(candle.close);
                const open = parseFloat(candle.open);
                const volume = parseFloat(candle.volume);
                
                const priceIndex = Math.floor((close - minPrice) / priceStep);
                if (priceIndex >= 0 && priceIndex < this.numPriceLevels) {
                    if (close >= open) {
                        volumeData[priceIndex].buy += volume;
                    } else {
                        volumeData[priceIndex].sell += volume;
                    }
                }
            });

            // Calculate total volume and POC
            let maxVolumeLevel = 0;
            let maxVolume = 0;
            volumeData.forEach((vol, i) => {
                const totalVol = vol.buy + vol.sell;
                if (totalVol > maxVolume) {
                    maxVolume = totalVol;
                    maxVolumeLevel = i;
                }
            });

            // Calculate Value Area (70% of total volume)
            const totalVolume = volumeData.reduce((sum, vol) => sum + vol.buy + vol.sell, 0);
            const valueAreaVolume = totalVolume * 0.7;
            let currentVolume = 0;
            let upperIndex = maxVolumeLevel;
            let lowerIndex = maxVolumeLevel;

            while (currentVolume < valueAreaVolume && (upperIndex < this.numPriceLevels - 1 || lowerIndex > 0)) {
                const upperVol = upperIndex < this.numPriceLevels - 1 ? 
                    volumeData[upperIndex + 1].buy + volumeData[upperIndex + 1].sell : 0;
                const lowerVol = lowerIndex > 0 ? 
                    volumeData[lowerIndex - 1].buy + volumeData[lowerIndex - 1].sell : 0;

                if (upperVol >= lowerVol && upperIndex < this.numPriceLevels - 1) {
                    upperIndex++;
                    currentVolume += upperVol;
                } else if (lowerIndex > 0) {
                    lowerIndex--;
                    currentVolume += lowerVol;
                }
            }

            return {
                priceLevels,
                volumes: volumeData,
                poc: {
                    price: priceLevels[maxVolumeLevel],
                    volume: maxVolume
                },
                valueArea: {
                    high: priceLevels[upperIndex],
                    low: priceLevels[lowerIndex]
                },
                minPrice,
                maxPrice,
                priceVolumes: volumeData.map((vol, i) => ({
                    price: priceLevels[i],
                    volume: vol.buy + vol.sell,
                    buyVolume: vol.buy,
                    sellVolume: vol.sell
                }))
            };
        } catch (error) {
            console.error('Error calculating volume profile:', error);
            return null;
        }
    }

    generateChartImage(volumeProfile, canvas, klineData) {
        const ctx = canvas;
        const width = canvas.canvas.width;
        const height = canvas.canvas.height;
        const padding = { top: 20, right: 100, bottom: 20, left: 60 };
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, width, height);

        const chartArea = {
            width: width - padding.left - padding.right,
            height: height - padding.top - padding.bottom
        };

        // Draw volume profile (left 85%)
        const volumeWidth = chartArea.width * 0.85;
        const maxVolume = Math.max(...volumeProfile.volumes.map(vol => vol.buy + vol.sell));
        
        // Draw price grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (i * chartArea.height / 5);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw volume bars
        volumeProfile.volumes.forEach((volume, i) => {
            const price = volumeProfile.priceLevels[i];
            const y = padding.top + chartArea.height * (1 - (price - volumeProfile.minPrice) / (volumeProfile.maxPrice - volumeProfile.minPrice));
            const barHeight = chartArea.height / volumeProfile.volumes.length;
            
            // Buy volume (green)
            const buyWidth = (volume.buy / maxVolume) * volumeWidth;
            ctx.fillStyle = this.colors.buyVolume;
            ctx.fillRect(padding.left, y - barHeight/2, buyWidth, barHeight);
            
            // Sell volume (red)
            const sellWidth = (volume.sell / maxVolume) * volumeWidth;
            ctx.fillStyle = this.colors.sellVolume;
            ctx.fillRect(padding.left + buyWidth, y - barHeight/2, sellWidth, barHeight);
        });

        // Draw candlesticks (right 15%)
        const candleArea = {
            x: padding.left + volumeWidth + 10,
            width: chartArea.width * 0.15 - 10
        };

        // Calculate candle dimensions
        const candleWidth = candleArea.width * 0.8;
        const wickWidth = 1;

        // Draw each candle
        klineData.forEach(candle => {
            const isGreen = candle.close >= candle.open;
            const y = padding.top + chartArea.height * (1 - (candle.close - volumeProfile.minPrice) / (volumeProfile.maxPrice - volumeProfile.minPrice));
            
            // Draw wick
            ctx.strokeStyle = isGreen ? this.colors.buyVolume : this.colors.sellVolume;
            ctx.lineWidth = wickWidth;
            ctx.beginPath();
            ctx.moveTo(candleArea.x + candleWidth/2, 
                      padding.top + chartArea.height * (1 - (candle.high - volumeProfile.minPrice) / (volumeProfile.maxPrice - volumeProfile.minPrice)));
            ctx.lineTo(candleArea.x + candleWidth/2, 
                      padding.top + chartArea.height * (1 - (candle.low - volumeProfile.minPrice) / (volumeProfile.maxPrice - volumeProfile.minPrice)));
            ctx.stroke();

            // Draw candle body
            ctx.fillStyle = isGreen ? this.colors.buyVolume : this.colors.sellVolume;
            const candleHeight = Math.max(1, Math.abs(
                chartArea.height * (candle.close - candle.open) / (volumeProfile.maxPrice - volumeProfile.minPrice)
            ));
            ctx.fillRect(
                candleArea.x,
                isGreen ? y : y - candleHeight,
                candleWidth,
                candleHeight
            );
        });

        // Draw price labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        
        for (let i = 0; i <= 5; i++) {
            const price = volumeProfile.minPrice + (i * (volumeProfile.maxPrice - volumeProfile.minPrice) / 5);
            const y = padding.top + (5 - i) * chartArea.height / 5;
            ctx.fillText(price.toFixed(2), padding.left - 5, y + 4);
        }

        return canvas;
    }

    generateHeatmap(klineData, canvas, minPrice, maxPrice) {
        const ctx = canvas;
        const width = canvas.canvas.width;
        const height = canvas.canvas.height;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, width, height);

        const chartArea = {
            width: width - padding.left - padding.right,
            height: height - padding.top - padding.bottom
        };

        // Calculate time divisions (24 periods)
        const timeSlots = 24;
        const priceSlots = 24;
        const cellWidth = chartArea.width / timeSlots;
        const cellHeight = chartArea.height / priceSlots;
        const priceRange = maxPrice - minPrice;
        const priceStep = priceRange / priceSlots;

        // Initialize heatmap data
        const heatmapData = Array(priceSlots).fill(0).map(() => 
            Array(timeSlots).fill(0)
        );

        // Calculate time range
        const timeStart = Math.min(...klineData.map(k => k.timestamp));
        const timeEnd = Math.max(...klineData.map(k => k.timestamp));
        const timeRange = timeEnd - timeStart;
        const timeStep = timeRange / timeSlots;

        // Fill heatmap data
        klineData.forEach(candle => {
            const timeIndex = Math.floor((candle.timestamp - timeStart) / timeStep);
            const price = (parseFloat(candle.high) + parseFloat(candle.low)) / 2;
            const priceIndex = Math.floor((price - minPrice) / priceStep);
            
            if (timeIndex >= 0 && timeIndex < timeSlots && priceIndex >= 0 && priceIndex < priceSlots) {
                heatmapData[priceIndex][timeIndex] += parseFloat(candle.volume);
            }
        });

        // Find max volume for color scaling
        const maxVolume = Math.max(...heatmapData.map(row => Math.max(...row)));

        // Draw heatmap cells
        heatmapData.forEach((row, priceIndex) => {
            row.forEach((volume, timeIndex) => {
                const intensity = volume / maxVolume;
                const x = padding.left + timeIndex * cellWidth;
                const y = padding.top + (priceSlots - 1 - priceIndex) * cellHeight;

                // Calculate color based on volume intensity
                const hue = 240; // Blue
                const saturation = 100;
                const lightness = Math.max(0, 100 - (intensity * 100));
                ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                
                ctx.fillRect(x, y, cellWidth, cellHeight);
            });
        });

        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 0.5;
        ctx.beginPath();

        // Vertical grid lines
        for (let i = 0; i <= timeSlots; i++) {
            const x = padding.left + i * cellWidth;
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
        }

        // Horizontal grid lines
        for (let i = 0; i <= priceSlots; i++) {
            const y = padding.top + i * cellHeight;
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
        }
        ctx.stroke();

        // Add price labels
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        
        for (let i = 0; i <= 4; i++) {
            const price = maxPrice - (i * priceRange / 4);
            const y = padding.top + (i * chartArea.height / 4);
            ctx.fillText(price.toFixed(2), padding.left - 5, y + 4);
        }

        // Add time labels
        ctx.textAlign = 'center';
        const timeFormat = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: false
        });

        for (let i = 0; i <= 6; i++) {
            const timestamp = timeStart + (i * timeRange / 6);
            const x = padding.left + (i * chartArea.width / 6);
            const time = new Date(timestamp);
            ctx.fillText(timeFormat.format(time), x, height - 5);
        }

        return canvas;
    }

    initializeVolumeControls() {
        const timeRangeSelect = document.getElementById('vpTimeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (event) => {
                const selectedTimeframe = event.target.value;
                this.updateChart(selectedTimeframe);
            });
        }
    }

    handleChartError(error) {
        console.error('Chart error:', error);
        // Update UI to show error state
        const chartContainer = document.getElementById('volumeProfileChart');
        if (chartContainer) {
            chartContainer.innerHTML = `<div class="chart-error">Error loading chart: ${error.message}</div>`;
        }
    }
}

// Create singleton instance
const volumeProfileTools = new VolumeProfileTools();
export default volumeProfileTools;
