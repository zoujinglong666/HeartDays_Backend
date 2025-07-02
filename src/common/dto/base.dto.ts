import { IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class BaseDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;
} 