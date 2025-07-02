import { IsEmail, IsString, MinLength, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseDto } from '../../common/dto/base.dto';

export class CreateUserDto extends BaseDto {
  // @ApiProperty({
  //   description: '用户名',
  //   example: '张三',
  //   minLength: 2,
  // })
  // @IsString()
  // @MinLength(2, { message: '用户名至少2个字符' })
  // name: string;

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

  @ApiProperty({
    description: '邮箱地址',
    example: 'zhangsan@example.com',
    required: false, // 👈 显式设置为非必填
  })
  @IsOptional() // 👈 非必填：如果没传就跳过验证
  @IsEmail({}, { message: '请输入有效的邮箱地址' }) // 👈 如果传了，就验证格式
  email?: string;


  @ApiProperty({
    description: '密码',
    example: '123456',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
} 