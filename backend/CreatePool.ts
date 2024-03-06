import { BN } from 'bn.js';

import {
    Liquidity,
    MAINNET_PROGRAM_ID,
    Token,
} from '@raydium-io/raydium-sdk';
import {
    Keypair,
    PublicKey,
} from '@solana/web3.js';

import {
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

function getMarketAssociatedPoolKeys(input: LiquidityPairTargetInfo) {
    return Liquidity.getAssociatedPoolKeys({
        version: 4,
        marketVersion: 3,
        baseMint: input.baseToken.mint,
        quoteMint: input.quoteToken.mint,
        baseDecimals: input.baseToken.decimals,
        quoteDecimals: input.quoteToken.decimals,
        marketId: input.targetMarketId,
        programId: PROGRAMIDS.AmmV4,
        marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    })
}

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = LiquidityPairTargetInfo &
    CalcStartPrice & {
        startTime: number // seconds
        walletTokenAccounts: WalletTokenAccounts
        wallet: Keypair
    }

async function ammCreatePool(input: TestTxInputInfo): Promise<{ txids: string[] }> {
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

    /* do something with market associated pool keys if needed */
    const associatedPoolKeys = getMarketAssociatedPoolKeys({
        baseToken,
        quoteToken,
        targetMarketId,
    })

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