import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodoQueryDto } from './dto/todo-query.dto';
import { UpdateTodoStatusDto } from './dto/update-todo-status.dto';
import { UpdateTodoOrderDto } from './dto/update-todo-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeleteDto } from '../common/dto/delete.dto';

@ApiTags('todos')
@ApiBearerAuth()
@Controller('todos')
@UseGuards(AuthGuard('jwt'))
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post("add")
  @ApiOperation({ summary: '创建待办事项' })
  create(@Body() createTodoDto: CreateTodoDto) {
    return this.todoService.create(createTodoDto);
  }

  @Get("list")
  @ApiOperation({ summary: '获取待办事项列表' })
  findAll(@Query() queryDto: TodoQueryDto) {
    return this.todoService.findAll(queryDto);
  }

  @Get('get/:id')
  @ApiOperation({ summary: '获取单个待办事项' })
  findOne(@Param('id') id: string) {
    return this.todoService.findOne(id);
  }

  @Get('get/:id/children')
  @ApiOperation({ summary: '获取子待办事项' })
  findChildren(@Param('id') id: string) {
    return this.todoService.findChildren(id);
  }

  @Post('update')
  @ApiOperation({ summary: '更新待办事项' })
  update( @Body() updateTodoDto: UpdateTodoDto) {
    return this.todoService.update(updateTodoDto.id, updateTodoDto);
  }

  @Post('status')
  @ApiOperation({ summary: '更新待办事项状态' })
  updateStatus(@Body() updateStatusDto: UpdateTodoStatusDto) {
    return this.todoService.updateStatus(updateStatusDto);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除待办事项' })
  remove(@Body() deleteDto: DeleteDto) {
    return this.todoService.remove(deleteDto.id);
  }

  @Post('order')
  @ApiOperation({ summary: '更新待办事项排序' })
  updateOrder(@Body() updateOrderDto: UpdateTodoOrderDto) {
    return this.todoService.updateOrder(updateOrderDto);
  }

  @Get('reminders/upcoming')
  @ApiOperation({ summary: '获取即将到期的提醒' })
  findUpcomingReminders() {
    return this.todoService.findUpcomingReminders();
  }

  @Get('reminders/due')
  @ApiOperation({ summary: '获取已过期的提醒' })
  findDueReminders() {
    return this.todoService.findDueReminders();
  }
}