import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('anniversaries')
export class Anniversary {
  @ApiProperty({ description: '主键ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '标题' })
  @Column({ length: 100 })
  title: string;

  @ApiProperty({ description: '描述', required: false })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: '日期' })
  @Column({ type: 'timestamp', nullable: true })
  date: string;

  @ApiProperty({ description: '图标' })
  @Column({ length: 10 })
  icon: string;

  @ApiProperty({ description: '颜色', required: false })
  @Column({ length: 20, nullable: true })
  color?: string;

  @ApiProperty({ description: '类型' })
  @Column({ length: 20 })
  type: string;

  @ApiProperty({ description: '是否置顶', default: false })
  @Column({ default: false })
  is_pinned: boolean;

  @ApiProperty({ description: '是否高亮', default: false })
  @Column({ default: false })
  is_highlighted: boolean;

  @ApiProperty({
    description: '重复类型',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: false,
  })
  @Column({
    length: 10,
    nullable: true,
  })
  repetitive_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @ApiProperty({ description: '用户ID', required: false })
  @Column({ type: 'uuid', nullable: true })
  user_id?: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}