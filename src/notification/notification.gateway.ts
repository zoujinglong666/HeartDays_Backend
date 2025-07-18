// src/notification/notification.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  
  @WebSocketGateway({
    cors: {
      origin: '*', // 生产环境请配置白名单
    },
  })
  export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    // 用户ID与socketId的映射
    private userSocketMap = new Map<number, string>();
  
    // 连接时，记录用户ID与socketId
    async handleConnection(client: Socket) {
      // 假设你用 JWT 鉴权，用户信息已挂载到 client.data.user
      const user = client.data.user;
      if (user && user.id) {
        this.userSocketMap.set(user.id, client.id);
        client.join(`user_${user.id}`); // 加入以 userId 命名的房间
      }
    }
  
    // 断开时，移除映射
    async handleDisconnect(client: Socket) {
      const user = client.data.user;
      if (user && user.id) {
        this.userSocketMap.delete(user.id);
        client.leave(`user_${user.id}`);
      }
    }
  
    // 通知好友申请
    notifyFriendRequest(toUserId: number, fromUser: { id: number; nickname: string; avatar: string }) {
      // 推送到指定用户的房间
      this.server.to(`user_${toUserId}`).emit('friendRequest', {
        from: fromUser,
        time: new Date().toISOString(),
      });
    }
  }