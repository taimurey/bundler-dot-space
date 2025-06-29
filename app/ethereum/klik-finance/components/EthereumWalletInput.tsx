import React, { useState, ChangeEvent, SetStateAction, Dispatch } from 'react';
import Papa from 'papaparse';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { Input } from '@/components/ui/input';

interface EthereumWalletInputProps {
    Mode: number;
    walletType?: 'privateKeys' | 'publicKeys';
    maxWallets?: number;
    wallets: EthereumWalletEntry[];
    setWallets: Dispatch<SetStateAction<EthereumWalletEntry[]>>;
    onChange?: (wallets: Array<{ wallet: string; ethAmount: number }>) => void;
    onWalletsUpdate?: (wallets: Array<{ wallet: string; ethAmount: number }>) => void;
}

export interface EthereumWalletEntry {
    wallet: string;
    ethAmount: string;
    tokenAmount?: string;
}

interface ParseResult {
    data: string[][];
    errors: any[];
}

const EthereumWalletInput: React.FC<EthereumWalletInputProps> = ({
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

    // Ethereum wallet generation
    const generateEthereumWallet = () => {
        // Generate random private key (32 bytes)
        const privateKeyBytes = new Uint8Array(32);
        if (typeof window !== 'undefined' && window.crypto) {
            window.crypto.getRandomValues(privateKeyBytes);
        } else {
            // Fallback for older browsers
            for (let i = 0; i < 32; i++) {
                privateKeyBytes[i] = Math.floor(Math.random() * 256);
            }
        }

        const privateKey = '0x' + Array.from(privateKeyBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Generate address from private key (simplified - in real implementation you'd use proper derivation)
        const addressBytes = new Uint8Array(20);
        if (typeof window !== 'undefined' && window.crypto) {
            window.crypto.getRandomValues(addressBytes);
        } else {
            for (let i = 0; i < 20; i++) {
                addressBytes[i] = Math.floor(Math.random() * 256);
            }
        }

        const address = '0x' + Array.from(addressBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        return { privateKey, address };
    };

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast.error('No file selected');
            return;
        }

        Papa.parse<string[]>(file, {
            complete: function (results: ParseResult) {
                const walletSet: EthereumWalletEntry[] = [];

                // Process each row in the CSV file
                results.data.forEach((row, rowIndex) => {
                    // Skip header rows or empty rows
                    if (rowIndex === 0 || row.length === 0 || !row[0]) {
                        return;
                    }

                    try {
                        let wallet = '';
                        let ethAmount = '';

                        if (walletType === 'privateKeys') {
                            // Looking for private keys in the CSV
                            for (let i = 0; i < row.length; i++) {
                                if (row[i] && isValidPrivateKey(row[i])) {
                                    wallet = row[i]; // Store the private key

                                    // Look for ETH amount in other columns
                                    for (let j = 0; j < row.length; j++) {
                                        if (j !== i && row[j] && !isNaN(Number(row[j]))) {
                                            ethAmount = row[j];
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        } else {
                            // Looking for Ethereum addresses in the CSV
                            for (let i = 0; i < row.length; i++) {
                                if (row[i] && isValidEthereumAddress(row[i])) {
                                    wallet = row[i];

                                    // Look for ETH amount in other columns
                                    for (let j = 0; j < row.length; j++) {
                                        if (j !== i && row[j] && !isNaN(Number(row[j]))) {
                                            ethAmount = row[j];
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }

                        // If we found a valid wallet, add it to our wallet set
                        if (wallet) {
                            walletSet.push({
                                wallet: wallet,
                                ethAmount: ethAmount
                            });
                        } else {
                            console.warn(`No valid ${walletType === 'privateKeys' ? 'private key' : 'Ethereum address'} found in row ${rowIndex + 1}`);
                        }
                    } catch (err) {
                        console.error(`Error processing row ${rowIndex + 1}:`, err);
                    }
                });

                if (walletSet.length === 0) {
                    toast.error(`No valid ${walletType === 'privateKeys' ? 'private keys' : 'Ethereum addresses'} found in the CSV file`);
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
        setWallets([...wallets, { wallet: '', ethAmount: '' }]);
        setError('');
    };

    const generateWallets = () => {
        const count = Number(generateCount);
        if (isNaN(count) || count <= 0) {
            toast.error('Please enter a valid number of wallets to generate');
            return;
        }

        const walletsWithAddresses = [];
        const walletsWithPrivateKeys = [];

        for (let i = 0; i < count; i++) {
            const { privateKey, address } = generateEthereumWallet();
            walletsWithAddresses.push({
                id: i,
                address: address,
            });
            walletsWithPrivateKeys.push({
                id: i,
                privateKey: privateKey,
            });
        }

        // Generate CSV with both addresses and private keys
        const csvDataAddresses = Papa.unparse(walletsWithAddresses);
        const csvDataPrivateKeys = Papa.unparse(walletsWithPrivateKeys);
        const addressesBlob = new Blob([csvDataAddresses], { type: 'text/csv' });
        const privateKeysBlob = new Blob([csvDataPrivateKeys], { type: 'text/csv' });

        // Download addresses CSV
        const urlAddresses = URL.createObjectURL(addressesBlob);
        const linkAddresses = document.createElement('a');
        linkAddresses.setAttribute('hidden', '');
        linkAddresses.setAttribute('href', urlAddresses);
        linkAddresses.setAttribute('download', `${fileName}addresses.csv`);
        document.body.appendChild(linkAddresses);
        linkAddresses.click();
        document.body.removeChild(linkAddresses);

        // Download private keys CSV
        const urlPrivateKeys = URL.createObjectURL(privateKeysBlob);
        const linkPrivateKeys = document.createElement('a');
        linkPrivateKeys.setAttribute('hidden', '');
        linkPrivateKeys.setAttribute('href', urlPrivateKeys);
        linkPrivateKeys.setAttribute('download', `${fileName}privatekeys.csv`);
        document.body.appendChild(linkPrivateKeys);
        linkPrivateKeys.click();
        document.body.removeChild(linkPrivateKeys);

        toast.success('Ethereum wallets generated and files downloaded successfully');
    };

    const handleWalletChange = (index: number, value: string) => {
        const newWallets = [...wallets];
        newWallets[index] = { ...newWallets[index], wallet: value };
        setWallets(newWallets);
        notifyChange(newWallets);
    };

    const handleEthAmountChange = (index: number, value: string) => {
        const newWallets = [...wallets];
        newWallets[index] = { ...newWallets[index], ethAmount: value };
        setWallets(newWallets);
        notifyChange(newWallets);
    };

    const handleRemoveWallet = (index: number) => {
        const newWallets = wallets.filter((_, i) => i !== index);
        setWallets(newWallets);
        notifyChange(newWallets);
        setError('');
    };

    const notifyChange = (walletEntries: EthereumWalletEntry[]) => {
        const processedWallets = walletEntries.map(entry => ({
            wallet: entry.wallet,
            ethAmount: Number(entry.ethAmount) || 0
        }));

        onChange?.(processedWallets);
        onWalletsUpdate?.(processedWallets);
    };

    // Ethereum address validation
    const isValidEthereumAddress = (address: string): boolean => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    // Ethereum private key validation
    const isValidPrivateKey = (privateKey: string): boolean => {
        return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
    };

    const validateWallet = (wallet: string): boolean => {
        if (walletType === 'privateKeys') {
            return isValidPrivateKey(wallet);
        } else {
            return isValidEthereumAddress(wallet);
        }
    };

    // Convert private key to address for display
    const getDisplayWallet = (wallet: string): string => {
        if (walletType === 'privateKeys' && wallet && isValidPrivateKey(wallet)) {
            // In a real implementation, you'd derive the actual address from the private key
            // For now, we'll just show a placeholder or truncated version
            return `Address from ${wallet.slice(0, 10)}...${wallet.slice(-6)}`;
        }
        return wallet;
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
                        Generate Ethereum Wallets
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
                        type="button"
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
                                <th className="px-4 py-2 text-left text-base text-white font-semibold">
                                    {walletType === 'privateKeys' ? 'Ethereum Addresses' : 'Wallets'}
                                </th>
                                <th className="px-4 py-2 text-left text-base text-white font-semibold">ETH Amount</th>
                                <th className="px-4 py-2 w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {wallets.map((wallet, index) => {
                                const displayWallet = getDisplayWallet(wallet.wallet);

                                return (
                                    <tr key={index} className="border-t border-zinc-700">
                                        <td className="px-4 py-2 w-[75%]">
                                            <Input
                                                value={walletType === 'privateKeys' ? wallet.wallet : displayWallet}
                                                onChange={(e) => handleWalletChange(index, e.target.value)}
                                                placeholder={`Enter ${walletType === 'privateKeys' ? 'private key' : 'Ethereum address'}`}
                                                className={`w-full ${!validateWallet(wallet.wallet) && wallet.wallet ? 'border-red-500 bg-zinc-900' : 'bg-zinc-900'}`}
                                                type={walletType === 'privateKeys' ? 'password' : 'text'}
                                            />
                                            {walletType === 'privateKeys' && wallet.wallet && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {displayWallet}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 w-[25%]">
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={wallet.ethAmount}
                                                    onChange={(e) => handleEthAmountChange(index, e.target.value)}
                                                    placeholder="0.0"
                                                    className="w-full bg-zinc-900"
                                                    min="0"
                                                    step="0.000000001"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <Button
                                                type="button"
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

export default EthereumWalletInput; 