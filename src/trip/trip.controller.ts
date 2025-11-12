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
} from '@nestjs/common';
import { TripService } from './trip.service';
import { ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';
import { TripCategoryDto } from './dto/trip-category';
import { TripStepDto } from './dto/trip-step';
import { TripRegulationDto } from './dto/trip-regulation';
import { CreateTripDto } from './dto/create-trip';
import { TripDto, TripListDto } from './dto/trip';
import { UpdateTripDto } from './dto/update-trip';
import { GetTripDto } from './dto/get-trip';

@Controller('trip')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 카테고리 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [TripCategoryDto],
  })
  @Get('categories')
  async getAllCategories() {
    return this.tripService.getAllCategories();
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 단계 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [TripStepDto],
  })
  @Get('steps/:id')
  async getAllSteps(@Param('id', ParseIntPipe) id: number) {
    return this.tripService.getAllSteps(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '전체 단계 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [TripRegulationDto],
  })
  @Get('regulations/:id')
  async getAllRegulations(@Param('id', ParseIntPipe) id: number) {
    return this.tripService.getAllRegulations(id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '출장 명령서 출력' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Get('export/:id')
  async exportTrip(@Param('id', ParseIntPipe) id: number, @Response() res) {
    const { buffer, filename } = await this.tripService.exportTrip(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '출장 명령서 단일 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: TripDto,
  })
  @Get(':id')
  getTrip(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.tripService.getTripWithUser(req.user, id);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '출장 명령서 목록 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: TripListDto,
  })
  @Get()
  getTrips(@Query() value: GetTripDto) {
    return this.tripService.getTrips(value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '출장 명령서 생성' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: TripDto,
  })
  @Post()
  async createTrip(@Request() req, @Body() value: CreateTripDto) {
    return this.tripService.createTrip(req.user, value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '출장 명령서 수정' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: TripDto,
  })
  @Patch(':id')
  updateTrip(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() value: UpdateTripDto,
  ) {
    return this.tripService.updateTrip(req.user, id, value);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '출장 명령서 삭제' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
  })
  @Delete(':id')
  async deleteTrip(@Param('id', ParseIntPipe) id: number) {
    return this.tripService.deleteTrip(id);
  }
}
