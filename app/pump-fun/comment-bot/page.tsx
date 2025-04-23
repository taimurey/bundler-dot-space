'use client';

import React, { ChangeEvent, useState } from 'react';
import { ReactNode } from 'react';
import { getHeaderLayout } from '@/components/header-layout';
import { toast } from "sonner";
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';



export type BalanceType = {
    balance: number;
    publicKey: string;
};


const VolumeCommentBomb = () => {

    const [isJitoBundle, setIsJitoBundle] = useState(false);
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
                            <p className='font-bold text-[25px]'>Pump.Fun Comment Bot</p>
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

                            <JitoBundleSelection
                                isJitoBundle={isJitoBundle}
                                setIsJitoBundle={setIsJitoBundle}
                                formData={formData}
                                handleChange={handleChange}
                                handleSelectionChange={handleSelectionChange}
                            />

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
            {/* WalletsDrawer removed from here */}
        </div >
    );
}





VolumeCommentBomb.getLayout = (page: ReactNode) => getHeaderLayout(page, "Comment Bot");

export default VolumeCommentBomb;