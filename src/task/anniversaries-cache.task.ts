import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AnniversaryService } from '../anniversaries/anniversary.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Anniversary } from '../anniversaries/anniversary.entity';


@Injectable()
export class AnniversaryCacheTask {
  private readonly logger = new Logger(AnniversaryCacheTask.name);

  constructor(
    private readonly anniversaryService: AnniversaryService, // 第一个参数
    private readonly redisService: RedisService,             // 第二个参数
  ) {}

  /**
   * 每天凌晨 00:01 执行，缓存所有用户的纪念日数据
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cacheAllAnniversaries() {
    this.logger.log('开始执行纪念日缓存任务...');

    try {
      // 获取所有纪念日数据
      const allAnniversaries = await this.anniversaryService.findAll();

      // 按用户分组
      const anniversariesByUser = this.groupByUser(allAnniversaries);

      // 缓存到 Redis
      for (const [userId, anniversaries] of Object.entries(anniversariesByUser)) {
        const cacheKey = `anniversaries:user:${userId}`;
        await this.redisService.set(cacheKey, anniversaries, 86400); // 缓存24小时
        this.logger.log(`用户 ${userId} 的纪念日数据已缓存，共 ${anniversaries.length} 条`);
      }

      // 缓存全局统计数据
      await this.cacheGlobalStats(allAnniversaries);

      this.logger.log('纪念日缓存任务执行完成');
    } catch (error) {
      this.logger.error('纪念日缓存任务执行失败:', error);
    }
  }

  /**
   * 每小时执行一次，更新即将到来的纪念日
   */
  @Cron('0 * * * *')
  async updateUpcomingAnniversaries() {
    this.logger.log('开始更新即将到来的纪念日...');

    try {
      const allAnniversaries = await this.anniversaryService.findAll();
      const upcomingAnniversaries = this.getUpcomingAnniversaries(allAnniversaries);

      // 缓存即将到来的纪念日
      await this.redisService.set('anniversaries:upcoming', upcomingAnniversaries, 3600); // 缓存1小时

      this.logger.log(`已更新即将到来的纪念日，共 ${upcomingAnniversaries.length} 条`);
    } catch (error) {
      this.logger.error('更新即将到来的纪念日失败:', error);
    }
  }

  /**
   * 手动刷新缓存
   */
  async refreshCache() {
    this.logger.log('手动刷新纪念日缓存...');
    await this.cacheAllAnniversaries();
  }

  /**
   * 清除指定用户的缓存
   */
  async clearUserCache(userId: string) {
    const cacheKey = `anniversaries:user:${userId}`;
    await this.redisService.del(cacheKey);
    this.logger.log(`已清除用户 ${userId} 的纪念日缓存`);
  }

  /**
   * 按用户分组纪念日数据
   */
  private groupByUser(anniversaries: Anniversary[]): Record<string, Anniversary[]> {
    const grouped: Record<string, Anniversary[]> = {};

    for (const anniversary of anniversaries) {
      const userId = anniversary.user_id as string;
      if (!grouped[userId]) {
        grouped[userId] = [];
      }
      grouped[userId].push(anniversary);
    }

    return grouped;
  }

  /**
   * 获取即将到来的纪念日（未来30天内）
   */
  private getUpcomingAnniversaries(anniversaries: Anniversary[]): Anniversary[] {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return anniversaries.filter(anniversary => {
      const anniversaryDate = new Date(anniversary.date);
      const nextAnniversary = this.getNextAnniversaryDate(anniversaryDate);

      return nextAnniversary >= now && nextAnniversary <= thirtyDaysLater;
    });
  }

  /**
   * 获取下一个纪念日日期
   */
  private getNextAnniversaryDate(anniversaryDate: Date): Date {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 今年的纪念日
    const thisYearAnniversary = new Date(anniversaryDate);
    thisYearAnniversary.setFullYear(currentYear);

    // 如果今年的纪念日已经过了，计算明年的
    if (thisYearAnniversary < now) {
      thisYearAnniversary.setFullYear(currentYear + 1);
    }

    return thisYearAnniversary;
  }

  /**
   * 缓存全局统计数据
   */
  private async cacheGlobalStats(anniversaries: Anniversary[]) {
    const stats = {
      total: anniversaries.length,
      byType: this.countByType(anniversaries),
      byMonth: this.countByMonth(anniversaries),
      upcoming: this.getUpcomingAnniversaries(anniversaries).length,
    };

    await this.redisService.set('anniversaries:stats', stats, 86400);
  }

  /**
   * 按类型统计
   */
  private countByType(anniversaries: Anniversary[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const anniversary of anniversaries) {
      const type = anniversary.type;
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }

  /**
   * 按月份统计
   */
  private countByMonth(anniversaries: Anniversary[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const anniversary of anniversaries) {
      const date = new Date(anniversary.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts[month] = (counts[month] || 0) + 1;
    }
    return counts;
  }

  // /**
  //  * 每5分钟执行一次，测试用
  //  */
  // @Cron('0 */5 * * * *') // 每5分钟的第0秒执行
  // async testCacheTask() {
  //   this.logger.log('【测试】每5分钟执行一次的定时任务触发！');
  //   console.log('【测试】当前时间：', new Date().toISOString());
  //   // 你可以调用实际业务逻辑
  //   // await this.cacheAllAnniversaries();
  // }

  // @Cron('0 * * * * *') // 每分钟统计一次
  // async countOnlineUsers() {
  //   // 获取所有在线用户的 key
  //   const keys = await this.redisService.keys('online:user:*');
  //   const onlineCount = keys.length;
  //   console.log('当前在线用户数:', onlineCount);
  //   this.logger.log(`当前在线用户数: ${onlineCount}`);
  // }
}