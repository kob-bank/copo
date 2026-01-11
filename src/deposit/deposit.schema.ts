import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Deposit extends Document {
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
  paymentMethods: string;

  @Prop()
  payee?: string;

  @Prop()
  payAmount?: number;

  @Prop()
  qrCode?: string;

  @Prop()
  systemRef?: string;

  @Prop()
  systemOrderNo?: string;

  @Prop()
  fee?: number;

  @Prop()
  expiredAt?: Date;

  @Prop()
  successedAt?: Date;

  @Prop()
  status: string;

  @Prop()
  paymentStatus?: string;

  @Prop()
  creditAmount?: number;
}

export const DepositSchema = SchemaFactory.createForClass(Deposit);
