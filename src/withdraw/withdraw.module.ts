import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';
import { Withdraw, WithdrawSchema } from './withdraw.schema';
import { CopoModule } from '../copo/copo.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Withdraw.name, schema: WithdrawSchema }]),
    CopoModule,
  ],
  controllers: [WithdrawController],
  providers: [WithdrawService],
  exports: [WithdrawService],
})
export class WithdrawModule {}
