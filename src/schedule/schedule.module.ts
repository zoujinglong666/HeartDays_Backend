// src/schedule/schedule.module.ts
import { Module } from '@nestjs/common';
import { AnniversaryModule } from '../anniversaries/anniversary.module';
import { RedisModule } from '../redis/redis.module';
import { TodoModule } from '../todo/todo.module';
import { NotificationModule } from '../notification/notification.module';
import { AnniversaryCacheTask } from '../task/anniversaries-cache.task';
import { TodoReminderTask } from '../task/todo-reminder.task';

@Module({
  imports: [AnniversaryModule, RedisModule, TodoModule, NotificationModule],
  providers: [AnniversaryCacheTask, TodoReminderTask],
  exports: [AnniversaryCacheTask, TodoReminderTask], // 只导出本模块的 provider
})
export class ScheduleModule {}