# Story 6.1: LLMChatBox Component - Integration Guide

## ✅ Status: COMPLETE

**Completed**: December 24, 2025  
**Story Points**: 8  
**Epic**: 6 - LLM Chat Interface (44% complete)

---

## 📦 Components Created

### 1. **LLMChatBox.tsx**
Main container component that orchestrates the chat interface.

**Features**:
- Provider selector dropdown (OpenAI, Anthropic, Google, Groq)
- Real-time WebSocket connection status
- Auto-scrolling message container
- Message history integration
- Streaming response handling

**Props**:
```typescript
interface LLMChatBoxProps {
  sessionId: string;
  className?: string;
}
```

### 2. **ChatMessage.tsx**
Individual message display component.

**Features**:
- Role-based styling (user/assistant/system)
- Provider badges for AI responses
- Timestamp display
- Avatar icons
- Streaming indicator support

**Props**:
```typescript
interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    provider?: string;
    isStreaming?: boolean;
  };
}
```

### 3. **ChatInput.tsx**
Message input area with auto-resize functionality.

**Features**:
- Auto-resizing textarea (44-200px)
- Character limit (4000 chars)
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Loading state with animated spinner
- Character count indicator

**Props**:
```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}
```

---

## 🔌 Integration Examples

### Example 1: Add to LLM Arena Page

Update `packages/client/src/pages/LLMArena.tsx`:

```tsx
import { LLMChatBox } from '../components/LLMChatBox';
import { useAuthStore } from '../stores';

export function LLMArena() {
  const { user } = useAuthStore();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">LLM Arena</h1>
      <p className="text-slate-400">
        Chat with AI models for trading insights
      </p>
      
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <LLMChatBox 
          sessionId={user?.id || 'anonymous'}
          className="h-[700px]"
        />
      </div>
    </div>
  );
}
```

### Example 2: Add as Sidebar in Trading Dashboard

Update `packages/client/src/pages/TradingDashboard.tsx`:

```tsx
import { LLMChatBox } from '../components/LLMChatBox';

export function TradingDashboard() {
  // ... existing code ...
  
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left side - Charts and Trading (8 columns) */}
      <div className="col-span-8 space-y-6">
        <TradingChart symbol={selectedSymbol} />
        <OrderForm symbol={selectedSymbol} />
        <PositionsList />
      </div>
      
      {/* Right side - AI Assistant (4 columns) */}
      <div className="col-span-4">
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
            <h3 className="font-semibold">AI Trading Assistant</h3>
          </div>
          <LLMChatBox 
            sessionId="trading-session"
            className="h-[800px]"
          />
        </div>
      </div>
    </div>
  );
}
```

### Example 3: Standalone Chat Page

Create `packages/client/src/pages/AIChat.tsx`:

```tsx
import { LLMChatBox } from '../components/LLMChatBox';

export function AIChat() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Trading Assistant</h1>
        <p className="text-slate-400">
          Get trading insights, market analysis, and strategy recommendations
        </p>
      </div>
      
      <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-xl">
        <LLMChatBox 
          sessionId="main-chat"
          className="h-[calc(100vh-200px)]"
        />
      </div>
    </div>
  );
}
```

---

## 🎯 Next Steps - Story 6.2: Trading Context Injection

Now that the chat interface is complete, the next logical step is to make the AI aware of your trading context. This includes:

### Objectives
1. **Auto-inject trading context** into every AI prompt
2. **Include current positions** so AI knows what you're holding
3. **Include market prices** for relevant symbols
4. **Include account balance** for sizing recommendations
5. **Add toggle** to enable/disable context injection

### Files to Modify

#### Backend: `packages/server/src/modules/llm/llm.service.ts`

Add a new method to build context:

```typescript
async buildTradingContext(userId: string): Promise<string> {
  // Get user's positions
  const positions = await this.tradingService.getPositions(userId);
  
  // Get account balance
  const balance = await this.tradingService.getBalance(userId);
  
  // Get current market prices
  const tickers = await this.marketDataService.getCurrentPrices();
  
  // Format as structured prompt
  return `
Current Trading Context:
- Account Balance: $${balance.total.toFixed(2)} USD
- Available: $${balance.available.toFixed(2)} USD
- Open Positions: ${positions.length}
${positions.map(p => `  - ${p.symbol}: ${p.size} @ $${p.entryPrice} (P&L: $${p.unrealizedPnl.toFixed(2)})`).join('\n')}

Current Market Prices:
${Object.entries(tickers).map(([symbol, ticker]) => `- ${symbol}: $${ticker.price}`).join('\n')}
  `.trim();
}
```

#### Frontend: `packages/client/src/components/LLMChatBox.tsx`

Add context toggle and injection:

```typescript
const [includeContext, setIncludeContext] = useState(true);

const handleSendMessage = async (message: string) => {
  let finalMessage = message;
  
  if (includeContext) {
    const context = await fetchTradingContext();
    finalMessage = `${context}\n\nUser Question: ${message}`;
  }
  
  // Send to API...
};
```

### Acceptance Criteria for Story 6.2
- [ ] Create `buildTradingContext()` method in LLM service
- [ ] Include current balance in context
- [ ] Include open positions with P&L
- [ ] Include recent order history (last 10 orders)
- [ ] Include current market prices for user's symbols
- [ ] Add toggle in UI to enable/disable context
- [ ] Format context as structured prompt
- [ ] Test with different account states (no positions, multiple positions, etc.)

