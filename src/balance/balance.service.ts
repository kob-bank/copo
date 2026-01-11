import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KobLogger } from '@kob-bank/logger';
import { CopoService } from '../copo/copo.service';
import { CopoBalanceRequestInterface } from '../interface/copo-payment-request.interface';
import { CopoProviderParams } from '@kob-bank/common';
import { UpstreamErrorException } from '@kob-bank/common/exceptions';

/**
 * Copo Balance Service
 *
 * Handles balance inquiries for Copo payment gateway.
 */
@Injectable()
export class BalanceService {
  private logger = new KobLogger(BalanceService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly copoService: CopoService,
  ) {}

  /**
   * Get account balance from Copo
   *
   * @param dto - Balance request with Copo provider params
   * @returns Balance information
   */
  async getBalance(dto: { params: CopoProviderParams }) {
    try {
      const payload: CopoBalanceRequestInterface = {
        accessType: '1',
        merchantId: dto.params.merchantId,
        currency: 'THB',
      };

      // Generate signature
      if (dto.params.signKey) {
        payload.sign = this.copoService.generateSign(payload as any, dto.params.signKey);
      }

      const data = await this.copoService.getBalance(payload);

      return {
        status: true,
        data: {
          depositBalance: parseFloat(data.availableAmount) || 0,
          withdrawBalance: parseFloat(data.availableAmount) || 0, // Copo uses single balance
          withdrawPending: 0,
          payAmount: parseFloat(data.payAmount) || 0,
          proxyAmount: parseFloat(data.proxyAmount) || 0,
        },
      };
    } catch (e) {
      this.logger.error('getBalance error:', e);
      if (e instanceof UpstreamErrorException) {
        throw e;
      }
      throw new UpstreamErrorException(e.message, e.message);
    }
  }
}
