// src/friendship/friendship.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './friendship.entity';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Friendship]), NotificationModule],
  providers: [FriendshipService],
  controllers: [FriendshipController],
  exports: [FriendshipService, TypeOrmModule],
})
export class FriendshipModule {}