import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CopoService } from './copo.service';

@Module({
  imports: [ConfigModule],
  providers: [CopoService],
  exports: [CopoService],
})
export class CopoModule {}
