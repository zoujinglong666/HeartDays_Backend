import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatSessionMember } from './entities/chat-session-member.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageRead } from './entities/chat-message-read.entity';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { User } from '../user/user.entity';
import { ChatSessionSetting } from './entities/chat-session-setting.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatSessionMember)
    private memberRepo: Repository<ChatSessionMember>,
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatMessageRead)
    private readRepo: Repository<ChatMessageRead>,
    @InjectRepository(ChatSessionSetting)
    private sessionSettingRepo: Repository<ChatSessionSetting>,
  ) {}

  async createSession(dto: CreateChatSessionDto, creatorId: string) {
    const session = this.sessionRepo.create({
      type: dto.type,
      name: dto.name,
    });
    await this.sessionRepo.save(session);

    const userIds = Array.from(new Set([...dto.userIds, creatorId]));
    const members = userIds.map((userId) =>
      this.memberRepo.create({ sessionId: session.id, userId }),
    );
    await this.memberRepo.save(members);

    return session;
  }

  async sendMessage(dto: SendMessageDto, senderId: string) {
    const message = this.messageRepo.create({
      sessionId: dto.sessionId,
      senderId,
      content: dto.content,
      type: dto.type || 'text',
    });
    await this.messageRepo.save(message);
    return message;
  }

  async getSessionMessages(sessionId: string, limit = 20, offset = 0) {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async markMessageRead(messageId: string, userId: string) {
    const read = this.readRepo.create({ messageId, userId });
    await this.readRepo.save(read);
    return read;
  }

  async updateGroup(sessionId: string, dto: UpdateGroupDto) {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session || session.type !== 'group') throw new Error('群聊不存在');

    if (dto.name) {
      session.name = dto.name;
      await this.sessionRepo.save(session);
    }

    if (dto.addUserIds?.length) {
      const existMembers = await this.memberRepo.find({
        where: { sessionId, userId: In(dto.addUserIds) },
      });
      const existUserIds = existMembers.map((m) => m.userId);
      const toAdd = dto.addUserIds.filter((id) => !existUserIds.includes(id));
      if (toAdd.length) {
        const members = toAdd.map((userId) =>
          this.memberRepo.create({ sessionId, userId }),
        );
        await this.memberRepo.save(members);
      }
    }

    if (dto.removeUserIds?.length) {
      await this.memberRepo.delete({
        sessionId,
        userId: In(dto.removeUserIds),
      });
    }

    return session;
  }

  async leaveGroup(sessionId: string, userId: string) {
    await this.memberRepo.delete({ sessionId, userId });
    return { success: true };
  }

  async withdrawMessage(messageId: string, userId: string) {
    const message = await this.messageRepo.findOneBy({ id: messageId });
    if (!message) throw new Error('消息不存在');
    if (message.senderId !== userId) throw new Error('只能撤回自己发送的消息');
    message.status = 'withdraw';
    await this.messageRepo.save(message);
    return message;
  }

  /**
   * 获取用户的聊天会话列表
   */
  async getUserSessions(userId: string, page = 1, pageSize = 20) {
    // 1. 找到用户参与的所有会话
    console.log('getUserSessions');
    const memberSessions = await this.memberRepo.find({
      where: { userId },
      relations: ['session'],
    });
    const sessionIds = memberSessions.map((m) => m.sessionId);
    if (sessionIds.length === 0) return { total: 0, records: [], size: 0, current: 1, pages: 0, hasNext: false, hasPrev: false };

    // 2. 查询所有会话，按置顶排序、再按最新消息时间排序
    // 先查置顶信息
    const pinMap: Record<string, boolean> = {};
    const muteMap: Record<string, boolean> = {};
    // 假设有 chat_session_settings 表，见下文
    const settings = await this.sessionSettingRepo.find({
      where: { userId, sessionId: In(sessionIds) },
    });
    for (const s of settings) {
      pinMap[s.sessionId] = !!s.isPinned;
      muteMap[s.sessionId] = !!s.isMuted;
    }

    // 查最新消息时间
    const lastMsgTimesRaw = await this.messageRepo.query(
      `
          SELECT "sessionId", MAX("createdAt") as "lastTime"
          FROM chat_messages
          WHERE "sessionId" = ANY ($1)
          GROUP BY "sessionId"
      `,
      [sessionIds],
    );
    const lastMsgTimeMap = Object.fromEntries(
      lastMsgTimesRaw.map((row: any) => [row.sessionId, row.lastTime]),
    );

    // 排序：先置顶，再按最新消息时间倒序
    const sortedSessionIds = sessionIds.sort((a, b) => {
      if ((pinMap[b] ? 1 : 0) !== (pinMap[a] ? 1 : 0)) {
        return (pinMap[b] ? 1 : 0) - (pinMap[a] ? 1 : 0);
      }
      const tA = lastMsgTimeMap[a] ? new Date(lastMsgTimeMap[a]).getTime() : 0;
      const tB = lastMsgTimeMap[b] ? new Date(lastMsgTimeMap[b]).getTime() : 0;
      return tB - tA;
    });

    // 分页
    const total = sortedSessionIds.length;
    const pagedSessionIds = sortedSessionIds.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    // 后续和之前一样，查会话、消息、未读数、对方信息
    // 2. 查询所有会话
    const sessions = await this.sessionRepo.findBy({ id: In(pagedSessionIds) });

    // 3. 查询每个会话的最近一条消息
    // 用原生SQL或QueryBuilder实现每个会话最新消息
    const lastMessagesRaw = await this.messageRepo.query(
      `
          SELECT DISTINCT
          ON ("sessionId") *
          FROM chat_messages
          WHERE "sessionId" = ANY ($1)
          ORDER BY "sessionId", "createdAt" DESC
      `,
      [pagedSessionIds],
    );
    const lastMessages = Object.fromEntries(
      lastMessagesRaw.map((msg: any) => [msg.sessionId, msg]),
    );

    // 4. 查询未读数
    const unreadCountsRaw = await this.messageRepo.query(
      `
          SELECT m."sessionId", COUNT(m.id) AS unread
          FROM chat_messages m
                   LEFT JOIN chat_message_reads r
                             ON m.id = r."messageId" AND r."userId" = $2
          WHERE m."sessionId" = ANY ($1)
            AND r.id IS NULL
            AND m."senderId" != $2
          GROUP BY m."sessionId"
      `,
      [pagedSessionIds, userId],
    );
    const unreadCounts = Object.fromEntries(
      unreadCountsRaw.map((row: any) => [row.sessionId, Number(row.unread)]),
    );

    // 5. 单聊时查出对方信息
    const singleSessions = sessions.filter((s) => s.type === 'single');
    const singleSessionIds = singleSessions.map((s) => s.id);
    let singleSessionUserMap: Record<string, User> = {};
    if (singleSessionIds.length > 0) {
      // 查出每个单聊会话的所有成员
      const members = await this.memberRepo.find({
        where: { sessionId: In(singleSessionIds) },
        relations: ['user'],
      });
      // 只保留对方
      for (const m of members) {
        if (m.userId !== userId) {
          singleSessionUserMap[m.sessionId] = m.user;
        }
      }
    }

    // 6. 组装结果
    const records = sessions.map((session) => {
      const lastMsg = lastMessages[session.id];
      const unread = unreadCounts[session.id] || 0;
      let name = session.name;
      let avatar: string | undefined = undefined;
      if (session.type === 'single') {
        const other = singleSessionUserMap[session.id] as any;
        name = other?.nickname || other?.username || '对方';
        avatar = other?.avatar || undefined;
      }
      return {
        sessionId: session.id,
        type: session.type,
        name,
        avatar,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              type: lastMsg.type,
              createdAt: lastMsg.createdat || lastMsg.createdAt,
              senderId: lastMsg.senderid || lastMsg.senderId,
              status: lastMsg.status,
            }
          : null,
        unreadCount: unread,
        isPinned: !!pinMap[session.id],
        isMuted: !!muteMap[session.id],
      };
    });
    const obj = {
      total,
      size: pageSize,
      current: page,
      pages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
      records,
    };
    console.log(obj);
    return obj;
  }

  /**
   * 设置会话的置顶/免打扰
   */
  async setSessionSetting(
    userId: string,
    sessionId: string,
    { isPinned, isMuted }: { isPinned?: boolean; isMuted?: boolean },
  ) {
    let setting = await this.sessionSettingRepo.findOneBy({
      userId,
      sessionId,
    });
    if (!setting) {
      setting = this.sessionSettingRepo.create({ userId, sessionId });
    }
    if (typeof isPinned === 'boolean') setting.isPinned = isPinned;
    if (typeof isMuted === 'boolean') setting.isMuted = isMuted;
    await this.sessionSettingRepo.save(setting);
    return setting;
  }

  /**
   * 获取会话设置
   */
  async getSessionSetting(userId: string, sessionId: string) {
    return this.sessionSettingRepo.findOneBy({ userId, sessionId });
  }
}
