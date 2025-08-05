// src/user/user.service.ts
import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';


import { PasswordUtils } from '../common/utils/password.utils';
import { Friendship } from '../friendship/friendship.entity';
import { getLoginUser } from '../common/context/request-context';
import {
  BusinessException, ErrorCode,
} from '../common/exceptions/business.exception';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查账号是否已存在
    const existingUserByAccount = await this.userRepo.findOne({
      where: { userAccount: createUserDto.userAccount },
    });

    if (existingUserByAccount) {
      throw new BusinessException(ErrorCode.DATA_EXIST, '账号已被其它用户使用');
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await this.userRepo.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new BusinessException(ErrorCode.DATA_EXIST, '邮箱已被其它用户使用');
    }

    const hashedPassword = PasswordUtils.encryptPassword(
      createUserDto.password,
    );

    const user = this.userRepo.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.userRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepo.find({
      where: { isActive: true },
      select: [
        'id',
        'name',
        'userAccount',
        'email',
        'avatar',
        'roles',
        'createdAt',
      ],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, isActive: true },
      select: [
        'id',
        'name',
        'userAccount',
        'email',
        'avatar',
        'roles',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '用户不存在');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: { email, isActive: true },
    });
  }

  async findByUserAccount(userAccount: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: { userAccount, isActive: true },
    });
  }

  async findByAccountOrEmail(accountOrEmail: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: [
        { userAccount: accountOrEmail, isActive: true },
        { email: accountOrEmail, isActive: true },
      ],
    });
  }

  async update(updateUserDto: UpdateUserDto): Promise<User> {
    const id = updateUserDto.id;
    const user = await this.findOne(id);
    // 检查账号是否被其他用户使用
    if (
      updateUserDto.userAccount &&
      updateUserDto.userAccount !== user.userAccount
    ) {
      const existingUser = await this.findByUserAccount(
        updateUserDto.userAccount,
      );
      if (existingUser) {

        throw new BusinessException(
          ErrorCode.DATA_EXIST,
          '账号已被其它用户使用',
        );
      }
    }

    // 检查邮箱是否被其他用户使用
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUserByEmail = await this.findByEmail(updateUserDto.email);
      if (existingUserByEmail && existingUserByEmail.id !== id) {
        throw new BusinessException(
          ErrorCode.DATA_EXIST,
          '邮箱已被其他用户使用',
        );
      }
    }

    // TypeORM 的 merge 方法
    this.userRepo.merge(user, updateUserDto);
    return await this.userRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isActive = false;
    await this.userRepo.save(user);
  }

  async getUnaddedUsers(keyword?: string, page = 1, pageSize = 20) {
    const loginUser = getLoginUser();
    if (!loginUser) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    // 查找所有已是好友的用户ID
    const friendships = await this.friendshipRepo.find({
      where: [
        { user_id: loginUser.id, status: 'accepted' },
        { friend_id: loginUser.id, status: 'accepted' },
      ],
    });
    const friendIds = friendships.map((f) =>
      f.user_id === loginUser.id ? f.friend_id : f.user_id,
    );

    const safeFriendIds =
      friendIds.length > 0 ? friendIds : ['00000000-0000-0000-0000-000000000000'];

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoin(
        'friendships',
        'friendship',
        `(friendship.user_id = :loginUserId AND friendship.friend_id = user.id)
     OR (friendship.friend_id = :loginUserId AND friendship.user_id = user.id)`,
        { loginUserId: loginUser.id },
      )
      .where('user.id != :userId', { userId: loginUser.id })
      .andWhere('user.id NOT IN (:...friendIds)', { friendIds: safeFriendIds });

    if (keyword) {
      qb.andWhere('user.name ILIKE :name', { name: `%${keyword}%` });
    }

    qb.skip((page - 1) * pageSize).take(pageSize);

    // 更新查询字段，添加 friendship.status
    qb.select([
      'user.id',
      'user.name',
      'user.email',
      'user.avatar',
      'user.userAccount',
      'friendship.status', // 添加这一行
    ]);

    const results = await qb.getRawAndEntities();

    return results.entities.map((user, index) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      userAccount: user.userAccount,
      friendshipStatus: results.raw[index].friendship_status ?? '', // 映射结果
    }));
  }


}
