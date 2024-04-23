import { PublicKey, Signer } from "@metaplex-foundation/js"
import { buildSimpleTransaction, CacheLTA, generatePubKey, InnerSimpleV0Transaction, InstructionType, MARKET_STATE_LAYOUT_V2, splitTxAndSigners, struct, TxVersion, u16, u32, u64, u8, ZERO } from "@raydium-io/raydium-sdk"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { createInitializeAccountInstruction, getMint } from "@solana/spl-token-2"
import { Blockhash, Connection, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import { addLookupTableInfo, makeTxVersion } from "../removeLiquidity/config"
import BN from "bn.js"
import { Token } from "@raydium-io/raydium-sdk"
import { connection, PROGRAMIDS } from "../removeLiquidity/config"
// import { Transaction } from "jito-ts/dist/gen/geyser/confirmed_block"
import { SignerWalletAdapterProps } from "@solana/wallet-adapter-base"
import axios from "axios"
import base58 from "bs58"
import { CreateMarketFormValues } from "../../pages/market/create"
import { ApibundleSend } from "../DistributeTokens/bundler"
import { Transaction } from "jito-ts/dist/gen/geyser/confirmed_block"

async function makeCreateMarketInstructionSimple<T extends TxVersion>({
    connection,
    wallet,
    baseInfo,
    quoteInfo,
    lotSize,
    tickSize,
    dexProgramId,
    makeTxVersion,
    lookupTableCache,
}: {
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    connection: Connection
    wallet: PublicKey
    baseInfo: {
        mint: PublicKey
        decimals: number
    }
    quoteInfo: {
        mint: PublicKey
        decimals: number
    }
    lotSize: number
    tickSize: number
    dexProgramId: PublicKey
}) {
    const market = generatePubKey({ fromPublicKey: wallet, programId: dexProgramId })
    const requestQueue = generatePubKey({ fromPublicKey: wallet, programId: dexProgramId })
    const eventQueue = generatePubKey({ fromPublicKey: wallet, programId: dexProgramId })
    const bids = generatePubKey({ fromPublicKey: wallet, programId: dexProgramId })
    const asks = generatePubKey({ fromPublicKey: wallet, programId: dexProgramId })
    const baseVault = generatePubKey({ fromPublicKey: wallet, programId: TOKEN_PROGRAM_ID })
    const quoteVault = generatePubKey({ fromPublicKey: wallet, programId: TOKEN_PROGRAM_ID })
    const feeRateBps = 0
    const quoteDustThreshold = new BN(100)

    function getVaultOwnerAndNonce() {
        const vaultSignerNonce = new BN(0)
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const vaultOwner = PublicKey.createProgramAddressSync(
                    [market.publicKey.toBuffer(), vaultSignerNonce.toArrayLike(Buffer, 'le', 8)],
                    dexProgramId,
                )
                return { vaultOwner, vaultSignerNonce }
            } catch (e) {
                vaultSignerNonce.iaddn(1)
                if (vaultSignerNonce.gt(new BN(25555))) throw Error('find vault owner error')
            }
        }
    }
    const { vaultOwner, vaultSignerNonce } = getVaultOwnerAndNonce()

    const baseLotSize = new BN(Math.round(10 ** baseInfo.decimals * lotSize))
    const quoteLotSize = new BN(Math.round(lotSize * 10 ** quoteInfo.decimals * tickSize))

    if (baseLotSize.eq(ZERO)) throw Error('lot size is too small')
    if (quoteLotSize.eq(ZERO)) throw Error('tick size or lot size is too small')

    const ins = await makeCreateMarketInstruction({
        connection,
        wallet,
        marketInfo: {
            programId: dexProgramId,
            id: market,
            baseMint: baseInfo.mint,
            quoteMint: quoteInfo.mint,
            baseVault,
            quoteVault,
            vaultOwner,
            requestQueue,
            eventQueue,
            bids,
            asks,

            feeRateBps,
            quoteDustThreshold,
            vaultSignerNonce,
            baseLotSize,
            quoteLotSize,
        },
    })

    return {
        address: ins.address,
        innerTransactions: await splitTxAndSigners({
            connection,
            makeTxVersion,
            computeBudgetConfig: undefined,
            payer: wallet,
            innerTransaction: ins.innerTransactions,
            lookupTableCache,
        }),
    }
}

