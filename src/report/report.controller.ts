import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Request,
  Patch,
  Delete,
  Query,
  Response,
  HttpCode,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { TripCategoryDto } from './dto/trip/trip-category';
import { TripStepDto } from './dto/trip/trip-step';
import { TripRegulationDto } from './dto/trip/trip-regulation';
import { CreateReportDto } from './dto/create-report';
import { ReportDto, ReportListDto } from './dto/report';
import { UpdateReportDto } from './dto/update-report';
import { GetReportDto } from './dto/get-report';
import { SendReportMailDto } from './dto/send-report-mail';
import { ReportEditGuard } from '@/common/guards/report-edit.guard';
import { WriteAccessGuard } from '@/common/guards/write-access.guard';
import {
  DailyAllowancePreviewDto,
  PreviewDailyAllowanceDto,
} from './dto/preview-daily-allowance';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 카테고리 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [TripCategoryDto],
  })
  @Get('trip/categories')
  async getAllTripCategories() {
    return this.reportService.getAllTripCategories();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 단계 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [TripStepDto],
  })
  @Get('trip/steps/:id')
  async getAllTripSteps(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.getAllTripSteps(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 단계 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [TripRegulationDto],
  })
  @Get('trip/regulations/:id')
  async getAllTripRegulations(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.getAllTripRegulations(id);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '출장 일비 계산 미리보기' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '국내·해외 출장 일비 계산 결과',
    type: DailyAllowancePreviewDto,
  })
  @Post('trip/daily-allowance/preview')
  previewDailyAllowance(
    @Request() req,
    @Body() body: PreviewDailyAllowanceDto,
  ) {
    return this.reportService.previewDailyAllowance(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '보고서 출력' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Get('trip/export/:id')
  async exportTrip(@Param('id', ParseIntPipe) id: number, @Response() res) {
    const { buffer, filename } = await this.reportService.exportTrip(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @UseGuards(JwtAccessAuthGuard, ReportEditGuard)
  @ApiOperation({ summary: '보고서 수정용 데이터 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ReportDto,
  })
  @Get(':id/edit')
  getReportForEdit(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.getReport(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '보고서 단일 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ReportDto,
  })
  @Get(':id')
  getReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.getReport(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '보고서 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ReportListDto,
  })
  @Get()
  getReports(@Query() query: GetReportDto) {
    return this.reportService.getReports(query);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '실무 결과 메일 전송' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Post('mail/:id')
  sendMail(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SendReportMailDto,
  ) {
    return this.reportService.sendMail(req.user, id, body.userIds);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '보고서 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ReportDto,
  })
  @Post()
  async createReport(@Request() req, @Body() body: CreateReportDto) {
    return this.reportService.createReport(req.user, body);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '보고서 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: ReportDto,
  })
  @Patch(':id')
  updateReport(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateReportDto,
  ) {
    return this.reportService.updateReport(req.user, id, body);
  }

  @UseGuards(JwtAccessAuthGuard, WriteAccessGuard)
  @ApiOperation({ summary: '보고서 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  @HttpCode(200)
  async deleteReport(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.reportService.deleteReport(req.user, id);
  }
}
