'use client';

import React, { ChangeEvent, ReactNode, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { getHeaderLayout } from '@/components/header-layout';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { truncate } from '@/components/sidebar-drawer';
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';

interface PoolInfo {
    poolAddress: string;
    tokenAddress: string;
    liquidity: string;
    price: string;
}

const LaunchLabManage = () => {
    const { cluster } = useSolana();
    const [isJitoBundle, setIsJitoBundle] = useState(true);
    const [pools, setPools] = useState<PoolInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<{
        tokenAddress: string;
        poolAddress: string;
        actionType: string;
        amount: string;
        deployerPrivateKey: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
    }>({
        tokenAddress: '',
        poolAddress: '',
        actionType: 'add',
        amount: '',
        deployerPrivateKey: '',
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

    const loadPools = () => {
        setIsLoading(true);
        // Mock data for demonstration - would be replaced with real API call
        setTimeout(() => {
            setPools([
                {
                    poolAddress: '7KBN8iDEWMgFrKJEJXz9TaX29jAqUBrdJCA1y8GvnNtX',
                    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    liquidity: '10.5',
                    price: '0.00012'
                },
                {
                    poolAddress: '9VN2susRjJQDH5eGFmJxGcwqf2xNQD3jhpBYcHTzYo3Z',
                    tokenAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
                    liquidity: '5.2',
                    price: '0.00008'
                }
            ]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="w-full px-4">
            <form onSubmit={handleSubmit} className="w-full">
                <div className="flex flex-col md:flex-row h-full gap-6">
                    <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl sm:p-6 shadow-lg w-full">
                        <div className="mb-4 border-b border-neutral-700 pb-2">
                            <p className='font-bold text-xl'>Manage Liquidity Pools</p>
                            <p className='text-xs text-[#96989c]'>Add or remove liquidity from your pools</p>
                        </div>

                        <JitoBundleSelection
                            isJitoBundle={isJitoBundle}
                            setIsJitoBundle={setIsJitoBundle}
                            formData={formData}
                            handleChange={handleChange}
                            handleSelectionChange={handleSelectionChange}
                        />

                        <div className="border border-dashed border-white rounded-md shadow-lg p-4">
                            <InputField
                                id="deployerPrivateKey"
                                label="Wallet"
                                subfield='private key'
                                value={formData.deployerPrivateKey}
                                onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                placeholder="Enter private key..."
                                type="password"
                                required={true}
                            />
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={loadPools}
                                    className="w-full px-4 py-2 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-md hover:from-blue-500 hover:to-blue-600 focus:outline-none"
                                    disabled={isLoading || !formData.deployerPrivateKey}
                                >
                                    {isLoading ? (
                                        <div className="flex justify-center items-center gap-2">
                                            <span>Loading Pools...</span>
                                            <FaSpinner className="animate-spin" />
                                        </div>
                                    ) : (
                                        "Load My Pools"
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className='flex flex-col gap-2'>
                            <h3 className='font-bold text-sm text-white'>Pool Information</h3>

                            {pools.length > 0 ? (
                                <div className="border border-neutral-600 rounded-md p-4">
                                    <div className="grid grid-cols-4 gap-2 font-semibold text-white mb-2 text-sm">
                                        <div>Pool Address</div>
                                        <div>Token</div>
                                        <div>Liquidity</div>
                                        <div>Price</div>
                                    </div>
                                    {pools.map((pool, index) => (
                                        <div
                                            key={index}
                                            className="grid grid-cols-4 gap-2 text-[#96989c] text-xs py-2 border-t border-neutral-700 cursor-pointer hover:bg-neutral-800/30"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    poolAddress: pool.poolAddress,
                                                    tokenAddress: pool.tokenAddress
                                                }));
                                            }}
                                        >
                                            <div className="overflow-hidden text-ellipsis">
                                                {truncate(pool.poolAddress, 6, 4)}
                                            </div>
                                            <div className="overflow-hidden text-ellipsis">
                                                {truncate(pool.tokenAddress, 6, 4)}
                                            </div>
                                            <div>{pool.liquidity} SOL</div>
                                            <div>{pool.price} SOL</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-[#96989c]">
                                    {isLoading ? "Loading..." : "No pools loaded. Enter your wallet key and click 'Load My Pools'."}
                                </div>
                            )}

                            <InputField
                                id="poolAddress"
                                label="Pool Address"
                                value={formData.poolAddress}
                                onChange={(e) => handleChange(e, 'poolAddress')}
                                placeholder="Enter pool address..."
                                type="text"
                                required={true}
                            />

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
                        </div>

                        <div className='w-full'>
                            <h3 className='font-bold text-sm text-white mb-2'>Action Type</h3>
                            <div className="relative rounded-md shadow-sm">
                                <select
                                    id="actionType"
                                    value={formData.actionType}
                                    onChange={(e) => handleSelectionChange(e, 'actionType')}
                                    required={true}
                                    className="block w-full px-4 py-2 rounded-md text-base border border-[#404040] text-white bg-transparent focus:outline-none sm:text-base focus:border-blue-500"
                                >
                                    <option value="add">Add Liquidity</option>
                                    <option value="remove">Remove Liquidity</option>
                                </select>
                            </div>
                        </div>

                        <InputField
                            id="amount"
                            label="Amount"
                            subfield='SOL'
                            value={formData.amount}
                            onChange={(e) => handleChange(e, 'amount')}
                            placeholder="Enter amount..."
                            type="text"
                            required={true}
                        />

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
                                {formData.actionType === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
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
                                    Pools:
                                </label>
                                <br />
                                <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end">
                                    {pools.length > 0 ? (
                                        pools.map((pool, index) => (
                                            <div key={index} className="text-[#96989c] text-sm mb-2">
                                                <p>
                                                    <span className="text-[10px] font-normal">{index + 1}: </span>
                                                    <span className="bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[12px]">
                                                        {truncate(pool.poolAddress, 6, 4)}
                                                    </span>
                                                    <br />
                                                    <span className="text-[14px] font-normal ml-2">Liquidity: {pool.liquidity} SOL</span>
                                                    <br />
                                                    <span className="text-[14px] font-normal ml-2">Token: {truncate(pool.tokenAddress, 4, 4)}</span>
                                                    <br />
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-[#96989c] text-sm">
                                            <p>No pools loaded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

LaunchLabManage.getLayout = (page: ReactNode) => getHeaderLayout(page, "Launch Lab - Manage");

export default LaunchLabManage; 