'use client';

import React, { ChangeEvent, useState, ReactNode } from 'react';
import { BN } from 'bn.js';
import { Metaplex } from "@metaplex-foundation/js";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { OutputField } from '@/components/OutputField';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { toast } from "sonner";
import { BundleToast, TransactionToast } from '@/components/bundler-toasts';
import { WalletProfileContext } from '@/components/SolanaWallet/wallet-context';
import { truncate } from '@/components/sidebar-drawer';
import { BalanceType } from '@/components/types/solana-types';
import { getKeypairFromBs58 } from '@/components/instructions/pump-bundler/misc';
import WalletsDrawer from '@/components/sidebar-drawer';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { randomColor } from '@/components/utils/random-color';
import { getHeaderLayout } from '@/components/header-layout';

const ZERO = new BN(0)
type BN = typeof ZERO

const CPMMPoolCreator = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [Mode, setMode] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<{
        buyerPrivateKey: string;
        buyerextraWallets: string[];
        deployerPrivateKey: string;
        walletsNumbers: string;
        tokenMintAddress: string;
        tokenDecimals: string;
        totalSupply: string;
        tokenbuyAmount: string;
        tokenLiquidityAmount: string;
        tokenLiquidityAddPercent: string;
        curveType: string;
        initialPrice: string;
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
            tokenDecimals: '',
            totalSupply: '',
            tokenbuyAmount: '',
            tokenLiquidityAmount: '',
            tokenLiquidityAddPercent: '',
            curveType: 'ConstantProduct',
            initialPrice: '0.01',
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
                wallet: base58.encode(wallet.secretKey),
                color: randomColor(),
            }]);
            setFormData(prevState => ({
                ...prevState,
                deployerPrivateKey: value,
            }));
        }

        if (field === 'buyerPrivateKey') {
            try {
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
            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }
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
            try {
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
            } catch (error) {
                toast.error('Error fetching token metadata');
                console.error(error);
            }
        };
        fetchData();
    }, [formData.tokenMintAddress]);

    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: BalanceType[] = [];

            if (formData.deployerPrivateKey) {
                try {
                    const deployerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.deployerPrivateKey)));
                    const balance = parseFloat((await connection.getBalance(deployerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                    allBalances.push({ balance, publicKey: deployerWallet.publicKey.toString() });
                } catch (error) {
                    console.error('Error fetching deployer wallet balance:', error);
                }
            }

            if (formData.buyerPrivateKey) {
                try {
                    const buyerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.buyerPrivateKey)));
                    const balance = parseFloat((await connection.getBalance(buyerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                    allBalances.push({ balance, publicKey: buyerWallet.publicKey.toString() });
                } catch (error) {
                    console.error('Error fetching buyer wallet balance:', error);
                }
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
    }, [wallets, formData.deployerPrivateKey, formData.buyerPrivateKey, connection]);

    const handlesubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Validate required fields
        if (
            !formData.deployerPrivateKey ||
            !formData.tokenMintAddress ||
            !formData.tokenDecimals ||
            !formData.totalSupply ||
            !formData.tokenLiquidityAmount ||
            !formData.tokenLiquidityAddPercent ||
            !formData.BlockEngineSelection ||
            !formData.BundleTip ||
            !formData.TransactionTip
        ) {
            toast.error('Please fill all required fields');
            setIsLoading(false);
            return;
        }

        // More validation and logic would go here in the future implementation

        toast.info('This is a UI preview only. Transaction building logic will be implemented later.');
        setIsLoading(false);
    };

    const { setDeployerWallets } = WalletProfileContext();

    return (
        <div className="mb-8 mx-8 flex mt-8 justify-center items-center relative">
            <form>
                <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                    <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                        <div>
                            <p className='font-bold text-[25px]'>
                                Raydium CPMM Bundler
                                <span className='text-[#ff3535] text-[12px] ml-6 font-bold'>(Concentrated Pools)</span>
                            </p>
                            <p className='text-[12px] text-[#96989c]'>Create a concentrated liquidity pool and set buy amounts for your token.</p>
                        </div>
                        <div className='w-full'>
                            <label className="block mt-5 text-base text-white font-semibold">
                                Bundler Mode
                                <span className="pl-5 text-[#FFC107] text-[12px] font-normal">
                                    5 wallet mode is now available
                                </span>
                            </label>
                            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                <select
                                    id="BundlerMode"
                                    value={Mode}
                                    onChange={(e) => setMode(Number(e.target.value))}
                                    required={true}
                                    className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                >
                                    <option value="" disabled>
                                        Bundler Mode
                                    </option>
                                    {modeOptions.map((option, index) => (
                                        <option key={index} value={option.value}>
                                            {option.value} {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-5">
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
                                    <div className='w-full'>
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
                                    </div>
                                )}
                                <div className="relative rounded-md shadow-sm w-full flex flex-col gap-2 justify-end">
                                    {Mode === 5 && (
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
                        </div>
                        <div className='flex flex-col gap-2' id="tokeninfo">
                            <div className='flex justify-center items-center gap-2'>
                                <InputField
                                    id="tokenMintAddress"
                                    label="Mint"
                                    subfield='token address'
                                    value={formData.tokenMintAddress}
                                    onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                    placeholder="Enter Mint Address"
                                    type="text"
                                    required={true}
                                />
                            </div>

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

                            <div className='flex justify-center items-center gap-2'>
                                <div className='w-full'>
                                    <label className="block text-base text-white font-semibold">
                                        Curve Type
                                    </label>
                                    <div className="relative mt-1 rounded-md shadow-sm w-full">
                                        <select
                                            id="curveType"
                                            value={formData.curveType}
                                            onChange={(e) => handleSelectionChange(e, 'curveType')}
                                            required={true}
                                            className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                        >
                                            <option value="ConstantProduct">Constant Product</option>
                                            <option value="Stable">Stable</option>
                                            <option value="ConstantPrice">Constant Price</option>
                                        </select>
                                    </div>
                                </div>
                                <InputField
                                    label="Initial Price"
                                    subfield='SOL'
                                    id="initialPrice"
                                    value={formData.initialPrice}
                                    onChange={(e) => handleChange(e, 'initialPrice')}
                                    placeholder="Enter initial price"
                                    type="number"
                                    required={true}
                                />
                            </div>

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

                            <div className='flex justify-end items-end gap-2'>
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
                                    label="Amount Percentage"
                                    required={true}
                                />
                            </div>
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
                                            className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                        >
                                            <option value="" disabled>
                                                Block Engine Location (Closest to you)
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
                            <button
                                onClick={handlesubmission}
                                className='invoke-btn w-full'
                                type='button'
                                disabled={isLoading}
                            >
                                <span className='btn-text-gradient'>
                                    {isLoading ? 'Processing...' : 'Initiate Deployment Sequence'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="min-w-[44px] p-4 bg-[#0c0e11] border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
                        <div>
                            <div>
                                <p className='font-bold text-[25px]'>Predicted Parameters</p>
                                <p className='text-[12px] text-[#96989c]'>Here are the predicted parameters based on your input.</p>
                            </div>
                            <div className='w-full'>
                                <label className="block mt-5 text-base text-white font-semibold">
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
                                                <span className='text-[#96989c] text-[15px] font-normal'>{index + 1}: </span>
                                                {truncate(publicKey, 6, 7)!}
                                                <br />
                                                <span className='text-[#96989c] text-[14px] font-normal ml-2'>Balance: {balance}</span>
                                                <br />
                                            </p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                            <OutputField
                                id="totalmintaddress"
                                label="Mint Address:"
                                value={formData.tokenMintAddress}
                                latedisplay={true}
                            />
                            <OutputField
                                id="curveType"
                                label="Curve Type:"
                                value={formData.curveType}
                                latedisplay={true}
                            />
                            <OutputField
                                id="initialPrice"
                                label="Initial Price:"
                                value={`${formData.initialPrice && formData.initialPrice !== '0' ? `${formData.initialPrice} SOL` : formData.initialPrice}`}
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
            </form>
            <div className='absolute -top-[70px] right-0 h-screen'>
                <WalletsDrawer />
            </div>
        </div>
    );
};

const modeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 5, label: "Wallet Mode" },
];

CPMMPoolCreator.getLayout = (page: ReactNode) => getHeaderLayout(page, "Raydium CPMM Pool Creator");

export default CPMMPoolCreator;
