import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    ComputeBudgetProgram,
} from "@solana/web3.js";
import {
    ExtensionType,
    createInitializeMintInstruction,
    getMintLen,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createInitializeTransferFeeConfigInstruction,
    createEnableRequiredMemoTransfersInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializePermanentDelegateInstruction,
    createInitializeInterestBearingMintInstruction,
    createInitializeDefaultAccountStateInstruction,
    AccountState
} from "@solana/spl-token";
import {
    createCreateMetadataAccountV3Instruction,
    PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { SendTransaction } from "./SendTransaction";

export interface Token2022Data {
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
    // Token-2022 Extensions
    transferFeeEnabled: boolean;
    transferFeeBasisPoints: number;
    maxTransferFee: string;
    memoTransferEnabled: boolean;
    metadataPointerEnabled: boolean;
    permanentDelegateEnabled: boolean;
    permanentDelegateAddress: string;
    interestBearingEnabled: boolean;
    interestRate: number;
    defaultAccountStateEnabled: boolean;
    defaultAccountState: string;
}

export async function createToken2022(
    tokenInfo: Token2022Data,
    connection: Connection,
    tokenMetadata: any,
    myPublicKey: PublicKey,
    sendTransaction: any
) {
    const metadata = await uploadMetaData(tokenMetadata);

    // Determine which extensions to use
    const extensions = [];

    if (tokenInfo.transferFeeEnabled) {
        extensions.push(ExtensionType.TransferFeeConfig);
    }

    if (tokenInfo.metadataPointerEnabled) {
        extensions.push(ExtensionType.MetadataPointer);
    }

    if (tokenInfo.permanentDelegateEnabled) {
        extensions.push(ExtensionType.PermanentDelegate);
    }

    if (tokenInfo.interestBearingEnabled) {
        extensions.push(ExtensionType.InterestBearingConfig);
    }

    if (tokenInfo.defaultAccountStateEnabled) {
        extensions.push(ExtensionType.DefaultAccountState);
    }

    // Calculate the mint length based on extensions
    const mintLen = getMintLen(extensions);

    // Calculate the minimum balance for rent exemption
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    // Generate a new keypair for the mint
    const mintKeypair = Keypair.generate();

    // Get the associated token address
    const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        myPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
    );

    // Create the metadata instruction
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

    // Create the transaction
    const createNewTokenTransaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: myPublicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: mintLen,
            lamports: lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        })
    );

    // Add extension-specific instructions
    if (tokenInfo.transferFeeEnabled) {
        // Convert the fee basis points and max fee
        const feeBasisPoints = tokenInfo.transferFeeBasisPoints;
        const maxTransferFee = BigInt(
            Number(tokenInfo.maxTransferFee) * Math.pow(10, Number(tokenInfo.tokenDecimals))
        );

        // Add the transfer fee config instruction
        createNewTokenTransaction.add(
            createInitializeTransferFeeConfigInstruction(
                mintKeypair.publicKey,
                myPublicKey,
                myPublicKey,
                feeBasisPoints,
                maxTransferFee,
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    if (tokenInfo.metadataPointerEnabled) {
        // Add the metadata pointer instruction
        createNewTokenTransaction.add(
            createInitializeMetadataPointerInstruction(
                mintKeypair.publicKey,
                myPublicKey,
                myPublicKey,
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    if (tokenInfo.permanentDelegateEnabled) {
        // Parse the permanent delegate address, defaulting to the owner if not provided
        const delegateAddress = tokenInfo.permanentDelegateAddress
            ? new PublicKey(tokenInfo.permanentDelegateAddress)
            : myPublicKey;

        // Add the permanent delegate instruction
        createNewTokenTransaction.add(
            createInitializePermanentDelegateInstruction(
                mintKeypair.publicKey,
                delegateAddress,
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    if (tokenInfo.interestBearingEnabled) {
        // Convert the interest rate
        const interestRate = tokenInfo.interestRate;

        // Add the interest bearing config instruction
        createNewTokenTransaction.add(
            createInitializeInterestBearingMintInstruction(
                mintKeypair.publicKey,
                myPublicKey,
                interestRate,
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    if (tokenInfo.defaultAccountStateEnabled) {
        // Convert the default account state string to the AccountState enum
        const state = tokenInfo.defaultAccountState === "frozen"
            ? AccountState.Frozen
            : AccountState.Initialized;

        // Add the default account state instruction
        createNewTokenTransaction.add(
            createInitializeDefaultAccountStateInstruction(
                mintKeypair.publicKey,
                state,
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    // Add the initialize mint instruction
    createNewTokenTransaction.add(
        createInitializeMintInstruction(
            mintKeypair.publicKey,
            Number(tokenInfo.tokenDecimals),
            myPublicKey,
            myPublicKey,
            TOKEN_2022_PROGRAM_ID
        )
    );

    // Add the associated token account instruction
    createNewTokenTransaction.add(
        createAssociatedTokenAccountInstruction(
            myPublicKey,
            tokenATA,
            myPublicKey,
            mintKeypair.publicKey,
            TOKEN_2022_PROGRAM_ID
        )
    );

    // Add the mint to instruction
    createNewTokenTransaction.add(
        createMintToInstruction(
            mintKeypair.publicKey,
            tokenATA,
            myPublicKey,
            Number(tokenInfo.supply) * Math.pow(10, Number(tokenInfo.tokenDecimals)),
            [],
            TOKEN_2022_PROGRAM_ID
        )
    );

    // Add the metadata instruction
    createNewTokenTransaction.add(createMetadataInstruction);

    // If memo transfer is enabled, add it to the token account
    if (tokenInfo.memoTransferEnabled) {
        createNewTokenTransaction.add(
            createEnableRequiredMemoTransfersInstruction(
                tokenATA,
                myPublicKey,
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    // Set the fee payer
    createNewTokenTransaction.feePayer = myPublicKey;

    // Add compute budget instructions for complex transactions
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000
    });

    // Add a tax instruction (keep this if it's part of your application's design)
    const taxInstruction = SystemProgram.transfer({
        fromPubkey: myPublicKey,
        toPubkey: new PublicKey("D5bBVBQDNDzroQpduEJasYL5HkvARD6TcNu3yJaeVK5W"),
        lamports: 100000000,
    });

    // Add the additional instructions
    createNewTokenTransaction.add(taxInstruction).add(modifyComputeUnits).add(addPriorityFee);

    // Send the transaction
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

// Reuse the metadata upload function
export async function uploadMetaData(metadata: any) {
    console.log("Uploading metadata", metadata);
    const response = await fetch('https://api.bundler.space/upload-json', {
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