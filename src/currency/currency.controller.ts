import { Controller, UseGuards, HttpStatus, Get, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiHeader,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAccessAuthGuard } from '@/common/guards/jwt-access-auth.guard';
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
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: ['USD', 'CNH', 'EUR'],
    default: 'USD',
  })
  @Get('exchange')
  async getRate(
    @Query('date') date: string,
    @Query('currency') currency: string = 'USD',
  ) {
    const snapshot = await this.currencyService.getExchangeRate(date, currency);
    return snapshot.rate;
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
