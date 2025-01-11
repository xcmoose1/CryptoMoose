// Market Intelligence Class with Request Queue Helper
class MarketIntelligenceQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.rateLimit = 100; // HTX rate limit
        this.requestCount = 0;
        this.resetTime = Date.now() + 1000;
        this.retryDelay = 1000;
        this.maxRetries = 3;
    }

    async add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ 
                request, 
                resolve, 
                reject,
                retries: 0
            });
            if (!this.processing) {
                this.process();
            }
        });
    }

    async process() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const now = Date.now();

        // Reset counter if we've passed the reset time
        if (now >= this.resetTime) {
            this.requestCount = 0;
            this.resetTime = now + 1000;
        }

        // Check if we've hit the rate limit
        if (this.requestCount >= this.rateLimit) {
            const waitTime = this.resetTime - now;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.process();
            return;
        }

        const { request, resolve, reject, retries } = this.queue[0];

        try {
            const response = await request();
            this.requestCount++;
            this.queue.shift();
            resolve(response);
        } catch (error) {
            if (retries < this.maxRetries && this.shouldRetry(error)) {
                // Move to end of queue with incremented retry count
                const item = this.queue.shift();
                item.retries++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
                this.queue.push(item);
            } else {
                this.queue.shift();
                reject(error);
            }
        }

        // Process next request
        this.process();
    }

    shouldRetry(error) {
        // Retry on network errors or specific API errors
        return error.code === 'ECONNRESET' || 
               error.code === 'ETIMEDOUT' ||
               error.status === 429 || // Too Many Requests
               error.status === 502 || // Bad Gateway
               error.status === 503 || // Service Unavailable
               error.status === 504;   // Gateway Timeout
    }
}

