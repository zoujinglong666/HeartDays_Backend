import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TodoService } from '../todo/todo.service';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class TodoReminderTask {
  private readonly logger = new Logger(TodoReminderTask.name);

  constructor(
    private readonly todoService: TodoService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * 每分钟执行一次，检查即将到期的待办事项提醒
   */
  @Cron('* * * * *')
  async checkUpcomingReminders() {
    this.logger.log('开始检查即将到期的待办事项提醒...');

    try {
      // 获取即将到期的提醒（15分钟内）
      const upcomingReminders = await this.todoService.findUpcomingReminders();

      if (upcomingReminders.length > 0) {
        this.logger.log(`发现 ${upcomingReminders.length} 个即将到期的提醒`);

        // 为每个提醒发送通知
        for (const reminder of upcomingReminders) {
          const userId = reminder.user_id;
          const reminderTime = new Date(reminder.reminder_at).toLocaleString();

          // 发送WebSocket通知
          this.notificationGateway.server.to(`user_${userId}`).emit('todoReminder', {
            id: reminder.id,
            title: reminder.title,
            priority: reminder.priority,
            reminderTime,
            type: 'upcoming',
            message: `待办事项「${reminder.title}」即将到期，提醒时间：${reminderTime}`,
            time: new Date().toISOString(),
          });

          this.logger.log(`已向用户 ${userId} 发送待办事项提醒通知`);
        }
      }
    } catch (error) {
      this.logger.error('检查即将到期的待办事项提醒失败:', error);
    }
  }

  /**
   * 每5分钟执行一次，检查已过期的待办事项提醒
   */
  @Cron('*/5 * * * *')
  async checkDueReminders() {
    this.logger.log('开始检查已过期的待办事项提醒...');

    try {
      // 获取已过期的提醒
      const dueReminders = await this.todoService.findDueReminders();

      if (dueReminders.length > 0) {
        this.logger.log(`发现 ${dueReminders.length} 个已过期的提醒`);

        // 为每个提醒发送通知
        for (const reminder of dueReminders) {
          const userId = reminder.user_id;
          const reminderTime = new Date(reminder.reminder_at).toLocaleString();

          // 发送WebSocket通知
          this.notificationGateway.server.to(`user_${userId}`).emit('todoReminder', {
            id: reminder.id,
            title: reminder.title,
            priority: reminder.priority,
            reminderTime,
            type: 'due',
            message: `待办事项「${reminder.title}」已过期，提醒时间：${reminderTime}`,
            time: new Date().toISOString(),
          });

          this.logger.log(`已向用户 ${userId} 发送待办事项过期通知`);
        }
      }
    } catch (error) {
      this.logger.error('检查已过期的待办事项提醒失败:', error);
    }
  }
}