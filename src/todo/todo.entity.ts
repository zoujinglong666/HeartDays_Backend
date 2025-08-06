import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../user/user.entity';
import { PriorityLevel } from '../enums/priorityEnum';

@Entity('todo_items')
export class TodoItem {
  @ApiProperty({ description: '待办事项ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '用户ID' })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ description: '标题' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({ description: '是否完成' })
  @Column({ default: false })
  done: boolean;

  @ApiProperty({ description: '优先级', enum: PriorityLevel, default: PriorityLevel.MEDIUM })
  @Column({ type: 'smallint', default: PriorityLevel.MEDIUM })
  priority: PriorityLevel; // 0: 低, 1: 中, 2: 高

  @ApiProperty({ description: '是否展开' })
  @Column({ default: true })
  expanded: boolean;

  @ApiProperty({ description: '父级ID', required: false })
  @Column({ nullable: true })
  parent_id: string;

  @ApiProperty({ description: '排序顺序', default: 0 })
  @Column({ default: 0 })
  order: number;

  @ApiProperty({ description: '提醒时间', required: false })
  @Column({ type: 'timestamp', nullable: true })
  reminder_at: Date;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => TodoItem, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: TodoItem;
}