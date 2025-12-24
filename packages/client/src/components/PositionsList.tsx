import { useMemo, useState } from 'react';
import { useTradingStore } from '../stores/useTradingStore';
import { useMarketDataStore } from '../stores/useMarketDataStore';
import { useClosePosition } from '../hooks/useApi';
import type { Position } from '../types/store.types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import './PositionsList.css';

interface PositionsListProps {
  showClosed?: boolean;
  maxHeight?: number;
}

interface PositionRowProps {
  position: Position;
  currentPrice: number | null;
  onClose: (positionId: string) => void;
}

type SortField = 'symbol' | 'side' | 'size' | 'entryPrice' | 'unrealizedPnl' | 'unrealizedPnlPercent';
type SortDirection = 'asc' | 'desc';

/**
 * PositionRow Component
 * 
 * Displays a single position with live P&L updates
 */
function PositionRow({ position, currentPrice, onClose }: PositionRowProps) {
  const {
    id,
    symbol,
    side,
    size,
    entryPrice,
    unrealizedPnl,
    unrealizedPnlPercent,
    realizedPnl,
    stopLoss,
    takeProfit,
  } = position;

  // Use current price from props or fallback to position's currentPrice
  const displayPrice = currentPrice || position.currentPrice;
  
  // Recalculate P&L with latest price if available
  const calculatedPnl = useMemo(() => {
    if (!currentPrice) {
      return { pnl: unrealizedPnl, pnlPercent: unrealizedPnlPercent };
    }
    
    const priceDiff = side === 'long' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    const pnl = priceDiff * size;
    const pnlPercent = (priceDiff / entryPrice) * 100;
    
    return { pnl, pnlPercent };
  }, [currentPrice, entryPrice, size, side, unrealizedPnl, unrealizedPnlPercent]);

  const isProfitable = calculatedPnl.pnl >= 0;

  return (
    <div className="position-row">
      <div className="position-cell position-symbol">
        <span className="symbol-text">{symbol}</span>
        <span className={`side-badge side-${side}`}>{side.toUpperCase()}</span>
      </div>
      
      <div className="position-cell position-size">
        {size.toFixed(4)}
      </div>
      
      <div className="position-cell position-entry-price">
        ${entryPrice.toFixed(2)}
      </div>
      
      <div className="position-cell position-current-price">
        ${displayPrice.toFixed(2)}
      </div>
      
      <div className={`position-cell position-pnl ${isProfitable ? 'pnl-profit' : 'pnl-loss'}`}>
        <span className="pnl-amount">
          {calculatedPnl.pnl >= 0 ? '+' : ''}${calculatedPnl.pnl.toFixed(2)}
        </span>
        <span className="pnl-percent">
          ({calculatedPnl.pnlPercent >= 0 ? '+' : ''}{calculatedPnl.pnlPercent.toFixed(2)}%)
        </span>
      </div>
      
      <div className="position-cell position-realized">
        ${realizedPnl.toFixed(2)}
      </div>
      
      <div className="position-cell position-levels">
        {stopLoss && (
          <span className="level-stop-loss" title="Stop Loss">
            SL: ${stopLoss.toFixed(2)}
          </span>
        )}
        {takeProfit && (
          <span className="level-take-profit" title="Take Profit">
            TP: ${takeProfit.toFixed(2)}
          </span>
        )}
        {!stopLoss && !takeProfit && <span className="level-none">-</span>}
      </div>
      
      <div className="position-cell position-actions">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onClose(id)}
          className="close-button"
        >
          Close
        </Button>
      </div>
    </div>
  );
}

/**
 * PositionsList Component
 * 
 * Displays all open positions with real-time P&L updates.
 * 
 * Features:
 * - Display all open positions in a table
 * - Real-time P&L updates via WebSocket
 * - Color-coded P&L (green profit, red loss)
 * - Close position button
 * - Unrealized vs realized P&L
 * - Sort/filter functionality
 * - Responsive design
 * 
 * @example
 * ```tsx
 * <PositionsList 
 *   showClosed={false}
 *   maxHeight={600}
 * />
 * ```
 */
