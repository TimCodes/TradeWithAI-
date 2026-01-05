# 🚀 Local Development & Testing Guide

## Quick Start - Get Running in 5 Minutes

### Step 1: Install Dependencies
```powershell
# From the root directory
npm install
```

### Step 2: Set Up Environment Variables
```powershell
# Copy the example environment file
Copy-Item .env.example .env

# Open .env and add your API keys (at minimum, add one LLM provider key)
notepad .env
```

**Minimum Required**:
- `OPENAI_API_KEY` - Get from https://platform.openai.com
- OR `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com

**Optional** (for full functionality):
- `GOOGLE_API_KEY` - For Gemini
- `KRAKEN_API_KEY` & `KRAKEN_API_SECRET` - For live trading (sandbox available)

### Step 3: Start Infrastructure (PostgreSQL + Redis)
```powershell
# Start database and Redis
docker-compose up -d postgres redis

# Wait 10 seconds for services to start
Start-Sleep -Seconds 10
```

### Step 4: Build Shared Package
```powershell
# Build the shared types package (required for both client and server)
cd packages/shared
npm run build
cd ../..
```

### Step 5: Start Development Servers
```powershell
# Option A: Start everything at once (recommended)
npm run dev

# Option B: Start services individually (for debugging)
# Terminal 1 - Server
cd packages/server
npm run dev

# Terminal 2 - Client  
cd packages/client
npm run dev
```

### Step 6: Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000

---

## 🧪 Testing Epic 6 Features

### Test 1: LLM Chat Interface (Story 6.1)

1. **Navigate to LLM Arena**
   - Open http://localhost:5173
   - Click "LLM Arena" in the navigation

2. **Test Chat Functionality**
   - You should see the chat interface with:
     - Provider selector dropdown (OpenAI/Anthropic/Google/Groq)
     - "Include Trading Context" checkbox
     - Message input area
     - Connection status indicator

3. **Send a Test Message**
   ```
   Type: "Hello, can you help me with trading?"
   Press Enter or click Send
   ```

4. **Verify**:
   - ✅ Message appears on the right (blue background)
   - ✅ AI response streams in token-by-token on the left (dark background)
   - ✅ Typing indicator shows "AI is typing..." while streaming
   - ✅ Provider badge appears on AI message
   - ✅ Timestamp shows below each message
   - ✅ Auto-scrolls to bottom as messages arrive

### Test 2: Trading Context Injection (Story 6.2)

1. **Enable Trading Context**
   - Check the "Include Trading Context" checkbox
   - You should see a context panel expand below the header

2. **Verify Context Display Shows**:
   - ✅ Account Balance section
   - ✅ Open Positions (if any)
   - ✅ Recent Orders
   - ✅ Current Market Prices (BTC, ETH, SOL, MATIC)

3. **Ask Context-Aware Question**
   ```
   Type: "Based on my current portfolio, what should I do?"
   ```

4. **Verify**:
   - ✅ AI mentions your balance in the response
   - ✅ AI references your positions (or lack thereof)
   - ✅ Response is personalized to your situation

5. **Toggle Context Off**
   - Uncheck "Include Trading Context"
   - Ask the same question again
   - ✅ Verify response is generic (doesn't mention your specific balance/positions)

### Test 3: Trade Signal Parsing (Story 6.3)

1. **Ask for Trade Recommendation**
   ```
   Type: "Should I buy Bitcoin? Give me a specific recommendation."
   ```

2. **Look for Trade Signal Card**
   - If AI recommends a trade, a signal card should appear below the message
   - Example: "I recommend buying 0.5 BTC at $44,000. Confidence: 75%"

3. **Verify Signal Card Shows**:
   - ✅ Green card for BUY (or red for SELL, yellow for HOLD)
   - ✅ Action icon (TrendingUp for buy, TrendingDown for sell)
   - ✅ Symbol (e.g., "BTC/USD")
   - ✅ Confidence percentage badge
   - ✅ Price and size (if specified by AI)
   - ✅ Risk level indicator
   - ✅ AI reasoning in italic text
   - ✅ "Execute Trade" button
   - ✅ "Dismiss" button

4. **Test Execute Flow**:
   - Click "Execute Trade" button
   - ✅ Confirmation dialog appears
   - ✅ Shows warning: "Confirm Trade Execution"
   - ✅ If high risk, shows red warning box
   - Click "Confirm & Execute"
   - ✅ Signal changes to show "Executed" with checkmark
   - ✅ Execute button becomes disabled

5. **Test Dismiss**:
   - Ask for another recommendation
   - When signal card appears, click "Dismiss"
   - ✅ Signal card disappears

### Test 4: Advanced Signal Patterns

**Test Buy Signal with SL/TP**:
```
Type: "I want to buy BTC. Give me entry, stop loss, and take profit levels."
```
✅ Should show stop loss and take profit prices on signal card

**Test Sell Signal**:
```
Type: "Should I sell my ETH position?"
```
✅ Should show red sell signal card

**Test Hold Signal**:
```
Type: "Is now a good time to trade or should I wait?"
```
✅ If AI says wait/hold, should show yellow hold signal card

**Test Low Confidence**:
```
Type: "Give me a low confidence trading idea"
```
✅ If confidence < 60%, "Execute Trade" button should be disabled and show "Low Confidence"

### Test 5: Multiple Providers

1. **Test OpenAI**
   - Select "OpenAI" from provider dropdown
   - Send message
   - ✅ Response appears with "openai" badge

2. **Test Anthropic (Claude)**
   - Select "Anthropic" from provider dropdown
   - Send message
   - ✅ Response appears with "anthropic" badge

3. **Test Google (Gemini)**
   - Select "Google" from provider dropdown
   - Send message
   - ✅ Response appears with "google" badge

### Test 6: WebSocket Connection

1. **Check Connection Status**
   - ✅ Green pulsing dot with "Connected" text should appear in header

2. **Test Reconnection**
   - Stop the server: `Ctrl+C` in server terminal
   - ✅ Connection status should show disconnected
   - Restart server: `npm run dev`
   - ✅ Should auto-reconnect
   - ✅ Messages should still work

### Test 7: Error Handling

1. **Test Invalid API Key**
   - Edit `.env` and set `OPENAI_API_KEY=invalid`
   - Restart server
   - Try to send a message
   - ✅ Should show error message in chat

2. **Test Network Error**
   - Disconnect from internet
   - Try to send message
   - ✅ Should show error in chat

3. **Test Empty Message**
   - Try to send empty message
   - ✅ Send button should be disabled

---

## 🔍 Common Issues & Solutions

### Issue: "Cannot find module '@alpha-arena/shared'"
**Solution**: Build the shared package first
```powershell
cd packages/shared
npm run build
cd ../..
```

### Issue: "Port 3000 already in use"
**Solution**: Kill the process using port 3000
```powershell
# Find process
netstat -ano | findstr :3000

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue: "Port 5173 already in use"
**Solution**: Kill Vite dev server
```powershell
# Find process
netstat -ano | findstr :5173

# Kill it
taskkill /PID <PID> /F
```

