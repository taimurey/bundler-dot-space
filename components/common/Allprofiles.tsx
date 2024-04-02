import React from 'react';
import { useMyContext } from '../../contexts/Maincontext';

interface Profile {
    id: number;
    name: string;
    price: string;
}

const Allprofiles: React.FC = () => {
    const { isProfilesActive } = useMyContext();

    let data: Profile[] = [
        {
            id: 1,
            name: "John Doe",
            price: "Pkr424234"
        },
        {
            id: 2,
            name: "Jane Doe",
            price: "Pkr234214214"
        }
    ];

    return (
        <div className={`shadow-black shadow-xl bg-[#1a1a1a] w-[300px] h-full px-4 py-8 transition-all   ease-in-out duration-300 ${!isProfilesActive ? "translate-x-[320px] " : "translate-x-[20px]"}`}>
            <p className='border-b border-[#f5ac41] p-2 font-bold'>All Portfolios</p>
            <div className='flex flex-col gap-4 py-4'>
                {data.map((item: Profile, index: number) => (
                    <div key={index} className='flex justify-start items-center gap-2 bg-[#262626]  px-3 py-2 rounded-lg'>
                        <div className="bg-[#333333] px-3 py-3  rounded-full"><div className="bg-[#7a7a7a] rounded-full px-2 font-bold ">?</div></div>
                        <div className='flex flex-col justify-start items-start'>
                            <p className='text-[#96989c]'>{item.name}</p>
                            <p className='text-[#96989c]'>{item.price}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Allprofiles;
