import { plainToInstance } from 'class-transformer';
import { TripActualExpense } from '@/entity/report/trip/trip-actual-expense.entity';
import { TripActualExpenseDto } from './dto/trip/trip-expense';
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
});
