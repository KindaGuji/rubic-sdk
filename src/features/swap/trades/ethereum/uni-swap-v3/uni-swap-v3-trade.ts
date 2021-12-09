import { InstantTrade } from '@features/swap/trades/instant-trade';
import { PriceTokenAmount } from '@core/blockchain/tokens/price-token-amount';
import { UniSwapV3Route } from '@features/swap/providers/ethereum/uni-swap-v3/models/uni-swap-v3-route';
import { BLOCKCHAIN_NAME } from '@core/blockchain/models/BLOCKCHAIN_NAME';
import {
    swapRouterContractAbi,
    swapRouterContractAddress
} from '@features/swap/trades/ethereum/uni-swap-v3/constants/swap-router-contract-data';
import { SwapTransactionOptions } from '@features/swap/models/swap-transaction-options';
import { TransactionReceipt } from 'web3-eth';
import { compareAddresses, Utils } from '@common/utils/blockchain';
import { MethodData } from '@core/blockchain/web3-public/models/method-data';
import { LiquidityPoolsController } from '@features/swap/providers/ethereum/uni-swap-v3/utils/liquidity-pool-controller/liquidity-pools-controller';
import { EMPTY_ADDRESS } from '@core/blockchain/web3-public/constants/EMPTY_ADDRESS';
import { Web3Pure } from '@core/blockchain/web3-pure/web3-pure';
import { BatchCall } from '@core/blockchain/web3-public/models/batch-call';
import {
    swapEstimatedGas,
    WethToEthEstimatedGas
} from '@features/swap/providers/ethereum/uni-swap-v3/constants/estimated-gas';
import { SymbolToken } from '@core/blockchain/tokens/symbol-token';
import { PriceToken } from '@core/blockchain/tokens/price-token';
import { Injector } from '@core/sdk/injector';
import { TransactionConfig } from 'web3-core';
import { EncodableSwapTransactionOptions } from '@features/swap/models/encodable-swap-transaction-options';
import { Pure } from '@common/decorators/pure.decorator';
import { GasFeeInfo } from '@features/swap/models/gas-fee-info';

type UniswapV3TradeStruct = {
    from: PriceTokenAmount;
    to: PriceTokenAmount;
    gasFeeInfo: GasFeeInfo | null;
    slippageTolerance: number;
    deadlineMinutes: number;
    route: UniSwapV3Route;
};

export class UniSwapV3Trade extends InstantTrade {
    public static async calculateGasLimitForRoute(
        from: PriceTokenAmount,
        toToken: PriceToken,
        slippageTolerance: number,
        deadlineMinutes: number,
        route: UniSwapV3Route
    ): Promise<string> {
        const estimateGasParams = UniSwapV3Trade.getEstimateGasParams(
            from,
            toToken,
            slippageTolerance,
            deadlineMinutes,
            route
        );
        let gasLimit = estimateGasParams.defaultGasLimit;

        const walletAddress = Injector.web3Private.address;
        if (walletAddress) {
            const web3Public = Injector.web3PublicService.getWeb3Public(from.blockchain);
            gasLimit = await web3Public
                .getEstimatedGas(
                    swapRouterContractAbi,
                    swapRouterContractAddress,
                    estimateGasParams.callData.contractMethod,
                    estimateGasParams.callData.params,
                    walletAddress,
                    estimateGasParams.callData.value
                )
                .catch(() => estimateGasParams.defaultGasLimit);
        }

        return gasLimit;
    }

    public static async calculateGasLimitsForRoutes(
        from: PriceTokenAmount,
        toToken: PriceToken,
        slippageTolerance: number,
        deadlineMinutes: number,
        routes: UniSwapV3Route[]
    ): Promise<string[]> {
        const routesEstimateGasParams = routes.map(route =>
            UniSwapV3Trade.getEstimateGasParams(
                from,
                toToken,
                slippageTolerance,
                deadlineMinutes,
                route
            )
        );
        const gasLimits = routesEstimateGasParams.map(
            estimateGasParams => estimateGasParams.defaultGasLimit
        );

        const walletAddress = Injector.web3Private.address;
        if (walletAddress) {
            const web3Public = Injector.web3PublicService.getWeb3Public(from.blockchain);
            const estimatedGasLimits = await web3Public.batchEstimatedGas(
                swapRouterContractAbi,
                swapRouterContractAddress,
                walletAddress,
                routesEstimateGasParams.map(estimateGasParams => estimateGasParams.callData)
            );
            estimatedGasLimits.forEach((elem, index) => {
                if (elem?.isFinite()) {
                    gasLimits[index] = elem.toFixed(0);
                }
            });
        }

        return gasLimits;
    }

    private static getEstimateGasParams(
        from: PriceTokenAmount,
        toToken: PriceToken,
        slippageTolerance: number,
        deadlineMinutes: number,
        route: UniSwapV3Route
    ) {
        return new UniSwapV3Trade({
            from,
            to: new PriceTokenAmount({
                ...toToken.asStruct,
                weiAmount: route.outputAbsoluteAmount
            }),
            gasFeeInfo: null,
            slippageTolerance,
            deadlineMinutes,
            route
        }).getEstimateGasParams();
    }

    protected readonly contractAddress = swapRouterContractAddress;

    public readonly from: PriceTokenAmount;

    public readonly to: PriceTokenAmount;

    public readonly gasFeeInfo: GasFeeInfo | null;

    public slippageTolerance: number;

