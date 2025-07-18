// src/user/user.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UserNotFoundException,
  EmailAlreadyExistsException,
  UserAccountAlreadyExistsException,
} from '../common/exceptions/custom.exception';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PasswordUtils } from '../common/utils/password.utils';
import { Friendship } from '../friendship/friendship.entity';

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
      throw new UserAccountAlreadyExistsException(createUserDto.userAccount);
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await this.userRepo.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new EmailAlreadyExistsException(<string>createUserDto?.email);
    }

    const hashedPassword = PasswordUtils.encryptPassword(createUserDto.password);

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
      throw new UserNotFoundException(id);
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
        throw new UserAccountAlreadyExistsException(updateUserDto.userAccount);
      }
    }

    // 检查邮箱是否被其他用户使用
    if (
      updateUserDto.email &&
      updateUserDto.email !== user.email
    ) {
      const existingUserByEmail = await this.findByEmail(updateUserDto.email);
      if (existingUserByEmail && existingUserByEmail.id !== id) {
        throw new EmailAlreadyExistsException(updateUserDto.email);
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
  async getUnaddedUsers(userId: number, keyword?: string, page = 1, pageSize = 20) {
    // 1. 查找所有已是好友的用户ID
    const friendships = await this.friendshipRepo.find({
      where: [
        { user_id: userId, status: 'accepted' },
        { friend_id: userId, status: 'accepted' }
      ]
    });
    const friendIds = friendships.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // 2. 查找未添加的用户
    const qb = this.userRepo.createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .andWhere('user.id NOT IN (:...friendIds)', { friendIds: friendIds.length ? friendIds : [0] });

    if (keyword) {
      qb.andWhere('user.nickname ILIKE :keyword', { keyword: `%${keyword}%` });
    }

    qb.skip((page - 1) * pageSize).take(pageSize);

    return qb.getMany();
  }

}
