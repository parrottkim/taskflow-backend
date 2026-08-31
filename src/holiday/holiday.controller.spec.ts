import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';

describe('HolidayController', () => {
  const holidayService = {
    getHolidays: jest.fn(),
    getHolidaysBetween: jest.fn(),
    getDaysOffBetween: jest.fn(),
  } as unknown as HolidayService;

  let controller: HolidayController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HolidayController(holidayService);
  });

  it('delegates a monthly holiday query', async () => {
    const holidays = [
      {
        date: new Date('2026-05-05T00:00:00.000Z'),
        name: '어린이날',
      },
    ];
    (holidayService.getHolidays as jest.Mock).mockResolvedValue(holidays);

    await expect(
      controller.getHolidays({ year: 2026, month: 5 }),
    ).resolves.toEqual(holidays);
    expect(holidayService.getHolidays).toHaveBeenCalledWith(2026, 5);
  });

  it('delegates a ranged holiday query', async () => {
    (holidayService.getHolidaysBetween as jest.Mock).mockResolvedValue([]);

    await expect(
      controller.getHolidaysBetween({
        start: '2026-05-01',
        end: '2026-05-31',
      }),
    ).resolves.toEqual([]);
    expect(holidayService.getHolidaysBetween).toHaveBeenCalledWith(
      '2026-05-01',
      '2026-05-31',
    );
  });

  it('delegates a ranged days-off query', async () => {
    (holidayService.getDaysOffBetween as jest.Mock).mockResolvedValue([]);

    await expect(
      controller.getDaysOffBetween({
        start: '2026-05-01',
        end: '2026-05-31',
      }),
    ).resolves.toEqual([]);
    expect(holidayService.getDaysOffBetween).toHaveBeenCalledWith(
      '2026-05-01',
      '2026-05-31',
    );
  });
});
