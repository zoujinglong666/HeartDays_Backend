import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Gender } from '../../enums/genderEnum';

export class UpdateUserDto {
  @ApiProperty({
    description: '用户ID',
    example: '1234567890',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: '用户名',
    example: '张三',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: '用户名至少2个字符' })
  name: string;

  @ApiProperty({
    description: '用户账号',
    example: 'zhangsan',
    minLength: 4,
    maxLength: 20,
  })
  @IsString()
  @MinLength(4, { message: '账号至少4个字符' })
  @MaxLength(20, { message: '账号最多20个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '账号只能包含字母、数字和下划线' })
  userAccount: string;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;


  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;


  @IsOptional()
  gender?: Gender;




}
