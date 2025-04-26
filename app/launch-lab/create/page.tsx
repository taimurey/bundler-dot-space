'use client';

import React, { ChangeEvent, ReactNode, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { getHeaderLayout } from '@/components/header-layout';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';

const LaunchLabCreate = () => {
    const { cluster } = useSolana();
    const [isJitoBundle, setIsJitoBundle] = useState(true);

    const [formData, setFormData] = useState<{
        tokenAddress: string;
        liquidityAmount: string;
        pricePerToken: string;
        orderType: string;
        deployerPrivateKey: string;
        websiteUrl: string;
        twitterUrl: string;
        telegramUrl: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
    }>({
        tokenAddress: '',
        liquidityAmount: '',
        pricePerToken: '',
        orderType: 'market',
        deployerPrivateKey: '',
        websiteUrl: '',
        twitterUrl: '',
        telegramUrl: '',
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2],
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        field: string
    ) => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder for submission logic
        console.log('Form submitted:', formData);
    };

    return (
        <div className="w-full px-4">
            <form onSubmit={handleSubmit} className="w-full">
                <div className="flex flex-col md:flex-row h-full gap-6">
                    <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl sm:p-6 shadow-lg w-full">
                        <div className="mb-4 border-b border-neutral-700 pb-2">
                            <p className='font-bold text-xl'>Launch Lab</p>
                            <p className='text-xs text-[#96989c]'>Create your own token liquidity pool with ease</p>
                        </div>

                        <JitoBundleSelection
                            isJitoBundle={isJitoBundle}
                            setIsJitoBundle={setIsJitoBundle}
                            formData={formData}
                            handleChange={handleChange}
                            handleSelectionChange={handleSelectionChange}
                        />

                        <div className='w-full'>
                            <label className="block text-base text-white font-semibold">
                                Block Engine
                            </label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                                <select
                                    id="BlockEngineSelection"
                                    value={formData.BlockEngineSelection}
                                    onChange={(e) => handleSelectionChange(e, 'BlockEngineSelection')}
                                    required={true}
                                    className="block w-full px-4 py-2 rounded-md text-base border border-[#404040] text-white bg-transparent focus:outline-none sm:text-base focus:border-blue-500"
                                >
                                    <option value="" disabled>
                                        Select Block Engine
                                    </option>
                                    {BlockEngineLocation.map((option, index) => (
                                        <option key={index} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="border border-dashed border-white rounded-md shadow-lg p-4">
                            <InputField
                                id="deployerPrivateKey"
                                label="Deployer Wallet"
                                subfield='private key'
                                value={formData.deployerPrivateKey}
                                onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                placeholder="Enter private key..."
                                type="password"
                                required={true}
                            />
                        </div>

                        <div className='w-full'>
                            <label className="block text-base text-white font-semibold">
                                Launch Type
                            </label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                                <select
                                    id="orderType"
                                    value={formData.orderType}
                                    onChange={(e) => handleSelectionChange(e, 'orderType')}
                                    required={true}
                                    className="block w-full px-4 py-2 rounded-md text-base border border-[#404040] text-white bg-transparent focus:outline-none sm:text-base focus:border-blue-500"
                                >
                                    <option value="market">Market Order</option>
                                    <option value="limit">Limit Order</option>
                                </select>
                            </div>
                        </div>

                        <div className='flex flex-col gap-2' id="tokeninfo">
                            <h3 className='font-bold text-sm text-white'>Token Information</h3>
                            <InputField
                                id="tokenAddress"
                                label="Token Address"
                                subfield='mint address'
                                value={formData.tokenAddress}
                                onChange={(e) => handleChange(e, 'tokenAddress')}
                                placeholder="Enter token address..."
                                type="text"
                                required={true}
                            />

                            <div className='flex gap-2'>
                                <InputField
                                    id="liquidityAmount"
                                    label="Liquidity Amount"
                                    subfield='SOL'
                                    value={formData.liquidityAmount}
                                    onChange={(e) => handleChange(e, 'liquidityAmount')}
                                    placeholder="Enter amount..."
                                    type="text"
                                    required={true}
                                />
                                <InputField
                                    id="pricePerToken"
                                    label="Price Per Token"
                                    subfield='SOL'
                                    value={formData.pricePerToken}
                                    onChange={(e) => handleChange(e, 'pricePerToken')}
                                    placeholder="Enter price..."
                                    type="text"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className='flex flex-col gap-2' id="socialsinfo">
                            <h3 className='font-bold text-sm text-white'>Social Information</h3>
                            <div className='flex gap-2'>
                                <InputField
                                    id="websiteUrl"
                                    label="Website"
                                    value={formData.websiteUrl}
                                    onChange={(e) => handleChange(e, 'websiteUrl')}
                                    placeholder="https://..."
                                    type="text"
                                    required={false}
                                />
                                <InputField
                                    id="twitterUrl"
                                    label="Twitter"
                                    value={formData.twitterUrl}
                                    onChange={(e) => handleChange(e, 'twitterUrl')}
                                    placeholder="https://twitter.com/..."
                                    type="text"
                                    required={false}
                                />
                            </div>
                            <InputField
                                id="telegramUrl"
                                label="Telegram"
                                value={formData.telegramUrl}
                                onChange={(e) => handleChange(e, 'telegramUrl')}
                                placeholder="https://t.me/..."
                                type="text"
                                required={false}
                            />
                        </div>

                        <div className='flex flex-col gap-2' id="feesinfo">
                            <h3 className='font-bold text-sm text-white'>Transaction Fees</h3>
                            <div className='flex gap-2'>
                                <InputField
                                    id="BundleTip"
                                    label="Bundle Tip"
                                    subfield='SOL'
                                    value={formData.BundleTip}
                                    onChange={(e) => handleChange(e, 'BundleTip')}
                                    placeholder="0.01"
                                    type="text"
                                    required={true}
                                />
                                <InputField
                                    id="TransactionTip"
                                    label="Transaction Tip"
                                    subfield='SOL'
                                    value={formData.TransactionTip}
                                    onChange={(e) => handleChange(e, 'TransactionTip')}
                                    placeholder="0.00001"
                                    type="text"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                type="submit"
                                className="w-full px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-md hover:from-blue-500 hover:to-blue-600 focus:outline-none"
                            >
                                Create Liquidity Pool
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-[#0c0e11] bg-opacity-70 border border-neutral-600 shadow rounded-xl sm:p-6 flex flex-col w-full md:w-1/3">
                        <div>
                            <div className="mb-4 border-b border-neutral-700 pb-2">
                                <p className='font-bold text-xl'>Status Panel</p>
                                <p className='text-xs text-[#96989c]'>Real-time information and logs</p>
                            </div>
                            <div className='w-full'>
                                <label className="block mt-5 text-base text-white font-semibold">
                                    Info:
                                </label>
                                <br />
                                <div className="mt-8 text-[#96989c] text-sm">
                                    <p>This panel will display transaction status and logs once you submit the form.</p>
                                    <p className="mt-4">No active transactions.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

LaunchLabCreate.getLayout = (page: ReactNode) => getHeaderLayout(page, "Launch Lab - Create");

export default LaunchLabCreate; 