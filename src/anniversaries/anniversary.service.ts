import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Anniversary } from './anniversary.entity';
import { CreateAnniversaryDto } from './dto/create-anniversary.dto';
import { UpdateAnniversaryDto } from './dto/update-anniversary.dto';
import { merge } from 'rxjs';

@Injectable()
export class AnniversaryService {
  constructor(
    @InjectRepository(Anniversary)
    private readonly anniversaryRepo: Repository<Anniversary>,
  ) {}

  async create(dto: CreateAnniversaryDto, userId: any): Promise<Anniversary> {
    const entity = this.anniversaryRepo.create(dto);
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
    return await this.anniversaryRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }


  async update(id: number, dto: UpdateAnniversaryDto): Promise<Anniversary> {
    const entity = await this.findOne(id);
    // 防止 user_id 被覆盖
    const { user_id, ...rest } = dto;
    Object.assign(entity, rest);

    return await this.anniversaryRepo.save(entity);
  }

  async updateTest(id: number, dto: UpdateAnniversaryDto): Promise<Anniversary> {
    const entity = await this.findOne(id);
    const { user_id, ...rest } = dto;

    // TypeORM 的 merge 方法
    this.anniversaryRepo.merge(entity, rest);

    return await this.anniversaryRepo.save(entity);
  }

  async remove(id: number, currentUserId: string, currentUserRoles: string[]): Promise<Anniversary> {
    const entity = await this.findOne(id);
    
    // 检查权限：只有管理员或纪念日创建者才能删除
    const isAdmin = currentUserRoles.includes('admin');
    const isOwner = entity.user_id === currentUserId;
    
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('权限不足，只有管理员或纪念日创建者才能删除');
    }
    
    return await this.anniversaryRepo.remove(entity);
  }
}
