import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  BusinessException,
  ErrorCode,
} from '../../common/exceptions/business.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // 没有角色要求，直接通过
    }
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '用户信息不存在');
    }
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new BusinessException(
        ErrorCode.NO_AUTH,
        '权限不足，需要管理员权限',
      );
    }

    return true;
  }
}