export function PositionsList({
  maxHeight = 600,
}: PositionsListProps) {
  const { positions } = useTradingStore();
  const { tickers } = useMarketDataStore();
  const closePositionMutation = useClosePosition();
  
  const [sortField, setSortField] = useState<SortField>('unrealizedPnl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterSymbol, setFilterSymbol] = useState<string>('');
  const [filterSide, setFilterSide] = useState<'all' | 'long' | 'short'>('all');

  /**
   * Handle close position
   */
  const handleClosePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to close this position?')) {
      return;
    }

    try {
      await closePositionMutation.mutateAsync({ positionId });
      // Position will be removed from store via WebSocket update
    } catch (error) {
      console.error('[PositionsList] Failed to close position:', error);
      alert(`Failed to close position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Handle sort column click
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  /**
   * Filter and sort positions
   */
  const filteredAndSortedPositions = useMemo(() => {
    let filtered = [...positions];
    
    // Filter by symbol
    if (filterSymbol) {
      filtered = filtered.filter((pos) =>
        pos.symbol.toLowerCase().includes(filterSymbol.toLowerCase())
      );
    }
    
    // Filter by side
    if (filterSide !== 'all') {
      filtered = filtered.filter((pos) => pos.side === filterSide);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: number | string = a[sortField];
      let bValue: number | string = b[sortField];
      
      // Handle string comparisons
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
        return sortDirection === 'asc'
          ? aValue > bValue ? 1 : -1
          : aValue < bValue ? 1 : -1;
      }
      
      // Handle number comparisons
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    
    return filtered;
  }, [positions, filterSymbol, filterSide, sortField, sortDirection]);

  /**
   * Calculate total P&L
   */
  const totalPnl = useMemo(() => {
    return filteredAndSortedPositions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
  }, [filteredAndSortedPositions]);

  const totalRealizedPnl = useMemo(() => {
    return filteredAndSortedPositions.reduce((sum, pos) => sum + pos.realizedPnl, 0);
  }, [filteredAndSortedPositions]);

  return (
    <Card className="positions-list-card">
      <div className="positions-header">
        <div className="positions-title">
          <h3>Open Positions</h3>
          <span className="positions-count">
            {filteredAndSortedPositions.length} {filteredAndSortedPositions.length === 1 ? 'position' : 'positions'}
          </span>
        </div>
        
        <div className="positions-summary">
          <div className="summary-item">
            <span className="summary-label">Unrealized P&L:</span>
            <span className={`summary-value ${totalPnl >= 0 ? 'pnl-profit' : 'pnl-loss'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Realized P&L:</span>
            <span className="summary-value">
              ${totalRealizedPnl.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="positions-filters">
        <input
          type="text"
          placeholder="Filter by symbol..."
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="filter-input"
        />
        
        <div className="filter-buttons">
          <Button
            variant={filterSide === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterSide('all')}
          >
            All
          </Button>
          <Button
            variant={filterSide === 'long' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterSide('long')}
          >
            Long
          </Button>
          <Button
            variant={filterSide === 'short' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterSide('short')}
          >
            Short
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="positions-table-container" style={{ maxHeight: `${maxHeight}px` }}>
        <div className="positions-table-header">
          <div
            className="header-cell position-symbol"
            onClick={() => handleSort('symbol')}
          >
            Symbol {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
          </div>
          <div
            className="header-cell position-size"
            onClick={() => handleSort('size')}
          >
            Size {sortField === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
          </div>
          <div
            className="header-cell position-entry-price"
            onClick={() => handleSort('entryPrice')}
          >
            Entry {sortField === 'entryPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
          </div>
          <div className="header-cell position-current-price">
            Current
          </div>
          <div
            className="header-cell position-pnl"
            onClick={() => handleSort('unrealizedPnl')}
          >
            Unrealized P&L {sortField === 'unrealizedPnl' && (sortDirection === 'asc' ? '↑' : '↓')}
          </div>
          <div className="header-cell position-realized">
            Realized P&L
          </div>
          <div className="header-cell position-levels">
            SL/TP
          </div>
          <div className="header-cell position-actions">
            Actions
          </div>
        </div>

        <div className="positions-table-body">
          {filteredAndSortedPositions.length > 0 ? (
            filteredAndSortedPositions.map((position) => (
              <PositionRow
                key={position.id}
                position={position}
                currentPrice={tickers[position.symbol]?.price || null}
                onClose={handleClosePosition}
              />
            ))
          ) : (
            <div className="positions-empty">
              <p>No open positions</p>
              <span className="empty-hint">
                {filterSymbol || filterSide !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Open a position to get started'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
