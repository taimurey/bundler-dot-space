import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, VersionedTransaction } from "@solana/web3.js";
import {
    jsonInfo2PoolKeys,
    Liquidity,
    MAINNET_PROGRAM_ID,
    MARKET_STATE_LAYOUT_V3, LiquidityPoolKeys,
    Token, TokenAmount, ONE,
    TOKEN_PROGRAM_ID, parseBigNumberish,
    buildSimpleTransaction,
    TxVersion,
} from "@raydium-io/raydium-sdk";
import { unpackMint } from "@solana/spl-token-2";
import {
    getTokenAccountBalance,
    assert,
    getWalletTokenAccount,
} from "./get_balance";
import { build_swap_instructions, build_create_pool_instructions } from "./build_a_sendtxn";
import base58 from "bs58";
import { addLookupTableInfo, DEFAULT_TOKEN } from "../removeLiquidity/config";
import { getKeypairFromBs58, getRandomElement } from "../PumpBundler/misc";
import { tipAccounts } from "../PumpBundler/constants";
import { BN } from "bn.js";

export interface JitoPoolData {
    buyerPrivateKey: string;
    deployerPrivateKey: string;
    walletsNumbers: string;
    tokenMintAddress: string;
    tokenMarketID: string;
    tokenDecimals: string;
    totalSupply: string;
    tokenbuyAmount: string;
    tokenLiquidityAmount: string;
    tokenLiquidityAddPercent: string;
    BlockEngineSelection: string;
    BundleTip: string,
    TransactionTip: string;
}

