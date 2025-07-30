import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe, ForbiddenException, // 添加这个
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnniversaryService } from './anniversary.service';
import { CreateAnniversaryDto } from './dto/create-anniversary.dto';
import { UpdateAnniversaryDto } from './dto/update-anniversary.dto';
import { Anniversary } from './anniversary.entity';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('anniversaries')
@ApiBearerAuth('JWT-auth')
@Controller('anniversaries')
export class AnniversaryController {
  constructor(private readonly anniversaryService: AnniversaryService) {}

  @Post('create')
  @ApiOperation({ summary: '创建纪念日' })
  @ApiResponse({ status: 200, type: Anniversary })
  async create(
    @Body() dto: CreateAnniversaryDto,
    @CurrentUser('sub') userId: number,
  ) {
    return await this.anniversaryService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '获取所有纪念日' })
  @ApiResponse({ status: 200, type: [Anniversary] })
  async findAll() {
    return await this.anniversaryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个纪念日' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: Anniversary })
  async findOne(@Param('id') id: number) {
    return await this.anniversaryService.findOne(Number(id));
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取指定用户的纪念日列表' })
  @ApiParam({ name: 'userId', type: String, description: '用户UUID' })
  @ApiResponse({ status: 200, type: [Anniversary] })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.anniversaryService.findByUser(userId);
  }

  @Patch('update/:id')
  @ApiOperation({ summary: '更新纪念日' })
  @ApiResponse({ status: 200, type: Anniversary })
  async update(@Param('id') id: number, @Body() dto: UpdateAnniversaryDto) {
    return await this.anniversaryService.update(Number(id), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除纪念日' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('id') id: number,
    @CurrentUser('sub') userId: string,
    @CurrentUser('roles') userRoles: string[],
  ) {
    await this.anniversaryService.remove(Number(id), userId, userRoles);
  }
}