    public deadlineMinutes: number;

    private readonly route: UniSwapV3Route;

    @Pure
    public get path(): SymbolToken[] {
        const initialPool = this.route.poolsPath[0];
        const path: SymbolToken[] = [
            compareAddresses(initialPool.token0.address, this.route.initialTokenAddress)
                ? initialPool.token0
                : initialPool.token1
        ];
        path.push(
            ...this.route.poolsPath.map(pool => {
                return !compareAddresses(pool.token0.address, path[path.length - 1].address)
                    ? pool.token0
                    : pool.token1;
            })
        );
        return path;
    }

    constructor(tradeStruct: UniswapV3TradeStruct) {
        super(BLOCKCHAIN_NAME.ETHEREUM);

        this.from = tradeStruct.from;
        this.to = tradeStruct.to;
        this.gasFeeInfo = tradeStruct.gasFeeInfo;
        this.slippageTolerance = tradeStruct.slippageTolerance;
        this.deadlineMinutes = tradeStruct.deadlineMinutes;
        this.route = tradeStruct.route;
    }

    public async swap(options: SwapTransactionOptions = {}): Promise<TransactionReceipt> {
        await this.checkWalletState();

        const { methodName, methodArguments } = this.getSwapRouterMethodData();
        const gasLimit = options.gasLimit || this.gasFeeInfo?.gasLimit;
        const gasPrice = options.gasPrice || this.gasFeeInfo?.gasPrice;
        return this.web3Private.tryExecuteContractMethod(
            swapRouterContractAddress,
            swapRouterContractAbi,
            methodName,
            methodArguments,
            {
                value: this.from.isNative ? this.from.stringWeiAmount : undefined,
                onTransactionHash: options.onConfirm,
                gas: gasLimit,
                gasPrice
            }
        );
    }

    public encode(options: EncodableSwapTransactionOptions = {}): TransactionConfig {
        const { methodName, methodArguments } = this.getSwapRouterMethodData();
        const gasInfo = {
            gasLimit: options.gasLimit || this.gasFeeInfo?.gasLimit,
            gasPrice: options.gasPrice || this.gasFeeInfo?.gasPrice.toFixed(0)
        };
        return Web3Pure.encodeMethodCall(
            swapRouterContractAddress,
            swapRouterContractAbi,
            methodName,
            methodArguments,
            this.from.isNative ? this.from.stringWeiAmount : undefined,
            gasInfo
        );
    }

    private getSwapRouterMethodData(): MethodData {
        if (!this.to.isNative) {
            const { methodName: exactInputMethodName, methodArguments: exactInputMethodArguments } =
                this.getSwapRouterExactInputMethodData(this.walletAddress);
            return {
                methodName: exactInputMethodName,
                methodArguments: exactInputMethodArguments
            };
        }

        const { methodName: exactInputMethodName, methodArguments: exactInputMethodArguments } =
            this.getSwapRouterExactInputMethodData(EMPTY_ADDRESS);
        const exactInputMethodEncoded = Web3Pure.encodeFunctionCall(
            swapRouterContractAbi,
            exactInputMethodName,
            exactInputMethodArguments
        );

        const amountOutMin = this.to.weiAmountMinusSlippage(this.slippageTolerance).toFixed(0);
        const unwrapWETHMethodEncoded = Web3Pure.encodeFunctionCall(
            swapRouterContractAbi,
            'unwrapWETH9',
            [amountOutMin, this.walletAddress]
        );

        return {
            methodName: 'multicall',
            methodArguments: [[exactInputMethodEncoded, unwrapWETHMethodEncoded]]
        };
    }

    /**
     * Returns swap `exactInput` method's name and arguments to use in Swap contract.
     */
    private getSwapRouterExactInputMethodData(walletAddress: string): MethodData {
        const amountOutMin = this.from.weiAmountMinusSlippage(this.slippageTolerance).toFixed(0);

        if (this.route.poolsPath.length === 1) {
            return {
                methodName: 'exactInputSingle',
                methodArguments: [
                    [
                        this.route.initialTokenAddress,
                        this.to.address,
                        this.route.poolsPath[0].fee,
                        walletAddress,
                        Utils.deadlineMinutesTimestamp(this.deadlineMinutes),
                        this.from.weiAmount,
                        amountOutMin,
                        0
                    ]
                ]
            };
        }
        return {
            methodName: 'exactInput',
            methodArguments: [
                [
                    LiquidityPoolsController.getEncodedPoolsPath(
                        this.route.poolsPath,
                        this.route.initialTokenAddress
                    ),
                    walletAddress,
                    Utils.deadlineMinutesTimestamp(this.deadlineMinutes),
                    this.from.weiAmount,
                    amountOutMin
                ]
            ]
        };
    }

    /**
     * Returns encoded data of estimated gas function and default estimated gas.
     */
    private getEstimateGasParams(): { callData: BatchCall; defaultGasLimit: string } {
        const defaultEstimateGas = swapEstimatedGas[this.route.poolsPath.length - 1]
            .plus(this.from.isNative ? WethToEthEstimatedGas : 0)
            .toFixed(0);

        const { methodName, methodArguments } = this.getSwapRouterMethodData();

        return {
            callData: {
                contractMethod: methodName,
                params: methodArguments,
                value: this.from.isNative ? this.from.stringWeiAmount : undefined
            },
            defaultGasLimit: defaultEstimateGas
        };
    }
}
