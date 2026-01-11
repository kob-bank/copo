import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Deposit, DepositSchema } from '../deposit/deposit.schema';
import { Withdraw, WithdrawSchema } from '../withdraw/withdraw.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Deposit.name, schema: DepositSchema },
      { name: Withdraw.name, schema: WithdrawSchema },
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
