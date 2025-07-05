import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiProperty({ description: '状态码', example: 200 })
  code: number;

  @ApiProperty({ description: '响应消息', example: 'success' })
  message: string;

  @ApiProperty({ description: '时间戳', example: '2025-06-30T07:28:57.407Z' })
  timestamp: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: '访问令牌' })
  access_token: string;

  @ApiProperty({ description: '用户信息' })
  user: {
    id: string;
    name: string;
    userAccount: string;
    email: string;
    roles: string[];
  };
}

export class UserResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名' })
  name: string;

  @ApiProperty({ description: '用户账号' })
  userAccount: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '头像', required: false })
  avatar?: string;

  @ApiProperty({ description: '用户角色', type: [String] })
  roles: string[];

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
} 