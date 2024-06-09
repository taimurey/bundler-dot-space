import {
  buildSimpleTransaction,
  InnerSimpleV0Transaction,
  LOOKUP_TABLE_CACHE,
  MAINNET_PROGRAM_ID,
  TxVersion,

} from '@raydium-io/raydium-sdk';
import {
  Connection,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  VersionedTransaction,
  PublicKey,
  SystemProgram
} from '@solana/web3.js';

import { Liquidity } from '@raydium-io/raydium-sdk';
import { BN } from "bn.js";
import base58 from 'bs58';
import { addLookupTableInfo, DEFAULT_TOKEN } from '../removeLiquidity/config';
import { JitoPoolData } from './AmmPool';





export async function sendTx(
  connection: Connection,
  payer: Keypair | Signer,
  txs: (VersionedTransaction | Transaction)[],
  options?: SendOptions
): Promise<string[]> {
  const txids: string[] = [];
  for (const iTx of txs) {
    if (iTx instanceof VersionedTransaction) {
      iTx.sign([payer]);
      txids.push(await connection.sendTransaction(iTx, options));
    } else {
      txids.push(await connection.sendTransaction(iTx, [payer], options));
    }
  }
  return txids;
}



export async function buildAndSendTx(connection: Connection, keypair: Keypair, innerSimpleV0Transaction: InnerSimpleV0Transaction[], options?: SendOptions) {
  const willSendTx = await buildSimpleTransaction({
    connection,
    makeTxVersion: TxVersion.V0,
    payer: keypair.publicKey,
    innerTransactions: innerSimpleV0Transaction,
    addLookupTableInfo: addLookupTableInfo,
  })

  return await sendTx(connection, keypair, willSendTx, options)
}



export async function build_swap_instructions({ connection, poolKeys, tokenAccountRawInfos_Swap, inputTokenAmount, minAmountOut }: any, BuyerPublicKey: PublicKey) {

  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: tokenAccountRawInfos_Swap,
      owner: BuyerPublicKey,
    },
    amountIn: inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: "in",
    makeTxVersion: TxVersion.V0,
    // computeBudgetConfig: await getComputeBudgetConfigHigh(),
  })



  return innerTransactions;

}



export async function build_swap_sell_instructions({ connection, poolKeys, tokenAccountRawInfos_Swap, keypair, inputTokenAmount, minAmountOut }: any) {

  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: tokenAccountRawInfos_Swap,
      owner: keypair.publicKey,
    },
    amountIn: inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: "out",
    makeTxVersion: TxVersion.V0,
    // computeBudgetConfig: await getComputeBudgetConfigHigh(),

  })

  return innerTransactions;

}


// export async function build_create_pool_instructions({ market_id, keypair, tokenAccountRawInfos, baseMint, baseDecimals, quoteMint, quoteDecimals, delay_pool_open_time, base_amount_input, quote_amount }: any) {
export async function build_create_pool_instructions(connection: Connection, PoolData: JitoPoolData, tokenAccountRawInfos: any, base_amount: any, quote_amount: any) {
  const keypair = Keypair.fromSecretKey(base58.decode(PoolData.deployerPrivateKey));

  console.log('base_amount:', base_amount);
  console.log('Type of base_amount:', typeof base_amount);

  console.log('quote_amount:', quote_amount);
  console.log('Type of quote_amount:', typeof quote_amount);
  const { innerTransactions } =
    await Liquidity.makeCreatePoolV4InstructionV2Simple({
      connection,
      programId: MAINNET_PROGRAM_ID.AmmV4,
      marketInfo: {
        programId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
        marketId: new PublicKey(PoolData.tokenMarketID),
      },
      associatedOnly: false,
      ownerInfo: {
        feePayer: keypair.publicKey,
        wallet: keypair.publicKey,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true,
      },
      baseMintInfo: {
        mint: new PublicKey(PoolData.tokenMintAddress),
        decimals: Number(PoolData.tokenDecimals),
      },
      quoteMintInfo: {
        mint: DEFAULT_TOKEN.WSOL.mint,
        decimals: DEFAULT_TOKEN.WSOL.decimals,
      },

      startTime: new BN(Math.floor(Date.now() / 1000)),
      baseAmount: new BN(base_amount.toString()),

      quoteAmount: new BN(quote_amount.toString()),

      // computeBudgetConfig: ,
      checkCreateATAOwner: true,
      makeTxVersion: TxVersion.V0,
      lookupTableCache: LOOKUP_TABLE_CACHE,
      feeDestinationId: new PublicKey(
        "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5"
      ),
    })

  const taxInstruction = SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey: new PublicKey("GeQVgDTixeGXCX3WgL2CyEofsZQUBXTzDD5Ab8Y3DjQ8"),
    lamports: 250000000,
  });

  innerTransactions[0].instructions.push(taxInstruction);

  return innerTransactions;

}