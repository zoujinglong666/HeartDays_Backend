import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';
import { Query } from '@nestjs/common';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post('create')
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @Post('update/status')
  updateStatus(@Body() updateStatusDto: UpdateStatusDto) {
    return this.planService.updateStatus(updateStatusDto);
  }

  @Get('/list')
  findAll() {
    return this.planService.findAll();
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @Patch('update/:id')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(id, updatePlanDto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.planService.remove(id);
  }
  @Get('my/list')
  async findByUser(@Query() planQueryDto: PlanQueryDto) {
    return await this.planService.findByUser(planQueryDto);
  }
}
