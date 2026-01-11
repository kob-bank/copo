import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KobLogger } from '@kob-bank/logger';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';

import { CopoService } from '../copo/copo.service';
import { WithdrawReqDto, WithdrawCallbackDto } from '../dto/withdraw-req.dto';
import { Withdraw, WithdrawStatusEnum } from '../enum/withdraw-status.enum';
import { isSuccessStatus } from '../enum/callback-status.enum';

/**
 * Copo Withdraw Service
 *
 * Handles payout/withdraw requests and callbacks for Copo payment gateway.
 *
 * Withdraw flow:
 * 1. Create withdraw record in database
 * 2. Call Copo proxy-order API
 * 3. Return withdraw ID to caller
 * 4. Handle callback when payment completes
 */
@Injectable()
export class WithdrawService {
  private logger = new KobLogger(WithdrawService.name);
  private readonly host: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly copoService: CopoService,
    @InjectModel('Withdraw') private readonly withdrawModel: Model<Withdraw>,
  ) {
    this.host = this.configService.get<string>('HOST') || 'localhost';
  }

  /**
   * Create a withdraw/payout order with Copo
   *
   * @param dto - Withdraw request
   * @returns Withdraw response with withdraw ID
   */
  async createWithdraw(dto: WithdrawReqDto) {
    try {
      // Create withdraw record
      const orderNo = `COP_WITHDRAW_${dto.site}_${Date.now()}`;

      const withdraw = await this.withdrawModel.create({
        merchantId: dto.merchantId,
        agentId: dto.site,
        site: dto.site,
        customerId: dto.username,
        amount: dto.amount,
        callback: dto.callbackURL,
        gatewayId: dto.gatewayId,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankAccountName: dto.bankAccountName,
        systemOrderNo: orderNo,
        status: WithdrawStatusEnum.PENDING,
      });

      // Prepare payload for Copo API
      const payload = {
        accessType: '1',
        merchantId: dto.merchantId,
        notifyUrl: `https://${this.host}/callback`, // Copo callbacks to microservice
        pageUrl: dto.callbackURL,
        language: 'zh-CN',
        orderNo: orderNo,
        orderAmount: dto.amount.toString(),
        currency: 'THB',
        payType: 'TRANSFER',
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankAccountName: dto.bankAccountName,
        orderName: `Withdraw for ${dto.username}`,
      };

      // Generate signature
      payload.sign = this.copoService.generateSign(payload, dto.signKey);

      this.logger.debug(`createWithdraw payload:`, { payload });

      // Call Copo API
      const resp = await this.copoService.createPayout(payload);

      // Update withdraw record
      await this.withdrawModel.updateOne(
        { _id: withdraw._id },
        {
          systemRef: resp.payOrderNo,
          status: WithdrawStatusEnum.PROCESSING,
        },
      );

      return {
        status: true,
        data: {
          withdrawId: withdraw._id.toString(),
          systemRef: resp.payOrderNo,
          orderNo: orderNo,
          fee: 0,
          statusCode: 201, // FDPAY pattern requires this
        },
      };
    } catch (e) {
      this.logger.error('createWithdraw error:', e);
      throw e;
    }
  }

  /**
   * Check withdraw status by transaction ID
   *
   * @param site - Site name
   * @param transactionId - Transaction ID (withdraw ID)
   * @returns Withdraw status
   */
  async checkWithdrawStatus(site: string, transactionId: string) {
    const withdraw = await this.withdrawModel.findOne({
      _id: transactionId,
      site,
    });

    if (!withdraw) {
      throw new NotFoundException('Withdraw not found');
    }

    return {
      customerId: withdraw.customerId,
      status: withdraw.status,
      amount: withdraw.amount,
    };
  }

  /**
   * Handle withdraw callback from Copo
   *
   * Callback format:
   * {
   *   "accessType": "1",
   *   "merchantId": "ME00807",
   *   "orderNo": "COP_WITHDRAW_production1236789123456",
   *   "orderAmount": "1000.00",
   *   "orderStatus": "1",  // 0=Processing, 1=Success, 2=Failed
   *   "payOrderId": "ZF20260111225648bXPrl",
   *   "sign": "..."
   * }
   *
   * @param dto - Callback data from Copo
   * @param signKey - Merchant sign key for verification
   * @returns "success" string as required by Copo
   */
  async handleCallback(dto: WithdrawCallbackDto, signKey: string) {
    // Verify signature
    if (!this.copoService.verifyCallbackSignature(dto, signKey)) {
      this.logger.error('Invalid withdraw callback signature', { dto });
      throw new UnauthorizedException('Invalid signature');
    }

    // Find transaction by merchant order number
    const withdraw = await this.withdrawModel.findOne({
      systemOrderNo: dto.orderNo,
    });

    if (!withdraw) {
      this.logger.warn(`Withdraw not found for orderNo: ${dto.orderNo}`);
      throw new NotFoundException();
    }

    this.logger.debug(`Withdraw callback for order ${dto.orderNo}, status: ${dto.orderStatus}, withdraw status: ${withdraw.status}`);

    // Only update if transaction is still pending or processing
    if (withdraw.status === WithdrawStatusEnum.PENDING || withdraw.status === WithdrawStatusEnum.PROCESSING) {
      const isSuccess = isSuccessStatus(dto.orderStatus);

      const updateData: any = {
        status: isSuccess
          ? WithdrawStatusEnum.SUCCESS
          : WithdrawStatusEnum.FAILED,
        withdrawAmount: parseFloat(dto.orderAmount) || 0,
        fee: parseFloat(dto.fee) || 0,
        paymentStatus: dto.orderStatus,
      };

      if (isSuccess) {
        updateData.completedAt = new Date();
      }

      await this.withdrawModel.updateOne(
        { _id: withdraw._id },
        updateData,
      );

      this.logger.debug(`Withdraw ${withdraw._id} updated to ${updateData.status}`);
    } else {
      this.logger.debug(`Callback for non-pending withdraw ${withdraw._id}, current status: ${withdraw.status}`);
    }

    // Copo requires "success" string response
    return 'success';
  }

  /**
   * Query payout status from Copo (for manual check)
   *
   * @param merchantId - Merchant ID
   * @param signKey - Sign key
   * @param orderNo - Order number
   * @returns Query response
   */
  async queryPayoutStatus(merchantId: string, signKey: string, orderNo: string) {
    const payload = {
      accessType: '1',
      merchantId: merchantId,
      orderNo: orderNo,
    };

    payload.sign = this.copoService.generateSign(payload, signKey);

    return this.copoService.queryPayout(payload);
  }
}
