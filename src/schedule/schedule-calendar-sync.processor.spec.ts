import {
  ScheduleCalendarSync,
  ScheduleCalendarSyncOperation,
  ScheduleCalendarSyncStatus,
} from '@/entity/schedule/schedule-calendar-sync.entity';
import { ScheduleCalendarSyncProcessor } from './schedule-calendar-sync.processor';

describe('ScheduleCalendarSyncProcessor', () => {
  const payload = {
    summary: '출장',
    description: '설명',
    location: '서울',
    colorId: '1',
    start: { date: '2026-09-21' },
    end: { date: '2026-09-22' },
    extendedProperties: {
      shared: { categoryId: '1', owner: 'owner@example.com' },
    },
  };

  const createProcessor = () => {
    const manager = { update: jest.fn().mockResolvedValue(undefined) };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const repository = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    const calendarClient = {
      createEvent: jest.fn().mockResolvedValue(undefined),
      updateEvent: jest.fn().mockResolvedValue(undefined),
      deleteEvent: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new ScheduleCalendarSyncProcessor(
      dataSource as never,
      repository as never,
      calendarClient as never,
    );

    return { processor, dataSource, repository, calendarClient, manager };
  };

  const processClaimed = (
    processor: ScheduleCalendarSyncProcessor,
    sync: ScheduleCalendarSync,
  ) =>
    (
      processor as unknown as {
        processClaimed: (value: ScheduleCalendarSync) => Promise<void>;
      }
    ).processClaimed(sync);

  it('Calendar 생성 성공 후 Outbox를 완료 처리한다', async () => {
    const { processor, calendarClient, manager } = createProcessor();
    const sync = {
      id: 1,
      scheduleId: 10,
      eventId: 'taskfl0event',
      operation: ScheduleCalendarSyncOperation.CREATE,
      attempts: 1,
      payload,
    } as ScheduleCalendarSync;

    await processClaimed(processor, sync);

    expect(calendarClient.createEvent).toHaveBeenCalledWith(
      sync.eventId,
      payload,
    );
    expect(manager.update).toHaveBeenLastCalledWith(
      ScheduleCalendarSync,
      sync.id,
      expect.objectContaining({
        status: ScheduleCalendarSyncStatus.SUCCEEDED,
      }),
    );
  });

  it('Calendar 오류를 저장하고 다음 재시각을 설정한다', async () => {
    const { processor, calendarClient, repository, dataSource } =
      createProcessor();
    calendarClient.updateEvent.mockRejectedValue(new Error('calendar down'));
    const sync = {
      id: 2,
      scheduleId: 10,
      eventId: 'taskfl0event',
      operation: ScheduleCalendarSyncOperation.UPDATE,
      attempts: 2,
      payload,
    } as ScheduleCalendarSync;

    await processClaimed(processor, sync);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      sync.id,
      expect.objectContaining({
        status: ScheduleCalendarSyncStatus.FAILED,
        nextAttemptAt: expect.any(Date),
        lastError: expect.stringContaining('calendar down'),
      }),
    );
  });
});
