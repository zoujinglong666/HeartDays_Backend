import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { LoginDto } from '../user/dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { SessionService } from './session.service';
import { RefreshTokenDto, TokenResponseDto } from './dto/refresh-token.dto';
import { Request } from 'express';
import { SimpleEncryptor } from '../common/utils/simpleEncryptor.utils';
import { BusinessException, CommonResultCode } from '../common/exceptions/business.exception';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

  async validateUser(account: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: [{ userAccount: account, isActive: true }],
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(
    loginDto: LoginDto,
    deviceInfo?: any,
    req?: Request,
  ): Promise<TokenResponseDto> {
    const { userAccount, password } = loginDto;

    // 确保提供了账号或邮箱
    if (!userAccount) {
      throw new BusinessException(CommonResultCode.PARAMS_ERROR, '请输入账号或邮箱');
    }
    const decryptedPassword = SimpleEncryptor.decrypt(password, 'mySecret');
    const user = await this.validateUser(userAccount, decryptedPassword);
    if (!user) {
      throw new BusinessException(CommonResultCode.PARAMS_ERROR,'账号或密码错误');
    }

    // 生成会话令牌和刷新令牌
    const sessionToken = this.sessionService.generateSessionToken();
    const refreshToken = this.sessionService.generateRefreshToken();

    // 强制其他设备登出（单设备登录）
    await this.sessionService.forceLogoutOtherDevices(user.id, sessionToken);

    // 存储新会话
    const ua = req?.headers['user-agent'] || '';
    await this.sessionService.storeUserSession(
      user.id,
      sessionToken,
      refreshToken,
      deviceInfo,
      ua,
    );
    // 生成访问令牌，包含会话令牌
    const payload = {
      email: user.email,
      userAccount: user.userAccount,
      sub: user.id,
      roles: user.roles,
      avatar: user.avatar,
      name: user.name,
      sessionToken, // 添加会话令牌到JWT
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      session_token: sessionToken,
      expires_in: 2 * 60 * 60, // 2小时
      refresh_expires_in: 7 * 24 * 60 * 60, // 7天
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    if (
      !registerUserDto.userAccount ||
      !registerUserDto.password ||
      !registerUserDto.confirmPassword
    ) {
      throw new UnauthorizedException('请填写完整的注册信息');
    }
    if (!registerUserDto.email) {
      throw new UnauthorizedException('请填写邮箱');
    }
    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerUserDto.email)) {
      throw new UnauthorizedException('邮箱格式不正确');
    }

    // 判断密码 和确认密码是否一致
    if (registerUserDto.password !== registerUserDto.confirmPassword) {
      throw new UnauthorizedException('密码和确认密码不一致');
    }
    // 检查账号是否已存在
    const existingUserByAccount = await this.userRepository.findOne({
      where: { userAccount: registerUserDto.userAccount },
    });

    if (existingUserByAccount) {
      throw new UnauthorizedException('账号已存在');
    }
    // 新增：检查邮箱是否已存在
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: registerUserDto.email },
    });
    if (existingUserByEmail) {
      throw new UnauthorizedException('邮箱已被注册');
    }
    // 加密密码
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

    // 创建用户
    const user = this.userRepository.create({
      ...registerUserDto,
      name: '无名',
      roles: ['user'],
      password: hashedPassword,
    });
    return await this.userRepository.save(user);
    // 返回登录信息
  }

  /**
   * 用户登出
   */
  async logout(userId: string): Promise<void> {
    await this.sessionService.invalidateSession(userId);
  }

  /**
   * 验证会话是否有效
   */
  async validateSession(
    userId: string,
    sessionToken: string,
  ): Promise<boolean> {
    const session = await this.sessionService.getUserSession(userId);
    return session && session.sessionToken === sessionToken;
  }

  /**
   * 获取用户会话信息
   */
  async getUserSession(userId: string): Promise<any> {
    return await this.sessionService.getUserSession(userId);
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    req?: Request,
  ): Promise<TokenResponseDto> {
    const { refresh_token } = refreshTokenDto;
    if (!refresh_token) {
      throw new UnauthorizedException('刷新令牌不存在');
    }
    const ua = req?.headers['user-agent'] || '';
    // deviceId 从前端 deviceInfo 里获取，假设前端每次都带上
    const deviceId = req?.body?.deviceId || undefined;
    // 刷新频率限制
    const refreshInfo = await this.sessionService.validateRefreshToken(
      refresh_token,
      ua,
      deviceId,
    );
    if (!refreshInfo) {
      throw new UnauthorizedException('刷新令牌无效、已过期或设备环境不一致');
    }
    const canRefresh = await this.sessionService.checkRefreshLimit(
      refreshInfo.userId,
    );
    console.log('刷新频率限制', canRefresh);
    if (!canRefresh) {
      throw new UnauthorizedException('刷新操作过于频繁，请稍后再试');
    }

    // 获取用户信息
    const user = await this.userRepository.findOne({
      where: { id: String(refreshInfo.userId), isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // 生成新的会话令牌和刷新令牌
    const newSessionToken = this.sessionService.generateSessionToken();
    const newRefreshToken = this.sessionService.generateRefreshToken();

    // 获取当前会话的设备信息
    const currentSession = await this.sessionService.getUserSession(
      refreshInfo.userId,
    );
    const deviceInfo = currentSession?.deviceInfo;

    // 存储新会话
    await this.sessionService.storeUserSession(
      refreshInfo.userId,
      newSessionToken,
      newRefreshToken,
      deviceInfo,
      ua,
    );

    // 生成新的访问令牌
    const payload = {
      email: user.email,
      userAccount: user.userAccount,
      sub: user.id,
      roles: user.roles,
      avatar: user.avatar,
      name: user.name,
      sessionToken: newSessionToken,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      session_token: newSessionToken,
      expires_in: 2 * 60 * 60, // 2小时
      refresh_expires_in: 7 * 24 * 60 * 60, // 7天
    };
  }

  /**
   * 获取用户信息（用于登录响应）
   */
  async getUserInfo(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('用户Id不存在');
    }
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      name: user.name,
      userAccount: user.userAccount,
      email: user.email,
      roles: user.roles,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      gender: user.gender,
    };
  }

  /**
   * 从访问令牌中获取用户ID
   */
  getUserIdFromToken(accessToken: string): string {
    const payload = this.jwtService.decode(accessToken) as any;
    return payload.sub;
  }
}
