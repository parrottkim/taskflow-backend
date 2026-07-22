import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import {
  GetWorkIssuesDto,
  GetWorkProjectsDto,
  GetWorkReportsDto,
} from './dto/get-work-items';
import { WorkIssueListDto } from './dto/work-issue';
import { WorkProjectListDto } from './dto/work-project';
import { WorkReportListDto } from './dto/work-report';
import { WorkService } from './work.service';

@ApiTags('Work (업무)')
@Controller('work')
export class WorkController {
  constructor(private readonly workService: WorkService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 담당 프로젝트 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: WorkProjectListDto,
  })
  @Get('projects')
  getProjects(@Request() req, @Query() query: GetWorkProjectsDto) {
    return this.workService.getProjects(req.user, query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 작성 이슈 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: WorkIssueListDto,
  })
  @Get('issues')
  getIssues(@Request() req, @Query() query: GetWorkIssuesDto) {
    return this.workService.getIssues(req.user, query);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '사용자 작성 보고서 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: WorkReportListDto,
  })
  @Get('reports')
  getReports(@Request() req, @Query() query: GetWorkReportsDto) {
    return this.workService.getReports(req.user, query);
  }
}
