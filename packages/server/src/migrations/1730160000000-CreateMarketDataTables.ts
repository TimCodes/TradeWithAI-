import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarketDataTables1730160000000 implements MigrationInterface {
  name = 'CreateMarketDataTables1730160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create OHLCV table
    await queryRunner.query(`
      CREATE TABLE "ohlcv" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "symbol" varchar(20) NOT NULL,
        "timeframe" varchar(10) NOT NULL,
        "timestamp" timestamptz NOT NULL,
        "open" decimal(20,8) NOT NULL,
        "high" decimal(20,8) NOT NULL,
        "low" decimal(20,8) NOT NULL,
        "close" decimal(20,8) NOT NULL,
        "volume" decimal(20,8) NOT NULL,
        "trades" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_ohlcv_symbol_timeframe_timestamp" 
      ON "ohlcv" ("symbol", "timeframe", "timestamp")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ohlcv_timestamp" 
      ON "ohlcv" ("timestamp")
    `);

    // Convert to TimescaleDB hypertable (if TimescaleDB extension is installed)
    // This will automatically partition data by time
    try {
      await queryRunner.query(`
        SELECT create_hypertable('ohlcv', 'timestamp', 
          chunk_time_interval => INTERVAL '1 day',
          if_not_exists => TRUE
        )
      `);
      console.log('✅ Created TimescaleDB hypertable for OHLCV data');
    } catch (error) {
      console.warn('⚠️  TimescaleDB extension not available. OHLCV table created as regular table.');
      console.warn('   To enable TimescaleDB features, install the extension: CREATE EXTENSION IF NOT EXISTS timescaledb;');
    }

    // Add compression policy (optional, for TimescaleDB)
    try {
      await queryRunner.query(`
        ALTER TABLE ohlcv SET (
          timescaledb.compress,
          timescaledb.compress_orderby = 'timestamp DESC',
          timescaledb.compress_segmentby = 'symbol, timeframe'
        )
      `);

      await queryRunner.query(`
        SELECT add_compression_policy('ohlcv', INTERVAL '7 days')
      `);
      console.log('✅ Added compression policy for OHLCV data (7 days)');
    } catch (error) {
      console.warn('⚠️  Could not add compression policy (TimescaleDB feature)');
    }

    // Add retention policy (optional, for TimescaleDB)
    // Keep data for 1 year
    try {
      await queryRunner.query(`
        SELECT add_retention_policy('ohlcv', INTERVAL '365 days')
      `);
      console.log('✅ Added retention policy for OHLCV data (365 days)');
    } catch (error) {
      console.warn('⚠️  Could not add retention policy (TimescaleDB feature)');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ohlcv_timestamp"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ohlcv_symbol_timeframe_timestamp"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "ohlcv"`);
  }
}
