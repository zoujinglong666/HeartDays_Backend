import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateChatSessionDto {
  @IsIn(['single', 'group'])
  type: 'single' | 'group';

  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  userIds: string[]; // 包含自己
} 