import { HttpStatus, Injectable } from '@nestjs/common';
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
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';

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
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '请输入账号或邮箱');
    }
    try{
      const decryptedPassword = SimpleEncryptor.decrypt(password, 'HeartDays0625');
      const user = await this.validateUser(userAccount, decryptedPassword);
      if (!user) {
        throw new BusinessException(ErrorCode.PARAMS_ERROR, '账号或密码错误');
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
      const accessToken = this.generateToken(user, sessionToken);
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        session_token: sessionToken,
        expires_in: 2 * 60 * 60, // 2小时
        refresh_expires_in: 7 * 24 * 60 * 60, // 7天
      };
    }catch(e){
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '账号或密码错误');
    }




  }

  generateToken(user: User, sessionToken: string) {
    const payload = {
      userAccount: user.userAccount,
      sub: user.id,
      roles: user.roles,
      sessionToken,
    };
    return this.jwtService.sign(payload);
  }

  async register(registerUserDto: RegisterUserDto) {
    if (
      !registerUserDto.userAccount ||
      !registerUserDto.password ||
      !registerUserDto.confirmPassword
    ) {
      throw new BusinessException(
        ErrorCode.PARAMS_ERROR,
        '请填写完整的注册信息',
      );
    }
    if (!registerUserDto.email) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '请填写邮箱');
    }
    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerUserDto.email)) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '邮箱格式不正确');
    }

    // 判断密码 和确认密码是否一致
    if (registerUserDto.password !== registerUserDto.confirmPassword) {
      throw new BusinessException(
        ErrorCode.PARAMS_ERROR,
        '密码和确认密码不一致',
      );
    }
    // 检查账号是否已存在
    const existingUserByAccount = await this.userRepository.findOne({
      where: { userAccount: registerUserDto.userAccount },
    });

    if (existingUserByAccount) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '账号已存在');
    }
    // 新增：检查邮箱是否已存在
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: registerUserDto.email },
    });
    if (existingUserByEmail) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '邮箱已被注册');
    }
    // 加密密码
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

    // 创建用户
    const randomCode = Math.random().toString(36).slice(2, 10); // 8位随机字母+数字
    const user = this.userRepository.create({
      ...registerUserDto,
      name: `user_${randomCode}`,
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
      throw new BusinessException(ErrorCode.NO_REFRESH_TOKEN, '刷新令牌不存在');
    }
    const ua = req?.headers['user-agent'] || '';
    const deviceId = req?.body?.deviceId || undefined;
    // 刷新频率限制
    const refreshInfo = await this.sessionService.validateRefreshToken(
      refresh_token,
      ua,
      deviceId,
    );
    if (!refreshInfo) {
      throw new BusinessException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        '刷新令牌无效或已过期',
        HttpStatus.UNAUTHORIZED, // 401
      );
    }
    const canRefresh = await this.sessionService.checkRefreshLimit(
      refreshInfo.userId,
    );
    if (!canRefresh) {


      throw new BusinessException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        '刷新操作过于频繁，请稍后再试',
        HttpStatus.UNAUTHORIZED, // 401
      );

    }

    // 获取用户信息
    const user = await this.userRepository.findOne({
      where: { id: String(refreshInfo.userId), isActive: true },
    });

    if (!user) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '用户不存在或已被禁用');
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
    const accessToken = this.generateToken(user, newSessionToken);
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
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '用户Id不存在');
    }
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '用户不存在或已被禁用');
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