async function makeCreateMarketInstruction({
    connection,
    wallet,
    marketInfo,
}: {
    connection: Connection
    wallet: PublicKey
    marketInfo: {
        programId: PublicKey
        id: { publicKey: PublicKey; seed: string }
        baseMint: PublicKey
        quoteMint: PublicKey
        baseVault: { publicKey: PublicKey; seed: string }
        quoteVault: { publicKey: PublicKey; seed: string }
        vaultOwner: PublicKey

        requestQueue: { publicKey: PublicKey; seed: string }
        eventQueue: { publicKey: PublicKey; seed: string }
        bids: { publicKey: PublicKey; seed: string }
        asks: { publicKey: PublicKey; seed: string }

        feeRateBps: number
        vaultSignerNonce: BN
        quoteDustThreshold: BN

        baseLotSize: BN
        quoteLotSize: BN
    }
}) {
    const ins1: TransactionInstruction[] = []
    const accountLamports = await connection.getMinimumBalanceForRentExemption(165)
    ins1.push(
        //ComputeBudgetProgram.setComputeUnitPrice({
        //microLamports: 600000 // change gas here
        //}),
        //ComputeBudgetProgram.setComputeUnitLimit({ 
        //units: 250000 // change gas here
        //}),
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet,
            basePubkey: wallet,
            seed: marketInfo.baseVault.seed,
            newAccountPubkey: marketInfo.baseVault.publicKey,
            lamports: accountLamports,
            space: 165,
            programId: TOKEN_PROGRAM_ID,
        }),
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet,
            basePubkey: wallet,
            seed: marketInfo.quoteVault.seed,
            newAccountPubkey: marketInfo.quoteVault.publicKey,
            lamports: accountLamports,
            space: 165,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(marketInfo.baseVault.publicKey, marketInfo.baseMint, marketInfo.vaultOwner),
        createInitializeAccountInstruction(marketInfo.quoteVault.publicKey, marketInfo.quoteMint, marketInfo.vaultOwner),
    )

    const ins2: TransactionInstruction[] = []
    ins2.push(
        //ComputeBudgetProgram.setComputeUnitPrice({
        //microLamports: 600000 // change gas here
        //}),
        //ComputeBudgetProgram.setComputeUnitLimit({ 
        //units: 250000 // change gas here
        //}),
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet,
            basePubkey: wallet,
            seed: marketInfo.id.seed,
            newAccountPubkey: marketInfo.id.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(MARKET_STATE_LAYOUT_V2.span),
            space: MARKET_STATE_LAYOUT_V2.span,
            programId: marketInfo.programId,
        }),
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet,
            basePubkey: wallet,
            seed: marketInfo.requestQueue.seed,
            newAccountPubkey: marketInfo.requestQueue.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(124), // CHANGE
            space: 124, // CHANGE
            programId: marketInfo.programId,
        }),
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet,
            basePubkey: wallet,
            seed: marketInfo.eventQueue.seed,
            newAccountPubkey: marketInfo.eventQueue.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(11308), // CHANGE
            space: 11308, // CHANGE
            programId: marketInfo.programId,
        }),
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet,
            basePubkey: wallet,
            seed: marketInfo.bids.seed,
            newAccountPubkey: marketInfo.bids.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(14524), // CHANGE
            space: 14524, // CHANGE
            programId: marketInfo.programId,
        }),
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet,
            basePubkey: wallet,
            seed: marketInfo.asks.seed,
            newAccountPubkey: marketInfo.asks.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(14524), // CHANGE
            space: 14524, // CHANGE
            programId: marketInfo.programId,
        }),
        await initializeMarketInstruction({
            programId: marketInfo.programId,
            marketInfo: {
                id: marketInfo.id.publicKey,
                requestQueue: marketInfo.requestQueue.publicKey,
                eventQueue: marketInfo.eventQueue.publicKey,
                bids: marketInfo.bids.publicKey,
                asks: marketInfo.asks.publicKey,
                baseVault: marketInfo.baseVault.publicKey,
                quoteVault: marketInfo.quoteVault.publicKey,
                baseMint: marketInfo.baseMint,
                quoteMint: marketInfo.quoteMint,

                baseLotSize: marketInfo.baseLotSize,
                quoteLotSize: marketInfo.quoteLotSize,
                feeRateBps: marketInfo.feeRateBps,
                vaultSignerNonce: marketInfo.vaultSignerNonce,
                quoteDustThreshold: marketInfo.quoteDustThreshold,
            },
        }),
    )

    return {
        address: {
            marketId: marketInfo.id.publicKey,
            requestQueue: marketInfo.requestQueue.publicKey,
            eventQueue: marketInfo.eventQueue.publicKey,
            bids: marketInfo.bids.publicKey,
            asks: marketInfo.asks.publicKey,
            baseVault: marketInfo.baseVault.publicKey,
            quoteVault: marketInfo.quoteVault.publicKey,
            baseMint: marketInfo.baseMint,
            quoteMint: marketInfo.quoteMint,
        },
        innerTransactions: [
            {
                instructions: ins1,
                signers: [],
                instructionTypes: [
                    //InstructionType.setComputeUnitPrice,
                    //InstructionType.setComputeUnitLimit,
                    InstructionType.createAccount,
                    InstructionType.createAccount,
                    InstructionType.initAccount,
                    InstructionType.initAccount,
                ],
            },
            {
                instructions: ins2,
                signers: [],
                instructionTypes: [
                    //InstructionType.setComputeUnitPrice,
                    //InstructionType.setComputeUnitLimit,
                    InstructionType.createAccount,
                    InstructionType.createAccount,
                    InstructionType.createAccount,
                    InstructionType.createAccount,
                    InstructionType.createAccount,
                    InstructionType.initMarket,
                ],
            },
        ],
    }
}