// Market Intelligence Class with improved error handling and validation
export class MarketIntelligence {
    constructor() {
        // Initialize request queue
        this.requestQueue = new MarketIntelligenceQueue();
        
        // Initialize DOM elements with validation
        const elements = {
            stablecoinMetrics: 'stablecoin-metrics',
            futuresData: 'futures-data',
            whaleAlerts: 'whale-alerts',
            liquidationData: 'liquidation-data'
        };

        this.elements = {};
        this.initialized = false;
        this.updateInterval = 30000; // 30 seconds
        this.currentPair = 'BTCUSDT';

        // Validate all required elements exist
        Object.entries(elements).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[key] = element;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        });
    }

    async init() {
        try {
            console.log('Initializing Market Intelligence...');
            
            // Wait for DOM to be ready
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    window.addEventListener('load', resolve);
                });
            }

            // Retry element initialization
            await this.initializeElements();

            // Only start updates if we have elements to update
            if (this.hasElements()) {
                await this.updateAllData();
                setInterval(() => this.updateAllData(), this.updateInterval);
                this.initialized = true;
                console.log('Market Intelligence initialized successfully');
            } else {
                console.warn('Market Intelligence initialized with missing elements');
            }
        } catch (error) {
            console.error('Error initializing Market Intelligence:', error);
        }
    }

    async initializeElements() {
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries && !this.hasElements()) {
            const elements = {
                stablecoinMetrics: 'stablecoin-metrics',
                futuresData: 'futures-data',
                whaleAlerts: 'whale-alerts',
                liquidationData: 'liquidation-data'
            };

            Object.entries(elements).forEach(([key, id]) => {
                if (!this.elements[key]) {
                    const element = document.getElementById(id);
                    if (element) {
                        this.elements[key] = element;
                        console.log(`Found element '${id}' on retry ${retries + 1}`);
                    }
                }
            });

            if (!this.hasElements()) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                retries++;
            }
        }
    }

    hasElements() {
        return Object.values(this.elements).some(element => element !== null);
    }

    async fetchWithQueue(endpoint) {
        return this.requestQueue.add(async () => {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
    }

    async updateAllData() {
        if (!this.hasElements()) {
            console.warn('No elements available to update');
            return;
        }

        // Only update elements that exist
        const updates = [];
        
        if (this.elements.stablecoinMetrics) {
            updates.push(this.updateStablecoinMetrics().catch(error => {
                console.error('Error updating stablecoin metrics:', error);
            }));
        }
        
        if (this.elements.futuresData) {
            updates.push(this.updateFuturesData().catch(error => {
                console.error('Error updating futures data:', error);
            }));
        }
        
        if (this.elements.whaleAlerts) {
            updates.push(this.updateWhaleAlerts().catch(error => {
                console.error('Error updating whale alerts:', error);
            }));
        }
        
        if (this.elements.liquidationData) {
            updates.push(this.updateLiquidationEvents().catch(error => {
                console.error('Error updating liquidation events:', error);
            }));
        }

        await Promise.allSettled(updates);
    }

    updateElement(elementKey, html) {
        const element = this.elements[elementKey];
        if (element) {
            try {
                element.innerHTML = html;
            } catch (error) {
                console.error(`Error updating ${elementKey}:`, error);
            }
        }
    }

    async updateStablecoinMetrics() {
        try {
            const data = await this.fetchWithQueue('/api/market-intelligence/stablecoin-metrics');
            const html = `
                <div class="metrics-container">
                    <div class="metric">
                        <h4>Total Market Cap</h4>
                        <p>$${(data.totalMarketCap / 1e9).toFixed(2)}B</p>
                    </div>
                    <div class="metric">
                        <h4>Dominance</h4>
                        <ul>
                            ${Object.entries(data.dominance)
                                .map(([coin, value]) => `
                                    <li>${coin}: ${value.toFixed(1)}%</li>
                                `).join('')}
                        </ul>
                    </div>
                    <div class="metric">
                        <h4>24h Volume</h4>
                        <p>$${(data.dailyVolume / 1e9).toFixed(2)}B</p>
                    </div>
                </div>
            `;
            
            this.updateElement('stablecoinMetrics', html);
        } catch (error) {
            console.error('Error fetching stablecoin metrics:', error);
            this.updateElement('stablecoinMetrics', '<div class="error">Failed to load stablecoin metrics</div>');
        }
    }

    async updateFuturesData() {
        try {
            const data = await this.fetchWithQueue('/api/market-intelligence/futures-data');
            const html = `
                <div class="futures-container">
                    <div class="metric">
                        <h4>Open Interest</h4>
                        <p>$${(data.openInterest / 1e9).toFixed(2)}B</p>
                    </div>
                    <div class="metric">
                        <h4>Long/Short Ratio</h4>
                        <p>${data.longShortRatio.toFixed(2)}</p>
                    </div>
                    <div class="metric">
                        <h4>Funding Rate</h4>
                        <p>${(data.fundingRate * 100).toFixed(3)}%</p>
                    </div>
                </div>
            `;
            
            this.updateElement('futuresData', html);
        } catch (error) {
            console.error('Error fetching futures data:', error);
            this.updateElement('futuresData', '<div class="error">Failed to load futures data</div>');
        }
    }

    async updateWhaleAlerts() {
        try {
            const data = await this.fetchWithQueue('/api/market-intelligence/whale-alerts');
            const html = `
                <div class="whale-alerts-container">
                    ${data.alerts.map(alert => `
                        <div class="alert">
                            <div class="alert-header">
                                <span class="amount">$${(alert.amount / 1e6).toFixed(2)}M</span>
                                <span class="type">${alert.type}</span>
                            </div>
                            <div class="alert-details">
                                <span class="time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
                                <span class="asset">${alert.asset}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            this.updateElement('whaleAlerts', html);
        } catch (error) {
            console.error('Error fetching whale alerts:', error);
            this.updateElement('whaleAlerts', '<div class="error">Failed to load whale alerts</div>');
        }
    }

    async updateLiquidationEvents() {
        try {
            const data = await this.fetchWithQueue('/api/market-intelligence/liquidation-events');
            const html = `
                <div class="liquidation-container">
                    <div class="metric">
                        <h4>24h Liquidations</h4>
                        <p>$${(data.total24h / 1e6).toFixed(2)}M</p>
                    </div>
                    <div class="recent-liquidations">
                        ${data.recent.map(event => `
                            <div class="liquidation-event">
                                <span class="amount">$${(event.amount / 1e3).toFixed(0)}K</span>
                                <span class="symbol">${event.symbol}</span>
                                <span class="side ${event.side.toLowerCase()}">${event.side}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            this.updateElement('liquidationData', html);
        } catch (error) {
            console.error('Error fetching liquidation events:', error);
            this.updateElement('liquidationData', '<div class="error">Failed to load liquidation data</div>');
        }
    }
}

// Create and export singleton instance
const marketIntelligence = new MarketIntelligence();
export { marketIntelligence };

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    marketIntelligence.init();
});
