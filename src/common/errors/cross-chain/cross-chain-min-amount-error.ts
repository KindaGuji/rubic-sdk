import { RubicSdkError } from '@common/errors/rubic-sdk.error';
import BigNumber from 'bignumber.js';

export class CrossChainMinAmountError extends RubicSdkError {
    min: BigNumber;
    constructor(minAmount: BigNumber, tokenSymbol: string) {
        super(`Min amount is ${minAmount.toFixed()} ${tokenSymbol}`);
        Object.setPrototypeOf(this, CrossChainMinAmountError.prototype);
        this.min = minAmount;
    }
}
