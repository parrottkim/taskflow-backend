import { Schedule } from '@/entity/schedule/schedule.entity';
import { ScheduleService } from './schedule.service';
import dayjs from 'dayjs';

jest.mock('marked', () => ({
  marked: jest.fn(),
}));

describe('ScheduleService schedule holidays', () => {
  const createService = () => {
    const service = Object.create(ScheduleService.prototype) as ScheduleService;
    const holidayService = {
      getDaysOffBetween: jest.fn().mockResolvedValue([
        {
          date: new Date('2026-08-15T00:00:00.000Z'),
          name: '광복절',
        },
        {
          date: new Date('2026-08-16T00:00:00.000Z'),
          name: '일요일',
        },
      ]),
    };

    (
      service as unknown as {
        holidayService: typeof holidayService;
      }
    ).holidayService = holidayService;

    return { service, holidayService };
  };

  const manager = {
    delete: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((_entity, value) => value),
    save: jest.fn((values) => Promise.resolve(values)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const resolveDaysOff = (service: ScheduleService, schedule: Schedule) =>
    (
      service as unknown as {
        resolveScheduleDaysOff: (
          categoryId: number,
          start: Date,
          end: Date,
        ) => Promise<Array<{ date: Date; name: string }>>;
      }
    ).resolveScheduleDaysOff(
      schedule.category.id,
      schedule.start,
      schedule.end,
    );

  it('creates weekends and public holidays for a domestic schedule', async () => {
    const { service, holidayService } = createService();
    const schedule = {
      id: 1,
      category: { id: 1 },
      start: new Date('2026-08-15T00:00:00.000Z'),
      end: new Date('2026-08-16T00:00:00.000Z'),
    } as Schedule;

    const daysOff = await resolveDaysOff(service, schedule);
    const holidays = await (
      service as unknown as {
        syncScheduleHolidays: (
          entityManager: typeof manager,
          target: Schedule,
          preparedDaysOff: Array<{ date: Date; name: string }>,
        ) => Promise<
          Array<{
            date: string;
            type: 'WEEKEND' | 'PUBLIC_HOLIDAY';
            isTravelOnly: boolean;
          }>
        >;
      }
    ).syncScheduleHolidays(manager, schedule, daysOff);

    expect(holidayService.getDaysOffBetween).toHaveBeenCalledWith(
      schedule.start,
      schedule.end,
    );
    expect(holidays).toEqual([
      expect.objectContaining({
        date: new Date('2026-08-15T00:00:00.000Z'),
        type: 'PUBLIC_HOLIDAY',
        isTravelOnly: false,
      }),
      expect.objectContaining({
        date: new Date('2026-08-16T00:00:00.000Z'),
        type: 'WEEKEND',
        isTravelOnly: false,
      }),
    ]);
  });

  it('stores domestic holiday inputs with the schedule', async () => {
    const { service } = createService();
    const schedule = {
      id: 1,
      category: { id: 1 },
      start: new Date('2026-08-15T00:00:00.000Z'),
      end: new Date('2026-08-16T00:00:00.000Z'),
    } as Schedule;

    const daysOff = await resolveDaysOff(service, schedule);
    const holidays = await (
      service as unknown as {
        syncScheduleHolidays: (
          entityManager: typeof manager,
          target: Schedule,
          preparedDaysOff: Array<{ date: Date; name: string }>,
          inputs: Array<{
            date: Date | string;
            isTravelOnly: boolean;
            compensatoryLeaveDate?: Date | string;
          }>,
        ) => Promise<
          Array<{
            date: Date;
            isTravelOnly: boolean;
            compensatoryLeaveDate?: Date;
          }>
        >;
      }
    ).syncScheduleHolidays(manager, schedule, daysOff, [
      {
        date: '2026-08-15',
        isTravelOnly: true,
        compensatoryLeaveDate: '2026-08-20',
      },
      {
        date: '2026-08-16',
        isTravelOnly: false,
      },
    ]);

    expect(holidays).toEqual([
      expect.objectContaining({
        date: new Date('2026-08-15T00:00:00.000Z'),
        isTravelOnly: true,
        compensatoryLeaveDate: dayjs('2026-08-20').toDate(),
      }),
      expect.objectContaining({
        date: new Date('2026-08-16T00:00:00.000Z'),
        isTravelOnly: false,
      }),
    ]);
  });

  it('removes domestic holidays omitted from the update input', async () => {
    const { service } = createService();
    const schedule = {
      id: 1,
      category: { id: 1 },
      start: new Date('2026-08-15T00:00:00.000Z'),
      end: new Date('2026-08-16T00:00:00.000Z'),
    } as Schedule;

    const daysOff = await resolveDaysOff(service, schedule);
    const holidays = await (
      service as unknown as {
        syncScheduleHolidays: (
          entityManager: typeof manager,
          target: Schedule,
          preparedDaysOff: Array<{ date: Date; name: string }>,
          inputs: Array<{ date: Date; isTravelOnly: boolean }>,
        ) => Promise<Array<{ date: Date }>>;
      }
    ).syncScheduleHolidays(manager, schedule, daysOff, [
      {
        date: new Date('2026-08-15T00:00:00.000Z'),
        isTravelOnly: false,
      },
    ]);

    expect(holidays).toHaveLength(1);
    expect(holidays[0].date).toEqual(new Date('2026-08-15T00:00:00.000Z'));
  });

  it('keeps non-domestic schedules free of schedule holidays', async () => {
    const { service, holidayService } = createService();
    const schedule = {
      id: 2,
      category: { id: 2 },
      start: new Date('2026-08-15T00:00:00.000Z'),
      end: new Date('2026-08-16T00:00:00.000Z'),
    } as Schedule;

    const daysOff = await resolveDaysOff(service, schedule);
    const holidays = await (
      service as unknown as {
        syncScheduleHolidays: (
          entityManager: typeof manager,
          target: Schedule,
          preparedDaysOff: Array<{ date: Date; name: string }>,
        ) => Promise<unknown[]>;
      }
    ).syncScheduleHolidays(manager, schedule, daysOff);

    expect(holidays).toEqual([]);
    expect(holidayService.getDaysOffBetween).not.toHaveBeenCalled();
  });
});
