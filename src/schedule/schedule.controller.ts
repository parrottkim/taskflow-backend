import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ScheduleDto, ScheduleListDto } from './dto/schedule';
import { CreateScheduleDto } from './dto/create-schedule';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { ScheduleCategoryDto } from './dto/schedule-category';
import { UpdateScheduleDto } from './dto/update-schedule';
import { GetSchedulesDto } from './dto/get-schedules';
import { ScheduleEditGuard } from '@/common/guards/schedule-edit.guard';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';

@ApiTags('Schedule (일정)')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 카테고리 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [ScheduleCategoryDto],
  })
  @Get('categories')
  async getAllCategories() {
    return this.scheduleService.getAllCategories();
  }

  @UseGuards(JwtAccessAuthGuard, ScheduleEditGuard)
  @ApiOperation({ summary: '일정 수정용 데이터 조회' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ScheduleDto,
  })
  @Get(':id/edit')
  async getScheduleForEdit(@Param('id', ParseIntPipe) id: number) {
    return await this.scheduleService.getSchedule(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '일정 단일 조회' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ScheduleDto,
  })
  @Get(':id')
  async getSchedule(@Param('id', ParseIntPipe) id: number) {
    return await this.scheduleService.getSchedule(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '일정 가져오기' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ScheduleListDto,
  })
  @Get()
  async getSchedules(@Query() query: GetSchedulesDto) {
    return await this.scheduleService.getScheduleWithUsers(query);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '일정 추가하기' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ScheduleDto,
  })
  @Post()
  async createSchedule(@Request() req, @Body() body: CreateScheduleDto) {
    return await this.scheduleService.createSchedule(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '일정 수정하기' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ScheduleDto,
  })
  @Patch(':id')
  async updateSchedule(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateScheduleDto,
  ) {
    return await this.scheduleService.updateSchedule(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '프로젝트 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  @HttpCode(200)
  async deleteSchedule(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.deleteSchedule(req.user, id);
  }
}
