import {
  Controller,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 创建会话
  @Post('session')
  async createSession(@Body() dto: CreateChatSessionDto) {
    return this.chatService.createSession(dto);
  }

  // 获取指定会话信息
  @Get('session/:id')
  async getSessionById(@Param('id') sessionId: string) {
    return this.chatService.getSessionById(sessionId);
  }

  // 发送消息
  @Post('message')
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    return this.chatService.sendMessage(dto, req.user.userId);
  }

  // 获取会话消息（分页）
  @Get('session/:id/messages') // 更符合 RESTful 风格
  async getSessionMessages(
    @Param('id') sessionId: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Request() req,
  ) {
    return this.chatService.getSessionMessages(
      sessionId,
      limit,
      offset,
      req.user.userId,
    );
  }

  // 获取聊天会话列表（分页、置顶、免打扰）
  @Get('session-list')
  async getSessionList(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return this.chatService.getUserSessions(
      req.user.userId,
      Number(page),
      Number(pageSize),
    );
  }

  // 群聊管理
  @Post('group/:id/update')
  async updateGroup(
    @Param('id') sessionId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.chatService.updateGroup(sessionId, dto);
  }

  @Post('group/:id/leave')
  async leaveGroup(@Param('id') sessionId: string, @Request() req) {
    return this.chatService.leaveGroup(sessionId, req.user.userId);
  }

  // 消息撤回
  @Post('message/:id/withdraw')
  async withdrawMessage(@Param('id') messageId: string, @Request() req) {
    return this.chatService.withdrawMessage(messageId, req.user.userId);
  }

  // 标记消息已读
  @Post('message/:id/read')
  async markMessageRead(@Param('id') messageId: string) {
    return this.chatService.markMessageRead(messageId);
  }

  // 置顶/免打扰设置
  @Post('session/:id/setting')
  async setSessionSetting(
    @Param('id') sessionId: string,
    @Body() body: { isPinned?: boolean; isMuted?: boolean },
  ) {
    return this.chatService.setSessionSetting(sessionId, body);
  }

  @Get('session/:id/setting')
  async getSessionSetting(@Param('id') sessionId: string) {
    return this.chatService.getSessionSetting(sessionId);
  }
}
