import { Web3Pure } from 'src/core';
import { CrossChainInstantTrade } from '@features/cross-chain/providers/rubic-trade-provider/rubic-cross-chain-contract-trade/common/cross-chain-instant-trade';
import { v2LikeCelerSwap } from '@features/cross-chain/providers/celer-trade-provider/celer-cross-chain-contract-trade/models/v2-like-celer-swap-info';
import { UniswapV2AbstractTrade } from 'src/features';
import { DestinationCelerSwapInfo } from '@features/cross-chain/providers/celer-trade-provider/celer-cross-chain-contract-trade/models/destination-celer-swap-info';
import { SwapVersion } from '@features/cross-chain/providers/common/celer-rubic/models/provider-type.enum';

export class CrossChainUniswapV2Trade implements CrossChainInstantTrade {
    readonly defaultDeadline = 999999999999999;

    constructor(private readonly instantTrade: UniswapV2AbstractTrade) {}

    public getFirstPath(): string[] {
        return this.instantTrade.wrappedPath.map(token => token.address);
    }

    public getSecondPath(): string[] {
        return this.instantTrade.wrappedPath.map(token => Web3Pure.addressToBytes32(token.address));
    }

    public async modifyArgumentsForProvider(
        methodArguments: unknown[][],
        _walletAddress: string,
        swapTokenWithFee = false
    ): Promise<void> {
        const exactTokensForTokens = true;

        if (!methodArguments?.[0]) {
            throw new Error('[RUBIC SDK] Method arguments[0] has to be defined');
        }

        methodArguments[0].push(exactTokensForTokens);
        methodArguments[0].push(swapTokenWithFee);
    }

    public getCelerSourceObject(slippage: number): v2LikeCelerSwap {
        const path = this.getFirstPath();
        const amountOutMinimum = this.instantTrade.toTokenAmountMin
            .weiAmountMinusSlippage(slippage)
            .toFixed(0);
        const dex = (this.instantTrade as unknown as { contractAddress: string }).contractAddress;
        return { dex, path, deadline: this.defaultDeadline, amountOutMinimum };
    }

    public getCelerDestinationObject(
        slippage: number,
        integratorAddress: string
    ): DestinationCelerSwapInfo {
        const dex = (this.instantTrade as unknown as { contractAddress: string }).contractAddress;
        const deadline = this.defaultDeadline;
        const amountOutMinimum = this.instantTrade.toTokenAmountMin
            .weiAmountMinusSlippage(slippage)
            .toFixed(0);

        return {
            dex,
            integrator: integratorAddress,
            version: SwapVersion.V2,
            path: this.getFirstPath(),
            pathV3: '0x',
            deadline,
            amountOutMinimum
        };
    }
}
