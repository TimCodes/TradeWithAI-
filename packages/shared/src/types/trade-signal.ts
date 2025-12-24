/**
 * Trade Signal Types
 * 
 * These types represent AI-generated trading recommendations
 * that can be parsed from LLM responses and executed by the user.
 */

export enum TradeAction {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
  CLOSE = 'close',
}

export enum SignalConfidence {
  VERY_LOW = 'very_low',    // 0-20%
  LOW = 'low',              // 21-40%
  MEDIUM = 'medium',        // 41-60%
  HIGH = 'high',            // 61-80%
  VERY_HIGH = 'very_high',  // 81-100%
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

/**
 * Main trade signal interface
 * Represents a parsed trading recommendation from an LLM
 */
export interface TradeSignal {
  id: string;
  action: TradeAction;
  symbol: string;
  
  // Optional price/size information
  suggestedPrice?: number;
  suggestedSize?: number;
  
  // Confidence and reasoning
  confidence: number; // 0-100
  confidenceLevel: SignalConfidence;
  reasoning: string;
  
  // Risk assessment
  riskLevel?: RiskLevel;
  stopLoss?: number;
  takeProfit?: number;
  
  // Metadata
  provider?: string; // Which LLM generated this signal
  timestamp: Date;
  messageId?: string; // Reference to the chat message
  
  // Execution tracking
  executed?: boolean;
  executedAt?: Date;
  orderId?: string;
}

/**
 * Risk assessment for a trade signal
 */
export interface SignalRiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  factors: {
    positionSize: 'safe' | 'moderate' | 'aggressive';
    marketVolatility: 'low' | 'medium' | 'high';
    portfolioExposure: 'low' | 'medium' | 'high';
    stopLossDistance: 'tight' | 'moderate' | 'wide';
  };
  warnings: string[];
  recommendations: string[];
}

/**
 * Parsed signal result from LLM response
 */
export interface ParsedSignalResult {
  hasSignal: boolean;
  signals: TradeSignal[];
  rawText: string;
}

/**
 * Signal execution request
 */
export interface ExecuteSignalRequest {
  signalId: string;
  confirmRisk: boolean;
  customSize?: number;
  customPrice?: number;
  addStopLoss?: boolean;
  addTakeProfit?: boolean;
}

/**
 * Signal execution response
 */
export interface ExecuteSignalResponse {
  success: boolean;
  orderId?: string;
  message: string;
  signal: TradeSignal;
}

/**
 * Helper function to get confidence level from numeric confidence
 */
export function getConfidenceLevel(confidence: number): SignalConfidence {
  if (confidence <= 20) return SignalConfidence.VERY_LOW;
  if (confidence <= 40) return SignalConfidence.LOW;
  if (confidence <= 60) return SignalConfidence.MEDIUM;
  if (confidence <= 80) return SignalConfidence.HIGH;
  return SignalConfidence.VERY_HIGH;
}

/**
 * Helper function to determine if confidence is actionable
 */
export function isConfidenceActionable(confidence: number): boolean {
  return confidence >= 60; // HIGH or VERY_HIGH
}

/**
 * Helper to format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${confidence.toFixed(0)}%`;
}
