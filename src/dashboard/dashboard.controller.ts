import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';
import { GetProjectStatsDto } from './dto/get-project-stats';
import { GetProjectSummaryDto } from './dto/get-project-summary';
import { ProjectStatsListDto } from './dto/project-stats';
import { ProjectSummaryDto } from './dto/project-summary';
import { TodayScheduleDto } from './dto/today-schedule';

@ApiTags('Dashboard (대시보드)')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 현황 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectStatsListDto,
  })
  @Get('project/stats')
  getProjectStats(@Query() value: GetProjectStatsDto) {
    return this.dashboardService.getProjectStats(value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 요약' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ProjectSummaryDto,
  })
  @Get('project/summary')
  getProjectSummary(@Query() value: GetProjectSummaryDto) {
    return this.dashboardService.getProjectSummary(value);
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
    type: [TodayScheduleDto],
  })
  @Get('schedule/today')
  async getTodaySchedules() {
    return await this.dashboardService.getTodaySchedules();
  }
}
