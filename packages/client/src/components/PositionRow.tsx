import React, { useState } from 'react';
import type { Position } from '../types/store.types';
import { useClosePosition } from '../hooks/useApi';
import { Button } from './ui/button';

interface PositionRowProps {
  position: Position;
}

export const PositionRow: React.FC<PositionRowProps> = ({ position }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closePositionMutation = useClosePosition();

  const handleClosePosition = async () => {
    if (!window.confirm(`Are you sure you want to close this ${position.symbol} position?`)) {
      return;
    }

    setIsClosing(true);
    try {
      await closePositionMutation.mutateAsync({
        positionId: position.id,
      });
    } catch (error) {
      console.error('Failed to close position:', error);
      alert(`Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClosing(false);
    }
  };

  // Format numbers
  const formatPrice = (price: number) => price.toFixed(2);
  const formatSize = (size: number) => size.toFixed(4);
  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}$${pnl.toFixed(2)}`;
  };
  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  // Determine P&L colors
  const pnlColor = position.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600';
  const pnlBgColor = position.unrealizedPnl >= 0 ? 'bg-green-50' : 'bg-red-50';

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      {/* Symbol */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {position.symbol}
      </td>

      {/* Side */}
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            position.side === 'long'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}
        >
          {position.side.toUpperCase()}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3 text-sm text-gray-700">
        {formatSize(position.size)}
      </td>

      {/* Entry Price */}
      <td className="px-4 py-3 text-sm text-gray-700">
        ${formatPrice(position.entryPrice)}
      </td>

      {/* Current Price */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        ${formatPrice(position.currentPrice)}
      </td>

      {/* Unrealized P&L */}
      <td className={`px-4 py-3 text-sm font-semibold ${pnlColor}`}>
        {formatPnl(position.unrealizedPnl)}
      </td>

      {/* Unrealized P&L % */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${pnlColor} ${pnlBgColor}`}>
          {formatPercent(position.unrealizedPnlPercent)}
        </span>
      </td>

      {/* Realized P&L */}
      <td className="px-4 py-3 text-sm text-gray-600">
        ${position.realizedPnl.toFixed(2)}
      </td>

      {/* Stop Loss */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {position.stopLoss ? `$${formatPrice(position.stopLoss)}` : '-'}
      </td>

      {/* Take Profit */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {position.takeProfit ? `$${formatPrice(position.takeProfit)}` : '-'}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-sm text-right">
        <Button
          onClick={handleClosePosition}
          disabled={isClosing}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {isClosing ? 'Closing...' : 'Close'}
        </Button>
      </td>
    </tr>
  );
};
