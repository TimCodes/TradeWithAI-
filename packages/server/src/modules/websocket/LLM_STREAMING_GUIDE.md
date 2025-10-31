# LLM Streaming Integration Guide

This guide explains how to integrate LLM response streaming into your application using WebSocket.

---

## 📋 Prerequisites

- WebSocket connection established to the server
- Valid JWT token for authentication
- Socket.IO client library installed

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install socket.io-client
```

### 2. Connect to WebSocket

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('jwt_token')
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

### 3. Start Streaming

```typescript
const sessionId = `session-${Date.now()}`;

// Listen for stream events
socket.on('llm:stream:start', (data) => {
  console.log('Stream started:', data.provider);
});

socket.on('llm:stream:token', (data) => {
  // Append each token to your UI
  appendToken(data.token);
});

socket.on('llm:stream:done', (data) => {
  console.log('Stream complete!');
  console.log('Full response:', data.fullResponse);
  console.log('Token count:', data.tokenCount);
});

socket.on('llm:stream:error', (data) => {
  console.error('Stream error:', data.error);
});

// Start the stream
socket.emit('llm:chat:stream', {
  sessionId,
  provider: 'openai', // or 'claude', 'gemini', 'deepseek'
  messages: [
    { role: 'system', content: 'You are a helpful trading assistant.' },
    { role: 'user', content: 'What is Bitcoin?' }
  ]
});
```

### 4. Cancel Stream (Optional)

```typescript
socket.emit('llm:stream:cancel', { sessionId });

socket.on('llm:stream:cancelled', (data) => {
  console.log('Stream cancelled:', data.sessionId);
});
```

---

## 🎨 React Hook Example

```typescript
// hooks/useLLMStream.ts
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useLLMStream() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    const newSocket = io('http://localhost:3000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('llm:stream:start', (data) => {
      console.log('Stream started:', data);
      setIsStreaming(true);
      setCurrentMessage('');
      setError(null);
    });

    socket.on('llm:stream:token', (data) => {
      if (data.sessionId === currentSessionId) {
        setCurrentMessage((prev) => prev + data.token);
      }
    });

    socket.on('llm:stream:done', (data) => {
      if (data.sessionId === currentSessionId) {
        setIsStreaming(false);
        console.log('Stream complete:', data);
      }
    });

    socket.on('llm:stream:error', (data) => {
      if (data.sessionId === currentSessionId) {
        setError(data.error);
        setIsStreaming(false);
      }
    });

    socket.on('llm:stream:cancelled', (data) => {
      if (data.sessionId === currentSessionId) {
        setIsStreaming(false);
        console.log('Stream cancelled');
      }
    });

    return () => {
      socket.off('llm:stream:start');
      socket.off('llm:stream:token');
      socket.off('llm:stream:done');
      socket.off('llm:stream:error');
      socket.off('llm:stream:cancelled');
    };
  }, [socket, currentSessionId]);

  const streamChat = useCallback((provider: string, messages: Message[]) => {
    if (!socket || isStreaming) return;

    const sessionId = `session-${Date.now()}`;
    setCurrentSessionId(sessionId);
    setCurrentMessage('');
    setError(null);

    socket.emit('llm:chat:stream', {
      sessionId,
      provider,
      messages
    });
  }, [socket, isStreaming]);

  const cancelStream = useCallback(() => {
    if (!socket || !currentSessionId) return;

    socket.emit('llm:stream:cancel', {
      sessionId: currentSessionId
    });
  }, [socket, currentSessionId]);

  return {
    streamChat,
    cancelStream,
    isStreaming,
    currentMessage,
    error,
    isConnected: socket?.connected || false
  };
}
```

### Using the Hook in a Component

```typescript
// components/ChatBox.tsx
import React, { useState } from 'react';
import { useLLMStream } from '../hooks/useLLMStream';

