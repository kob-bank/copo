import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(':site/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction report (deposits and withdraws)' })
  async getTransactionReport(
    @Param('site') site: string,
    @Param('type') type: string,
  ) {
    return this.reportService.getTransactionReport(site, type);
  }

  @Get('deposit/:site/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get deposit report' })
  async getDepositReport(
    @Param('site') site: string,
    @Param('type') type: string,
  ) {
    return this.reportService.getDepositReport(site, type);
  }

  @Get('withdraw/:site/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get withdraw report' })
  async getWithdrawReport(
    @Param('site') site: string,
    @Param('type') type: string,
  ) {
    return this.reportService.getWithdrawReport(site, type);
  }
}
