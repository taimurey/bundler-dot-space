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
    AccountState,
    TYPE_SIZE,
    LENGTH_SIZE
} from "@solana/spl-token";
import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    TokenMetadata,
    pack,
} from "@solana/spl-token-metadata";
import { SendTransaction } from "./SendTransaction";
import { TAX_WALLET } from "../instructions/pump-bundler/misc";

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




    // Generate a new keypair for the mint
    const mintKeypair = Keypair.generate();

    // Get the associated token address
    const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        myPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
    );

    // Format token metadata according to SPL Token-Metadata standard
    const tokenMetadataData: TokenMetadata = {
        updateAuthority: myPublicKey,
        mint: mintKeypair.publicKey,
        name: tokenInfo.tokenName,
        symbol: tokenInfo.tokenSymbol,
        uri: metadata,
        additionalMetadata: [
            ["description", tokenInfo.tokenDescription],
            ["website", tokenInfo.websiteUrl],
            ["twitter", tokenInfo.twitterUrl],
            ["telegram", tokenInfo.telegramUrl],
            ["discord", tokenInfo.discordUrl],
        ]
    };

    // Calculate metadata size
    const metadataExtension = TYPE_SIZE + LENGTH_SIZE; // 2 bytes for type, 2 bytes for length
    const metadataLen = pack(tokenMetadataData).length;

    // Calculate the mint length based on extensions
    const mintLen = getMintLen(extensions);

    // Total size needed for the account
    const totalSpace = mintLen + metadataExtension + metadataLen;

    // Calculate the minimum balance for rent exemption
    const lamports = await connection.getMinimumBalanceForRentExemption(totalSpace);

    // Create the transaction
    const createNewTokenTransaction = new Transaction();

    // Add compute budget instructions first
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 1000000
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 100000
    });

    // Add the compute budget instructions first
    createNewTokenTransaction.add(modifyComputeUnits).add(addPriorityFee);

    // Add a tax instruction 
    const taxInstruction = SystemProgram.transfer({
        fromPubkey: myPublicKey,
        toPubkey: TAX_WALLET,
        lamports: 100000000,
    });

    // Add the tax instruction
    createNewTokenTransaction.add(taxInstruction);

    // Then add the main instructions
    createNewTokenTransaction.add(
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
        // Add the metadata pointer instruction - point to the mint itself to store metadata
        createNewTokenTransaction.add(
            createInitializeMetadataPointerInstruction(
                mintKeypair.publicKey,
                myPublicKey,
                mintKeypair.publicKey,  // Pointing to the mint itself for metadata
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

    // Add SPL Token-Metadata initialize instruction
    createNewTokenTransaction.add(
        createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mintKeypair.publicKey,  // Using the mint itself to store metadata
            updateAuthority: myPublicKey,
            mint: mintKeypair.publicKey,
            mintAuthority: myPublicKey,
            name: tokenInfo.tokenName,
            symbol: tokenInfo.tokenSymbol,
            uri: metadata,
        })
    );

    // Add additional metadata fields
    if (tokenInfo.tokenDescription) {
        createNewTokenTransaction.add(
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mintKeypair.publicKey,
                updateAuthority: myPublicKey,
                field: "description",
                value: tokenInfo.tokenDescription,
            })
        );
    }

    // Add other additional metadata fields as needed
    if (tokenInfo.websiteUrl) {
        createNewTokenTransaction.add(
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mintKeypair.publicKey,
                updateAuthority: myPublicKey,
                field: "website",
                value: tokenInfo.websiteUrl,
            })
        );
    }

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