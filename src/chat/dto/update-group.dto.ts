import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  addUserIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  removeUserIds?: string[];
} 