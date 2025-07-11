import { DeviceInfoDto } from '../dto/device-info.dto';

export function parseDeviceInfo(userAgent: string, ip: string): DeviceInfoDto {
  const deviceInfo: DeviceInfoDto = {
    userAgent,
    ip,
    timestamp: new Date().toISOString(),
  };

  // 简单的设备类型检测
  if (userAgent) {
    const ua = userAgent.toLowerCase();
    
    // 检测移动设备
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
      deviceInfo.deviceType = 'mobile';
    } else if (ua.includes('tablet')) {
      deviceInfo.deviceType = 'tablet';
    } else {
      deviceInfo.deviceType = 'desktop';
    }

    // 检测操作系统
    if (ua.includes('windows')) {
      deviceInfo.os = 'Windows';
    } else if (ua.includes('mac os')) {
      deviceInfo.os = 'macOS';
    } else if (ua.includes('linux')) {
      deviceInfo.os = 'Linux';
    } else if (ua.includes('android')) {
      deviceInfo.os = 'Android';
    } else if (ua.includes('ios')) {
      deviceInfo.os = 'iOS';
    }

    // 检测浏览器
    if (ua.includes('chrome')) {
      deviceInfo.browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      deviceInfo.browser = 'Firefox';
    } else if (ua.includes('safari')) {
      deviceInfo.browser = 'Safari';
    } else if (ua.includes('edge')) {
      deviceInfo.browser = 'Edge';
    }
  }

  return deviceInfo;
} 