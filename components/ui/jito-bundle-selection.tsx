import React, { ChangeEvent, useState } from 'react';
import { InputField } from '@/components/ui/input-field';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from './checkbox';

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
    snipeEnabled: boolean;
    snipeAmount: string;
    setSnipeEnabled?: (value: boolean) => void;
    setSnipeAmount?: (value: string) => void;
}

// 0slot locations
const zeroSlotLocations = [
    // "ny.0slot.trade",
    // "de.0slot.trade",
    "ams.0slot.trade",
    // "jp.0slot.trade",
    // "la.0slot.trade"
];

export const BlockEngineLocation = [
    'amsterdam.mainnet.block-engine.jito.wtf',
    // 'frankfurt.mainnet.block-engine.jito.wtf',
    // 'ny.mainnet.block-engine.jito.wtf',
    // 'tokyo.mainnet.block-engine.jito.wtf'
];



const JitoBundleSelection: React.FC<JitoBundleSelectionProps> = ({
    isJitoBundle,
    setIsJitoBundle,
    formData,
    handleChange,
    handleSelectionChange,
    snipeEnabled,
    snipeAmount,
    setSnipeEnabled,
    setSnipeAmount,
}) => {
    const [bundleProvider, setBundleProvider] = useState<'jito' | '0slot'>('jito');

    const currentLocations = bundleProvider === 'jito' ? BlockEngineLocation : zeroSlotLocations;

    const handleSnipeChange = (e: ChangeEvent<HTMLInputElement>) => {
        handleChange(e, 'snipeAmount');
    };

    const handleSnipeEnabledChange = (checked: boolean) => {
        if (setSnipeEnabled) {
            setSnipeEnabled(checked);
        } else {
            // Fallback to using handleChange if setSnipeEnabled is not provided
            const fakeEvent = {
                target: { value: checked.toString() }
            } as ChangeEvent<HTMLInputElement>;
            handleChange(fakeEvent, 'snipeEnabled');
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2">
                <Switch
                    id="jito-bundle"
                    checked={isJitoBundle}
                    onCheckedChange={setIsJitoBundle}
                />
                <Label htmlFor="jito-bundle" className="font-normal">Use Bundles</Label>
            </div>

            {isJitoBundle && (
                <>
                    <div>
                        <div className="flex items-center space-x-2 mb-3">

                            <button
                                type="button"
                                onClick={() => setBundleProvider('jito')}
                                className={`px-3 py-1 text-xs rounded ${bundleProvider === 'jito'
                                    ? 'bg-[#404040] text-white'
                                    : 'bg-transparent border border-[#404040] text-gray-400'
                                    }`}
                            >
                                Jito
                            </button>
                            <button
                                type="button"
                                onClick={() => setBundleProvider('0slot')}
                                className={`px-3 py-1 text-xs rounded ${bundleProvider === '0slot'
                                    ? 'bg-[#404040] text-white'
                                    : 'bg-transparent border border-[#404040] text-gray-400'
                                    }`}
                            >
                                0slot
                            </button>
                        </div>
                        <div className="flex items-center justify-center space-x-2 gap-4">
                            <span className='flex items-center space-x-2'>
                                <Label htmlFor="snipe-enabled" className="font-normal">Snipe</Label>
                                <Checkbox
                                    id="snipe-enabled"
                                    checked={snipeEnabled}
                                    onCheckedChange={handleSnipeEnabledChange}
                                />
                            </span>
                            <InputField
                                id="snipe-amount"
                                value={snipeAmount}
                                onChange={(e) => handleChange(e, 'snipeAmount')}
                                placeholder="0.01"
                                type="number"
                                label="Snipe Amount"
                                disabled={!snipeEnabled}
                                subfield="SOL"
                                required={snipeEnabled}
                                classNameInput='text-xs'
                                classNameSubfield='text-xs'
                                classNameLabel='text-xs'
                            />
                        </div>
                    </div>

                    <div className='flex flex-col justify-end items-end gap-2'>
                        <div className="w-full">
                            <label className="block mt-2 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                {bundleProvider === 'jito' ? 'Block Engine' : '0slot Location'}
                            </label>
                            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                <select
                                    id="BlockEngineSelection"
                                    value={formData.BlockEngineSelection}
                                    onChange={(e) => handleSelectionChange(e, 'BlockEngineSelection')}
                                    required={isJitoBundle}
                                    className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                >
                                    <option value="" disabled>
                                        {bundleProvider === 'jito' ? 'Block Engine Location' : '0slot Location'}
                                    </option>
                                    {currentLocations.map((option, index) => (
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
                            />
                            <InputField
                                id="TransactionTip"
                                value={formData.TransactionTip}
                                onChange={(e) => handleChange(e, 'TransactionTip')}
                                placeholder="0.00001"
                                type="number"
                                label="Txn Tip"
                                subfield="SOL"
                                required={isJitoBundle}
                            />
                        </div>
                    </div>
                </>
            )}
            {!isJitoBundle && (
                <div className='flex justify-end items-end gap-2'>
                    <InputField
                        id="TransactionTip"
                        value={formData.TransactionTip}
                        onChange={(e) => handleChange(e, 'TransactionTip')}
                        placeholder="0.00001"
                        type="number"
                        label="Txn Tip"
                        subfield="SOL"
                        required={false}
                    />
                </div>
            )}
        </div>
    );
};

export default JitoBundleSelection; 