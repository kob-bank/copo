import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KobLogger } from '@kob-bank/logger';
import { AxiosError, axios } from 'axios';
import { createHash } from 'crypto';
import dayjs from 'dayjs';

import { CopoPaymentRequestInterface, CopoBalanceRequestInterface } from '../interface/copo-payment-request.interface';
import { CopoPaymentResponseInterface, CopoBalanceResponseInterface } from '../interface/copo-payment-request.interface';
import CopoCallbackDto from '../dto/copo-callback.dto';
import { CallbackStatusEnum, isSuccessStatus } from '../enum/callback-status.enum';
import {
  ApiResponseDto,
  CopoProviderParams,
  DepositStatusEnum,
  GenericProviderBalanceReqDto,
  GenericProviderDepositReqDto,
  GenericProviderDepositRespDto,
  PaymentMethodEnum,
} from '@kob-bank/common';
import {
  UpstreamErrorException,
  ProviderRejectedException,
} from '@kob-bank/common/exceptions';
import { Deposit } from '../deposit/deposit.schema';
import {
  DepositRepository,
  UpdatePaymentInterface,
} from '@kob-bank/common/deposit';

/**
 * Copo Payment Service
 *
 * Handles payment requests and callbacks for Copo payment gateway.
 * Uses MD5 signature for authentication.
 *
 * API Documentation: https://merchant.copo.vip
 *
 * Signature Algorithm:
 * 1. Filter out empty values and 'sign' itself
 * 2. Sort keys by ASCII (case-sensitive)
 * 3. Build query string: key1=value1&key2=value2
 * 4. Append: &Key=<signKey>
 * 5. MD5 hash -> lowercase
 */
