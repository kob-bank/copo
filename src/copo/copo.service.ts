import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KobLogger } from '@kob-bank/logger';
import { AxiosError, axios } from 'axios';
import { createHash } from 'crypto';

import { CopoPaymentRequestInterface, CopoBalanceRequestInterface } from '../interface/copo-payment-request.interface';
import { CopoPaymentResponseInterface, CopoBalanceResponseInterface } from '../interface/copo-payment-request.interface';
import {
  UpstreamErrorException,
  ProviderRejectedException,
} from '@kob-bank/common/exceptions';

/**
 * Copo Core Service
 *
 * Handles direct API communication with Copo payment gateway.
 * Manages MD5 signature generation and verification.
 *
 * API Documentation: https://merchant.copo.vip
 *
 * Endpoints:
 * - /dior/merchant-api/pay-order - Create deposit payment
 * - /dior/merchant-api/pay-query-balance - Query account balance
 * - /dior/merchant-api/proxy-order - Create payout/withdraw
 */
@Injectable()
export class CopoService {
  private logger = new KobLogger(CopoService.name);
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = this.configService.get<string>('copo.apiUrl', 'https://merchant.copo.vip');
  }

  /**
   * Generate MD5 signature for Copo API requests
   *
   * Algorithm (from Copo API documentation):
   * 1. Filter out empty values and 'sign' itself
   * 2. Sort keys by ASCII (case-sensitive)
   * 3. Build query string: key1=value1&key2=value2
   * 4. Append: &Key=<signKey>
   * 5. MD5 hash -> lowercase
   *
   * @param params - Request parameters
   * @param signKey - Merchant sign key
   * @returns MD5 signature in lowercase
   */
  generateSign(params: Record<string, any>, signKey: string): string {
    // 1. Filter out empty values and 'sign' itself
    const filteredParams = Object.entries(params)
      .filter(([key, value]) => value !== '' && value != null && key !== 'sign')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {} as Record<string, string>);

    // 2. Sort by ASCII (case-sensitive) - dictionary order
    const sortedKeys = Object.keys(filteredParams).sort();

    // 3. Build query string: key1=value1&key2=value2
    const queryString = sortedKeys
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    // 4. Append Key=signKey
    const signString = `${queryString}&Key=${signKey}`;

    // 5. MD5 hash -> lowercase
    const sign = createHash('md5').update(signString).digest('hex').toLowerCase();

    this.logger.debug(`Generated signature: ${sign} from ${signString}`);

    return sign;
  }

  /**
   * Verify callback signature from Copo
   *
   * @param dto - Callback data
   * @param signKey - Merchant sign key
   * @returns true if signature is valid
   */
  verifyCallbackSignature(dto: Record<string, any>, signKey: string): boolean {
    // Compute expected signature
    const params = { ...dto };
    delete params.sign;

    const expectedSign = this.generateSign(params, signKey);
    const isValid = expectedSign === dto.sign;

    if (!isValid) {
      this.logger.warn(`Signature verification failed. Expected: ${expectedSign}, Got: ${dto.sign}`);
    }

    return isValid;
  }

  /**
   * Create a deposit payment order with Copo
   *
   * @param payload - Payment request payload
   * @returns Payment response from Copo
   */
  async createPayment(payload: CopoPaymentRequestInterface): Promise<CopoPaymentResponseInterface> {
    try {
      this.logger.debug(`createPayment: ${this.apiBaseUrl}/dior/merchant-api/pay-order`, { payload });

      const resp = await axios.post<{ respCode: string; respMsg: string; type: string; info: string; payOrderNo: string }>(
        `${this.apiBaseUrl}/dior/merchant-api/pay-order`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      this.logger.debug('Copo payment response:', resp.data);

      if (resp.data.respCode !== '000') {
        throw new ProviderRejectedException(
          resp.data.respMsg || 'Payment creation failed',
          resp.data.respMsg || 'Payment creation failed',
        );
      }

      return resp.data;
    } catch (e) {
      console.error(e);
      if (e instanceof ProviderRejectedException) {
        throw e;
      }
      if (e instanceof AxiosError) {
        const message = e?.response?.data?.respMsg || e?.message || 'Unknown error';
        throw new UpstreamErrorException(message, message);
      }
      throw new UpstreamErrorException(e.message, e.message);
    }
  }

  /**
   * Get account balance from Copo
   *
   * @param payload - Balance request payload
   * @returns Balance response from Copo
   */
  async getBalance(payload: CopoBalanceRequestInterface): Promise<CopoBalanceResponseInterface> {
    try {
      const resp = await axios.post<CopoBalanceResponseInterface>(
        `${this.apiBaseUrl}/dior/merchant-api/pay-query-balance`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const data = resp.data;

      if (data.respCode !== '000') {
        throw new Error(data.respMsg || 'Balance query failed');
      }

      return data;
    } catch (e) {
      console.error(e);
      if (e instanceof AxiosError) {
        throw new UpstreamErrorException(
          e.response?.data?.respMsg || e.message || 'Balance query failed',
          e.message,
        );
      }
      throw new UpstreamErrorException(e.message, e.message);
    }
  }

  /**
   * Create a payout/withdraw order with Copo
   *
   * @param payload - Payout request payload
   * @returns Payout response from Copo
   */
  async createPayout(payload: Record<string, any>): Promise<any> {
    try {
      this.logger.debug(`createPayout: ${this.apiBaseUrl}/dior/merchant-api/proxy-order`, { payload });

      const resp = await axios.post(
        `${this.apiBaseUrl}/dior/merchant-api/proxy-order`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      this.logger.debug('Copo payout response:', resp.data);

      if (resp.data.respCode !== '000') {
        throw new ProviderRejectedException(
          resp.data.respMsg || 'Payout creation failed',
          resp.data.respMsg || 'Payout creation failed',
        );
      }

      return resp.data;
    } catch (e) {
      console.error(e);
      if (e instanceof ProviderRejectedException) {
        throw e;
      }
      if (e instanceof AxiosError) {
        const message = e?.response?.data?.respMsg || e?.message || 'Unknown error';
        throw new UpstreamErrorException(message, message);
      }
      throw new UpstreamErrorException(e.message, e.message);
    }
  }

  /**
   * Query payout status from Copo
   *
   * @param payload - Query request payload
   * @returns Query response from Copo
   */
  async queryPayout(payload: Record<string, any>): Promise<any> {
    try {
      const resp = await axios.post(
        `${this.apiBaseUrl}/dior/merchant-api/proxy-query`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      this.logger.debug('Copo payout query response:', resp.data);

      return resp.data;
    } catch (e) {
      console.error(e);
      if (e instanceof AxiosError) {
        throw new UpstreamErrorException(
          e.response?.data?.respMsg || e.message || 'Payout query failed',
          e.message,
        );
      }
      throw new UpstreamErrorException(e.message, e.message);
    }
  }
}
