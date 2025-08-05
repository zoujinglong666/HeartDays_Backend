import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Anniversary } from './anniversary.entity';
import { CreateAnniversaryDto } from './dto/create-anniversary.dto';
import { UpdateAnniversaryDto } from './dto/update-anniversary.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AnniversaryService {
  constructor(
    @InjectRepository(Anniversary)
    private readonly anniversaryRepo: Repository<Anniversary>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateAnniversaryDto, userId: any): Promise<Anniversary> {
    const entity = this.anniversaryRepo.create(dto);
    // 清除缓存
    await this.redisService.del(`anniversaries:user:${entity.user_id}`);
    return await this.anniversaryRepo.save({ ...entity, user_id: userId });
  }

  async findAll(): Promise<Anniversary[]> {
    return await this.anniversaryRepo.find();
  }

  async findOne(id: number): Promise<Anniversary> {
    const entity = await this.anniversaryRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('纪念日不存在');
    return entity;
  }

  async findByUser(userId: string): Promise<Anniversary[]> {
    // 使用redis缓存
    function safeParse(input: any) {
      if (typeof input === 'string') {
        try {
          return JSON.parse(input);
        } catch (e) {
          console.error('JSON parse error:', e);
          return null;
        }
      }
      return input;
    }


    const anniversariesCache = await this.redisService.get(
      `anniversaries:user:${userId}`,
    );

    if (anniversariesCache) {
      return safeParse(anniversariesCache);
    }

    const entities = await this.anniversaryRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    await this.redisService.set(
      `anniversaries:user:${userId}`,
      entities,
      60 * 60*24,
    );
    return entities;
  }

  async update(id: number, dto: UpdateAnniversaryDto): Promise<Anniversary> {
    const entity = await this.findOne(id);
    // 防止 user_id 被覆盖
    const { user_id, ...rest } = dto;
    Object.assign(entity, rest);
    // 清除缓存
    await this.redisService.del(`anniversaries:user:${entity.user_id}`);

    return await this.anniversaryRepo.save(entity);
  }

  async updateTest(
    id: number,
    dto: UpdateAnniversaryDto,
  ): Promise<Anniversary> {
    const entity = await this.findOne(id);
    const { user_id, ...rest } = dto;

    // TypeORM 的 merge 方法
    this.anniversaryRepo.merge(entity, rest);

    return await this.anniversaryRepo.save(entity);
  }

  async remove(
    id: number,
    currentUserId: string,
    currentUserRoles: string[],
  ): Promise<Anniversary> {
    const entity = await this.findOne(id);

    // 检查权限：只有管理员或纪念日创建者才能删除
    const isAdmin = currentUserRoles.includes('admin');
    const isOwner = entity.user_id === currentUserId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        '权限不足，只有管理员或纪念日创建者才能删除',
      );
    }
    // 清除缓存
    await this.redisService.del(`anniversaries:user:${entity.user_id}`);
    return await this.anniversaryRepo.remove(entity);
  }
}
