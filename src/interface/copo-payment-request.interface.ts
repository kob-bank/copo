export interface CopoPaymentRequestInterface {
  accessType: string;
  merchantId: string;
  notifyUrl: string;
  pageUrl: string;
  language: string;
  orderNo: string;
  orderAmount: string;
  currency: string;
  payType: string;
  orderName: string;
  sign?: string;
}

export interface CopoBalanceRequestInterface {
  accessType: string;
  merchantId: string;
  currency: string;
  sign?: string;
}

export interface CopoPaymentResponseInterface {
  respCode: string;
  respMsg: string;
  type: string;
  info: string;
  payOrderNo: string;
}

export interface CopoBalanceResponseInterface {
  respCode: string;
  respMsg: string;
  availableAmount: string;
  payAmount: string;
  proxyAmount: string;
}
