import { Metaplex, PublicKey } from "@metaplex-foundation/js";
import { connection } from "../removeLiquidity/config";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token-2";
import { SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { TAX_WALLET } from "../market/marketInstruction";

export async function TokenDisperser(wallets: string[], signAllTransactions: any, fundingWallet: PublicKey, baseAddr: string) {
    const fundingata = await getAssociatedTokenAddress(
        new PublicKey(baseAddr),
        fundingWallet,
    );
    const MintMetadata = await new Metaplex(connection).nfts().findByMint({ mintAddress: (new PublicKey(baseAddr)) });
    const decimals = MintMetadata.mint.decimals;
    let tokenAmount = await connection.getTokenAccountBalance(fundingata);
    // Split walletAddresses of string to convert them to PublicKey
    const walletAddressesArray = wallets.map(wallet => new PublicKey(wallet));

    // Get total token amount as a number
    let totalTokenAmount = parseFloat(tokenAmount.value.amount);

    // Generate a random number for each wallet
    let randomNumbers = wallets.map(() => Math.random());

    // Calculate the sum of all random numbers
    let sumOfRandomNumbers = randomNumbers.reduce((a, b) => a + b, 0);

    // Normalize the random numbers so that they sum up to the total token amount
    let amounts = randomNumbers.map(num => (num / sumOfRandomNumbers) * totalTokenAmount);

    // Round the amounts to the nearest integer
    amounts = amounts.map(amount => Math.round(amount));

    // Adjust the last amount to ensure the sum of amounts is exactly the total token amount
    amounts[amounts.length - 1] = totalTokenAmount - amounts.slice(0, -1).reduce((a, b) => a + b, 0);

    const tokenTransferInx: TransactionInstruction[] = [];

    await Promise.all(walletAddressesArray.map(async (wallet, index) => {
        const ataAddress = await getAssociatedTokenAddress(
            new PublicKey(baseAddr),
            wallet,
        );

        const createTokenBaseAta = createAssociatedTokenAccountIdempotentInstruction(
            fundingWallet,
            ataAddress,
            wallet,
            new PublicKey(baseAddr)
        );

        const tx = createTransferCheckedInstruction(
            fundingata,
            new PublicKey(baseAddr),
            ataAddress,
            fundingWallet,
            amounts[index],
            decimals,
        )


        tokenTransferInx.push(createTokenBaseAta);
        tokenTransferInx.push(tx);

    }));

    const taxTxn = SystemProgram.transfer({
        fromPubkey: fundingWallet,
        toPubkey: TAX_WALLET,
        lamports: BigInt(200000000),
    });

    tokenTransferInx.push(taxTxn);

    console.log(tokenTransferInx.length);

    //check the transaction instructions shouldn't be greater than 1232 then divide them into three instructions
    if (tokenTransferInx.length > 1232) {
        const tokenTransferInx1 = tokenTransferInx.slice(0, 1232);
        const tokenTransferInx2 = tokenTransferInx.slice(1232, 2464);
        const tokenTransferInx3 = tokenTransferInx.slice(2464, tokenTransferInx.length);
        await signAllTransactions(tokenTransferInx1);
        await signAllTransactions(tokenTransferInx2);
        await signAllTransactions(tokenTransferInx3);
    }

    //  await signAllTransactions(tokenTransferInx);




}