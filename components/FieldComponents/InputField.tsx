import { ChangeEvent } from "react";

interface Props {
    id: string;
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type: string;
}

export const InputField: React.FC<Props> = ({ id, label, value, onChange, placeholder, type }) => {
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
                    className="block w-full p-4 rounded-md text-base border  border-[#404040]  text-white bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px]"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};
