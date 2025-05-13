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

interface TokenAccountResponse {
    account: {
        data: {
            parsed: {
                info: {
                    mint: string;
                    tokenAmount: {
                        amount: string;
                        decimals: number;
                        uiAmount: number;
                    };
                };
            };
        };
    };
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
        try {
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
        } catch (mintAccountError) {
            console.error(`Error fetching mint account info for ${mintAddress}:`, mintAccountError);
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

// Rate limiting helper for API calls
const rateLimit = async (fn: () => Promise<any>, delay = 200) => {
    return new Promise<any>((resolve) => {
        setTimeout(async () => {
            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                console.error("Rate limited function error:", error);
                resolve(null);
            }
        }, delay);
    });
};

// Retry function for fetching data
const fetchWithRetry = async (fn: () => Promise<any>, maxRetries = 3, initialDelay = 500): Promise<any> => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            retries++;
            if (retries >= maxRetries) throw error;

            const delay = initialDelay * Math.pow(2, retries - 1);
            console.log(`Retry ${retries}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

const BurnToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();

    const [isLoading, setIsLoading] = useState(false);
    const [isBurning, setIsBurning] = useState(false);
    const [tokenAccounts, setTokenAccounts] = useState<TokenAccountInfo[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [manualTokenAddress, setManualTokenAddress] = useState("");

    const [formData, setFormData] = useState({
        tokenAddress: "",
        burnAmount: ""
    });

    const [selectedToken, setSelectedToken] = useState<TokenAccountInfo | null>(null);

    // Handle token search - only fetch when user searches
    const handleSearch = async () => {
        if (!publicKey) {
            toast.error("Wallet not connected");
            return;
        }

        setIsLoading(true);
        setTokenAccounts([]);

        try {
            // Get standard SPL token accounts
            const accounts = await fetchWithRetry(() =>
                connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_PROGRAM_ID }
                )
            );

            // Get Token-2022 accounts
            const accounts2022 = await fetchWithRetry(() =>
                connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_2022_PROGRAM_ID }
                )
            );

            // Filter accounts by search query if provided
            const allAccountsFiltered = [
                ...accounts.value,
                ...accounts2022.value
            ].filter(account => {
                const parsedInfo = account.account.data.parsed.info;
                // Include only tokens with non-zero balance
                if (parsedInfo.tokenAmount.uiAmount <= 0) return false;

                // If search query is empty, include all tokens
                if (!searchQuery) return true;

                // Otherwise, check if the mint address contains the search query
                return parsedInfo.mint.toLowerCase().includes(searchQuery.toLowerCase());
            });

            // Process in batches to avoid rate limiting
            const BATCH_SIZE = 3;
            const tokenInfo: TokenAccountInfo[] = [];

            for (let i = 0; i < allAccountsFiltered.length; i += BATCH_SIZE) {
                const batch = allAccountsFiltered.slice(i, i + BATCH_SIZE);

                const batchResults = await Promise.all(
                    batch.map(async (account: TokenAccountResponse, index) => {
                        // Add delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, index * 300));

                        const parsedInfo = account.account.data.parsed.info;
                        const mintAddress = parsedInfo.mint;

                        let isToken2022 = false;
                        try {
                            // Determine if this is a Token-2022 token
                            const mintPublicKey = new PublicKey(mintAddress);
                            const mintAccountInfo = await fetchWithRetry(() =>
                                connection.getAccountInfo(mintPublicKey)
                            );

                            isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;
                        } catch (error) {
                            console.error(`Error checking if ${mintAddress} is Token-2022:`, error);
                            // Continue without knowing if it's Token-2022
                        }

                        // Fetch metadata using Metaplex with rate limiting
                        const metadata = await rateLimit(() =>
                            fetchTokenMetadata(connection, mintAddress)
                        );

                        return {
                            mint: mintAddress,
                            tokenAmount: parsedInfo.tokenAmount,
                            name: metadata?.name || `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                            symbol: metadata?.symbol || "???",
                            logo: metadata?.logo,
                            isToken2022
                        };
                    })
                );

                tokenInfo.push(...batchResults);

                // Add delay between batches to avoid rate limiting
                if (i + BATCH_SIZE < allAccountsFiltered.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            setTokenAccounts(tokenInfo);

            if (tokenInfo.length === 0) {
                toast.info("No tokens found matching your search");
            }
        } catch (error) {
            console.error("Error fetching token accounts:", error);
            toast.error("Failed to fetch token accounts");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle manual token entry
    const handleManualTokenCheck = async () => {
        if (!publicKey || !manualTokenAddress) {
            toast.error("Please enter a valid token address");
            return;
        }

        try {
            setIsLoading(true);

            // Validate mint address
            let mintPublicKey: PublicKey;
            try {
                mintPublicKey = new PublicKey(manualTokenAddress);
            } catch (error) {
                toast.error("Invalid token address format");
                setIsLoading(false);
                return;
            }

            // Check if the account exists
            const mintAccountInfo = await fetchWithRetry(() =>
                connection.getAccountInfo(mintPublicKey)
            );

            if (!mintAccountInfo) {
                toast.error("Token account does not exist");
                setIsLoading(false);
                return;
            }

            // Check if it's a token account
            const isToken2022 = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
            const isTokenAccount = mintAccountInfo.owner.equals(TOKEN_PROGRAM_ID) || isToken2022;

            if (!isTokenAccount) {
                toast.error("Not a valid token account");
                setIsLoading(false);
                return;
            }

            // Find associated token account for the user
            const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
            const associatedTokenAddress = await getAssociatedTokenAddress(
                mintPublicKey,
                publicKey,
                false,
                tokenProgramId
            );

            // Check if user has this token
            const tokenAccount = await fetchWithRetry(() =>
                connection.getAccountInfo(associatedTokenAddress)
            );

            if (!tokenAccount) {
                toast.error("You don't own this token");
                setIsLoading(false);
                return;
            }

            // Get token info
            const tokenInfo = await fetchWithRetry(() =>
                connection.getParsedAccountInfo(associatedTokenAddress)
            );

            if (!tokenInfo || !tokenInfo.value || !('parsed' in tokenInfo.value.data)) {
                toast.error("Failed to get token information");
                setIsLoading(false);
                return;
            }

            // @ts-ignore - dealing with parsed data
            const parsedInfo = tokenInfo.value.data.parsed.info;
            const tokenAmount = parsedInfo.tokenAmount;

            if (tokenAmount.uiAmount <= 0) {
                toast.error("You have 0 balance of this token");
                setIsLoading(false);
                return;
            }

            // Fetch metadata
            const metadata = await rateLimit(() =>
                fetchTokenMetadata(connection, manualTokenAddress)
            );

            // Add to token accounts list
            const newToken: TokenAccountInfo = {
                mint: manualTokenAddress,
                tokenAmount: tokenAmount,
                name: metadata?.name || `Token (${manualTokenAddress.slice(0, 4)}...${manualTokenAddress.slice(-4)})`,
                symbol: metadata?.symbol || "???",
                logo: metadata?.logo,
                isToken2022
            };

            setTokenAccounts([newToken]);

            // Select this token
            setFormData(prev => ({
                ...prev,
                tokenAddress: manualTokenAddress
            }));
            setSelectedToken(newToken);

        } catch (error) {
            console.error("Error checking manual token:", error);
            toast.error("Failed to check token");
        } finally {
            setIsLoading(false);
        }
    };

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

            // Get latest blockhash - use retry logic
            const { blockhash } = await fetchWithRetry(() =>
                connection.getLatestBlockhash('confirmed')
            );
            transaction.recentBlockhash = blockhash;

            toast.info("Burning tokens...");

            // Send transaction
            const signature = await sendTransaction(transaction, connection);

            // Confirm transaction with retry logic
            await fetchWithRetry(() =>
                connection.confirmTransaction(signature, 'confirmed')
            );

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
                try {
                    const accounts = await fetchWithRetry(() =>
                        connection.getParsedTokenAccountsByOwner(
                            publicKey,
                            { programId }
                        )
                    );

                    const updatedToken = accounts.value
                        .find((account: TokenAccountResponse) => account.account.data.parsed.info.mint === formData.tokenAddress);

                    if (updatedToken) {
                        const updatedTokenInfo = updatedToken.account.data.parsed.info;
                        setSelectedToken({
                            ...selectedToken,
                            tokenAmount: updatedTokenInfo.tokenAmount
                        });
                    }
                } catch (error) {
                    console.error("Error refreshing token data:", error);
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
                    <div className="mb-4">
                        <h2 className="text-lg font-medium mb-2">Find Your Tokens</h2>

                        {/* Search by name/address */}
                        <div className="mb-3">
                            <div className="flex mb-2">
                                {/* <input
                                    type="text"
                                    className="w-full p-2 text-sm bg-[#2a2a2a] border border-gray-700 rounded-l focus-style"
                                    placeholder="Search by token address..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    disabled={isBurning}
                                /> */}
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm w-full"
                                    onClick={handleSearch}
                                    disabled={isBurning || !publicKey}
                                >
                                    Search
                                </button>
                            </div>
                            <div className="text-xs text-gray-400">
                                Search tokens from your wallet
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center my-4">
                            <div className="flex-grow h-px bg-gray-700"></div>
                            <div className="px-3 text-xs text-gray-400">OR</div>
                            <div className="flex-grow h-px bg-gray-700"></div>
                        </div>

                        {/* Manual token address entry */}
                        <div className="mb-4">
                            <div className="flex mb-2">
                                <input
                                    type="text"
                                    className="w-full p-2 text-sm bg-[#2a2a2a] border border-gray-700 rounded-l focus-style"
                                    placeholder="Enter token mint address..."
                                    value={manualTokenAddress}
                                    onChange={(e) => setManualTokenAddress(e.target.value)}
                                    disabled={isBurning}
                                />
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-r"
                                    onClick={handleManualTokenCheck}
                                    disabled={isBurning || !publicKey || !manualTokenAddress}
                                >
                                    Check
                                </button>
                            </div>
                            <div className="text-xs text-gray-400">
                                Manually enter the mint address of the token you want to burn
                            </div>
                        </div>
                    </div>

                    {tokenAccounts.length > 0 && (
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
                    )}

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