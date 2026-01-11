import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  axiosLogger,
  axiosCorrelation,
  KobLogger,
  LoggerMiddleware,
} from '@kob-bank/logger';
import { AppModule } from './app.module';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new KobLogger(''),
  });

  // Logger middleware - skip logging for health, report, transaction endpoints
  app.use(
    LoggerMiddleware([
      '/health',
      RegExp('/report/.*'),
      RegExp('/transaction/.*'),
      RegExp('/api/queues'),
    ]),
  );

  // ValidationPipe - IMPORTANT: use only transform: true (no forbidNonWhitelisted)
  // This allows payment-ui/kob-payment-gateway to send extra params like apiKey, signKey, etc.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Copo Backend is running on: http://localhost:${port}`);

  // Setup axios logging
  axiosCorrelation(axios);
  axiosLogger(axios);
}
bootstrap();
