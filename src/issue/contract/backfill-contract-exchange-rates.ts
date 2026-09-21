import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ContractIssueService } from './contract-issue.service';

async function bootstrap() {
  const shouldWrite = process.argv.includes('--write');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const contractIssueService = app.get(ContractIssueService);
    const result =
      await contractIssueService.backfillContractExchangeRates(!shouldWrite);

    console.log(
      `[contract-exchange-rate-backfill] mode=${
        result.dryRun ? 'dry-run' : 'write'
      } success=${result.total} failed=${result.failures.length}`,
    );

    for (const item of result.items) {
      console.log(
        [
          `contractId=${item.contractId}`,
          `requestedDate=${item.requestedDate}`,
          `appliedDate=${item.appliedDate}`,
          `rate=${item.rate}`,
        ].join(' '),
      );
    }

    for (const failure of result.failures) {
      console.error(
        `contractId=${failure.contractId} failed=${failure.reason}`,
      );
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('[contract-exchange-rate-backfill] failed', error);
  process.exitCode = 1;
});
