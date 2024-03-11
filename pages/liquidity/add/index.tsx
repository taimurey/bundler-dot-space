'use client';

import React, { ChangeEvent, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
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
import { InputField } from '../../../components/FieldComponents/InputField';
import { OutputField } from '../../../components/FieldComponents/OutputField';
import { useSolana } from '../../../context';
import axios from 'axios';

const ZERO = new BN(0)
type BN = typeof ZERO


export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [buyerKeypair, setBuyerKeypair] = useState("");
    const [airdropChecked, setAirdropChecked] = useState(false);
    const [predictedMarketCap, setPredictedMarketcap] = useState("$NaN")
    const [predictedSupplyAmount, setPredictedSupplyAmount] = useState("NaN%")
    const [wallets, setWallets] = useState({
        Wallet1: "N/A",
        Wallet2: "N/A",
    });



    const [formData, setFormData] = useState({
        buyerPrivateKey: '',
        deployerPrivateKey: '',
        airdropChecked: airdropChecked,
        walletsNumbers: '',
        tokenMintAddress: '',
        tokenMarketID: '',
        tokenDecimals: '',
        totalSupply: '',
        poolstarttimer: '',
        tokenbuyAmount: '',
        tokenLiquidityAmount: '',
        tokenLiquidityAddPercent: '',
    });

    React.useEffect(() => {
        setFormData(prevState => ({
            ...prevState,
            airdropChecked: airdropChecked,
        }));
    }, [airdropChecked]);

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
            let wallet = (Keypair.fromSecretKey(base58.decode(value)));
            setWallets(prevState => ({
                ...prevState,
                Wallet2: wallet.publicKey.toString(),
            }));

            setFormData(prevState => ({
                ...prevState,
                deployerPrivateKey: wallet.publicKey.toString(),
            }));
        }
    };



    const generateKeypair = (e: any) => {
        e.preventDefault();
        const keypair = Keypair.generate();
        const secretKey = base58.encode(keypair.secretKey).toString();
        setBuyerKeypair(secretKey);
        setFormData(prevState => ({
            ...prevState,
            buyerPrivateKey: keypair.publicKey.toString(),
        }));
        setWallets({
            Wallet1: `${keypair.publicKey.toString()}`,
            Wallet2: wallets.Wallet2,
        });
    }


    const handleloadMintmetadata = async (e: any) => {
        e.preventDefault();
        let MintMetadata = await new Metaplex(connection).nfts().findByMint({ mintAddress: (new PublicKey(formData.tokenMintAddress)) });

        let decimals = MintMetadata.mint.decimals;
        let supply = MintMetadata.mint.supply.basisPoints;
        console.log(MintMetadata, "mint metadata")
        console.log(decimals, "decimals")
        console.log(supply, "supply")

        setFormData(prevState => ({
            ...prevState,
            tokenDecimals: decimals.toString(),
            totalSupply: supply.toString(10),
        }));
    }

    const copytoClipboard = (e: any) => {
        let keypair = Keypair.fromSecretKey(base58.decode(buyerKeypair));
        navigator.clipboard.writeText(base58.encode(keypair.secretKey));
    }



    const handlesubmission = async (e: any) => {
        e.preventDefault();
        console.log(formData, "simple form data")
        console.log(JSON.stringify(formData), "JSON stringified form data")

        const response = await axios.post('http://localhost:3001/jitoadd', formData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }


    return (
        <div className="space-y-4 mb-8 mx-auto flex mt-8 justify-center items-center">
            <form>
                <div className="space-y-4">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>Deploy</p>
                                    <p className=' text-[12px] text-[#96989c] '>Create a liquidity pool and set buy amounts for your token.</p>
                                </div>
                                <div className='w-full'>
                                    <label className="block mt-5 text-base  text-white font-semibold" htmlFor="buyerPrivateKey">
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
                                />
                                }
                                <div className='flex flex-col gap-2' id="tokeninfo">
                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="tokenMintAddress"
                                            label="Token Info"
                                            value={formData.tokenMintAddress}
                                            onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                            placeholder="Enter token mint Address"
                                            type="text"
                                        />
                                        <button
                                            className="invoke-btn w-2/3"
                                            onClick={handleloadMintmetadata}

                                        >
                                            Load Mint
                                        </button>
                                    </div>
                                    <InputField
                                        label=""
                                        id="tokenMarketID"
                                        value={formData.tokenMarketID}
                                        onChange={(e) => handleChange(e, 'tokenMarketID')}
                                        placeholder="Enter Market ID"
                                        type="text"
                                    />

                                    <div className='flex justify-center items-center gap-2'>

                                        <InputField
                                            label=""
                                            id="tokenDecimals"
                                            value={formData.tokenDecimals}
                                            onChange={(e) => handleChange(e, 'tokenDecimals')}
                                            placeholder="Enter decimals"
                                            type="number"
                                        />
                                        <InputField
                                            label=''
                                            id="poolstarttimer"
                                            value={formData.poolstarttimer}
                                            onChange={(e) => handleChange(e, 'poolstarttimer')}
                                            placeholder="Enter start timer(secs)"
                                            type="number"
                                        />
                                        <InputField
                                            label=""
                                            id="totalSupply"
                                            value={formData.totalSupply}
                                            onChange={(e) => handleChange(e, 'totalSupply')}
                                            placeholder="Enter total supply"
                                            type="number"
                                        />

                                    </div>
                                    <InputField
                                        id="tokenbuyAmount"
                                        label="Buy Amounts (SOL)"
                                        value={formData.tokenbuyAmount}
                                        onChange={(e) => handleChange(e, 'tokenbuyAmount')}
                                        placeholder="First Buy Amount"
                                        type="number"
                                    />

                                    <div className='flex justify-end items-end gap-2'>
                                        <InputField
                                            id="tokenLiquidityAmount"
                                            label="Liquidity Amount (SOL)"
                                            value={formData.tokenLiquidityAmount}
                                            onChange={(e) => handleChange(e, 'tokenLiquidityAmount')}
                                            placeholder="Enter Liquidity Amount"
                                            type="number"
                                        />
                                        <InputField
                                            id="tokenLiquidityAddPercent"
                                            value={formData.tokenLiquidityAddPercent}
                                            onChange={(e) => handleChange(e, 'tokenLiquidityAddPercent')}
                                            placeholder="Enter % of tokens to add to liquidity"
                                            type="number"
                                            label="Amount Percentage"
                                        />
                                    </div>
                                    <button
                                        onClick={handlesubmission}
                                        className='invoke-btn w-full'
                                    >
                                        Initiate Deployment Sequence

                                    </button>
                                </div>
                            </div>
                            <div className="p-4 bg-[#0c0e11] border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
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
                                        <div className="relative  rounded-md shadow-sm w-full flex flex-col justify-end">
                                            {Object.entries(wallets).map(([key, value]) => (
                                                <p

                                                    className="block w-full  rounded-md text-base   text-[#96989c] bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px]"
                                                >
                                                    {key}: {value}
                                                </p>
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
            </form>
        </div>
    );
}



LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "Raydium Liquidity Remover");

export default LiquidityHandlerRaydium;