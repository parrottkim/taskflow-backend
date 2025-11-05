import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import config from 'config';
import { firstValueFrom } from 'rxjs';
import { Currency } from 'src/entity/issue/currency/currency.entity';
import { Repository } from 'typeorm';
import { CurrencyDto } from './dto/currency';

@Injectable()
export class CurrencyService {
  private readonly BASE_URL =
    'https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON';

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

  /**
   * 한국수출입은행 환율 API를 호출하여 특정 날짜의 데이터를 가져옵니다.
   * API: 환율정보(JSON) 조회
   * @param date 조회할 날짜 (YYYYMMDD 형식, 예: '20200102')
   * @returns Array<any> (환율 데이터 배열)
   */
  async getExchangeRate(date: string): Promise<Array<any>> {
    // 환경 설정에서 API 키를 가져옵니다.
    const apiKey = this.configService.exchange.key;
    if (!apiKey) {
      throw new InternalServerErrorException(
        '환율 API 키가 설정되지 않았습니다.',
      );
    }

    // API 요청에 필요한 쿼리 파라미터 구성
    const params = {
      authkey: apiKey,
      searchdate: date,
      data: 'AP01',
    };

    try {
      // 1. API 호출
      const response = await firstValueFrom(
        this.httpService.get(this.BASE_URL, { params }),
      );

      const allRates: Array<any> = response.data;

      // 2. API 자체 오류 처리 (응답의 첫 번째 항목 확인)
      if (Array.isArray(allRates) && allRates.length > 0) {
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

          throw new InternalServerErrorException(
            `환율 정보 조회 실패: ${errorMessage}`,
          );
        }
      } else {
        // 배열은 받았으나 내용이 비어있는 경우
        throw new NotFoundException(
          'API로부터 환율 데이터를 받지 못했습니다. 🚫',
        );
      }

      // 3. 미국 달러(USD) 데이터 추출
      const usdRate = allRates.find((item) => item.cur_unit === 'USD');

      if (!usdRate) {
        throw new NotFoundException(
          `날짜(${date})에 해당하는 미국 달러(USD) 환율 정보를 찾을 수 없습니다.`,
        );
      }

      // 4. 최종 값(kftc_deal_bas_r) 반환
      const dealBasR = usdRate.kftc_deal_bas_r;

      if (!dealBasR) {
        throw new InternalServerErrorException(
          'USD 환율 데이터에서 kftc_deal_bas_r 필드를 찾을 수 없습니다. ⚙️',
        );
      }

      return dealBasR;
    } catch (error) {
      // 이미 위에서 NestJS Exception으로 처리된 경우 그대로 던지기
      if (error.status) {
        throw error;
      }

      console.error('API 호출 중 예기치 않은 오류 발생:', error.message);

      throw new InternalServerErrorException(
        '환율 정보를 처리하는 데 예상치 못한 오류가 발생했습니다.',
      );
    }
  }
}
