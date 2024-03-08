import { PublicKey, TransactionInstruction, Transaction, ComputeBudgetProgram, SystemProgram, Connection, AccountMeta } from '@solana/web3.js';
import { BN } from 'bn.js';
import { ApiPoolInfoV4, LiquidityAssociatedPoolKeys, LiquidityAssociatedPoolKeysV4, LiquidityPoolKeys, parseBigNumberish, struct, u64, u8 } from '@raydium-io/raydium-sdk';
import { wallet } from './Config';
import { createCloseAccountInstruction } from '@solana/spl-token-2';
import { createSyncNativeInstruction, getAssociatedTokenAddress, createAssociatedTokenAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token-2';
import { getAssociatedTokenAddressSync } from '@solana/spl-token-2';
import { createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token-2';


export const RayLiqPoolv4 = {
    string: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    pubKey: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
};

const connection = new Connection('https://api.mainnet-beta.solana.com');

export async function makeSwap(poolKeys: ApiPoolInfoV4 | undefined, amountIn: number | bigint, minAmountOut: number) {
    if (!poolKeys) {
        return;
    }
    const programId = new PublicKey('<REPLACE_WITH_YOUR_PROGRAM_ID>');
    const account0 = RayLiqPoolv4.pubKey;
    const account1 = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'); // token program
    const account2 = poolKeys.id; // amm id  writable
    const account3 = poolKeys.authority; // amm authority
    const account4 = poolKeys.openOrders; // amm open orders  writable
    const account5 = poolKeys.targetOrders; // amm target orders  writable
    const account6 = poolKeys.baseVault; // pool coin token account  writable  AKA baseVault
    const account7 = poolKeys.quoteVault; // pool pc token account  writable   AKA quoteVault
    const account8 = poolKeys.marketProgramId; // serum program id
    const account9 = poolKeys.marketId; //   serum market  writable
    const account10 = poolKeys.marketBids; // serum bids  writable
    const account11 = poolKeys.marketAsks; // serum asks  writable
    const account12 = poolKeys.marketEventQueue; // serum event queue  writable
    const account13 = poolKeys.marketBaseVault; // serum coin vault  writable     AKA marketBaseVault
    const account14 = poolKeys.marketQuoteVault; //   serum pc vault  writable    AKA marketQuoteVault
    const account15 = poolKeys.marketAuthority; // serum vault signer       AKA marketAuthority
    const inAmount = amountIn;
    const minAmount = minAmountOut;
    const SourceTokenata = getAssociatedTokenAddressSync(
        new PublicKey(poolKeys.baseMint),
        wallet.publicKey,
    );
    let account16 = SourceTokenata; // user source token account  writable
    const quoteToken = getAssociatedTokenAddress(wallet.publicKey, new PublicKey(poolKeys.quoteMint));
    let account17 = quoteToken; // user dest token account   writable
    const account18 = wallet.publicKey; // user owner (signer)  writable

    // if (reverse === true) {
    //     account16 = poolKeys.ownerBaseAta;
    //     account17 = poolKeys.ownerQuoteAta;
    // }

    const args = {
        amountIn: new BN(inAmount.toString()),
        minimumAmountOut: new BN(minAmount)
    };

    // const buffer = Buffer.alloc(16);
    // args.amountIn.toArrayLike(Buffer, 'le', 8).copy(buffer, 0);
    // args.minimumAmountOut.toArrayLike(Buffer, 'le', 8).copy(buffer, 8);
    // const prefix = Buffer.from([0x09]);
    // const instructionData = Buffer.concat([prefix, buffer]);
    const LAYOUT = struct([u8('instruction'), u64('amountIn'), u64('minAmountOut')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
        {
            instruction: 9,
            amountIn: parseBigNumberish(amountIn),
            minAmountOut: parseBigNumberish(minAmountOut),
        },
        data,
    )
    const accountMetas = [
        { pubkey: account0, isSigner: false, isWritable: false },
        { pubkey: account1, isSigner: false, isWritable: false },
        { pubkey: account2, isSigner: false, isWritable: true },
        { pubkey: account3, isSigner: false, isWritable: false },
        { pubkey: account4, isSigner: false, isWritable: true },
        { pubkey: account5, isSigner: false, isWritable: true },
        { pubkey: account6, isSigner: false, isWritable: true },
        { pubkey: account7, isSigner: false, isWritable: true },
        { pubkey: account8, isSigner: false, isWritable: false },
        { pubkey: account9, isSigner: false, isWritable: true },
        { pubkey: account10, isSigner: false, isWritable: true },
        { pubkey: account11, isSigner: false, isWritable: true },
        { pubkey: account12, isSigner: false, isWritable: true },
        { pubkey: account13, isSigner: false, isWritable: true },
        { pubkey: account14, isSigner: false, isWritable: true },
        { pubkey: account15, isSigner: false, isWritable: false },
        { pubkey: account16, isSigner: false, isWritable: true },
        { pubkey: account17, isSigner: false, isWritable: true },
        { pubkey: account18, isSigner: true, isWritable: true }
    ];

    // NOT NEEDED FOR SANDWICH, ONLY FOR REGULAR SNIPING ETC!
    /* const UNITPRICE = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 211102
    }); */

    const UNITLIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 });
    const createWsolQuoteAta = createAssociatedTokenAccount(
        connection,
        wallet,
        new PublicKey(poolKeys.quoteMint),
        wallet.publicKey,
    );

    const createTokenBaseAta = createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        SourceTokenata,
        wallet.publicKey,
        new PublicKey(poolKeys.baseMint),
    );

    const swap = new TransactionInstruction({
        keys: accountMetas as AccountMeta[],
        programId,
        data
    });

    // const closeSol = createCloseAccountInstruction(poolKeys.ownerQuoteAta, wallet.publicKey, wallet.publicKey);

    // const closeAta = createCloseAccountInstruction(poolKeys.ownerBaseAta, wallet.publicKey, wallet.publicKey);

    const transaction = new Transaction();
    transaction.add(UNITLIMIT);
    // transaction.add(UNITPRICE);
    // transaction.add(createWsolQuoteAta);
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: new PublicKey(poolKeys.baseMint),
            lamports: amountIn
        }),
        createSyncNativeInstruction(new PublicKey(poolKeys.quoteMint))
    ); // 10000000 lamports will send 0.01 sol to the ata
    transaction.add(createTokenBaseAta);
    transaction.add(swap);
    // transaction.add(closeSol);
    // }

    // if (reverse === true) {
    //     transaction.add(UNITLIMIT);
    //     // transaction.add(UNITPRICE);
    //     transaction.add(createWsolQuoteAta);
    //     transaction.add(swap);
    //     // transaction.add(closeSol);
    //     // transaction.add(closeAta);
    // }

    return transaction;
}