export function ChatBox() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('openai');
  
  const { 
    streamChat, 
    cancelStream, 
    isStreaming, 
    currentMessage, 
    error,
    isConnected 
  } = useLLMStream();

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input };
    const allMessages = [...messages, userMessage];
    
    setMessages(allMessages);
    setInput('');
    
    streamChat(provider, allMessages);
  };

  // When streaming completes, add to message history
  React.useEffect(() => {
    if (!isStreaming && currentMessage) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: currentMessage 
      }]);
    }
  }, [isStreaming, currentMessage]);

  return (
    <div className="chat-box">
      <div className="connection-status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <select value={provider} onChange={(e) => setProvider(e.target.value)}>
        <option value="openai">OpenAI</option>
        <option value="claude">Claude</option>
        <option value="gemini">Gemini</option>
        <option value="deepseek">DeepSeek</option>
      </select>

      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        
        {isStreaming && (
          <div className="message assistant streaming">
            <strong>assistant:</strong> {currentMessage}
            <span className="cursor">▊</span>
          </div>
        )}
        
        {error && (
          <div className="error">Error: {error}</div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isStreaming}
          placeholder="Type your message..."
        />
        
        {isStreaming ? (
          <button onClick={cancelStream}>Cancel</button>
        ) : (
          <button onClick={handleSend} disabled={!input.trim()}>
            Send
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 📡 WebSocket Events Reference

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `llm:chat:stream` | `{ sessionId, provider, messages }` | Start streaming LLM response |
| `llm:stream:cancel` | `{ sessionId }` | Cancel an active stream |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `llm:stream:start` | `{ sessionId, provider, timestamp }` | Stream has started |
| `llm:stream:token` | `{ sessionId, token, timestamp }` | New token received |
| `llm:stream:done` | `{ sessionId, provider, fullResponse, tokenCount, timestamp }` | Stream completed |
| `llm:stream:error` | `{ sessionId, error, timestamp }` | Error occurred |
| `llm:stream:cancelled` | `{ sessionId, timestamp }` | Stream was cancelled |

---

## 🎯 Available Providers

| Provider | Name | Model |
|----------|------|-------|
| OpenAI | `openai` | gpt-4-turbo-preview |
| Claude | `claude` | claude-3-sonnet-20240229 |
| Gemini | `gemini` | gemini-pro |
| DeepSeek | `deepseek` | deepseek-chat |

---

## 🔒 Authentication

All WebSocket connections require JWT authentication:

```typescript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

The token should be obtained from your authentication endpoint.

---

## ⚡ Rate Limiting

- Maximum 60 messages per minute per client
- Applies to all WebSocket messages
- Exceeded limit returns error event

---

## 🐛 Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Provider not found` | Invalid provider name | Use: openai, claude, gemini, or deepseek |
| `Authentication token missing` | No JWT provided | Include auth token in connection |
| `Rate limit exceeded` | Too many requests | Wait 1 minute before retrying |
| `[Provider] API key not configured` | Missing API key | Add API key to server .env file |

---

## 💡 Best Practices

1. **Session IDs**: Use unique session IDs for each stream
   ```typescript
   const sessionId = `session-${Date.now()}-${Math.random()}`;
   ```

2. **Cleanup**: Cancel streams when component unmounts
   ```typescript
   useEffect(() => {
     return () => {
       if (isStreaming) cancelStream();
     };
   }, [isStreaming, cancelStream]);
   ```

3. **Error Handling**: Always listen for error events
   ```typescript
   socket.on('llm:stream:error', handleError);
   ```

4. **Connection Status**: Monitor connection state
   ```typescript
   socket.on('connect', () => console.log('Connected'));
   socket.on('disconnect', () => console.log('Disconnected'));
   ```

5. **Message History**: Keep track of conversation context
   ```typescript
   const allMessages = [...previousMessages, newMessage];
   ```

---

## 🧪 Testing

### Test with curl (REST endpoint alternative)

```bash
curl -X POST http://localhost:3000/llm/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "provider": "openai",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ],
    "stream": false
  }'
```

### Test WebSocket with Node.js

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  socket.emit('llm:chat:stream', {
    sessionId: 'test-session',
    provider: 'openai',
    messages: [{ role: 'user', content: 'Hi!' }]
  });
});

socket.on('llm:stream:token', (data) => {
  process.stdout.write(data.token);
});

socket.on('llm:stream:done', (data) => {
  console.log('\n\nDone! Tokens:', data.tokenCount);
  socket.close();
});
```

---

## 📚 Additional Resources

- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [LLM Provider Documentation](../llm/README.md)
- [WebSocket Gateway API](./STORY_3.4_COMPLETE.md)
- [Server Setup Guide](../../README.md)

---

## 🆘 Support

For issues or questions:
1. Check server logs for error messages
2. Verify JWT token is valid
3. Ensure API keys are configured
4. Check network connectivity
5. Review WebSocket connection status

---

**Last Updated**: October 31, 2025
