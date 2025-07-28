import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { WsJwtMiddleware } from '../common/middleware/ws-jwt.middleware';
import { RedisService } from '../redis/redis.service';
import { FriendshipService } from '../friendship/friendship.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  // 存储用户ID与socket的映射关系
  private userSocketMap = new Map<string, Socket>();

  // 存储用户在线状态的前缀
  private readonly ONLINE_KEY_PREFIX = 'online:user:';
  private readonly ONLINE_EXPIRE_TIME = 60 * 10; // 10分钟

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly friendshipService: FriendshipService,
  ) {}

  afterInit(server: Server) {
    // 注册 WebSocket JWT 鉴权中间件
    server.use((socket, next) => {
      const wsJwt = new WsJwtMiddleware(this.jwtService);
      wsJwt.use(socket, next);
    });

    // 手动监听连接事件
    server.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // 手动监听断开事件
    server.on('disconnect', (socket) => {
      this.handleDisconnect(socket);
    });
  }

  async handleConnection(client: Socket) {
    const user = client.data.user;
    if (!user) {
      client.disconnect();
      return;
    }

    // 将用户ID与socket关联
    this.userSocketMap.set(user.sub, client);

    // 设置用户在线状态到Redis
    try {
      await this.redisService.set(
        `${this.ONLINE_KEY_PREFIX}${user.sub}`,
        '1',
        this.ONLINE_EXPIRE_TIME,
      );

      // 通知好友该用户上线
      await this.notifyFriendsStatus(user.sub, 'online');
    } catch (error) {
      console.error('设置用户在线状态失败:', error);
    }

    console.log('WebSocket连接 user:', user.sub);
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      // 从映射中移除用户
      this.userSocketMap.delete(user.sub);

      // 清除Redis中的在线状态
      try {
        await this.redisService.del(`${this.ONLINE_KEY_PREFIX}${user.sub}`);

        // 通知好友该用户下线
        await this.notifyFriendsStatus(user.sub, 'offline');
      } catch (error) {
        console.error('清除用户在线状态失败:', error);
      }

      console.log('WebSocket断开:', user.userId);
    }
  }

  @SubscribeMessage('joinSession')
  handleJoinSession(@MessageBody() data, @ConnectedSocket() client: Socket) {
    console.log('joinSession', data);
    client.join(data.sessionId);
    return { joined: data.sessionId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user) return { error: '未授权' };

    try {
      const sessionMembers = await this.chatService.getSessionMembers(
        data.sessionId,
      );
      const receiver = sessionMembers.find((m) => m.userId !== user.sub);
      if (!receiver) {
        return { error: '未找到接收者' };
      }

      const message = await this.chatService.sendMessage(
        {
          ...data,
          sessionId: data.sessionId,
          receiverId: receiver.userId,
          type: data.type ?? 'text',
        },
        user.sub,
      );

      // 向会话中的所有成员发送新消息通知
      this.server.to(data.sessionId).emit('newMessage', {
        ...message,
        localId: data.localId,
      });

      // 向发送者确认消息已发送
      client.emit('messageSent', {
        localId: data.localId,
        messageId: message.id,
        timestamp: new Date(),
      });

      // 检查接收者是否在线，如果在线则发送消息
      const receiverSocket = this.userSocketMap.get(receiver.userId);
      if (receiverSocket) {
        // 发送消息给接收者
        receiverSocket.emit('newMessage', {
          ...message,
          localId: data.localId,
        });

        // 发送消息送达确认给发送者
        client.emit('messageDelivered', {
          messageId: message.id,
          localId: data.localId,
          timestamp: new Date(),
        });
      }

      return message;
    } catch (error) {
      console.error('发送消息失败:', error);
      return { error: '消息发送失败' };
    }
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const roomName = `user_${data.userId}`;
    socket.join(roomName);
    socket.emit('joinedUserRoom', { room: roomName });
  }

  /**
   * 消息撤回
   */
  @SubscribeMessage('withdrawMessage')
  async handleWithdrawMessage(
    @MessageBody()
    data: {
      messageId: string;
      sessionId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    try {
      // 调用服务撤回消息
      const message = await this.chatService.withdrawMessage(
        data.messageId,
        userId,
      );
      console.log('撤回消息:', message);

      // 通知会话中的所有成员消息已被撤回
      this.server.to(data.sessionId).emit('messageWithdrawn', {
        ...message,
        messageId: data.messageId,
        userId,
        timestamp: new Date(),
      });

      // 向发送者发送确认
      client.emit('messageWithdrawnConfirm', {
        messageId: data.messageId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('撤回消息失败:', error);
      client.emit('messageWithdrawnError', {
        messageId: data.messageId,
        error: '撤回消息失败',
      });
    }
  }

  /**
   * 客户端获取离线消息
   * @param data
   * @param client
   */
  @SubscribeMessage('getOfflineMessages')
  async handleGetOfflineMessages(
    @MessageBody() data: { lastMessageTime?: Date },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    try {
      // 获取用户的离线消息
      const messages = await this.chatService.getOfflineMessages(
        userId,
        data.lastMessageTime,
      );

      console.log('获取离线消息:', messages);

      client.emit('offlineMessages', { messages });
    } catch (error) {
      console.error('获取离线消息失败:', error);
      client.emit('offlineMessagesError', { error: '获取离线消息失败' });
    }
  }

  /**
   * 客户端确认消息送达
   * @param data
   * @param client
   */
  @SubscribeMessage('messageAck')
  async handleMessageAck(
    @MessageBody() data,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    try {
      // 更新消息状态为已送达
      // await this.chatService.markMessageAck(data.messageId, userId);

      // 通知其他会话成员（除发送者）
      client.to(data.sessionId).emit('messageAck', {
        messageId: data.messageId,
        localId: data.localId,
        userId,
        timestamp: new Date(),
      });

      // 向发送者发送确认
      client.emit('messageAckConfirm', {
        messageId: data.messageId,
        localId: data.localId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('确认消息送达失败:', error);
      client.emit('messageAckError', {
        messageId: data.messageId,
        localId: data.localId,
        error: '确认消息送达失败',
      });
    }
  }

  @SubscribeMessage('readMessage')
  async handleReadMessage(
    @MessageBody() data,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    try {
      await this.chatService.markMessageRead(data.messageId);

      // 通知会话成员该消息已被阅读
      this.server.to(data.sessionId).emit('readMessage', {
        messageId: data.messageId,
        userId,
        timestamp: new Date(),
      });

      // 向发送者发送确认
      client.emit('messageReadConfirm', {
        messageId: data.messageId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('标记消息已读失败:', error);
      client.emit('messageReadError', {
        messageId: data.messageId,
        error: '标记消息已读失败',
      });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data, @ConnectedSocket() client: Socket) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    // 向会话中的其他成员广播正在输入状态
    client.to(data.sessionId).emit('typing', {
      userId,
      sessionId: data.sessionId,
      timestamp: new Date(),
    });
  }

  /**
   * 停止输入
   */
  @SubscribeMessage('stopTyping')
  handleStopTyping(@MessageBody() data, @ConnectedSocket() client: Socket) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    // 向会话中的其他成员广播停止输入状态
    client.to(data.sessionId).emit('stopTyping', {
      userId,
      sessionId: data.sessionId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data, @ConnectedSocket() client: Socket) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    // this.chatService.updateUserLastSeen(userId, data.timestamp);

    // 可回复pong，维持连接活跃
    client.emit('pong', { timestamp: data.timestamp });
  }

  /**
   * 检查用户在线状态
   */
  @SubscribeMessage('checkUserStatus')
  async handleCheckUserStatus(
    @MessageBody() data: { userIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    if (!userId) return;

    try {
      const statuses: Record<string, boolean> = {};

      for (const targetUserId of data.userIds) {
        // 检查用户是否在线
        const isOnline = this.userSocketMap.has(targetUserId);

        // 如果内存中没有，再检查Redis
        if (!isOnline) {
          const redisKey = `${this.ONLINE_KEY_PREFIX}${targetUserId}`;
          const redisValue = await this.redisService.get(redisKey);
          statuses[targetUserId] = !!redisValue;
        } else {
          statuses[targetUserId] = true;
        }
      }

      client.emit('userStatus', { statuses });
    } catch (error) {
      console.error('检查用户状态失败:', error);
      client.emit('userStatusError', { error: '检查用户状态失败' });
    }
  }

  /**
   * 通知好友状态变化
   * @param userId
   * @param status
   */
  private async notifyFriendsStatus(
    userId: string,
    status: 'online' | 'offline',
  ) {
    try {
      // 获取好友列表
      const friends = await this.friendshipService.getFriends(userId);
      // 遍历好友列表
      for (const friend of friends) {
        const friendSocket = this.userSocketMap.get(String(friend.id));
        if (friendSocket) {
          friendSocket.emit('friendStatus', {
            userId,
            status,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('通知好友状态变化失败:', error);
    }
  }

  /**
   * 处理消息撤回事件
   * @param payload
   */
  @OnEvent('message.withdrawn')
  handleWithdrawMessageEvent(payload: {
    messageId: string;
    sessionId: string;
    userId: string;
  }) {
    // 通知会话中的所有成员消息已被撤回
    this.server.to(payload.sessionId).emit('messageWithdrawn', {
      messageId: payload.messageId,
      userId: payload.userId,
      timestamp: new Date(),
    });
  }
}
