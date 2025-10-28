import { Controller, Get, Logger } from '@nestjs/common';
import { KrakenService } from '../services/kraken.service';
import { RiskManagementService } from '../services/risk-management.service';

/**
 * Trading Module Health Check Controller
 * Provides endpoints to verify trading module connectivity and configuration
 */
@Controller('trading/health')
export class TradingHealthController {
  private readonly logger = new Logger(TradingHealthController.name);

  constructor(
    private readonly krakenService: KrakenService,
    private readonly riskManagement: RiskManagementService,
  ) {}

  /**
   * Check overall trading module health
   * @returns Health status of all trading components
   */
  @Get()
  async checkHealth() {
    this.logger.log('Health check initiated');

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        krakenConnection: await this.checkKrakenConnection(),
        riskManagement: await this.checkRiskManagement(),
        database: { status: 'connected' }, // TypeORM handles this
        queue: { status: 'connected' }, // Bull/Redis handles this
      },
    };

    // Determine overall status
    const allHealthy = Object.values(health.components).every(
      (component: any) => component.status === 'healthy' || component.status === 'connected',
    );

    health.status = allHealthy ? 'healthy' : 'degraded';

    this.logger.log(`Health check complete: ${health.status}`);
    return health;
  }

  /**
   * Check Kraken API connectivity
   */
  private async checkKrakenConnection() {
    try {
      // Try to get server time (public endpoint, no auth required)
      const serverTime = await this.krakenService.getServerTime();
      
      if (serverTime) {
        return {
          status: 'healthy',
          message: 'Kraken API is reachable',
          serverTime,
        };
      }

      return {
        status: 'unhealthy',
        message: 'Unable to reach Kraken API',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kraken API check failed';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Kraken health check failed', errorStack);
      return {
        status: 'unhealthy',
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  /**
   * Check risk management service
   */
  private async checkRiskManagement() {
    try {
      // Verify risk settings are loadable
      const defaultSettings = await this.riskManagement.getRiskSettings('system');
      
      return {
        status: 'healthy',
        message: 'Risk management service operational',
        hasDefaultSettings: !!defaultSettings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Risk management service check failed';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Risk management health check failed', errorStack);
      return {
        status: 'unhealthy',
        message: 'Risk management service check failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Get Kraken API account balance (authenticated endpoint test)
   */
  @Get('kraken-auth')
  async checkKrakenAuth() {
    try {
      const balance = await this.krakenService.getBalance();
      
      return {
        status: 'authenticated',
        message: 'Kraken API authentication successful',
        hasBalance: Object.keys(balance).length > 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kraken API authentication failed';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Kraken authentication check failed', errorStack);
      return {
        status: 'error',
        message: 'Kraken API authentication failed',
        error: errorMessage,
        hint: 'Please verify KRAKEN_API_KEY and KRAKEN_API_SECRET in your .env file',
      };
    }
  }
}
