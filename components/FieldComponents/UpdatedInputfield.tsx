import React from 'react';

interface InputFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type: string;
    required: boolean;
    min?: string;
    max?: string;
}

export const UpdatedInputField: React.FC<InputFieldProps> = ({
    id,
    label,
    value,
    onChange,
    placeholder,
    type,
    required,
    min,
    max
}) => {
    return (
        <div className="w-full">
            {label && <label htmlFor={id} className="font-normal text-white">{label}</label>}
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                min={min}
                max={max}
                className="mt-1 px-4 bg-[#202020]/20 sm:text-md block w-full p-4 rounded-md border border-[#404040] text-white focus:outline-none text-[13px] placeholder-[#dbd7d7d4]"
            />
        </div>
    );
}; 