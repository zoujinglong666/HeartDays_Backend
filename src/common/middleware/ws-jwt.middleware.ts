import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { BusinessException, ErrorCode } from '../exceptions/business.exception';

@Injectable()
export class WsJwtMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(socket: Socket, next: (err?: Error) => void) {
    try {
      let token: string | undefined;

      // 从 headers 获取
      const auth = socket.handshake.headers.authorization as string;
      if (auth?.startsWith('Bearer ')) {
        token = auth.slice(7);
      }

      // 从 query 获取
      if (!token && socket.handshake.query?.token) {
        token = socket.handshake.query.token as string;
      }

      if (!token) {
        return next(new Error('Missing token'));
      }

      const payload = await this.jwtService.verifyAsync(token);
      socket.data.user = payload;
      return next(); // 验证通过
    } catch (err) {
      console.error('WebSocket JWT 校验失败:', err);
      return next(new Error('Invalid or expired token'));
    }
  }
}
