/**
 * OrderForm Component - Usage Examples
 * 
 * This file demonstrates various ways to use the OrderForm component
 * in your trading application.
 */

import { useState } from 'react';
import { OrderForm } from './OrderForm';
import { useTradingStore } from '../stores/useTradingStore';

/* =============================================================================
   EXAMPLE 1: Basic Usage
   ============================================================================= */

export function Example1_BasicUsage() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Place an Order</h2>
      <OrderForm />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 2: With Initial Symbol
   ============================================================================= */

export function Example2_WithInitialSymbol() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Buy Ethereum</h2>
      <OrderForm initialSymbol="ETHUSDT" />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 3: With Order Placed Callback
   ============================================================================= */

export function Example3_WithCallback() {
  const handleOrderPlaced = (orderId: string) => {
    console.log('[Example] Order placed:', orderId);
    // Could show toast notification
    alert(`Order ${orderId} placed successfully!`);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Order with Callback</h2>
      <OrderForm 
        initialSymbol="BTCUSDT"
        onOrderPlaced={handleOrderPlaced}
      />
    </div>
  );
}

/* =============================================================================
   EXAMPLE 4: Integrated with Chart
   ============================================================================= */

export function Example4_IntegratedWithChart() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Chart Area */}
      <div className="col-span-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{selectedSymbol} Chart</h3>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
            </select>
          </div>
          <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
            Chart Placeholder ({selectedSymbol})
          </div>
        </div>
      </div>

      {/* Order Form Sidebar */}
      <div className="col-span-4">
        <OrderForm 
          initialSymbol={selectedSymbol}
          onOrderPlaced={(orderId) => {
            console.log('Order placed:', orderId);
          }}
        />
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 5: Full Trading Dashboard Layout
   ============================================================================= */

export function Example5_FullDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const { orders, positions } = useTradingStore();

  return (
    <div className="h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left Column: Chart and Positions */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-2/3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedSymbol}</h3>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
              </select>
            </div>
            <div className="h-full bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              Chart for {selectedSymbol}
            </div>
          </div>

          {/* Positions Table */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-1/3">
            <h3 className="text-lg font-semibold mb-4">
              Open Positions ({positions.length})
            </h3>
            <div className="overflow-auto">
              {positions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No open positions</p>
              ) : (
                <p className="text-gray-500">Positions list here...</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Form and Orders */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Order Form */}
          <OrderForm 
            initialSymbol={selectedSymbol}
            onOrderPlaced={(orderId) => {
              console.log('[Dashboard] Order placed:', orderId);
            }}
          />

          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              Recent Orders ({orders.slice(0, 5).length})
            </h3>
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <div 
                  key={order.id}
                  className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{order.symbol}</span>
                    <span className={order.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                      {order.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {order.size} @ ${order.price?.toFixed(2) || 'Market'}
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-gray-500 text-center py-4">No orders yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 6: Mobile-Optimized Layout
   ============================================================================= */

export function Example6_MobileOptimized() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [activeTab, setActiveTab] = useState<'chart' | 'order' | 'positions'>('order');

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-gray-800 p-4 shadow sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Trading</h1>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-2 py-1 text-sm border rounded"
          >
            <option value="BTCUSDT">BTC</option>
            <option value="ETHUSDT">ETH</option>
            <option value="BNBUSDT">BNB</option>
          </select>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('order')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'order'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          Order
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'chart'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          Chart
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex-1 py-3 text-sm font-medium ${
            activeTab === 'positions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          Positions
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-2">
        {activeTab === 'order' && (
          <OrderForm 
            initialSymbol={selectedSymbol}
            onOrderPlaced={(id) => {
              console.log('Order placed:', id);
              setActiveTab('positions');
            }}
          />
        )}
        {activeTab === 'chart' && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-96">
            Chart for {selectedSymbol}
          </div>
        )}
        {activeTab === 'positions' && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            Positions list
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 7: Quick Order Buttons
   ============================================================================= */

export function Example7_QuickOrderButtons() {
  const [showForm, setShowForm] = useState(false);
  const [quickSymbol, setQuickSymbol] = useState('BTCUSDT');

  const quickBuy = (symbol: string, amount: number) => {
    console.log(`Quick buy: ${amount} of ${symbol}`);
    setQuickSymbol(symbol);
    setShowForm(true);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Quick Trading</h2>
      
      {/* Quick Buy Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => quickBuy('BTCUSDT', 100)}
          className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
        >
          Quick Buy $100 BTC
        </button>
        <button
          onClick={() => quickBuy('ETHUSDT', 100)}
          className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
        >
          Quick Buy $100 ETH
        </button>
        <button
          onClick={() => quickBuy('BTCUSDT', 500)}
          className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
        >
          Buy $500 BTC
        </button>
        <button
          onClick={() => quickBuy('ETHUSDT', 500)}
          className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
        >
          Buy $500 ETH
        </button>
      </div>

      {/* Advanced Form */}
      <div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {showForm ? '▼ Hide' : '▶ Show'} Advanced Order Form
        </button>
        {showForm && (
          <div className="mt-4">
            <OrderForm 
              initialSymbol={quickSymbol}
              onOrderPlaced={() => setShowForm(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 8: With Order Status Tracking
   ============================================================================= */

export function Example8_WithOrderTracking() {
  const { orders } = useTradingStore();
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const lastOrder = lastOrderId 
    ? orders.find((o) => o.id === lastOrderId)
    : null;

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-12 gap-4">
        {/* Order Form */}
        <div className="col-span-6">
          <OrderForm 
            initialSymbol="BTCUSDT"
            onOrderPlaced={(orderId) => {
              console.log('Order placed:', orderId);
              setLastOrderId(orderId);
            }}
          />
        </div>

        {/* Order Status */}
        <div className="col-span-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Last Order Status</h3>
            {lastOrder ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono text-sm">{lastOrder.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Symbol:</span>
                  <span className="font-semibold">{lastOrder.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Side:</span>
                  <span className={lastOrder.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                    {lastOrder.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold capitalize">{lastOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span>{lastOrder.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span>${lastOrder.price?.toFixed(2) || 'Market'}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No orders placed yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 9: With Custom Styling
   ============================================================================= */

export function Example9_CustomStyling() {
  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Trade Now
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Place your order with confidence
          </p>
        </div>
        
        <OrderForm 
          initialSymbol="BTCUSDT"
          onOrderPlaced={(orderId) => {
            console.log('Order placed:', orderId);
          }}
        />
      </div>
    </div>
  );
}

/* =============================================================================
   EXAMPLE 10: Compact Widget
   ============================================================================= */

export function Example10_CompactWidget() {
  return (
    <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold">Quick Trade</h3>
      </div>
      <div className="scale-95">
        <OrderForm initialSymbol="BTCUSDT" />
      </div>
    </div>
  );
}
