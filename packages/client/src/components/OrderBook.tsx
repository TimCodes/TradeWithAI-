import { useMemo } from 'react';
import { useOrderBook } from '../hooks/useOrderBook';
import { Card } from './ui/card';
import './OrderBook.css';

interface OrderBookProps {
  symbol: string;
  depth?: number;
  height?: number;
  showSpread?: boolean;
}

interface OrderBookRowProps {
  price: number;
  size: number;
  total: number;
  type: 'bid' | 'ask';
  maxTotal: number;
}

/**
 * OrderBookRow Component
 * 
 * Displays a single order book level with visual depth bar
 */
function OrderBookRow({ price, size, total, type, maxTotal }: OrderBookRowProps) {
  const depthPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  
  return (
    <div className={`orderbook-row orderbook-row-${type}`}>
      <div
        className={`orderbook-depth orderbook-depth-${type}`}
        style={{ width: `${depthPercent}%` }}
      />
      <span className="orderbook-price">{price.toFixed(2)}</span>
      <span className="orderbook-size">{size.toFixed(4)}</span>
      <span className="orderbook-total">{total.toFixed(4)}</span>
    </div>
  );
}

/**
 * OrderBook Component
 * 
 * Displays real-time order book with bid/ask depth.
 * 
 * Features:
 * - Top N bids and asks (configurable)
 * - Visual depth bars
 * - Price, size, and cumulative total columns
 * - Spread display in the middle
 * - Real-time WebSocket updates
 * - Color-coded bids (green) and asks (red)
 * - Scrollable for more depth
 * 
 * @example
 * ```tsx
 * <OrderBook 
 *   symbol="BTC/USD" 
 *   depth={15}
 *   height={600}
 *   showSpread={true}
 * />
 * ```
 */
export function OrderBook({
  symbol,
  depth = 15,
  height = 600,
  showSpread = true,
}: OrderBookProps) {
  const {
    bids,
    asks,
    spread,
    spreadPercent,
    midPrice,
    isLoading,
    isConnected,
    error,
  } = useOrderBook({
    symbol,
    depth,
    autoSubscribe: true,
  });

  /**
   * Calculate max total for depth visualization
   */
  const maxBidTotal = useMemo(() => {
    return bids.length > 0 ? Math.max(...bids.map((b) => b.total)) : 0;
  }, [bids]);

  const maxAskTotal = useMemo(() => {
    return asks.length > 0 ? Math.max(...asks.map((a) => a.total)) : 0;
  }, [asks]);

  /**
   * Reverse asks to show best ask at bottom (closest to spread)
   */
  const reversedAsks = useMemo(() => {
    return [...asks].reverse();
  }, [asks]);

  return (
    <Card className="orderbook-card">
      <div className="orderbook-header">
        <div className="orderbook-title">
          <h3>Order Book</h3>
          <span className="orderbook-symbol">{symbol}</span>
        </div>
        
        <div className="orderbook-status">
          {isConnected ? (
            <span className="status-indicator status-connected">
              <span className="status-dot" />
              Live
            </span>
          ) : (
            <span className="status-indicator status-disconnected">
              <span className="status-dot" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="orderbook-error">
          <p>Error loading order book: {error}</p>
        </div>
      )}

      <div className="orderbook-content" style={{ height: `${height - 80}px` }}>
        {/* Column Headers */}
        <div className="orderbook-column-headers">
          <span>Price (USD)</span>
          <span>Size</span>
          <span>Total</span>
        </div>

        {/* Asks Section (Sell Orders) */}
        <div className="orderbook-asks-section">
          {isLoading ? (
            <div className="orderbook-loading">
              <div className="loading-spinner" />
              <p>Loading order book...</p>
            </div>
          ) : reversedAsks.length > 0 ? (
            reversedAsks.map((ask, index) => (
              <OrderBookRow
                key={`ask-${ask.price}-${index}`}
                price={ask.price}
                size={ask.size}
                total={ask.total}
                type="ask"
                maxTotal={maxAskTotal}
              />
            ))
          ) : (
            <div className="orderbook-empty">
              <p>No asks available</p>
            </div>
          )}
        </div>

        {/* Spread Section */}
        {showSpread && midPrice !== null && (
          <div className="orderbook-spread">
            <div className="spread-info">
              <span className="spread-label">Spread:</span>
              <span className="spread-value">
                ${spread.toFixed(2)} ({spreadPercent.toFixed(3)}%)
              </span>
            </div>
            <div className="spread-mid-price">
              <span className="mid-price-label">Mid:</span>
              <span className="mid-price-value">${midPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Bids Section (Buy Orders) */}
        <div className="orderbook-bids-section">
          {isLoading ? (
            <div className="orderbook-loading">
              <div className="loading-spinner" />
              <p>Loading order book...</p>
            </div>
          ) : bids.length > 0 ? (
            bids.map((bid, index) => (
              <OrderBookRow
                key={`bid-${bid.price}-${index}`}
                price={bid.price}
                size={bid.size}
                total={bid.total}
                type="bid"
                maxTotal={maxBidTotal}
              />
            ))
          ) : (
            <div className="orderbook-empty">
              <p>No bids available</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Stats */}
      <div className="orderbook-footer">
        <div className="orderbook-stat">
          <span className="stat-label">Best Bid:</span>
          <span className="stat-value stat-bid">
            {bids.length > 0 ? `$${bids[0].price.toFixed(2)}` : '-'}
          </span>
        </div>
        <div className="orderbook-stat">
          <span className="stat-label">Best Ask:</span>
          <span className="stat-value stat-ask">
            {asks.length > 0 ? `$${asks[0].price.toFixed(2)}` : '-'}
          </span>
        </div>
      </div>
    </Card>
  );
}
