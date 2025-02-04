import { RubicSdkError } from '@common/errors/rubic-sdk.error';
import { notNull } from '@common/utils/object';
import { combineOptions } from '@common/utils/options';
import pTimeout from '@common/utils/p-timeout';
import { Mutable } from '@common/utils/types/mutable';
import { BlockchainName } from '@core/blockchain/models/blockchain-name';
import { PriceToken } from '@core/blockchain/tokens/price-token';
import { PriceTokenAmount } from '@core/blockchain/tokens/price-token-amount';
import { Token } from '@core/blockchain/tokens/token';
import { InstantTradeProvider } from '@features/instant-trades/instant-trade-provider';
import { SwapManagerCalculationOptions } from '@features/instant-trades/models/swap-manager-calculation-options';
import { TradeType } from '@features/instant-trades/models/trade-type';
import { TypedTradeProviders } from '@features/instant-trades/models/typed-trade-provider';
import { InstantTrade } from 'src/features';
import { MarkRequired } from 'ts-essentials';
import { getPriceTokensFromInputTokens } from '@common/utils/tokens';
import { UniswapV2TradeProviders } from '@features/instant-trades/constants/uniswap-v2-trade-providers';
import { UniswapV3TradeProviders } from '@features/instant-trades/constants/uniswap-v3-trade-providers';
import { OneInchTradeProviders } from '@features/instant-trades/constants/one-inch-trade-providers';
import { ZrxTradeProviders } from '@features/instant-trades/constants/zrx-trade-providers';
import { AlgebraTradeProviders } from '@features/instant-trades/constants/algebra-trade-providers';
import { EMPTY_ADDRESS } from '@core/blockchain/constants/empty-address';

export type RequiredSwapManagerCalculationOptions = MarkRequired<
    SwapManagerCalculationOptions,
    'timeout' | 'disabledProviders'
>;

export class InstantTradesManager {
    public static readonly defaultCalculationTimeout = 3_000;

    private static getFullOptions(
        options?: SwapManagerCalculationOptions
    ): RequiredSwapManagerCalculationOptions {
        return combineOptions<SwapManagerCalculationOptions>(options, {
            timeout: InstantTradesManager.defaultCalculationTimeout,
            disabledProviders: [],
            gasCalculation: 'calculate',
            disableMultihops: false,
            slippageTolerance: 0.02,
            deadlineMinutes: 20,
            wrappedAddress: EMPTY_ADDRESS,
            fromAddress: ''
        });
    }

    private tradeProviders: TypedTradeProviders = [
        ...UniswapV2TradeProviders,
        ...UniswapV3TradeProviders,
        ...OneInchTradeProviders,
        ...ZrxTradeProviders,
        ...AlgebraTradeProviders
    ].reduce((acc, ProviderClass) => {
        const provider = new ProviderClass();
        acc[provider.type] = provider;
        return acc;
    }, {} as Mutable<TypedTradeProviders>);

    public readonly blockchainTradeProviders: Readonly<
        Record<BlockchainName, Partial<TypedTradeProviders>>
    > = Object.entries(this.tradeProviders).reduce(
        (acc, [type, provider]) => ({
            ...acc,
            [provider.blockchain]: { ...acc[provider.blockchain], [type]: provider }
        }),
        {} as Record<BlockchainName, Partial<TypedTradeProviders>>
    );

    public async calculateTrade(
        fromToken:
            | Token
            | {
                  address: string;
                  blockchain: BlockchainName;
              },
        fromAmount: string | number,
        toToken: Token | string,
        options?: SwapManagerCalculationOptions
    ): Promise<InstantTrade[]> {
        if (toToken instanceof Token && fromToken.blockchain !== toToken.blockchain) {
            throw new RubicSdkError('Blockchains of from and to tokens must be same.');
        }

        const { from, to } = await getPriceTokensFromInputTokens(
            fromToken,
            fromAmount.toString(),
            toToken
        );

        return this.calculateTradeFromTokens(
            from,
            to,
            InstantTradesManager.getFullOptions(options)
        );
    }

    private async calculateTradeFromTokens(
        from: PriceTokenAmount,
        to: PriceToken,
        options: RequiredSwapManagerCalculationOptions
    ): Promise<InstantTrade[]> {
        const { timeout, disabledProviders, ...providersOptions } = options;
        const providers = Object.entries(this.blockchainTradeProviders[from.blockchain]).filter(
            ([type]) => !disabledProviders.includes(type as TradeType)
        ) as [TradeType, InstantTradeProvider][];

        if (!providers.length) {
            throw new RubicSdkError(`There are no providers for ${from.blockchain} blockchain`);
        }

        const calculationPromises = providers.map(async ([type, provider]) => {
            try {
                return await pTimeout(provider.calculate(from, to, providersOptions), timeout);
            } catch (e) {
                console.debug(
                    `[RUBIC_SDK] Trade calculation error occurred for ${type} trade provider.`,
                    e
                );
                return null;
            }
        });

        const results = await Promise.all(calculationPromises);
        return results.filter(notNull);
    }
}
