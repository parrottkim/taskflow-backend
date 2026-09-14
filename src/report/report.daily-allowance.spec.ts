import { User } from '@/entity/user/user.entity';
import { ReportService } from './report.service';

jest.mock('marked', () => ({
  marked: jest.fn(),
}));

describe('ReportService daily allowance preview', () => {
  const createService = ({
    categoryId,
    regulations,
    holidays,
    exchangeRate = 1,
    start = new Date('2026-08-13T00:00:00.000Z'),
    end = new Date('2026-08-17T00:00:00.000Z'),
  }: {
    categoryId: number;
    regulations: Record<number, number>;
    holidays: Array<{ date: Date; name: string }>;
    exchangeRate?: number;
    start?: Date;
    end?: Date;
  }) => {
    const service = Object.create(ReportService.prototype) as ReportService;
    const dependencies = service as unknown as {
      scheduleService: {
        getSchedule: jest.Mock;
      };
      reportRegulationRepository: {
        findOne: jest.Mock;
      };
      holidayService: {
        getDaysOffBetween: jest.Mock;
        getHolidaysBetween: jest.Mock;
      };
      currencyService: {
        getExchangeRate: jest.Mock;
      };
    };

    dependencies.scheduleService = {
      getSchedule: jest.fn().mockResolvedValue({
        start,
        end,
        category: { id: categoryId },
        holidays: holidays.map((holiday) => ({
          ...holiday,
          date: holiday.date.toISOString().slice(0, 10),
        })),
      }),
    };
    dependencies.reportRegulationRepository = {
      findOne: jest.fn(({ where }) => {
        const rate = regulations[where.step.id];

        return Promise.resolve(
          rate === undefined ? null : { rate, step: { id: where.step.id } },
        );
      }),
    };
    dependencies.holidayService = {
      getDaysOffBetween: jest.fn().mockResolvedValue(holidays),
      getHolidaysBetween: jest.fn().mockResolvedValue(holidays),
    };
    dependencies.currencyService = {
      getExchangeRate: jest.fn().mockResolvedValue({
        rate: exchangeRate,
        appliedDate: '2026-08-13',
      }),
    };

    return service;
  };

  const user = {
    isGuest: false,
    rank: { id: 4 },
  } as unknown as User;

  const executiveUser = {
    isGuest: false,
    rank: { id: 1 },
  } as unknown as User;

  it('calculates a domestic allowance from trip days and holiday inputs', async () => {
    const service = createService({
      categoryId: 1,
      regulations: { 10: 50 },
      holidays: [
        {
          date: new Date('2026-08-15T00:00:00.000Z'),
          name: '광복절',
        },
        {
          date: new Date('2026-08-16T00:00:00.000Z'),
          name: '일요일',
        },
      ],
    });

    await expect(
      service.previewDailyAllowance(user, {
        scheduleId: 123,
        holidays: [
          {
            date: new Date('2026-08-15T00:00:00.000Z'),
            isTravelOnly: false,
          },
          {
            date: new Date('2026-08-16T00:00:00.000Z'),
            isTravelOnly: true,
          },
        ],
      }),
    ).resolves.toEqual({
      totalTripDays: 5,
      domestic: {
        workDays: 1,
        travelDays: 0.5,
      },
      dailyRate: 50,
      dailyAmount: 250,
      deductionRate: 0,
      exchangeRate: 1,
      totalAmount: 250,
      currencyCode: 'KRW',
    });
  });

  it('does not pay a daily allowance for a same-day domestic trip', async () => {
    const tripDate = new Date('2026-08-13T00:00:00.000Z');
    const service = createService({
      categoryId: 1,
      regulations: { 10: 50 },
      holidays: [],
      start: tripDate,
      end: tripDate,
    });

    await expect(
      service.previewDailyAllowance(user, {
        scheduleId: 123,
      }),
    ).resolves.toEqual({
      totalTripDays: 1,
      domestic: {
        workDays: 0,
        travelDays: 0,
      },
      dailyRate: 50,
      dailyAmount: 0,
      deductionRate: 0,
      exchangeRate: 1,
      totalAmount: 0,
      currencyCode: 'KRW',
    });
  });

  it('does not pay a domestic daily allowance to an executive', async () => {
    const service = createService({
      categoryId: 1,
      regulations: { 10: 50 },
      holidays: [],
    });

    await expect(
      service.previewDailyAllowance(executiveUser, {
        scheduleId: 123,
      }),
    ).resolves.toEqual({
      totalTripDays: 5,
      domestic: {
        workDays: 0,
        travelDays: 0,
      },
      dailyRate: 50,
      dailyAmount: 0,
      deductionRate: 0,
      exchangeRate: 1,
      totalAmount: 0,
      currencyCode: 'KRW',
    });
  });

  it('excludes previously stored daily and special-work allowances from same-day domestic calculations', async () => {
    const service = createService({
      categoryId: 1,
      regulations: {},
      holidays: [],
    });
    const calculator = service as unknown as {
      calculateDomesticTripCosts: (report: unknown) => Promise<{
        totalCost: number;
        taxableAmount: number;
        nonTaxableAmount: number;
      }>;
    };

    await expect(
      calculator.calculateDomesticTripCosts({
        schedule: {
          start: new Date('2026-08-13T00:00:00.000Z'),
          end: new Date('2026-08-13T00:00:00.000Z'),
        },
        trip: {
          expenses: [],
          rates: [
            { step: { id: 10 }, rate: 50, days: 1 },
            { step: { id: 11 }, rate: 100, days: 1 },
          ],
          fuel: null,
        },
      }),
    ).resolves.toEqual({
      totalCost: 0,
      taxableAmount: 0,
      nonTaxableAmount: 0,
    });
  });

  it('excludes a special-work allowance from multi-day domestic calculations', async () => {
    const service = createService({
      categoryId: 1,
      regulations: {},
      holidays: [],
    });
    const calculator = service as unknown as {
      calculateDomesticTripCosts: (report: unknown) => Promise<{
        totalCost: number;
        taxableAmount: number;
        nonTaxableAmount: number;
      }>;
    };

    await expect(
      calculator.calculateDomesticTripCosts({
        schedule: {
          start: new Date('2026-08-13T00:00:00.000Z'),
          end: new Date('2026-08-17T00:00:00.000Z'),
        },
        trip: {
          expenses: [],
          rates: [
            { step: { id: 10 }, rate: 50, days: 5 },
            { step: { id: 11 }, rate: 100, days: 1 },
          ],
          fuel: null,
        },
      }),
    ).resolves.toEqual({
      totalCost: 250,
      taxableAmount: 0,
      nonTaxableAmount: 250,
    });
  });

  it('excludes a previously stored domestic daily allowance for an executive', async () => {
    const service = createService({
      categoryId: 1,
      regulations: {},
      holidays: [],
    });
    const calculator = service as unknown as {
      calculateDomesticTripCosts: (report: unknown) => Promise<{
        totalCost: number;
        taxableAmount: number;
        nonTaxableAmount: number;
      }>;
    };

    await expect(
      calculator.calculateDomesticTripCosts({
        createdBy: executiveUser,
        schedule: {
          start: new Date('2026-08-13T00:00:00.000Z'),
          end: new Date('2026-08-17T00:00:00.000Z'),
        },
        trip: {
          expenses: [],
          rates: [{ step: { id: 10 }, rate: 50, days: 5 }],
          fuel: null,
        },
      }),
    ).resolves.toEqual({
      totalCost: 0,
      taxableAmount: 0,
      nonTaxableAmount: 0,
    });
  });

  it('calculates an overseas allowance and derives the deduction from expenses', async () => {
    const service = createService({
      categoryId: 2,
      regulations: { 21: 50, 24: 100 },
      holidays: [
        {
          date: new Date('2026-08-14T00:00:00.000Z'),
          name: '설날',
        },
        {
          date: new Date('2026-08-15T00:00:00.000Z'),
          name: '추석',
        },
      ],
      exchangeRate: 1380,
    });

    await expect(
      service.previewDailyAllowance(user, {
        scheduleId: 123,
        expenses: [{ stepId: 18, price: 100 }],
      }),
    ).resolves.toEqual({
      totalTripDays: 5,
      overseas: {
        days: 2,
        rate: 100,
        amount: 200,
      },
      dailyRate: 50,
      dailyAmount: 250,
      deductionRate: 0.1,
      exchangeRate: 1380,
      totalAmount: 586500,
      currencyCode: 'USD',
    });
  });
});
