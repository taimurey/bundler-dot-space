"use client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    Connection,
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    ComputeBudgetProgram,
    SystemProgram,
    sendAndConfirmTransaction,
    Keypair
} from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getMint,
    createTransferCheckedInstruction,
    getAccount
} from "@solana/spl-token";
import React, { FC, useState, useEffect, ChangeEvent, SetStateAction } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../components/context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { TransactionToast, LinkToast } from "../../../components/common/Toasts/TransactionToast";
import { BlockEngineLocation, InputField } from "@/components/ui/input-field";
import { FaInfoCircle } from "react-icons/fa";
import WalletAddressInput, { WalletEntry } from "@/components/instructions/pump-bundler/wallet-input";

// Tooltip component for additional information
const Tooltip: FC<{ title: string; description: string }> = ({ title, description }) => {
    return (
        <div className="group relative inline-block ml-2">
            <FaInfoCircle className="text-gray-400 cursor-pointer" />
            <div className="absolute left-0 mt-2 w-64 p-3 bg-[#232323] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg border border-gray-700">
                <p className="font-semibold mb-1">{title}</p>
                <p>{description}</p>
            </div>
        </div>
    );
};

interface TokenInfo {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    balance: string;
    uiBalance: number;
}

interface RecipientInfo {
    address: string;
    amount: string;
    valid: boolean;
}

