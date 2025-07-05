import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty({ description: '用户ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '用户名' })
  @Column({ length: 100 })
  name?: string;

  @ApiProperty({ description: '用户账号' })
  @Column({ unique: true, length: 50 })
  @Index()
  userAccount: string;

  @ApiProperty({ description: '邮箱地址' })
  @Column({ unique: true })
  email?: string;

  @ApiProperty({ description: '密码（加密）' })
  @Column()
  @Exclude()
  password: string;

  @ApiProperty({ description: '头像URL', required: false })
  @Column({ nullable: true })
  avatar?: string;

  @ApiProperty({ description: '用户角色', type: [String] })
  @Column({ type: 'simple-array', default: ['user'] })
  roles: string[];

  @ApiProperty({ description: '是否激活' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  @UpdateDateColumn()
  updatedAt: Date;
}
