import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { SessionService } from '../auth/session.service';

@Injectable()
export class TokenCleanupTask {
  private readonly logger = new Logger(TokenCleanupTask.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly sessionService: SessionService,
  ) {}

  @Cron('0 0 * * * *') // 每小时执行一次
  async cleanupTokens() {
    this.logger.log('⏰ Token cleanup task started');

    try {
      const userKeys = await this.redisService.keys('session:*');
      const userIds = userKeys.map(key => key.split(':')[1]);
      this.logger.log(`🔍 Found ${userIds.length} user sessions`);

      for (const userId of userIds) {
        try {
          await this.ensureSingleSession(userId);
        } catch (e) {
          this.logger.error(`⚠️ Error while cleaning session for user ${userId}`, e);
        }
      }

      await this.cleanupOrphanedTokens();
    } catch (e) {
      this.logger.error('❌ Token cleanup task failed', e);
    }

    this.logger.log('✅ Token cleanup task finished');
  }

  private async ensureSingleSession(userId: string) {
    const session = await this.sessionService.getUserSession(userId);
    if (!session) {
      this.logger.warn(`🚫 No active session found for user ${userId}`);
      return;
    }

    const userRefreshKeys = await this.redisService.keys(`user_refresh_token:${userId}:*`);
    this.logger.log(`🧹 Cleaning refresh tokens for user ${userId}, total: ${userRefreshKeys.length}`);

    let deletedCount = 0;
    for (const key of userRefreshKeys) {
      const refreshToken = key.split(':')[2];
      if (refreshToken !== session.refreshToken) {
        await this.redisService.del(`refresh_token:${refreshToken}`);
        await this.redisService.del(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`🗑️ Removed ${deletedCount} stale refresh tokens for user ${userId}`);
    }
  }

  private async cleanupOrphanedTokens() {
    this.logger.log('🧼 Cleaning orphaned access tokens...');

    const tokenKeys = await this.redisService.keys('token:*');
    let removed = 0;

    for (const key of tokenKeys) {
      const sessionToken = key.split(':')[1];
      const tokenData = await this.redisService.getJson(key);

      const isValid = tokenData && await this.sessionService.validateSessionToken(sessionToken);
      if (!isValid) {
        await this.redisService.del(key);
        removed++;
      }
    }

    this.logger.log(`🗑️ Removed ${removed} invalid access tokens`);

    this.logger.log('🧼 Cleaning orphaned refresh tokens...');

    const refreshTokenKeys = await this.redisService.keys('refresh_token:*');
    removed = 0;

    for (const key of refreshTokenKeys) {
      const refreshToken = key.split(':')[1];
      const tokenData = await this.redisService.getJson(key);

      const isValid = tokenData && await this.sessionService.validateRefreshToken(refreshToken);
      if (!isValid) {
        await this.redisService.del(key);
        removed++;
      }
    }

    this.logger.log(`🗑️ Removed ${removed} invalid refresh tokens`);
  }
}
