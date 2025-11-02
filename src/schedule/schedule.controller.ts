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
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ScheduleDto, ScheduleListDto } from './dto/schedule';
import { CreateScheduleDto } from './dto/create-schedule';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';
import { ScheduleCategoryDto } from './dto/schedule-category';
import { UpdateScheduleDto } from './dto/update-schedule';
import { GetSchedulesDto } from './dto/get-schedules';

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

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '오늘 일정 가져오기' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Refresh Token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [ScheduleDto],
  })
  @Get('today')
  async getTodaySchedules() {
    return await this.scheduleService.getTodaySchedules();
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
    type: ScheduleDto,
  })
  @Get(':id')
  async getSchedule(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return await this.scheduleService.getScheduleWithUser(req.user, id);
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
  async getSchedules(@Request() req, @Query() value: GetSchedulesDto) {
    return await this.scheduleService.getScheduleWithUsers(req.user, value);
  }

  @UseGuards(JwtAccessAuthGuard)
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
  async createSchedule(@Request() req, @Body() value: CreateScheduleDto) {
    return await this.scheduleService.createSchedule(req.user, value);
  }

  @UseGuards(JwtAccessAuthGuard)
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
    @Body() value: UpdateScheduleDto,
  ) {
    return await this.scheduleService.updateSchedule(req.user, id, value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  async deleteSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.deleteSchedule(id);
  }
}
