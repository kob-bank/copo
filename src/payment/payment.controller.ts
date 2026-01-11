import { Body, Controller, Post, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PaymentService } from './payment.service';
import CopoCallbackDto from './dto/copo-callback.dto';
import { CopoProviderParams, GenericProviderBalanceReqDto, GenericProviderDepositReqDto } from '@kob-bank/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create deposit payment order' })
  async createDeposit(@Body() dto: GenericProviderDepositReqDto<CopoProviderParams>) {
    return this.paymentService.requestPayment(dto);
  }

  @Post('callback')
  @ApiOperation({ summary: 'Handle payment callback from Copo' })
  async callback(@Body() dto: CopoCallbackDto, @Req() req: any) {
    // Get signKey from query params or header for verification
    const signKey = req.query.signKey || req.headers['x-sign-key'] || '';
    return this.paymentService.callback(dto, signKey);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle payment callback from Copo (GET)' })
  async callbackGet(@Query() dto: CopoCallbackDto, @Req() req: any) {
    // Get signKey from query params or header for verification
    const signKey = req.query.signKey || req.headers['x-sign-key'] || '';
    return this.paymentService.callback(dto, signKey);
  }

  @Post('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account balance' })
  async getBalance(@Body() dto: GenericProviderBalanceReqDto<CopoProviderParams>) {
    return this.paymentService.getBalance(dto);
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check order status' })
  async checkOrder(@Query('id') id: string) {
    return this.paymentService.checkOrderStatus(id);
  }
}
