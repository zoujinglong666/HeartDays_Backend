import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

// date、reminder_at、completed_at 缺少 @Column()，导致 实体属性未注册，查询会报错；
//
// 这些时间字段建议使用 type: 'timestamp'，方便存储日期时间；
//
// nullable: true 允许字段为空；
//
// 建议所有实体字段都明确加 @Column()，除非用特殊列装饰器(@CreateDateColumn 等)；
//
// @ApiProperty() 是 Swagger 文档相关，不影响 ORM 功能，但写上有助于自动生成接口文档。
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

  // ⚠️ 你缺少这几个 @Column 装饰器，必须补上才能被 TypeORM 识别

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '计划日期', required: false })
  date?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '提醒时间', required: false })
  reminder_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '完成时间', required: false })
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
