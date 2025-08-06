import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDate, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PriorityLevel } from '../../enums/priorityEnum';

export class UpdateTodoDto {
  @ApiProperty({ description: '标题', example: '完成项目文档', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '是否完成', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @ApiProperty({ description: '优先级', enum: PriorityLevel, example: PriorityLevel.HIGH, required: false })
  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel; // 0: 低, 1: 中, 2: 高

  @ApiProperty({ description: '是否展开', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  expanded?: boolean;

  @ApiProperty({ description: '父级ID', required: false })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({ description: '排序顺序', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  order?: number;

  @ApiProperty({ description: '提醒时间', required: false, type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  reminder_at?: Date;
}