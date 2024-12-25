# CryptoMoose - Advanced Crypto Market Analysis Platform

## Overview
CryptoMoose is a comprehensive cryptocurrency market analysis platform that provides real-time market data, technical analysis, on-chain metrics, and sector analysis. Built with modern web technologies and integrating multiple free APIs, it offers professional-grade analysis tools without subscription costs.

## Features

### 1. Main Chart
- Real-time price data from MEXC Exchange
- Multiple timeframe support (1m to 1W)
- Volume analysis
- Customizable chart settings

### 2. Market Analysis
- Market sentiment indicators
- Technical indicators
- AI Market insights
- Key market metrics
- Market trends analysis

### 3. Sector Analysis
- Sector performance tracking
- Sector dominance metrics
- Sector rotation analysis
- Real-time sector updates

### 4. On-Chain Analytics
- Network activity metrics
- Exchange flows monitoring
- Whale activity tracking
- Real-time blockchain data
- Data sources: Blockchain.com, CoinGecko

### 5. Historical Patterns
- Pattern recognition
- Market cycles analysis
- Similar patterns identification
- Historical correlation analysis
- Data source: CoinGecko API

### 6. Advanced Technical Analysis
- Multi-timeframe Overview
  - Trend strength indicators
  - Momentum analysis
  - Volume analysis
- Auto Pattern Detection
  - Common chart patterns
  - Pattern confidence levels
  - Real-time scanning
- Support/Resistance Zones
  - Dynamic level detection
  - Key price levels
  - Zone strength analysis
- Divergence Scanner
  - RSI divergences
  - MACD divergences
  - Real-time alerts
- Technical Tools
  - Fibonacci retracement
  - Automatic trendline detection
  - Volume profile analysis
  - Key level identification

## Technology Stack
- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Backend: Node.js, Express.js
- Charts: Lightweight Charts
- Technical Analysis: technicalindicators library
- APIs: 
  - MEXC Exchange API (market data)
  - Blockchain.com API (on-chain metrics)
  - CoinGecko API (market data)
  - Alternative.me API (Fear & Greed Index)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cryptomoose.git
```

2. Install dependencies:
```bash
cd cryptomoose
npm install
```

3. Start the server:
```bash
node server.js
```

4. Access the platform:
Open your browser and navigate to `http://localhost:8001`

## API Endpoints

### Market Data
- `/api/klines` - Get candlestick data
- `/api/market-metrics` - Get market metrics

### Advanced Technical Analysis
- `/api/advanced-ta/mtf/:symbol` - Get multi-timeframe data
- `/api/advanced-ta/analysis/:symbol/:timeframe` - Get technical analysis
- `/api/advanced-ta/volume-profile/:symbol/:timeframe` - Get volume profile
- `/api/advanced-ta/key-levels/:symbol/:timeframe` - Get key price levels

### On-Chain Analytics
- `/api/onchain/network` - Get network metrics
- `/api/onchain/exchange-flows` - Get exchange flow data
- `/api/onchain/whale-activity` - Get whale transaction data

## Dependencies
- express: ^4.18.2
- axios: ^1.6.2
- technicalindicators: ^3.1.0
- socket.io: ^4.7.2
- lightweight-charts: ^4.1.1

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Updates
- Added Advanced Technical Analysis section with professional-grade tools
- Integrated multiple free data sources for comprehensive analysis
- Enhanced UI/UX with modern design
- Added real-time data updates
- Improved performance and reliability

## Contributing
Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer
This platform is for informational purposes only. Not financial advice.
