import { ScheduleCalendarClient } from './schedule-calendar.client';

describe('ScheduleCalendarClient', () => {
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

  const createClient = () => {
    const service = Object.create(
      ScheduleCalendarClient.prototype,
    ) as ScheduleCalendarClient;
    const events = {
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    (
      service as unknown as {
        client: { events: typeof events };
        calendarId: string;
      }
    ).client = { events };
    (
      service as unknown as {
        calendarId: string;
      }
    ).calendarId = 'calendar-id';

    return { service, events };
  };

  it('동일한 eventId가 이미 있으면 생성 재시도를 성공으로 처리한다', async () => {
    const { service, events } = createClient();
    events.insert.mockRejectedValue({ code: 409 });

    await expect(
      service.createEvent('taskfl0event', payload),
    ).resolves.toBeUndefined();
  });

  it('수정할 이벤트가 없으면 같은 eventId로 다시 생성한다', async () => {
    const { service, events } = createClient();
    events.update.mockRejectedValueOnce({ code: 404 });
    events.insert.mockResolvedValue(undefined);

    await service.updateEvent('taskfl0event', payload);

    expect(events.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ id: 'taskfl0event' }),
      }),
    );
  });

  it('이미 삭제된 이벤트는 삭제 성공으로 처리한다', async () => {
    const { service, events } = createClient();
    events.delete.mockRejectedValue({ code: 410 });

    await expect(service.deleteEvent('taskfl0event')).resolves.toBeUndefined();
  });
});
