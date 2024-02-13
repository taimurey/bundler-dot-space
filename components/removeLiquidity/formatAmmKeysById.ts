import {
  ApiPoolInfoV4,
  LIQUIDITY_STATE_LAYOUT_V4,
  Liquidity,
  MARKET_STATE_LAYOUT_V3,
  Market,
  SPL_MINT_LAYOUT
} from '@raydium-io/raydium-sdk';
import {
  PublicKey
} from '@solana/web3.js';

import { connection } from './config';

export async function formatAmmKeysById(id: string): Promise<ApiPoolInfoV4 | undefined> {
  let account = null;
  const startTime = Date.now();
  let retries = 0;
  const maxRetries = 1000; // Set your desired maximum number of retries
  while (account === null && retries < maxRetries) {
    account = await connection.getAccountInfo(new PublicKey(id));
    if (account === null) {
      retries++;
      continue;
    }

    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);
    const marketId = info.marketId;
    const marketAccount = await connection.getAccountInfo(marketId);
    if (marketAccount === null) {
      console.error('Failed to get market info');
      continue;
    }
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

    const lpMint = info.lpMint;
    const lpMintAccount = await connection.getAccountInfo(lpMint);
    if (lpMintAccount === null) {
      console.error('Failed to get lp mint info');
      continue;
    }
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

    const endTime = Date.now();
    console.log(`Time taken: ${endTime - startTime} ms`);

    return {
      id,
      baseMint: info.baseMint.toString(),
      quoteMint: info.quoteMint.toString(),
      lpMint: info.lpMint.toString(),
      baseDecimals: info.baseDecimal.toNumber(),
      quoteDecimals: info.quoteDecimal.toNumber(),
      lpDecimals: lpMintInfo.decimals,
      version: 4,
      programId: account.owner.toString(),
      authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
      openOrders: info.openOrders.toString(),
      targetOrders: info.targetOrders.toString(),
      baseVault: info.baseVault.toString(),
      quoteVault: info.quoteVault.toString(),
      withdrawQueue: info.withdrawQueue.toString(),
      lpVault: info.lpVault.toString(),
      marketVersion: 3,
      marketProgramId: info.marketProgramId.toString(),
      marketId: info.marketId.toString(),
      marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
      marketBaseVault: marketInfo.baseVault.toString(),
      marketQuoteVault: marketInfo.quoteVault.toString(),
      marketBids: marketInfo.bids.toString(),
      marketAsks: marketInfo.asks.toString(),
      marketEventQueue: marketInfo.eventQueue.toString(),
      lookupTableAccount: PublicKey.default.toString()
    }
  }

  if (account === null) {
    console.log('Account not found after maximum retries');
    return undefined;
  }
}