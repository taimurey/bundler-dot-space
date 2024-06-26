'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { getHeaderLayout } from '../../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { Keypair } from '@solana/web3.js';
import base58 from 'bs58';
import { InputField } from '../../../components/FieldComponents/InputField';
import { useMyContext } from '../../../contexts/Maincontext';
import WalletsDrawer from '../../../components/common/Allprofiles';


const ZERO = new BN(0)
type BN = typeof ZERO

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const Swap = () => {
    const [airdropChecked, setAirdropChecked] = useState(false);
    const { activeWallet } = useMyContext();

    // const [encryptedBuyerKeypair, setEncryptedBuyerKeypair] = useState("");
    // const [encrypteddeployerKeypair, encryptedsetDeployerKeypair] = useState("");
    // const [predictedMarketCap, setPredictedMarketcap] = useState("$NaN")
    // const [predictedSupplyAmount, setPredictedSupplyAmount] = useState("NaN%")
    const [wallets, setWallets] = useState({
        Wallet1: "",
        Wallet2: "",
    });

    console.log(wallets);

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
            const wallet = ((Keypair.fromSecretKey(new Uint8Array(base58.decode(value)))));
            setWallets(prevState => ({
                ...prevState,
                Wallet2: wallet.publicKey.toString(),
            }));


            setFormData(prevState => ({
                ...prevState,
                deployerPrivateKey: value,
            }));
        }

        if (field === 'buyerPrivateKey') {
            const wallet = ((Keypair.fromSecretKey(new Uint8Array(base58.decode(value)))));
            setWallets(prevState => ({
                ...prevState,
                Wallet1: wallet.publicKey.toString(),
            }));
        }
    };





    return (
        <div className=" mb-8 mx-auto flex mt-8 justify-center items-center relative w-full">
            <form>
                <div className="flex justify-between w-full">
                    <div className="space-y-4 mx-auto">
                        <div className="bg-[#1c2936]  border border-neutral-600 shadow-2xl shadow-black rounded-2xl sm:p-6">
                            <div className='w-full'>
                                <h1 className=" bg-gradient-to-r from-[#5be2a3] to-[#ff9a03] bg-clip-text text-left text-2xl font-semibold text-transparent">
                                    Sell Tokens
                                </h1>
                                <p>Enter the percentage of tokens you want to sell</p>
                            </div>
                            <p>Wallet Name : {activeWallet?.name}</p>
                            <div className='flex flex-col gap-4'>
                                <div>
                                    <InputField
                                        id="deployerPrivatekey"
                                        label=""
                                        value={formData.deployerPrivateKey}
                                        onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                        placeholder="0"
                                        type="number"
                                        required={true}
                                    />
                                </div>
                                <button

                                    className="font-bold rounded-xl h-[40px] hover:border-[#50fc92] px-5 flex  justify-center items-center border border-[#949494] text-[16px] duration-200 ease-in-out w-full py-2 mr-2"
                                >
                                    <span className='bg-gradient-to-r from-[#6afc76] to-[#00d8e7] bg-clip-text text-transparent'>
                                        {'Sell Tokens'}
                                    </span>
                                </button>
                                <button
                                    className="font-bold rounded-xl h-[40px] hover:border-[#50fc92] px-5 flex  justify-center items-center border border-[#949494] text-[16px] duration-200 ease-in-out w-full py-2 mr-2"
                                >
                                    <span className='bg-gradient-to-r from-[#6afc76] to-[#00d8e7] bg-clip-text text-transparent'>
                                        {'Update balance'}
                                    </span>
                                </button>
                                <button
                                    className="font-bold rounded-xl h-[40px] hover:border-[#50fc92] px-5 flex  justify-center items-center border border-[#949494] text-[16px] duration-200 ease-in-out w-full py-2 mr-2"
                                >
                                    <span className='bg-gradient-to-br from-[#f35c5c] to-[#ffa825] bg-clip-text text-transparent'>
                                        {'Burn Liquidity'}
                                    </span>


                                </button>
                                <div className='flex '>
                                    <button
                                        className="font-bold rounded-xl h-[40px] hover:border-[#50fc92] px-5 flex  justify-center items-center border border-[#949494] text-[16px] duration-200 ease-in-out w-full py-2 mr-2"
                                    >
                                        <span className='bg-gradient-to-r from-[#6afc76] to-[#00d8e7] bg-clip-text text-transparent'>
                                            {'Disperse SOL'}
                                        </span>


                                    </button>
                                    <button
                                        className="font-bold rounded-xl h-[40px] hover:border-[#ff0000] px-5 flex  justify-center items-center border border-[#535353] text-[16px] duration-200 ease-in-out w-full py-2 mr-2"
                                    >
                                        <span className='bg-gradient-to-r from-[#6afc76] to-[#00d8e7] bg-clip-text text-transparent whitespace-nowrap'>
                                            {'Disperse tokens'}
                                        </span>


                                    </button>
                                </div>
                                <div>
                                    <InputField
                                        id="deployerPrivatekey"
                                        label=""
                                        value={formData.deployerPrivateKey}
                                        onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                        placeholder="0"
                                        type="number"
                                        required={true}
                                    />
                                </div>

                                <button
                                    className="font-bold rounded-xl h-[40px] hover:border-[#ff0000] px-5 flex  justify-center items-center border border-[#535353] text-[16px] duration-200 ease-in-out w-full py-2 mr-2"
                                >
                                    <span className='bg-gradient-to-br from-[#f35c5c] to-[#ffa825] bg-clip-text text-transparent'>
                                        {'Create Volume'}
                                    </span>
                                </button>
                            </div>

                        </div>

                    </div>

                </div>
            </form>
            <div className='absolute -top-[70px] right-0 h-screen'>
                <WalletsDrawer />
            </div>
        </div>
    );
}



Swap.getLayout = (page: ReactNode) => getHeaderLayout(page, "Swap");

export default Swap;