import { useState } from 'react';
import { Button } from './ui/button';
import {
  TradeSignal,
  TradeAction,
  formatConfidence,
  isConfidenceActionable,
} from '@alpha-arena/shared';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Check, X } from 'lucide-react';

interface TradeSignalCardProps {
  signal: TradeSignal;
  onExecute: (signalId: string) => void;
  onDismiss: (signalId: string) => void;
  isExecuting?: boolean;
}

export function TradeSignalCard({
  signal,
  onExecute,
  onDismiss,
  isExecuting = false,
}: TradeSignalCardProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Determine card styling based on action
  const getActionStyles = () => {
    switch (signal.action) {
      case TradeAction.BUY:
        return {
          bg: 'bg-green-900/20',
          border: 'border-green-500/30',
          text: 'text-green-400',
          icon: <TrendingUp className="w-5 h-5" />,
        };
      case TradeAction.SELL:
        return {
          bg: 'bg-red-900/20',
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: <TrendingDown className="w-5 h-5" />,
        };
      case TradeAction.HOLD:
        return {
          bg: 'bg-yellow-900/20',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          icon: <Minus className="w-5 h-5" />,
        };
      default:
        return {
          bg: 'bg-slate-900/20',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          icon: <Minus className="w-5 h-5" />,
        };
    }
  };

  const styles = getActionStyles();
  const isActionable = isConfidenceActionable(signal.confidence);

  // Determine risk color
  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'very_low':
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
      case 'very_high':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const handleExecuteClick = () => {
    if (!isActionable || signal.action === TradeAction.HOLD) {
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmExecute = () => {
    onExecute(signal.id);
    setShowConfirmation(false);
  };

  const handleCancelExecute = () => {
    setShowConfirmation(false);
  };

  return (
    <div
      className={`${styles.bg} border ${styles.border} rounded-lg p-4 my-3 transition-all hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={styles.text}>{styles.icon}</div>
          <span className={`font-bold ${styles.text} text-lg`}>
            {signal.action.toUpperCase()} {signal.symbol}
          </span>
          {signal.provider && (
            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
              {signal.provider}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Confidence Badge */}
          <div
            className={`text-sm font-semibold px-2 py-1 rounded ${
              isActionable
                ? 'bg-green-500/20 text-green-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}
          >
            {formatConfidence(signal.confidence)}
          </div>
        </div>
      </div>

      {/* Signal Details */}
      <div className="space-y-2 mb-3">
        {/* Price and Size */}
        {(signal.suggestedPrice || signal.suggestedSize) && (
          <div className="flex gap-4 text-sm text-slate-300">
            {signal.suggestedSize && (
              <div>
                <span className="text-slate-500">Size:</span>{' '}
                <span className="font-semibold">{signal.suggestedSize}</span>
              </div>
            )}
            {signal.suggestedPrice && (
              <div>
                <span className="text-slate-500">Price:</span>{' '}
                <span className="font-semibold">${signal.suggestedPrice.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Stop Loss / Take Profit */}
        {(signal.stopLoss || signal.takeProfit) && (
          <div className="flex gap-4 text-sm text-slate-300">
            {signal.stopLoss && (
              <div>
                <span className="text-slate-500">Stop Loss:</span>{' '}
                <span className="text-red-400 font-semibold">
                  ${signal.stopLoss.toLocaleString()}
                </span>
              </div>
            )}
            {signal.takeProfit && (
              <div>
                <span className="text-slate-500">Take Profit:</span>{' '}
                <span className="text-green-400 font-semibold">
                  ${signal.takeProfit.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Risk Level */}
        {signal.riskLevel && (
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className={`w-4 h-4 ${getRiskColor(signal.riskLevel)}`} />
            <span className="text-slate-500">Risk Level:</span>
            <span className={`font-semibold ${getRiskColor(signal.riskLevel)} capitalize`}>
              {signal.riskLevel.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* Reasoning */}
        <p className="text-sm text-slate-300 italic border-l-2 border-slate-700 pl-3 py-1">
          {signal.reasoning}
        </p>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-3">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-1">Confirm Trade Execution</h4>
              <p className="text-sm text-slate-400">
                You are about to execute this AI-suggested trade. Please review the details carefully.
              </p>
            </div>
          </div>

          {/* Risk Warning */}
          {signal.riskLevel && (signal.riskLevel === 'high' || signal.riskLevel === 'very_high') && (
            <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-3">
              <p className="text-sm text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <strong>High Risk Trade:</strong> This signal has elevated risk. Consider reducing position size.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleConfirmExecute}
              disabled={isExecuting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isExecuting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Executing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Confirm & Execute
                </span>
              )}
            </Button>
            <Button
              onClick={handleCancelExecute}
              disabled={isExecuting}
              variant="outline"
              className="flex-1"
            >
              <span className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancel
              </span>
            </Button>
          </div>
        </div>
      ) : (
        /* Action Buttons */
        <div className="flex gap-2">
          {signal.action !== TradeAction.HOLD && (
            <Button
              onClick={handleExecuteClick}
              disabled={!isActionable || isExecuting || signal.executed}
              className={`flex-1 ${
                signal.action === TradeAction.BUY
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {signal.executed ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Executed
                </span>
              ) : !isActionable ? (
                'Low Confidence'
              ) : (
                'Execute Trade'
              )}
            </Button>
          )}
          
          <Button
            onClick={() => onDismiss(signal.id)}
            variant="outline"
            className={signal.action === TradeAction.HOLD ? 'flex-1' : ''}
            disabled={isExecuting}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <span className="text-xs text-slate-500">
          Signal generated at {new Date(signal.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
