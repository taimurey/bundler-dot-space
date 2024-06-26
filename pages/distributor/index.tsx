'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { getHeaderLayout } from '../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { toast } from 'react-toastify';
import Allprofiles from '../../components/common/Allprofiles';
import Papa from 'papaparse';
import { BlockEngineLocation, InputField } from '../../components/FieldComponents/InputField';
import { tokenMultisender } from '../../components/tokenDistributor/tokenMultisender';
import { useConnection } from '@solana/wallet-adapter-react';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getKeypairFromBs58 } from '../../components/PumpBundler/misc';

const ZERO = new BN(0)
type BN = typeof ZERO

export type BalanceType = {
    balance: number;
    publicKey: string;
};

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { connection } = useConnection();

    const [generateCount, setGenerateCount] = useState('');
    const [formData, setFormData] = useState<{
        tokenMintAddress: string;
        feePayerWallet: string;
        SendingWallet: string;
        RecievingWallets: string[];
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
    }>({
        tokenMintAddress: '',
        feePayerWallet: '',
        SendingWallet: '',
        RecievingWallets: [],
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2]
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
    };

    const generatewallets = () => {
        const wallets = [];
        for (let i = 0; i < Number(generateCount); i++) {
            const keypair = Keypair.generate();
            wallets.push({
                id: i,
                wallet: keypair.publicKey.toBase58(),
            });
        }
        //write to a csv file using papaparse
        const csv = Papa.unparse(wallets);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'wallets.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // const handleSendingWallets = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     if (!event.target.files) {
    //         return;
    //     }
    //     const file = event.target.files[0];

    //     Papa.parse<string[]>(file, {
    //         complete: function (results) {
    //             //skip the first row
    //             const wallets = results.data.slice(1).map(row => row[1]);
    //             wallets.forEach((element: string) => {
    //                 if (element === '' || element === 'wallet') {
    //                     return;
    //                 }

    //             });
    //             toast.success('Wallets Loaded Successfully')
    //             setFormData(prevState => ({
    //                 ...prevState,
    //                 SendingWallets: wallets,
    //             }));
    //         }
    //     });
    // }

    const handleRecievingWallets = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) {
            return;
        }
        const file = event.target.files[0];

        Papa.parse<string[]>(file, {
            complete: function (results) {
                //skip the first row
                const wallets = results.data.slice(1).map(row => row[1]);
                wallets.forEach((element: string) => {
                    if (element === '' || element === 'wallet') {
                        return;
                    }


                });
                toast.success('Wallets Loaded Successfully')

                setFormData(prevState => ({
                    ...prevState,
                    RecievingWallets: wallets,
                }));
            }
        });
    }

    const [feePayerBalance, setFeePayerBalance] = React.useState<number | null>(null);

    React.useEffect(() => {
        const fetchBalance = async () => {
            if (formData.feePayerWallet) {
                try {
                    const keypair = getKeypairFromBs58(formData.feePayerWallet);
                    if (keypair) {
                        const balance = await connection.getBalance(keypair.publicKey);
                        setFeePayerBalance(Number((balance / LAMPORTS_PER_SOL).toFixed(2)));
                    }
                } catch (error) {
                    console.error("Failed to fetch balance:", error);
                    setFeePayerBalance(null); // Reset or handle error
                }
            }
        };

        fetchBalance();
    }, [formData.feePayerWallet, connection]);



    const distributeTokens = async (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        e.preventDefault();
        if (formData.tokenMintAddress === '' || formData.feePayerWallet === '' || formData.RecievingWallets.length === 0) {
            toast.error('Please upload a csv file with wallets and provide a token mint address');
            return;
        }
        toast.info('Distributing Tokens...');

        try {
            const data = await tokenMultisender(connection, formData);

            toast.info(`Transaction sent, Data: ${data}`)
            console.log(data);
        } catch (error) {
            toast.error(`Error: ${error}`);
        }

    }

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative">
            <form>
                <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                    <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                        <div>
                            <p className='font-bold text-[25px]'>Token Distributor</p>
                            <p className=' text-[12px] text-[#96989c] '>Distribte tokens to multiple wallets at once.
                            </p>
                        </div>
                        <div className='w-full'>
                            <InputField
                                id='tokenAddress'
                                label='Token Address'
                                subfield={'Address of the token needs to be distributed'}
                                value={formData.tokenMintAddress}
                                onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                placeholder='D5b....ae'
                                type='string'
                                required={false}
                            />
                        </div>
                        <div className='w-full'>
                            <InputField
                                id='feePayerWallet'
                                label='Fee Payer Wallet'
                                subfield={`Fee payer -- Balance: ${feePayerBalance} SOL`}
                                value={formData.feePayerWallet}
                                onChange={(e) => handleChange(e, 'feePayerWallet')}
                                placeholder='D5bBVBQDN....TcNu3yJaeVK5W'
                                type='string'
                                required={false}
                            />
                        </div>
                        <div className='flex flex-col gap-2' id="tokeninfo">
                            <h3 className='btn-text-gradient font-bold text-[25px] mt-2'>Generate Volume</h3>
                            <div className='border-dashed border p-4 rounded-lg'>
                                <label className='font-normal'>
                                    Upload tokens <span className='text-lime-500 font-bold'>Sending</span> Wallets
                                    <span className="pl-5 text-[#FFC107] text-[12px] font-normal">( csv file )</span>
                                </label>

                                <InputField
                                    id='sendingWallets'
                                    label=''
                                    subfield={`Fee payer -- Balance: ${feePayerBalance} SOL`}
                                    value={formData.SendingWallet}
                                    onChange={(e) => handleChange(e, 'SendingWallet')}
                                    placeholder='D5bBVBQDN....TcNu3yJaeVK5W'
                                    type='string'
                                    required={false}
                                />
                                <div className='border-dashed border p-4 rounded-lg mt-5'>
                                    <div className='mt-5'>
                                        <label className='font-normal'>
                                            Upload tokens <span className='text-red-500 font-bold'>Receiving</span> Wallets
                                            <span className="pl-5 text-[#FFC107] text-[12px] font-normal">( csv file )</span>
                                        </label>
                                        <InputField
                                            id='walletsNumbers'
                                            placeholder='27'
                                            label=''
                                            subfield='csv file'
                                            required={true}
                                            type="file"
                                            onChange={handleRecievingWallets}
                                        />
                                    </div>
                                    <div className="relative rounded-md shadow-sm w-full flex gap-2 justify-end">
                                        <div className='w-4/5'>
                                            <InputField
                                                id='walletcount'
                                                label='Wallet Count'
                                                subfield={'Generate Wallets and download in CSV format -- Optional'}
                                                value={generateCount.toString()}
                                                onChange={(e) => setGenerateCount(e.target.value)}
                                                placeholder='40...'
                                                type='string'
                                                required={false}
                                            />
                                        </div>
                                        <button
                                            className='bundler-btn border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                                            onClick={generatewallets}
                                        >
                                            Generate Recieving Wallets
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className='flex justify-end items-end gap-2 border rounded-lg p-4 mt-4 border-gray-600'>

                                <div className="w-full">
                                    <label className="block mt-5 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                        Transaction Parameter Settings
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
                                    className="btn-text-gradient btn-normal w-full mt-5"
                                    onClick={distributeTokens}
                                >
                                    Distribute Tokens
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </form >
            <div className='absolute -top-[70px] right-0 h-screen'>
                <Allprofiles />
            </div>
        </div >
    );
}

LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "Volume Generator");

export default LiquidityHandlerRaydium;