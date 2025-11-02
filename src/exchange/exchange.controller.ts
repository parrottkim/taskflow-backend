import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';

@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '프로젝트 단일 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: String,
  })
  @Get()
  async getRate(@Query('date') date: string) {
    return this.exchangeService.getExchangeRate(date);
  }
}
