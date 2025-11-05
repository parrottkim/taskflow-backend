import { Controller, UseGuards, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAccessAuthGuard } from 'src/common/guards/jwt-access-auth.guard';
import { CurrencyService } from './currency.service';
import { CurrencyDto } from './dto/currency';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '환율 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: String,
  })
  @Get('exchange')
  async getRate(@Query('date') date: string) {
    return this.currencyService.getExchangeRate(date);
  }

  @UseGuards(JwtAccessAuthGuard)
  @ApiOperation({ summary: '통화 조회' })
  @ApiHeader({ name: 'Authorization', description: 'Access Token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful response',
    type: [CurrencyDto],
  })
  @Get()
  async getAllCurrencies() {
    return this.currencyService.getAllCurrencies();
  }
}
