-- Initialize TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create OHLCV hypertable for time-series data
CREATE TABLE IF NOT EXISTS ohlcv (
  time TIMESTAMPTZ NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8) NOT NULL,
  PRIMARY KEY (time, symbol, interval)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('ohlcv', 'time', if_not_exists => TRUE);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ohlcv_symbol_time ON ohlcv (symbol, time DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_interval ON ohlcv (interval);

-- Create data retention policy (keep 1 year of 1m data)
SELECT add_retention_policy('ohlcv', INTERVAL '1 year', if_not_exists => TRUE);