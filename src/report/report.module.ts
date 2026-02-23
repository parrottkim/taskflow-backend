import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from 'src/entity/report/report.entity';
import { ReportController } from './report.controller';
import { CurrencyModule } from 'src/currency/currency.module';
import { TripActualExpense } from 'src/entity/report/trip/trip-actual-expense.entity';
import { TripCategory } from 'src/entity/report/trip/trip-category.entity';
import { TripFuelExpense } from 'src/entity/report/trip/trip-fuel-expense.entity';
import { TripRegulationRate } from 'src/entity/report/trip/trip-regulation-rate.entity';
import { TripRegulation } from 'src/entity/report/trip/trip-regulation.entity';
import { TripReport } from 'src/entity/report/trip/trip-report.entity';
import { TripStep } from 'src/entity/report/trip/trip-step.entity';
import { TripExchangeRate } from 'src/entity/report/trip/trip-exchange-rate.entity';
import { UserModule } from 'src/user/user.module';
import { ReportService } from './report.service';
import { ScheduleModule } from 'src/schedule/schedule.module';
import { SftpModule } from 'src/sftp/sftp.module';
import { ReportAttachmentSubscriber } from 'src/common/subscribers/report-attachment.subscriber';
import { MailModule } from 'src/mail/mail.module';
import { ProjectModule } from 'src/project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Report,
      TripReport,
      TripCategory,
      TripStep,
      TripActualExpense,
      TripRegulationRate,
      TripFuelExpense,
      TripRegulation,
      TripExchangeRate,
    ]),
    ProjectModule,
    ScheduleModule,
    UserModule,
    CurrencyModule,
    SftpModule,
    MailModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportAttachmentSubscriber],
  exports: [ReportService],
})
export class ReportModule {}
