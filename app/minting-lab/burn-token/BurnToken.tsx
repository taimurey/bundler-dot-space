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
    getMint
} from "@solana/spl-token";
import React, { FC, useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../components/context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { UpdatedInputField } from "../../../components/FieldComponents/UpdatedInputfield";
import { TransactionToast } from "../../../components/common/Toasts/TransactionToast";
import { SendTransaction } from "../../../components/TransactionUtils/SendTransaction";

interface TokenAccountInfo {
    mint: string;
    tokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number;
    };
    name?: string;
    symbol?: string;
}

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
                const accounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_PROGRAM_ID }
                );

                const tokenInfo = await Promise.all(
                    accounts.value
                        .filter(account => {
                            const parsedInfo = account.account.data.parsed.info;
                            // Filter out accounts with zero balance
                            return parsedInfo.tokenAmount.uiAmount > 0;
                        })
                        .map(async (account) => {
                            const parsedInfo = account.account.data.parsed.info;

                            // Try to get token metadata for name and symbol
                            let name = "";
                            let symbol = "";

                            try {
                                const mintInfo = await getMint(connection, new PublicKey(parsedInfo.mint));
                                const metadataPDA = PublicKey.findProgramAddressSync(
                                    [
                                        Buffer.from("metadata"),
                                        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
                                        new PublicKey(parsedInfo.mint).toBuffer(),
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
                                console.error("Error fetching mint info:", error);
                            }

                            return {
                                mint: parsedInfo.mint,
                                tokenAmount: parsedInfo.tokenAmount,
                                name: name || `Unknown (${parsedInfo.mint.slice(0, 4)}...${parsedInfo.mint.slice(-4)})`,
                                symbol: symbol || "???"
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
            const tokenATA = await getAssociatedTokenAddress(
                tokenMint,
                publicKey
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
                BigInt(burnAmount),      // Amount to burn
                decimals            // Decimals of the token
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
                { autoClose: 5000 }
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
                    { programId: TOKEN_PROGRAM_ID }
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
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8">Burn Tokens</h1>

            {isLoading ? (
                <div className="flex justify-center my-20">
                    <ClipLoader size={40} color={"#ffffff"} />
                </div>
            ) : (
                <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg">
                    <form onSubmit={handleBurnToken}>
                        <div className="mb-6">
                            <label className="block mb-2 text-lg font-medium">Select Token</label>
                            <select
                                className="w-full p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg"
                                value={formData.tokenAddress}
                                onChange={(e) => handleChange(e, 'tokenAddress')}
                                disabled={isBurning}
                                required
                            >
                                <option value="">Select a token</option>
                                {tokenAccounts.map((token, index) => (
                                    <option key={index} value={token.mint}>
                                        {token.name} ({token.symbol}) - Balance: {token.tokenAmount.uiAmount}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedToken && (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-lg font-medium">Amount to Burn</label>
                                    <div className="text-sm">
                                        Balance: {selectedToken.tokenAmount.uiAmount} {selectedToken.symbol}
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg pr-16"
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
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                                        onClick={maxButtonClick}
                                        disabled={isBurning}
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-8">
                            <button
                                type="submit"
                                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors duration-200"
                                disabled={isBurning || !selectedToken}
                            >
                                {isBurning ? (
                                    <div className="flex justify-center items-center">
                                        <ClipLoader size={20} color={"#ffffff"} />
                                        <span className="ml-2">Burning...</span>
                                    </div>
                                ) : (
                                    "Burn Tokens"
                                )}
                            </button>
                        </div>
                    </form>

                    {selectedToken && (
                        <div className="mt-6 p-4 bg-[#2a2a2a] rounded-lg">
                            <h3 className="text-lg font-medium mb-2">Token Information</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-gray-400">Token Address:</div>
                                <div className="text-sm break-all">{selectedToken.mint}</div>

                                <div className="text-gray-400">Name:</div>
                                <div>{selectedToken.name}</div>

                                <div className="text-gray-400">Symbol:</div>
                                <div>{selectedToken.symbol}</div>

                                <div className="text-gray-400">Decimals:</div>
                                <div>{selectedToken.tokenAmount.decimals}</div>

                                <div className="text-gray-400">Current Balance:</div>
                                <div>{selectedToken.tokenAmount.uiAmount}</div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-[#2a2a2a] rounded-lg">
                        <h3 className="text-lg font-medium mb-2">About Token Burning</h3>
                        <p className="text-gray-300">
                            Burning tokens permanently removes them from circulation, reducing the total supply.
                            This action cannot be undone. The burned tokens will be permanently destroyed and
                            removed from your wallet.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BurnToken; 