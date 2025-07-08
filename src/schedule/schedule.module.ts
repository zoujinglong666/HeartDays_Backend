// src/schedule/schedule.module.ts
import { Module } from '@nestjs/common';
import { AnniversaryModule } from '../anniversaries/anniversary.module';
import { RedisModule } from '../redis/redis.module';
import { AnniversaryCacheTask } from '../task/anniversaries-cache.task';

@Module({
  imports: [AnniversaryModule, RedisModule],
  providers: [AnniversaryCacheTask],
  exports: [AnniversaryCacheTask], // 只导出本模块的 provider
})
export class ScheduleModule {}