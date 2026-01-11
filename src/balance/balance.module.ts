import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { CopoModule } from '../copo/copo.module';

@Module({
  imports: [ConfigModule, CopoModule],
  controllers: [BalanceController],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