async function initializeMarketInstruction({
    programId,
    marketInfo,
}: {
    programId: PublicKey
    marketInfo: {
        id: PublicKey
        requestQueue: PublicKey
        eventQueue: PublicKey
        bids: PublicKey
        asks: PublicKey
        baseVault: PublicKey
        quoteVault: PublicKey
        baseMint: PublicKey
        quoteMint: PublicKey
        authority?: PublicKey
        pruneAuthority?: PublicKey

        baseLotSize: BN
        quoteLotSize: BN
        feeRateBps: number
        vaultSignerNonce: BN
        quoteDustThreshold: BN
    }
}) {
    const dataLayout = struct([
        u8('version'),
        u32('instruction'),
        u64('baseLotSize'),
        u64('quoteLotSize'),
        u16('feeRateBps'),
        u64('vaultSignerNonce'),
        u64('quoteDustThreshold'),
    ])

    const keys = [
        { pubkey: marketInfo.id, isSigner: false, isWritable: true },
        { pubkey: marketInfo.requestQueue, isSigner: false, isWritable: true },
        { pubkey: marketInfo.eventQueue, isSigner: false, isWritable: true },
        { pubkey: marketInfo.bids, isSigner: false, isWritable: true },
        { pubkey: marketInfo.asks, isSigner: false, isWritable: true },
        { pubkey: marketInfo.baseVault, isSigner: false, isWritable: true },
        { pubkey: marketInfo.quoteVault, isSigner: false, isWritable: true },
        { pubkey: marketInfo.baseMint, isSigner: false, isWritable: false },
        { pubkey: marketInfo.quoteMint, isSigner: false, isWritable: false },
        // Use a dummy address if using the new dex upgrade to save tx space.
        {
            pubkey: marketInfo.authority ? marketInfo.quoteMint : SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ]
        .concat(marketInfo.authority ? { pubkey: marketInfo.authority, isSigner: false, isWritable: false } : [])
        .concat(
            marketInfo.authority && marketInfo.pruneAuthority
                ? { pubkey: marketInfo.pruneAuthority, isSigner: false, isWritable: false }
                : [],
        )

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
        {
            version: 0,
            instruction: 0,
            baseLotSize: marketInfo.baseLotSize,
            quoteLotSize: marketInfo.quoteLotSize,
            feeRateBps: marketInfo.feeRateBps,
            vaultSignerNonce: marketInfo.vaultSignerNonce,
            quoteDustThreshold: marketInfo.quoteDustThreshold,
        },
        data,
    )

    return new TransactionInstruction({
        keys,
        programId,
        data,
    })
}

