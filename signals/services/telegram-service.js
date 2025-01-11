import TelegramBot from 'node-telegram-bot-api';

export class TelegramService {
    constructor(botToken, channelId) {
        if (!botToken || !channelId) {
            throw new Error('TelegramService requires both botToken and channelId');
        }

        // Clean the token - remove any whitespace or quotes
        this.botToken = botToken.trim().replace(/["']/g, '');
        this.channelId = channelId;
        
        // Initialize bot with polling disabled (we don't need to receive messages)
        this.bot = new TelegramBot(this.botToken, { polling: false });
        
        console.log('TelegramService initialized with:');
        console.log('- Bot Token:', this.botToken);
        console.log('- Bot Token Length:', this.botToken.length);
        console.log('- Channel ID:', this.channelId);
    }

    calculateRiskReward(entry, stopLoss, target) {
        const risk = entry - stopLoss;
        const reward = target - entry;
        return { risk, reward, ratio: reward / risk };
    }

    async sendMessage(message) {
        try {
            // First verify the bot
            console.log('Verifying bot...');
            const me = await this.bot.getMe();
            console.log('Bot info:', me);

            console.log('Sending message to channel:', this.channelId);
            const result = await this.bot.sendMessage(this.channelId, message, { parse_mode: 'HTML' });
            console.log('Message sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Failed to send message:', error.message);
            if (error.response) {
                console.error('Full error response:', JSON.stringify(error.response, null, 2));
            }
            throw error;
        }
    }

    async sendSignal({ pair, type, price, stopLoss, targets, timeframe, confidence, volume24h, marketTrend }) {
        const entryPrice = parseFloat(price.split(' - ')[0].replace(',', ''));
        const { risk, reward, ratio } = this.calculateRiskReward(entryPrice, parseFloat(stopLoss.replace(',', '')), parseFloat(targets[0].split(' ')[0].replace(',', '')));
        
        const emoji = type === 'LONG' ? '🟢' : '🔴';
        const trendEmoji = marketTrend === 'BULLISH' ? '📈' : marketTrend === 'BEARISH' ? '📉' : '📊';
        
        const signal = `
${emoji} <b>SIGNAL ALERT: ${type} ${pair}</b> ${timeframe ? `(${timeframe})` : ''}

💰 <b>Entry Zone:</b> ${price}
🛑 <b>Stop Loss:</b> ${stopLoss}
    • Risk: ${risk.toFixed(2)}%
    • Position Size Recommendation: 1-2% of portfolio

🎯 <b>Targets:</b>
${targets.map((t, i) => `   ${i + 1}. ${t}`).join('\n')}

📈 <b>Risk/Reward Ratio:</b> 1:${ratio.toFixed(2)}
⚡️ <b>Signal Confidence:</b> ${confidence}
${trendEmoji} <b>Market Trend:</b> ${marketTrend}
💎 <b>24h Volume:</b> $${volume24h}M

⚠️ <b>Risk Management Tips:</b>
• Use the recommended position size
• Consider scaling in/out of positions
• Move stop loss to break-even after first target
• Don't chase entry if price moves too far

🔗 <b>Trade on HTX:</b>
${this.HTX_REFERRAL}
• Up to 60% fee discount
• $10,000 welcome bonus
• Best liquidity & lowest fees

⚠️ <i>This is not financial advice. DYOR and trade responsibly.</i>
#${pair.replace('/', '')} #CryptoSignals #TradingSignals
`;
        
        return this.sendMessage(signal);
    }
}

// Create instance with environment variables (will be undefined if not loaded yet)
export const createTelegramService = () => {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
        throw new Error('Missing required environment variables for Telegram service');
    }
    return new TelegramService(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHANNEL_ID);
};
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
        throw new Error('Missing required environment variables for Telegram service');
    }
    return new TelegramService(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHANNEL_ID);
};
