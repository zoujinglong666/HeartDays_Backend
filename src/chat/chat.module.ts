import { Module, Injectable } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatSessionMember } from './entities/chat-session-member.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageRead } from './entities/chat-message-read.entity';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

import { ChatSessionSetting } from './entities/chat-session-setting.entity';
import { ChatService } from './chat.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '../config/configuration';
import { FriendshipModule } from '../friendship/friendship.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatSession,
      ChatSessionMember,
      ChatMessage,
      ChatMessageRead,
      ChatSessionSetting,
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // 一定要使用配置方式
    AuthModule,
    FriendshipModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}