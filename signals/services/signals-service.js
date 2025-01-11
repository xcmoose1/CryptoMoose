import { SIGNALS_CONFIG } from '../config/signals-config.js';
import { RSI, MACD } from 'technicalindicators';
import WebSocket from 'ws';
import { createTelegramService } from './telegram-service.js';

export class SignalsService {
    constructor() {
        this.ws = null;
        this.signals = new Map();
        this.subscriptions = new Map();
        this.lastSignals = new Map();
        this.indicators = new Map();
        this.telegramBot = null;  
        this.candleHistory = new Map(); 
    }

    async initialize() {
        try {
            this.telegramBot = createTelegramService();
            
            await this.connectWebSocket();
            await this.setupIndicators();
            this.startMonitoring();
        } catch (error) {
            console.error('Failed to initialize SignalsService:', error);
            throw error;
        }
    }

    startMonitoring() {
        SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
            this.subscriptions.set(pair, {
                lastCheck: Date.now(),
                indicators: new Map()
            });
            
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const subscribeMsg = {
                    method: 'SUBSCRIBE',
                    params: [`${pair.toLowerCase()}@kline_1m`],
                    id: Date.now()
                };
                this.ws.send(JSON.stringify(subscribeMsg));
            }
        });

        console.log('Started monitoring for pairs:', SIGNALS_CONFIG.TRADING_PAIRS);
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(SIGNALS_CONFIG.WS_URL);

            this.ws.on('open', () => {
                console.log('WebSocket connected');
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleWebSocketMessage(data);
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('WebSocket connection closed');
                setTimeout(() => this.connectWebSocket(), SIGNALS_CONFIG.RATE_LIMITS.RETRY_DELAY);
            });
        });
    }

    handleWebSocketMessage(message) {
        try {
            const data = typeof message === 'string' ? JSON.parse(message) : message;
            
            if (data.stream && data.data) {
                const [symbol, interval] = data.stream.split('@');
                const candle = data.data.k;
                
                if (candle && candle.x) { 
                    this.updateCandleHistory(symbol, {
                        time: candle.t,
                        open: parseFloat(candle.o),
                        high: parseFloat(candle.h),
                        low: parseFloat(candle.l),
                        close: parseFloat(candle.c),
                        volume: parseFloat(candle.v),
                        closeTime: candle.T,
                        isFinal: candle.x
                    });
                    
                    this.processSignals(symbol);
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            console.log('Raw message:', message);
        }
    }

    async setupIndicators() {
        SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
            this.indicators.set(pair, {
                rsi: new RSI({ period: 14, values: [] }),
                macd: new MACD({
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    SimpleMAOscillator: false,
                    SimpleMASignal: false,
                    values: []
                })
            });
        });
    }

    updateCandleHistory(symbol, candle) {
        if (!this.candleHistory.has(symbol)) {
            this.candleHistory.set(symbol, []);
        }
        
        const history = this.candleHistory.get(symbol);
        history.push(candle);
        
        if (history.length > 100) {
            history.shift();
        }
    }

    async processSignals(symbol) {
        const history = this.candleHistory.get(symbol);
        if (!history || history.length < 30) return; 
        
        const closes = history.map(c => c.close);
        const volumes = history.map(c => c.volume);
        
        const indicators = this.indicators.get(symbol);
        const rsi = indicators.rsi.nextValue(closes[closes.length - 1]);
        const macd = indicators.macd.nextValue(closes[closes.length - 1]);
        
        if (rsi < 30 || rsi > 70) {
            const signal = {
                type: rsi < 30 ? 'BUY' : 'SELL',
                symbol,
                price: closes[closes.length - 1],
                rsi,
                macd,
                time: new Date().toISOString()
            };
            
            const lastSignal = this.lastSignals.get(symbol);
            if (!lastSignal || Date.now() - lastSignal.time > 3600000) { 
                this.lastSignals.set(symbol, { type: signal.type, time: Date.now() });
                await this.sendSignal(signal);
            }
        }
    }

    async sendSignal(signal) {
        try {
            const message = ` ${signal.type} Signal for ${signal.symbol}\n\n` +
                          `Price: ${signal.price}\n` +
                          `RSI: ${signal.rsi.toFixed(2)}\n` +
                          `MACD: ${signal.macd.MACD.toFixed(2)}\n` +
                          `Time: ${signal.time}`;
            
            await this.telegramBot.sendMessage(message);
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }
}

export const signalsService = new SignalsService();
