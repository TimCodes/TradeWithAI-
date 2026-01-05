import { v4 as uuidv4 } from 'uuid';
import {
  TradeSignal,
  TradeAction,
  ParsedSignalResult,
  getConfidenceLevel,
  RiskLevel,
} from '@alpha-arena/shared';

/**
 * Signal Parser Utility
 * 
 * Extracts structured trade signals from LLM text responses.
 * Uses regex patterns and keyword matching to identify trading recommendations.
 */

// Regex patterns for parsing signals
const PATTERNS = {
  // Buy patterns: "buy 0.5 BTC", "I recommend buying BTC/USD", "purchase 1 ETH at $2000"
  BUY: /\b(buy|purchase|long|enter long|go long|accumulate)\s+(?:(\d+\.?\d*)\s+)?([A-Z]{3,10}(?:\/[A-Z]{3,10})?)\s*(?:at|@)?\s*\$?(\d+\.?\d*)?/gi,
  
  // Sell patterns: "sell 0.5 BTC", "I suggest selling ETH", "take profit on BTC at $45000"
  SELL: /\b(sell|exit|close|short|go short|take profit|dump)\s+(?:(\d+\.?\d*)\s+)?([A-Z]{3,10}(?:\/[A-Z]{3,10})?)\s*(?:at|@)?\s*\$?(\d+\.?\d*)?/gi,
  
  // Hold patterns: "hold your BTC", "don't trade yet", "wait for better entry"
  HOLD: /\b(hold|wait|don't (buy|sell|trade)|avoid trading|stay out|be patient)\b/gi,
  
  // Confidence patterns: "confidence: 75%", "I'm 80% confident", "certainty: high (70%)"
  CONFIDENCE: /\b(?:confidence|certainty|conviction|sure)[\s:]+(?:is\s+)?(?:(\d+)%|(\w+)\s*\(?(\d+)%?\)?)/gi,
  
  // Price patterns: "$45,000", "$2,500.50", "at 50000"
  PRICE: /(?:\$|at\s+|@\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
  
  // Stop loss patterns: "stop loss at $40k", "SL: $42,000"
  STOP_LOSS: /\b(?:stop[\s-]?loss|SL|stop)[\s:]+(?:at\s+)?[\$@]?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
  
  // Take profit patterns: "take profit at $50k", "TP: $48,000"
  TAKE_PROFIT: /\b(?:take[\s-]?profit|TP|target)[\s:]+(?:at\s+)?[\$@]?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
};

/**
 * Parse LLM response text for trade signals
 */
export function parseTradeSignal(
  responseText: string,
  provider?: string,
  messageId?: string,
): ParsedSignalResult {
  const signals: TradeSignal[] = [];
  
  // Normalize text (but preserve case for symbol matching)
  const normalizedText = responseText.trim();
  
  // Try to extract buy signals
  const buyMatches = [...normalizedText.matchAll(PATTERNS.BUY)];
  for (const match of buyMatches) {
    const signal = extractSignalFromMatch(match, TradeAction.BUY, normalizedText, provider, messageId);
    if (signal) signals.push(signal);
  }
  
  // Try to extract sell signals
  const sellMatches = [...normalizedText.matchAll(PATTERNS.SELL)];
  for (const match of sellMatches) {
    const signal = extractSignalFromMatch(match, TradeAction.SELL, normalizedText, provider, messageId);
    if (signal) signals.push(signal);
  }
  
  // Check for hold signal
  if (PATTERNS.HOLD.test(normalizedText) && signals.length === 0) {
    const holdSignal = createHoldSignal(normalizedText, provider, messageId);
    signals.push(holdSignal);
  }
  
  return {
    hasSignal: signals.length > 0,
    signals,
    rawText: responseText,
  };
}

/**
 * Extract a signal from a regex match
 */
function extractSignalFromMatch(
  match: RegExpMatchArray,
  action: TradeAction,
  fullText: string,
  provider?: string,
  messageId?: string,
): TradeSignal | null {
  try {
    // match[1] = action keyword (buy/sell/etc)
    // match[2] = size (optional)
    // match[3] = symbol
    // match[4] = price (optional)
    
    const symbol = normalizeSymbol(match[3]);
    if (!symbol) return null;
    
    const suggestedSize = match[2] ? parseFloat(match[2]) : undefined;
    const suggestedPrice = match[4] ? parseFloat(match[4].replace(/,/g, '')) : undefined;
    
    // Extract confidence
    const confidence = extractConfidence(fullText);
    
    // Extract reasoning (context around the signal)
    const reasoning = extractReasoning(fullText, match.index || 0);
    
    // Extract stop loss and take profit
    const stopLoss = extractStopLoss(fullText);
    const takeProfit = extractTakeProfit(fullText);
    
    // Assess risk level
    const riskLevel = assessRiskLevel(confidence, suggestedSize);
    
    const signal: TradeSignal = {
      id: uuidv4(),
      action,
      symbol,
      suggestedSize,
      suggestedPrice,
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      reasoning,
      riskLevel,
      stopLoss,
      takeProfit,
      provider,
      timestamp: new Date(),
      messageId,
      executed: false,
    };
    
    return signal;
  } catch (error) {
    console.error('Error extracting signal from match:', error);
    return null;
  }
}

/**
 * Create a HOLD signal
 */
function createHoldSignal(
  fullText: string,
  provider?: string,
  messageId?: string,
): TradeSignal {
  const confidence = extractConfidence(fullText);
  const reasoning = extractReasoning(fullText, 0);
  
  return {
    id: uuidv4(),
    action: TradeAction.HOLD,
    symbol: 'ALL',
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
    reasoning,
    riskLevel: RiskLevel.VERY_LOW,
    provider,
    timestamp: new Date(),
    messageId,
    executed: false,
  };
}

/**
 * Normalize symbol to standard format (e.g., "BTC/USD")
 */
function normalizeSymbol(symbol: string): string | null {
  if (!symbol) return null;
  
  // Remove whitespace
  symbol = symbol.trim().toUpperCase();
  
  // If already has slash, return as-is
  if (symbol.includes('/')) return symbol;
  
  // Common cryptocurrency symbols
  const cryptos = ['BTC', 'ETH', 'SOL', 'MATIC', 'ADA', 'DOT', 'AVAX', 'LINK'];
  if (cryptos.includes(symbol)) {
    return `${symbol}/USD`;
  }
  
  return symbol;
}

/**
 * Extract confidence level from text
 */
function extractConfidence(text: string): number {
  const matches = [...text.matchAll(PATTERNS.CONFIDENCE)];
  
  if (matches.length === 0) {
    // Default confidence if not specified
    return 50;
  }
  
  // Get the last confidence mention (most relevant)
  const lastMatch = matches[matches.length - 1];
  
  // Try to extract numeric percentage
  if (lastMatch[1]) {
    return parseInt(lastMatch[1], 10);
  }
  
  if (lastMatch[3]) {
    return parseInt(lastMatch[3], 10);
  }
  
  // Map word confidence levels to numbers
  const confidenceWord = lastMatch[2]?.toLowerCase();
  const confidenceMap: Record<string, number> = {
    'very low': 20,
    'low': 35,
    'medium': 50,
    'moderate': 50,
    'high': 75,
    'very high': 90,
    'certain': 95,
  };
  
  return confidenceMap[confidenceWord || ''] || 50;
}

/**
 * Extract reasoning (context around the signal)
 */
function extractReasoning(text: string, signalIndex: number): string {
  // Get 200 characters before and after the signal
  const start = Math.max(0, signalIndex - 100);
  const end = Math.min(text.length, signalIndex + 200);
  
  let reasoning = text.substring(start, end).trim();
  
  // Clean up reasoning
  reasoning = reasoning
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\W+/, '') // Remove leading punctuation
    .replace(/\W+$/, ''); // Remove trailing punctuation
  
  // If reasoning is too short, use first sentence of response
  if (reasoning.length < 50) {
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    reasoning = sentences?.[0]?.trim() || text.substring(0, 200);
  }
  
  return reasoning;
}

/**
 * Extract stop loss price from text
 */
function extractStopLoss(text: string): number | undefined {
  const matches = [...text.matchAll(PATTERNS.STOP_LOSS)];
  if (matches.length === 0) return undefined;
  
  const lastMatch = matches[matches.length - 1];
  const priceStr = lastMatch[1].replace(/,/g, '');
  return parseFloat(priceStr);
}

/**
 * Extract take profit price from text
 */
function extractTakeProfit(text: string): number | undefined {
  const matches = [...text.matchAll(PATTERNS.TAKE_PROFIT)];
  if (matches.length === 0) return undefined;
  
  const lastMatch = matches[matches.length - 1];
  const priceStr = lastMatch[1].replace(/,/g, '');
  return parseFloat(priceStr);
}

/**
 * Assess risk level based on confidence and position size
 */
function assessRiskLevel(confidence: number, size?: number): RiskLevel {
  // Lower confidence = higher risk
  if (confidence < 40) return RiskLevel.VERY_HIGH;
  if (confidence < 55) return RiskLevel.HIGH;
  
  // Large position sizes = higher risk
  if (size && size > 1) return RiskLevel.HIGH;
  if (size && size > 0.5) return RiskLevel.MEDIUM;
  
  // Default based on confidence
  if (confidence >= 80) return RiskLevel.LOW;
  if (confidence >= 65) return RiskLevel.MEDIUM;
  
  return RiskLevel.MEDIUM;
}

/**
 * Validate if a signal is actionable
 */
export function isSignalActionable(signal: TradeSignal): boolean {
  // HOLD signals are always actionable (they tell you NOT to trade)
  if (signal.action === TradeAction.HOLD) return true;
  
  // Must have a symbol
  if (!signal.symbol || signal.symbol === 'ALL') return false;
  
  // Confidence should be at least 60%
  if (signal.confidence < 60) return false;
  
  return true;
}

/**
 * Format signal for display
 */
export function formatSignalSummary(signal: TradeSignal): string {
  const action = signal.action.toUpperCase();
  const symbol = signal.symbol;
  const price = signal.suggestedPrice ? ` at $${signal.suggestedPrice.toLocaleString()}` : '';
  const size = signal.suggestedSize ? ` ${signal.suggestedSize} ` : ' ';
  const confidence = `${signal.confidence}%`;
  
  return `${action}${size}${symbol}${price} (Confidence: ${confidence})`;
}
