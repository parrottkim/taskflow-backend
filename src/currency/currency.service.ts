import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import config from '@/config/config';
import { firstValueFrom } from 'rxjs';
import { Currency } from '@/entity/currency/currency.entity';
import { Repository } from 'typeorm';
import { CurrencyDto } from './dto/currency';
import dayjs from 'dayjs';
import { ExchangeRateApiResponse } from './currency.types';

@Injectable()
export class CurrencyService {
  private readonly MAX_FALLBACK_DAYS = 10;

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {}

  async findAllCurrencies() {
    return await this.currencyRepository.find();
  }

  async findCurrencyById(id: number) {
    return await this.currencyRepository.findOne({ where: { id: id } });
  }

  async findCurrencyByCode(code: string) {
    return await this.currencyRepository.findOne({ where: { code } });
  }

  async getAllCurrencies() {
    const currencies = await this.findAllCurrencies();

    const result = plainToInstance(CurrencyDto, currencies, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  async getCurrency(id: number) {
    const currency = await this.findCurrencyById(id);

    const result = plainToInstance(CurrencyDto, currency, {
      excludeExtraneousValues: true,
    });

    return result;
  }

  private toDateCursor(date: string) {
    if (!/^\d{8}$/.test(date)) {
      throw new BadRequestException('bad_request_exchange_date_invalid');
    }

    const parsedDate = dayjs(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
    );

    if (!parsedDate.isValid()) {
      throw new BadRequestException('bad_request_exchange_date_invalid');
    }

    return parsedDate;
  }

  async getExchangeRate(date: string, currency: string = 'USD') {
    const url = this.configService.exchange.url;
    const apiKey = this.configService.exchange.key;

    try {
      const currencyEntity = await this.findCurrencyByCode(currency);

      if (!currencyEntity) {
        throw new BadRequestException('bad_request_currency_invalid');
      }

      let cursor = this.toDateCursor(date);

      const attemptedDates: string[] = [];

      for (let attempt = 0; attempt < this.MAX_FALLBACK_DAYS; attempt += 1) {
        const searchDate = cursor.format('YYYYMMDD');
        attemptedDates.push(searchDate);

        const response = await firstValueFrom(
          this.httpService.get<ExchangeRateApiResponse>(url, {
            params: {
              authkey: apiKey,
              searchdate: searchDate,
              data: 'AP01',
            },
          }),
        );

        const allRates = response.data;

        if (!Array.isArray(allRates) || allRates.length === 0) {
          cursor = cursor.subtract(1, 'day');
          continue;
        }

        const firstItem = allRates[0];
        const resultValue =
          typeof firstItem.result === 'string'
            ? parseInt(firstItem.result, 10)
            : firstItem.result;

        if (resultValue !== 1) {
          const errorCode = resultValue || 'UNKNOWN';
          let errorMessage = `API 조회 실패 (코드: ${errorCode}).`;

          if (errorCode === 3) errorMessage = '인증키 오류';
          else if (errorCode === 4) errorMessage = '일자 오류';

          console.error(`환율 정보 조회 실패: ${errorMessage}`);
          throw new InternalServerErrorException(
            'internal_server_error_exchange_api_request_failed',
          );
        }

        const currencyRate = allRates.find(
          (item) => item.cur_unit === currencyEntity.code,
        );
        const kftc_deal_bas_r = currencyRate?.kftc_deal_bas_r;

        if (!kftc_deal_bas_r) {
          cursor = cursor.subtract(1, 'day');
          continue;
        }

        const rate = parseFloat(kftc_deal_bas_r.replace(/,/g, ''));

        if (!Number.isNaN(rate)) {
          return {
            rate,
            appliedDate: cursor.format('YYYY-MM-DD'),
          };
        }

        cursor = cursor.subtract(1, 'day');
      }

      throw new NotFoundException('not_found_exchange');
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        throw error;
      }

      console.error(
        'API 호출 중 예기치 않은 오류 발생:',
        error instanceof Error ? error.message : error,
      );

      throw new InternalServerErrorException(
        'internal_server_error_exchange_processing_failed',
      );
    }
  }
}
