import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from './friendship.entity';
import { NotificationGateway } from '../notification/notification.gateway';
import { getLoginUser } from '../common/context/request-context';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async requestFriend(userId: number, friendId: number) {
    if (userId === friendId) throw new BadRequestException('不能加自己为好友');
    let friendship = await this.friendshipRepo.findOne({
      where: [
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId }
      ]
    });
    if (friendship) {
      if (friendship.status === 'accepted') throw new BadRequestException('已是好友');
      friendship.status = 'pending';
      friendship.updated_at = new Date();
      return this.friendshipRepo.save(friendship);
    }

    // 获取发起人信息
    const fromUser = getLoginUser();
    // 通知对方
    this.notificationGateway.notifyFriendRequest(friendId, {
      id: fromUser.id,
      nickname: fromUser.nickname,
      avatar: fromUser.avatar,
    });
    return this.friendshipRepo.save({
      user_id: userId,
      friend_id: friendId,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async respondFriendRequest(requestId: number, action: 'accept' | 'reject') {
    const friendship = await this.friendshipRepo.findOne({ where: { id: requestId } });
    if (!friendship) throw new NotFoundException('请求不存在');
    friendship.status = action === 'accept' ? 'accepted' : 'rejected';
    friendship.updated_at = new Date();
    return this.friendshipRepo.save(friendship);
  }

  async getFriendList(userId: number) {
    const friends = await this.friendshipRepo.find({
      where: [
        { user_id: userId, status: 'accepted' },
        { friend_id: userId, status: 'accepted' }
      ]
    });
    // 返回对方用户ID列表
    return friends.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    );
  }
}