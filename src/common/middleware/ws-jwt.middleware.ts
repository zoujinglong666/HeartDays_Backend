import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(socket: Socket, next: (err?: any) => void) {
    try {
      let token: string | undefined;
      // 1. 从 header 获取
      if (socket.handshake.headers.authorization) {
        const auth = socket.handshake.headers.authorization as string;
        if (auth.startsWith('Bearer ')) {
          token = auth.slice(7);
        }
      }
      // 2. 从 query 获取
      if (!token && socket.handshake.query && socket.handshake.query.token) {
        token = socket.handshake.query.token as string;
      }
      if (!token) throw new UnauthorizedException('No token provided');

      // 3. 校验 token
      const payload = await this.jwtService.verifyAsync(token);

      console.log('WebSocket JWT 校验成功:', payload);

      socket.data.user = payload;
      next();
    } catch (err) {
      console.error('WebSocket JWT 校验失败:', err);
      next(new UnauthorizedException('Invalid token ${token}'));
    }
  }
}