### Issue: "Database connection failed"
**Solution**: Ensure Docker containers are running
```powershell
# Check status
docker-compose ps

# Restart if needed
docker-compose down
docker-compose up -d postgres redis
```

### Issue: "No AI responses"
**Solution**: Check API keys
1. Verify `.env` has valid API keys
2. Check server logs for errors
3. Try a different provider

### Issue: "Signals not appearing"
**Solution**: Ask for explicit recommendations
- AI needs to mention specific actions (buy/sell)
- Include numbers (price, size, confidence)
- Try: "Give me a specific BUY recommendation for BTC with price and confidence"

---

## 🎯 Feature Checklist

Use this to verify all features are working:

### LLM Chat (Story 6.1)
- [ ] Chat interface loads
- [ ] Can select different providers
- [ ] Messages send and appear
- [ ] AI responses stream in real-time
- [ ] Typing indicator shows during streaming
- [ ] Messages show timestamps
- [ ] User messages on right (blue)
- [ ] AI messages on left (dark)
- [ ] Provider badges appear
- [ ] Auto-scroll works
- [ ] Manual scroll disables auto-scroll
- [ ] "Scroll to bottom" button appears when scrolled up
- [ ] Connection status shows
- [ ] Can send multiple messages in sequence

### Trading Context (Story 6.2)
- [ ] Context toggle appears in header
- [ ] Enabling shows context panel
- [ ] Context displays balance
- [ ] Context displays positions
- [ ] Context displays orders
- [ ] Context displays market prices
- [ ] AI mentions context in responses when enabled
- [ ] AI doesn't mention context when disabled
- [ ] Context updates in real-time
- [ ] Expandable/collapsible works

### Trade Signals (Story 6.3)
- [ ] Buy signals show green cards
- [ ] Sell signals show red cards
- [ ] Hold signals show yellow cards
- [ ] Confidence badges show correctly
- [ ] Risk levels display with colors
- [ ] Price/size display correctly
- [ ] Stop loss/take profit show (when present)
- [ ] Execute button works
- [ ] Confirmation dialog appears
- [ ] High-risk warning appears for risky trades
- [ ] Can confirm execution
- [ ] Can cancel execution
- [ ] Executed signals show checkmark
- [ ] Dismiss removes signal
- [ ] Multiple signals can appear
- [ ] Low confidence disables execute button

