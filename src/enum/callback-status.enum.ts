export enum CallbackStatusEnum {
  SUCCESS = '1',
  FAILED = '2',
  PROCESSING = '0',
  MANUAL_SUCCESS = '3',
}

export const isSuccessStatus = (status: string): boolean => {
  return status === CallbackStatusEnum.SUCCESS || status === CallbackStatusEnum.MANUAL_SUCCESS;
};
