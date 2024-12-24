# CryptoMoose Trading Platform 🦌

A comprehensive cryptocurrency trading analysis platform featuring real-time market data, technical indicators, and AI-powered insights.

## 🚀 Features

### Real-Time Market Data
- Live price updates via Bybit WebSocket
- Multiple timeframe support (1H, 4H, 12H, 1D)
- Interactive price charts with modern UI
- Support for multiple trading pairs (BTC, ETH, SOL, XRP, DOGE, BNB, ADA, DOT, AVAX)

### Advanced Technical Analysis
- Comprehensive technical indicators with weighted scoring:
  - Volume Analysis (weight: 1.0)
  - RSI (Relative Strength Index) (weight: 1.5)
  - EMA 50/200 Crossovers (weight: 2.0)
  - MACD (Moving Average Convergence Divergence) (weight: 1.5)
  - Bollinger Bands (weight: 1.0)
  - ATR (Average True Range) (weight: 0.5)
  - Pivot Points
  - VWAP (Volume Weighted Average Price)
- Order Flow Analysis (weight: 2.0)
- Liquidity Analysis
- Visual indicator status with color-coded signals (green/yellow/red)

### Market Sentiment Analysis
- Aggregated market sentiment indicator combining:
  - Technical indicators
  - Order flow metrics
  - Volume analysis
  - Price action patterns
- Color-coded sentiment display (bullish/neutral/bearish)
- Real-time sentiment updates

### Enhanced UI/UX Features
- Modern glass-morphism design
- Responsive chart sizing
- Streamlined indicator display in horizontal scrollable format
- Custom-styled dropdowns and selectors
- Interactive timeframe selection
- Real-time data updates with smooth transitions

### Market Metrics
- Fear & Greed Index with historical comparison
- Altcoin Market Analysis:
  - Dominance metrics
  - 24h volume analysis
  - Market cap segmentation (Large, Mid, Small)
  - Trend analysis by market cap

### AI-Powered Insights
- Real-time market analysis using GPT-4
- Three key sections:
  - 🎯 Market Snapshot
  - 📊 Technical Signals
  - 💡 Trading Ideas
- User-friendly format with emojis and clear explanations
- Updates every minute with fresh market data

## 🛠️ Technical Stack

### Frontend
- Vanilla JavaScript for core functionality
- Lightweight Charts for professional-grade trading charts
- WebSocket for real-time data
- Custom CSS with glass-morphism design
- SVG icons for modern UI elements

### Backend
- Node.js with Express
- OpenAI GPT-4 API integration
- Bybit API integration
- WebSocket server for real-time updates

### APIs
- Bybit API for market data
- Alternative.me API for Fear & Greed Index
- OpenAI API for market analysis

## 📦 Dependencies
```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "openai": "^4.24.1",
    "lightweight-charts": "^4.1.1"
  }
}
```

## 🔧 Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file with:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   PORT=8001
   ```

4. Start the server:
   ```bash
   node server.js
   ```

## 📁 Project Structure

```
CryptoMoose3/
├── css/
│   ├── market-analysis.css    # Main styling for market analysis
│   ├── indicator-boxes.css    # Indicator-specific styling
│   └── market-visualization.css # Chart and visualization styling
├── js/
│   ├── market-analysis.js     # Chart and technical analysis
│   ├── market-metrics.js      # Market metrics and calculations
│   ├── indicator-signals.js   # Technical indicator processing
│   ├── indicator-updater.js   # Real-time indicator updates
│   ├── market-visualization.js # Chart visualization handling
│   ├── bybit-data.js         # Bybit API integration
│   ├── ai-analysis.js        # AI insights integration
│   └── multi-asset-chart.js  # Multi-asset chart handling
├── server.js                 # Express server and API integrations
└── README.md                 # Project documentation
```

## 🎨 Design System

### Colors
- Background: Dark theme with glass-morphism effects
- Indicators:
  - Bullish: Green (#26a69a)
  - Neutral: Yellow (#f0b90b)
  - Bearish: Red (#ef5350)
- Chart Elements:
  - Candlesticks: Green/Red for up/down
  - Volume: Semi-transparent green/red
  - Moving Averages: Custom colors for visibility

### UI Components
- Glass containers with subtle borders
- Modern dropdowns with hover effects
- Horizontal scrollable indicator display
- Responsive chart sizing
- Custom scrollbars for better UX

## 🔄 Real-time Updates
- Price data: Every second
- Technical indicators: Every 5 seconds
- Market sentiment: Every 15 seconds
- AI analysis: Every minute

## 🔒 Security
- API keys stored in environment variables
- Rate limiting on API calls
- Error handling for API failures
- Secure WebSocket connections

## 📈 Future Enhancements
- Additional technical indicators
- Custom indicator settings
- Trading bot integration
- Portfolio tracking
- Mobile app version
