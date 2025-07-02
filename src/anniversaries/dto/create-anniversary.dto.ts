import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean, IsIn, IsUUID } from 'class-validator';

export class CreateAnniversaryDto {
  @ApiProperty({ description: '标题' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '日期' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '图标' })
  @IsString()
  icon: string;

  @ApiPropertyOptional({ description: '颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: '类型' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: '是否置顶', default: false })
  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @ApiPropertyOptional({ description: '是否高亮', default: false })
  @IsOptional()
  @IsBoolean()
  is_highlighted?: boolean;

  @ApiPropertyOptional({
    description: '重复类型',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  repetitive_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsUUID()
  user_id: string;



}