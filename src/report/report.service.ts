import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KobLogger } from '@kob-bank/logger';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Withdraw, WithdrawStatusEnum } from '../enum/withdraw-status.enum';
import { Deposit, DepositStatusEnum } from '../enum/deposit-status.enum';

/**
 * Copo Report Service
 *
 * Handles transaction reporting for Copo payment gateway.
 */
@Injectable()
export class ReportService {
  private logger = new KobLogger(ReportService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel('Deposit') private readonly depositModel: Model<Deposit>,
    @InjectModel('Withdraw') private readonly withdrawModel: Model<Withdraw>,
  ) {}

  /**
   * Get deposit report
   *
   * @param site - Site name
   * @param type - Report type (e.g., daily, transaction)
   * @returns Deposit report data
   */
  async getDepositReport(site: string, type: string) {
    this.logger.debug(`getDepositReport: site=${site}, type=${type}`);

    const matchFilter: any = { site };

    // Filter by date range if type is daily
    if (type === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchFilter.createdAt = { $gte: today };
    }

    const deposits = await this.depositModel.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return {
      status: true,
      data: deposits,
      total: deposits.length,
    };
  }

  /**
   * Get withdraw report
   *
   * @param site - Site name
   * @param type - Report type (e.g., daily, transaction)
   * @returns Withdraw report data
   */
  async getWithdrawReport(site: string, type: string) {
    this.logger.debug(`getWithdrawReport: site=${site}, type=${type}`);

    const matchFilter: any = { site };

    // Filter by date range if type is daily
    if (type === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchFilter.createdAt = { $gte: today };
    }

    const withdraws = await this.withdrawModel.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return {
      status: true,
      data: withdraws,
      total: withdraws.length,
    };
  }

  /**
   * Get transaction report (both deposits and withdraws)
   *
   * @param site - Site name
   * @param type - Report type
   * @returns Combined transaction report
   */
  async getTransactionReport(site: string, type: string) {
    this.logger.debug(`getTransactionReport: site=${site}, type=${type}`);

    const matchFilter: any = { site };

    if (type === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchFilter.createdAt = { $gte: today };
    }

    const [deposits, withdraws] = await Promise.all([
      this.depositModel.find(matchFilter).sort({ createdAt: -1 }).limit(50).exec(),
      this.withdrawModel.find(matchFilter).sort({ createdAt: -1 }).limit(50).exec(),
    ]);

    return {
      status: true,
      data: {
        deposits,
        withdraws,
      },
      summary: {
        totalDeposits: deposits.length,
        totalWithdraws: withdraws.length,
        totalDepositAmount: deposits.reduce((sum, d: any) => sum + (d.amount || 0), 0),
        totalWithdrawAmount: withdraws.reduce((sum, w: any) => sum + (w.amount || 0), 0),
      },
    };
  }
}
