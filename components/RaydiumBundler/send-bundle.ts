

import { build_bundle } from './build-bundle';
import { InnerSimpleV0Transaction } from '@raydium-io/raydium-sdk';
import { JitoPoolData } from './AmmPool';
import { Connection } from '@solana/web3.js';

export async function BuildandSendTxn(connection: Connection,
  lp_ix: InnerSimpleV0Transaction[],
  swap_ix: InnerSimpleV0Transaction[],
  formData: JitoPoolData) {

  const bundle = await build_bundle(
    connection,
    lp_ix,
    swap_ix,
    formData
  );

  return bundle;
}

