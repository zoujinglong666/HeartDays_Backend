import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ApiProperty({ description: '用户ID', required: false })
  @Column({ type: 'uuid', nullable: true })
  user_id?: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '计划描述' })
  description?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '计划类别' })
  category?: string;

  @Column({ type: 'smallint', default: 0 })
  status: number; // 0=pending, 1=in_progress, 2=completed

  @Column({ type: 'smallint', default: 1 })
  priority: number; // 0=low, 1=medium, 2=high

  date?: Date;

  @ApiProperty({ description: '提醒时间' })
  reminder_at?: Date;

  @ApiProperty({ description: '完成时间' })
  completed_at?: Date;

  @Column({ nullable: true })
  remarks?: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}