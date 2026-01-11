import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Withdraw extends Document {
  @Prop()
  merchantId: string;

  @Prop()
  agentId: string;

  @Prop()
  site: string;

  @Prop()
  customerId: string;

  @Prop()
  amount: number;

  @Prop()
  callback: string;

  @Prop()
  gatewayId: string;

  @Prop()
  bankName: string;

  @Prop()
  bankAccount: string;

  @Prop()
  bankAccountName: string;

  @Prop()
  systemRef: string;

  @Prop()
  systemOrderNo: string;

  @Prop()
  fee: number;

  @Prop()
  status: string;

  @Prop()
  paymentStatus?: string;

  @Prop()
  withdrawAmount?: number;
}

export const WithdrawSchema = SchemaFactory.createForClass(Withdraw);
