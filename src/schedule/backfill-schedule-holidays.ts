import 'reflect-metadata';
import { HttpService } from '@nestjs/axios';
import dayjs from 'dayjs';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { HolidayService } from '@/holiday/holiday.service';

type ScheduleRow = {
  id: number;
  start: Date;
  end: Date;
};

function createDataSource() {
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    namingStrategy: new SnakeNamingStrategy(),
  });
}

function createHolidayService() {
  return new HolidayService(new HttpService(), {
    holiday: {
      url: process.env.HOLIDAY_API_URL,
      key: process.env.HOLIDAY_API_KEY,
    },
  });
}

async function main() {
  const shouldWrite = process.argv.includes('--write');
  const dataSource = createDataSource();
  const holidayService = createHolidayService();

  await dataSource.initialize();
  try {
    const schedules = (await dataSource.query(`
      SELECT schedule.id, schedule.start, schedule.end
      FROM schedule
      LEFT JOIN schedule_holiday
        ON schedule_holiday.schedule_id = schedule.id
      WHERE schedule.category_id = 1
        AND schedule.deleted_at IS NULL
        AND schedule_holiday.id IS NULL
      ORDER BY schedule.id ASC
    `)) as ScheduleRow[];

    console.log(
      `[schedule-holiday-backfill] mode=${
        shouldWrite ? 'write' : 'dry-run'
      } total=${schedules.length}`,
    );

    for (const schedule of schedules) {
      const daysOff = await holidayService.getDaysOffBetween(
        schedule.start,
        schedule.end,
      );

      if (shouldWrite && daysOff.length > 0) {
        await dataSource.transaction(async (manager) => {
          for (const dayOff of daysOff) {
            const name = dayOff.name;
            const type =
              name === '토요일' || name === '일요일'
                ? 'WEEKEND'
                : 'PUBLIC_HOLIDAY';

            await manager.query(
              `
                INSERT INTO schedule_holiday
                  (schedule_id, type, date, name, is_travel_only)
                VALUES ($1, $2, $3, $4, false)
                ON CONFLICT (schedule_id, date) DO NOTHING
              `,
              [
                schedule.id,
                type,
                dayjs(dayOff.date).format('YYYY-MM-DD'),
                name,
              ],
            );
          }
        });
      }

      console.log(
        `scheduleId=${schedule.id} holidayCount=${daysOff.length}`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('[schedule-holiday-backfill] failed', error);
  process.exitCode = 1;
});
