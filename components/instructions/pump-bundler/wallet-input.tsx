import React, { useState, ChangeEvent, SetStateAction, Dispatch } from 'react';
import Papa from 'papaparse';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { toast } from "sonner";
import { Input } from '@/components/ui/input';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

interface WalletInputProps {
    Mode: number;
    maxWallets?: number;
    wallets: WalletEntry[];
    setWallets: Dispatch<SetStateAction<WalletEntry[]>>;
    onChange?: (wallets: Array<{ wallet: string; solAmount: number }>) => void;
    onWalletsUpdate?: (wallets: Array<{ wallet: string; solAmount: number }>) => void;
}

export interface WalletEntry {
    wallet: string;
    solAmount: string;
    tokenAmount?: string;
}

interface ParseResult {
    data: string[][];
    errors: any[];
}

const WalletAddressInput: React.FC<WalletInputProps> = ({
    maxWallets = 4,
    wallets,
    setWallets,
    onChange,
    onWalletsUpdate,
}) => {
    const [error, setError] = useState<string>('');
    const [generateCount, setGenerateCount] = useState<string>(''); // Local state for the number of wallets to generate

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast.error('No file selected');
            return;
        }

        Papa.parse<string[]>(file, {
            complete: function (results: ParseResult) {
                const walletSet: WalletEntry[] = [];

                // Process each row in the CSV file
                results.data.forEach((row, rowIndex) => {
                    // Skip header rows or empty rows
                    if (rowIndex === 0 || row.length === 0 || !row[0]) {
                        return;
                    }

                    try {
                        let privateKey = '';
                        let solAmount = '';

                        // First column might be a private key directly
                        if (row[0] && row[0].length > 30) {
                            try {
                                // Try to decode as a private key
                                const keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(row[0])));
                                privateKey = row[0];

                                // Check if second column contains a SOL amount
                                if (row[1] && !isNaN(Number(row[1]))) {
                                    solAmount = row[1];
                                }
                            } catch (e) {
                                // Not a valid private key in column 1
                            }
                        }

                        // If first column wasn't a valid private key, check second or third column
                        if (!privateKey) {
                            // Check if first column is a public key
                            try {
                                new PublicKey(row[0]); // Validate as a public key

                                // Second column might be the private key
                                if (row[1] && row[1].length > 30) {
                                    try {
                                        Keypair.fromSecretKey(new Uint8Array(bs58.decode(row[1])));
                                        privateKey = row[1];

                                        // If third column exists, it might be the SOL amount
                                        if (row[2] && !isNaN(Number(row[2]))) {
                                            solAmount = row[2];
                                        }
                                    } catch (e) {
                                        // Not a valid private key in column 2
                                    }
                                }

                                // If second column is a number, check third column for private key
                                if (!privateKey && row[1] && !isNaN(Number(row[1]))) {
                                    solAmount = row[1];

                                    if (row[2] && row[2].length > 30) {
                                        try {
                                            Keypair.fromSecretKey(new Uint8Array(bs58.decode(row[2])));
                                            privateKey = row[2];
                                        } catch (e) {
                                            // Not a valid private key in column 3
                                        }
                                    }
                                }
                            } catch (e) {
                                // First column is not a valid public key
                            }
                        }

                        // If we found a valid private key, add it to our wallet set
                        if (privateKey) {
                            walletSet.push({
                                wallet: privateKey,
                                solAmount: solAmount
                            });
                        } else {
                            console.warn(`No valid private key found in row ${rowIndex + 1}`);
                        }
                    } catch (err) {
                        console.error(`Error processing row ${rowIndex + 1}:`, err);
                    }
                });

                if (walletSet.length === 0) {
                    toast.error('No valid private keys found in the CSV file');
                    return;
                }

                if (walletSet.length > maxWallets) {
                    setError(`Only the first ${maxWallets} wallets will be used`);
                    walletSet.splice(maxWallets);
                }

                toast.success(`${walletSet.length} wallets loaded successfully`);
                setWallets(walletSet);
                notifyChange(walletSet);
            },
            error: function (err: any) {
                setError(`Error parsing CSV file: ${err.message}`);
                toast.error(`An error occurred while parsing the file: ${err.message}`);
            }
        });

        event.target.value = '';
    };

    const handleManualAdd = () => {
        if (wallets.length >= maxWallets) {
            setError(`Maximum ${maxWallets} wallets allowed`);
            return;
        }
        setWallets([...wallets, { wallet: '', solAmount: '' }]);
        setError('');
    };

    const generateWallets = () => {
        const count = Number(generateCount);
        if (isNaN(count) || count <= 0) {
            toast.error('Please enter a valid number of wallets to generate');
            return;
        }

        const walletsWithDetails = [];

        for (let i = 0; i < count; i++) {
            const keypair = Keypair.generate();
            walletsWithDetails.push({
                id: i,
                address: keypair.publicKey.toBase58(),
                privateKey: bs58.encode(keypair.secretKey),
            });
        }

        // Generate CSV with both addresses and private keys
        const csvData = Papa.unparse(walletsWithDetails);
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('hidden', '');
        link.setAttribute('href', url);
        link.setAttribute('download', 'wallets.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Wallets generated and file downloaded successfully');
    };

    const handleWalletChange = (index: number, value: string) => {
        const newWallets = [...wallets];
        newWallets[index] = { ...newWallets[index], wallet: value };
        setWallets(newWallets);
        notifyChange(newWallets);
    };

    const handleSolAmountChange = (index: number, value: string) => {
        const newWallets = [...wallets];
        newWallets[index] = { ...newWallets[index], solAmount: value };
        setWallets(newWallets);
        notifyChange(newWallets);
    };

    const handleRemoveWallet = (index: number) => {
        const newWallets = wallets.filter((_, i) => i !== index);
        setWallets(newWallets);
        notifyChange(newWallets);
        setError('');
    };

    const notifyChange = (walletEntries: WalletEntry[]) => {
        const processedWallets = walletEntries.map(entry => ({
            wallet: entry.wallet,
            solAmount: Number(entry.solAmount) || 0
        }));

        onChange?.(processedWallets);
        onWalletsUpdate?.(processedWallets);
    };

    const validateWallet = (wallet: string): boolean => {
        try {
            if (wallet) {
                new PublicKey(wallet); // Validate the wallet address
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    };

    return (
        <div className="space-y-4 w-full border border-zinc-400 border-dashed rounded-xl p-2">
            <div className="flex flex-col gap-2 justify-end w-full rounded-md shadow-sm">
                <div className='flex gap-2 mb-4'>

                    <Input
                        type="number"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(e.target.value)}
                        placeholder="Number of wallets to generate"
                    />
                    <Button
                        type="button"
                        className='flex p-2 border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                        onClick={generateWallets}
                    >
                        Generate Receiving Wallets
                    </Button>
                </div>
                <h1 className='text-yellow-400'>Input Wallet addresses file here</h1>
                <div className='flex gap-2'>
                    <div className="flex-1">
                        <div className="relative">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="file:mr-4 cursor-pointer file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 placeholder:text-gray-400"
                            />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">CSV file - Max {maxWallets} wallets</p>

                    </div>
                    <Button
                        type="button" // Add this to prevent form submission
                        onClick={handleManualAdd}
                        disabled={wallets.length >= maxWallets}
                        variant="outline"
                        className="flex p-2 border font-semibold bg-zinc-900 border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12"
                    >
                        <Plus className="h-4 w-4" />
                        (or) Add Wallets Manually
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {wallets.length > 0 && (
                <div className="rounded-lg border border-zinc-400 overflow-hidden bg-neutral-800">
                    <Table>
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-base text-white font-semibold">Wallets</th>
                                <th className="px-4 py-2 text-left text-base text-white font-semibold">Token Amount</th>
                                <th className="px-4 py-2 w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {wallets.map((wallet, index) => (
                                <tr key={index} className="border-t border-zinc-700">
                                    <td className="px-4 py-2 w-[75%]">
                                        <Input
                                            value={wallet.wallet}
                                            onChange={(e) => handleWalletChange(index, e.target.value)}
                                            placeholder="Enter wallet address"
                                            className={`w-full ${!validateWallet(wallet.wallet) && wallet.wallet ? 'border-red-500 bg-zinc-900' : 'bg-zinc-900'}`}
                                        />
                                    </td>
                                    <td className="px-4 py-2 w-[25%]">
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={wallet.solAmount}
                                                onChange={(e) => handleSolAmountChange(index, e.target.value)}
                                                disabled
                                                placeholder="0.0"
                                                className="w-full bg-zinc-900"
                                                min="0"
                                                step="0.000000001"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <Button
                                            type="button" // Add this to prevent form submission
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveWallet(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default WalletAddressInput;