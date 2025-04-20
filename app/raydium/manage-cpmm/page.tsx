'use client';
import { ChangeEvent, useState, useEffect, ReactNode } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getHeaderLayout } from '@/components/header-layout';
import {
    ApiPoolInfoV4,
    CacheLTA,
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys,
    Token,
    TOKEN_PROGRAM_ID,
    TokenAccount,
    TokenAmount,
    Percent
} from '@raydium-io/raydium-sdk';
import { LAMPORTS_PER_SOL, VersionedTransaction, PublicKey, RpcResponseAndContext, GetProgramAccountsResponse, SystemProgram, Keypair, TransactionMessage } from '@solana/web3.js';
import { formatAmmKeysById } from '@/components/instructions/removeLiquidity/formatAmmKeysById';
import { getWalletTokenAccount } from '@/components/instructions/removeLiquidity/util';
import { addLookupTableInfo, makeTxVersion } from '@/components/instructions/removeLiquidity/config';
import { buildSimpleTransaction } from '@raydium-io/raydium-sdk';
import { toast } from "sonner";
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { BundleToast } from '@/components/bundler-toasts';
import base58 from 'bs58';
import { ApibundleSend } from '@/components/instructions/DistributeTokens/bundler';
import { WalletProfileContext } from '@/components/SolanaWallet/wallet-context';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import assert from 'assert';

