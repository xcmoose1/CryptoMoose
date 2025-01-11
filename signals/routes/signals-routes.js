import express from 'express';
import { signalsService } from '../services/signals-service.js';
import { SIGNALS_CONFIG } from '../config/signals-config.js';
import { createTelegramService } from '../services/telegram-service.js';

const router = express.Router();

// Initialize services
const initializeServices = async () => {
    try {
        // Initialize signals service first
        await signalsService.initialize();
        console.log('SignalsService initialized successfully');

        // Then try to send the startup message
        try {
            const telegramService = createTelegramService();
            console.log('Created TelegramService instance');
            
            await telegramService.sendMessage('🚀 Signal Bot Started - Actively searching for trading signals...');
            console.log('Startup message sent successfully');
        } catch (telegramError) {
            console.error('Failed to send startup message:', telegramError);
            // Continue even if Telegram fails - the main service should still work
        }
    } catch (error) {
        console.error('Failed to initialize services:', error);
        // You might want to implement a retry mechanism here
    }
};

// Initialize services when the router is created
initializeServices().catch(error => {
    console.error('Top-level initialization error:', error);
});

// Test endpoint for Telegram
router.get('/test-telegram', async (req, res) => {
    try {
        const telegramService = createTelegramService();
        const result = await telegramService.sendMessage('🚀 Test message from CryptoMoose Signals');
        res.json({ success: true, result });
    } catch (error) {
        console.error('Failed to send test message:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data
        });
    }
});

// Get all active signals
router.get('/active', (req, res) => {
    try {
        const activeSignals = Array.from(signalsService.signals.values())
            .flat()
            .filter(signal => {
                const signalAge = Date.now() - signal.timestamp;
                return signalAge < SIGNALS_CONFIG.SIGNALS.COOLDOWN_PERIOD;
            });

        res.json({ success: true, data: activeSignals });
    } catch (error) {
        console.error('Error fetching active signals:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get historical signals for a specific pair
router.get('/history/:pair', (req, res) => {
    try {
        const { pair } = req.params;
        const signals = signalsService.signals.get(pair) || [];
        res.json({ success: true, data: signals });
    } catch (error) {
        console.error('Error fetching signal history:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get all trading pairs being monitored
router.get('/pairs', (req, res) => {
    try {
        res.json({ success: true, data: SIGNALS_CONFIG.TRADING_PAIRS });
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get current indicator values for a pair
router.get('/indicators/:pair', (req, res) => {
    try {
        const { pair } = req.params;
        const indicators = signalsService.indicators.get(pair);
        
        if (!indicators) {
            return res.status(404).json({ success: false, error: 'Pair not found' });
        }

        res.json({ success: true, data: indicators });
    } catch (error) {
        console.error('Error fetching indicators:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Add health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

export default router;
