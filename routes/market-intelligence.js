import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Stablecoin Metrics
router.get('/stablecoin-metrics', async (req, res) => {
    try {
        // Mock data for now - replace with actual API integration later
        const metrics = {
            totalMarketCap: 150000000000,
            dominance: {
                USDT: 45.5,
                USDC: 30.2,
                BUSD: 15.3,
                DAI: 9.0
            },
            dailyVolume: 85000000000,
            peg: {
                USDT: 1.0001,
                USDC: 0.9999,
                BUSD: 1.0002,
                DAI: 1.0000
            }
        };
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching stablecoin metrics:', error);
        res.status(500).json({ error: 'Failed to fetch stablecoin metrics' });
    }
});

// Futures Data
router.get('/futures-data', async (req, res) => {
    try {
        // Mock data for now - replace with actual API integration later
        const data = {
            openInterest: 12500000000,
            fundingRates: {
                BTC: 0.01,
                ETH: 0.008,
                SOL: 0.015
            },
            longShortRatio: 1.2,
            liquidations: {
                last24h: 150000000,
                longs: 80000000,
                shorts: 70000000
            }
        };
        res.json(data);
    } catch (error) {
        console.error('Error fetching futures data:', error);
        res.status(500).json({ error: 'Failed to fetch futures data' });
    }
});

// Whale Alerts
router.get('/whale-alerts', async (req, res) => {
    try {
        // Mock data for now - replace with actual API integration later
        const alerts = {
            transactions: [
                {
                    time: Date.now(),
                    amount: 1000,
                    coin: 'BTC',
                    from: 'Unknown Wallet',
                    to: 'Binance',
                    type: 'Exchange Inflow'
                },
                {
                    time: Date.now() - 3600000,
                    amount: 10000,
                    coin: 'ETH',
                    from: 'Coinbase',
                    to: 'Unknown Wallet',
                    type: 'Exchange Outflow'
                }
            ],
            summary: {
                totalValue: 50000000,
                largestTx: 10000000,
                exchangeInflow: 25000000,
                exchangeOutflow: 25000000
            }
        };
        res.json(alerts);
    } catch (error) {
        console.error('Error fetching whale alerts:', error);
        res.status(500).json({ error: 'Failed to fetch whale alerts' });
    }
});

// Liquidation Events
router.get('/liquidation-events', async (req, res) => {
    try {
        // Mock data for now - replace with actual API integration later
        const events = {
            recent: [
                {
                    time: Date.now(),
                    amount: 1000000,
                    coin: 'BTC',
                    type: 'Long',
                    price: 42000
                },
                {
                    time: Date.now() - 1800000,
                    amount: 500000,
                    coin: 'ETH',
                    type: 'Short',
                    price: 2200
                }
            ],
            summary: {
                total24h: 100000000,
                largestEvent: 5000000,
                longVsShort: 1.2
            }
        };
        res.json(events);
    } catch (error) {
        console.error('Error fetching liquidation events:', error);
        res.status(500).json({ error: 'Failed to fetch liquidation events' });
    }
});

export default router;
