import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket Exception Filter
 * 
 * Catches and handles WebSocket exceptions gracefully.
 * Sends formatted error messages to the client instead of disconnecting.
 * 
 * Error format sent to client:
 * {
 *   event: 'error',
 *   error: {
 *     message: string,
 *     code: string,
 *     timestamp: string
 *   }
 * }
 */
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client: Socket = host.switchToWs().getClient();
    
    // Determine error details
    let errorMessage = 'An error occurred';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof WsException) {
      const error = exception.getError();
      errorMessage = typeof error === 'string' ? error : (error as any).message || errorMessage;
      errorCode = 'WS_EXCEPTION';
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorCode = exception.name;
    }

    // Log the error
    this.logger.error(
      `WebSocket error for client ${client.id}: ${errorMessage}`,
      exception instanceof Error ? exception.stack : undefined
    );

    // Send error to client
    client.emit('error', {
      message: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    });

    // Call parent filter to handle any cleanup
    // Note: Commenting this out to prevent disconnection
    // super.catch(exception, host);
  }
}
