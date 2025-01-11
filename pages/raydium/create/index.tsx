'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { Metaplex } from "@metaplex-foundation/js";
import { getHeaderLayout } from '../../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { BlockEngineLocation, InputField } from '../../../components/FieldComponents/InputField';
import { OutputField } from '../../../components/FieldComponents/OutputField';
import { useSolana } from '../../../components/context';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BundleToast, TransactionToast } from '../../../components/common/Toasts/TransactionToast';
import { useMyContext } from '../../../contexts/Maincontext';
import { truncate } from '../../../components/common/SideBarDrawer';
import { CreatePoolSwap } from '../../../components/RaydiumBundler/AmmPool';
import Papa from 'papaparse';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { BalanceType } from '../../volumebot';
import { getKeypairFromBs58 } from '../../../components/PumpBundler/misc';
import WalletsDrawer from '../../../components/common/SideBarDrawer';

const ZERO = new BN(0)
type BN = typeof ZERO

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [wallets, setWallets] = useState<string[]>([]);
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [Mode, setMode] = useState(1);

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
    // const handleloadMintmetadata = async (e: any) => {
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

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) {
            toast.error('No file selected');
            return;
        }
        const file = event.target.files[0];

        Papa.parse<string[]>(file, {
            complete: function (results) {
                //skip the first row
                const wallets = results.data.slice(1).map(row => row[1]);

                const walletset: string[] = [];
                wallets.forEach((element: string) => {
                    if (element === '' || element === 'wallet' || element === undefined) {
                        return;
                    }
                    try {
                        Keypair.fromSecretKey(new Uint8Array(bs58.decode(element)));
                        walletset.push(element);
                    } catch (err) {
                        toast.error(`Invalid wallet address: ${element}`);
                    }
                });
                if (walletset.length > 0) {
                    toast.success('Wallets Loaded Successfully')
                    setWallets(walletset);
                    setFormData(prevState => ({
                        ...prevState,
                        Wallets: walletset,
                    }));
                }
            },
            error: function (err) {
                toast.error(`An error occurred while parsing the file: ${err.message}`);
            }
        });
    }

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
                Object.entries(wallets).map(async ([key, value]) => {
                    try {
                        console.log('value:', key);
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(value)));
                        const balance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                        return { balance, publicKey: keypair.publicKey.toString() };

                    }
                    catch (error) {
                        toast.error(`Error fetching balance: ${error}`);
                        return { balance: 0, publicKey: 'Invalid' };
                    }
                })
            );

            setFormData(prevState => ({
                ...prevState,
                buyerextraWallets: wallets,
            }));

            allBalances = [...allBalances, ...balances];
            setBalances(allBalances);
        };

        fetchBalances();
    }, [wallets, formData.deployerPrivateKey, formData.buyerPrivateKey]);

    const DownloadSample = () => {
        const file = ("/sample_wallets.csv")
        const link = document.createElement('a');
        link.href = file;
        link.download = 'sample_wallets.csv';
        link.click();

    }

    const handlesubmission = async (e: any) => {
        e.preventDefault();
        if (!formData.deployerPrivateKey || !formData.tokenMintAddress || !formData.tokenMarketID || !formData.tokenDecimals || !formData.totalSupply || !formData.tokenLiquidityAmount || !formData.tokenLiquidityAddPercent || !formData.BlockEngineSelection || !formData.BundleTip || !formData.TransactionTip) {
            toast.error('Please fill all required fields');
            return;
        }
        setDeployerWallets([])
        localStorage.removeItem("deployerwallets")

        const deployerwallet = getKeypairFromBs58(formData.deployerPrivateKey)!;
        const buyerwallet = getKeypairFromBs58(formData.buyerPrivateKey)!;

        const deployerBalance = parseFloat((await connection.getBalance(deployerwallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
        console.log(deployerBalance, "deployer balance")
        const buyerBalance = parseFloat((await connection.getBalance(buyerwallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
        console.log(buyerBalance, "buyer balance")

        if (deployerBalance < (Number(formData.tokenLiquidityAmount) + 0.4 + 0.25)) {
            toast.error('Deployer wallet has insufficient balance');
            return;
        }

        if (buyerBalance < Number(formData.tokenbuyAmount)) {
            toast.error('Buyer wallet has insufficient balance');
            return;
        }



        let bundler = '';
        let ammID = '';
        try {
            setDeployerWallets(setsideWallets)
            localStorage.setItem("deployerwallets", JSON.stringify(setsideWallets))
            toast.info('Please wait, bundle acceptance may take a few seconds');
            let Allwallets: string[];
            if (Mode === 5) {
                Allwallets = wallets;
            } else {
                Allwallets = [formData.buyerPrivateKey, ...wallets];
            }
            const result = await CreatePoolSwap(connection, formData, Allwallets);
            if (result) {
                bundler = result.result;
                ammID = result.ammID.toString();
            }

            toast(
                () => (
                    <BundleToast
                        txSig={bundler}
                        message={'Bundle ID:'}
                    />
                ),
                { autoClose: 5000 }
            );
            toast(
                () => (
                    <TransactionToast
                        txSig={ammID}
                        message={'Mint:'}
                    />
                ),
                { autoClose: 5000 }
            );
        } catch (error) {
            console.log('Error:', error);
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 500) {
                    toast.error(`${error.response.data}`);
                } else {
                    toast.error('Unknown error occurred');
                }
            } else if (error instanceof Error) {
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

    const { setDeployerWallets } = useMyContext();

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative" >
            <form>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>
                                        Raydium AMM Bundler
                                        <span className='text-[#ff3535] text-[12px] ml-6 font-bold'>(Report Any Errors in the Discord)</span>
                                    </p>
                                    <p className=' text-[12px] text-[#96989c] '>Create a liquidity pool and set buy amounts for your token.</p>
                                </div>
                                <div className='w-full'>
                                    <label className="block mt-5 text-base text-white font-semibold" >
                                        Bundler Mode
                                        <span className="pl-5 text-[#FFC107] text-[12px] font-normal">
                                            5 wallet mode is now available
                                        </span>
                                    </label>
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
                                            </div>)}
                                        <div className="relative rounded-md shadow-sm w-full flex gap-2 justify-end">
                                            {Mode === 5 && (
                                                <div>
                                                    <InputField
                                                        id='walletsNumbers'
                                                        placeholder='27'
                                                        label='Upload Wallets'
                                                        subfield='csv file - Max 4'
                                                        required={true}
                                                        type="file"
                                                        onChange={handleFileUpload}
                                                    />
                                                </div>
                                            )}
                                            {Mode === 5 && (
                                                <button
                                                    className='bundler-btn border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                                                    onClick={() => DownloadSample()}>
                                                    Download Sample
                                                </button>
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
                                    <InputField
                                        label=""
                                        id="tokenMarketID"
                                        value={formData.tokenMarketID}
                                        onChange={(e) => handleChange(e, 'tokenMarketID')}
                                        placeholder="Enter Market ID"
                                        type="text"
                                        required={true}
                                    />

                                    <div className='flex justify-center items-center gap-2'>

                                        <InputField
                                            label=""
                                            id="tokenDecimals"
                                            value={formData.tokenDecimals}
                                            onChange={(e) => handleChange(e, 'tokenDecimals')}
                                            placeholder="Enter decimals"
                                            type="number"
                                            required={true}
                                        />
                                        <InputField
                                            label=""
                                            id="totalSupply"
                                            value={formData.totalSupply}
                                            onChange={(e) => handleChange(e, 'totalSupply')}
                                            placeholder="Enter total supply"
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
                                    <button
                                        onClick={handlesubmission}
                                        className='invoke-btn w-full'
                                        type='button'
                                    >
                                        <span className='btn-text-gradient'>Initiate Deployment Sequence</span>

                                    </button>

                                </div>
                            </div>
                            <div className="min-w-[44px] p-4 bg-[#0c0e11] border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
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
                                        id="MarketId"
                                        label="Market ID"
                                        value={formData.tokenMarketID}
                                        latedisplay={true}

                                    />
                                    <OutputField
                                        id="buyamount"
                                        label="Buy Amount"
                                        value={`${formData.tokenbuyAmount && formData.tokenbuyAmount !== '0' ? `${formData.tokenbuyAmount} sol` : formData.tokenbuyAmount}`}
                                        latedisplay={true}

                                    />
                                    <OutputField
                                        id="liquidityamount"
                                        label="Liquidity Amount"
                                        value={`${formData.tokenLiquidityAmount && formData.tokenLiquidityAmount !== '0' ? `${formData.tokenLiquidityAmount} sol` : formData.tokenLiquidityAmount}`}
                                        latedisplay={true}
                                    />
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
    { value: 5, label: "Wallet Mode" },
];


export const randomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}


LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "Raydium AMM");

export default LiquidityHandlerRaydium;