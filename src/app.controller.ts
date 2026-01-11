import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';

import { PaymentService } from './payment/payment.service';
import { WithdrawService } from './withdraw/withdraw.service';
import CopoCallbackDto from './dto/copo-callback.dto';
import { WithdrawCallbackDto } from './dto/withdraw-req.dto';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly withdrawService: WithdrawService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  health() {
    return {
      status: 'ok',
      service: 'copo-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'copo-backend',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Unified callback endpoint for Copo
   *
   * Handles both deposit and withdraw callbacks from Copo.
   * Copo sends callbacks to /callback with transaction data.
   *
   * We distinguish between deposit and withdraw by checking the orderNo pattern:
   * - Deposit: COP<site><timestamp> (no WITHDRAW prefix)
   * - Withdraw: COP_WITHDRAW_<site>_<timestamp>
   *
   * @param dto - Callback data from Copo
   * @param req - Express request
   * @returns "success" string as required by Copo
   */
  @Post('callback')
  @ApiOperation({ summary: 'Unified callback handler for Copo (POST)' })
  async callbackPost(@Body() dto: CopoCallbackDto | WithdrawCallbackDto, @Req() req: Request) {
    // Get signKey from query params or header for verification
    const signKey = req.query.signKey as string || req.headers['x-sign-key'] as string || '';

    // Check if this is a withdraw callback by orderNo pattern
    if ('orderNo' in dto && dto.orderNo.includes('WITHDRAW')) {
      return this.withdrawService.handleCallback(dto as WithdrawCallbackDto, signKey);
    }

    // Otherwise treat as deposit callback
    return this.paymentService.callback(dto as CopoCallbackDto, signKey);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Unified callback handler for Copo (GET)' })
  async callbackGet(@Query() dto: CopoCallbackDto | WithdrawCallbackDto, @Req() req: Request) {
    // Get signKey from query params or header for verification
    const signKey = req.query.signKey as string || req.headers['x-sign-key'] as string || '';

    // Check if this is a withdraw callback by orderNo pattern
    if ('orderNo' in dto && dto.orderNo.includes('WITHDRAW')) {
      return this.withdrawService.handleCallback(dto as WithdrawCallbackDto, signKey);
    }

    // Otherwise treat as deposit callback
    return this.paymentService.callback(dto as CopoCallbackDto, signKey);
  }
}
