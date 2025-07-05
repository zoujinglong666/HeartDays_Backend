import { IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';




export class UpdateStatusDto {
  @Transform(({ value }) => value.toString())
  @IsString()
  id: string;

  @IsNumber()
  status: number;
}