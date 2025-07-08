'use client';

import React, { ChangeEvent, ReactNode, useState } from 'react';
import { BN } from 'bn.js';
import { Metaplex } from "@metaplex-foundation/js";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { OutputField } from '@/components/OutputField';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import axios from 'axios';
import { toast } from "sonner";
import { BundleToast, TransactionToast } from '@/components/bundler-toasts';
import { WalletProfileContext } from '@/components/SolanaWallet/wallet-context';
import { truncate } from '@/components/sidebar-drawer';
import { CreatePoolSwap } from '@/components/instructions/RaydiumBundler/AmmPool';
import { BalanceType } from '@/components/types/solana-types';
import { getKeypairFromBs58 } from '@/components/instructions/pump-bundler/misc';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { InputField } from '@/components/ui/input-field';
import { randomColor } from '@/components/utils/random-color';
import JitoBundleSelection, { BlockEngineLocation } from '@/components/ui/jito-bundle-selection';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import Image from 'next/image';
import { getHeaderLayout } from '@/components/header-layout';

const ZERO = new BN(0)
type BN = typeof ZERO

const LiquidityHandlerRaydium = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [Mode, setMode] = useState(1);
    const [isJitoBundle, setIsJitoBundle] = useState(true);
    const [formData, setFormData] = useState<{
        buyerPrivateKey: string;
        buyerextraWallets: string[];
        deployerPrivateKey: string;
        walletsNumbers: string;
        tokenMintAddress: string;
        tokenMarketID: string;
        tokenDecimals: string;
        totalSupply: string;
        tokenbuyAmount: string;
        tokenLiquidityAmount: string;
        tokenLiquidityAddPercent: string;
        BlockEngineSelection: string;
        BundleTip: string;
        TransactionTip: string;
    }>(
        {
            buyerPrivateKey: '',
            buyerextraWallets: [],
            deployerPrivateKey: '',
            walletsNumbers: '',
            tokenMintAddress: '',
            tokenMarketID: '',
            tokenDecimals: '',
            totalSupply: '',
            tokenbuyAmount: '',
            tokenLiquidityAmount: '',
            tokenLiquidityAddPercent: '',
            BlockEngineSelection: BlockEngineLocation[2],
            BundleTip: '0.01',
            TransactionTip: '0.00001',
        }
    );

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }

    const [setsideWallets, setdeployerwallets] = useState<Array<{ id: number, name: string, wallet: string, color: string }>>([]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));

        if (field === 'deployerPrivateKey') {
            let wallet: Keypair;
            try {
                wallet = (Keypair.fromSecretKey(new Uint8Array(base58.decode(value))));
            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }

            // Add new wallet to setsideWallets
            setdeployerwallets(prevProfiles => [...prevProfiles, {
                id: prevProfiles.length,
                name: 'Deployer',
                wallet: base58.encode(wallet.secretKey), // Use JSON.stringify instead of toString
                color: randomColor(),
            }]);
            setFormData(prevState => ({
                ...prevState,
                deployerPrivateKey: value,
            }));
        }

        if (field === 'buyerPrivateKey') {
            const wallet = ((Keypair.fromSecretKey(new Uint8Array(base58.decode(value)))));

            setFormData(prevState => ({
                ...prevState,
                buyerPrivateKey: value,
            }));

            // Add new wallet to setsideWallets
            setdeployerwallets(prevProfiles => [...prevProfiles, {
                id: prevProfiles.length,
                name: 'Buyer',
                wallet: wallet.toString(),
                color: randomColor(),
            }]);
        }
    };

    const [fistLoad, setFirstLoad] = useState(true);

    React.useEffect(() => {
        if (fistLoad) {
            setFirstLoad(false);
            return;
        }
        if (!formData.tokenMintAddress) {
            toast.error('No mint address provided');
            return;
        }
        const fetchData = async () => {
            const MintMetadata = await new Metaplex(connection).nfts().findByMint({ mintAddress: new PublicKey(formData.tokenMintAddress) });

            const decimals = MintMetadata.mint.decimals;
            const supply = MintMetadata.mint.supply.basisPoints;
            console.log(MintMetadata, "mint metadata");
            console.log(decimals, "decimals");
            console.log(supply, "supply");

            setFormData(prevState => ({
                ...prevState,
                tokenDecimals: decimals.toString(),
                totalSupply: supply.toString(10),
            }));
        };
        fetchData();
    }, [formData.tokenMintAddress]);

    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: BalanceType[] = [];

            if (formData.deployerPrivateKey) {
                const deployerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.deployerPrivateKey)));
                const balance = parseFloat((await connection.getBalance(deployerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                allBalances.push({ balance, publicKey: deployerWallet.publicKey.toString() });
            }

            if (formData.buyerPrivateKey) {
                const buyerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.buyerPrivateKey)));
                const balance = parseFloat((await connection.getBalance(buyerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                allBalances.push({ balance, publicKey: buyerWallet.publicKey.toString() });
            }

            const balances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        console.log('wallet:', wallet.wallet);
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));
                        const balance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                        return { balance, publicKey: keypair.publicKey.toString() };
                    } catch (error) {
                        toast.error(`Error fetching balance: ${error}`);
                        return { balance: 0, publicKey: 'Invalid' };
                    }
                })
            );

            setFormData(prevState => ({
                ...prevState,
                buyerextraWallets: wallets.map(wallet => wallet.wallet),
            }));

            allBalances = [...allBalances, ...balances];
            setBalances(allBalances);
        };

        fetchBalances();
    }, [wallets, formData.deployerPrivateKey, formData.buyerPrivateKey]);

    const handlesubmission = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (
            !formData.deployerPrivateKey ||
            !formData.tokenMintAddress ||
            !formData.tokenMarketID ||
            !formData.tokenDecimals ||
            !formData.totalSupply ||
            !formData.tokenLiquidityAmount ||
            !formData.tokenLiquidityAddPercent ||
            !formData.BlockEngineSelection ||
            !formData.BundleTip ||
            !formData.TransactionTip
        ) {
            toast.error('Please fill all required fields');
            return;
        }

        // Clear deployer wallets from state and localStorage
        setDeployerWallets([]);
        localStorage.removeItem("deployerwallets");

        // Get keypairs for deployer and buyer wallets
        const deployerwallet = getKeypairFromBs58(formData.deployerPrivateKey)!;
        const buyerwallet = getKeypairFromBs58(formData.buyerPrivateKey)!;

        // Fetch balances for deployer and buyer wallets
        const deployerBalance = parseFloat((await connection.getBalance(deployerwallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
        console.log(deployerBalance, "deployer balance");
        const buyerBalance = parseFloat((await connection.getBalance(buyerwallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
        console.log(buyerBalance, "buyer balance");

        // Validate deployer wallet balance
        if (deployerBalance < (Number(formData.tokenLiquidityAmount) + 0.4 + 0.25)) {
            toast.error('Deployer wallet has insufficient balance');
            return;
        }

        // Validate buyer wallet balance
        if (buyerBalance < Number(formData.tokenbuyAmount)) {
            toast.error('Buyer wallet has insufficient balance');
            return;
        }

        let bundler = '';
        let ammID = '';

        try {
            // Save deployer wallets to state and localStorage
            setDeployerWallets(setsideWallets);
            localStorage.setItem("deployerwallets", JSON.stringify(setsideWallets));

            // Show loading toast
            toast.info('Please wait, bundle acceptance may take a few seconds');

            // Prepare the list of wallets
            let Allwallets: string[];
            if (Mode === 5) {
                // Use only the wallet addresses from the wallets array
                Allwallets = wallets.map(wallet => wallet.wallet);
            } else {
                // Include the buyer wallet and the wallet addresses from the wallets array
                Allwallets = [formData.buyerPrivateKey, ...wallets.map(wallet => wallet.wallet)];
            }

            // Call the CreatePoolSwap function
            const result = await CreatePoolSwap(connection, formData, Allwallets);

            if (result) {
                bundler = result.result;
                ammID = result.ammID.toString();
            }

            // Show success toasts
            toast(
                () => (
                    <BundleToast
                        txSig={bundler}
                        message={'Bundle ID:'}
                    />
                ),
                { duration: 5000 }
            );

            toast(
                () => (
                    <TransactionToast
                        txSig={ammID}
                        message={'AMM ID:'}
                    />
                ),
                { duration: 5000 }
            );
        } catch (error) {
            console.log('Error:', error);

            // Handle Axios errors
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 500) {
                    toast.error(`${error.response.data}`);
                } else {
                    toast.error('Unknown error occurred');
                }
            }
            // Handle other errors
            else if (error instanceof Error) {
                const errorMessage = error.message;
                const jsonStart = errorMessage.indexOf('{');
                if (jsonStart !== -1) {
                    const errorJsonStr = errorMessage.slice(jsonStart);
                    try {
                        const errorData = JSON.parse(errorJsonStr);
                        toast.error(errorData.error);
                    } catch (e) {
                        toast.error(errorMessage);
                    }
                } else {
                    toast.error(errorMessage);
                }
            } else {
                toast.error('An unknown error occurred');
            }
        }
    };

    const { setDeployerWallets } = WalletProfileContext();

    return (
        <div className="flex py-1 justify-center items-start relative max-w-[100vw]">
            <form className="w-full max-w-[1400px]">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
                    {/* Left Column - Main Form */}
                    <div className="xl:col-span-2 space-y-3">
                        {/* Header Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className='font-bold text-[20px]'>Raydium AMM Bundler</p>
                                    <p className='text-[11px] text-[#96989c]'>Create a liquidity pool and set buy amounts for your token</p>
                                    <p className='text-[11px] text-[#ff3535]'>(Report Any Errors in the Discord)</p>
                                </div>
                                <div className="md:w-1/3">
                                    <label className="block text-sm text-white font-semibold mb-1">Bundler Mode</label>
                                    <Listbox value={Mode} onChange={(value) => setMode(Number(value))}>
                                        <div className="relative">
                                            <ListboxButton className="w-full px-2 rounded-md text-sm border border-[#404040] text-white bg-input-boxes h-[35px] focus:outline-none focus:border-blue-500 text-left flex items-center gap-2">
                                                {Mode} Wallet Mode
                                                <span className="text-[#FFC107] text-[10px] ml-2">{Mode === 5 ? '(5 wallets available)' : ''}</span>
                                            </ListboxButton>
                                            <ListboxOptions className="absolute z-10 mt-1 w-full bg-[#0c0e11] border border-[#404040] rounded-md shadow-lg max-h-60 overflow-auto">
                                                {modeOptions.map((option) => (
                                                    <ListboxOption
                                                        key={option.value}
                                                        value={option.value}
                                                        className={({ focus, selected }) =>
                                                            `flex items-center px-2 gap-2 py-2 text-white text-xs cursor-pointer ${focus ? 'bg-blue-500' : ''} ${selected ? 'bg-blue-500' : ''}`
                                                        }
                                                    >
                                                        {option.value} {option.label}
                                                    </ListboxOption>
                                                ))}
                                            </ListboxOptions>
                                        </div>
                                    </Listbox>
                                </div>
                            </div>
                        </div>

                        {/* Wallet Configuration Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Wallet Configuration</h3>

                            <InputField
                                id="deployerPrivatekey"
                                label="Deployer Private Key"
                                subfield='Pool Deployer'
                                value={formData.deployerPrivateKey}
                                onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                placeholder="Enter deployer private key"
                                type="password"
                                required={true}
                            />

                            {Mode === 1 && (
                                <InputField
                                    id='buyerPrivateKey'
                                    label='Buyer Private Key'
                                    subfield='first buy - 1 wallet'
                                    value={formData.buyerPrivateKey}
                                    onChange={(e) => handleChange(e, 'buyerPrivateKey')}
                                    placeholder='buyer private key'
                                    type='password'
                                    required={true}
                                />
                            )}

                            {Mode === 5 && (
                                <div className="mt-4">
                                    <h4 className="text-sm text-white font-semibold mb-2">Multi-Wallet Configuration</h4>
                                    <WalletInput
                                        wallets={wallets}
                                        setWallets={setWallets}
                                        Mode={Mode}
                                        maxWallets={4}
                                        onChange={(walletData) => {
                                            setFormData(prevState => ({
                                                ...prevState,
                                                buyerextraWallets: walletData.map(entry => entry.wallet),
                                                buyerWalletAmounts: walletData.map(entry => entry.solAmount)
                                            }));
                                        }}
                                        onWalletsUpdate={(walletData) => {
                                            console.log('Updated wallet data:', walletData.map(entry => ({
                                                wallet: entry.wallet,
                                                solAmount: entry.solAmount,
                                                lamports: entry.solAmount * LAMPORTS_PER_SOL
                                            })));
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Token Information Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Token Information</h3>

                            <InputField
                                id="tokenMintAddress"
                                label="Mint Address"
                                subfield='token address'
                                value={formData.tokenMintAddress}
                                onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                placeholder="Enter Mint Address"
                                type="text"
                                required={true}
                            />

                            <InputField
                                label="Market ID"
                                id="tokenMarketID"
                                value={formData.tokenMarketID}
                                onChange={(e) => handleChange(e, 'tokenMarketID')}
                                placeholder="Enter Market ID"
                                type="text"
                                required={true}
                            />

                            <div className='flex justify-center items-center gap-2'>
                                <InputField
                                    label="Decimals"
                                    id="tokenDecimals"
                                    value={formData.tokenDecimals}
                                    onChange={(e) => handleChange(e, 'tokenDecimals')}
                                    placeholder="Enter decimals"
                                    type="number"
                                    required={true}
                                />
                                <InputField
                                    label="Total Supply"
                                    id="totalSupply"
                                    value={formData.totalSupply}
                                    onChange={(e) => handleChange(e, 'totalSupply')}
                                    placeholder="Enter total supply"
                                    type="number"
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Liquidity Configuration Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Liquidity Configuration</h3>

                            {Mode === 1 && (
                                <InputField
                                    id="tokenbuyAmount"
                                    label="Buy Amount"
                                    subfield='sol'
                                    value={formData.tokenbuyAmount}
                                    onChange={(e) => handleChange(e, 'tokenbuyAmount')}
                                    placeholder="First Buy Amount"
                                    type="number"
                                    required={true}
                                />
                            )}

                            <div className='flex justify-center items-center gap-2'>
                                <InputField
                                    id="tokenLiquidityAmount"
                                    label="Liquidity Amount"
                                    subfield='sol'
                                    value={formData.tokenLiquidityAmount}
                                    onChange={(e) => handleChange(e, 'tokenLiquidityAmount')}
                                    placeholder="Enter Liquidity Amount"
                                    type="number"
                                    required={true}
                                />
                                <InputField
                                    id="tokenLiquidityAddPercent"
                                    subfield='%'
                                    value={formData.tokenLiquidityAddPercent}
                                    onChange={(e) => handleChange(e, 'tokenLiquidityAddPercent')}
                                    placeholder="% of tokens (1-100)"
                                    type="number"
                                    label="Token Percentage"
                                    required={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Bundle Configuration and Status Panel */}
                    <div className="xl:col-span-1 space-y-3">
                        {/* Bundle Configuration */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Bundle Configuration</h3>
                            <JitoBundleSelection
                                isJitoBundle={isJitoBundle}
                                setIsJitoBundle={setIsJitoBundle}
                                formData={formData}
                                handleChange={handleChange}
                                handleSelectionChange={handleSelectionChange}
                                snipeEnabled={false}
                                setSnipeEnabled={() => { }}
                                snipeAmount={''}
                                setSnipeAmount={() => { }}
                            />
                            <button
                                onClick={handlesubmission}
                                className='text-center w-full invoke-btn'
                                type='button'
                            >
                                <span className='btn-text-gradient font-bold'>
                                    Initiate Pool Creation
                                    <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(0.25 SOL Bundler Cost)</span>
                                </span>
                            </button>
                        </div>

                        {/* Status Panel */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-600 rounded-xl shadow-2xl shadow-black sticky top-4">
                            <div className="mb-4">
                                <p className='font-bold text-[18px]'>Status Panel</p>
                                <p className='text-[11px] text-[#96989c]'>Real-time wallet information and parameters</p>
                            </div>

                            {/* Wallets Section */}
                            <div className='mb-4'>
                                <label className="block text-sm text-white font-semibold mb-2">
                                    Wallets ({balances.length}):
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {balances.map(({ balance, publicKey }, index) => (
                                        <a
                                            key={index}
                                            href={`https://solscan.io/account/${publicKey}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-2 bg-[#101010] rounded-md hover:bg-[#181818] transition-colors"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className='text-[#96989c] text-xs'>#{index + 1}</span>
                                                <span className='text-xs text-gray-300'>{balance} SOL</span>
                                            </div>
                                            <div className="text-xs text-blue-400 font-mono mt-1">
                                                {truncate(publicKey, 6, 6)}
                                            </div>
                                        </a>
                                    ))}
                                    {balances.length === 0 && (
                                        <div className="text-xs text-gray-500 italic p-2 text-center">
                                            No wallets configured yet
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Predicted Parameters */}
                            <div className='mb-4'>
                                <label className="block text-sm text-white font-semibold mb-2">
                                    Predicted Parameters:
                                </label>
                                <div className="space-y-2 text-xs">
                                    <OutputField
                                        id="totalmintaddress"
                                        label="Mint Address:"
                                        value={formData.tokenMintAddress}
                                        latedisplay={true}
                                    />
                                    <OutputField
                                        id="MarketId"
                                        label="Market ID:"
                                        value={formData.tokenMarketID}
                                        latedisplay={true}
                                    />
                                    <OutputField
                                        id="buyamount"
                                        label="Buy Amount:"
                                        value={`${formData.tokenbuyAmount && formData.tokenbuyAmount !== '0' ? `${formData.tokenbuyAmount} SOL` : formData.tokenbuyAmount}`}
                                        latedisplay={true}
                                    />
                                    <OutputField
                                        id="liquidityamount"
                                        label="Liquidity Amount:"
                                        value={`${formData.tokenLiquidityAmount && formData.tokenLiquidityAmount !== '0' ? `${formData.tokenLiquidityAmount} SOL` : formData.tokenLiquidityAmount}`}
                                        latedisplay={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

const modeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 5, label: "Wallet Mode" },
];

LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, 'Raydium AMM - Create');

export default LiquidityHandlerRaydium;