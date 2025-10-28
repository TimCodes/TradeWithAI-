# Alpha Arena - AI-Powered Autonomous Trading Platform

Alpha Arena is a sophisticated trading platform that leverages multiple Large Language Models (LLMs) to make autonomous trading decisions. The platform provides a comprehensive trading environment with real-time market data, risk management, and advanced analytics.

## 🚀 Features

### 🤖 Multi-LLM Integration
- **Claude** - Anthropic's advanced reasoning model
- **OpenAI GPT** - Industry-leading language model
- **Google Gemini** - Google's multimodal AI model
- Compare models side-by-side in the LLM Arena
- Streaming responses for real-time decision making

### 📈 Trading Capabilities
- **Real-time Market Data** - Live price feeds from Kraken
- **Autonomous Trading** - LLM-driven trade execution
- **Risk Management** - Position limits, stop-losses, max drawdown
- **Manual Override** - Human intervention capabilities
- **Order Management** - Market and limit orders

### 📊 Analytics & Visualization
- **Interactive Charts** - Candlestick charts with technical indicators
- **Performance Metrics** - P&L, Sharpe ratio, win rate
- **Order Book Visualization** - Real-time bid/ask depth
- **Trade History** - Complete audit trail with LLM reasoning

### 🔒 Security & Infrastructure
- **Secure API Key Management** - Encrypted storage
- **JWT Authentication** - Secure user sessions
- **Audit Logging** - Complete trade tracking
- **WebSocket Health** - Connection monitoring

## 🏗️ Architecture

### Monorepo Structure
```
alpha-arena/
├── packages/
│   ├── server/          # NestJS Backend API
│   ├── client/          # React Frontend
│   └── shared/          # Shared TypeScript Types
├── docker-compose.yml   # Development Environment
└── sql/                 # Database Initialization
```

### Technology Stack

**Backend (NestJS)**
- TypeScript + NestJS framework
- PostgreSQL + TimescaleDB for time-series data
- Redis for caching and job queues
- Socket.io for real-time communication
- Bull/BullMQ for background jobs

**Frontend (React)**
- React 18 + TypeScript
- Vite for build tooling
- Shadcn/ui component library
- TanStack Query for data fetching
- Zustand for state management
- Recharts for data visualization

**Infrastructure**
- Docker & Docker Compose
- TimescaleDB for market data
- Redis for caching
- WebSocket for real-time updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/alpha-arena.git
cd alpha-arena
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# - Kraken API keys (for trading)
# - Anthropic API key (for Claude)
# - OpenAI API key (for GPT models)
# - Google API key (for Gemini)
```

### 3. Install Dependencies
```bash
# Install root dependencies
npm install

# Install package dependencies (will be done automatically by workspaces)
```

### 4. Start Development Environment
```bash
# Start databases (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Start the development servers
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs

## 📋 Available Scripts

### Root Level Commands
```bash
npm run dev          # Start all development servers
npm run build        # Build all packages
npm run test         # Run all tests
npm run lint         # Lint all packages
npm run clean        # Clean all build artifacts
```

## 🔧 Configuration

### API Keys Required

1. **Kraken API** (Trading)
   - Sign up at https://kraken.com
   - Generate API keys with trading permissions
   - Add to `.env` as `KRAKEN_API_KEY` and `KRAKEN_API_SECRET`

2. **Anthropic API** (Claude)
   - Sign up at https://console.anthropic.com
   - Generate API key
   - Add to `.env` as `ANTHROPIC_API_KEY`

3. **OpenAI API** (GPT Models)
   - Sign up at https://platform.openai.com
   - Generate API key
   - Add to `.env` as `OPENAI_API_KEY`

4. **Google AI** (Gemini)
   - Sign up at https://ai.google.dev
   - Generate API key
   - Add to `.env` as `GOOGLE_API_KEY`

## ⚠️ Disclaimer

This software is for educational and research purposes only. Trading cryptocurrencies involves substantial risk of loss. The authors and contributors are not responsible for any financial losses incurred through the use of this software. Always do your own research and consider consulting with a financial advisor before making trading decisions.

---

**Happy Trading! 🚀📈**