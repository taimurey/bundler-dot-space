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
    getMint,
    getAccount,
    createThawAccountInstruction,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import React, { FC, useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../components/context/NetworkConfigurationProvider";
import { toast } from "sonner";
import { TransactionToast } from "../../../components/common/Toasts/TransactionToast";
import { Metaplex } from "@metaplex-foundation/js";

interface TokenInfo {
    name: string;
    symbol: string;
    mint: string;
    decimals: number;
    freeze_authority: string | null;
    logo?: string;
    isToken2022?: boolean;
}

interface TokenAccountInfo {
    address: string;
    mint: string;
    owner: string;
    amount: string;
    isFrozen: boolean;
    isToken2022: boolean;
    delegates: {
        delegateAddress: string;
        amount: string;
    } | null;
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

const UnfreezeToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();

    const [isLoading, setIsLoading] = useState(false);
    const [isUnfreezing, setIsUnfreezing] = useState(false);
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [tokenAccounts, setTokenAccounts] = useState<TokenAccountInfo[]>([]);

    const [selectedMint, setSelectedMint] = useState("");
    const [selectedAccount, setSelectedAccount] = useState("");
    const [filteredAccounts, setFilteredAccounts] = useState<TokenAccountInfo[]>([]);

    // Fetch tokens where the connected wallet is the freeze authority
    useEffect(() => {
        if (!publicKey) return;

        const fetchTokensWithFreezeAuthority = async () => {
            setIsLoading(true);
            try {
                // Get all token accounts owned by the user
                const tokenResponse = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_PROGRAM_ID }
                );

                // Also get token-2022 accounts
                const token2022Response = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_2022_PROGRAM_ID }
                );

                // Combine the responses
                const allTokenAccounts = [...tokenResponse.value, ...token2022Response.value];

                // Get unique mint addresses
                const mintAddresses = new Set<string>();
                allTokenAccounts.forEach(item => {
                    const parsedInfo = item.account.data.parsed.info;
                    mintAddresses.add(parsedInfo.mint);
                });

                // Fetch information for each mint
                const mintInfoPromises = Array.from(mintAddresses).map(async (mintAddress) => {
                    try {
                        const mintPublicKey = new PublicKey(mintAddress);
                        const programId = await connection.getAccountInfo(mintPublicKey)
                            .then(info => info?.owner) || TOKEN_PROGRAM_ID;

                        // Get the mint info
                        const mintInfo = await getMint(
                            connection,
                            mintPublicKey,
                            'confirmed',
                            programId
                        );

                        // Check if this wallet is the freeze authority
                        if (mintInfo.freezeAuthority && mintInfo.freezeAuthority.equals(publicKey)) {
                            // Fetch metadata using Metaplex
                            const metadata = await fetchTokenMetadata(connection, mintAddress);

                            // Determine if it's a Token-2022 token
                            const isToken2022 = programId.equals(TOKEN_2022_PROGRAM_ID);

                            return {
                                name: metadata.name,
                                symbol: metadata.symbol,
                                logo: metadata.logo,
                                mint: mintAddress,
                                decimals: mintInfo.decimals,
                                freeze_authority: mintInfo.freezeAuthority?.toBase58() || null,
                                isToken2022
                            };
                        }
                        return null;
                    } catch (error) {
                        console.error(`Error fetching mint info for ${mintAddress}:`, error);
                        return null;
                    }
                });

                const mintInfoResults = await Promise.all(mintInfoPromises);
                const validTokens = mintInfoResults.filter((token) => token !== null) as TokenInfo[];

                setTokens(validTokens);
            } catch (error) {
                console.error("Error fetching tokens with freeze authority:", error);
                toast.error("Failed to fetch tokens where you have freeze authority");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokensWithFreezeAuthority();
    }, [publicKey, connection]);

    // Fetch token accounts for the selected mint
    useEffect(() => {
        if (!selectedMint || !publicKey) return;

        const fetchTokenAccounts = async () => {
            setIsLoading(true);
            try {
                const mintPublicKey = new PublicKey(selectedMint);

                // Determine if this is a Token-2022 mint
                const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
                const isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;
                const programId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

                // Get all token accounts for this mint (from all owners)
                const allTokenAccountsResponse = await connection.getParsedProgramAccounts(
                    programId,
                    {
                        filters: [
                            {
                                dataSize: 165, // Size of token account data
                            },
                            {
                                memcmp: {
                                    offset: 0,
                                    bytes: mintPublicKey.toBase58(),
                                },
                            },
                        ],
                    }
                );

                const accountInfoPromises = allTokenAccountsResponse.map(async (account) => {
                    try {
                        // Parse the account data
                        const accountInfo = await getAccount(
                            connection,
                            account.pubkey,
                            'confirmed',
                            programId
                        );

                        return {
                            address: account.pubkey.toBase58(),
                            mint: accountInfo.mint.toBase58(),
                            owner: accountInfo.owner.toBase58(),
                            amount: accountInfo.amount.toString(),
                            isFrozen: accountInfo.isFrozen,
                            isToken2022: isToken2022,
                            delegates: accountInfo.delegate ? {
                                delegateAddress: accountInfo.delegate.toBase58(),
                                amount: accountInfo.delegatedAmount.toString()
                            } : null
                        };
                    } catch (error) {
                        console.error(`Error parsing token account ${account.pubkey.toBase58()}:`, error);
                        return null;
                    }
                });

                const accountInfoResults = await Promise.all(accountInfoPromises);
                const validAccountInfos = accountInfoResults.filter(
                    (account): account is TokenAccountInfo => account !== null && account.isFrozen
                );

                setTokenAccounts(validAccountInfos);
                setFilteredAccounts(validAccountInfos);
            } catch (error) {
                console.error("Error fetching token accounts:", error);
                toast.error("Failed to fetch token accounts");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokenAccounts();
    }, [selectedMint, connection, publicKey]);

    const handleUnfreezeAccount = async () => {
        if (!publicKey || !selectedMint || !selectedAccount) {
            toast.error("Please select a token and account to unfreeze");
            return;
        }

        setIsUnfreezing(true);

        try {
            const mintPublicKey = new PublicKey(selectedMint);
            const accountPublicKey = new PublicKey(selectedAccount);

            // Determine if this is a Token-2022 mint
            const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
            const isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;
            const programId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            // Create the thaw instruction
            const thawInstruction = createThawAccountInstruction(
                accountPublicKey,
                mintPublicKey,
                publicKey,
                [],
                programId
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

            transaction.add(computeBudget, priorityFee, thawInstruction);
            transaction.feePayer = publicKey;

            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;

            toast.info("Unfreezing token account...");

            // Send transaction
            const signature = await sendTransaction(transaction, connection);

            // Confirm transaction
            await connection.confirmTransaction(signature, 'confirmed');

            toast(
                () => (
                    <TransactionToast
                        txSig={signature}
                        message={"Token account unfrozen successfully!"}
                    />
                ),
                { duration: 5000 }
            );

            // Remove the unfrozen account from the list
            setFilteredAccounts(prevAccounts =>
                prevAccounts.filter(account => account.address !== selectedAccount)
            );

            // Reset selection
            setSelectedAccount("");
        } catch (error: any) {
            console.error("Error unfreezing token account:", error);
            toast.error(`Error unfreezing token account: ${error.message}`);
        } finally {
            setIsUnfreezing(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8">Unfreeze Token Accounts</h1>

            {isLoading ? (
                <div className="flex justify-center my-20">
                    <ClipLoader size={40} color={"#ffffff"} />
                </div>
            ) : (
                <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg">
                    {tokens.length === 0 ? (
                        <div className="text-center p-8">
                            <p className="text-lg">
                                You don't have any tokens where you are the freeze authority.
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                Create a token with freeze authority to manage token unfreezing.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-6">
                                <label className="block mb-2 text-lg font-medium">Select Token</label>
                                <select
                                    className="w-full p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg"
                                    value={selectedMint}
                                    onChange={(e) => {
                                        setSelectedMint(e.target.value);
                                        setSelectedAccount("");
                                    }}
                                    disabled={isUnfreezing}
                                >
                                    <option value="">Select a token</option>
                                    {tokens.map((token, index) => (
                                        <option key={index} value={token.mint}>
                                            {token.name} ({token.symbol})
                                            {token.isToken2022 ? " (Token-2022)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedMint && (
                                <div className="mb-6">
                                    <label className="block mb-2 text-lg font-medium">Select Account to Unfreeze</label>
                                    {filteredAccounts.length === 0 ? (
                                        <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-lg">
                                            <p className="text-gray-400">
                                                No frozen accounts found for this token.
                                            </p>
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg"
                                            value={selectedAccount}
                                            onChange={(e) => setSelectedAccount(e.target.value)}
                                            disabled={isUnfreezing}
                                        >
                                            <option value="">Select an account</option>
                                            {filteredAccounts.map((account, index) => (
                                                <option key={index} value={account.address}>
                                                    Owner: {account.owner.slice(0, 4)}...{account.owner.slice(-4)} -
                                                    Balance: {(Number(account.amount) / Math.pow(10, tokens.find(t => t.mint === selectedMint)?.decimals || 0)).toString()}
                                                    {account.isToken2022 ? " (Token-2022)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {selectedAccount && (
                                <div className="mb-6">
                                    <button
                                        type="button"
                                        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors duration-200"
                                        onClick={handleUnfreezeAccount}
                                        disabled={isUnfreezing || !selectedAccount}
                                    >
                                        {isUnfreezing ? (
                                            <div className="flex justify-center items-center">
                                                <ClipLoader size={20} color={"#ffffff"} />
                                                <span className="ml-2">Unfreezing...</span>
                                            </div>
                                        ) : (
                                            "Unfreeze Account"
                                        )}
                                    </button>
                                </div>
                            )}

                            {selectedMint && (
                                <div className="mt-6 p-4 bg-[#2a2a2a] rounded-lg">
                                    <h3 className="text-lg font-medium mb-2">Token Information</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="text-gray-400">Token Address:</div>
                                        <div className="text-sm break-all">{selectedMint}</div>

                                        <div className="text-gray-400">Name:</div>
                                        <div>{tokens.find(t => t.mint === selectedMint)?.name}</div>

                                        <div className="text-gray-400">Symbol:</div>
                                        <div>{tokens.find(t => t.mint === selectedMint)?.symbol}</div>

                                        <div className="text-gray-400">Decimals:</div>
                                        <div>{tokens.find(t => t.mint === selectedMint)?.decimals}</div>

                                        <div className="text-gray-400">Freeze Authority:</div>
                                        <div className="text-sm break-all">
                                            {tokens.find(t => t.mint === selectedMint)?.freeze_authority || "None"}
                                        </div>

                                        <div className="text-gray-400">Token Type:</div>
                                        <div>{filteredAccounts.find(a => a.mint === selectedMint)?.isToken2022 ? "Token-2022" : "SPL Token"}</div>
                                    </div>

                                    {tokens.find(t => t.mint === selectedMint)?.logo && (
                                        <div className="mt-4 flex justify-center">
                                            <img
                                                src={tokens.find(t => t.mint === selectedMint)?.logo}
                                                alt={`${tokens.find(t => t.mint === selectedMint)?.name} logo`}
                                                className="h-16 w-16 rounded-full"
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

                            <div className="mt-6 p-4 bg-[#2a2a2a] rounded-lg">
                                <h3 className="text-lg font-medium mb-2">About Token Unfreezing</h3>
                                <p className="text-gray-300">
                                    Unfreezing a token account allows transfers to and from that account to resume.
                                    This restores normal functionality to accounts that were previously frozen.
                                    Only the freeze authority for a token can unfreeze accounts.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UnfreezeToken; 