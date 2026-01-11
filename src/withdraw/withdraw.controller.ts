import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { WithdrawService } from './withdraw.service';
import { WithdrawReqDto, WithdrawCallbackDto } from '../dto/withdraw-req.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Withdraw')
@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create withdraw/payout order' })
  async createWithdraw(@Body() dto: WithdrawReqDto) {
    return this.withdrawService.createWithdraw(dto);
  }

  @Get(':site/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check withdraw status' })
  async checkWithdrawStatus(
    @Param('site') site: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.withdrawService.checkWithdrawStatus(site, transactionId);
  }

  @Post('callback')
  @ApiOperation({ summary: 'Handle withdraw callback from Copo' })
  async withdrawCallback(@Body() dto: WithdrawCallbackDto, @Query('signKey') signKey: string) {
    return this.withdrawService.handleCallback(dto, signKey);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle withdraw callback from Copo (GET)' })
  async withdrawCallbackGet(@Query() dto: WithdrawCallbackDto, @Query('signKey') signKey: string) {
    return this.withdrawService.handleCallback(dto, signKey);
  }

  @Post('query')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query payout status from Copo' })
  async queryPayoutStatus(
    @Query('merchantId') merchantId: string,
    @Query('signKey') signKey: string,
    @Query('orderNo') orderNo: string,
  ) {
    return this.withdrawService.queryPayoutStatus(merchantId, signKey, orderNo);
  }
}
