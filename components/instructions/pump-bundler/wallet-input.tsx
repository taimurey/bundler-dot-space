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
    walletType?: 'privateKeys' | 'publicKeys';
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
    maxWallets,
    walletType = 'privateKeys',
    wallets,
    setWallets,
    onChange,
    onWalletsUpdate,
}) => {
    const [error, setError] = useState<string>('');
    const [effectiveMaxWallets, setEffectiveMaxWallets] = useState<number | null>(maxWallets || null);
    const [generateCount, setGenerateCount] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');


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
                        let wallet = '';
                        let solAmount = '';

                        if (walletType === 'privateKeys') {
                            // Looking for private keys in the CSV
                            for (let i = 0; i < row.length; i++) {
                                if (row[i] && row[i].length > 30) {
                                    try {
                                        // Try to decode as a private key
                                        const keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(row[i])));

                                        // Store the private key but display the public key
                                        const publicKey = keypair.publicKey.toBase58();

                                        wallet = row[i]; // Store the private key

                                        // Look for SOL amount in other columns
                                        for (let j = 0; j < row.length; j++) {
                                            if (j !== i && row[j] && !isNaN(Number(row[j]))) {
                                                solAmount = row[j];
                                                break;
                                            }
                                        }
                                        break;
                                    } catch (e) {
                                        // Not a valid private key
                                    }
                                }
                            }
                        } else {
                            // Looking for public keys in the CSV
                            for (let i = 0; i < row.length; i++) {
                                try {
                                    if (row[i] && row[i].length >= 32) {
                                        new PublicKey(row[i]); // Validate as a public key
                                        wallet = row[i];

                                        // Look for SOL amount in other columns
                                        for (let j = 0; j < row.length; j++) {
                                            if (j !== i && row[j] && !isNaN(Number(row[j]))) {
                                                solAmount = row[j];
                                                break;
                                            }
                                        }
                                        break;
                                    }
                                } catch (e) {
                                    // Not a valid public key
                                }
                            }
                        }

                        // If we found a valid wallet, add it to our wallet set
                        if (wallet) {
                            walletSet.push({
                                wallet: wallet,
                                solAmount: solAmount
                            });
                        } else {
                            console.warn(`No valid ${walletType === 'privateKeys' ? 'private key' : 'public key'} found in row ${rowIndex + 1}`);
                        }
                    } catch (err) {
                        console.error(`Error processing row ${rowIndex + 1}:`, err);
                    }
                });

                if (walletSet.length === 0) {
                    toast.error(`No valid ${walletType === 'privateKeys' ? 'private keys' : 'public keys'} found in the CSV file`);
                    return;
                }

                // Only limit wallets if effectiveMaxWallets is set
                if (effectiveMaxWallets !== null && walletSet.length > effectiveMaxWallets) {
                    setError(`Only the first ${effectiveMaxWallets} wallets will be used`);
                    walletSet.splice(effectiveMaxWallets);
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
        // Only check limit if effectiveMaxWallets is set
        if (effectiveMaxWallets !== null && wallets.length >= effectiveMaxWallets) {
            setError(`Maximum ${effectiveMaxWallets} wallets allowed`);
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

        const walletsWithPubkeys = [];
        const walletsWithPrivateKeys = [];
        for (let i = 0; i < count; i++) {
            const keypair = Keypair.generate();
            walletsWithPubkeys.push({
                id: i,
                address: keypair.publicKey.toBase58(),
            });
            walletsWithPrivateKeys.push({
                id: i,
                privateKey: bs58.encode(keypair.secretKey),
            });
        }



        // Generate CSV with both addresses and private keys
        const csvData = Papa.unparse(walletsWithPubkeys);
        const csvDataPrivateKeys = Papa.unparse(walletsWithPrivateKeys);
        const PubkeysBlob = new Blob([csvData], { type: 'text/csv' });
        const PrivatekeysBlob = new Blob([csvDataPrivateKeys], { type: 'text/csv' });
        const url = URL.createObjectURL(PubkeysBlob);
        const urlPrivatekeys = URL.createObjectURL(PrivatekeysBlob);
        const link = document.createElement('a');
        link.setAttribute('hidden', '');
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}publickeys.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        link.setAttribute('href', urlPrivatekeys);
        link.setAttribute('download', `${fileName}privatekeys.csv`);
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
                    <Input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Name of the file"
                    />
                    <Button
                        type="button"
                        className='flex p-2 border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                        onClick={generateWallets}
                    >
                        Generate Receiving Wallets
                    </Button>
                </div>
                <h1 className='text-yellow-400'>Input {walletType} wallet file here</h1>
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
                        <p className="mt-1 text-sm text-gray-500">CSV file {effectiveMaxWallets !== null ? `- Max ${effectiveMaxWallets} wallets` : '- No wallet limit'}</p>

                    </div>
                    <Button
                        type="button" // Add this to prevent form submission
                        onClick={handleManualAdd}
                        disabled={effectiveMaxWallets !== null && wallets.length >= effectiveMaxWallets}
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
                            {wallets.map((wallet, index) => {
                                // Display public key if wallet type is private keys
                                let displayWallet = wallet.wallet;
                                if (walletType === 'privateKeys' && wallet.wallet) {
                                    try {
                                        const keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallet.wallet)));
                                        displayWallet = keypair.publicKey.toBase58();
                                    } catch (e) {
                                        // Keep original value if conversion fails
                                    }
                                }

                                return (
                                    <tr key={index} className="border-t border-zinc-700">
                                        <td className="px-4 py-2 w-[75%]">
                                            <Input
                                                value={displayWallet}
                                                onChange={(e) => handleWalletChange(index, e.target.value)}
                                                placeholder="Enter wallet address"
                                                className={`w-full ${!validateWallet(displayWallet) && displayWallet ? 'border-red-500 bg-zinc-900' : 'bg-zinc-900'}`}
                                            />
                                        </td>
                                        <td className="px-4 py-2 w-[25%]">
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={wallet.solAmount}
                                                    onChange={(e) => handleSolAmountChange(index, e.target.value)}
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
                                )
                            })}
                        </tbody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default WalletAddressInput;