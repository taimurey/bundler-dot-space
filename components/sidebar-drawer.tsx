import React, { useRef, useState } from 'react';
import { Keypair } from '@solana/web3.js';
import base58 from 'bs58';
import VirusIcon from '@/components/icons/VirusIcon';
import { toast } from "sonner";
import { WalletProfileContext } from '@/components/SolanaWallet/wallet-context';

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
    const { isProfilesActive, setisProfilesActive, DeployerWallets, setDeployerWallets, activeWallet, setActiveWallet } = WalletProfileContext();
    const [isEditable, setIsEditable] = useState<number | null>(null);
    const drawerRef = useRef<HTMLDivElement>(null); // Ref for the drawer

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

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setisProfilesActive(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <>
            {isProfilesActive && (
                <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={() => setActiveWallet(null)}></div>
            )}
            <div
                ref={drawerRef}
                className={`shadow-black shadow-xl bg-[#1a1a1a] w-[350px] min-h-screen 
                px-4 py-8 transition-all ease-in-out duration-300 flex z-50
                flex-col justify-between ${!isProfilesActive ? "translate-x-full" : "translate-x-0"} fixed right-0 top-0`}
            >
                <div>
                    <p className='px-1 font-bold'>Deployer Wallets</p>
                    <p className='p-2 font-light text-sm  border-[#f5ac41] border-b'>Use Wallets for Selling Features
                        <span className='font-bold font-sans  ml-1 mb-4 relative text-xs text-red-500 border border-[#535353] bg-black px-2 rounded-2xl'>BETA</span>
                    </p>
                    <div className='flex flex-col gap-4 py-4'>
                        {DeployerWallets?.map((item: Profile, index: number) => (
                            <div
                                key={index}
                                className={`flex justify-start items-center gap-2 ${activeWallet?.id === item?.id ? "bg-gray-700" : "bg-[#262626]"} hover:bg-gray-700 ease-in-out cursor-pointer duration-300 px-3 py-2 rounded-lg`}
                                onClick={() => { setIsEditable(index); setActiveWallet(item) }}
                            >
                                <div className="circle">
                                    <VirusIcon color={item.color} />
                                </div>
                                <div className='flex flex-col justify-start items-start'>
                                    <p className='text-[#bababb] text-sm'>{truncate(item.name, 7, 8)}</p>
                                    <p className={`text-[#96989c] hover:text-white rounded-md bg-[#202429] hover:border-[#00ffdd] 
                                    flex justify-center items-center border border-[#535353] duration-200 
                                    ease-in-out overflow-hidden min-h-[25px] 
                                    ${isEditable === index ? 'hover:text-white rounded-xl bg-black hover:border-[#00ffdd] flex justify-center items-center border border-[#535353] duration-200 ease-in-out' : ''} w-32`}
                                        contentEditable={isEditable === index} onBlur={event => handleBlur(index, 'wallet', event)}>{truncate(item.wallet, 5, 5)}</p>

                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {DeployerWallets.length > 0 &&
                    <div className='invoke-btn btn-text-gradient cursor-pointer' onClick={clearWallet}>
                        Clear wallets
                    </div>
                }
            </div>
        </>
    );
};

export default WalletsDrawer;
