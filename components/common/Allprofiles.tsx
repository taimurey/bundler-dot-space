import { useState } from 'react';
import React from 'react';
import { useMyContext } from '../../contexts/Maincontext';
import { Keypair } from '@solana/web3.js';
import base58 from 'bs58';
import VirusIcon from '../icons/VirusIcon';
import { toast } from 'react-toastify';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Profile {
    id: number;
    name: string;
    wallet: string;
    color: string;
}

export const truncate = (str: string, startChars: number, endChars: number) => {
    return str.length > startChars + endChars
        ? str.substring(0, startChars) + '...' + str.substring(str.length - endChars)
        : str;
};


const WalletsDrawer: React.FC = () => {
    const { isProfilesActive, setisProfilesActive, DeployerWallets, setDeployerWallets, activeWallet, setActiveWallet } = useMyContext();
    const [isEditable, setIsEditable] = useState<number | null>(null);

    const clearWallet = () => {
        localStorage.removeItem('deployerwallets');
        setDeployerWallets([]);
    };

    const handleBlur = (index: number, field: keyof Profile, event: React.FocusEvent<HTMLParagraphElement>) => {
        const newData = [...DeployerWallets];
        if (field === 'wallet') {
            try {
                const keypair = Keypair.fromSecretKey(base58.decode(event.target.innerText));
                newData[index].name = truncate(keypair.publicKey.toString(), 7, 8);
            } catch (error) {
                toast.error('Invalid Private Key');
            }
        }
        newData[index][field as 'name' | 'wallet'] = truncate(event.target.innerText, 5, 5);
        setDeployerWallets(newData);
        setIsEditable(null);
    };

    return (
        <>
            <Dialog className="relative z-50" open={isProfilesActive} onClose={() => setisProfilesActive(false)}>
                <div className="fixed inset-0 bg-black bg-opacity-30" />
                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            <DialogPanel
                                className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out translate-x-0 sm:duration-700"
                            >
                                <div className="flex h-full flex-col overflow-y-scroll bg-[#1a1a1a] shadow-xl">
                                    <div className="px-4 py-6 sm:px-6 bg-[#262626]">
                                        <div className="flex items-center justify-between">
                                            <DialogTitle className="text-lg font-bold text-white">Deployer Wallets</DialogTitle>
                                            <div className="ml-3 flex h-7 items-center">
                                                <button
                                                    type="button"
                                                    className="rounded-md text-indigo-200 hover:text-white focus:outline-none"
                                                    onClick={() => setisProfilesActive(false)}
                                                >
                                                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                                    <span className="sr-only">Close panel</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-sm text-indigo-300">
                                            Wallets will be automatically loaded after successful deployment.
                                        </p>
                                    </div>
                                    <div className="relative flex-1 px-4 py-6 sm:px-6">
                                        <div className='flex flex-col gap-4'>
                                            {DeployerWallets?.map((item: any, index: any) => (
                                                <div
                                                    key={index}
                                                    className={`flex justify-start items-center gap-2 ${activeWallet?.id == item?.id ? "bg-gray-700" : "bg-[#262626]"} hover:bg-gray-700 ease-in-out cursor-pointer duration-300 px-3 py-2 rounded-lg`}
                                                    onClick={() => { setIsEditable(index); setActiveWallet(item) }}
                                                >
                                                    <div className="circle">
                                                        <VirusIcon color={item.color} />
                                                    </div>
                                                    <div className='flex flex-col justify-start items-start'>
                                                        <p className='text-[#bababb] text-sm'>{truncate(item.name, 7, 8)}</p>
                                                        <p className={`text-[#96989c] hover:text-white rounded-md bg-[#202429] hover:border-[#00ffdd] flex justify-center items-center border border-[#535353] duration-200 ease-in-out overflow-hidden min-h-[25px]
                                                ${isEditable === index ? 'hover:text-white rounded-xl bg-black hover:border-[#00ffdd] flex justify-center items-center border border-[#535353] duration-200 ease-in-out' : ''} w-32`} contentEditable={isEditable === index} onBlur={event => handleBlur(index, 'wallet', event)}>{truncate(item.wallet, 5, 5)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {DeployerWallets.length > 0 &&
                                            <div className='invoke-btn btn-text-gradient mt-4' onClick={clearWallet}>
                                                Clear wallets
                                            </div>
                                        }
                                    </div>
                                </div>
                            </DialogPanel>
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default WalletsDrawer;