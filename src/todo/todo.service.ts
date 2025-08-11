import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, In, Between, IsNull } from 'typeorm';
import { TodoItem } from './todo.entity';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoQueryDto } from './dto/todo-query.dto';
import { UpdateTodoStatusDto } from './dto/update-todo-status.dto';
import { UpdateTodoOrderDto } from './dto/update-todo-order.dto';
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';
import { getLoginUser } from '../common/context/request-context';
import { paginate, Pagination } from 'nestjs-typeorm-paginate';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(TodoItem)
    private todoRepository: Repository<TodoItem>,
  ) {}

  async create(createTodoDto: CreateTodoDto): Promise<TodoItem> {
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    // 如果有父级ID，验证父级是否存在且属于当前用户
    if (createTodoDto.parent_id) {
      const parent = await this.todoRepository.findOne({
        where: { id: createTodoDto.parent_id, user_id: user.id },
      });
      if (!parent) {
        throw new BusinessException(
          ErrorCode.PARAMS_ERROR,
          '父级待办事项不存在',
        );
      }
    }

    const todo = this.todoRepository.create({
      ...createTodoDto,
      user_id: user.id,
    });
    return this.todoRepository.save(todo);
  }

  async findAll(queryDto: TodoQueryDto): Promise<{ data: TodoItem[] }> {
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    const {
      page = 1,
      pageSize = 10,
      done,
      priority,
      parent_id,
      keyword,
      has_reminder,
      sort_by = 'order', // ✅ 使用安全字段名
      sort_direction = 'ASC',
    } = queryDto;

    const queryBuilder = this.todoRepository.createQueryBuilder('todo');
    queryBuilder.where('todo.user_id = :userId', { userId: user.id });

    if (done !== undefined) {
      queryBuilder.andWhere('todo.done = :done', { done });
    }

    if (priority !== undefined) {
      queryBuilder.andWhere('todo.priority = :priority', { priority });
    }

    if (parent_id !== undefined) {
      if (parent_id === null) {
        queryBuilder.andWhere('todo.parent_id IS NULL');
      } else {
        queryBuilder.andWhere('todo.parent_id = :parentId', {
          parentId: parent_id,
        });
      }
    }

    if (keyword) {
      queryBuilder.andWhere('todo.title LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    if (has_reminder !== undefined) {
      queryBuilder.andWhere(
        `todo.reminder_at IS ${has_reminder ? 'NOT' : ''} NULL`,
      );
    }

    const validSortFields = [
      'created_at',
      'updated_at',
      'order',
      'reminder_at',
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'order';
    const sortDir = sort_direction === 'DESC' ? 'DESC' : 'ASC';

    queryBuilder.orderBy(`todo.${sortField}`, sortDir);

    if (sortField !== 'order') {
      queryBuilder.addOrderBy('todo.order', 'ASC');
    }

    const result = await paginate<TodoItem>(queryBuilder, {
      page,
      limit: pageSize,
    });

    // ✅ 返回格式简化为 { data: [...] }
    return { data: result.items };
  }

  async findOne(id: string): Promise<TodoItem> {
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    const todo = await this.todoRepository.findOne({
      where: { id, user_id: user.id },
    });

    if (!todo) {
      throw new BusinessException(ErrorCode.NULL_ERROR, '待办事项不存在');
    }

    return todo;
  }

  async update(id: string, updateTodoDto: UpdateTodoDto): Promise<TodoItem> {
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    // 验证待办事项是否存在且属于当前用户
    const todo = await this.todoRepository.findOne({
      where: { id, user_id: user.id },
    });

    if (!todo) {
      throw new BusinessException(ErrorCode.NULL_ERROR, '待办事项不存在');
    }

    // 如果更新了父级ID，验证父级是否存在且属于当前用户
    if (updateTodoDto.parent_id && updateTodoDto.parent_id !== todo.parent_id) {
      // 不能将自己设为自己的父级
      if (updateTodoDto.parent_id === id) {
        throw new BusinessException(
          ErrorCode.PARAMS_ERROR,
          '不能将自己设为自己的父级',
        );
      }

      const parent = await this.todoRepository.findOne({
        where: { id: updateTodoDto.parent_id, user_id: user.id },
      });

      if (!parent) {
        throw new BusinessException(
          ErrorCode.PARAMS_ERROR,
          '父级待办事项不存在',
        );
      }
    }

    // 更新待办事项
    await this.todoRepository.update(id, updateTodoDto);

    // 返回更新后的数据
    const updatedTodo = await this.todoRepository.findOne({ where: { id } });
    if (!updatedTodo) {
      throw new BusinessException(ErrorCode.NULL_ERROR, '待办事项不存在');
    }
    return updatedTodo;
  }

  async updateStatus(updateStatusDto: UpdateTodoStatusDto): Promise<boolean> {
    const { id, done } = updateStatusDto;
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    // 验证待办事项是否存在且属于当前用户
    const todo = await this.todoRepository.findOne({
      where: { id, user_id: user.id },
    });

    if (!todo) {
      throw new BusinessException(ErrorCode.NULL_ERROR, '待办事项不存在');
    }

    // ✅ 获取所有子任务（递归）
    const collectAllDescendants = async (
      parentId: string,
    ): Promise<string[]> => {
      const children = await this.todoRepository.find({
        where: { parent_id: parentId, user_id: user.id },
      });

      const descendantIds: string[] = [];
      for (const child of children) {
        descendantIds.push(child.id);
        const subDescendants = await collectAllDescendants(child.id);
        descendantIds.push(...subDescendants);
      }
      return descendantIds;
    };

    const allDescendantIds = await collectAllDescendants(id);
    // ✅ 更新所有子任务状态
    if (allDescendantIds.length > 0) {
      await this.todoRepository.update(allDescendantIds, { done });
    }
    // 更新状态
    await this.todoRepository.update(id, { done });

    // 返回更新后的数据

    return true;
  }

  async remove(id: string): Promise<void> {
    const user = getLoginUser();

    if (!id) {
      throw new BusinessException(ErrorCode.PARAMS_ERROR, '待办事项ID不能为空');
    }
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    // 先验证当前用户下是否存在该任务
    const todo = await this.todoRepository.findOne({
      where: { id, user_id: user.id },
    });

    if (!todo) {
      throw new BusinessException(ErrorCode.NULL_ERROR, '待办事项不存在');
    }

    // ✅ 获取所有子任务（递归）
    const collectAllDescendants = async (
      parentId: string,
    ): Promise<string[]> => {
      const children = await this.todoRepository.find({
        where: { parent_id: parentId, user_id: user.id },
      });

      const descendantIds: string[] = [];
      for (const child of children) {
        descendantIds.push(child.id);
        const subDescendants = await collectAllDescendants(child.id);
        descendantIds.push(...subDescendants);
      }
      return descendantIds;
    };

    const allDescendantIds = await collectAllDescendants(id);

    // ✅ 删除所有子项
    if (allDescendantIds.length > 0) {
      await this.todoRepository.delete(allDescendantIds);
    }

    // ✅ 删除自身
    await this.todoRepository.delete(id);
  }

  async findChildren(parentId: string): Promise<TodoItem[]> {
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    return this.todoRepository.find({
      where: { parent_id: parentId, user_id: user.id },
      order: { order: 'ASC', created_at: 'DESC' },
    });
  }

  async updateOrder(updateOrderDto: UpdateTodoOrderDto): Promise<void> {
    const user = getLoginUser();
    if (!user) {
      throw new BusinessException(ErrorCode.NOT_LOGIN);
    }

    const { items } = updateOrderDto;

    // 验证所有待办事项是否存在且属于当前用户
    const todoIds = items.map((item) => item.id);
    const todos = await this.todoRepository.find({
      where: { id: In(todoIds), user_id: user.id },
    });

    if (todos.length !== todoIds.length) {
      throw new BusinessException(
        ErrorCode.PARAMS_ERROR,
        '存在无效的待办事项ID',
      );
    }

    // 批量更新排序
    const promises = items.map((item) => {
      return this.todoRepository.update(
        { id: item.id, user_id: user.id },
        { order: item.order },
      );
    });

    await Promise.all(promises);
  }

  async findUpcomingReminders(): Promise<TodoItem[]> {
    // 查找未完成且有提醒时间的待办事项
    // 提醒时间在当前时间之后的15分钟内
    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

    return this.todoRepository.find({
      where: {
        done: false,
        reminder_at: Between(now, fifteenMinutesLater),
      },
      relations: ['user'],
    });
  }

  async findDueReminders(): Promise<TodoItem[]> {
    // 查找未完成且提醒时间已过期的待办事项
    const now = new Date();

    return this.todoRepository.find({
      where: {
        done: false,
        reminder_at: LessThan(now),
      },
      relations: ['user'],
    });
  }
}
