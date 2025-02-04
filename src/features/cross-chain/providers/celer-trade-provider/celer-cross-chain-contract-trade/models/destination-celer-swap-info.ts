import { SwapVersion } from '@features/cross-chain/providers/common/celer-rubic/models/provider-type.enum';

export interface DestinationCelerSwapInfo {
    dex: string;
    integrator: string;
    version: SwapVersion;
    path: string | string[];
    pathV3: string | string[];
    deadline: number;
    amountOutMinimum: string;
}
