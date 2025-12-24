import { useState, useMemo, useCallback } from 'react';
import { useTradingStore } from '../stores/useTradingStore';
import { useMarketDataStore } from '../stores/useMarketDataStore';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { OrderConfirmation } from './OrderConfirmation';
import './OrderForm.css';

interface OrderFormProps {
  initialSymbol?: string;
  onOrderPlaced?: (orderId: string) => void;
}

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

/**
 * OrderForm Component
 * 
 * A comprehensive form for placing market and limit orders with risk validation.
 * 
 * Features:
 * - Symbol selector dropdown
 * - Buy/sell toggle buttons
 * - Order type selector (market/limit)
 * - Size input with validation
 * - Price input for limit orders
 * - Estimated cost and available balance display
 * - Risk metrics display
 * - Confirmation dialog
 * - Error handling with toast notifications
 * 
 * @example
 * ```tsx
 * <OrderForm 
 *   initialSymbol="BTCUSDT"
 *   onOrderPlaced={(orderId) => console.log('Order placed:', orderId)}
 * />
 * ```
 */
export function OrderForm({
  initialSymbol = 'BTCUSDT',
  onOrderPlaced,
}: OrderFormProps) {
  const { balances, addOrder } = useTradingStore();
  const { tickers } = useMarketDataStore();

  // Form state
  const [symbol, setSymbol] = useState(initialSymbol);
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Available symbols
  const availableSymbols = useMemo(() => {
    return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'];
  }, []);

  // Current market price
  const currentPrice = useMemo(() => {
    return tickers[symbol]?.price || 0;
  }, [tickers, symbol]);

  // Order price (market uses current price, limit uses input price)
  const orderPrice = useMemo(() => {
    if (orderType === 'market') {
      return currentPrice;
    }
    return parseFloat(price) || 0;
  }, [orderType, currentPrice, price]);

  // Estimated cost
  const estimatedCost = useMemo(() => {
    const sizeNum = parseFloat(size) || 0;
    return sizeNum * orderPrice;
  }, [size, orderPrice]);

  // Available balance (USDT)
  const availableBalance = useMemo(() => {
    const usdtBalance = balances.find((b) => b.currency === 'USDT');
    return usdtBalance?.available || 0;
  }, [balances]);

  // Risk metrics
  const riskMetrics = useMemo(() => {
    const usdtBalance = balances.find((b) => b.currency === 'USDT');
    const portfolioValue = usdtBalance?.total || 0;
    
    // Position size as % of portfolio
    const positionSizePercent = portfolioValue > 0 
      ? (estimatedCost / portfolioValue) * 100 
      : 0;
    
    // Risk score (0-100, higher = riskier)
    let riskScore = positionSizePercent;
    
    // Increase risk for market orders (slippage risk)
    if (orderType === 'market') {
      riskScore *= 1.2;
    }
    
    // Increase risk if price far from market
    if (orderType === 'limit' && currentPrice > 0) {
      const priceDeviation = Math.abs(orderPrice - currentPrice) / currentPrice;
      riskScore *= (1 + priceDeviation);
    }
    
    // Risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore < 5) {
      riskLevel = 'low';
    } else if (riskScore < 15) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }
    
    return {
      positionSizePercent,
      riskScore: Math.min(riskScore, 100),
      riskLevel,
    };
  }, [size, estimatedCost, balances, orderType, orderPrice, currentPrice]);

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    const sizeNum = parseFloat(size);
    const priceNum = parseFloat(price);
    
    if (!size || isNaN(sizeNum) || sizeNum <= 0) {
      errors.push('Size must be greater than 0');
    }
    
    if (orderType === 'limit' && (!price || isNaN(priceNum) || priceNum <= 0)) {
      errors.push('Price must be greater than 0');
    }
    
    if (estimatedCost > availableBalance) {
      errors.push('Insufficient balance');
    }
    
    if (sizeNum > 0 && sizeNum < 0.0001) {
      errors.push('Size too small (min: 0.0001)');
    }
    
    if (riskMetrics.positionSizePercent > 50) {
      errors.push('Position size exceeds 50% of portfolio');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [size, price, orderType, estimatedCost, availableBalance, riskMetrics]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }
    
    // Show confirmation dialog
    setShowConfirmation(true);
  }, [validation]);

  /**
   * Handle order confirmation
   */
  const handleConfirm = useCallback(async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // TODO: Call API when Story 4.2 is complete
      // For now, just add to store
      const orderId = `order_${Date.now()}`;
      
      addOrder({
        id: orderId,
        symbol,
        side,
        type: orderType,
        size: parseFloat(size),
        price: orderType === 'limit' ? parseFloat(price) : orderPrice,
        status: 'pending',
        filledSize: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      setSuccess(`${side.toUpperCase()} order placed successfully!`);
      
      // Call callback
      if (onOrderPlaced) {
        onOrderPlaced(orderId);
      }
      
      // Reset form
      setSize('');
      if (orderType === 'limit') {
        setPrice('');
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('[OrderForm] Error placing order:', err);
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  }, [symbol, side, orderType, size, price, orderPrice, addOrder, onOrderPlaced]);

  /**
   * Handle cancel confirmation
   */
  const handleCancel = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  /**
   * Handle side change
   */
  const handleSideChange = useCallback((newSide: OrderSide) => {
    setSide(newSide);
    setError(null);
  }, []);

  /**
   * Handle order type change
   */
  const handleOrderTypeChange = useCallback((newType: OrderType) => {
    setOrderType(newType);
    setError(null);
    
    // Set price to current market price when switching to limit
    if (newType === 'limit' && !price && currentPrice > 0) {
      setPrice(currentPrice.toFixed(2));
    }
  }, [price, currentPrice]);

  return (
    <>
      <Card className="order-form-card">
        <div className="order-form-header">
          <h3>Place Order</h3>
          <span className="balance-display">
            Balance: ${availableBalance.toFixed(2)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="order-form">
          {/* Symbol Selector */}
          <div className="form-group">
            <label htmlFor="symbol">Symbol</label>
            <select
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="form-select"
            >
              {availableSymbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
            {currentPrice > 0 && (
              <span className="current-price">
                Current: ${currentPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Side Toggle */}
          <div className="form-group">
            <label>Side</label>
            <div className="side-toggle">
              <Button
                type="button"
                variant={side === 'buy' ? 'default' : 'outline'}
                className={`side-button side-buy ${side === 'buy' ? 'active' : ''}`}
                onClick={() => handleSideChange('buy')}
              >
                Buy
              </Button>
              <Button
                type="button"
                variant={side === 'sell' ? 'destructive' : 'outline'}
                className={`side-button side-sell ${side === 'sell' ? 'active' : ''}`}
                onClick={() => handleSideChange('sell')}
              >
                Sell
              </Button>
            </div>
          </div>

          {/* Order Type Selector */}
          <div className="form-group">
            <label>Order Type</label>
            <div className="order-type-toggle">
              <Button
                type="button"
                variant={orderType === 'market' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleOrderTypeChange('market')}
              >
                Market
              </Button>
              <Button
                type="button"
                variant={orderType === 'limit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleOrderTypeChange('limit')}
              >
                Limit
              </Button>
            </div>
          </div>

          {/* Price Input (Limit Orders) */}
          {orderType === 'limit' && (
            <div className="form-group">
              <label htmlFor="price">Price (USDT)</label>
              <input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="form-input"
              />
            </div>
          )}

          {/* Size Input */}
          <div className="form-group">
            <label htmlFor="size">Size</label>
            <input
              id="size"
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.0000"
              step="0.0001"
              min="0"
              className="form-input"
            />
          </div>

          {/* Estimated Cost */}
          <div className="form-summary">
            <div className="summary-row">
              <span className="summary-label">Estimated Cost:</span>
              <span className="summary-value">${estimatedCost.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Available:</span>
              <span className="summary-value">${availableBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Risk Metrics */}
          {parseFloat(size) > 0 && (
            <div className={`risk-metrics risk-${riskMetrics.riskLevel}`}>
              <div className="risk-header">
                <span className="risk-label">Risk Assessment</span>
                <span className={`risk-badge risk-${riskMetrics.riskLevel}`}>
                  {riskMetrics.riskLevel.toUpperCase()}
                </span>
              </div>
              <div className="risk-details">
                <div className="risk-row">
                  <span>Position Size:</span>
                  <span>{riskMetrics.positionSizePercent.toFixed(2)}% of portfolio</span>
                </div>
                <div className="risk-row">
                  <span>Risk Score:</span>
                  <span>{riskMetrics.riskScore.toFixed(0)}/100</span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {!validation.isValid && (
            <div className="validation-errors">
              {validation.errors.map((err, idx) => (
                <div key={idx} className="error-message">
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="order-error">
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="order-success">
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant={side === 'buy' ? 'default' : 'destructive'}
            className="submit-button"
            disabled={!validation.isValid || isSubmitting}
          >
            {isSubmitting ? 'Placing Order...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
          </Button>
        </form>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <OrderConfirmation
          symbol={symbol}
          side={side}
          orderType={orderType}
          size={parseFloat(size)}
          price={orderType === 'limit' ? parseFloat(price) : currentPrice}
          estimatedCost={estimatedCost}
          riskLevel={riskMetrics.riskLevel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
