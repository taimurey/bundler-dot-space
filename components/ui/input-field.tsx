import { ChangeEvent } from "react";

interface Props {
    id: string;
    label: string;
    value?: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type: string;
    required: boolean;
    disabled?: boolean;
    subfield?: string;
    classNameLabel?: string;
    classNameInput?: string;
    classNameSubfield?: string;
}

export const InputField: React.FC<Props> = ({
    id,
    label,
    value,
    onChange,
    placeholder,
    type,
    required,
    disabled = false,
    subfield,
    classNameLabel = '',
    classNameInput = '',
    classNameSubfield = '',
}) => {
    return (
        <div className={`w-full`}>
            {label &&
                <label className={`block mt-2 text-base text-white font-semibold ${classNameLabel}`} htmlFor={id}>
                    {label}
                    {subfield && <span className={`pl-5 text-[#FFC107] text-[12px] font-normal ${classNameSubfield}`}>({subfield})</span>}
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
                    className={`block w-full px-4 py-1 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${classNameInput}`}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

