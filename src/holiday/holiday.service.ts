import config from '@/config/config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import dayjs, { Dayjs } from 'dayjs';
import { firstValueFrom } from 'rxjs';
import { HolidayDto } from './dto/holiday';
import { HolidayApiItem, HolidayApiResponse } from './holiday.types';

@Injectable()
export class HolidayService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(config.KEY)
    private readonly configService: Pick<ConfigType<typeof config>, 'holiday'>,
  ) {}

  async getHolidays(year: number, month: number): Promise<HolidayDto[]> {
    this.validateYearMonth(year, month);

    const url = this.configService.holiday.url;
    const serviceKey = this.configService.holiday.key;

    if (!serviceKey) {
      throw new InternalServerErrorException(
        'internal_server_error_holiday_api_not_configured',
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<HolidayApiResponse>(url, {
          params: {
            ServiceKey: serviceKey,
            solYear: String(year),
            solMonth: String(month).padStart(2, '0'),
            pageNo: 1,
            numOfRows: 100,
            _type: 'json',
          },
          timeout: 15000,
        }),
      );

      const response = this.parseResponse(data);
      const resultCode = response.response?.header?.resultCode;

      if (resultCode !== '00') {
        const resultMessage =
          response.response?.header?.resultMsg ?? 'UNKNOWN_ERROR';

        console.error(
          `공휴일 API 오류: ${resultCode ?? 'UNKNOWN'} ${resultMessage}`,
        );
        throw new InternalServerErrorException(
          'internal_server_error_holiday_api_request_failed',
        );
      }

      const items = response.response?.body?.items;

      if (!items || typeof items === 'string' || !items.item) {
        return [];
      }

      const holidayItems = Array.isArray(items.item)
        ? items.item
        : [items.item];

      return holidayItems
        .filter((item) => item.isHoliday === 'Y')
        .map((item) => this.toHoliday(item))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'internal_server_error_holiday_api_request_failed',
      );
    }
  }

  async getHolidaysBetween(
    start: Date | string,
    end: Date | string,
  ): Promise<HolidayDto[]> {
    const startDate = this.toDate(start);
    const endDate = this.toDate(end);

    if (endDate.isBefore(startDate, 'day')) {
      throw new BadRequestException('bad_request_holiday_date_range_invalid');
    }

    const months: Array<{ year: number; month: number }> = [];
    let cursor = startDate.startOf('month');
    const lastMonth = endDate.startOf('month');

    while (
      cursor.isBefore(lastMonth, 'month') ||
      cursor.isSame(lastMonth, 'month')
    ) {
      months.push({
        year: cursor.year(),
        month: cursor.month() + 1,
      });
      cursor = cursor.add(1, 'month');
    }

    const monthlyHolidays = await Promise.all(
      months.map(({ year, month }) => this.getHolidays(year, month)),
    );

    const startKey = startDate.format('YYYY-MM-DD');
    const endKey = endDate.format('YYYY-MM-DD');

    return monthlyHolidays
      .flat()
      .filter((holiday) => {
        const dateKey = this.toDateKey(holiday.date);

        return dateKey >= startKey && dateKey <= endKey;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getDaysOffBetween(
    start: Date | string,
    end: Date | string,
  ): Promise<HolidayDto[]> {
    const startDate = this.toDate(start);
    const endDate = this.toDate(end);

    if (endDate.isBefore(startDate, 'day')) {
      throw new BadRequestException('bad_request_holiday_date_range_invalid');
    }

    const holidays = await this.getHolidaysBetween(start, end);
    const namesByDate = new Map<string, Set<string>>();

    for (const holiday of holidays) {
      const dateKey = this.toDateKey(holiday.date);
      const names = namesByDate.get(dateKey) ?? new Set<string>();
      names.add(holiday.name);
      namesByDate.set(dateKey, names);
    }

    for (
      let cursor = startDate;
      cursor.isBefore(endDate, 'day') || cursor.isSame(endDate, 'day');
      cursor = cursor.add(1, 'day')
    ) {
      const dayOfWeek = cursor.day();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        continue;
      }

      const date = cursor.format('YYYY-MM-DD');

      if (!namesByDate.has(date)) {
        namesByDate.set(date, new Set([dayOfWeek === 6 ? '토요일' : '일요일']));
      }
    }

    return [...namesByDate.entries()]
      .map(([date, names]) => ({
        date: new Date(`${date}T00:00:00.000Z`),
        name: [...names].join(', '),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async isHoliday(date: Date | string): Promise<boolean> {
    const target = this.toDate(date);
    const holidays = await this.getHolidays(target.year(), target.month() + 1);
    const dateKey = target.format('YYYY-MM-DD');

    return holidays.some((holiday) => this.toDateKey(holiday.date) === dateKey);
  }

  private validateYearMonth(year: number, month: number) {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
      throw new BadRequestException('bad_request_holiday_year_invalid');
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('bad_request_holiday_month_invalid');
    }
  }

  private toDate(value: Date | string): Dayjs {
    const date = dayjs(value);

    if (!date.isValid()) {
      throw new BadRequestException('bad_request_holiday_date_invalid');
    }

    return date.startOf('day');
  }

  private toDateKey(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private parseResponse(data: HolidayApiResponse | string): HolidayApiResponse {
    if (typeof data !== 'string') {
      return data;
    }

    try {
      return JSON.parse(data) as HolidayApiResponse;
    } catch {
      throw new InternalServerErrorException(
        'internal_server_error_holiday_api_response_invalid',
      );
    }
  }

  private toHoliday(item: HolidayApiItem): HolidayDto {
    const rawDate = String(item.locdate);

    if (!/^\d{8}$/.test(rawDate)) {
      throw new InternalServerErrorException(
        'internal_server_error_holiday_api_date_invalid',
      );
    }

    const dateKey = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

    return {
      date: new Date(`${dateKey}T00:00:00.000Z`),
      name: item.dateName,
    };
  }
}
