'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { getHeaderLayout } from '../../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { toast } from 'react-toastify';
import { BlockEngineLocation, InputField } from '../../../components/FieldComponents/InputField';
import WalletsDrawer from '../../../components/common/SideBarDrawer';
// import { commentBomb } from '../../../components/PumpBundler/Bomber/comment-bomb';

const ZERO = new BN(0)
type BN = typeof ZERO

export type BalanceType = {
    balance: number;
    publicKey: string;
};

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const VolumeCommentBomb = () => {
    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        throw new Error('NFT_STORAGE is not defined');
    }

    const [formData, setFormData] = useState({
        signerkeypair: '',
        tokenMintAddress: '',
        commentAmount: '',
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
    };



    const volumeBot = async (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        e.preventDefault();
        if (!formData.tokenMintAddress || !formData.commentAmount) {
            toast.error('Please upload a csv file with wallets and provide a token mint address');
            return;
        }
        toast.info(`Generating comments for ${formData.commentAmount} wallets`);

        console.log('formData', formData);

        try {
            // const commentBomber = await commentBomb(
            //     connection,
            //     formData.signerkeypair,
            //     formData.commentAmount,
            //     formData.tokenMintAddress,
            // );

        } catch (error: any) {
            toast.error(`Error sending bundle: ${error}`);
        }
    }

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative">
            <form>
                <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                    <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                        <div>
                            <p className='font-bold text-[25px]'>Pump.Fun Comment Bomber</p>
                            <p className=' text-[12px] text-[#96989c] '>Generate Replies and comments on a custom coin
                            </p>
                        </div>
                        <InputField
                            id="signerkeypair"
                            label="Signer Keypair"
                            subfield='Keypair to sign transactions'
                            value={formData.signerkeypair}
                            onChange={(e) => handleChange(e, 'signerkeypair')}
                            placeholder="keypair to sign comment txns"
                            type="password"
                            required={true}
                        />
                        <div className='flex flex-col gap-2' id="tokeninfo">
                            <h3 className='btn-text-gradient font-bold text-[25px] mt-2'>Generate Comments</h3>
                            <div className='flex justify-center items-center gap-2'>
                                <InputField
                                    label="Mint Address"
                                    subfield='address'
                                    id="mintAddress"
                                    value={formData.tokenMintAddress}
                                    onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                    placeholder="D5bBV....eVK7K"
                                    type="text"
                                    required={false}
                                />
                            </div>

                            <div className='flex justify-center items-center gap-2'>
                                <InputField
                                    id="tokenbuyAmount"
                                    label="Comment Amount"
                                    subfield='spam amount'
                                    value={formData.commentAmount}
                                    onChange={(e) => handleChange(e, 'commentAmount')}
                                    placeholder="10..."
                                    type="number"
                                    required={false}
                                />
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
                                    className="text-center hover:shadow-xl hover:shadow-black/50 w-full border border-[#476e34] rounded-md invoke-btn "
                                    onClick={volumeBot}
                                >
                                    Start Bombing Comments
                                </button>
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





VolumeCommentBomb.getLayout = (page: ReactNode) => getHeaderLayout(page, "Comment Bomber");

export default VolumeCommentBomb;