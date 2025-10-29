import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebSocketGatewayService } from '../websocket.gateway';

/**
 * WebSocket Module Health Check Controller
 * Provides endpoints to monitor WebSocket gateway status and connections
 */
@ApiTags('health')
@Controller('health/websocket')
export class WebSocketHealthController {
  constructor(
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'WebSocket health check' })
  @ApiResponse({ status: 200, description: 'WebSocket module is healthy' })
  getHealth() {
    const stats = this.wsGateway.getStats();
    
    return {
      status: 'ok',
      module: 'WebSocketModule',
      connectedClients: stats.connectedClients,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get WebSocket connection statistics' })
  @ApiResponse({ status: 200, description: 'WebSocket connection statistics' })
  getStats() {
    return this.wsGateway.getStats();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check if WebSocket is ready to accept connections' })
  @ApiResponse({ status: 200, description: 'WebSocket readiness status' })
  getReady() {
    const stats = this.wsGateway.getStats();
    
    return {
      ready: true,
      message: 'WebSocket gateway is ready',
      connectedClients: stats.connectedClients,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for WebSocket gateway' })
  @ApiResponse({ status: 200, description: 'WebSocket is alive' })
  getLive() {
    return {
      alive: true,
      module: 'WebSocketModule',
      timestamp: new Date().toISOString(),
    };
  }
}
