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
import { LoginDto } from '../user/dto/login.dto';

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


    const sessionMembers = await this.chatService.getSessionMembers(data.sessionId);
    console.log('sessionMembers', sessionMembers);

    const receiver = sessionMembers.find(m => m.userId !== user.sub);
    const message = await this.chatService.sendMessage(
      { ...data, sessionId: data.sessionId, receiverId: receiver?.userId, type: data.type ?? 'text' },
      user.sub,
    );
    this.server.to(data.sessionId).emit('newMessage', message);
    return message;
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(@ConnectedSocket() socket: Socket, @MessageBody() data: { userId: string }) {
    socket.join(`user_${data.userId}`);
    console.log(`Socket ${socket.id} joined room user_${data.userId}`);
    // 可选：通知客户端已加入
    socket.emit('joinedUserRoom', { room: `user_${data.userId}` });
  }



}