const TokenDistributor: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, signAllTransactions } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();

    const [isLoading, setIsLoading] = useState(false);
    const [isDistributing, setIsDistributing] = useState(false);
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [selectedToken, setSelectedToken] = useState("");
    const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([]);
    const [bundleStatus, setBundleStatus] = useState("");

    // Fetch user's tokens
    useEffect(() => {
        if (!publicKey) return;

        const fetchTokens = async () => {
            setIsLoading(true);
            try {
                // Get all token accounts owned by the user
                const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_PROGRAM_ID }
                );

                // Also get token-2022 accounts
                const token2022Accounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { programId: TOKEN_2022_PROGRAM_ID }
                );

                // Combine the results
                const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];

                // Process each token account
                const tokenInfoPromises = allAccounts
                    .filter(item => {
                        const info = item.account.data.parsed.info;
                        return parseInt(info.tokenAmount.amount) > 0; // Only show tokens with balance
                    })
                    .map(async (item) => {
                        const parsedInfo = item.account.data.parsed.info;
                        const mintAddress = parsedInfo.mint;
                        const mintPublicKey = new PublicKey(mintAddress);

                        let name = "";
                        let symbol = "";

                        try {
                            // Try to get metadata for name and symbol
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
                            address: mintAddress,
                            name: name || `Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
                            symbol: symbol || "???",
                            decimals: parsedInfo.tokenAmount.decimals,
                            balance: parsedInfo.tokenAmount.amount,
                            uiBalance: parsedInfo.tokenAmount.uiAmount
                        };
                    });

                const tokenInfos = await Promise.all(tokenInfoPromises);
                setTokens(tokenInfos);
            } catch (error) {
                console.error("Error fetching token accounts:", error);
                toast.error("Failed to fetch token accounts");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokens();
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

    // Modify to handle wallet entries update
    const handleWalletsUpdate = (updatedWallets: Array<{ wallet: string; solAmount: number }>) => {
        // The WalletAddressInput component calls this function when wallets are updated
        // We don't need to set any additional state since the component directly updates walletEntries
        console.log("Wallets updated:", updatedWallets);
    };

    // Validate wallet address
    const validateWalletAddress = (address: string): boolean => {
        try {
            if (address) {
                new PublicKey(address);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    // Calculate the total amount to be sent (adapted for wallet entries)
    const calculateTotal = () => {
        if (!walletEntries.length) return 0;

        return walletEntries.reduce((sum, entry) => {
            if (!validateWalletAddress(entry.wallet)) return sum;
            return sum + parseFloat(entry.solAmount || '0');
        }, 0);
    };

    const [formData, setFormData] = useState({
        BlockEngineSelection: "",
        BundleTip: 0.01,
        TransactionTip: 0.0001
    });

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        setFormData({ ...formData, [field]: e.target.value });
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        setFormData({ ...formData, [field]: parseFloat(e.target.value) });
    };

    // Build and send the transactions - modified to use walletEntries
    const handleDistribute = async () => {
        if (!publicKey || !selectedToken || walletEntries.length === 0) {
            toast.error("Please select a token and add recipients");
            return;
        }

        if (!signAllTransactions) {
            toast.error("Please connect your wallet");
            return;
        }

        const validRecipients = walletEntries.filter(entry => validateWalletAddress(entry.wallet));
        if (validRecipients.length === 0) {
            toast.error("No valid recipients found");
            return;
        }

        const selectedTokenInfo = tokens.find(t => t.address === selectedToken);
        if (!selectedTokenInfo) {
            toast.error("Selected token not found");
            return;
        }

        setIsDistributing(true);
        setBundleStatus("Preparing transactions...");

        try {
            // Get the mint details
            const mintPublicKey = new PublicKey(selectedToken);
            const mintInfo = await getMint(connection, mintPublicKey);

            // Check if this is a Token-2022 mint
            const isProgramToken2022 = mintInfo.tlvData !== undefined;
            const tokenProgramId = isProgramToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            // Get the sender's associated token account
            const senderTokenAccount = await getAssociatedTokenAddress(
                mintPublicKey,
                publicKey,
                false,
                tokenProgramId
            );

            // Check the token balance
            const tokenAccountInfo = await getAccount(
                connection,
                senderTokenAccount,
                'confirmed',
                tokenProgramId
            );

            const totalAmount = calculateTotal();
            const totalTokenAmount = totalAmount * Math.pow(10, selectedTokenInfo.decimals);

            if (Number(tokenAccountInfo.amount) < totalTokenAmount) {
                toast.error("Insufficient token balance");
                setIsDistributing(false);
                return;
            }

            // Group recipients into chunks (max 8 recipients per transaction)
            const maxRecipientsPerTx = 8;
            const recipientChunks = [];
            for (let i = 0; i < validRecipients.length; i += maxRecipientsPerTx) {
                recipientChunks.push(validRecipients.slice(i, i + maxRecipientsPerTx));
            }

            // Maximum 5 transactions per bundle
            const maxTxsPerBundle = 5;
            const transactionBundles = [];

            // Create transactions (up to 5 per bundle)
            for (let i = 0; i < recipientChunks.length; i += maxTxsPerBundle) {
                const bundleChunks = recipientChunks.slice(i, i + maxTxsPerBundle);

                const transactions = await Promise.all(bundleChunks.map(async (chunk, index) => {
                    const transaction = new Transaction();

                    // Add compute budget instructions
                    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
                        units: 1000000
                    });

                    const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: 1 * LAMPORTS_PER_SOL * 1000000
                    });

                    transaction.add(computeBudgetInstruction, priorityFeeInstruction);

                    // Add transfer instructions for each recipient in this chunk
                    for (const entry of chunk) {
                        const destinationAddress = new PublicKey(entry.wallet);
                        const amount = Math.floor(parseFloat(entry.solAmount || '0') * Math.pow(10, selectedTokenInfo.decimals));

                        // Get the recipient's associated token account
                        const destinationTokenAccount = await getAssociatedTokenAddress(
                            mintPublicKey,
                            destinationAddress,
                            false,
                            tokenProgramId
                        );

                        // Check if the token account exists
                        let destinationAccountInfo;
                        try {
                            destinationAccountInfo = await getAccount(
                                connection,
                                destinationTokenAccount,
                                'confirmed',
                                tokenProgramId
                            );
                        } catch (error) {
                            // If the account doesn't exist, create it
                            transaction.add(
                                createAssociatedTokenAccountInstruction(
                                    publicKey,                  // Payer
                                    destinationTokenAccount,    // Associated token account
                                    destinationAddress,         // Owner
                                    mintPublicKey,              // Mint
                                    tokenProgramId
                                )
                            );
                        }

                        // Add transfer instruction
                        transaction.add(
                            createTransferCheckedInstruction(
                                senderTokenAccount,           // Source
                                mintPublicKey,                // Mint
                                destinationTokenAccount,      // Destination
                                publicKey,                    // Owner of source
                                BigInt(amount),               // Amount
                                selectedTokenInfo.decimals    // Decimals
                            )
                        );
                    }

                    // Set recent blockhash and fee payer
                    transaction.feePayer = publicKey;
                    const { blockhash } = await connection.getLatestBlockhash('confirmed');
                    transaction.recentBlockhash = blockhash;

                    return transaction;
                }));

                transactionBundles.push(transactions);
            }

            // Sign all transactions
            setBundleStatus("Signing transactions...");

            for (const bundle of transactionBundles) {
                // Show the user how many transactions they're signing
                toast.info(`Please sign ${bundle.length} transactions`);

                // Sign all transactions in this bundle
                const signedTransactions = await signAllTransactions(bundle);

                // Serialize signed transactions
                const serializedTransactions = signedTransactions.map(tx =>
                    tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
                );

                // Send bundle to the API
                setBundleStatus("Sending transactions bundle...");

                try {
                    const response = await fetch('https://mevarik-deployer.xyz:2791/send-bundle', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            blockengine: `https://ny.mainnet.block-engine.jito.wtf`,
                            txns: serializedTransactions
                        })
                    });

                    if (!response.ok) {
                        const message = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
                    }

                    const result = await response.json();

                    // Show success toast with signature
                    toast(
                        () => (
                            <LinkToast
                                link={`https://solscan.io/tx/${result.signature}`}
                                message={"Bundle sent successfully!"}
                            />
                        ),
                        { autoClose: 5000 }
                    );
                } catch (error: any) {
                    console.error("Error sending bundle:", error);
                    toast.error(`Error sending bundle: ${error.message}`);
                }
            }

            // Reset form
            setWalletEntries([]);

        } catch (error: any) {
            console.error("Error distributing tokens:", error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsDistributing(false);
            setBundleStatus("");
        }
    };

    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">

            {isLoading ? (
                <div className="flex justify-center my-20">
                    <ClipLoader size={40} color={"#ffffff"} />
                </div>
            ) : (
                <div className="bg-[#1a1a1a] rounded-lg p-6 shadow-lg">
                    <h1 className="text-lg font-bold text-start mb-2 btn-text-gradient">Token Distributor</h1>
                    <div className="mb-6">
                        <label className="block mb-2 text-lg font-medium">Select Token</label>
                        {tokens.length === 0 ? (
                            <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-lg">
                                <p className="text-gray-400">
                                    No tokens found in your wallet.
                                </p>
                            </div>
                        ) : (
                            <select
                                className="w-full p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg"
                                value={selectedToken}
                                onChange={(e) => setSelectedToken(e.target.value)}
                                disabled={isDistributing}
                            >
                                <option value="">Select a token</option>
                                {tokens.map((token, index) => (
                                    <option key={index} value={token.address}>
                                        {token.name} ({token.symbol}) - Balance: {token.uiBalance}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {selectedToken && (
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center">
                                    <label className="block text-lg font-medium">Recipients</label>
                                    <Tooltip
                                        title="Recipient Format"
                                        description="Add wallet addresses and token amounts for distribution. You can add addresses manually or import from a CSV file."
                                    />
                                </div>
                                <div className="text-sm text-gray-400">
                                    <span className="text-white">Total Amount: {calculateTotal()}</span>
                                </div>
                            </div>

                            {/* Custom wrapper for WalletAddressInput to display token amount instead of SOL amount */}
                            <div className="mb-4">
                                <WalletAddressInput
                                    Mode={0}
                                    maxWallets={100}
                                    wallets={walletEntries.map(entry => ({
                                        ...entry,
                                        solAmount: entry.solAmount || '',
                                        tokenAmount: entry.solAmount || '' // Add tokenAmount as alternative field
                                    }))}
                                    setWallets={(newWallets: SetStateAction<WalletEntry[]>) => {
                                        // Convert the SetStateAction to an array of WalletEntry
                                        const entries = typeof newWallets === 'function'
                                            ? newWallets(walletEntries)
                                            : newWallets;

                                        // Map entries back to use solAmount for consistency
                                        const processedEntries = entries.map((entry: WalletEntry) => ({
                                            wallet: entry.wallet,
                                            solAmount: (entry as any).tokenAmount || entry.solAmount || '',
                                        }));
                                        setWalletEntries(processedEntries);
                                    }}
                                    onWalletsUpdate={handleWalletsUpdate}
                                />

                                {/* Rename column headers */}
                                <script dangerouslySetInnerHTML={{
                                    __html: `
                                        // Use setTimeout to ensure DOM is loaded
                                        setTimeout(() => {
                                            // Find and modify the table headers
                                            const thElements = document.querySelectorAll('table thead tr th');
                                            if (thElements.length >= 2) {
                                                thElements[1].textContent = 'Token Amount';
                                            }
                                            
                                            // Enable all disabled inputs in the second column
                                            const inputs = document.querySelectorAll('table tbody tr td:nth-child(2) input');
                                            inputs.forEach(input => {
                                                input.disabled = false;
                                            });
                                        }, 100);
                                    `
                                }} />
                            </div>
                        </div>
                    )}


                    <div className='flex justify-end items-end gap-2 border rounded-lg p-4 mt-4 border-gray-600'>

                        <div className="w-full">
                            <div className="flex items-center">
                                <label className="block mt-5 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                    Block Engine
                                </label>
                                <Tooltip
                                    title="Block Engine Location"
                                    description="Select the Block Engine location closest to you for better performance. This affects how quickly your transactions will be processed."
                                />
                            </div>
                            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                <select
                                    id="BlockEngineSelection"
                                    value={formData.BlockEngineSelection}
                                    onChange={(e) => handleSelectionChange(e, 'BlockEngineSelection')}
                                    required={true}
                                    className="block w-full px-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                >
                                    <option value="" disabled>
                                        Block Engine Location(Closest to you)
                                    </option>
                                    {BlockEngineLocation.map((option, index) => (
                                        <option key={index} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className='flex justify-end items-end gap-2'>
                            <div>
                                <div className="flex items-center">
                                    <label className="block text-sm text-white font-medium" htmlFor="BundleTip">
                                        Bundle Tip
                                    </label>
                                    <Tooltip
                                        title="Bundle Tip"
                                        description="The tip amount in SOL for the entire bundle. This incentivizes validators to include your bundle in a block."
                                    />
                                </div>
                                <InputField
                                    id="BundleTip"
                                    value={formData.BundleTip.toString()}
                                    onChange={(e) => handleChange(e, 'BundleTip')}
                                    placeholder="0.01"
                                    type="number"
                                    label=""
                                    required={true}
                                />
                            </div>
                            <div>
                                <div className="flex items-center">
                                    <label className="block text-sm text-white font-medium" htmlFor="TransactionTip">
                                        Txn Tip (SOL)
                                    </label>
                                    <Tooltip
                                        title="Transaction Tip"
                                        description="The tip amount in SOL applied to each transaction in the bundle."
                                    />
                                </div>
                                <InputField
                                    id="TransactionTip"
                                    value={formData.TransactionTip.toString()}
                                    onChange={(e) => handleChange(e, 'TransactionTip')}
                                    placeholder="0.0001"
                                    type="number"
                                    label=""
                                    required={true}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            type="button"
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200"
                            onClick={handleDistribute}
                            disabled={
                                isDistributing ||
                                !selectedToken ||
                                walletEntries.length === 0
                            }
                        >
                            {isDistributing ? (
                                <div className="flex justify-center items-center">
                                    <ClipLoader size={20} color={"#ffffff"} />
                                    <span className="ml-2">{bundleStatus || "Distributing..."}</span>
                                </div>
                            ) : (
                                "Distribute Tokens"
                            )}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

export default TokenDistributor; 