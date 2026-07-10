import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '@/entity/report/report.entity';
import { ReportController } from './report.controller';
import { CurrencyModule } from '@/currency/currency.module';
import { TripActualExpense } from '@/entity/report/trip/trip-actual-expense.entity';
import { TripCategory } from '@/entity/report/trip/trip-category.entity';
import { TripFuelExpense } from '@/entity/report/trip/trip-fuel-expense.entity';
import { TripRegulationRate } from '@/entity/report/trip/trip-regulation-rate.entity';
import { TripRegulation } from '@/entity/report/trip/trip-regulation.entity';
import { TripReport } from '@/entity/report/trip/trip-report.entity';
import { TripStep } from '@/entity/report/trip/trip-step.entity';
import { TripExchangeRate } from '@/entity/report/trip/trip-exchange-rate.entity';
import { UserModule } from '@/user/user.module';
import { ReportService } from './report.service';
import { ScheduleModule } from '@/schedule/schedule.module';
import { SftpModule } from '@/sftp/sftp.module';
import { ReportAttachmentSubscriber } from '@/common/subscribers/report-attachment.subscriber';
import { MailModule } from '@/mail/mail.module';
import { ProjectModule } from '@/project/project.module';
import { ReportEditGuard } from '@/common/guards/report-edit.guard';

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
  providers: [ReportService, ReportAttachmentSubscriber, ReportEditGuard],
})
export class ReportModule {}
