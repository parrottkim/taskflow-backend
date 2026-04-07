import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ReportService } from './report.service';

async function bootstrap() {
  const shouldWrite = process.argv.includes('--write');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const reportService = app.get(ReportService);
    const result =
      await reportService.backfillOverseasTripExchangeRates(!shouldWrite);

    console.log(
      `[trip-exchange-rate-backfill] mode=${
        result.dryRun ? 'dry-run' : 'write'
      } total=${result.total}`,
    );

    for (const item of result.items) {
      console.log(
        [
          `reportId=${item.reportId}`,
          `tripId=${item.tripId}`,
          `requestedDate=${item.requestedDate}`,
          `appliedDate=${item.appliedDate}`,
          `rate=${item.rate}`,
        ].join(' '),
      );
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('[trip-exchange-rate-backfill] failed', error);
  process.exitCode = 1;
});
