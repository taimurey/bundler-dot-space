import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import pumpIdl from "./pump-idl.json";
import { PUMP_PROGRAM_ID } from "./constants";
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token-2";
import { PublicKey } from "@metaplex-foundation/js";
import base58 from "bs58";
import { ApibundleSend } from "../DistributeTokens/bundler";
import { TAX_WALLET } from "../market/marketInstruction";
import { getRandomElement } from './misc';
import { generateBuyIx } from "./instructions";
import { Liquidity, TxVersion } from '@raydium-io/raydium-sdk';


export async function PumpVolumeGenerator(
    connection: Connection,
    keypair: Keypair,
    tokenMint: string,
    BlockEngineSelection: string,
): Promise<string> {

    const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(keypair), AnchorProvider.defaultOptions()));
    const mintaddress = new PublicKey(tokenMint);
    const balance = await connection.getBalance(keypair.publicKey);

    const ataIx = (createAssociatedTokenAccountIdempotentInstruction(
        keypair.publicKey,
        getAssociatedTokenAddressSync(mintaddress, keypair.publicKey),
        keypair.publicKey,
        new PublicKey(keypair.publicKey),
    ))

    const buyerBuyIx = await generateBuyIx(mintaddress, new BN(balance), new BN(0), keypair, pumpProgram);

    let buyerIxs = [ataIx, buyerBuyIx];

    const buyerTx = new VersionedTransaction(
        new TransactionMessage({
            payerKey: keypair.publicKey,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions: buyerIxs,
        }).compileToV0Message());

    buyerTx.sign([keypair]);

    const EncodedbundledTxns = base58.encode(buyerTx.serialize());

    const bundledata = {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [EncodedbundledTxns]
    };

    const response = await ApibundleSend(bundledata, BlockEngineSelection);

    return response;
}

export async function build_swap_instructions({  connection, poolKeys, tokenAccountRawInfos_Swap, inputTokenAmount, minAmountOut }: any, BuyerPublicKey: PublicKey) {

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
        makeTxVersion: TxVersion.V0
        // computeBudgetConfig: await getComputeBudgetConfigHigh(),
    })



    return innerTransactions;

}