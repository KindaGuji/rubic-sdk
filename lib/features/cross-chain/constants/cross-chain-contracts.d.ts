import { CrossChainContractData } from '../contract-data/cross-chain-contract-data';
import { PancakeSwapProvider } from '../../swap/dexes/bsc/pancake-swap/pancake-swap-provider';
import { UniSwapV2Provider } from '../../swap/dexes/ethereum/uni-swap-v2/uni-swap-v2-provider';
import { QuickSwapProvider } from '../../swap/dexes/polygon/quick-swap/quick-swap-provider';
import { CrossChainSupportedBlockchain } from './cross-chain-supported-blockchains';
import { SpookySwapProvider } from '../../swap/dexes/fantom/spooky-swap/spooky-swap-provider';
import { JoeProvider } from '../../swap/dexes/avalanche/joe/joe-provider';
import { SolarbeamProvider } from '../../swap/dexes/moonriver/solarbeam/solarbeam-provider';
import { PangolinProvider } from '../../swap/dexes/avalanche/pangolin/pangolin-provider';
import { SushiSwapEthereumProvider } from '../../swap/dexes/ethereum/sushi-swap-ethereum/sushi-swap-ethereum-provider';
import { SushiSwapBscProvider } from '../../swap/dexes/bsc/sushi-swap-bsc/sushi-swap-bsc-provider';
import { SushiSwapPolygonProvider } from '../../swap/dexes/polygon/sushi-swap-polygon/sushi-swap-polygon-provider';
import { SushiSwapMoonriverProvider } from '../../swap/dexes/moonriver/sushi-swap-moonriver/sushi-swap-moonriver-provider';
import { SpiritSwapProvider } from '../../swap/dexes/fantom/spirit-swap/spirit-swap-provider';
import { SushiSwapFantomProvider } from '../../swap/dexes/fantom/sushi-swap-fantom/sushi-swap-fantom-provider';
import { SushiSwapAvalancheProvider } from '../../swap/dexes/avalanche/sushi-swap-avalanche/sushi-swap-avalanche-provider';
/**
 * Stores contracts info.
 * Every contract may have several instant-trade providers.
 * Because of that every provider has `method suffix` - suffix
 * to add to default swap-method name to call that provider's method.
 */
export declare const crossChainContractsData: {
    readonly ETH: {
        readonly address: "0xD8b19613723215EF8CC80fC35A1428f8E8826940";
        readonly providersData: readonly [{
            readonly ProviderClass: typeof UniSwapV2Provider;
            readonly methodSuffix: "";
        }, {
            readonly ProviderClass: typeof SushiSwapEthereumProvider;
            readonly methodSuffix: "1";
        }];
    };
    readonly BSC: {
        readonly address: "0xEda6DdA4fD1581B6Ab8951750DB596566d0FBf9C";
        readonly providersData: readonly [{
            readonly ProviderClass: typeof PancakeSwapProvider;
            readonly methodSuffix: "";
        }, {
            readonly ProviderClass: typeof SushiSwapBscProvider;
            readonly methodSuffix: "1";
        }];
    };
    readonly POLYGON: {
        readonly address: "0xe6625BBE80710C7Bb473721EdAC24Ce326940a6f";
        readonly providersData: readonly [{
            readonly ProviderClass: typeof QuickSwapProvider;
            readonly methodSuffix: "";
        }, {
            readonly ProviderClass: typeof SushiSwapPolygonProvider;
            readonly methodSuffix: "1";
        }];
    };
    readonly AVALANCHE: {
        readonly address: "0xd23B4dA264A756F427e13C72AB6cA5A6C95E4608";
        readonly providersData: readonly [{
            readonly ProviderClass: typeof PangolinProvider;
            readonly methodSuffix: "AVAX";
        }, {
            readonly ProviderClass: typeof JoeProvider;
            readonly methodSuffix: "AVAX1";
        }, {
            readonly ProviderClass: typeof SushiSwapAvalancheProvider;
            readonly methodSuffix: "";
        }];
    };
    readonly MOONRIVER: {
        readonly address: "0xD8b19613723215EF8CC80fC35A1428f8E8826940";
        readonly providersData: readonly [{
            readonly ProviderClass: typeof SolarbeamProvider;
            readonly methodSuffix: "";
        }, {
            readonly ProviderClass: typeof SushiSwapMoonriverProvider;
            readonly methodSuffix: "1";
        }];
    };
    readonly FANTOM: {
        readonly address: "0x55Be05ecC1c417B16163b000CB71DcE8526a5D06";
        readonly providersData: readonly [{
            readonly ProviderClass: typeof SpookySwapProvider;
            readonly methodSuffix: "";
        }, {
            readonly ProviderClass: typeof SpiritSwapProvider;
            readonly methodSuffix: "1";
        }, {
            readonly ProviderClass: typeof SushiSwapFantomProvider;
            readonly methodSuffix: "2";
        }];
    };
};
export declare function getCrossChainContract(blockchain: CrossChainSupportedBlockchain): CrossChainContractData;
