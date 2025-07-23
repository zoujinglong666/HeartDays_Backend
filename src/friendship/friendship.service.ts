import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from './friendship.entity';
import { NotificationGateway } from '../notification/notification.gateway';
import { getLoginUser } from '../common/context/request-context';
import { UserVO } from '../user/vo/user.vo';
import { User } from '../user/user.entity';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    private readonly notificationGateway: NotificationGateway,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async requestFriend(friendId: string) {
    if (!friendId) throw new BadRequestException('friendId不能为空');

    // 获取发起人信息
    const fromUser = getLoginUser();
    const userId = fromUser.id;
    if (userId === friendId) throw new BadRequestException('不能加自己为好友');

    let friendship = await this.friendshipRepo.findOne({
      where: [
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId },
      ],
    });

    // 通知对方
    const notifyPayload = {
      id: fromUser.id,
      avatar: fromUser.avatar,
      nickname: fromUser.name, // 建议加上
    };

    if (friendship) {
      if (friendship.status === 'accepted')
        throw new BadRequestException('已是好友');
      friendship.status = 'pending';
      friendship.updated_at = new Date();
      this.notificationGateway.notifyFriendRequest(friendId, notifyPayload);
      return this.friendshipRepo.save(friendship);
    }

    console.log('通知对方发起好友请求');
    this.notificationGateway.notifyFriendRequest(friendId, notifyPayload);
    return this.friendshipRepo.save({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async respondFriendRequest(requestId: number, action: 'accept' | 'reject') {
    const friendship = await this.friendshipRepo.findOne({
      where: { id: requestId },
    });
    if (!friendship) throw new NotFoundException('请求不存在');
    friendship.status = action === 'accept' ? 'accepted' : 'rejected';
    friendship.updated_at = new Date();
    return this.friendshipRepo.save(friendship);
  }

  async getFriendList() {
    const userId = getLoginUser().id;
    const friends = await this.friendshipRepo.find({
      where: [
        { user_id: userId, status: 'accepted' },
        { friend_id: userId, status: 'accepted' },
      ],
    });
    // 获取好友ID列表
    const friendIds = friends.map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
    if (friendIds.length === 0) return [];
    // 批量查用户
    const users = await this.userRepo.findByIds(friendIds);
    // 只返回需要的字段（UserVO）
    return users.map(u => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      email: u.email,
      userAccount: u.userAccount,
      // ... 其他你需要的字段
    }));
  }

  // 获取我收到的好友申请列表

  async getReceivedFriendRequests(): Promise<any[]> {
    const userId = getLoginUser().id;
  
    // 联表查出所有字段和发起人信息
    const requests = await this.friendshipRepo
      .createQueryBuilder('f')
      .leftJoin('users', 'u', 'f.user_id = u.id')
      .where('f.friend_id = :userId', { userId })
      .andWhere('f.status = :status', { status: 'pending' })
      .orderBy('f.created_at', 'DESC')
      .select([
        'f.id AS id',
        'f.user_id AS user_id',
        'f.friend_id AS friend_id',
        'f.status AS status',
        'f.created_at AS created_at',
        'f.updated_at AS updated_at',
        'u.id AS u_id',
        'u.name AS u_name',
        'u.avatar AS u_avatar',
        'u.email AS u_email',
        'u.userAccount AS u_userAccount', // 如果 UserVO 需要
      ])
      .getRawMany();
  
    // 组装返回结构
    return requests.map(r => ({
      id: r.id,
      user_id: r.user_id,
      friend_id: r.friend_id,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      fromUser: {
        id: r.u_id,
        name: r.u_name,
        avatar: r.u_avatar,
        email: r.u_email,
        userAccount: r.u_userAccount,
      } as UserVO,
    }));
  }
}
