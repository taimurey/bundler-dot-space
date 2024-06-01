import { ChangeEvent } from "react";

interface Props {
    id: string;
    label: string;
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type: string;
    required: boolean;
    disabled?: boolean;
    subfield?: string;
}

export const UpdatedInputField: React.FC<Props> = ({ id, label, value, onChange, placeholder, type, required, disabled = false, subfield }) => {
    return (
        <div className='w-full'>
            {label &&
                <label className="font-normal mt-5 text-white " htmlFor={id}>
                    {label}
                    {subfield && <span className="pl-5 text-[#FFC107] text-[12px] font-normal">( {subfield} )</span>}
                </label>
            }
            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                <input
                    id={id}
                    type={type}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e)}
                    required={required}
                    className={`block w-full p-4 rounded-md  border  border-[#404040]  text-white bg-[#202020]/20 focus:outline-none  text-[13px] placeholder-[#dbd7d7d4]  h-[40px] focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};
