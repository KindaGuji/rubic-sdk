import { RubicSdkError } from '@common/errors/rubic-sdk.error';
import BigNumber from 'bignumber.js';

export class CrossChainMaxAmountError extends RubicSdkError {
    max: BigNumber;
    constructor(maxAmount: BigNumber, tokenSymbol: string) {
        super(`Max amount is ${maxAmount.toFixed()} ${tokenSymbol}`);
        Object.setPrototypeOf(this, CrossChainMaxAmountError.prototype);
        this.max = maxAmount;
    }
}