export async function createMarket(basemint: PublicKey, wallet: PublicKey, jitoTip: number, signAllTransactions: any, data: CreateMarketFormValues) {
    const tokenInfo = await getMint(connection, basemint, 'finalized', TOKEN_PROGRAM_ID)
    const baseToken = new Token(TOKEN_PROGRAM_ID, basemint, tokenInfo.decimals);
    const quoteToken = new Token(TOKEN_PROGRAM_ID, new PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'WSOL');
    // -------- step 1: make instructions --------
    const createMarketInstruments = await makeCreateMarketInstructionSimple({
        connection,
        wallet: wallet,
        baseInfo: baseToken,
        quoteInfo: quoteToken,
        lotSize: data.lotSize, // default 1
        tickSize: data.tickSize, // default 0.01
        dexProgramId: PROGRAMIDS.OPENBOOK_MARKET,
        makeTxVersion,
    })

    console.log('creatingmint')
    await buildAndSendTx(createMarketInstruments.innerTransactions, jitoTip, wallet, signAllTransactions, createMarketInstruments.address)

    return createMarketInstruments.address
}


export async function buildAndSendTx(innerSimpleV0Transaction: InnerSimpleV0Transaction[], jitoTip: number,
    wallet: PublicKey, signAllTransactions: SignerWalletAdapterProps['signAllTransactions'], marketSigners: any) {
    const { blockhash } = await connection.getLatestBlockhash('finalized');

    const willSendTx = await buildSimpleTransaction({
        connection,
        makeTxVersion,
        payer: wallet,
        innerTransactions: innerSimpleV0Transaction,
        recentBlockhash: blockhash,
        addLookupTableInfo: addLookupTableInfo,
    })
    if (willSendTx instanceof VersionedTransaction) {
        willSendTx.sign(marketSigners);
    }
    await sendTx(willSendTx, blockhash, jitoTip, signAllTransactions, wallet)
}

export const TAX_WALLET = new PublicKey('D5bBVBQDNDzroQpduEJasYL5HkvARD6TcNu3yJaeVK5W');

export async function sendTx(
    txs: any,
    blockhash: string | Blockhash,
    jitoTipAmt: number,
    signAllTransactions: SignerWalletAdapterProps['signAllTransactions'],
    wallet: PublicKey,
) {
    const bundledTxns: VersionedTransaction[] = [];
    for (const iTx of txs) {
        if (iTx instanceof VersionedTransaction) {
            bundledTxns.push(iTx);
        }
    }




    const tipSwapIxn: TransactionInstruction[] = [];

    const tip = SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: new PublicKey('Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY'),
        lamports: BigInt(jitoTipAmt),
    });

    tipSwapIxn.push(tip);

    const taxTxn = SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: TAX_WALLET,
        lamports: BigInt(200000000),
    });

    tipSwapIxn.push(taxTxn);

    const message = new TransactionMessage({
        payerKey: wallet,
        recentBlockhash: blockhash,
        instructions: tipSwapIxn,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(message);

    const serializedMsg = versionedTx.serialize();
    console.log("Txn size:", serializedMsg.length);

    bundledTxns.push(versionedTx);
    console.log("Sending transaction...");

    await signAllTransactions(bundledTxns);


    // Assume that `transactions` is an array of your transactions
    const EncodedbundledTxns = bundledTxns.map(txn => base58.encode(txn.serialize()));

    const formData = {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [EncodedbundledTxns]
    };

    console.log('formData:', formData);

    try {
        for (const tx of bundledTxns) {
            console.log('tx:', tx);
            await connection.sendTransaction(tx);
        }
        // const bundleid = await ApibundleSend(formData, 'ny.mainnet.block-engine.jito.wtf');
        // console.log('bundleid:', bundleid);
    } catch (error) {
        console.error(error);
        throw new Error('Error sending transaction');
    }

    return;
}


