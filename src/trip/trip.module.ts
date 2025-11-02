import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from 'src/entity/trip/trip.entity';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';
import { TripRegulation } from 'src/entity/trip/trip-regulation.entity';
import { TripCategory } from 'src/entity/trip/trip-category.entity';
import { TripStep } from 'src/entity/trip/trip-step.entity';
import { TripActualExpense } from 'src/entity/trip/trip-actual-expense.entity';
import { TripRegulationRate } from 'src/entity/trip/trip-regulation-rate.entity';
import { ScheduleModule } from 'src/schedule/schedule.module';
import { UserModule } from 'src/user/user.module';
import { TripFuelExpense } from 'src/entity/trip/trip-fuel-expense.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      TripCategory,
      TripStep,
      TripActualExpense,
      TripRegulationRate,
      TripFuelExpense,
      TripRegulation,
    ]),
    ScheduleModule,
    UserModule,
  ],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService],
})
export class TripModule {}
