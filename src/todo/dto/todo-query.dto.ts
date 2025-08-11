import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { PriorityLevel } from '../../enums/priorityEnum';
import { PaginateDto } from '../../common/dto/paginate.dto';

export class TodoQueryDto extends PaginateDto{
  @ApiProperty({ description: '是否完成', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  done?: boolean;

  @ApiProperty({ description: '优先级', enum: PriorityLevel, required: false })
  @IsOptional()
  @IsEnum(PriorityLevel)
  @Type(() => Number)
  priority?: PriorityLevel;

  @ApiProperty({ description: '父级ID', required: false })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '是否有提醒', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  has_reminder?: boolean;

  @ApiProperty({ description: '排序字段', required: false, enum: ['created_at', 'updated_at', 'order', 'reminder_at'] })
  @IsOptional()
  @IsString()
  sort_by?: string = 'order';

  @ApiProperty({ description: '排序方向', required: false, enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sort_direction?: 'ASC' | 'DESC' = 'ASC';
}