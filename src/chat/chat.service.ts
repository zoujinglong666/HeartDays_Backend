import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatSessionMember } from './entities/chat-session-member.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageRead } from './entities/chat-message-read.entity';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { User } from '../user/user.entity';
import { ChatSessionSetting } from './entities/chat-session-setting.entity';
import { getLoginUser } from '../common/context/request-context';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';
import { Friendship } from '../friendship/friendship.entity';
import { FriendshipService } from '../friendship/friendship.service';
import { ChatGateway } from './chat.gateway';

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
    private friendshipService: FriendshipService,
    private eventEmitter: EventEmitter2,
  ) {}

  getSessionMembers(sessionId: string) {
    return this.memberRepo.find({ where: { sessionId } });
  }

  async createSession(dto: CreateChatSessionDto) {
    const creatorId = getLoginUser().id;
    const userIds = Array.from(new Set([...dto.userIds, creatorId])).sort(); // 排序用于后续比较

    // 查找已有包含所有这些用户的会话
    const existingSessions = await this.sessionRepo
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.members', 'member')
      .where('member.userId IN (:...userIds)', { userIds })
      .getMany();

    for (const session of existingSessions) {
      const sessionMemberIds = session.members.map((m) => m.userId).sort();
      if (
        sessionMemberIds.length === userIds.length &&
        sessionMemberIds.every((id, idx) => id === userIds[idx])
      ) {
        return session; // 已存在完全相同成员的会话
      }
    }

    // 如果没有匹配的会话，则新建
    const session = this.sessionRepo.create({
      type: dto.type,
      name: dto.name,
    });
    await this.sessionRepo.save(session);

    const members = userIds.map((userId) =>
      this.memberRepo.create({ sessionId: session.id, userId }),
    );
    await this.memberRepo.save(members);

    // 手动补上成员，方便调用者使用
    (session as any).members = members;

    return session;
  }

  async sendMessage(dto: SendMessageDto, senderId: string) {
    const message = this.messageRepo.create({
      sessionId: dto.sessionId,
      senderId,
      content: dto.content,
      type: dto.type || 'text',
      receiverId: dto.receiverId, // 新增
    });
    await this.messageRepo.save(message);
    return message;
  }

  async getSessionMessages(
    sessionId: string,
    limit = 20,
    offset = 0,
    userId?: string,
  ) {
    const total = await this.messageRepo.count({
      where: {
        sessionId,
        status: Not('withdraw'), // 排除已撤回的消息
      },
    });

    // 计算倒序查询的偏移量
    // 例如：total=100，offset=0 => 查询倒数最新20条
    const realOffset = total - offset - limit;
    const safeOffset = realOffset < 0 ? 0 : realOffset;

    const records = await this.messageRepo.find({
      where: {
        sessionId: sessionId,
        status: Not('withdraw'), // 排除已撤回的消息
      },
      order: { createdAt: 'ASC' }, // 正序
      take: limit,
      skip: safeOffset,
    });

    let readMap: Record<string, boolean> = {};
    if (userId) {
      const messageIds = records.map((r) => r.id);
      if (messageIds.length > 0) {
        const reads = await this.readRepo.find({
          where: { messageId: In(messageIds), userId },
        });
        readMap = Object.fromEntries(reads.map((r) => [r.messageId, true]));
      }
    }

    const recordsWithRead = records.map((msg) => ({
      ...msg,
      isRead: readMap[msg.id],
    }));

    const current = Math.floor(offset / limit) + 1;
    const pages = Math.ceil(total / limit);

    return {
      total,
      size: limit,
      current,
      pages,
      hasNext: offset + limit < total,
      hasPrev: offset > 0,
      records: recordsWithRead,
    };
  }

  async markMessageRead(messageId: string) {
    const userId = getLoginUser().id;
    let read = await this.readRepo.findOne({ where: { messageId, userId } });
    if (read) {
      return read;
    }
    read = this.readRepo.create({ messageId, userId });
    await this.readRepo.save(read);
    return read;
  }

  async updateGroup(sessionId: string, dto: UpdateGroupDto) {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session || session.type !== 'group')
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '群聊不存在');

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

  async getOfflineMessages(userId: string, lastMessageTime?: Date) {
    // 获取用户参与的所有会话
    const memberships = await this.memberRepo.find({
      where: { userId },
    });

    const sessionIds = memberships.map((m) => m.sessionId);
    if (sessionIds.length === 0) return [];

    // 查询这些会话中用户未读的消息
    const queryBuilder = this.messageRepo
      .createQueryBuilder('message')
      .where('message.sessionId IN (:...sessionIds)', { sessionIds })
      .andWhere('message.senderId != :userId', { userId })
      .orderBy('message.createdAt', 'ASC');

    // 如果提供了最后消息时间，只获取该时间之后的消息
    if (lastMessageTime) {
      queryBuilder.andWhere('message.createdAt > :lastMessageTime', {
        lastMessageTime,
      });
    }

    const messages = await queryBuilder.getMany();

    // 标记这些消息为已读
    if (messages.length > 0) {
      const reads = messages.map((message) =>
        this.readRepo.create({ messageId: message.id, userId }),
      );
      await this.readRepo.save(reads);
    }

    return messages;
  }

  async withdrawMessage(messageId: string, userId: string) {
    return this.messageRepo.manager.transaction(
      async (transactionalManager) => {
        // 先查消息是否存在
        const message = await transactionalManager.findOneBy(ChatMessage, {
          id: messageId,
        });
        if (!message) {
          console.error(`尝试撤回不存在的消息，消息ID: ${messageId}`);
          throw new BusinessException(ErrorCode.NULL_ERROR, '消息不存在');
        }
        if (message.senderId !== userId) {
          console.error(
            `用户 ${userId} 尝试撤回他人消息，消息ID: ${messageId}`,
          );
          throw new BusinessException(
            ErrorCode.PARAMS_ERROR,
            '只能撤回自己发送的消息',
          );
        }

        // 检查消息是否在2分钟内发送的
        const now = new Date();
        const sentAt = new Date(message.createdAt);
        const timeDifference = now.getTime() - sentAt.getTime();
        const twoMinutes = 2 * 60 * 1000; // 2分钟的时间差

        if (timeDifference > twoMinutes) {
          console.error(
            `尝试撤回超时消息，消息ID: ${messageId}，发送时间: ${sentAt}`,
          );
          throw new BusinessException(
            ErrorCode.PARAMS_ERROR,
            '只能撤回2分钟内的消息',
          );
        }

        message.status = 'withdraw';
        await transactionalManager.save(message);

        // 通知所有会话成员消息已被撤回
        this.eventEmitter.emit('message.withdrawn', {
          messageId,
          sessionId: message.sessionId,
          userId,
        });
        console.log(`消息撤回成功，消息ID: ${messageId}，用户ID: ${userId}`);
        return message;
      },
    );
  }

  /**
   * 获取用户的聊天会话列表
   */
  async getUserSessions(userId: string, page = 1, pageSize = 20) {
    // 1. 找到用户参与的所有会话
    const memberSessions = await this.memberRepo.find({
      where: { userId },
      relations: ['session'],
    });
    const sessionIds = memberSessions.map((m) => m.sessionId);
    if (sessionIds.length === 0)
      return {
        total: 0,
        records: [],
        size: 0,
        current: 1,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      };

    // 2. 查询所有会话，按置顶排序、再按最新消息时间排序
    // 先查置顶信息
    const pinMap: Record<string, boolean> = {};
    const muteMap: Record<string, boolean> = {};
    // 假设有 chat_session_settings 表，见下文
    const settings = await this.sessionSettingRepo.find({
      where: { userId, sessionId: In(sessionIds) },
    });
    for (const s of settings) {
      pinMap[s.sessionId] = s.isPinned;
      muteMap[s.sessionId] = s.isMuted;
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
          WHERE "sessionId" = ANY ($1) AND status != 'withdraw'
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
            AND m.status != 'withdraw'
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
    const records = await Promise.all(
      sessions.map(async (session) => {
        const lastMsg = lastMessages[session.id];
        const unread = unreadCounts[session.id] || 0;
        let name: string = session.name;
        let avatar: string | undefined = undefined;

        if (session.type === 'single') {
          const friend = singleSessionUserMap[session.id] as any;
          if (friend) {
            const remark = await this.friendshipService.getFriendRemark(
              friend.id,
            );
            name = remark || friend.name || friend.userAccount || '对方';
            avatar = friend.avatar;
          }
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
      }),
    );

    return {
      total,
      size: pageSize,
      current: page,
      pages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
      records, // ✅ 已解析完毕的对象数组
    };
  }

  /**
   * 设置会话的置顶/免打扰
   */
  async setSessionSetting(
    sessionId: string,
    { isPinned, isMuted }: { isPinned?: boolean; isMuted?: boolean },
  ) {
    const userId = getLoginUser().id;
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
  async getSessionSetting(sessionId: string) {
    const userId = getLoginUser().id;
    return this.sessionSettingRepo.findOneBy({ userId, sessionId });
  }

  /**
   * 根据 sessionId 返回会话信息
   */
  async getSessionById(sessionId: string) {
    return this.sessionRepo.findOneBy({ id: sessionId });
  }

  // async updateUserLastSeen(userId: string, timestamp: number) {
  //   const user = await this.userRepo.findOneBy({ id: userId });
  //   if (!user) {
  //     throw new BusinessException(ErrorCode.NULL_ERROR, '用户不存在');
  //   }
  //   user.lastSeen = new Date(timestamp);
  //   await this.userRepo.save(user);
  // }

  async markMessageAck(messageId: string, userId: string) {
    return this.messageRepo.manager.transaction(
      async (transactionalManager) => {
        const message = await transactionalManager.findOneBy(ChatMessage, {
          id: messageId,
          senderId: userId,
        });
        if (!message) {
          throw new BusinessException(
            ErrorCode.NULL_ERROR,
            '消息不存在或无权限操作',
          );
        }
        message.status = 'delivered';
        await transactionalManager.save(message);
        return message;
      },
    );
  }

  async getUnreadMessages(userId: string) {
    const unreadMessages = await this.messageRepo
      .createQueryBuilder('message')
      .leftJoin(
        ChatMessageRead,
        'read',
        'message.id = read.messageId AND read.userId = :userId',
        { userId },
      )
      .where('message.receiverId = :userId', { userId })
      .andWhere('message.status != :status', { status: 'withdraw' })
      .andWhere('read.id IS NULL')
      .orderBy('message.createdAt', 'ASC')
      .getMany();

    return unreadMessages;
  }


}
