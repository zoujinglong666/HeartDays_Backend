import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { LoginDto } from '../user/dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(accountOrEmail: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: [
        { userAccount: accountOrEmail, isActive: true },
        { email: accountOrEmail, isActive: true },
      ],
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const { userAccount, password } = loginDto;

    // 确保提供了账号或邮箱
    if (!userAccount) {
      throw new UnauthorizedException('请提供账号或邮箱');
    }
    const user = await this.validateUser(userAccount, password);
    if (!user) {
      throw new UnauthorizedException('账号/邮箱或密码错误');
    }
    // 生成token
    const payload = {
      email: user.email,
      userAccount: user.userAccount,
      sub: user.id,
      roles: user.roles,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        userAccount: user.userAccount,
        email: user.email,
        roles: user.roles,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async register(registerUserDto: RegisterUserDto) {
    if (
      !registerUserDto.userAccount ||
      !registerUserDto.password ||
      !registerUserDto.confirmPassword
    ) {
      throw new UnauthorizedException('请填写完整的注册信息');
    }
    // 检查账号是否已存在
    const existingUserByAccount = await this.userRepository.findOne({
      where: { userAccount: registerUserDto.userAccount },
    });

    if (existingUserByAccount) {
      throw new UnauthorizedException('账号已存在');
    }
    // 判断密码 和确认密码是否一致
    if (registerUserDto.password !== registerUserDto.confirmPassword) {
      throw new UnauthorizedException('密码和确认密码不一致');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);

    // 创建用户
    const user = this.userRepository.create({
      ...registerUserDto,
      name: '无名',
      email: randomUUID({
        disableEntropyCache: true,
      }),
      roles: ['user'],
      password: hashedPassword,
    });

    return await this.userRepository.save(user);
    // 返回登录信息
  }
}
