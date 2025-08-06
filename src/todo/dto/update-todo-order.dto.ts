import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TodoOrderItem {
  @ApiProperty({ description: '待办事项ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '排序顺序' })
  @IsNumber()
  order: number;
}

export class UpdateTodoOrderDto {
  @ApiProperty({ description: '待办事项排序列表', type: [TodoOrderItem] })
  @ValidateNested({ each: true })
  @Type(() => TodoOrderItem)
  items: TodoOrderItem[];
}