const CPMMManager = () => {
    const { connection } = useConnection();
    const [poolID, setPoolID] = useState("");
    const [microLamportsInput, setMicroLamportsInput] = useState("");
    const { publicKey, sendTransaction, wallet, connected } = useWallet();
    const [targetPoolInfo, setTargetPoolInfo] = useState<ApiPoolInfoV4 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggle, setIsToggle] = useState(false);
    const [activeTab, setActiveTab] = useState<'Liquidity' | 'Sell'>('Liquidity');
    const [wallets, setWallets] = useState<WalletEntry[]>([]);

    // Sell tab state
    const [sellFormData, setSellFormData] = useState({
        tokenAddress: '',
        sellPercentage: '90',
        slippagePercentage: '1',
        priorityFee: '0.001',
        BlockEngineSelection: BlockEngineLocation[2],
        BundleTip: "0.01",
        TransactionTip: "0.00001",
    });
    const [sellModeToggle, setSellModeToggle] = useState(false);
    const [sellBalances, setSellBalances] = useState<Array<{
        balance: number,
        publicKey: string,
        tokenAmount: string
    }>>([]);

    const handleMicroLamportsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMicroLamportsInput(event.target.value);
    };

    const handlePoolIDChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPoolID(event.target.value);
    };

    useEffect(() => {
        const fetchPoolInfo = async () => {
            setIsLoading(true);
            if (!poolID) {
                setIsLoading(false);
                return;
            }
            const info = await formatAmmKeysById(poolID);

            const deployerPrivateKey = localStorage.getItem('deployerwallets');

            const parsedDeployerPrivateKey = deployerPrivateKey ? JSON.parse(deployerPrivateKey) : null;

            const deployerWallet = parsedDeployerPrivateKey ? parsedDeployerPrivateKey.find((wallet: { name: string, wallet: string }) => wallet.name === 'Deployer') : null;

            setFormData(prevState => ({
                ...prevState,
                PoolID: poolID,
                PoolKeys: JSON.stringify(info),
                DeployerPrivateKey: deployerWallet ? deployerWallet.wallet : '',
            }));
            if (info !== undefined) {
                setTargetPoolInfo(info);
            } else {
                setTargetPoolInfo(null);
            }
            setIsLoading(false);
        };

        fetchPoolInfo();

    }, [poolID]);

    const [formData, setFormData] = useState({
        BlockEngineSelection: BlockEngineLocation[2],
        BundleTip: "0.01",
        TransactionTip: "0.00001",
        DeployerPrivateKey: "",
        PoolID: "",
        PoolKeys: "",
    });

    const handleRemoveLiquidity = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!connected || !publicKey || !wallet) {
            toast.error('Wallet not connected');
            return;
        }

        toast.info('This is a UI preview only. Transaction building logic will be implemented later.');
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSellFormChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setSellFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSellSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setSellFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSellTokens = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!connected || !publicKey || !wallet) {
            toast.error('Wallet not connected');
            return;
        }

        toast.info('This is a UI preview only. Transaction building logic will be implemented later.');
    };

    // Add useEffect to fetch token balances when wallets or token address changes
    useEffect(() => {
        const fetchBalances = async () => {
            if (!sellFormData.tokenAddress || wallets.length === 0) {
                setSellBalances([]);
                return;
            }

            const allBalances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));

                        // Fetch SOL balance
                        const solBalance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));

                        // For demo purposes, just return mock token balance
                        const tokenBalance = '1000';

                        return {
                            balance: solBalance,
                            publicKey: keypair.publicKey.toString(),
                            tokenAmount: tokenBalance
                        };
                    } catch (error) {
                        console.error('Error processing wallet:', error);
                        return { balance: 0, publicKey: 'Invalid', tokenAmount: '0' };
                    }
                })
            );

            setSellBalances(allBalances);
        };

        fetchBalances();
    }, [wallets, sellFormData.tokenAddress, connection]);

    return (
        <div className="space-y-4 mb-8 mt-10 relative mx-auto h-full">
            <form>
                <div className="flex flex-col justify-center items-center mx-auto space-y-4">
                    <div className="space-y-4 w-1/2">
                        <div>
                            <h1 className="bg-gradient-to-r from-[#5be2a3] to-[#ff9a03] bg-clip-text text-left text-2xl font-semibold text-transparent">
                                Raydium CPMM Manager
                            </h1>
                        </div>

                        {/* Tab Buttons */}
                        <div className="flex space-x-2 mb-4 w-full">
                            <button
                                type="button"
                                className={`flex-1 px-6 py-3 text-base font-medium rounded-md transition-all duration-200 ${activeTab === 'Liquidity'
                                    ? 'bg-gradient-to-r from-[#5be2a3] to-[#ff9a03] text-black shadow-lg'
                                    : 'bg-[#0c0e11] text-white border border-neutral-600 hover:border-neutral-400'
                                    }`}
                                onClick={() => setActiveTab('Liquidity')}
                            >
                                Liquidity
                            </button>
                            <button
                                type="button"
                                className={`flex-1 px-6 py-3 text-base font-medium rounded-md transition-all duration-200 ${activeTab === 'Sell'
                                    ? 'bg-gradient-to-r from-[#e2c95b] to-[#03ff03] text-black shadow-lg'
                                    : 'bg-[#0c0e11] text-white border border-neutral-600 hover:border-neutral-400'
                                    }`}
                                onClick={() => setActiveTab('Sell')}
                            >
                                Sell
                            </button>
                        </div>

                        {/* Liquidity Tab */}
                        {activeTab === 'Liquidity' && (
                            <div className='border bg-[#0c0e11] bg-opacity-40 p-6 border-neutral-600 rounded-2xl shadow-[#000000] hover:shadow-2xl duration-300 ease-in-out'>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="toggle"
                                        name="toggle"
                                        checked={isToggle}
                                        onChange={() => setIsToggle(!isToggle)}
                                        className="form-checkbox h-5 w-5 text-[#ff0000] border-[#535353] duration-200 ease-in-out"
                                    />
                                    <label className="text-white font-normal" htmlFor="toggle">
                                        Use Jito Bundles
                                    </label>
                                </div>

                                {isToggle && (
                                    <div className="w-full mb-6">
                                        <label className="block mb-2 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                            Block Engine
                                        </label>
                                        <div className="relative rounded-md shadow-sm w-full">
                                            <select
                                                id="BlockEngineSelection"
                                                value={formData.BlockEngineSelection}
                                                onChange={(e) => handleSelectionChange(e, 'BlockEngineSelection')}
                                                required={true}
                                                className="block w-full px-4 py-2 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none focus:border-blue-500"
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
                                    </div>)}

                                <div className="grid grid-cols-1 gap-4 mb-6">
                                    <InputField
                                        label='Pool ID'
                                        id="poolID"
                                        type="text"
                                        value={poolID}
                                        onChange={handlePoolIDChange}
                                        placeholder="Enter Pool ID..."
                                        required={true}
                                    />

                                    {!isToggle && (
                                        <InputField
                                            label='Priority Fee (SOL)'
                                            id="microLamports"
                                            type="text"
                                            value={microLamportsInput}
                                            onChange={handleMicroLamportsInputChange}
                                            placeholder="Enter 0.001 etc..."
                                            required={true}
                                        />
                                    )}
                                </div>

                                <button
                                    onClick={handleRemoveLiquidity}
                                    disabled={isLoading}
                                    className="invoke-btn w-full font-bold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                >
                                    <span className='btn-text-gradient text-lg'>{isLoading ? 'Loading Pool...' : 'Remove Liquidity'}</span>
                                </button>
                            </div>
                        )}

                        {/* Sell Tab */}
                        {activeTab === 'Sell' && (
                            <div className='border bg-[#0c0e11] bg-opacity-40 p-6 border-neutral-600 rounded-2xl shadow-[#000000] hover:shadow-2xl duration-300 ease-in-out'>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="sellToggle"
                                        name="sellToggle"
                                        checked={sellModeToggle}
                                        onChange={() => setSellModeToggle(!sellModeToggle)}
                                        className="form-checkbox h-5 w-5 text-[#ff0000] border-[#535353] duration-200 ease-in-out"
                                    />
                                    <label className="text-white font-normal" htmlFor="sellToggle">
                                        Use Jito Bundles
                                    </label>
                                </div>

                                {sellModeToggle && (
                                    <div className="w-full mb-6">
                                        <label className="block mb-2 text-base text-white font-semibold" htmlFor="SellBlockEngineSelection">
                                            Block Engine
                                        </label>
                                        <div className="relative rounded-md shadow-sm w-full mb-4">
                                            <select
                                                id="SellBlockEngineSelection"
                                                value={sellFormData.BlockEngineSelection}
                                                onChange={(e) => handleSellSelectionChange(e, 'BlockEngineSelection')}
                                                required={true}
                                                className="block w-full px-4 py-2 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none focus:border-blue-500"
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

                                        <div className='grid grid-cols-2 gap-4 mb-4'>
                                            <InputField
                                                id="BundleTip"
                                                value={sellFormData.BundleTip}
                                                onChange={(e) => handleSellFormChange(e, 'BundleTip')}
                                                placeholder="0.01"
                                                type="number"
                                                label="Bundle Tip"
                                                required={true}
                                            />
                                            <InputField
                                                id="TransactionTip"
                                                value={sellFormData.TransactionTip}
                                                onChange={(e) => handleSellFormChange(e, 'TransactionTip')}
                                                placeholder="0.0001"
                                                type="number"
                                                label="Txn Tip (SOL)"
                                                required={true}
                                            />
                                        </div>

                                        <div className="border border-dashed border-white rounded-md shadow-lg p-4 items-start justify-center mb-6">
                                            <h3 className="btn-text-gradient font-bold text-[15px] mb-3">
                                                Add Wallets
                                            </h3>
                                            <WalletInput
                                                wallets={wallets}
                                                setWallets={setWallets}
                                                Mode={100}
                                                maxWallets={100}
                                                onChange={(walletData) => {
                                                    // No state updates required, wallets are already set in the component
                                                }}
                                                onWalletsUpdate={(walletData) => {
                                                    console.log('Updated wallet data:', walletData);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className='grid grid-cols-1 gap-4 mb-6' id="tokeninfo">
                                    <h3 className='btn-text-gradient font-bold text-[16px] mb-2'>Percentage Sell</h3>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <InputField
                                            id="tokenAddress"
                                            label="Pool ID / Token Mint"
                                            subfield='address'
                                            value={sellFormData.tokenAddress}
                                            onChange={(e) => handleSellFormChange(e, 'tokenAddress')}
                                            placeholder="Enter pool ID or token mint..."
                                            type="text"
                                            required={true}
                                        />
                                        <InputField
                                            label="Sell Percentage"
                                            subfield='%'
                                            id="sellPercentage"
                                            value={sellFormData.sellPercentage}
                                            onChange={(e) => handleSellFormChange(e, 'sellPercentage')}
                                            placeholder="90..."
                                            type="text"
                                            required={true}
                                        />
                                    </div>

                                    <div className='grid grid-cols-2 gap-4 mb-4'>
                                        <InputField
                                            label="Slippage"
                                            subfield='%'
                                            id="slippagePercentage"
                                            value={sellFormData.slippagePercentage}
                                            onChange={(e) => handleSellFormChange(e, 'slippagePercentage')}
                                            placeholder="1..."
                                            type="text"
                                            required={true}
                                        />

                                        {!sellModeToggle && (
                                            <InputField
                                                label="Priority Fee"
                                                subfield='SOL'
                                                id="priorityFee"
                                                value={sellFormData.priorityFee}
                                                onChange={(e) => handleSellFormChange(e, 'priorityFee')}
                                                placeholder="0.001"
                                                type="text"
                                                required={true}
                                            />
                                        )}
                                    </div>

                                    <button
                                        className="text-center invoke-btn w-full font-bold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                        type="button"
                                        onClick={handleSellTokens}
                                    >
                                        <span className="btn-text-gradient text-lg">
                                            Sell Tokens
                                            <span className="pl-3 text-[#FFC107] text-[12px] font-normal">
                                                (Sells % from {sellModeToggle ? 'all wallets' : 'connected wallet'})
                                            </span>
                                        </span>
                                    </button>
                                </div>

                                {/* Display wallet balances if in bundle mode */}
                                {sellModeToggle && sellBalances.length > 0 && (
                                    <div className='mt-4 border rounded-lg p-4 border-gray-600'>
                                        <h3 className='btn-text-gradient font-bold text-[16px] mb-2'>Wallet Balances</h3>
                                        <div className="max-h-60 overflow-y-auto">
                                            {sellBalances.map(({ balance, publicKey, tokenAmount }, index) => (
                                                <a
                                                    key={index}
                                                    href={`https://solscan.io/account/${publicKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base max-w-full bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[12px] select-text mb-2"
                                                    style={{ userSelect: 'text' }}
                                                >
                                                    <p>
                                                        <span className='text-[#96989c] text-[12px] font-normal'>{index + 1}: </span>
                                                        {publicKey.substring(0, 6)}...{publicKey.substring(publicKey.length - 7)}
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>SOL Balance: {balance}</span>
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>Token Balance: {tokenAmount}</span>
                                                    </p>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

CPMMManager.getLayout = (page: ReactNode) => getHeaderLayout(page, "Raydium CPMM Manager");

export default CPMMManager; 