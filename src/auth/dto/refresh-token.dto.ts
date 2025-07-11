import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: '访问令牌' })
  access_token: string;

  @ApiProperty({ description: '刷新令牌' })
  refresh_token: string;

  @ApiProperty({ description: '会话令牌' })
  session_token: string;

  @ApiProperty({ description: '访问令牌过期时间（秒）' })
  expires_in: number;

  @ApiProperty({ description: '刷新令牌过期时间（秒）' })
  refresh_expires_in: number;
} 