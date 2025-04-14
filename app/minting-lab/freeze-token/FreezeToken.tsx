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
    createFreezeAccountInstruction,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import React, { FC, useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../components/context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { TransactionToast } from "../../../components/common/Toasts/TransactionToast";

interface TokenInfo {
    name: string;
    symbol: string;
    mint: string;
    isNative: boolean;
    decimals: number;
    freeze_authority: string | null;
    isFrozen: boolean;
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

const FreezeToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();

    const [isLoading, setIsLoading] = useState(false);
    const [isFreezing, setIsFreezing] = useState(false);
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
                            // Try to get metadata for name and symbol
                            let name = "";
                            let symbol = "";

                            try {
                                const metadataPDA = PublicKey.findProgramAddressSync(
                                    [
                                        Buffer.from("metadata"),
                                        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
                                        mintPublicKey.toBuffer(),
                                    ],
                                    new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
                                )[0];

                                try {
                                    const metadataInfo = await connection.getAccountInfo(metadataPDA);
                                    if (metadataInfo) {
                                        // Parse the metadata info if available
                                        const metadata = decodeMetadata(metadataInfo.data);
                                        name = metadata.data.name.replace(/\0/g, '');
                                        symbol = metadata.data.symbol.replace(/\0/g, '');
                                    }
                                } catch (error) {
                                    console.error("Error fetching metadata:", error);
                                }
                            } catch (error) {
                                console.error("Error finding metadata PDA:", error);
                            }

                            return {
                                name: name || `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                                symbol: symbol || "???",
                                mint: mintAddress,
                                isNative: mintInfo.isNative,
                                decimals: mintInfo.decimals,
                                freeze_authority: mintInfo.freezeAuthority?.toBase58() || null,
                                isFrozen: false
                            };
                        }
                        return null;
                    } catch (error) {
                        console.error(`Error fetching mint info for ${mintAddress}:`, error);
                        return null;
                    }
                });

                const mintInfoResults = await Promise.all(mintInfoPromises);
                const validTokens = mintInfoResults.filter(
                    (token): token is TokenInfo => token !== null
                );

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

    // Helper function to decode metadata
    const decodeMetadata = (buffer: Buffer) => {
        // This is a simplified version, in reality you'd use a proper parser
        // from the metaplex library
        try {
            // Skip the first part of the buffer which contains header information
            const offset = 1 + 32 + 32 + 4; // Format + Update auth + Mint + Name string length
            const nameLength = buffer[offset - 1]; // Name length is stored right before name

            let name = '';
            for (let i = 0; i < nameLength; i++) {
                if (buffer[offset + i] !== 0) {
                    name += String.fromCharCode(buffer[offset + i]);
                }
            }

            const symbolOffset = offset + nameLength + 4; // 4 bytes for symbol length
            const symbolLength = buffer[symbolOffset - 1];

            let symbol = '';
            for (let i = 0; i < symbolLength; i++) {
                if (buffer[symbolOffset + i] !== 0) {
                    symbol += String.fromCharCode(buffer[symbolOffset + i]);
                }
            }

            return {
                data: {
                    name,
                    symbol,
                    uri: '' // We don't parse the URI here
                }
            };
        } catch (e) {
            console.error("Error decoding metadata:", e);
            return { data: { name: '', symbol: '', uri: '' } };
        }
    };

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

                // Get token accounts for the selected mint
                const response = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { mint: mintPublicKey }
                );

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
                        const parsedData = account.account.data;
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
                    (account): account is TokenAccountInfo => account !== null && !account.isFrozen
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

    const handleFreezeAccount = async () => {
        if (!publicKey || !selectedMint || !selectedAccount) {
            toast.error("Please select a token and account to freeze");
            return;
        }

        setIsFreezing(true);

        try {
            const mintPublicKey = new PublicKey(selectedMint);
            const accountPublicKey = new PublicKey(selectedAccount);

            // Determine if this is a Token-2022 mint
            const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
            const isToken2022 = mintAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) || false;
            const programId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            // Create the freeze instruction
            const freezeInstruction = createFreezeAccountInstruction(
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

            transaction.add(computeBudget, priorityFee, freezeInstruction);
            transaction.feePayer = publicKey;

            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;

            toast.info("Freezing token account...");

            // Send transaction
            const signature = await sendTransaction(transaction, connection);

            // Confirm transaction
            await connection.confirmTransaction(signature, 'confirmed');

            toast(
                () => (
                    <TransactionToast
                        txSig={signature}
                        message={"Token account frozen successfully!"}
                    />
                ),
                { autoClose: 5000 }
            );

            // Remove the frozen account from the list
            setFilteredAccounts(prevAccounts =>
                prevAccounts.filter(account => account.address !== selectedAccount)
            );

            // Reset selection
            setSelectedAccount("");
        } catch (error: any) {
            console.error("Error freezing token account:", error);
            toast.error(`Error freezing token account: ${error.message}`);
        } finally {
            setIsFreezing(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8">Freeze Token Accounts</h1>

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
                                Create a token with freeze authority to manage token freezing.
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
                                    disabled={isFreezing}
                                >
                                    <option value="">Select a token</option>
                                    {tokens.map((token, index) => (
                                        <option key={index} value={token.mint}>
                                            {token.name} ({token.symbol})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedMint && (
                                <div className="mb-6">
                                    <label className="block mb-2 text-lg font-medium">Select Account to Freeze</label>
                                    {filteredAccounts.length === 0 ? (
                                        <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-lg">
                                            <p className="text-gray-400">
                                                No unfrozen accounts found for this token.
                                            </p>
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg"
                                            value={selectedAccount}
                                            onChange={(e) => setSelectedAccount(e.target.value)}
                                            disabled={isFreezing}
                                        >
                                            <option value="">Select an account</option>
                                            {filteredAccounts.map((account, index) => (
                                                <option key={index} value={account.address}>
                                                    Owner: {account.owner.slice(0, 4)}...{account.owner.slice(-4)} -
                                                    Balance: {(Number(account.amount) / Math.pow(10, tokens.find(t => t.mint === selectedMint)?.decimals || 0)).toString()}
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
                                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200"
                                        onClick={handleFreezeAccount}
                                        disabled={isFreezing || !selectedAccount}
                                    >
                                        {isFreezing ? (
                                            <div className="flex justify-center items-center">
                                                <ClipLoader size={20} color={"#ffffff"} />
                                                <span className="ml-2">Freezing...</span>
                                            </div>
                                        ) : (
                                            "Freeze Account"
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
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 p-4 bg-[#2a2a2a] rounded-lg">
                                <h3 className="text-lg font-medium mb-2">About Token Freezing</h3>
                                <p className="text-gray-300">
                                    Freezing a token account prevents any transfers to or from that account.
                                    This is useful for enforcing compliance, preventing trading during certain periods,
                                    or managing token distribution. Only the freeze authority for a token can freeze or unfreeze accounts.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FreezeToken; 