@Injectable()
export class PaymentService {
  private logger = new KobLogger(PaymentService.name);
  private readonly apiBaseUrl: string;
  private readonly host: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly depositRepository: DepositRepository,
  ) {
    this.apiBaseUrl = this.configService.get<string>('copo.apiUrl', 'https://merchant.copo.vip');
    this.host = this.configService.get<string>('HOST') || 'localhost';
  }

  /**
   * Generate MD5 signature for Copo API requests
   *
   * @param params - Request parameters
   * @param signKey - Merchant sign key
   * @returns MD5 signature in lowercase
   */
  private generateSign(params: Record<string, any>, signKey: string): string {
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
  private verifyCallbackSignature(dto: CopoCallbackDto, signKey: string): boolean {
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
   * @param dto - Deposit request
   * @returns Payment response with redirect URL
   */
  async requestPayment(
    dto: GenericProviderDepositReqDto<CopoProviderParams>,
  ): Promise<ApiResponseDto<GenericProviderDepositRespDto>> {
    try {
      const tx = await this.depositRepository.create({
        merchantId: dto.params.site,
        agentId: dto.params.site,
        site: dto.params.site,
        customerId: dto.username,
        amount: dto.amount,
        callback: dto.params.callbackURL,
        gatewayId: dto.params.gatewayId,
        paymentMethods: PaymentMethodEnum.QR,
      });

      // Generate order number: COP<site><timestamp>
      const orderNo = `COP${dto.params.site}${Date.now()}`;

      const payload: CopoPaymentRequestInterface = {
        accessType: '1',
        merchantId: dto.params.merchantId,
        // ⚠️ IMPORTANT: Use microservice HOST for callback URL (FDPAY Pattern)
        // Provider will callback to microservice, then we forward to BO
        notifyUrl: `https://${this.host}/callback`,
        pageUrl: dto.params.resultURL || dto.params.callbackURL,
        language: 'zh-CN',
        orderNo: orderNo,
        orderAmount: dto.amount.toString(),
        currency: 'THB',
        payType: 'PP', // PromptPay
        orderName: `Deposit for ${dto.username}`,
      };

      // Generate signature
      if (dto.params.signKey) {
        payload.sign = this.generateSign(payload as any, dto.params.signKey);
      }

      this.logger.debug(`requestPayment: ${this.apiBaseUrl}/dior/merchant-api/pay-order`, { payload });

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
        await this.depositRepository.paymentCreateFailed(tx._id, {
          errorCode: resp.data.respCode,
          errorMessage: resp.data.respMsg || 'Payment creation failed',
        });

        throw new ProviderRejectedException(
          resp.data.respMsg || 'Payment creation failed',
          resp.data.respMsg || 'Payment creation failed',
        );
      }

      const data = resp.data;
      const expiredAt = dayjs().add(15, 'minutes').tz('Asia/Bangkok').toDate();

      // Copo returns type: "url" with redirect URL
      const paymentUrl = data.type === 'url' ? data.info : '';

      const updatedTx = await this.depositRepository.paymentCreated(tx._id, {
        payee: dto.username,
        payAmount: dto.amount,
        qrCode: paymentUrl,
        systemRef: data.payOrderNo,
        systemOrderNo: orderNo,
        fee: 0,
        expiredAt: expiredAt,
      });

      return {
        status: true,
        data: {
          id: tx._id.toString(),
          merchantRef: orderNo,
          systemRef: data.payOrderNo,
          payee: dto.username,
          payAmount: dto.amount,
          qrCode: paymentUrl,
          expiredDate: expiredAt.toISOString(),
        },
      };
    } catch (e) {
      console.error(e);
      if (e instanceof ProviderRejectedException) {
        throw e;
      }
      const message =
        e?.response?.data?.respMsg || e?.message || 'Unknown error';
      throw new UpstreamErrorException(message, message);
    }
  }

  /**
   * Handle payment callback from Copo
   *
   * Callback format:
   * {
   *   "accessType": "1",
   *   "fee": "2.00",
   *   "language": "zh-CN",
   *   "merchantId": "ME00807",
   *   "orderAmount": "100.00",
   *   "orderNo": "COPproduction1236789123456",
   *   "orderStatus": "1",  // 0=Processing, 1=Success, 2=Failed, 3=Manual Success
   *   "orderTime": "20260111220812900",
   *   "payOrderId": "ZF20260111225648bXPrl",
   *   "payOrderTime": "20260111220812900",
   *   "sign": "..."
   * }
   *
   * @param dto - Callback data from Copo
   * @param signKey - Merchant sign key for verification
   * @returns "success" string as required by Copo
   */
  async callback(dto: CopoCallbackDto, signKey: string) {
    // Verify signature
    if (!this.verifyCallbackSignature(dto, signKey)) {
      this.logger.error('Invalid callback signature', { dto });
      throw new UnauthorizedException('Invalid signature');
    }

    // Find transaction by merchant order number
    const tx = await this.depositRepository.findOneBySystemOrderNo(dto.orderNo);
    if (!tx) {
      this.logger.warn(`Transaction not found for orderNo: ${dto.orderNo}`);
      throw new NotFoundException();
    }

    this.logger.debug(`Callback for order ${dto.orderNo}, status: ${dto.orderStatus}, tx status: ${tx.status}`);

    // Only update if transaction is still pending
    if (tx.status === DepositStatusEnum.PENDING) {
      const isSuccess = isSuccessStatus(dto.orderStatus);

      const updatePayment: UpdatePaymentInterface = {
        successedAt: isSuccess ? new Date() : undefined,
        status: isSuccess
          ? DepositStatusEnum.SUCCESSED
          : DepositStatusEnum.FAILED,
        creditAmount: parseFloat(dto.orderAmount) || 0,
        fee: parseFloat(dto.fee) || 0,
        paymentStatus: dto.orderStatus,
      };

      await this.depositRepository.updatePayment(tx._id, updatePayment);

      this.logger.debug(`Transaction ${tx._id} updated to ${updatePayment.status}`);
    } else {
      this.logger.debug(`Callback for non-pending transaction ${tx._id}, current status: ${tx.status}`);
    }

    // Copo requires "success" string response
    return 'success';
  }

  /**
   * Get account balance from Copo
   *
   * @param dto - Balance request
   * @returns Balance information
   */
  async getBalance(dto: GenericProviderBalanceReqDto<CopoProviderParams>) {
    try {
      const payload: CopoBalanceRequestInterface = {
        accessType: '1',
        merchantId: dto.params.merchantId,
        currency: 'THB',
      };

      // Generate signature
      if (dto.params.signKey) {
        payload.sign = this.generateSign(payload as any, dto.params.signKey);
      }

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

      return {
        status: true,
        data: {
          depositBalance: parseFloat(data.availableAmount) || 0,
          withdrawBalance: 0,
          withdrawPending: 0,
        },
      };
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
   * Check order status
   *
   * @param id - Transaction ID
   * @returns Order status
   */
  async checkOrderStatus(id: string) {
    const tx: Deposit = await this.depositRepository.findOneBySystemOrderNo(id);

    if (tx == null || tx.status == DepositStatusEnum.FAILED) {
      throw new NotFoundException();
    }

    return {
      customerId: tx.customerId,
      status: tx.status,
      amount: tx.amount,
    };
  }
}
