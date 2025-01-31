import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import pumpIdl from "./pump-idl.json";
import { GLOBAL_STATE, PUMP_PROGRAM_ID, tipAccounts } from "./constants";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import base58 from "bs58";
import { ApibundleSend } from "../DistributeTokens/bundler";
import { generateBuyIx } from "./instructions";
import { Liquidity, TxVersion } from '@raydium-io/raydium-sdk';
import { calculateBuyTokensAndNewReserves } from "./misc";


export async function PumpVolumeGenerator(
    connection: Connection,
    fundingWallet: Keypair,
    keypair: Keypair,
    tokenMint: string,
    BlockEngineSelection: string,
    tip: string,
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

    const globalStateData = await pumpProgram.account.global.fetch(GLOBAL_STATE);

    const tempBondingCurveData = {
        virtualTokenReserves: globalStateData.initialVirtualTokenReserves,
        virtualSolReserves: globalStateData.initialVirtualSolReserves,
        realTokenReserves: globalStateData.initialRealTokenReserves,
    }

    const devBuyQuote = calculateBuyTokensAndNewReserves(new BN(balance), tempBondingCurveData);
    const devMaxSol = new BN((balance + ((balance * 0.5))))
    const buyerBuyIx = await generateBuyIx(mintaddress, devBuyQuote.tokenAmount, devMaxSol, keypair, pumpProgram);


    const buyerIxs = [ataIx, buyerBuyIx];

    const tipIxs = SystemProgram.transfer({
        fromPubkey: fundingWallet.publicKey,
        toPubkey: new PublicKey(tipAccounts[0]),
        lamports: Number(tip) * LAMPORTS_PER_SOL,
    });

    buyerIxs.push(tipIxs);

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
        makeTxVersion: TxVersion.V0
        // computeBudgetConfig: await getComputeBudgetConfigHigh(),
    })



    return innerTransactions;

}