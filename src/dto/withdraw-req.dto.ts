import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

/**
 * Withdraw Request DTO
 *
 * Copo withdraw request parameters
 */
export class WithdrawReqDto {
  @IsString()
  @IsNotEmpty()
  site: string;

  @IsString()
  @IsNotEmpty()
  gatewayId: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bankAccount: string;

  @IsString()
  @IsNotEmpty()
  bankAccountName: string;

  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  signKey: string;

  @IsString()
  @IsNotEmpty()
  callbackURL: string;
}

/**
 * Withdraw Callback DTO from Copo
 */
export class WithdrawCallbackDto {
  @IsString()
  @IsNotEmpty()
  accessType: string;

  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  orderNo: string;

  @IsString()
  @IsNotEmpty()
  orderAmount: string;

  @IsString()
  @IsNotEmpty()
  orderStatus: string;

  @IsString()
  @IsNotEmpty()
  payOrderId: string;

  @IsString()
  @IsNotEmpty()
  sign: string;

  @IsString()
  fee?: string;

  @IsString()
  orderTime?: string;

  @IsString()
  payOrderTime?: string;
}
