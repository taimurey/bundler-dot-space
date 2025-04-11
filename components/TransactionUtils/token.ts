import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    AuthorityType,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createSetAuthorityInstruction,
} from "@solana/spl-token";
import {
    createCreateMetadataAccountV3Instruction,
    PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { SendTransaction } from "./SendTransaction";

export interface TokenData {
    tokenName: string;
    tokenSymbol: string;
    tokenDescription: string;
    iconUrl: string;
    websiteUrl: string;
    twitterUrl: string;
    telegramUrl: string;
    discordUrl: string;
    tokenDecimals: string;
    supply: string;
    uploadedImage: string | null;
    freezeAuthority: boolean;
    revokeMintAuthority: boolean;
    revokeMetadataUpdateAuthority: boolean;
}

export async function createToken(tokenInfo: TokenData, connection: Connection, tokenMetadata: any, myPublicKey: PublicKey, sendTransaction: any) {
    const metadata = await uploadMetaData(tokenMetadata);
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const mintKeypair = Keypair.generate();

    const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        myPublicKey
    );
    const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
            metadata: PublicKey.findProgramAddressSync(
                [
                    Buffer.from("metadata"),
                    PROGRAM_ID.toBuffer(),
                    mintKeypair.publicKey.toBuffer(),
                ],
                PROGRAM_ID
            )[0],
            mint: mintKeypair.publicKey,
            mintAuthority: myPublicKey,
            payer: myPublicKey,
            updateAuthority: myPublicKey,
        },
        {
            createMetadataAccountArgsV3: {
                data: {
                    name: tokenInfo.tokenName,
                    symbol: tokenInfo.tokenSymbol,
                    uri: metadata,
                    creators: null,
                    sellerFeeBasisPoints: 0,
                    uses: null,
                    collection: null,
                },
                isMutable: true,
                collectionDetails: null,
            },
        }
    );

    const createNewTokenTransaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: myPublicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: lamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKeypair.publicKey,
            Number(tokenInfo.tokenDecimals),
            myPublicKey,
            myPublicKey,
            TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
            myPublicKey,
            tokenATA,
            myPublicKey,
            mintKeypair.publicKey
        ),
        createMintToInstruction(
            mintKeypair.publicKey,
            tokenATA,
            myPublicKey,
            Number(tokenInfo.supply) * Math.pow(10, Number(tokenInfo.tokenDecimals))
        ),
        createMetadataInstruction
    );
    createNewTokenTransaction.feePayer = myPublicKey;

    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000
    });

    const taxInstruction = SystemProgram.transfer({
        fromPubkey: myPublicKey,
        toPubkey: new PublicKey("D5bBVBQDNDzroQpduEJasYL5HkvARD6TcNu3yJaeVK5W"),
        lamports: 100000000,
    });

    createNewTokenTransaction.add(taxInstruction).add(modifyComputeUnits).add(addPriorityFee);

    if (tokenInfo.revokeMintAuthority) {
        const revokeMint = createSetAuthorityInstruction(
            mintKeypair.publicKey, // mint account || token account
            myPublicKey, // current auth
            AuthorityType.MintTokens, // authority type
            null
        );
        createNewTokenTransaction.add(revokeMint);
    }

    if (tokenInfo.freezeAuthority) {
        const revokeFreeze = createSetAuthorityInstruction(
            mintKeypair.publicKey, // mint account || token account
            myPublicKey, // current auth
            AuthorityType.FreezeAccount, // authority type
            null
        );

        createNewTokenTransaction.add(revokeFreeze);
    }

    const token = mintKeypair.publicKey.toBase58();
    const signature = await SendTransaction(
        createNewTokenTransaction,
        connection,
        sendTransaction,
        myPublicKey,
        [mintKeypair]
    );

    return { signature, token };
}

export async function uploadMetaData(metadata: any) {
    console.log("Uploading metadata", metadata);
    const response = await fetch('https://mevarik-deployer.xyz:2791/upload-json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
    });

    const responseText = await response.text();

    // Convert the IPFS URL to a HTTP URL
    const httpUrl = `https://ipfs.io/ipfs/${responseText}`;

    return httpUrl;
}
