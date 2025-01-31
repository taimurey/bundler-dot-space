'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { useSolana } from '@/components/contexts/SolanaContext';
import { toast } from 'react-toastify';
import { BundleToast } from '@/components/bundler-toasts';
import { BalanceType } from '@/components/types/solana-types';
import WalletsDrawer, { truncate } from '@/components/sidebar-drawer';
import { PumpSeller } from '@/components/instructions/pump-bundler/PumpSeller';
import WalletInput from '@/components/instructions/pump-bundler/wallet-input';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { WalletEntry } from '@/components/instructions/pump-bundler/wallet-address-input';
import { getHeaderLayout } from '@/components/header-layout';

const ZERO = new BN(0)
type BN = typeof ZERO

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const PumpfunSell = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [Mode, setMode] = useState(1);
    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        throw new Error('NFT_STORAGE is not defined');
    }


    const [formData, setFormData] = useState<{
        tokenAddress: string;
        Wallets: string[];
        feeKeypair: string;
        SellPercentage: string;
        GoalSolAmount: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
    }>({
        tokenAddress: '',
        Wallets: [],
        feeKeypair: '',
        SellPercentage: '',
        GoalSolAmount: '',
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2],
    });

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }


    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));

        if (field === 'deployerPrivateKey') {
            try {
                const wallet = (Keypair.fromSecretKey(new Uint8Array(base58.decode(value))));
                console.log(wallet.publicKey);

            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }


            // Add new wallet to setsideWallets
            // setdeployerwallets(prevProfiles => [...prevProfiles, {
            //     id: prevProfiles.length,
            //     name: 'Deployer',
            //     wallet: base58.encode(wallet.secretKey), // Use JSON.stringify instead of toString
            //     color: randomColor(),
            // }]);

            setFormData(prevState => ({
                ...prevState,
                deployerPrivateKey: value,
            }));
        }

        if (field === 'buyerPrivateKey') {
            try {
                const wallet = ((Keypair.fromSecretKey(new Uint8Array(base58.decode(value)))));
                console.log(wallet.publicKey);
            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }
            // setWallets([value]);

            // Add new wallet to setsideWallets
            // setdeployerwallets(prevProfiles => [...prevProfiles, {
            //     id: prevProfiles.length,
            //     name: 'Buyer',
            //     wallet: wallet.toString(),
            //     color: randomColor(),
            // }]);
        }
    };

    const handleSubmission = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form inputs
        if (wallets.length === 0) {
            toast.error('No wallets loaded');
            return;
        }

        if (!formData.tokenAddress) {
            toast.error('Please enter a token address');
            return;
        }

        if (!formData.SellPercentage) {
            toast.error('Please enter a sell percentage');
            return;
        }

        if (!formData.GoalSolAmount) {
            toast.error('Please enter a goal SOL amount');
            return;
        }

        try {
            // Call the PumpSeller function to process the wallets
            const bundleResults = await PumpSeller(
                connection,
                wallets,
                formData.feeKeypair,
                formData.tokenAddress,
                formData.SellPercentage,
                formData.BundleTip,
                formData.BlockEngineSelection
            );

            // Display success toast for each bundle result
            bundleResults.forEach((result) => {
                toast(
                    () => (
                        <BundleToast
                            txSig={result}
                            message={'Bundle ID:'}
                        />
                    ),
                    { autoClose: 5000 }
                );
            });
        } catch (error) {
            console.error('Error during submission:', error);
            toast.error(`Error bundling: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: BalanceType[] = [];

            const balances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        console.log('wallet:', wallet.wallet);
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));

                        // Fetch SOL balance
                        const solBalance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));

                        // Fetch token balance if tokenAddress is provided
                        let tokenBalance = '0';
                        if (formData.tokenAddress) {
                            try {
                                const tokenMint = new PublicKey(formData.tokenAddress);
                                const tokenAccount = getAssociatedTokenAddressSync(tokenMint, keypair.publicKey);
                                const balance = await connection.getTokenAccountBalance(tokenAccount);
                                tokenBalance = balance.value.amount;
                            } catch (error) {
                                console.error(`Error fetching token balance for wallet ${keypair.publicKey.toString()}:`, error);
                            }
                        }



                        return { balance: solBalance, publicKey: keypair.publicKey.toString(), tokenAmount: tokenBalance };
                    } catch (error) {
                        toast.error(`Error fetching balance: ${error}`);
                        return { balance: 0, publicKey: 'Invalid', tokenAmount: '0' };
                    }
                })
            );

            setFormData(prevState => ({
                ...prevState,
                buyerextraWallets: wallets.map(wallet => wallet.wallet),
            }));

            allBalances = [...allBalances, ...balances];
            setBalances(allBalances);

            // Update wallets with token balances
            const updatedWallets = wallets.map((wallet, index) => ({
                ...wallet,
                tokenAmount: balances[index].tokenAmount || '0',
            }));
            setWallets(updatedWallets);
        };

        fetchBalances();
    }, [wallets, formData.tokenAddress]);

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative">
            <form>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] bg-opacity-70 border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>Sell Mode</p>
                                    <p className=' text-[12px] text-[#96989c] '>Create a pumpfun token and ghost wallet buys in one go</p>
                                </div>
                                <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                    <select
                                        id="BlockEngineSelection"
                                        value={Mode}
                                        onChange={(e) => setMode(Number(e.target.value))}
                                        required={true}
                                        className="block w-full px-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                    >
                                        <option value="" disabled>
                                            Bundler Mode
                                        </option>
                                        {modeOptions
                                            .map((option, index) => (
                                                <option key={index} value={option.value}>
                                                    {option.value} {option.label}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <h3 className="btn-text-gradient font-bold text-[15px] mt-2"
                                >Optional - If wallets not Loaded in Browser</h3>
                                <div className="border border-dashed border-white rounded-md shadow-lg p-4 items-start justify-center"
                                >
                                    <InputField
                                        label="Fee Payer Wallet"
                                        subfield='private key'
                                        id="feeKeypair"
                                        value={formData.feeKeypair}
                                        onChange={(e) => handleChange(e, 'feeKeypair')}
                                        placeholder="D5bBVBQ....aeVK5W"
                                        type="text"
                                        required={true}
                                    />
                                    <div className="relative rounded-md shadow-sm w-full flex gap-2 mt-2">
                                        {Mode > 1 && (
                                            <WalletInput
                                                wallets={wallets}
                                                setWallets={setWallets}
                                                Mode={Mode}
                                                maxWallets={Mode}
                                                onChange={(walletData) => {
                                                    setFormData(prevState => ({
                                                        ...prevState,
                                                        buyerextraWallets: walletData.map(entry => entry.wallet),
                                                        buyerWalletAmounts: walletData.map(entry => entry.solAmount)
                                                    }));
                                                }}
                                                onWalletsUpdate={(walletData) => {
                                                    // Log the complete wallet data with amounts
                                                    console.log('Updated wallet data:', walletData.map(entry => ({
                                                        wallet: entry.wallet,
                                                        solAmount: entry.solAmount,
                                                        lamports: entry.solAmount * LAMPORTS_PER_SOL
                                                    })));
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className='flex flex-col gap-2' id="tokeninfo">
                                    <h3 className='btn-text-gradient font-bold text-[15px] mt-2'>Percentage Sell</h3>
                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="coinname"
                                            label="Mint Address"
                                            subfield='address'
                                            value={formData.tokenAddress}
                                            onChange={(e) => handleChange(e, 'tokenAddress')}
                                            placeholder="D5bBVBQ....eVK5W"
                                            type="text"
                                            required={true}
                                        />
                                        <InputField
                                            label="Sell Percentage"
                                            subfield='%'
                                            id="tokenMarketID"
                                            value={formData.SellPercentage}
                                            onChange={(e) => handleChange(e, 'SellPercentage')}
                                            placeholder="90..."
                                            type="text"
                                            required={true}
                                        />
                                    </div>
                                    <div className='flex justify-center'>

                                        <button
                                            className="text-center btn-normal mt-5 w-2/3"
                                            type="submit"
                                            id="formbutton"
                                            onClick={handleSubmission}
                                        >
                                            <span className="btn-text-gradient font-bold">

                                                Sell
                                                <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(Sells % from all wallets)</span>

                                            </span>
                                        </button>
                                    </div>
                                    <h3 className='btn-text-gradient font-bold text-[15px] mt-2'>Goal Specific</h3>

                                    <InputField
                                        id="GoalSolAmount"
                                        label={`Goal Sol Amount`}
                                        subfield={`Sell tokens at specific goal`}
                                        value={formData.GoalSolAmount}
                                        onChange={(e) => handleChange(e, 'GoalSolAmount')}
                                        placeholder="50..."
                                        type="number"
                                        required={true}
                                    />
                                    <div className='flex justify-end items-end gap-2 border rounded-lg p-4 mt-4 border-gray-600'>

                                        <div className="w-full">
                                            <label className="block mt-5 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                                Block Engine
                                            </label>
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
                                            <InputField
                                                id="BundleTip"
                                                value={formData.BundleTip}
                                                onChange={(e) => handleChange(e, 'BundleTip')}
                                                placeholder="0.01"
                                                type="number"
                                                label="Bundle Tip"
                                                required={true}
                                            />
                                            <InputField
                                                id="TransactionTip"
                                                value={formData.TransactionTip}
                                                onChange={(e) => handleChange(e, 'TransactionTip')}
                                                placeholder="0.0001"
                                                type="number"
                                                label="Txn Tip (SOL)"
                                                required={true}
                                            />
                                        </div>
                                    </div>
                                    <div className='justify-center'>
                                        <button
                                            className="text-center w-full invoke-btn"
                                            type="submit"
                                            id="formbutton"
                                            disabled={true}
                                            title="Coming Soon"
                                            style={{ backgroundColor: 'black', color: 'white', cursor: 'not-allowed' }}
                                        >
                                            <span className="btn-text-gradient font-bold">
                                                Initiate Mode
                                                {/* <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(sells once certain amount of sol is reached in token)</span> */}
                                                <span className="pl-5 text-[#FFC107] text-[12px] font-normal">Coming Soon</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="min-w-[44px] p-4 bg-[#0c0e11] bg-opacity-70 border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
                                <div>
                                    <div>
                                        <p className='font-bold text-[25px]'>Predicted Parameters</p>
                                        <p className=' text-[12px] text-[#96989c] '>Here are the predicted parameters based on your input.</p>
                                    </div>
                                    <div className='w-full'>
                                        <label className="block mt-5 text-base text-white font-semibold" >
                                            Wallets:
                                        </label>
                                        <br />
                                        <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end">
                                            {balances.map(({ balance, publicKey }, index) => (
                                                <a
                                                    key={index}
                                                    href={`https://solscan.io/account/${publicKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base max-w-[300px] bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[10px] select-text"
                                                    style={{ userSelect: 'text' }}
                                                >
                                                    <p>
                                                        <span className='text-[#96989c] text-[10px] font-normal'>{index + 1}: </span>
                                                        {truncate(publicKey, 6, 7)!}
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>SOL Balance: {balance}</span>
                                                        <br />
                                                        {/* <span className='text-[#96989c] text-[14px] font-normal ml-2'>Token Balance: {tokenAmount}</span> */}
                                                        <br />
                                                    </p>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form >
            <div className='absolute -top-[70px] right-0 h-screen'>
                <WalletsDrawer />
            </div>
        </div >
    );
}

const modeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 100, label: "Multi-Wallet" },
];




PumpfunSell.getLayout = (page: ReactNode) => getHeaderLayout(page, "Pumpfun - Sell");

export default PumpfunSell;