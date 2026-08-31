import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetHolidaysBetweenDto, GetHolidaysDto } from './dto/get-holidays';
import { HolidayDto } from './dto/holiday';
import { HolidayService } from './holiday.service';

@ApiTags('holiday')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@Controller('holiday')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @ApiOperation({ summary: '연·월별 대한민국 공휴일 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '조회한 월의 공휴일 목록',
    type: [HolidayDto],
  })
  @Get()
  async getHolidays(@Query() query: GetHolidaysDto) {
    return this.holidayService.getHolidays(query.year, query.month);
  }

  @ApiOperation({ summary: '날짜 범위별 대한민국 공휴일 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '조회 기간에 포함되는 공휴일 목록',
    type: [HolidayDto],
  })
  @Get('range')
  async getHolidaysBetween(@Query() query: GetHolidaysBetweenDto) {
    return this.holidayService.getHolidaysBetween(query.start, query.end);
  }

  @ApiOperation({ summary: '날짜 범위별 공휴일 및 주말 조회' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '조회 기간에 포함되는 공휴일과 토·일요일 목록',
    type: [HolidayDto],
  })
  @Get('days-off')
  async getDaysOffBetween(@Query() query: GetHolidaysBetweenDto) {
    return this.holidayService.getDaysOffBetween(query.start, query.end);
  }
}
