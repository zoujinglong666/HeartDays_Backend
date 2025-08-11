import { IsUUID } from 'class-validator';

export class DeleteDto {
  @IsUUID()
  id: string;
}