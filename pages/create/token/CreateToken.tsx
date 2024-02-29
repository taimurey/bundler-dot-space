import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";

import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    createMintToInstruction,
    getAssociatedTokenAddress,
    getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token-2";
import {
    createCreateMetadataAccountV3Instruction,
    PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { FC, useCallback, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { NFTStorage, File } from 'nft.storage';
import { packToBlob } from 'ipfs-car/pack/blob';

const CreateToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();
    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [tokenUri, setTokenUri] = useState("");
    const [tokenDecimals, setTokenDecimals] = useState(9);
    const [tokenAmount, setTokenAmount] = useState(1000000000);
    const [tokenMintAddress, setTokenMintAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const client = new NFTStorage({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDIxZTYwQ2VlQjc5YTlmZTFFQzM1NjhBZkEwMDNFM2Q1MmVCODU4YWQiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTcwODc5MTgyMTg2MiwibmFtZSI6Ik1pbnRlclRva2VuIn0.6h3W2Y9X0WYEioBZhA0va-TqYBT95O48hfxT-y6Fi6I' });
    const [uploading, setUploading] = useState(false);
    const [percentComplete, setPercentComplete] = useState(0);
    let uploadedImageUrl = '';


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result as string;
                setUploadedImage(base64Image);

                // Set the uploading state to true
                setUploading(true);

                try {
                    // Pack the image into a CAR file
                    const { car } = await packToBlob({
                        input: [file],
                        wrapWithDirectory: false,
                    });

                    // Upload the CAR file to NFT.Storage
                    const cid = await client.storeCar(car, {
                        onStoredChunk: (size) => {
                            // Update the upload progress
                            setPercentComplete((prevPercentComplete) => prevPercentComplete + size);
                        },
                    });

                    console.log('Uploaded a file to NFT.Storage!');
                    console.log('File available at', cid);
                    console.log(cid)

                    // Convert the IPFS URL to a HTTP URL
                    const httpUrl = `https://nftstorage.link/ipfs/${cid}`;

                    // Set the uploadedImage state variable to the HTTP URL of the uploaded image
                    setUploadedImage(httpUrl);
                    console.log(httpUrl);
                    uploadedImageUrl = httpUrl;
                } catch (error) {
                    console.error('Error uploading file:', error);
                } finally {
                    // Set the uploading state to false
                    setUploading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    const createToken = useCallback(async (event: any) => {
        event.preventDefault();
        if (!publicKey) {
            toast.error("Wallet not connected");
            return;
        }

        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        const mintKeypair = Keypair.generate();
        const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);

        setIsLoading(true);
        try {

            const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
                {
                    metadata: PublicKey.findProgramAddressSync(
                        [
                            Buffer.from("metadata"),
                            PROGRAM_ID.toBuffer(),
                            mintKeypair.publicKey.toBuffer(),
                        ],
                        PROGRAM_ID,
                    )[0],
                    mint: mintKeypair.publicKey,
                    mintAuthority: publicKey,
                    payer: publicKey,
                    updateAuthority: publicKey,
                },
                {
                    createMetadataAccountArgsV3: {
                        data: {
                            name: tokenName,
                            symbol: tokenSymbol,
                            uri: uploadedImageUrl,
                            creators: null,
                            sellerFeeBasisPoints: 0,
                            uses: null,
                            collection: null,
                        },
                        isMutable: false,
                        collectionDetails: null,
                    },
                },
            );
            const tx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),

                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    Number(tokenDecimals),
                    publicKey,
                    publicKey,
                    TOKEN_PROGRAM_ID,
                ),
                createAssociatedTokenAccountInstruction(
                    publicKey,
                    tokenATA,
                    publicKey,
                    mintKeypair.publicKey,
                ),
                createMintToInstruction(
                    mintKeypair.publicKey,
                    tokenATA,
                    publicKey,
                    tokenAmount * Math.pow(10, tokenDecimals),
                ),
                createMetadataInstruction

            );
            const signature = await sendTransaction(tx, connection, {
                signers: [mintKeypair],
            });
            setTokenMintAddress(mintKeypair.publicKey.toString());
            toast.success(`Token created: ${mintKeypair.publicKey.toString()} signature: ${signature}`);
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error(JSON.stringify(error));
            }
        }
        setIsLoading(false);
    }, [
        tokenAmount,
        publicKey,
        connection,
        tokenDecimals,
        tokenName,
        tokenSymbol,
        tokenUri,
        sendTransaction,
    ]);

    return (
        <div className="divide-y divide-neutral-700">
            {isLoading && (
                <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
                    <ClipLoader />
                </div>
            )}
            {!tokenMintAddress ? (
                <div className="pb-4  flex">
                    <div className="w-1/2 ">
                        <div className="sm:gap-4 pl-4 mt-4">
                            <div className="pl-2 text-md font-normal">Name</div>
                            <input
                                className="block w-full px-5 rounded-md py-2 bg-neutral-800 border-neutral-300 focus-style sm:text-md"
                                onChange={(e) => setTokenName(e.target.value)}
                                placeholder="Enter Token Name..."
                            />
                        </div>
                        <div className="sm:gap-4 pl-4 mt-4">
                            <div className="pl-2 text-md font-normal">Token symbol</div>
                            <input
                                className="block w-full px-5 rounded-md py-2 bg-neutral-800 border-neutral-300 focus-style sm:text-md"
                                onChange={(e) => setTokenSymbol(e.target.value)}
                                placeholder="Enter Token Symbol..."
                            />
                        </div>
                        <div className="sm:gap-4 pl-4 mt-4">
                            <div className="pl-2 text-md font-normal">Description</div>
                            <input
                                className="block w-full px-5 rounded-md py-2 bg-neutral-800 border-neutral-300 focus-style sm:text-md"
                                onChange={(e) => setTokenUri(e.target.value)}
                                placeholder="Enter description..."
                            />
                        </div>
                        <div className="sm:gap-4 pl-4 mt-4">
                            <div className="pl-2 text-md font-normal">Token Amount</div>
                            <input
                                className="block w-full px-5 rounded-md py-2 bg-neutral-800 border-neutral-300 focus-style sm:text-md"
                                type="text"
                                min={0}
                                value={tokenAmount}
                                onChange={(e) => setTokenAmount(Number(e.target.value))}
                                placeholder="Enter Token Amount..."
                            />
                        </div>
                        <div className="sm:gap-4 pl-4 mt-4">
                            <div className="pl-2 text-md font-normal">Token decimals</div>
                            <input
                                className="block w-full px-5 rounded-md py-2 bg-neutral-800 border-neutral-300 focus-style sm:text-md"
                                type="text"
                                min={0}
                                value={tokenDecimals}
                                onChange={(e) => setTokenDecimals(Number(e.target.value))}
                                placeholder="Enter Token Decimals..."
                            />
                        </div>

                    </div>
                    <div className="w-1/2 flex items-center justify-center">
                        {!uploadedImage && (
                            <div>
                                <div className="flex justify-center mb-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-20 w-20 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                        />
                                    </svg>
                                </div>
                                <input
                                    className="hidden"
                                    aria-describedby="file_input_help"
                                    id="file_input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                <label
                                    className="block align-bottom w-full py-2 px-5 text-sm text-white bg-v2-background rounded-lg cursor-pointer focus:outline-none opacity-100 backdrop-blur-md"
                                    htmlFor="file_input"
                                >
                                    Upload Image
                                </label>
                            </div>
                        )}
                        {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="mt-4 border-b-2 border-y-v3-bg rounded-md w-3/4 h-3/4 object-contain" />}
                    </div>
                </div>
            ) : (
                <div className="mt-4 break-words">
                    <p className="font-medium">Link to your new token.</p>
                    <a
                        className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
                        href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {tokenMintAddress}
                    </a>
                </div>

            )}
            <div className="pt-2 space-y-2">
                <button
                    className="w-full md:max-w-xs rounded-lg p-2 m-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500 float-right"
                    onClick={(event) => createToken(event)}
                    disabled={uploading}
                >
                    Create token
                </button>
            </div>
        </div>
    );



};


export default CreateToken;


