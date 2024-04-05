import { useEffect, useState } from 'react';
import { useMyContext } from '../../contexts/Maincontext';
import { Keypair } from '@solana/web3.js';
import base58 from 'bs58';
import VirusIcon from '../icons/VirusIcon';
import { toast } from 'react-toastify';
import { set } from 'lodash';

const randomColor = () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

interface Profile {
    id: number;
    name: string;
    wallet: string;
    color: string;
}


const Allprofiles: React.FC = () => {
    const { isProfilesActive, DeployerWallets, setDeployerWallets, activeWallet, setActiveWallet } = useMyContext();
    const [isEditable, setIsEditable] = useState<number | null>(null);
    // const [data, setData] = useState<Profile[]>(() => {
    //     const isWindowAvailable = typeof window !== 'undefined';
    //     if (isWindowAvailable) {
    //         const savedData = window.localStorage.getItem('data');
    //         if (savedData) {
    //             const parsedData: Profile[] = JSON.parse(savedData);
    //             return parsedData.map(item => ({
    //                 ...item,
    //                 color: item.color || randomColor(),
    //             }));
    //         }
    //     }
    //     return [];
    // });

    // useEffect(() => {
    //     const isWindowAvailable = typeof window !== 'undefined';
    //     if (isWindowAvailable) {
    //         window.localStorage.setItem('data', JSON.stringify(data));
    //     }
    // }, [data]);

    const clearWallet = () => {
        localStorage.removeItem('deployerwallets');
        setDeployerWallets([]);
    };

    const handleChange = (index: number, field: keyof Profile, event: React.ChangeEvent<HTMLInputElement>) => {
        const newData = [...DeployerWallets];
        if (field === 'wallet') {
            try {
                const keypair = Keypair.fromSecretKey(base58.decode(event.target.value));
                newData[index].name = truncate(keypair.publicKey.toString(), 7, 8);
            } catch (error) {
                toast.error('Invalid Private Key');
            }
        }
        newData[index][field as 'name' | 'wallet'] = truncate(event.target.value, 5, 5);
        setDeployerWallets(newData);
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            setIsEditable(null);
        }
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

    const truncate = (str: string, startChars: number, endChars: number) => {
        return str.length > startChars + endChars
            ? str.substring(0, startChars) + '...' + str.substring(str.length - endChars)
            : str;
    };





    return (
        <div className={`shadow-black shadow-xl bg-[#1a1a1a] w-[300px] min-h-screen hover:w-[400px] px-4 py-8 transition-all ease-in-out duration-300 flex flex-col justify-between ${!isProfilesActive ? "translate-x-[320px] " : "translate-x-[10px]"}`}>
            <div>
                <p className='px-1 font-bold'>Deployer Wallets</p>
                <p className='p-2 font-light text-sm  border-[#f5ac41] border-b'>Wallets will be automatically loaded after successful deployment</p>
                <div className='flex flex-col gap-4 py-4'>
                    {DeployerWallets?.map((item: Profile, index: number) => (
                        <div
                            key={index}
                            className={`flex justify-start items-center gap-2  ${activeWallet.id == item.id ? "bg-gray-700" : "bg-[#262626]"} hover:bg-gray-700 ease-in-out cursor-pointer duration-300 px-3 py-2 rounded-lg`}
                            onClick={() => { setIsEditable(index); setActiveWallet(item) }}
                        >
                            <div className="circle">
                                <VirusIcon color={item.color} />
                            </div>
                            <div className='flex flex-col justify-start items-start'>
                                <p className='text-[#bababb] text-sm'>{truncate(item.name, 7, 8)}</p>
                                <p className={`text-[#96989c]  hover:text-white rounded-md bg-[#202429] hover:border-[#00ffdd] flex justify-center items-center border border-[#535353] duration-200 ease-in-out overflow-hidden min-h-[25px]
                                ${isEditable === index
                                        ? 'hover:text-white rounded-xl bg-black hover:border-[#00ffdd] flex justify-center items-center border border-[#535353] duration-200 ease-in-out' : ''} w-32`} contentEditable={isEditable === index} onBlur={event => handleBlur(index, 'wallet', event)}>{truncate(item.wallet, 5, 5)}</p>

                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {DeployerWallets.length > 0 &&
                <div className='invoke-btn btn-text-gradient mb-16 ' onClick={clearWallet}>
                    Clear wallets
                </div>
            }
        </div>
    );
};

export default Allprofiles;