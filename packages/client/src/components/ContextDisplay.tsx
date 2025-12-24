import { useState } from 'react';
import { useTradingContext } from '../hooks/useApi';

interface Balance {
  currency: string;
  available: number;
  reserved: number;
  total: number;
}

interface Position {
  id: string;
  symbol: string;
  side: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

interface Order {
  id: string;
  symbol: string;
  side: string;
  type: string;
  size: number;
  price?: number;
  status: string;
  createdAt: Date;
}

interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

/**
 * ContextDisplay Component
 * 
 * Shows the current trading context that will be sent to the LLM:
 * - Account balance
 * - Open positions with P&L
 * - Recent order history
 * - Current market prices
 */
export const ContextDisplay = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: context, isLoading } = useTradingContext();

  if (isLoading) {
    return (
      <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          Loading trading context...
        </div>
      </div>
    );
  }

  if (!context) {
    return null;
  }

  return (
    <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:bg-slate-800/50 rounded px-2 py-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">📊 Trading Context</span>
          <span className="text-xs text-slate-500">
            (Will be included in AI prompt)
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-3 space-y-3 text-xs">
          {/* Balance */}
          {context.balance && context.balance.length > 0 && (
            <div>
              <div className="font-semibold text-slate-300 mb-1">💵 Balance:</div>
              <div className="pl-3 space-y-1">
                {context.balance.map((bal: Balance, idx: number) => (
                  <div key={idx} className="text-slate-400">
                    {bal.currency}: ${bal.total.toFixed(2)}{' '}
                    <span className="text-slate-500">
                      (Available: ${bal.available.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positions */}
          {context.positions && context.positions.length > 0 ? (
            <div>
              <div className="font-semibold text-slate-300 mb-1">
                📈 Open Positions ({context.positions.length}):
              </div>
              <div className="pl-3 space-y-2">
                {context.positions.map((pos: Position) => (
                  <div key={pos.id} className="text-slate-400">
                    <div>
                      {pos.symbol} {pos.side.toUpperCase()}: {pos.size} @ ${pos.entryPrice.toFixed(2)}
                    </div>
                    <div className={pos.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      P&L: {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}{' '}
                      ({pos.unrealizedPnlPercent >= 0 ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-slate-500">No open positions</div>
          )}

          {/* Recent Orders */}
          {context.recentOrders && context.recentOrders.length > 0 && (
            <div>
              <div className="font-semibold text-slate-300 mb-1">
                📝 Recent Orders (Last {context.recentOrders.length}):
              </div>
              <div className="pl-3 space-y-1">
                {context.recentOrders.map((order: Order) => (
                  <div key={order.id} className="text-slate-400">
                    <span className="font-medium">{order.status}</span> -{' '}
                    {order.side.toUpperCase()} {order.size} {order.symbol}
                    {order.price && ` @ $${order.price.toFixed(2)}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Prices */}
          {context.marketPrices && context.marketPrices.length > 0 && (
            <div>
              <div className="font-semibold text-slate-300 mb-1">💹 Market Prices:</div>
              <div className="pl-3 space-y-1">
                {context.marketPrices.map((market: MarketPrice, idx: number) => (
                  <div key={idx} className="text-slate-400">
                    {market.symbol}: ${market.price.toFixed(2)}{' '}
                    <span className={market.change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                      ({market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-slate-500 text-xs pt-2 border-t border-slate-700">
            Last updated: {new Date(context.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};
