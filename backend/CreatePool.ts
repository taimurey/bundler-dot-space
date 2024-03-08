import { BN } from 'bn.js';
import { searcherClient } from './Jito/jito';
import {
    ApiPoolInfoV4,
    buildSimpleTransaction,
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys,
    MAINNET_PROGRAM_ID,
    MARKET_STATE_LAYOUT_V3,
    Token,
} from '@raydium-io/raydium-sdk';
import {
    Keypair,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js';

import {
    addLookupTableInfo,
    connection,
    DEFAULT_TOKEN,
    makeTxVersion,
    PROGRAMIDS,
    wallet,
} from './Config';
import {
    buildAndSendTx,
    getWalletTokenAccount,
} from './Util';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { makeSwap } from './swap';
import { Bundle as JitoBundle } from 'jito-ts/dist/sdk/block-engine/types';
import { SwapAmmKeysReAssigner } from '../components/removeLiquidity/formatAmmKeysById';
import { getRandomTipAccount } from './Jito/TipAccount';

const ZERO = new BN(0)
type BN = typeof ZERO

type CalcStartPrice = {
    addBaseAmount: BN
    addQuoteAmount: BN
}

function calcMarketStartPrice(input: CalcStartPrice) {
    return input.addBaseAmount.toNumber() / 10 ** 6 / (input.addQuoteAmount.toNumber() / 10 ** 6)
}

type LiquidityPairTargetInfo = {
    baseToken: Token
    quoteToken: Token
    targetMarketId: PublicKey
}

async function getMarketAssociatedPoolKeys(input: LiquidityPairTargetInfo): Promise<ApiPoolInfoV4 | undefined> {
    const marketAccount = await connection.getAccountInfo(input.targetMarketId);

    if (marketAccount === null) {
        console.error('Failed to get market info');
        return;
    }
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

    const marketdata = ({
        marketBaseVault: marketInfo.baseVault.toString(),
        marketQuoteVault: marketInfo.quoteVault.toString(),
        marketBids: marketInfo.bids.toString(),
        marketAsks: marketInfo.asks.toString(),
        marketEventQueue: marketInfo.eventQueue.toString(),
    })

    let pooldata = Liquidity.getAssociatedPoolKeys({
        version: 4,
        marketVersion: 3,
        baseMint: input.baseToken.mint,
        quoteMint: input.quoteToken.mint,
        baseDecimals: input.baseToken.decimals,
        quoteDecimals: input.quoteToken.decimals,
        marketId: input.targetMarketId,
        programId: PROGRAMIDS.AmmV4,
        marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    });
    const poolKeys = await SwapAmmKeysReAssigner(pooldata, marketdata)

    return poolKeys
}

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = LiquidityPairTargetInfo &
    CalcStartPrice & {
        startTime: number // seconds
        walletTokenAccounts: WalletTokenAccounts
        wallet: Keypair
    }

async function ammCreatePool(input: TestTxInputInfo): Promise<{ txids: string[] }> {

    // -------- step 0: get pool keys --------
    /* do something with market associated pool keys if needed */
    const associatedPoolKeys = await getMarketAssociatedPoolKeys({
        baseToken: input.baseToken,
        quoteToken: input.quoteToken,
        targetMarketId: input.targetMarketId,
    })


    // -------- step 1: make instructions --------
    const initPoolInstructionResponse = await Liquidity.makeCreatePoolV4InstructionV2Simple({
        connection,
        programId: PROGRAMIDS.AmmV4,
        marketInfo: {
            marketId: input.targetMarketId,
            programId: PROGRAMIDS.OPENBOOK_MARKET,
        },
        baseMintInfo: input.baseToken,
        quoteMintInfo: input.quoteToken,
        baseAmount: input.addBaseAmount,
        quoteAmount: input.addQuoteAmount,
        startTime: new BN(Math.floor(input.startTime)),
        ownerInfo: {
            feePayer: input.wallet.publicKey,
            wallet: input.wallet.publicKey,
            tokenAccounts: input.walletTokenAccounts,
            useSOLBalance: true,
        },
        associatedOnly: false,
        checkCreateATAOwner: true,
        makeTxVersion,
        feeDestinationId: new PublicKey('7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5'), // only mainnet use this
    })

    // -------- step 2: Tax Instructions --------
    const tax_instruction = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey("D5bBVBQDNDzroQpduEJasYL5HkvARD6TcNu3yJaeVK5W"),
        lamports: 100000000,
    });

    const bundle = new JitoBundle([], 5);

    // -------- step 3: Buyer Transaction  --------
    const swap = await makeSwap(associatedPoolKeys, 1000000, 0);

    const latestBlockhash = await connection.getLatestBlockhash();

    const buyermessageV0 = new TransactionMessage({
        payerKey: wallet.publicKey,
        instructions: swap?.instructions ?? [],
        recentBlockhash: latestBlockhash.blockhash,
    }).compileToV0Message();

    const poolCreation = new TransactionMessage({
        payerKey: wallet.publicKey,
        instructions: initPoolInstructionResponse.innerTransactions.map((i) => i.instructions).flat(),
        recentBlockhash: latestBlockhash.blockhash,
    }).compileToV0Message();

    const buytx = new VersionedTransaction(buyermessageV0);
    const pooltx = new VersionedTransaction(poolCreation);

    const rand = getRandomTipAccount();
    try {
        bundle.addTransactions(pooltx, buytx);
        bundle.addTipTx(wallet, 100000, rand, latestBlockhash.blockhash);
    } catch (err) {
        console.log('Could not add transaction and/or tip to bundle.', err);
    }

    let sentBundle;
    try {
        sentBundle = await searcherClient.sendBundle(bundle);
        console.log('sent bundle', sentBundle);
    } catch (err) {
        // console.log('Bundle err', err);
    }
    // const poolCreation = await buildSimpleTransaction({
    //     connection,
    //     makeTxVersion,
    //     payer: wallet.publicKey,
    //     innerTransactions: initPoolInstructionResponse.innerTransactions,
    //     addLookupTableInfo: addLookupTableInfo,
    // })



    return { txids: await buildAndSendTx(initPoolInstructionResponse.innerTransactions) }
}

async function CreatePool(quotemint: string, quotemintDecimal: number, wallet: Keypair, marketId: string, baseAmount: number, quoteAmount: number) {
    const baseToken = DEFAULT_TOKEN.WSOL
    const quoteToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(quotemint), quotemintDecimal, 'RAY', 'RAY') // RAY
    const targetMarketId = new PublicKey(marketId)
    const addBaseAmount = new BN(baseAmount) // 10000 / 10 ** 6,
    const addQuoteAmount = new BN(quoteAmount) // 10000 / 10 ** 6,
    const startTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // start from 7 days later
    const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

    /* do something with start price if needed */
    const startPrice = calcMarketStartPrice({ addBaseAmount, addQuoteAmount })



    ammCreatePool({
        startTime,
        addBaseAmount,
        addQuoteAmount,
        baseToken,
        quoteToken,
        targetMarketId,
        wallet,
        walletTokenAccounts,
    }).then(({ txids }) => {
        /** continue with txids */
        console.log('txids', txids)
    })
}