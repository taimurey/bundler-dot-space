'use client';

import React, { ChangeEvent, useState } from 'react';
// import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { Metaplex } from "@metaplex-foundation/js";
import { getHeaderLayout } from '../../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { BlockEngineLocation, InputField } from '../../../components/FieldComponents/InputField';
import { OutputField } from '../../../components/FieldComponents/OutputField';
import { useSolana } from '../../../components/context';
import axios from 'axios';
import { toast } from 'react-toastify';
// import * as fs from 'fs';
// import encryptWithPublicKey from '../../../components/Encryptor/encryption';
import https from 'https';
// const agent = new https.Agent({
//     rejectUnauthorized: false
// });
const ZERO = new BN(0)
type BN = typeof ZERO

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [buyerKeypair, setBuyerKeypair] = useState("");
    const [airdropChecked, setAirdropChecked] = useState(false);
    // const [encryptedBuyerKeypair, setEncryptedBuyerKeypair] = useState("");
    // const [encrypteddeployerKeypair, encryptedsetDeployerKeypair] = useState("");
    // const [predictedMarketCap, setPredictedMarketcap] = useState("$NaN")
    // const [predictedSupplyAmount, setPredictedSupplyAmount] = useState("NaN%")
    const [wallets, setWallets] = useState({
        Wallet1: "",
        Wallet2: "",
    });

    const [formData, setFormData] = useState({
        buyerPrivateKey: '',
        deployerPrivateKey: '',
        airdropChecked: airdropChecked,
        walletsNumbers: '0',
        tokenMintAddress: '',
        tokenMarketID: '',
        tokenDecimals: '',
        totalSupply: '',
        tokenbuyAmount: '',
        tokenLiquidityAmount: '',
        tokenLiquidityAddPercent: '',
        BlockEngineSelection: '',
        BundleTip: '',
        TransactionTip: '',
    });

    React.useEffect(() => {
        setFormData(prevState => ({
            ...prevState,
            airdropChecked: airdropChecked,
        }));
    }, [airdropChecked]);

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

        //handle airdropChecked
        if (field === 'airdropChecked') {
            setAirdropChecked(airdropChecked);
        }

        if (field === 'deployerPrivateKey') {
            const wallet = (Keypair.fromSecretKey(base58.decode(value)));
            setWallets(prevState => ({
                ...prevState,
                Wallet2: wallet.publicKey.toString(),
            }));

            // if (!process.env.NEXT_PUBLIC_KEY_RSA) {
            //     throw new Error('No public key found');
            // }
            //  const encrypted = encryptWithPublicKey(process.env.NEXT_PUBLIC_KEY_RSA, PrivateKey);
            setFormData(prevState => ({
                ...prevState,
                deployerPrivateKey: value,
            }));
        }

        if (field === 'buyerPrivateKey') {
            const wallet = (Keypair.fromSecretKey(base58.decode(value)));
            setWallets(prevState => ({
                ...prevState,
                Wallet1: wallet.publicKey.toString(),
            }));
        }
    };



    const generateKeypair = (e: any) => {
        e.preventDefault();
        const keypair = Keypair.generate();
        const PrivateKey = base58.encode(keypair.secretKey).toString();
        setBuyerKeypair(PrivateKey);
        setFormData(prevState => ({
            ...prevState,
            buyerPrivateKey: PrivateKey,
        }));
        setWallets({
            Wallet1: `${keypair.publicKey.toString()}`,
            Wallet2: wallets.Wallet2,
        });
    }


    const handleloadMintmetadata = async (e: any) => {
        e.preventDefault();
        if (!formData.tokenMintAddress) {
            toast.error('No mint address provided');
            return;
        }
        const MintMetadata = await new Metaplex(connection).nfts().findByMint({ mintAddress: (new PublicKey(formData.tokenMintAddress)) });

        const decimals = MintMetadata.mint.decimals;
        const supply = MintMetadata.mint.supply.basisPoints;
        console.log(MintMetadata, "mint metadata")
        console.log(decimals, "decimals")
        console.log(supply, "supply")

        setFormData(prevState => ({
            ...prevState,
            tokenDecimals: decimals.toString(),
            totalSupply: supply.toString(10),
        }));
    }

    const copytoClipboard = () => {
        if (!buyerKeypair) {
            toast.error('No keypair to copy');
            return;
        }
        const keypair = Keypair.fromSecretKey(base58.decode(buyerKeypair));
        navigator.clipboard.writeText(base58.encode(keypair.secretKey));
    }




    const handlesubmission = async (e: any) => {
        e.preventDefault();
        console.log('Form data:', formData);

        try {
            // Load the self-signed certificate
            const response = await axios.post(
                'https://mevarik-deployer.xyz:2891/jitoadd',
                formData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    // Disable hostname verification and provide the self-signed certificate
                    // httpsAgent: new https.Agent({
                    //     rejectUnauthorized: false,
                    // }),
                }
            );

            console.log('Data submitted successfully');
            console.log('Response:', response.data);
        } catch (error) {
            console.log('Error:', error);
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 500) {
                    toast.error('Error occurred, Make sure the details are correct');
                } else {
                    toast.error('Error occurred: Please Fill in all the fields');
                }
            } else {
                toast.error('An unknown error occurred');
            }
        }
    };

    return (
        <div className=" mb-8 mx-auto flex mt-8 justify-center items-center">
            <form>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>Deploy</p>
                                    <p className=' text-[12px] text-[#96989c] '>Create a liquidity pool and set buy amounts for your token.</p>
                                </div>
                                <div className='w-full'>
                                    <label className="block mt-5 text-base text-white font-semibold" htmlFor="buyerPrivateKey">
                                        Buyer Private key
                                    </label>
                                    <div className="relative mt-1 rounded-md shadow-sm w-full flex gap-2">
                                        <input
                                            id="buyerPrivateKey"
                                            type="password"
                                            value={formData.buyerPrivateKey}
                                            onChange={(e) => handleChange(e, 'buyerPrivateKey')}
                                            className="block w-full p-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px]"
                                            placeholder="Enter your private key"
                                        />
                                        <button
                                            type='button'
                                            className='bg-white text-#171717  h-40px rounded-md px-3 flex justify-center items-center text-15px'
                                            onClick={generateKeypair}
                                        >
                                            Gen
                                        </button>
                                        <button
                                            type='button'
                                            className='bg-white text-#171717 h-40px rounded-md px-3 flex justify-center items-center text-15px'
                                            onClick={copytoClipboard}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                <InputField
                                    id="deployerPrivatekey"
                                    label="Deployer Private Key"
                                    value={formData.deployerPrivateKey}
                                    onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                    placeholder="Enter deployer private key"
                                    type="password"
                                    required={true}
                                />
                                <div>
                                    <input type="checkbox" id="airdropCheck" checked={airdropChecked} onChange={() => setAirdropChecked(!airdropChecked)} />
                                    <label htmlFor="airdropCheck"> Generate and airdrop wallets</label>
                                </div>
                                {airdropChecked && <InputField
                                    id="walletsNumbers"
                                    label="# of Wallets"
                                    value={formData.walletsNumbers}
                                    onChange={(e) => handleChange(e, 'walletsNumbers')}
                                    placeholder="Enter the # of Wallets"
                                    type="number"
                                    required={true}
                                />
                                }
                                <div className='flex flex-col gap-2' id="tokeninfo">
                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="tokenMintAddress"
                                            label="Mint Info"
                                            value={formData.tokenMintAddress}
                                            onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                            placeholder="Enter Mint Address"
                                            type="text"
                                            required={true}
                                        />
                                        <button
                                            className="invoke-btn w-2/3"
                                            onClick={handleloadMintmetadata}

                                        >
                                            <span className='btn-text-gradient'> Load Mint</span>
                                        </button>
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
                                        { /*    <InputField
                                            label=''
                                            id="poolstarttimer"
                                            value={formData.poolstarttimer}
                                            onChange={(e) => handleChange(e, 'poolstarttimer')}
                                            placeholder="Enter start timer(secs)"
                                            type="number"
                                            required={true}
                                        /> */}
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
                                    <InputField
                                        id="tokenbuyAmount"
                                        label="Buy Amounts (SOL)"
                                        value={formData.tokenbuyAmount}
                                        onChange={(e) => handleChange(e, 'tokenbuyAmount')}
                                        placeholder="First Buy Amount"
                                        type="number"
                                        required={true}
                                    />

                                    <div className='flex justify-end items-end gap-2'>
                                        <InputField
                                            id="tokenLiquidityAmount"
                                            label="Liquidity Amount (SOL)"
                                            value={formData.tokenLiquidityAmount}
                                            onChange={(e) => handleChange(e, 'tokenLiquidityAmount')}
                                            placeholder="Enter Liquidity Amount"
                                            type="number"
                                            required={true}
                                        />
                                        <InputField
                                            id="tokenLiquidityAddPercent"
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
                                                "Block Engine"
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
                                    {/* <OutputField
                                        id="predictedMarketCap"
                                        label="Predicted Market Cap:"
                                        value={predictedMarketCap}
                                        latedisplay={false}
                                    /> */}
                                    {/* <OutputField
                                        id="deployerPrivatekey"
                                        label="Predicted Supply Amount:"
                                        value={predictedSupplyAmount}
                                        latedisplay={false}

                                    /> */}

                                    <div className='w-full '>
                                        <label className="block mt-5 text-base text-white font-semibold" >
                                            Wallets:
                                        </label>
                                        <br />
                                        <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end">
                                            {Object.entries(wallets).map(([key, value], index) => {
                                                const truncatedValue = value.length > 10
                                                    ? value.slice(0, 6) + '...' + value.slice(-10)
                                                    : value;
                                                return (
                                                    <p
                                                        key={index}
                                                        className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px] max-w-[300px]"
                                                    >
                                                        {key}: <span className="bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold">{truncatedValue}</span>
                                                    </p>
                                                );
                                            })}
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
            </form>
        </div>
    );
}



LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "Manage Liquidity");

export default LiquidityHandlerRaydium;