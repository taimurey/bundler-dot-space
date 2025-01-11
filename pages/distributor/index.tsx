import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { getHeaderLayout } from '../../components/layouts/HeaderLayout';
import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk';
import { toast } from 'react-toastify';
import { BlockEngineLocation, InputField } from '../../components/FieldComponents/InputField';
import { distributetokens } from '../../components/tokenDistributor/distribute-tokens';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getKeypairFromBs58 } from '../../components/PumpBundler/misc';
import WalletsDrawer from '../../components/common/SideBarDrawer';
import WalletAddressInput, { WalletEntry } from '../../components/PumpBundler/wallet-address-input';

const ZERO = new BN(0);
type BN = typeof ZERO;

export type BalanceType = {
    balance: number;
    publicKey: string;
};

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { connection } = useConnection();

    const [formData, setFormData] = useState<{
        tokenMintAddress: string;
        feePayerWallet: string;
        SendingWallet: string;
        RecievingWallets: string[];
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
    }>({
        tokenMintAddress: '',
        feePayerWallet: '',
        SendingWallet: '',
        RecievingWallets: [],
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2],
    });

    const [wallets, setWallets] = useState<WalletEntry[]>([]);

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const [feePayerBalance, setFeePayerBalance] = React.useState<number | null>(null);

    React.useEffect(() => {
        const fetchBalance = async () => {
            if (formData.feePayerWallet) {
                try {
                    const keypair = getKeypairFromBs58(formData.feePayerWallet);
                    if (keypair) {
                        const balance = await connection.getBalance(keypair.publicKey);
                        setFeePayerBalance(Number((balance / LAMPORTS_PER_SOL).toFixed(2)));
                    }
                } catch (error) {
                    console.error("Failed to fetch balance:", error);
                    setFeePayerBalance(null); // Reset or handle error
                }
            }
        };

        fetchBalance();
    }, [formData.feePayerWallet, connection]);

    const handleSubmission = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();

        // Validate form inputs
        if (formData.tokenMintAddress === '' || formData.feePayerWallet === '' || wallets.length === 0) {
            toast.error('Please upload a CSV file with wallets and provide a token mint address');
            return;
        }

        // Show loading toast
        toast.info('Distributing Tokens...', { autoClose: false });

        try {
            // Call the tokenMultisender function
            const result = await toast.promise(
                distributetokens(connection, {
                    ...formData,
                    RecievingWallets: wallets.map(wallet => wallet.wallet),
                }),
                {
                    success: 'Tokens distributed successfully!',
                    error: 'Error distributing tokens. Please try again.', // Static error message
                }
            );

            // Log the result for debugging
            console.log('Token distribution result:', result);

            // Show success toast
            toast.success('Tokens distributed successfully!');
        } catch (error) {
            // Log the error for debugging
            console.error('Error during token distribution:', error);

            // Show error toast with dynamic error message
            toast.error(`Error distributing tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="mb-8 mx-8 flex mt-8 justify-center items-center relative">
            <form>
                <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                    <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                        <div>
                            <p className='font-bold text-[25px]'>Token Distributor</p>
                            <p className='text-[12px] text-[#96989c]'>Distribute tokens to multiple wallets at once.</p>
                        </div>
                        <div className='w-full'>
                            <InputField
                                id='tokenAddress'
                                label='Token Address'
                                value={formData.tokenMintAddress}
                                onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                placeholder='D5b....ae'
                                type='string'
                                required={false}
                            />
                        </div>
                        {/* <div className='w-full'>
                            <InputField
                                id='feePayerWallet'
                                label='Fee Payer Wallet'
                                subfield={`Fee payer -- Balance: ${feePayerBalance} SOL`}
                                value={formData.feePayerWallet}
                                onChange={(e) => handleChange(e, 'feePayerWallet')}
                                placeholder='D5bBVBQDN....TcNu3yJaeVK5W'
                                type='string'
                                required={false}
                            />
                        </div> */}
                        <div className='flex flex-col gap-2' id="tokeninfo">
                            <h3 className='btn-text-gradient font-bold text-[25px] mt-2'>Wallet Details</h3>
                            <div className='border-dashed border p-4 rounded-lg'>
                                <label className='font-normal'>
                                    <span className='text-lime-500 font-bold'>Sending</span> Wallet
                                    <span className="pl-5 text-[#FFC107] text-[12px] font-normal">( Private Key )</span>
                                </label>

                                <InputField
                                    id='sendingWallets'
                                    label=''
                                    subfield={`Fee payer -- Balance: ${feePayerBalance} SOL`}
                                    value={formData.SendingWallet}
                                    onChange={(e) => handleChange(e, 'SendingWallet')}
                                    placeholder='D5bBVBQDN....TcNu3yJaeVK5W'
                                    type='string'
                                    required={false}
                                />
                                <div className=' rounded-lg mt-5'>
                                    <WalletAddressInput
                                        Mode={1}
                                        wallets={wallets}
                                        setWallets={setWallets}
                                        maxWallets={30}
                                        onChange={(wallets) => {
                                            setFormData(prevState => ({
                                                ...prevState,
                                                RecievingWallets: wallets.map(wallet => wallet.wallet),
                                            }));
                                        }}
                                    />
                                </div>
                            </div>
                            <div className='flex justify-end items-end gap-2 border rounded-lg p-4 mt-4 border-gray-600'>
                                <div className="w-full">
                                    <label className="block mt-5 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                        Transaction Parameter Settings
                                    </label>
                                    <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                        <select
                                            id="BlockEngineSelection"
                                            value={formData.BlockEngineSelection}
                                            onChange={(e) => handleSelectionChange(e, 'BlockEngineSelection')}
                                            required={true}
                                            className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                        >
                                            <option value="" disabled>
                                                Block Engine Location(Closest to you)
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
                                        required={true}
                                    />
                                    <InputField
                                        id="TransactionTip"
                                        value={formData.TransactionTip}
                                        onChange={(e) => handleChange(e, 'TransactionTip')}
                                        placeholder="0.0001"
                                        type="number"
                                        label="Txn Tip (SOL)"
                                        required={true}
                                    />
                                </div>
                            </div>
                            <div className='justify-center'>
                                <button
                                    className="btn-text-gradient btn-normal w-full mt-5"
                                    onClick={handleSubmission}
                                >
                                    Distribute Tokens
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
            <div className='absolute -top-[70px] right-0 h-screen'>
                <WalletsDrawer />
            </div>
        </div>
    );
};

LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "Tokens Distributor");

export default LiquidityHandlerRaydium;