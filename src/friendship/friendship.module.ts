// src/friendship/friendship.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship } from './friendship.entity';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { User } from '../user/user.entity';
import { ChatSession } from '../chat/entities/chat-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friendship, User,ChatSession]), // 这里加上 User
    forwardRef(() => UserModule),
    NotificationModule,
  ],
  providers: [FriendshipService],
  controllers: [FriendshipController],
  exports: [FriendshipService, TypeOrmModule],
})
export class FriendshipModule {}