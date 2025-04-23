import React, { ChangeEvent } from 'react';
import { InputField, BlockEngineLocation } from '@/components/ui/input-field';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface JitoBundleSelectionProps {
    isJitoBundle: boolean;
    setIsJitoBundle: (value: boolean) => void;
    formData: {
        BlockEngineSelection: string;
        BundleTip: string;
        TransactionTip: string;
    };
    handleChange: (e: ChangeEvent<HTMLInputElement>, field: string) => void;
    handleSelectionChange: (e: ChangeEvent<HTMLSelectElement>, field: string) => void;
}

const JitoBundleSelection: React.FC<JitoBundleSelectionProps> = ({
    isJitoBundle,
    setIsJitoBundle,
    formData,
    handleChange,
    handleSelectionChange,
}) => {
    return (
        <div className="space-y-3 border border-gray-600 rounded-lg p-4 mt-2">
            <div className="flex items-center space-x-2">
                <Switch
                    id="jito-bundle"
                    checked={isJitoBundle}
                    onCheckedChange={setIsJitoBundle}
                />
                <Label htmlFor="jito-bundle" className="font-normal">Use Jito Bundles</Label>
            </div>

            <div className='flex justify-end items-end gap-2'>
                <div className="w-full">
                    <label className="block mt-2 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                        Block Engine
                    </label>
                    <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                        <select
                            id="BlockEngineSelection"
                            value={formData.BlockEngineSelection}
                            onChange={(e) => handleSelectionChange(e, 'BlockEngineSelection')}
                            required={isJitoBundle}
                            disabled={!isJitoBundle}
                            className={`block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500 ${!isJitoBundle ? 'opacity-50' : ''}`}
                        >
                            <option value="" disabled>
                                Block Engine Location (Closest to you)
                            </option>
                            {BlockEngineLocation.map((option, index) => (
                                <option key={index} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className='flex justify-end items-end gap-2'>
                    <InputField
                        id="BundleTip"
                        value={formData.BundleTip}
                        onChange={(e) => handleChange(e, 'BundleTip')}
                        placeholder="0.01"
                        type="number"
                        label="Bundle Tip"
                        subfield="SOL"
                        required={isJitoBundle}
                        disabled={!isJitoBundle}
                    />
                    <InputField
                        id="TransactionTip"
                        value={formData.TransactionTip}
                        onChange={(e) => handleChange(e, 'TransactionTip')}
                        placeholder="0.0001"
                        type="number"
                        label="Txn Tip"
                        subfield="SOL"
                        required={isJitoBundle}
                        disabled={!isJitoBundle}
                    />
                </div>
            </div>
            {!isJitoBundle && (
                <div className='flex justify-end items-end gap-2'>
                    <InputField
                        id="TransactionTip"
                        value={formData.TransactionTip}
                        onChange={(e) => handleChange(e, 'TransactionTip')}
                        placeholder="0.0001"
                        type="number"
                        label="Txn Tip"
                        subfield="SOL"
                        required={isJitoBundle}
                        disabled={isJitoBundle}
                    />
                </div>
            )}
        </div>
    );
};

export default JitoBundleSelection; 