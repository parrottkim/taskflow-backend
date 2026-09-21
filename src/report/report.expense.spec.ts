import { plainToInstance } from 'class-transformer';
import { TripActualExpense } from '@/entity/report/trip/trip-actual-expense.entity';
import { TripReport } from '@/entity/report/trip/trip-report.entity';
import { EntityManager } from 'typeorm';
import { TripActualExpenseDto } from './dto/trip/trip-expense';
import { CreateActualExpenseDto } from './dto/create-report';
import { ReportService } from './report.service';

jest.mock('marked', () => ({
  marked: jest.fn(),
}));

describe('ReportService trip expense conversion', () => {
  it('converts each foreign expense to a whole KRW amount', () => {
    const service = Object.create(ReportService.prototype) as ReportService;
    const convert = (
      service as unknown as {
        getExpenseAmountInKrw: (expense: TripActualExpense) => number;
      }
    ).getExpenseAmountInKrw.bind(service);
    const expense = {
      price: 12.34,
      exchangeRate: 1380.5,
    } as TripActualExpense;

    expect(convert(expense)).toBe(17035);
  });

  it('exposes the same rounded KRW amount in the response DTO', () => {
    const expense = plainToInstance(
      TripActualExpenseDto,
      {
        price: 12.34,
        exchangeRate: 1380.5,
        currency: { id: 2, code: 'USD' },
      },
      { excludeExtraneousValues: true },
    );

    expect(expense.convertedPrice).toBe(17035);
  });

  it('reuses an exchange-rate lookup for expenses with the same currency and payment date', async () => {
    const service = Object.create(ReportService.prototype) as ReportService;
    const getExchangeRate = jest.fn().mockResolvedValue({
      rate: 1380.5,
      appliedDate: '2026-08-13',
    });
    (
      service as unknown as {
        currencyService: { getExchangeRate: jest.Mock };
      }
    ).currencyService = { getExchangeRate };

    const usd = { id: 2, code: 'USD' };
    const manager = {
      findBy: jest
        .fn()
        .mockResolvedValueOnce([{ id: 14, requiresExpenseCurrency: true }])
        .mockResolvedValueOnce([usd]),
      findOneBy: jest.fn().mockResolvedValue({ id: 1, code: 'KRW' }),
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(async (entities) => entities),
    } as unknown as EntityManager;
    (
      service as unknown as {
        dataSource: { manager: EntityManager };
      }
    ).dataSource = { manager };
    const prepareTripExpenses = (
      service as unknown as {
        prepareTripExpenses: (
          expenses: CreateActualExpenseDto[],
        ) => Promise<unknown[]>;
      }
    ).prepareTripExpenses.bind(service);
    const saveTripExpenses = (
      service as unknown as {
        saveTripExpenses: (
          entityManager: EntityManager,
          trip: TripReport,
          expenses: unknown[],
        ) => Promise<TripActualExpense[]>;
      }
    ).saveTripExpenses.bind(service);
    const paymentDate = new Date('2026-08-13T00:00:00.000Z');

    const prepared = await prepareTripExpenses([
      { stepId: 14, currencyId: 2, paymentDate, price: 10 },
      { stepId: 14, currencyId: 2, paymentDate, price: 20 },
    ]);
    const expenses = await saveTripExpenses(
      manager,
      { id: 1 } as TripReport,
      prepared,
    );

    expect(getExchangeRate).toHaveBeenCalledTimes(1);
    expect(getExchangeRate).toHaveBeenCalledWith('20260813', 'USD');
    expect(expenses).toHaveLength(2);
    expect(expenses[0]).toMatchObject({
      currency: usd,
      exchangeRate: 1380.5,
      exchangeRateAppliedDate: new Date('2026-08-13T00:00:00.000Z'),
    });
  });

  it('stores the overseas daily-allowance rate using the trip start date and USD', async () => {
    const service = Object.create(ReportService.prototype) as ReportService;
    const getExchangeRate = jest.fn().mockResolvedValue({
      rate: 1380.5,
      appliedDate: '2026-08-13',
    });
    (
      service as unknown as {
        currencyService: { getExchangeRate: jest.Mock };
      }
    ).currencyService = { getExchangeRate };

    const manager = {
      create: jest.fn((_entity, payload) => payload),
      save: jest.fn(async (entity) => entity),
    } as unknown as EntityManager;
    const resolveExchangeRate = (
      service as unknown as {
        resolveTripDailyAllowanceExchangeRate: (schedule: {
          start: string;
          category: { id: number };
        }) => Promise<{ rate: number; appliedDate: string }>;
      }
    ).resolveTripDailyAllowanceExchangeRate.bind(service);
    const saveExchangeRate = (
      service as unknown as {
        saveTripDailyAllowanceExchangeRate: (
          manager: EntityManager,
          trip: TripReport,
          snapshot: { rate: number; appliedDate: string },
        ) => Promise<unknown>;
      }
    ).saveTripDailyAllowanceExchangeRate.bind(service);

    const snapshot = await resolveExchangeRate({
      start: '2026-08-13',
      category: { id: 2 },
    });
    const exchangeRate = await saveExchangeRate(
      manager,
      { id: 1 } as TripReport,
      snapshot,
    );

    expect(getExchangeRate).toHaveBeenCalledWith('20260813', 'USD');
    expect(exchangeRate).toMatchObject({
      rate: 1380.5,
      appliedDate: '2026-08-13',
    });
  });
});