### Estimated Effort
**Story Points**: 5  
**Time**: 1-2 days

---

## 🔄 Story 6.3: Trade Signal Parsing (After 6.2)

Once AI has trading context, the final step is parsing its responses for actionable trade signals.

### Objectives
1. **Parse AI responses** for trade recommendations
2. **Extract structured data**: action (buy/sell), symbol, price, size, confidence
3. **Display as actionable cards** with "Execute Trade" button
4. **Add risk assessment** before execution
5. **Track AI-suggested trades** separately

### Implementation Plan

#### Backend: `packages/server/src/modules/llm/utils/signal-parser.ts`

```typescript
interface TradeSignal {
  action: 'buy' | 'sell' | 'hold';
  symbol: string;
  price?: number;
  size?: number;
  confidence: number; // 0-100
  reasoning: string;
}

export function parseTradeSignal(response: string): TradeSignal | null {
  // Use regex or structured prompting to extract signals
  // Look for patterns like:
  // "I recommend buying 0.5 BTC at $45,000 (confidence: 75%)"
  // "Sell 1 ETH - market looks overbought (confidence: 60%)"
}
```

#### Frontend: `packages/client/src/components/TradeSignalCard.tsx`

```tsx
export function TradeSignalCard({ signal }: { signal: TradeSignal }) {
  return (
    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-blue-400">
          {signal.action.toUpperCase()} {signal.symbol}
        </span>
        <span className="text-sm text-slate-400">
          Confidence: {signal.confidence}%
        </span>
      </div>
      
      <p className="text-sm text-slate-300 mb-3">{signal.reasoning}</p>
      
      <div className="flex gap-2">
        <Button 
          onClick={() => executeSignal(signal)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Execute Trade
        </Button>
        <Button variant="outline">Dismiss</Button>
      </div>
    </div>
  );
}
```

### Acceptance Criteria for Story 6.3
- [ ] Create signal parser utility
- [ ] Parse responses for buy/sell/hold signals
- [ ] Extract: action, symbol, price, size, confidence, reasoning
- [ ] Display trade signal as actionable card in chat
- [ ] Add "Execute Trade" button on signal cards
- [ ] Show risk assessment before execution
- [ ] Add confirmation dialog
- [ ] Track which trades came from LLM (add `source: 'ai'` to order)
- [ ] Test with various AI response formats

### Estimated Effort
**Story Points**: 5  
**Time**: 1-2 days

---

## 📊 Epic 6 Progress

| Story | Points | Status |
|-------|--------|--------|
| 6.1 LLMChatBox Component | 8 | ✅ Complete |
| 6.2 Trading Context Injection | 5 | 🔄 Next |
| 6.3 Trade Signal Parsing | 5 | ⏳ Planned |
| **Total** | **18** | **8/18 (44%)** |

---

## 🐛 Known Issues & Future Enhancements

### Current Limitations
1. No markdown rendering in messages (plain text only)
2. No pagination for long chat histories (loads all messages)
3. WebSocket reconnection could be more robust
4. Mobile keyboard may overlap scroll button

### Potential Enhancements (Post-MVP)
1. **Markdown rendering** - Use `react-markdown` for formatted responses
2. **Code syntax highlighting** - For AI-generated code snippets
3. **Message editing** - Edit and resend previous messages
4. **Chat history persistence** - Save to database, load on mount
5. **Voice input** - Speech-to-text for hands-free trading
6. **Message reactions** - Thumbs up/down for AI responses
7. **Multi-session support** - Create different chat contexts
8. **Export chat** - Save conversation as PDF or text file

---

## 🧪 Testing Recommendations

### Unit Tests
```bash
# Test message display
npm test ChatMessage.test.tsx

# Test input handling
npm test ChatInput.test.tsx

# Test main container
npm test LLMChatBox.test.tsx
```

### Integration Tests
1. Send message → Verify it appears in UI
2. Receive streaming response → Verify real-time updates
3. Switch providers → Verify correct provider used
4. Auto-scroll → Verify scrolls to bottom on new message
5. Manual scroll → Verify auto-scroll disabled
6. Reconnect WebSocket → Verify messages persist

### Manual Testing Checklist
- [ ] User messages appear on right (blue)
- [ ] AI messages appear on left (dark)
- [ ] Provider badges display correctly
- [ ] Timestamps show in "2:34 PM" format
- [ ] Typing indicator during streaming
- [ ] Auto-resize textarea works
- [ ] Character counter accurate
- [ ] Enter sends, Shift+Enter adds newline
- [ ] Provider selector functions
- [ ] Auto-scroll to bottom works
- [ ] Scroll to bottom button appears when scrolled up
- [ ] Connection status shows green when connected

---

## 📚 Resources

### Documentation
- [Zustand Store](packages/client/src/stores/llm.store.ts)
- [WebSocket Hook](packages/client/src/hooks/useLLMStream.ts)
- [LLM Service](packages/server/src/modules/llm/llm.service.ts)
- [API Endpoints](packages/server/src/modules/llm/llm.controller.ts)

### Related Files
- `packages/shared/src/types/llm.types.ts` - TypeScript interfaces
- `packages/client/src/services/llm.service.ts` - API client
- `packages/server/src/modules/llm/llm.gateway.ts` - WebSocket gateway

---

**Questions or Issues?**  
Contact the development team or check the main PROJECT_ROADMAP.md for context.
