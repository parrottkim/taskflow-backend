import config from '@/config/config';
import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SearchAddressDto } from './dto/search-address';
import { plainToInstance } from 'class-transformer';
import { AddressListDto } from './dto/address';
import { JusoApiResponse } from './address.types';

@Injectable()
export class AddressService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
  ) {}

  async fetchFromJusoApi(query: SearchAddressDto) {
    const url = this.configService.address.url;
    const apiKey = this.configService.address.key;

    try {
      // HttpService는 Observable을 반환하므로 firstValueFrom을 사용하여 Promise로 변환합니다.
      const { data } = await firstValueFrom(
        this.httpService.get<JusoApiResponse>(url, {
          params: {
            confmKey: apiKey,
            currentPage: query.page,
            countPerPage: query.limit ?? 10,
            keyword: query.search,
            resultType: 'json',
            firstSort: 'road',
            addInfoYn: 'Y',
          },
        }),
      );

      const results = data.results;
      const jusoList = results.juso || [];

      return plainToInstance(AddressListDto, {
        total: parseInt(String(results.common.totalCount ?? 0), 10),
        page: query.page,
        items: jusoList.map((item) => ({
          zipNo: item.zipNo ?? '',
          roadAddr: item.roadAddr ?? '',
          roadAddrPart1: item.roadAddrPart1 ?? '',
          emdNm: item.emdNm ?? '',
          bdNm: item.bdNm ?? '',
          jibunAddr: item.jibunAddr ?? '',
        })),
      });
    } catch (error) {
      // 로깅 및 에러 처리
      console.error('도로명주소 API 호출 실패:', error);
      throw new InternalServerErrorException(
        'internal_server_error_address_api_request_failed',
      );
    }
  }
}