export async function CreatePoolSwap(connection: Connection, data: JitoPoolData, BuyerWallets: string[]) {

    console.log(data);

    const deployerPrivateKey = Keypair.fromSecretKey(base58.decode(data.deployerPrivateKey));
    const wallets = [...BuyerWallets];
    const tokenAccountRawInfos_Swap = [];
    if (data.buyerPrivateKey !== "") {
        wallets.push(data.buyerPrivateKey);
    }
    for (let i = 0; i < wallets.length; i++) {
        const wallet = Keypair.fromSecretKey(base58.decode(wallets[i]));
        const tokenAccountRawInfo = await getWalletTokenAccount(
            connection,
            wallet.publicKey
        );
        tokenAccountRawInfos_Swap.push(tokenAccountRawInfo);
    }

    const market_id = new PublicKey(data.tokenMarketID);

    const tokenAccountRawInfos_LP = await getWalletTokenAccount(
        connection,
        deployerPrivateKey.publicKey
    )

    const marketBufferInfo = await connection.getAccountInfo(market_id);
    if (!marketBufferInfo) return;
    const {
        baseMint,
        quoteMint,
        baseLotSize,
        quoteLotSize,
        baseVault: marketBaseVault,
        quoteVault: marketQuoteVault,
        bids: marketBids,
        asks: marketAsks,
        eventQueue: marketEventQueue
    } =
        MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data);

    console.log("Base Lot:", baseLotSize, "Quote Lot:", quoteLotSize);

    const accountInfo_base = await connection.getAccountInfo(baseMint);
    if (!accountInfo_base) return;
    const baseTokenProgramId = accountInfo_base.owner;
    const baseDecimals = unpackMint(
        baseMint,
        accountInfo_base,
        baseTokenProgramId
    ).decimals;

    const accountInfo_quote = await connection.getAccountInfo(quoteMint);
    if (!accountInfo_quote) return;
    const quoteTokenProgramId = accountInfo_quote.owner;
    const quoteDecimals = unpackMint(
        quoteMint,
        accountInfo_quote,
        quoteTokenProgramId
    ).decimals;

    const associatedPoolKeys = await Liquidity.getAssociatedPoolKeys({
        version: 4,
        marketVersion: 3,
        baseMint,
        quoteMint,
        baseDecimals,
        quoteDecimals,
        marketId: market_id,
        programId: MAINNET_PROGRAM_ID.AmmV4,
        marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    });


    // --------------------------------------------
    const quote_amount = Number(data.tokenLiquidityAmount) * 10 ** quoteDecimals;
    // -------------------------------------- Get balance
    let base_balance = 0;
    let quote_balance = 0;


    try {
        if (baseMint.toString() == "So11111111111111111111111111111111111111112") {
            base_balance = await connection.getBalance(deployerPrivateKey.publicKey);
            console.log("SOL Balance:", base_balance);
        } else {
            const temp = await getTokenAccountBalance(
                connection,
                deployerPrivateKey.publicKey.toString(),
                baseMint.toString()
            );
            base_balance = temp || 0;
        }

        if (quoteMint.toString() == "So11111111111111111111111111111111111111112") {
            quote_balance = await connection.getBalance(deployerPrivateKey.publicKey);
            console.log("SOL Balance:", quote_balance);
            assert(
                quote_amount <= quote_balance,
                "Sol LP input is greater than current balance"
            );
        } else {
            const temp = await getTokenAccountBalance(
                connection,
                deployerPrivateKey.publicKey.toString(),
                quoteMint.toString()
            );
            quote_balance = temp || 0;
        }
    } catch (error) {
        console.error("An error occurred while getting balances:", error);
    }

    const base_amount_input = Math.ceil(base_balance * ((Number(data.tokenLiquidityAddPercent)) / 100));

    const BundleTxns = [];

    const lp_ix = await build_create_pool_instructions(connection, data, tokenAccountRawInfos_LP, base_amount_input, quote_amount);

    const lp_txn = await buildSimpleTransaction({
        connection,
        makeTxVersion: TxVersion.V0,
        payer: deployerPrivateKey.publicKey,
        innerTransactions: lp_ix,
        addLookupTableInfo: addLookupTableInfo,
    });

    if (lp_txn[0] instanceof VersionedTransaction) {
        lp_txn[0].sign([deployerPrivateKey]);
        BundleTxns.push(lp_txn[0]);
    }

    // ---- Swap info
    const targetPoolInfo = {
        id: associatedPoolKeys.id.toString(),
        baseMint: associatedPoolKeys.baseMint.toString(),
        quoteMint: associatedPoolKeys.quoteMint.toString(),
        lpMint: associatedPoolKeys.lpMint.toString(),
        baseDecimals: associatedPoolKeys.baseDecimals,
        quoteDecimals: associatedPoolKeys.quoteDecimals,
        lpDecimals: associatedPoolKeys.lpDecimals,
        version: 4,
        programId: associatedPoolKeys.programId.toString(),
        authority: associatedPoolKeys.authority.toString(),
        openOrders: associatedPoolKeys.openOrders.toString(),
        targetOrders: associatedPoolKeys.targetOrders.toString(),
        baseVault: associatedPoolKeys.baseVault.toString(),
        quoteVault: associatedPoolKeys.quoteVault.toString(),
        withdrawQueue: associatedPoolKeys.withdrawQueue.toString(),
        lpVault: associatedPoolKeys.lpVault.toString(),
        marketVersion: 3,
        marketProgramId: associatedPoolKeys.marketProgramId.toString(),
        marketId: associatedPoolKeys.marketId.toString(),
        marketAuthority: associatedPoolKeys.marketAuthority.toString(),
        marketBaseVault: marketBaseVault.toString(),
        marketQuoteVault: marketQuoteVault.toString(),
        marketBids: marketBids.toString(),
        marketAsks: marketAsks.toString(),
        marketEventQueue: marketEventQueue.toString(),
        lookupTableAccount: PublicKey.default.toString(),
    };
    console.log(targetPoolInfo)

    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

    const TOKEN_TYPE = new Token(TOKEN_PROGRAM_ID, baseMint, baseDecimals, 'ABC', 'ABC')

    let buyAmount = [(Number(data.tokenbuyAmount) * LAMPORTS_PER_SOL)];
    if (BuyerWallets.length > 1) {
        for (let i = 0; i < BuyerWallets.length; i++) {
            const buyerWallet = getKeypairFromBs58(BuyerWallets[i])!;
            const balance = await connection.getBalance(buyerWallet.publicKey);
            buyAmount.push(balance);
        }
    }




    let lastNonZeroBalanceIndex = -1;

    // Find the last non-zero balance wallet
    for (let i = 0; i < BuyerWallets.length; i++) {
        const buyerWallet = getKeypairFromBs58(BuyerWallets[i])!;
        let balance;
        if (BuyerWallets.length === 1) {
            balance = new BN(Number(data.tokenbuyAmount) * LAMPORTS_PER_SOL);
        } else {
            balance = await connection.getBalance(buyerWallet.publicKey);
        }
        if (balance != 0) {
            lastNonZeroBalanceIndex = i;
        }
    }

    for (let i = 0; i < BuyerWallets.length; i++) {
        const buyerWallet = getKeypairFromBs58(BuyerWallets[i])!;
        const inputTokenAmount = new TokenAmount(DEFAULT_TOKEN.WSOL, buyAmount[i])
        const minAmountOut = new TokenAmount(TOKEN_TYPE, parseBigNumberish(ONE))
        const swap_ix = await build_swap_instructions({ Liquidity, connection, poolKeys, tokenAccountRawInfos_Swap, inputTokenAmount, minAmountOut }, buyerWallet.publicKey);

        if (i === lastNonZeroBalanceIndex) {
            const tipIx = SystemProgram.transfer({
                fromPubkey: buyerWallet.publicKey,
                toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                lamports: Number(data.TransactionTip) * LAMPORTS_PER_SOL
            });

            swap_ix[0].instructions.push(tipIx);
        }

        const buyerTxn = await buildSimpleTransaction({
            connection,
            makeTxVersion: TxVersion.V0,
            payer: buyerWallet.publicKey,
            innerTransactions: swap_ix,
            addLookupTableInfo: addLookupTableInfo,
        });

        if (buyerTxn[0] instanceof VersionedTransaction) {
            buyerTxn[0].sign([buyerWallet]);
            BundleTxns.push(buyerTxn[0]);
        }
    }

    const EncodedbundledTxns = BundleTxns.map(txn => base58.encode(txn.serialize()));

    console.log(EncodedbundledTxns);

    //send to local server port 2891'
    const response = await fetch('https://mevarik-deployer.xyz:8080/bundlesend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: `https://${data.BlockEngineSelection}`, txns: EncodedbundledTxns })
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
    }

    const result = await response.json();

    return { result, ammID: associatedPoolKeys.id };
}




