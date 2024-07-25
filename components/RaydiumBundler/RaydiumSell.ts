import { buildSimpleTransaction, jsonInfo2PoolKeys, Liquidity, LiquidityPoolKeys, ONE, parseBigNumberish, Token, TokenAmount, TxVersion } from "@raydium-io/raydium-sdk";
import { TOKEN_PROGRAM_ID, } from "@solana/spl-token";
import { unpackMint } from "@solana/spl-token-2";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, VersionedTransaction } from "@solana/web3.js";
import { formatAmmKeysById } from "../removeLiquidity/formatAmmKeysById";
import base58 from "bs58";
import { getWalletTokenAccount } from "./get_balance";
import { getKeypairFromBs58, getRandomElement } from "../PumpBundler/misc";
import { addLookupTableInfo, DEFAULT_TOKEN } from "../removeLiquidity/config";
import { BN } from "bn.js";
import { tipAccounts } from "../PumpBundler/constants";

export async function RaydiumBundlerSeller(
    connection: Connection,
    wallets: string,
    PoolId: string,
    TransactionTip: number,
    BlockEngineSelection: string
) {
    const targetPoolInfo = await formatAmmKeysById(PoolId);
    if (!targetPoolInfo) {
        throw new Error('Failed to fetch pool info');
    }
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

    const baseMint = new PublicKey(targetPoolInfo.baseMint);
    const accountInfo_base = await connection.getAccountInfo(baseMint);
    if (!accountInfo_base) return;
    const baseTokenProgramId = accountInfo_base.owner;
    const baseDecimals = unpackMint(
        baseMint,
        accountInfo_base,
        baseTokenProgramId
    ).decimals;
    const TOKEN_TYPE = new Token(TOKEN_PROGRAM_ID, baseMint, baseDecimals, 'ABC', 'ABC')

    const tokenAccountRawInfos_Swap = [];
    for (let i = 0; i < wallets.length; i++) {
        const wallet = Keypair.fromSecretKey(base58.decode(wallets[i]));
        const tokenAccountRawInfo = await getWalletTokenAccount(
            connection,
            wallet.publicKey
        );
        tokenAccountRawInfos_Swap.push(tokenAccountRawInfo);
    }

    let lastNonZeroBalanceIndex = -1;
    const tokenAccountBalance = [];

    // Find the last non-zero balance wallet
    for (let i = 0; i < wallets.length; i++) {
        const buyerWallet = getKeypairFromBs58(wallets[i])!;
        let balance;
        if (wallets.length === 1) {
            balance = await connection.getTokenAccountBalance(buyerWallet.publicKey);
        } else {
            balance = await connection.getTokenAccountBalance(buyerWallet.publicKey);
        }
        tokenAccountBalance.push(balance.value.amount);
        if (Number(balance.value.amount) != 0) {
            lastNonZeroBalanceIndex = i;
        }
    }

    const BundleTxns = [];

    for (let i = 0; i < wallets.length; i++) {
        const buyerWallet = getKeypairFromBs58(wallets[i])!;
        const output = new TokenAmount(DEFAULT_TOKEN.WSOL, parseBigNumberish(ONE));
        const inputAmount = new TokenAmount(TOKEN_TYPE, tokenAccountBalance[i])
        const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
            connection,
            poolKeys,
            userKeys: {
                tokenAccounts: tokenAccountRawInfos_Swap[i],
                owner: buyerWallet.publicKey,
            },
            amountIn: inputAmount,
            amountOut: output,
            fixedSide: "in",
            makeTxVersion: TxVersion.V0,
        })
        if (i === lastNonZeroBalanceIndex) {
            const tipIx = SystemProgram.transfer({
                fromPubkey: getKeypairFromBs58(wallets[0])!.publicKey,
                toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                lamports: Number(TransactionTip) * LAMPORTS_PER_SOL
            });

            innerTransactions[0].instructions.push(tipIx);
        }

        const buyerTxn = await buildSimpleTransaction({
            connection,
            makeTxVersion: TxVersion.V0,
            payer: buyerWallet.publicKey,
            innerTransactions: innerTransactions,
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
        body: JSON.stringify({ blockengine: `https://${BlockEngineSelection}`, txns: EncodedbundledTxns })
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
    }

    const result = await response.json();

    return { result };
}