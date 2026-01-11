import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { BalanceService } from './balance.service';
import { CopoProviderParams } from '@kob-bank/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Balance')
@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account balance from Copo' })
  async getBalance(@Body() dto: { params: CopoProviderParams }) {
    return this.balanceService.getBalance(dto);
  }
}
