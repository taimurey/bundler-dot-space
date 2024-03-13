
import {
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
} from "@solana/spl-token-2";
import {
    createCreateMetadataAccountV3Instruction,
    PROGRAM_ID,
}
    from "@metaplex-foundation/mpl-token-metadata";
import { NFT_STORAGE_TOKEN, tokenData } from "../removeLiquidity/config";
import { toast } from "react-toastify";
import { NFTStorage } from "nft.storage";


export async function createToken(tokenInfo: tokenData, connection: Connection, tokenMetadata: any, keypairpubkey: PublicKey, sendTransaction: any) {
    const metadata = await uploadMetaData(tokenMetadata);
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const mintKeypair = Keypair.generate();
    const myPublicKey = keypairpubkey;

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
    createNewTokenTransaction.feePayer = keypairpubkey;

    if (tokenInfo.revokeMintAuthority) {
        const revokeMint = createSetAuthorityInstruction(
            mintKeypair.publicKey, // mint acocunt || token account
            myPublicKey, // current auth
            AuthorityType.MintTokens, // authority type
            null
        );
        createNewTokenTransaction.add(revokeMint);
    }

    if (tokenInfo.revokeMintAuthority) {
        const revokeFreeze = createSetAuthorityInstruction(
            mintKeypair.publicKey, // mint acocunt || token account
            myPublicKey, // current auth
            AuthorityType.FreezeAccount, // authority type
            null
        );

        createNewTokenTransaction.add(revokeFreeze);
    }

    if (tokenInfo.revokeMetadataUpdateAuthority) {
        const revokeMetadata = createSetAuthorityInstruction(
            mintKeypair.publicKey, // mint acocunt || token account
            myPublicKey, // current auth
            AuthorityType.AccountOwner, // authority type
            null
        );

        createNewTokenTransaction.add(revokeMetadata);
    }


    const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const signature = await sendTransaction(createNewTokenTransaction, connection, { minContextSlot });
    toast.info(`Transaction sent: ${signature}`);
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
    toast.success(`Transaction successful! ${signature}`);

    console.log("Token mint transaction sent. Signature:", signature);
    console.log("Token Created : ", tokenInfo);
    console.log("Token Mint Address :", mintKeypair.publicKey.toString());

    return mintKeypair.publicKey;
}

async function uploadMetaData(metadata: any) {
    const endpoint = new URL('https://api.nft.storage');
    const storage = new NFTStorage({ endpoint, token: NFT_STORAGE_TOKEN });
    // Store image
    // const data = await fs.promises.readFile('./image.png')
    //const cid1 = await storage.storeBlob(new Blob([data]))
    // const imageUrl = `https://${cid1}.ipfs.nftstorage.link`
    // const status1 = await storage.status(cid1)
    // if (status1.pin.status != 'pinned'){
    //     console.log("Could not upload image, Status: ",status1.pin.status)
    //     return;
    // }
    // console.log('Image Upload status: ',status1.pin.status)

    // console.log("Image url: ",imageUrl)
    // metaDataforToken.image = imageUrl


    // store as a json file
    const jsonString = JSON.stringify(metadata, null, 2);
    const file = new File([jsonString], "metadata.json", { type: "application/json" });

    const cid = await storage.storeBlob(file)
    const status = await storage.status(cid)

    // if (status1.pin.status != 'pinned') {
    //     console.log("Could not upload Metadata, Status: ", status1.pin.status)
    //     return;
    // }

    console.log('MetaData Upload status: ', status.pin.status)
    const metadata_url = `https://${cid}.ipfs.nftstorage.link`
    console.log('Metadata URI: ', metadata_url)


    return metadata_url

}
