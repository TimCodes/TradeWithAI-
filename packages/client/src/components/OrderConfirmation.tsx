import { Button } from './ui/button';
import './OrderConfirmation.css';

interface OrderConfirmationProps {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  size: number;
  price: number;
  estimatedCost: number;
  riskLevel: 'low' | 'medium' | 'high';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * OrderConfirmation Component
 * 
 * Modal dialog to confirm order placement with full details.
 * 
 * @example
 * ```tsx
 * <OrderConfirmation
 *   symbol="BTCUSDT"
 *   side="buy"
 *   orderType="market"
 *   size={0.5}
 *   price={43500}
 *   estimatedCost={21750}
 *   riskLevel="medium"
 *   onConfirm={() => console.log('Confirmed')}
 *   onCancel={() => console.log('Cancelled')}
 * />
 * ```
 */
export function OrderConfirmation({
  symbol,
  side,
  orderType,
  size,
  price,
  estimatedCost,
  riskLevel,
  onConfirm,
  onCancel,
}: OrderConfirmationProps) {
  return (
    <div className="confirmation-overlay" onClick={onCancel}>
      <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <h3>Confirm Order</h3>
          <button className="close-button" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="confirmation-body">
          <div className="order-summary">
            <div className="summary-item">
              <span className="item-label">Action:</span>
              <span className={`item-value action-${side}`}>
                {side.toUpperCase()} {symbol}
              </span>
            </div>

            <div className="summary-item">
              <span className="item-label">Order Type:</span>
              <span className="item-value">{orderType.toUpperCase()}</span>
            </div>

            <div className="summary-item">
              <span className="item-label">Size:</span>
              <span className="item-value">{size.toFixed(4)}</span>
            </div>

            <div className="summary-item">
              <span className="item-label">Price:</span>
              <span className="item-value">${price.toFixed(2)}</span>
            </div>

            <div className="summary-item summary-total">
              <span className="item-label">Estimated Cost:</span>
              <span className="item-value">${estimatedCost.toFixed(2)}</span>
            </div>

            <div className="summary-item">
              <span className="item-label">Risk Level:</span>
              <span className={`item-value risk-badge risk-${riskLevel}`}>
                {riskLevel.toUpperCase()}
              </span>
            </div>
          </div>

          <div className={`risk-warning risk-${riskLevel}`}>
            {riskLevel === 'high' && (
              <p>
                ⚠️ <strong>High Risk:</strong> This order represents a significant portion of your portfolio.
                Please ensure you understand the risks before proceeding.
              </p>
            )}
            {riskLevel === 'medium' && (
              <p>
                ℹ️ <strong>Medium Risk:</strong> This order size is moderate relative to your portfolio.
              </p>
            )}
            {riskLevel === 'low' && (
              <p>
                ✓ <strong>Low Risk:</strong> This order size is conservative relative to your portfolio.
              </p>
            )}
          </div>

          {orderType === 'market' && (
            <div className="market-order-warning">
              <p>
                <strong>Market Order:</strong> This order will execute at the best available price.
                The final execution price may differ from the displayed price due to market movement.
              </p>
            </div>
          )}
        </div>

        <div className="confirmation-footer">
          <Button
            variant="outline"
            onClick={onCancel}
            className="cancel-button"
          >
            Cancel
          </Button>
          <Button
            variant={side === 'buy' ? 'default' : 'destructive'}
            onClick={onConfirm}
            className="confirm-button"
          >
            Confirm {side.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
