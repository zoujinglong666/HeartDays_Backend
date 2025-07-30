import { Injectable, NotFoundException } from '@nestjs/common';
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
import { PaginateResult } from '../common/interfaces/paginate-result.interface';
import { PlanQueryDto } from './dto/plan-query.dto';
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';
import { UpdateStatusDto } from './dto/update-status.dto';
import { getLoginUser } from '../common/context/request-context';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
  ) {}

  create(createPlanDto: CreatePlanDto) {
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }
    const plan = this.planRepository.create(createPlanDto);
    return this.planRepository.save({
      ...plan,
      user_id: user.id,
    });
  }

  findAll() {
    return this.planRepository.find();
  }

  findOne(id: string) {
    return this.planRepository.findOne({ where: { id } });
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    if (!id || !updatePlanDto) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }

    // 先执行更新操作
    await this.planRepository.update(id, updatePlanDto);

    // 然后查询并返回更新后的数据
    const updatedPlan = await this.planRepository.findOne({ where: { id } });

    if (!updatedPlan) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '计划不存在');
    }

    return updatedPlan;
  }

  async remove(id: string) {
    if (!id) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }

    // 获取当前登录用户
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    // 查找要删除的计划
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }

    // 检查是否是用户自己的数据
    if (plan.user_id !== user.id) {
      throw new BusinessException(ErrorCode.NO_AUTH,'只能删除自己的数据');
    }

    return await this.planRepository.delete(id);
  }
  async removeTest(id: string) {
    if (!id) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }

    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    // 直接根据 id 和 user_id 删除，如果不存在或不属于当前用户，删除操作会返回 affected: 0
    const result = await this.planRepository.delete({ id, user_id: user.id });

    if (result.affected === 0) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }

    return { message: '删除成功' };
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
    if (!userId) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '缺少用户ID');
    }
    console.log(query.page, query.pageSize);
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
      throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }

    const user = getLoginUser();

    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    const planItem = await this.planRepository.findOne({ where: { id } });
    if (!planItem) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }
    // 取模实现循环切换
    const newStatus = (status + 1) % 3;
    planItem.status = newStatus;
    planItem.completed_at = newStatus === 2 ? new Date() : undefined;
    await this.planRepository.save(planItem);
    return planItem;
  }
}
