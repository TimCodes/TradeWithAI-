import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTradingTables1730073600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create orders table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'symbol',
            type: 'varchar',
          },
          {
            name: 'side',
            type: 'enum',
            enum: ['buy', 'sell'],
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['market', 'limit', 'stop_loss', 'take_profit', 'stop_loss_limit', 'take_profit_limit'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'submitted', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired'],
            default: "'pending'",
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'stopPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'filledQuantity',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'averageFillPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'timeInForce',
            type: 'enum',
            enum: ['GTC', 'IOC', 'FOK'],
            default: "'GTC'",
          },
          {
            name: 'exchangeOrderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'clientOrderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'rejectReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'riskPercentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'llmProvider',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'llmReasoning',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'llmConfidence',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'submittedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'filledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelledAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for orders
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_symbol_status',
        columnNames: ['symbol', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Create positions table
    await queryRunner.createTable(
      new Table({
        name: 'positions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'symbol',
            type: 'varchar',
          },
          {
            name: 'side',
            type: 'enum',
            enum: ['buy', 'sell'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['open', 'closed'],
            default: "'open'",
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'entryPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'currentPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'exitPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'realizedPnl',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'unrealizedPnl',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'realizedPnlPercentage',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
          },
          {
            name: 'unrealizedPnlPercentage',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
          },
          {
            name: 'stopLossPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'takeProfitPrice',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'stopLossOrderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'takeProfitOrderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'costBasis',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'fees',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'closedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for positions
    await queryRunner.createIndex(
      'positions',
      new TableIndex({
        name: 'IDX_positions_userId_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'positions',
      new TableIndex({
        name: 'IDX_positions_symbol_status',
        columnNames: ['symbol', 'status'],
      }),
    );

    // Create trades table
    await queryRunner.createTable(
      new Table({
        name: 'trades',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'orderId',
            type: 'uuid',
          },
          {
            name: 'positionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'symbol',
            type: 'varchar',
          },
          {
            name: 'side',
            type: 'enum',
            enum: ['buy', 'sell'],
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['entry', 'exit', 'partial_exit'],
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'value',
            type: 'decimal',
            precision: 20,
            scale: 8,
          },
          {
            name: 'fee',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 0,
          },
          {
            name: 'exchangeTradeId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'exchangeOrderId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'realizedPnl',
            type: 'decimal',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'llmProvider',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'llmReasoning',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'llmConfidence',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'executedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for trades
    await queryRunner.createIndex(
      'trades',
      new TableIndex({
        name: 'IDX_trades_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'trades',
      new TableIndex({
        name: 'IDX_trades_orderId',
        columnNames: ['orderId'],
      }),
    );

    await queryRunner.createIndex(
      'trades',
      new TableIndex({
        name: 'IDX_trades_positionId',
        columnNames: ['positionId'],
      }),
    );

    await queryRunner.createIndex(
      'trades',
      new TableIndex({
        name: 'IDX_trades_symbol_createdAt',
        columnNames: ['symbol', 'createdAt'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'positions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trades',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trades',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trades',
      new TableForeignKey({
        columnNames: ['positionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'positions',
        onDelete: 'SET NULL',
      }),
    );

    // Create risk_settings table
    await queryRunner.createTable(
      new Table({
        name: 'risk_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'max_position_size',
            type: 'decimal',
            precision: 20,
            scale: 8,
            default: 1.0,
          },
          {
            name: 'max_position_value_usd',
            type: 'decimal',
            precision: 20,
            scale: 2,
            default: 10000.00,
          },
          {
            name: 'max_portfolio_exposure',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 80.00,
          },
          {
            name: 'max_positions_count',
            type: 'int',
            default: 10,
          },
          {
            name: 'default_stop_loss_pct',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 5.00,
          },
          {
            name: 'enable_automatic_stop_loss',
            type: 'boolean',
            default: true,
          },
          {
            name: 'max_drawdown_pct',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 20.00,
          },
          {
            name: 'enable_drawdown_protection',
            type: 'boolean',
            default: true,
          },
          {
            name: 'risk_per_trade_pct',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 2.00,
          },
          {
            name: 'max_daily_loss_usd',
            type: 'decimal',
            precision: 20,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'enable_risk_checks',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create foreign key for risk_settings
    await queryRunner.createForeignKey(
      'risk_settings',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const riskSettingsTable = await queryRunner.getTable('risk_settings');
    const riskSettingsUserFk = riskSettingsTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('user_id') !== -1);
    if (riskSettingsUserFk) await queryRunner.dropForeignKey('risk_settings', riskSettingsUserFk);

    const tradesTable = await queryRunner.getTable('trades');
    const positionsFk = tradesTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('positionId') !== -1);
    const ordersFk = tradesTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('orderId') !== -1);
    const tradesUserFk = tradesTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('userId') !== -1);

    if (positionsFk) await queryRunner.dropForeignKey('trades', positionsFk);
    if (ordersFk) await queryRunner.dropForeignKey('trades', ordersFk);
    if (tradesUserFk) await queryRunner.dropForeignKey('trades', tradesUserFk);

    const positionsTable = await queryRunner.getTable('positions');
    const positionsUserFk = positionsTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('userId') !== -1);
    if (positionsUserFk) await queryRunner.dropForeignKey('positions', positionsUserFk);

    const ordersTable = await queryRunner.getTable('orders');
    const ordersUserFk = ordersTable?.foreignKeys.find((fk) => fk.columnNames.indexOf('userId') !== -1);
    if (ordersUserFk) await queryRunner.dropForeignKey('orders', ordersUserFk);

    // Drop tables
    await queryRunner.dropTable('risk_settings');
    await queryRunner.dropTable('trades');
    await queryRunner.dropTable('positions');
    await queryRunner.dropTable('orders');
  }
}
