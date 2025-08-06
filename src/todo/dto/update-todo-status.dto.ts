import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

export class UpdateTodoStatusDto {
  @ApiProperty({ description: '待办事项ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: '是否完成' })
  @IsBoolean()
  done: boolean;
}