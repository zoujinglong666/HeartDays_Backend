import { ApiProperty } from '@nestjs/swagger';

export class DeviceInfoDto {
  @ApiProperty({ description: '用户代理字符串' })
  userAgent?: string;

  @ApiProperty({ description: 'IP地址' })
  ip?: string;

  @ApiProperty({ description: '登录时间戳' })
  timestamp?: string;

  @ApiProperty({ description: '设备类型', required: false })
  deviceType?: string;

  @ApiProperty({ description: '操作系统', required: false })
  os?: string;

  @ApiProperty({ description: '浏览器', required: false })
  browser?: string;
} 