import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: any) {
    // 验证会话是否有效
    const sessionToken = payload.sessionToken;
    if (!sessionToken) {
      throw new BusinessException(ErrorCode.NOT_LOGIN, '无效的会话令牌');
    }

    // 验证会话是否在Redis中存在且有效
    const isValidSession = await this.authService.validateSession(
      payload.sub,
      sessionToken,
    );

    if (!isValidSession) {
      throw new BusinessException(
        ErrorCode.NOT_LOGIN,
        '会话已失效，请重新登录',
      );
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      sessionToken,
    };
  }
}
 