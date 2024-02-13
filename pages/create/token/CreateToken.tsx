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

    const createToken = useCallback(async () => {
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
                            uri: tokenUri,
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
                <div className="pb-4">
                    <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
                        <div className="p-2 text-xl font-normal float-left">Token name</div>
                        <div className="m-auto p-2">
                            <input
                                className="block w-full px-20 rounded-md py-2 bg-neutral-700 border-neutral-300 focus-style sm:text-md"
                                onChange={(e) => setTokenName(e.target.value)}
                                placeholder="Enter Token Name..."
                            />
                        </div>
                    </div>
                    <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
                        <div className="m-auto p-2">
                            <div className="text-xl font-normal float-left">Token symbol</div>
                            <p className="float-left">{"Abbreviated name (e.g. Solana -> SOL)."}</p>
                        </div>
                        <div className="m-auto  p-2">
                            <input
                                className="block w-full px-20 rounded-md p-2 bg-neutral-700 border-neutral-300 focus-style sm:text-sm"
                                onChange={(e) => setTokenSymbol(e.target.value)}
                                placeholder="Enter Token Symbol..."
                            />
                        </div>
                    </div>
                    <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
                        <div className=" p-2">
                            <div className="text-xl font-normal">Token URI</div>
                            <p >Link to your metadata json file.</p>

                            <a
                                className="cursor-pointer float-left font-medium text-purple-500 hover:text-indigo-500"
                                href="./upload"
                            >
                                Paste an existing one or create new {" here"}
                            </a>
                            .

                            <p>You can leave it blank if you don`t need token image.</p>
                        </div>
                        <div className="m-auto p-2">
                            <input
                                className="block w-full px-20 rounded-md p-2 bg-neutral-700 border-neutral-300 focus-style sm:text-sm"
                                onChange={(e) => setTokenUri(e.target.value)}
                                placeholder="Enter Metadata URI..."

                            />
                        </div>
                    </div>
                    <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
                        <div className="float-left p-2">
                            <div className="text-xl font-normal">Token Amount</div>
                            <p className="float-left">Amount of tokens to mint.</p>
                        </div>
                        <div className="m-auto p-2">
                            <input
                                className="block w-full px-20 rounded-md p-2 bg-neutral-700 border-neutral-300 focus-style sm:text-sm"
                                type="text"
                                min={0}
                                value={tokenAmount}
                                onChange={(e) => setTokenAmount(Number(e.target.value))}
                                placeholder="Enter Token Decimals..."
                            />
                        </div>
                    </div>
                    <div className="mt-4 sm:grid sm:grid-cols-2 sm:gap-4">
                        <div className="float-left p-2">
                            <div className="text-xl font-normal">Token decimals</div>
                            <p className="float-left">Default value is 9 for solana.</p>
                        </div>
                        <div className="m-auto p-2">
                            <input
                                className="block w-full px-20 rounded-md p-2 bg-neutral-700 border-neutral-300 focus-style sm:text-sm"
                                type="text"
                                min={0}
                                value={tokenDecimals}
                                onChange={(e) => setTokenDecimals(Number(e.target.value))}
                                placeholder="Enter Token Decimals..."
                            />
                        </div>
                    </div>
                    <div className="pt-2 space-y-2">
                        <button
                            className="w-full md:max-w-xs rounded-lg p-2 m-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500 float-right"
                            onClick={createToken}
                        >
                            Create token
                        </button>
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
        </div>
    );
};


export default CreateToken;


