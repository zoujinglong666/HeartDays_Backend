import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {

  @ApiProperty({ description: '用户ID', required: false })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ description: '标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '分类', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ description: '优先级', required: false })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiProperty({ description: '计划日期', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @ApiProperty({ description: '提醒时间', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reminder_at?: Date;

  @ApiProperty({ description: '完成时间', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completed_at?: Date;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}