---

## 📊 Sample Test Prompts

Copy/paste these to test different scenarios:

### Context Awareness
```
What's my current balance?
Do I have any open positions?
What's the current price of Bitcoin?
Based on my portfolio, what should I do?
```

### Buy Signals
```
I want to buy Bitcoin. Give me specific entry price, size, and confidence level.
Should I buy 0.5 BTC at current market price? Confidence?
Recommend a BTC purchase with stop loss at $42,000 and take profit at $50,000.
```

### Sell Signals
```
Should I sell my Ethereum? Give specific recommendation.
I want to exit my BTC position. Price and confidence?
Take profit on SOL with specific levels.
```

### Hold Signals
```
Is now a good time to trade or should I wait?
Should I hold my positions?
What's your advice - buy, sell, or hold?
```

### Complex Scenarios
```
Compare BTC vs ETH for buying now. Which one and why? Give specific recommendation.
I have $10,000. How should I allocate across BTC, ETH, and SOL? Give me three buy signals.
Market is volatile. Should I go long, short, or stay out? Be specific.
```

---

## 🛠️ Development Tools

### View Database
```powershell
# Connect to PostgreSQL
docker exec -it alpha-arena-db psql -U postgres -d alpha_arena

# Useful queries
\dt                           # List tables
SELECT * FROM "order";        # View orders
SELECT * FROM "position";     # View positions
SELECT * FROM "user";         # View users
\q                            # Quit
```

### View Redis
```powershell
# Connect to Redis
docker exec -it alpha-arena-redis redis-cli

# Useful commands
KEYS *                        # List all keys
GET <key>                     # Get value
FLUSHALL                      # Clear all (be careful!)
exit                          # Quit
```

### Check Logs
```powershell
# Server logs
cd packages/server
npm run dev
# Watch console output

# Docker logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

### API Testing (Optional)
You can also test the API directly:

```powershell
# Test health check
curl http://localhost:3000/health

# Test LLM providers endpoint
curl http://localhost:3000/llm/providers

# Test trading context (requires auth - see below)
curl http://localhost:3000/llm/trading-context
```

---

## 🎓 Tips for Best Results

1. **Be Specific**: AI needs clear instructions
   - ❌ "What about Bitcoin?"
   - ✅ "Should I buy 0.5 BTC at $44,000? Confidence?"

2. **Ask for Numbers**: Helps trigger signal parsing
   - Include: price, size, confidence
   - Example: "Give me a BTC buy recommendation with price and confidence level"

3. **Test Different Providers**: Each AI has different style
   - Claude: More detailed reasoning
   - GPT-4: Balanced and practical
   - Gemini: Often more conservative

4. **Use Context**: Get personalized advice
   - Enable "Include Trading Context"
   - Ask: "Based on my current portfolio..."

5. **Check Confidence**: AI shows how sure it is
   - >80% = Very confident
   - 60-80% = Confident
   - <60% = Low confidence (execute disabled)

---

## 🐛 Debugging

### Enable Verbose Logging

**Server**:
```typescript
// packages/server/src/main.ts
app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
```

**Client**:
```typescript
// Browser console
localStorage.setItem('debug', 'llm:*');
```

### Check Network Requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Send a message
4. Look for:
   - POST to `/llm/chat`
   - WebSocket connection
   - Signal parsing response

### Verify Signal Parsing

Test the parser directly in browser console:
```javascript
// After sending a message with recommendation
console.log($0) // If you've selected the signal card element
```

---

## 📞 Need Help?

If you encounter issues:

1. **Check the logs** - Server and client console
2. **Verify environment** - `.env` file has valid keys
3. **Check Docker** - `docker-compose ps` shows services running
4. **Rebuild shared** - `cd packages/shared && npm run build`
5. **Clear cache** - `Ctrl+Shift+R` in browser
6. **Restart everything** - `docker-compose down && docker-compose up -d postgres redis && npm run dev`

---

## ✅ Quick Verification Script

Run this to verify everything is set up:

```powershell
# Check Node.js
node --version  # Should be 18+

# Check Docker
docker --version
docker-compose --version

# Check services
docker-compose ps

# Check if ports are available
netstat -ano | findstr "3000 5173 5432 6379"

# Build shared package
cd packages/shared; npm run build; cd ../..

# Start everything
npm run dev
```

Then open http://localhost:5173 and start chatting!

---

**Happy Testing! 🚀**

Remember: The AI needs to explicitly mention buy/sell actions with numbers for signals to be parsed. If you don't see signal cards, try being more specific in your prompts!
