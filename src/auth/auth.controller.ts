import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards, UnauthorizedException, Get } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../user/dto/login.dto';
import { Public } from './decorators/public.decorator';
import { ApiResponseDto, LoginResponseDto } from '../common/dto/api-response.dto';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { Request } from 'express';
import { parseDeviceInfo } from './utils/device-parser.util';
import { RefreshTokenDto, TokenResponseDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录', description: '通过账号或邮箱登录，支持单设备登录和双token模式' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: '登录成功',
    type: ApiResponseDto<TokenResponseDto>
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    // 获取并解析设备信息
    const deviceInfo = parseDeviceInfo(req.headers['user-agent'] || '', req.ip || req.connection.remoteAddress || '');
    
    const tokenResponse = await this.authService.login(loginDto, deviceInfo, req);
    
    // 从JWT中提取用户ID
    const userId = this.authService.getUserIdFromToken(tokenResponse.access_token);
    const userInfo = await this.authService.getUserInfo(userId);
    
    return {
      ...tokenResponse,
      user: userInfo,
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册', description: '注册新用户' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ 
    status: 201, 
    description: '注册成功',
    type: ApiResponseDto<LoginResponseDto>
  })
  @ApiResponse({ status: 409, description: '账号或邮箱已存在' })
  async register(@Body() registerUserDto: RegisterUserDto) {
    return await this.authService.register(registerUserDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌', description: '使用刷新令牌获取新的访问令牌' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ 
    status: 200, 
    description: '刷新成功',
    type: ApiResponseDto<TokenResponseDto>
  })
  @ApiResponse({ status: 401, description: '刷新令牌无效' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    return await this.authService.refreshToken(refreshTokenDto, req);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出', description: '登出当前设备，使会话失效' })
  @ApiResponse({ 
    status: 200, 
    description: '登出成功'
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async logout(@Req() req: Request) {
    console.log('有用户正在悄悄登出', req.user);
    const user = req.user as any;
    const userId = user?.sub || user?.id;
    if (!userId) {
      throw new UnauthorizedException('用户信息无效');
    }
    
    await this.authService.logout(userId);
    return { message: '登出成功' };
  }

  @Get('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取当前会话信息', description: '获取当前设备的会话信息' })
  @ApiResponse({ 
    status: 200, 
    description: '获取成功'
  })
  @ApiResponse({ status: 401, description: '未授权' })
  async getSession(@Req() req: Request) {
    const user = req.user as any;
    const userId = user?.sub || user?.id;
    if (!userId) {
      throw new UnauthorizedException('用户信息无效');
    }
    
    const session = await this.authService.getUserSession(userId);
    return { session };
  }
}