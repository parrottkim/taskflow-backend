import { of } from 'rxjs';
import { CurrencyService } from './currency.service';

describe('CurrencyService', () => {
  function createService() {
    const httpService = {
      get: jest.fn().mockReturnValue(
        of({
          data: [
            {
              result: 1,
              cur_unit: 'USD',
              kftc_deal_bas_r: '1,380.50',
            },
          ],
        }),
      ),
    };
    const currencyRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 2, code: 'USD' }),
    };
    const configService = {
      exchange: {
        url: 'https://exchange.example',
        key: 'exchange-key',
      },
    };

    return {
      service: new CurrencyService(
        httpService as never,
        currencyRepository as never,
        configService as never,
      ),
      httpService,
    };
  }

  it('normalizes a Date to the exchange API search date', async () => {
    const { service, httpService } = createService();

    const snapshot = await service.getExchangeRate(
      new Date('2026-08-13T00:00:00.000Z'),
      'USD',
    );

    expect(httpService.get).toHaveBeenCalledWith('https://exchange.example', {
      params: {
        authkey: 'exchange-key',
        searchdate: '20260813',
        data: 'AP01',
      },
    });
    expect(snapshot).toEqual({
      rate: 1380.5,
      appliedDate: '2026-08-13',
    });
  });

  it('rejects an invalid Date', async () => {
    const { service, httpService } = createService();

    await expect(service.getExchangeRate(new Date('invalid'))).rejects.toThrow(
      'bad_request_exchange_date_invalid',
    );
    expect(httpService.get).not.toHaveBeenCalled();
  });
});
