
import { IsOptional, IsInt, } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginateDto } from '../../common/dto/paginate.dto';

export class PlanQueryDto extends PaginateDto {
  @IsOptional()
  userId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number;

}
