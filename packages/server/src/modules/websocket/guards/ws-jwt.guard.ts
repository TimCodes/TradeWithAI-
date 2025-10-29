import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

/**
 * WebSocket JWT Authentication Guard
 * 
 * Validates JWT tokens for WebSocket connections.
 * Extracts and verifies the token from the socket handshake.
 * 
 * Usage:
 * @UseGuards(WsJwtGuard)
 * @SubscribeMessage('some-event')
 * handleEvent() { ... }
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: AuthenticatedSocket = context.switchToWs().getClient();
      
      // Check if socket was already authenticated during connection
      if (client.userId) {
        return true;
      }

      // Extract token from handshake
      const token = 
        client.handshake.auth?.token || 
        client.handshake.query?.token;

      if (!token) {
        // Allow in development mode
        if (process.env.NODE_ENV === 'development') {
          this.logger.warn('Development mode: Allowing access without token');
          client.userId = 'test-user-id';
          client.email = 'test@example.com';
          return true;
        }
        
        throw new WsException('Authentication token missing');
      }

      // Verify token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      });

      // Attach user info to socket
      client.userId = payload.sub || payload.userId;
      client.email = payload.email;

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.logger.error(`WebSocket authentication failed: ${errorMessage}`);
      throw new WsException('Unauthorized');
    }
  }
}
