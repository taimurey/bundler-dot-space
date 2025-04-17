"use client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    Connection,
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    ComputeBudgetProgram
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createBurnCheckedInstruction,
    getMint,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import React, { FC, useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../components/context/NetworkConfigurationProvider";
import { toast } from "sonner";
import { UpdatedInputField } from "../../../components/FieldComponents/UpdatedInputfield";
import { TransactionToast } from "../../../components/common/Toasts/TransactionToast";
import { SendTransaction } from "../../../components/TransactionUtils/SendTransaction";
import { Metaplex } from "@metaplex-foundation/js";

interface TokenAccountInfo {
    mint: string;
    tokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number;
    };
    name?: string;
    symbol?: string;
    logo?: string;
    isToken2022?: boolean;
}

// Helper function to fetch token metadata using Metaplex
const fetchTokenMetadata = async (
    connection: Connection,
    mintAddress: string
): Promise<{ name: string; symbol: string; logo?: string }> => {
    try {
        const mintPublicKey = new PublicKey(mintAddress);
        const metaplex = Metaplex.make(connection);

        // Check if this is a Token-2022 token
        const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
        const isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;

        console.log(`Fetching metadata for ${mintAddress}, isToken2022: ${isToken2022}`);

        try {
            // Use Metaplex to fetch the metadata
            const metadataAccount = metaplex.nfts().pdas().metadata({ mint: mintPublicKey });
            console.log(`Metadata PDA: ${metadataAccount.toBase58()}`);

            const metadataAccountInfo = await connection.getAccountInfo(metadataAccount);

            if (metadataAccountInfo) {
                console.log("Metadata account found, fetching token details");
                try {
                    const token = await metaplex.nfts().findByMint({
                        mintAddress: mintPublicKey,
                        // tokenStandard: isToken2022 ? 5 : undefined // 5 is ProgrammableNonFungible, used for Token-2022
                    });
                    console.log("Token metadata:", token);

                    return {
                        name: token.name || `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                        symbol: token.symbol || "???",
                        logo: token.json?.image
                    };
                } catch (findError) {
                    console.error("Error in metaplex.nfts().findByMint:", findError);

                    // Try a different approach for Token-2022
                    if (isToken2022) {
                        try {
                            // For Token-2022 with metadata pointer extension
                            const rawMetadata = await fetch(
                                `https://api.metaplex.solana.com/v1/metadata/${mintAddress}`
                            ).then(res => res.json());

                            console.log("Raw metadata from API:", rawMetadata);

                            if (rawMetadata) {
                                return {
                                    name: rawMetadata.name || `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                                    symbol: rawMetadata.symbol || "???",
                                    logo: rawMetadata.image
                                };
                            }
                        } catch (apiError) {
                            console.error("Error fetching metadata from API:", apiError);

                            // Try Solana on-chain metadata API as another fallback
                            try {
                                const response = await fetch(
                                    `https://public-api.solscan.io/token/meta?tokenAddress=${mintAddress}`
                                );

                                if (response.ok) {
                                    const tokenData = await response.json();
                                    console.log("Solscan token data:", tokenData);

                                    if (tokenData && tokenData.symbol) {
                                        return {
                                            name: tokenData.name || tokenData.symbol || `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                                            symbol: tokenData.symbol || "???",
                                            logo: tokenData.icon || tokenData.image
                                        };
                                    }
                                }
                            } catch (solscanError) {
                                console.error("Error fetching from Solscan:", solscanError);
                            }
                        }
                    }
                }
            } else {
                console.log("No metadata account found");
            }
        } catch (error) {
            console.error("Error in metadata PDA lookup:", error);
        }

        // Fallback: Use on-chain mint data
        try {
            const mintInfo = await getMint(
                connection,
                mintPublicKey,
                'confirmed',
                isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
            );

            return {
                name: `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                symbol: "???",
            };
        } catch (mintError) {
            console.error("Error fetching mint info:", mintError);
        }

        // Final fallback
        return {
            name: `Unknown (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
            symbol: "???"
        };
    } catch (error) {
        console.error("Error in fetchTokenMetadata:", error);
        return {
            name: `Unknown (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
            symbol: "???"
        };
    }
};

const BurnToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();

    const [isLoading, setIsLoading] = useState(false);
    const [isBurning, setIsBurning] = useState(false);
    const [tokenAccounts, setTokenAccounts] = useState<TokenAccountInfo[]>([]);

    const [formData, setFormData] = useState({
        tokenAddress: "",
        burnAmount: ""
    });

    const [selectedToken, setSelectedToken] = useState<TokenAccountInfo | null>(null);

    // Fetch token accounts
    useEffect(() => {
        if (!publicKey) return;

        const fetchTokenAccounts = async () => {
            setIsLoading(true);
            try {
                // Get standard SPL token accounts
                const accounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_PROGRAM_ID }
                );

                // Get Token-2022 accounts
                const accounts2022 = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_2022_PROGRAM_ID }
                );

                // Combine accounts with non-zero balance
                const allAccountsFiltered = [
                    ...accounts.value,
                    ...accounts2022.value
                ].filter(account => {
                    const parsedInfo = account.account.data.parsed.info;
                    return parsedInfo.tokenAmount.uiAmount > 0;
                });

                const tokenInfo = await Promise.all(
                    allAccountsFiltered.map(async (account) => {
                        const parsedInfo = account.account.data.parsed.info;
                        const mintAddress = parsedInfo.mint;

                        // Determine if this is a Token-2022 token
                        const mintPublicKey = new PublicKey(mintAddress);
                        const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
                        const isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;

                        // Fetch metadata using Metaplex
                        const metadata = await fetchTokenMetadata(connection, mintAddress);

                        return {
                            mint: mintAddress,
                            tokenAmount: parsedInfo.tokenAmount,
                            name: metadata.name,
                            symbol: metadata.symbol,
                            logo: metadata.logo,
                            isToken2022
                        };
                    })
                );

                setTokenAccounts(tokenInfo);
            } catch (error) {
                console.error("Error fetching token accounts:", error);
                toast.error("Failed to fetch token accounts");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokenAccounts();
    }, [publicKey, connection]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
        const { value } = e.target;

        if (field === 'tokenAddress') {
            // Find the selected token
            const token = tokenAccounts.find(t => t.mint === value);
            setSelectedToken(token || null);
        }

        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleBurnToken = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!publicKey) {
            toast.error("Wallet not connected");
            return;
        }

        if (!formData.tokenAddress) {
            toast.error("Please select a token to burn");
            return;
        }

        if (!formData.burnAmount || parseFloat(formData.burnAmount) <= 0) {
            toast.error("Please enter a valid amount to burn");
            return;
        }

        if (!selectedToken) {
            toast.error("Token information not available");
            return;
        }

        setIsBurning(true);

        try {
            const tokenMint = new PublicKey(formData.tokenAddress);

            // Use the appropriate token program ID based on the token type
            const programId = selectedToken.isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            const tokenATA = await getAssociatedTokenAddress(
                tokenMint,
                publicKey,
                false,
                programId
            );

            // Calculate the amount to burn based on decimals
            const decimals = selectedToken.tokenAmount.decimals;
            const burnAmount = Math.floor(parseFloat(formData.burnAmount) * Math.pow(10, decimals));

            if (burnAmount > Number(selectedToken.tokenAmount.amount)) {
                toast.error("Insufficient token balance");
                setIsBurning(false);
                return;
            }

            const burnInstruction = createBurnCheckedInstruction(
                tokenATA,           // Token account to burn from
                tokenMint,          // Mint account
                publicKey,          // Owner of token account
                BigInt(burnAmount), // Amount to burn
                decimals,           // Decimals of the token
                [],                 // Multisig signers (empty array for single signer)
                programId           // Use the appropriate program ID
            );

            // Create transaction
            const transaction = new Transaction();

            // Add priority fee to ensure the transaction gets processed quickly
            const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 100000
            });

            // Add compute budget instruction to allow more complex transactions
            const computeBudget = ComputeBudgetProgram.setComputeUnitLimit({
                units: 1000000
            });

            transaction.add(computeBudget, priorityFee, burnInstruction);
            transaction.feePayer = publicKey;

            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;

            toast.info("Burning tokens...");

            // Send transaction
            const signature = await sendTransaction(transaction, connection);

            // Confirm transaction
            await connection.confirmTransaction(signature, 'confirmed');

            toast(
                () => (
                    <TransactionToast
                        txSig={signature}
                        message={"Tokens burned successfully!"}
                    />
                ),
                { duration: 5000 }
            );

            // Reset burn amount
            setFormData(prevState => ({
                ...prevState,
                burnAmount: ""
            }));

            // Refresh token accounts
            if (publicKey) {
                const accounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId }
                );

                const updatedToken = accounts.value
                    .find(account => account.account.data.parsed.info.mint === formData.tokenAddress);

                if (updatedToken) {
                    const updatedTokenInfo = updatedToken.account.data.parsed.info;
                    setSelectedToken({
                        ...selectedToken,
                        tokenAmount: updatedTokenInfo.tokenAmount
                    });
                }
            }
        } catch (error: any) {
            console.error("Error burning tokens:", error);
            toast.error(`Error burning tokens: ${error.message}`);
        } finally {
            setIsBurning(false);
        }
    };

    const maxButtonClick = () => {
        if (selectedToken) {
            setFormData(prevState => ({
                ...prevState,
                burnAmount: selectedToken.tokenAmount.uiAmount.toString()
            }));
        }
    };

    return (
        <div className="p-4">
            {isLoading ? (
                <div className="flex justify-center items-center my-8">
                    <ClipLoader />
                </div>
            ) : (
                <div className="bg-[#1a1a1a] rounded-lg p-4 shadow-md">
                    <form onSubmit={handleBurnToken}>
                        <div className="mb-4">
                            <label className="block mb-1 text-sm font-medium">Select Token</label>
                            <select
                                className="w-full p-2 text-sm bg-[#2a2a2a] border border-gray-700 rounded focus-style"
                                value={formData.tokenAddress}
                                onChange={(e) => handleChange(e, 'tokenAddress')}
                                disabled={isBurning}
                                required
                            >
                                <option value="">Select a token</option>
                                {tokenAccounts.map((token, index) => (
                                    <option key={index} value={token.mint}>
                                        {token.name} ({token.symbol}) - Balance: {token.tokenAmount.uiAmount}
                                        {token.isToken2022 ? " (Token-2022)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedToken && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-sm font-medium">Amount to Burn</label>
                                    <div className="text-xs">
                                        Balance: {selectedToken.tokenAmount.uiAmount} {selectedToken.symbol}
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-2 text-sm bg-[#2a2a2a] border border-gray-700 rounded focus-style pr-16"
                                        placeholder="0.0"
                                        value={formData.burnAmount}
                                        onChange={(e) => handleChange(e, 'burnAmount')}
                                        min="0"
                                        step="any"
                                        disabled={isBurning}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs rounded"
                                        onClick={maxButtonClick}
                                        disabled={isBurning}
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <button
                                type="submit"
                                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded transition-colors duration-200"
                                disabled={isBurning || !selectedToken}
                            >
                                {isBurning ? (
                                    <div className="flex justify-center items-center">
                                        <ClipLoader size={16} color={"#ffffff"} />
                                        <span className="ml-2">Burning...</span>
                                    </div>
                                ) : (
                                    "Burn Tokens"
                                )}
                            </button>
                        </div>
                    </form>

                    {selectedToken && (
                        <div className="mt-4 p-3 bg-[#2a2a2a] rounded text-sm">
                            <h3 className="text-sm font-medium mb-2">Token Information</h3>
                            <div className="grid grid-cols-2 gap-1">
                                <div className="text-gray-400 text-xs">Token Address:</div>
                                <div className="text-xs break-all">{selectedToken.mint}</div>

                                <div className="text-gray-400 text-xs">Name:</div>
                                <div className="text-xs">{selectedToken.name}</div>

                                <div className="text-gray-400 text-xs">Symbol:</div>
                                <div className="text-xs">{selectedToken.symbol}</div>

                                <div className="text-gray-400 text-xs">Decimals:</div>
                                <div className="text-xs">{selectedToken.tokenAmount.decimals}</div>

                                <div className="text-gray-400 text-xs">Current Balance:</div>
                                <div className="text-xs">{selectedToken.tokenAmount.uiAmount}</div>

                                <div className="text-gray-400 text-xs">Token Type:</div>
                                <div className="text-xs">{selectedToken.isToken2022 ? "Token-2022" : "SPL Token"}</div>
                            </div>

                            {selectedToken.logo && (
                                <div className="mt-3 flex justify-center">
                                    <img
                                        src={selectedToken.logo}
                                        alt={`${selectedToken.name} logo`}
                                        className="h-12 w-12 rounded-full"
                                        onError={(e) => {
                                            // Hide the image if it fails to load
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-[#2a2a2a] rounded text-sm">
                        <h3 className="text-sm font-medium mb-1">About Token Burning</h3>
                        <p className="text-gray-300 text-xs">
                            Burning tokens permanently removes them from circulation, reducing the total supply.
                            This action cannot be undone.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BurnToken; 