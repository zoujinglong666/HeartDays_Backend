import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { requestContext } from '../../common/context/request-context';
import { RedisService } from '../../redis/redis.service';
import { SessionService } from '../session.service';
// 该代码实现了一个基于 JWT 的守卫（AuthGuard），用于验证用户身份。功能如下：
//
// 1. **判断是否为公开接口**：通过 `@Public()` 装饰器标记的接口无需认证。
// 2. **提取请求头中的 Token**：从 `Authorization` 头中提取 Bearer 类型的 token。
// 3. **验证 Token 合法性**：使用 `jwtService.verifyAsync` 验证 token 是否有效。
// 4. **设置用户信息或抛出异常**：token 有效则将解析出的用户信息挂载到 `request['user']`，否则抛出未授权异常。
//
// 若通过验证则返回 `true`，允许访问控制器方法；否则阻止访问。
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private redisService: RedisService,
    private sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否是公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌，请先登录');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // 验证会话是否有效
      const sessionToken = payload.sessionToken;
      if (!sessionToken) {
        throw new UnauthorizedException('无效的会话令牌');
      }

      // 验证会话是否在Redis中存在且有效
      const sessionInfo = await this.sessionService.validateSessionToken(sessionToken);
      if (!sessionInfo || sessionInfo.userId !== payload.sub) {
        throw new UnauthorizedException('会话已失效，请重新登录');
      }

      // 存储到 AsyncLocalStorage
      request['user'] = payload;
      console.log(`User authenticated: ${JSON.stringify(payload)}`);

      const userId = request.user?.sub || request.user?.id || '';
      if (userId) {
        await this.redisService.set(`online:user:${userId}`, '1', 60 * 10); // 10分钟过期
      }
      requestContext.getStore()!.user = request.user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('认证令牌无效或已过期，请重新登录');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
 