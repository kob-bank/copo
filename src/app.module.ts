import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import configuration from './config/configuration';
import { PaymentModule } from './payment/payment.module';
import { HealthModule } from './health/health.module';
import { DepositModule } from './deposit/deposit.module';
import { Deposit, DepositSchema } from './deposit/deposit.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Deposit.name, schema: DepositSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    PaymentModule,
    DepositModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {
  private logger = new Logger(AppModule.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Copo Backend Module initialized');
    this.logger.log(`Database URI: ${this.configService.get('database.uri')}`);
    this.logger.log(`Copo API URL: ${this.configService.get('copo.apiUrl')}`);
  }
}
