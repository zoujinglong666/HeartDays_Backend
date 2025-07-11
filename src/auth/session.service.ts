import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { randomUUID } from 'node:crypto';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * 生成会话令牌
   */
  generateSessionToken(): string {
    return randomUUID();
  }

  /**
   * 生成更安全的刷新令牌
   */
  // generateRefreshToken(): string {
  //   return randomBytes(64).toString('hex'); // 128位16进制字符串
  // }
  generateRefreshToken(): string {
    return randomUUID();
  }

  /**
   * 存储用户会话信息，并保证每个用户只保留一个refresh_token
   * 绑定UA、deviceId、deviceInfo
   */
  async storeUserSession(
    userId: string,
    sessionToken: string,
    refreshToken: string,
    deviceInfo?: any,
    ua?: string,
  ): Promise<void> {
    const sessionKey = `session:${userId}`;
    const tokenKey = `token:${sessionToken}`;
    const refreshTokenKey = `refresh_token:${refreshToken}`;
    const userRefreshKey = `user_refresh_token:${userId}`;
    const accessTokenTTL = 2 * 60 * 60; // 2 hours
    const refreshTokenTTL = 7 * 24 * 60 * 60; // 7 days
    // 1. 查找并删除旧的refresh_token
    const oldRefreshToken = await this.redisService.get(userRefreshKey);
    if (oldRefreshToken) {
      await this.redisService.del(`refresh_token:${oldRefreshToken}`);
    }

    // 2. 存储新refresh_token，绑定UA、deviceId、deviceInfo
    await this.redisService.set(
      refreshTokenKey,
      {
        userId,
        sessionToken,
        refreshToken,
        deviceInfo,
        deviceId: deviceInfo?.deviceId,
        ua,
        createdAt: new Date().toISOString(),
      },
      refreshTokenTTL,
    ); // 7天过期

    // 3. 更新user_refresh_token映射
    await this.redisService.set(userRefreshKey, refreshToken, refreshTokenTTL);

    // 4. 存储会话信息
    await this.redisService.set(
      sessionKey,
      {
        sessionToken,
        refreshToken,
        deviceInfo,
        deviceId: deviceInfo?.deviceId,
        ua,
        createdAt: new Date().toISOString(),
      },
      refreshTokenTTL,
    ); // 7天过期（刷新token有效期）

    // 5. 存储令牌到用户ID的映射
    await this.redisService.set(
      tokenKey,
      {
        userId,
        sessionToken,
        refreshToken,
      },
      accessTokenTTL,
    ); // 2小时过期（access token有效期）
  }

  /**
   * 校验刷新频率限制（每分钟最多3次）
   * 超过则返回false，否则返回true
   */
  async checkRefreshLimit(userId: string): Promise<boolean> {
    const key = `refresh_limit:${userId}`;
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, 60); // 1分钟
    }
    return count <= 3;
  }

  /**
   * 验证刷新令牌，并只校验UA或deviceId
   */
  async validateRefreshToken(
    refreshToken: string,
    ua?: string,
    deviceId?: string,
  ): Promise<any> {
    // KEY: refresh_token:${refreshToken} 过长
    const refreshTokenKey = `refresh_token:${refreshToken}`;
    const data = await this.redisService.get(refreshTokenKey);
    if (!data) return null;
    // 优先校验deviceId
    console.log('校验刷新令牌', data, ua, deviceId);
    if (deviceId && data.deviceId && deviceId !== data.deviceId) {
      return null;
    }
    // 没有deviceId时校验UA
    if (!deviceId && ua && data.ua && ua !== data.ua) {
      return null;
    }
    return data;
  }

  /**
   * 获取用户当前会话
   */
  async getUserSession(userId: string): Promise<any> {
    const sessionKey = `session:${userId}`;
    return await this.redisService.get(sessionKey);
  }

  /**
   * 验证会话令牌
   */
  async validateSessionToken(sessionToken: string): Promise<any> {
    const tokenKey = `token:${sessionToken}`;
    return await this.redisService.get(tokenKey);
  }

  /**
   * 使会话失效（登出）
   */
  async invalidateSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;
    const session = await this.redisService.get(sessionKey);
    if (session) {
      // 删除令牌映射
      const tokenKey = `token:${session.sessionToken}`;
      const refreshTokenKey = `refresh_token:${session.refreshToken}`;
      const userRefreshKey = `user_refresh_token:${userId}`;
      const onlineUserKey = `online:user:${userId}`;
      await this.redisService.del(tokenKey);
      await this.redisService.del(refreshTokenKey);
      await this.redisService.del(userRefreshKey);
      await this.redisService.srem('online:users', userId);
      await this.redisService.del(onlineUserKey);
    }
    // 删除会话信息
    await this.redisService.del(sessionKey);
  }

  /**
   * 强制用户在其他设备登出（单设备登录）
   */
  async forceLogoutOtherDevices(
    userId: string,
    currentSessionToken: string,
  ): Promise<void> {
    const sessionKey = `session:${userId}`;
    const currentSession = await this.redisService.get(sessionKey);
    // 如果存在其他会话，使其失效
    if (currentSession && currentSession.sessionToken !== currentSessionToken) {
      const oldTokenKey = `token:${currentSession.sessionToken}`;
      const oldRefreshTokenKey = `refresh_token:${currentSession.refreshToken}`;
      const userRefreshKey = `user_refresh_token:${userId}`;
      await this.redisService.del(oldTokenKey);
      await this.redisService.del(oldRefreshTokenKey);
      await this.redisService.del(userRefreshKey);
    }
  }

  /**
   * 检查用户是否在其他设备登录
   */
  async isUserLoggedInElsewhere(
    userId: string,
    currentSessionToken: string,
  ): Promise<boolean> {
    const session = await this.getUserSession(userId);
    return session && session.sessionToken !== currentSessionToken;
  }
}
