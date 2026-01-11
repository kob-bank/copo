import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Copo Callback DTO
 *
 * Copo sends callback with these fields:
 * - accessType: Access type (usually "1")
 * - fee: Transaction fee
 * - language: Language code
 * - merchantId: Merchant ID
 * - orderAmount: Order amount
 * - orderNo: Merchant order number
 * - orderStatus: Order status (0=Processing, 1=Success, 2=Failed, 3=Manual Success)
 * - orderTime: Order timestamp
 * - payOrderId: Copo payment order ID
 * - payOrderTime: Payment order timestamp
 * - sign: MD5 signature
 */
export class CopoCallbackDto {
  @IsString()
  @IsNotEmpty()
  accessType: string;

  @IsString()
  @IsOptional()
  fee?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  orderAmount: string;

  @IsString()
  @IsNotEmpty()
  orderNo: string;

  @IsString()
  @IsNotEmpty()
  orderStatus: string;

  @IsString()
  @IsOptional()
  orderTime?: string;

  @IsString()
  @IsNotEmpty()
  payOrderId: string;

  @IsString()
  @IsOptional()
  payOrderTime?: string;

  @IsString()
  @IsNotEmpty()
  sign: string;
}
