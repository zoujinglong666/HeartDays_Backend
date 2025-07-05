import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from 'nestjs-typeorm-paginate';
import { PaginateDto } from '../common/dto/paginate.dto';
import { PaginateResult } from '../common/interfaces/paginate-result.interface';
import { PlanQueryDto } from './dto/plan-query.dto';
import { Anniversary } from '../anniversaries/anniversary.entity';
import {
  BusinessException,
  CommonResultCode,
} from '../common/exceptions/business.exception';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
  ) {}

  create(createPlanDto: CreatePlanDto) {
    const plan = this.planRepository.create(createPlanDto);
    return this.planRepository.save(plan);
  }

  findAll() {
    return this.planRepository.find();
  }

  findOne(id: string) {
    return this.planRepository.findOne({ where: { id } });
  }

  update(id: string, updatePlanDto: UpdatePlanDto) {
    return this.planRepository.update(id, updatePlanDto);
  }

  remove(id: string) {
    return this.planRepository.delete(id);
  }

  async findAllPage(options: IPaginationOptions): Promise<Pagination<Plan>> {
    const queryBuilder = this.planRepository.createQueryBuilder('plan');
    queryBuilder.orderBy('plan.created_at', 'DESC');
    return paginate<Plan>(queryBuilder, options);
  }

  // async findAllList({
  //                     page = 1,
  //                     pageSize = 10,
  //                     userId,
  //                     status,
  //                     keyword,
  //                   }: {
  //   page?: number;
  //   pageSize?: number;
  //   userId?: number;
  //   status?: number;
  //   keyword?: string;
  // }) {
  //   const where: any = {};
  //   if (userId) where.user_id = userId;
  //   if (typeof status === 'number') where.status = status;
  //   if (keyword) {
  //     where.title = () => `ILIKE '%${keyword}%'`; // 如果用 TypeORM 的 where builder 更安全
  //   }
  //
  //   const skip = Math.max((page - 1), 0) * pageSize;
  //
  //   const [records, total] = await this.planRepository.findAndCount({
  //     where,
  //     skip,
  //     take: pageSize,
  //     order: { created_at: 'DESC' },
  //   });
  //
  //   return {
  //     total,
  //     records,
  //     size: pageSize,
  //     current: page,
  //     pages: Math.ceil(total / pageSize),
  //     hasNext: page * pageSize < total,
  //     hasPrev: page > 1,
  //   };
  // }

  // plan.service.ts
  async findByUser(query: PlanQueryDto): Promise<PaginateResult<Plan>> {
    const { page = 1, pageSize = 10, userId } = query;
    console.log('query', query);
    console.log('userId', userId);

    if (!userId) {
      throw new Error('userId is required');
    }
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (userId !== undefined) where.user_id = userId;

    // 构造动态查询（需使用 QueryBuilder 来支持模糊匹配）
    const qb = this.planRepository
      .createQueryBuilder('plan')
      .where(where)
      .orderBy('plan.created_at', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [records, total] = await qb.getManyAndCount();

    return {
      total,
      size: pageSize,
      current: page,
      pages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
      records,
    };
  }

  async updateStatus(updateStatusDto: UpdateStatusDto) {
    const { id, status } = updateStatusDto;
    if (!id) {
      throw new BusinessException(CommonResultCode.PARAMS_ERROR);
    }

    // 取模实现循环切换
    const newStatus = (status + 1) % 3;

    const planItem = await this.planRepository.findOne({ where: { id } });
    if (!planItem) {
      throw new BusinessException(CommonResultCode.PARAMS_ERROR);
    }

    planItem.status = newStatus;
    await this.planRepository.save(planItem);

    return planItem
  }
}
