import React, { useState, useEffect, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { toast } from 'react-toastify';
import { Input } from '@/components/ui/input';

interface WalletInputProps {
    Mode: number;
    maxWallets?: number;
    onChange?: (wallets: Array<{ wallet: string; solAmount: number }>) => void;
    onWalletsUpdate?: (wallets: Array<{ wallet: string; solAmount: number }>) => void;
}

interface WalletEntry {
    wallet: string;
    solAmount: string;
}

interface ParseResult {
    data: string[][];
    errors: any[];
}

const WalletInput: React.FC<WalletInputProps> = ({
    Mode,
    maxWallets = 4,
    onChange,
    onWalletsUpdate
}) => {
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [error, setError] = useState<string>('');

    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast.error('No file selected');
            return;
        }

        Papa.parse<string[]>(file, {
            complete: function (results: ParseResult) {
                const walletData = results.data.slice(1).map(row => ({
                    wallet: row[1],
                    solAmount: '0'
                }));

                const walletSet: WalletEntry[] = [];
                walletData.forEach((element) => {
                    if (element.wallet === '' || element.wallet === 'wallet' || element.wallet === undefined) {
                        return;
                    }
                    try {
                        Keypair.fromSecretKey(new Uint8Array(bs58.decode(element.wallet)));
                        walletSet.push(element);
                    } catch (err) {
                        toast.error(`Invalid wallet private key: ${element.wallet}`);
                    }
                });

                if (walletSet.length > maxWallets) {
                    setError(`Only the first ${maxWallets} wallets were imported`);
                    walletSet.splice(maxWallets);
                }

                if (walletSet.length > 0) {
                    toast.success('Wallets Loaded Successfully');
                    setWallets(walletSet);
                    notifyChange(walletSet);
                }
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
        setWallets([...wallets, { wallet: '', solAmount: '0' }]);
        setError('');
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
                Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallet)));
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    };

    const calculateLamports = (solAmount: string): number => {
        const amount = parseFloat(solAmount);
        return isNaN(amount) ? 0 : amount * LAMPORTS_PER_SOL;
    };

    return (
        <div className="space-y-4 w-full border border-zinc-400 border-dashed rounded-xl p-2">
            {Mode === 5 && (
                <div className="flex flex-row gap-2 justify-end w-full rounded-md shadow-sm">
                    <div className="flex-1">
                        <div className="relative">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="file:mr-4 cursor-pointer file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 placeholder:text-gray-400"
                            />
                            <span className="pointer-events-none absolute inset-y-0 left-[120px] flex items-center text-sm text-gray-500">
                                Optional
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">CSV file - Max {maxWallets} wallets</p>
                    </div>
                    <Button
                        onClick={handleManualAdd}
                        disabled={wallets.length >= maxWallets}
                        variant="outline"
                        className="flex items-center gap-2 bg-gray-700 py-4"
                    >
                        <Plus className="h-4 w-4" />
                        Add Wallets Manually
                    </Button>
                </div>
            )}

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
                                <th className="px-4 py-2 text-left text-base text-white font-semibold">SOL Amount</th>
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
                                            placeholder="Enter wallet private key"
                                            className={`w-full ${!validateWallet(wallet.wallet) && wallet.wallet ? 'border-red-500 bg-zinc-900' : 'bg-zinc-900'}`}
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
                                            <div className="absolute right-3 top-1 text-sm text-gray-400">
                                                SOL
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <Button
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

export default WalletInput;