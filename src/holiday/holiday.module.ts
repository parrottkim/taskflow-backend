import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';

@Module({
  imports: [HttpModule],
  controllers: [HolidayController],
  providers: [HolidayService],
  exports: [HolidayService],
})
export class HolidayModule {}
