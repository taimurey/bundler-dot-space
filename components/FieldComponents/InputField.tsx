import { ChangeEvent } from "react";

interface Props {
    id: string;
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type: string;
    required: boolean;
}

export const InputField: React.FC<Props> = ({ id, label, value, onChange, placeholder, type, required }) => {
    return (
        <div className='w-full'>
            {label &&
                <label className="block mt-5 text-base text-white font-semibold" htmlFor={id}>
                    {label}
                </label>
            }
            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e)}
                    required={required}
                    className="block w-full p-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

export const BlockEngineLocation = ['amsterdam.mainnet.block-engine.jito.wtf',
    'frankfurt.mainnet.block-engine.jito.wtf',
    'ny.mainnet.block-engine.jito.wtf',
    'tokyo.mainnet.block-engine.jito.wtf'];
