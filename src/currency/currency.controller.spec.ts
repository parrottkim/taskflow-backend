import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { GetExchangeRateDto } from './dto/currency';

describe('CurrencyController', () => {
  function createModule() {
    const getExchangeRate = jest.fn().mockResolvedValue({
      rate: 1380.5,
      appliedDate: '2026-08-13',
    });

    return {
      getExchangeRate,
      moduleBuilder: Test.createTestingModule({
        controllers: [CurrencyController],
        providers: [
          {
            provide: CurrencyService,
            useValue: { getExchangeRate },
          },
        ],
      }),
    };
  }

  it('resolves controller dependencies', async () => {
    const { moduleBuilder } = createModule();
    const moduleRef = await moduleBuilder.compile();

    expect(moduleRef.get(CurrencyController)).toBeDefined();

    await moduleRef.close();
  });

  it('validates the exchange date query as a date string', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });

    const query = await pipe.transform(
      { date: '2026-08-13' },
      { type: 'query', metatype: GetExchangeRateDto },
    );

    expect(query).toMatchObject({
      date: '2026-08-13',
      currency: 'USD',
    });
  });

  it('passes the exchange date to the service as a Date', async () => {
    const { getExchangeRate, moduleBuilder } = createModule();
    const moduleRef = await moduleBuilder.compile();
    const controller = moduleRef.get(CurrencyController);

    await controller.getRate({ date: '2026-08-13', currency: 'USD' });

    expect(getExchangeRate).toHaveBeenCalledWith(
      new Date('2026-08-13T00:00:00.000Z'),
      'USD',
    );

    await moduleRef.close();
  });
});
