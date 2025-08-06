import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { SessionService } from '../session.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { requestContext } from '../../common/context/request-context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 公开接口直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new BusinessException(
        ErrorCode.TOKEN_MISSING,
        '未提供认证令牌，请先登录',
      );
    }

    try {
      // 2. 验证 JWT
      const payload = await this.jwtService.verifyAsync(token);

      // 3. 取出 sessionToken
      const sessionToken = payload.sessionToken;
      if (!sessionToken) {
        throw new BusinessException(
          ErrorCode.TOKEN_MISSING,
          '令牌缺少 sessionToken',
        );
      }

      // 4. 校验 Redis 会话
      const sessionInfo = await this.sessionService.validateSessionToken(sessionToken);
      if (!sessionInfo || String(sessionInfo.userId) !== String(payload.sub)) {
        throw new BusinessException(
          ErrorCode.NOT_LOGIN,
          '会话已失效，请重新登录',
        );
      }

      // 5. 挂载用户信息
      request['user'] = payload;

      // 6. 记录在线状态
      const userId = payload.sub || payload.id;
      if (userId) {
        await this.redisService.set(
          `online:user:${userId}`,
          '1',
          10 * 60, // 10 分钟
        );
      }

      // 7. 写入 AsyncLocalStorage
      const store = requestContext.getStore();
      if (store) store.user = payload;

      return true;
    } catch (error: any) {
      // 8. 精确异常分类
      if (error instanceof BusinessException) throw error;

      if (error.name === 'TokenExpiredError') {
        throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BusinessException(ErrorCode.TOKEN_INVALID);
      }

      throw new BusinessException(
        ErrorCode.NOT_LOGIN,
        '认证令牌无效或已过期，请重新登录',
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    return authHeader.substring(7);
  }
}