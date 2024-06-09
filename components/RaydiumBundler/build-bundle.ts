import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { InnerSimpleV0Transaction, buildSimpleTransaction } from "@raydium-io/raydium-sdk";
import { JitoPoolData } from "./AmmPool";
import base58 from "bs58";
import { addLookupTableInfo } from '../removeLiquidity/config';
import { TxVersion } from "@raydium-io/raydium-sdk";
import { getRandomElement } from "../PumpBundler/misc";
import { tipAccounts } from "../PumpBundler/constants";


export async function build_bundle(
  connection: Connection,
  lp_ix: InnerSimpleV0Transaction[],
  swap_ix: InnerSimpleV0Transaction[],
  poolData: JitoPoolData
) {
  const deployerkeypair = Keypair.fromSecretKey(base58.decode((poolData.deployerPrivateKey)));
  const buyerkeypair = Keypair.fromSecretKey(base58.decode((poolData.buyerPrivateKey)));

  const bundletxn = [];
  const resp = await connection.getLatestBlockhash("processed");

  const willSendTx1 = await buildSimpleTransaction({
    connection,
    makeTxVersion: TxVersion.V0,
    payer: deployerkeypair.publicKey,
    innerTransactions: lp_ix,
    addLookupTableInfo: addLookupTableInfo,
  });

  const willSendTx2 = await buildSimpleTransaction({
    connection,
    makeTxVersion: TxVersion.V0,
    payer: buyerkeypair.publicKey,
    innerTransactions: swap_ix,
    addLookupTableInfo: addLookupTableInfo,
  });

  if (willSendTx1[0] instanceof VersionedTransaction) {
    willSendTx1[0].sign([deployerkeypair]);
    // txids.push(await connection.sendTransaction(iTx, options));
    bundletxn.push(willSendTx1[0]);
  }

  if (willSendTx2[0] instanceof VersionedTransaction) {
    willSendTx2[0].sign([buyerkeypair]);
    bundletxn.push(willSendTx2[0]);
  }

  const tipIx = SystemProgram.transfer({
    fromPubkey: buyerkeypair.publicKey,
    toPubkey: new PublicKey(getRandomElement(tipAccounts)),
    lamports: Number(poolData.BundleTip) * LAMPORTS_PER_SOL
  });

  const recentBlockhash = resp.blockhash;

  const tiptxn = new VersionedTransaction(
    new TransactionMessage({
      payerKey: buyerkeypair.publicKey,
      recentBlockhash: recentBlockhash,
      instructions: [tipIx],
    }).compileToV0Message());

  tiptxn.sign([buyerkeypair]);
  bundletxn.push(tiptxn);

  return bundletxn;
}
