import { IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({
    description: '用户账号',
    example: 'zhangsan',
  })
  @ValidateIf(o => !o.email)
  @IsString({ message: '账号不能为空' })
  userAccount?: string;

  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'zhangsan@example.com',
  })
  @ValidateIf(o => !o.userAccount)
  @IsString({ message: '邮箱不能为空' })
  email?: string;

  @ApiProperty({
    description: '密码',
    example: '123456',
  })
  @IsString({ message: '密码不能为空' })
  password: string;
} 