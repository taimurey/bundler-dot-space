

import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { build_bundle, onBundleResult } from './build-bundle';
import { InnerSimpleV0Transaction } from '@raydium-io/raydium-sdk';
import { blockEngineUrl, connection, jito_auth_keypair } from '../removeLiquidity/config';
import { Keypair } from '@solana/web3.js';

export async function bull_dozer(lp_ix: InnerSimpleV0Transaction[], swap_ix: InnerSimpleV0Transaction[], buyerkeypair: Keypair, deployerkeypair: Keypair) {

  console.log('BLOCK_ENGINE_URL:', blockEngineUrl);
  const bundleTransactionLimit = parseInt('3');

  const search = searcherClient(blockEngineUrl, jito_auth_keypair);


  await build_bundle(
    search,
    bundleTransactionLimit,
    lp_ix,
    swap_ix,
    connection,
    buyerkeypair,
    deployerkeypair
  );
  const bundle_result = await onBundleResult(search)
  return bundle_result

  // search.onBundleResult(
  //   (bundle) => {
  //     console.log(`JITO bundle result: ${JSON.stringify(bundle)}`);
  //     return true;
  //   },
  //   (error) => {
  //     console.log(`JITO bundle error: ${error}`);
  //     return false;
  //   }
  // );




}

