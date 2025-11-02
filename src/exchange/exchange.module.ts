import { HttpModule } from '@nestjs/axios';
import { ExchangeService } from './exchange.service';
import { Module } from '@nestjs/common';
import { ExchangeController } from './exchange.controller';

@Module({
  imports: [HttpModule],
  providers: [ExchangeService],
  controllers: [ExchangeController],
  exports: [ExchangeService],
})
export class ExchangeModule {}
