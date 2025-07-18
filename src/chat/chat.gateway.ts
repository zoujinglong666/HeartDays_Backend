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

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    // 注册 WebSocket JWT 鉴权中间件
    server.use((socket, next) => {
      const wsJwt = new WsJwtMiddleware(this.jwtService);
      wsJwt.use(socket, next);
    });
  }



  handleConnection(client: Socket) {
    const user = client.data.user;
    if (!user) {
      client.disconnect();
      return;
    }
    console.log('WebSocket连接 user:', user.sub);
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
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
  async handleSendMessage(@MessageBody() data, @ConnectedSocket() client: Socket) {
    const user = client.data.user;
    if (!user) return { error: '未授权' };
    const message = await this.chatService.sendMessage(
      { ...data, sessionId: data.sessionId, type: data.type ?? 'text' },
      user.userId,
    );
    this.server.to(data.sessionId).emit('newMessage', message);
    return message;
  }



  // ... 其他事件 ...

}
