# LLM Arena Testing Guide

## Prerequisites

Before testing the LLM Arena, ensure you have:

1. **Environment Variables** configured in `packages/server/.env`:
   ```env
   # At least one LLM provider API key
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   GEMINI_API_KEY=your_gemini_key_here
   
   # Optional but needed for full trading context
   KRAKEN_API_KEY=your_kraken_key
   KRAKEN_API_SECRET=your_kraken_secret
   ```

2. **Development server running**:
   ```bash
   npm run dev
   ```

3. **Client accessible** at: http://localhost:5173

---

## Testing Checklist

### 1. Initial Load
- [ ] Navigate to `/arena` page
- [ ] Verify default session auto-creates with 3 panels
- [ ] Check WebSocket connection status (🟢 Connected)
- [ ] Verify 3 model panels displayed (OpenAI, Claude, Gemini)

### 2. Send Message to All Models
- [ ] Type a message in shared input area
- [ ] Click "Send to All" button
- [ ] Verify message appears in all 3 panels
- [ ] Confirm "Sending to 3 models..." status appears
- [ ] Wait for all responses to complete
- [ ] Verify response times displayed in panel headers

### 3. Voting System
- [ ] Click 👍 on one panel
- [ ] Verify score increases by 1
- [ ] Click 👍 again on same panel
- [ ] Verify vote is removed (score back to 0)
- [ ] Click 👎 on another panel
- [ ] Verify score decreases by 1
- [ ] Try voting on multiple panels

### 4. Session Management
- [ ] Click "+ New Session" button
- [ ] Enter session name
- [ ] Click "Create"
- [ ] Verify new session loads
- [ ] Send a message to the new session
- [ ] Click "Save Session"
- [ ] Verify success alert
- [ ] Check saved session appears in chips

### 5. Load Saved Session
- [ ] Click on a saved session chip
- [ ] Verify session loads with previous messages
- [ ] Verify votes are preserved
- [ ] Verify response times are preserved

### 6. Delete Session
- [ ] Click "×" on a saved session chip
- [ ] Confirm deletion
- [ ] Verify session removed from list

### 7. Trading Context
- [ ] Toggle "Include trading context" checkbox ON
- [ ] Send a trading-related message (e.g., "Should I buy BTC?")
- [ ] Verify responses include context-aware information
- [ ] Toggle context OFF
- [ ] Send same message
- [ ] Compare responses

### 8. Keyboard Shortcuts
- [ ] Type message in input
- [ ] Press Enter (without Shift)
- [ ] Verify message sends to all models
- [ ] Type message and press Shift+Enter
- [ ] Verify new line is added (doesn't send)

### 9. Error Handling
- [ ] Disconnect internet (or use invalid API key)
- [ ] Send a message
- [ ] Verify error displayed in affected panels
- [ ] Verify other panels still work if only one fails
- [ ] Reconnect internet
- [ ] Verify next message works

### 10. Streaming (if WebSocket is configured)
- [ ] Send a message
- [ ] Look for streaming indicator (animated dots)
- [ ] Verify "is typing..." message appears
- [ ] Watch response build character by character
- [ ] Verify final response is complete

### 11. Mobile Responsiveness
- [ ] Resize browser to mobile width
- [ ] Verify panels stack vertically
- [ ] Verify all controls are accessible
- [ ] Test scrolling in panels
- [ ] Verify input area remains visible

### 12. Performance
- [ ] Send 5-10 messages in quick succession
- [ ] Verify UI remains responsive
- [ ] Check browser console for errors
- [ ] Monitor response times across multiple requests
- [ ] Verify no memory leaks (check DevTools Memory tab)

---

## Expected Behavior

### Successful Message Flow
1. User types message
2. Clicks "Send to All"
3. Message appears in all panels immediately
4. "Sending to 3 models..." status shows
5. Loading spinners appear in panels
6. Responses arrive (possibly at different times)
7. Response times display in headers
8. User can vote on responses

### Session Flow
1. User creates session with name
2. Session appears in saved sessions
3. User can send messages
4. User clicks "Save Session"
5. Session persists in localStorage
6. User can load session later
7. All messages and votes are preserved

---

## Common Issues & Solutions

### Issue: No responses from models
**Solution**: Check API keys in `.env` file

### Issue: WebSocket disconnected
**Solution**: Restart dev server, check CORS settings

### Issue: Session not saving
**Solution**: Check browser localStorage is enabled

### Issue: Response times not showing
**Solution**: Verify API calls are completing successfully

### Issue: Panels not updating
**Solution**: Check browser console for React errors

---

## API Endpoints Used

- `POST /llm/chat` - Single provider chat
- `POST /llm/compare` - Multi-provider comparison
- `GET /llm/providers` - List available providers
- `GET /llm/trading-context` - Get trading context
- `WS /llm/stream` - WebSocket streaming (if configured)

---

## Browser DevTools Checks

### Console
- No errors should appear during normal operation
- WebSocket connection logs (if applicable)
- API request/response logs

### Network Tab
- `/llm/chat` or `/llm/compare` requests complete successfully
- Response times match displayed values
- No 4xx or 5xx errors

### Application Tab
- LocalStorage contains `arena-storage` key
- Session data is properly formatted JSON

### Performance Tab
- No significant memory leaks
- UI remains responsive during parallel requests

---

## Test Data Examples

### Trading Questions
```
Should I buy Bitcoin right now?
What's your analysis of the current BTC/USD trend?
Calculate position size for a $1000 BTC trade with 2% risk
When should I take profit on my ETH position?
```

### General Questions
```
Explain Bitcoin halving
Compare proof-of-work vs proof-of-stake
What are the risks of leverage trading?
How do I diversify my crypto portfolio?
```

### Context-Sensitive Questions (with context toggle ON)
```
Should I close my current positions?
What's my portfolio exposure?
Based on my balance, what's a safe position size?
Review my open positions and suggest optimizations
```

---

## Success Criteria

The Arena is working correctly if:
- ✅ All 3 panels display responses
- ✅ Response times are accurate and displayed
- ✅ Voting system works without errors
- ✅ Sessions save and load correctly
- ✅ Trading context includes relevant data
- ✅ Error handling gracefully handles failures
- ✅ UI remains responsive during operation
- ✅ No console errors in normal operation

---

## Next Steps After Testing

1. Document any bugs found
2. Test with real API keys and responses
3. Gather user feedback on UX
4. Consider implementing Story 7.2 (Performance Tracking)
5. Add more providers if needed
6. Implement database persistence (optional)

---

**Happy Testing!** 🚀
