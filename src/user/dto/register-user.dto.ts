import {  IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../common/dto/base.dto';

export class RegisterUserDto extends BaseDto {


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



  @IsString()
  email: string;


  @ApiProperty({
    description: '密码',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;

  @ApiProperty({
    description: '密码',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: '确认密码至少6个字符' })
  confirmPassword: string;
}