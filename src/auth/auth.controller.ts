import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录', description: '通过账号或邮箱登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: '登录成功',
    type: ApiResponseDto<LoginResponseDto>
  })
  @ApiResponse({ status: 401, description: '登录失败' })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
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
}