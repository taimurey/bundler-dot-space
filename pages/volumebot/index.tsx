'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { getHeaderLayout } from '../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { OutputField } from '../../components/FieldComponents/OutputField';
import { useSolana } from '../../components/context';
import { toast } from 'react-toastify';
import { BundleToast } from '../../components/common/Toasts/TransactionToast';
import Papa from 'papaparse';
import { randomColor } from '../raydium/create';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { distributeRandomly } from '../../components/randomgen';
import { solDistribution } from '../../components/SolDistribution';
import { ApibundleSend } from '../../components/DistributeTokens/bundler';
import { PumpVolumeGenerator } from '../../components/PumpBundler/volumeGenerator';
import { useMyContext } from '../../contexts/Maincontext';
import { BlockEngineLocation, InputField } from '../../components/FieldComponents/InputField';
import { getKeypairFromBs58 } from '../../components/PumpBundler/misc';
import WalletsDrawer, { truncate } from '../../components/common/SideBarDrawer';

const ZERO = new BN(0)
type BN = typeof ZERO

export type BalanceType = {
    balance: number;
    publicKey: string;
    tokenAmount?: string;
};

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [airdropChecked, setAirdropChecked] = useState(false);
    const [Mode, setMode] = useState(`RaydiumAMM Volume`);
    const { setDeployerWallets } = useMyContext();
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [BundleError, setBundleError] = useState(`Not Available`);
    const [wallets, setWallets] = useState<string[]>([]);
    const [setsideWallets, setdeployerwallets] = useState<Array<{ id: number, name: string, wallet: string, color: string }>>([]);
    // const [loop, setLoop] = useState(false);
    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        throw new Error('NFT_STORAGE is not defined');
    }

    const [formData, setFormData] = useState({
        coinname: '',
        tokenMintAddress: '',
        solfundingwallet: '',
        walletcount: '',
        buyerextraWallets: [],
        tokenbuyAmount: '',
        websiteUrl: '',
        twitterUrl: '',
        telegramUrl: '',
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2],
    });

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }


    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));

        //handle airdropChecked
        if (field === 'airdropChecked') {
            setAirdropChecked(airdropChecked);
        }

        if (field === 'solfundingwallet') {
            const wallet = (Keypair.fromSecretKey(new Uint8Array(base58.decode(value))));
            setWallets(prevState => ({
                ...prevState,
                Wallet2: wallet.publicKey.toString(),
            }));
            // Add new wallet to setsideWallets
            setdeployerwallets(prevProfiles => [...prevProfiles, {
                id: prevProfiles.length,
                name: 'Deployer',
                wallet: base58.encode(wallet.secretKey), // Use JSON.stringify instead of toString
                color: randomColor(),
            }]);
            setFormData(prevState => ({
                ...prevState,
                solfundingwallet: value,
            }));
        }
    };

    //generate wallets and write them to a csv file
    const generatewallets = () => {
        const wallets = [];
        for (let i = 0; i < Number(formData.walletcount); i++) {
            const keypair = Keypair.generate();
            wallets.push({
                id: i,
                wallet: bs58.encode(keypair.secretKey),
            });
        }
        //write to a csv file using papaparse
        const csv = Papa.unparse(wallets);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'wallets.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    React.useEffect(() => {
        const fetchBalances = async () => {
            const balances = await Promise.all(
                Object.entries(wallets).map(async ([key, value]) => {
                    try {
                        console.log(key);
                        const keypair = getKeypairFromBs58(value)!;
                        const balance = await connection.getBalance(keypair.publicKey);
                        return { balance, publicKey: keypair.publicKey.toString() };
                    } catch (error) {
                        console.error("Error decoding or fetching balance for wallet:", value, error);
                        return null; // Return null or some other placeholder to indicate failure
                    }
                })
            );
            // Filter out any null values resulting from errors
            const validBalances = balances.filter(balance => balance !== null);
            setBalances(validBalances.map((balance: any) => ({ balance: balance.balance, publicKey: balance.publicKey })));
        };

        fetchBalances();
    }, [wallets]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) {
            return;
        }
        const file = event.target.files[0];

        Papa.parse<string[]>(file, {
            complete: function (results) {
                //skip the first row
                const wallets = results.data.slice(1).map(row => row[1]);
                wallets.shift();
                wallets.forEach((element: string) => {
                    if (element === '' || element === 'wallet') {
                        return;
                    }

                    setdeployerwallets(prevProfiles => [...prevProfiles, {
                        id: prevProfiles.length,
                        name: 'Buyer',
                        wallet: element,
                        color: randomColor(),
                    }]);
                });
                toast.success('Wallets Loaded Successfully')
                setDeployerWallets(setsideWallets)
                localStorage.setItem("deployerwallets", JSON.stringify(setsideWallets));
                setWallets(wallets);
            }
        });
    }

    const walletsfunder = async (e: any) => {
        e.preventDefault();
        // Ensure wallets is always treated as an array
        const walletsArray = Array.isArray(wallets) ? wallets : [];

        if (walletsArray.length === 0 || formData.tokenbuyAmount === '' || formData.solfundingwallet === '') {
            toast.error('Please upload a csv file with wallets');
            return;
        }

        const randomAmount = distributeRandomly(Number(formData.tokenbuyAmount) * LAMPORTS_PER_SOL, walletsArray.length, (0.0001 * LAMPORTS_PER_SOL), (2 * LAMPORTS_PER_SOL));
        toast.info(`Distributing ${formData.tokenbuyAmount} sol to ${walletsArray.length} wallets`);
        const keypairs = walletsArray.map(wallet => Keypair.fromSecretKey(base58.decode(wallet)));
        const solbundle = await solDistribution(connection, Keypair.fromSecretKey(base58.decode(formData.solfundingwallet)), keypairs, randomAmount, Number(formData.BundleTip));

        const EncodedbundledTxns = solbundle.map(txn => base58.encode(txn.serialize()));


        try {
            const response = await ApibundleSend(EncodedbundledTxns, formData.BlockEngineSelection);
            const bundleId = response.result;
            toast(
                () => (
                    <BundleToast
                        txSig={bundleId}
                        message={'Bundle ID:'}
                    />
                ),
                { autoClose: 5000 }
            );
        } catch (error: any) {
            toast.error(`Error sending bundle: ${error}`);
        }
    }

    const volumeBot = async (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        e.preventDefault();
        if (formData.tokenMintAddress === '' || wallets.length === 0 || formData.solfundingwallet === '' || formData.tokenbuyAmount === '' || formData.BlockEngineSelection === '' || formData.BundleTip === '' || formData.TransactionTip === ''

        ) {
            toast.error('Please upload a csv file with wallets and provide a token mint address');
            return;
        }
        // setLoop(true);
        if (Mode === "RaydiumAMM Volume") {
            toast.info(`Not available Yet`);

            // wallets.map(async (wallet, index) => {
            //     setCount(index);
            //     const keypair = Keypair.fromSecretKey(base58.decode(wallet));

            //     // try {
            //     //     const poolkeys = formatAmmKeysById(formData.tokenMintAddress);
            //     //     const InputTokenAmount  = new TokenAmount(new Currency(6, 'RAY', 'Raydium'), new BN(1)
            //     //     const txn = await build_swap_instructions({  connection, poolkeys, tokenAccountRawInfos_Swap, inputTokenAmount, new BN(1) }, keypair.publicKey)
            //     // } catch (error: any) {
            //     //     setBundleError(error);
            //     //     toast.error(`Error sending bundle: ${error}`);
            //     // }
            // })


        }
        else if (Mode === "Pump.Fun Volume") {
            toast.info(`Generating Volume on Pump.Fun`);
            const fundingWallet = Keypair.fromSecretKey(base58.decode(formData.solfundingwallet));
            wallets.map(async (wallet) => {
                const keypair = Keypair.fromSecretKey(base58.decode(wallet));

                try {
                    const txn = await PumpVolumeGenerator(connection, fundingWallet, keypair, formData.tokenMintAddress, formData.BlockEngineSelection, formData.BundleTip);
                    toast(
                        () => (
                            <BundleToast
                                txSig={txn}
                                message={'Bundle ID:'}
                            />
                        ),
                        { autoClose: 5000 }
                    )
                } catch (error: any) {
                    setBundleError(error);
                    toast.error(`Error sending bundle: ${error}`);
                }
            })
        }
    }

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative">
            <form>
                <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                    <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                        <div>
                            <p className='font-bold text-[25px]'>Raydium AMM Volume</p>
                            <p className=' text-[12px] text-[#96989c] '>Generate volume on the token using csv wallets
                            </p>
                        </div>
                        <label className="block mt-5 text-base text-white font-semibold" >
                            Volume Mode
                        </label>
                        <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                            <select
                                id="BlockEngineSelection"
                                value={Mode}
                                onChange={(e) => setMode(e.target.value)}
                                required={true}
                                className="block w-full px-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                            >
                                <option value="" disabled>
                                    Volume Mode
                                </option>
                                {modeOptions.map((option, index) => (
                                    <option key={index} value={option.label}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="relative rounded-md shadow-sm w-full flex gap-2 justify-end">
                            <div className='w-4/5'>
                                <InputField
                                    id='walletcount'
                                    label='Wallet Count'
                                    subfield={'Generate Wallets and download in CSV format'}
                                    value={formData.walletcount}
                                    onChange={(e) => handleChange(e, 'walletcount')}
                                    placeholder='40...'
                                    type='string'
                                    required={false}
                                />
                            </div>
                            <button
                                className='bundler-btn border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                                onClick={generatewallets}
                            >
                                Download Generated Wallets
                            </button>
                        </div>
                        <div className='flex flex-col gap-2' id="tokeninfo">
                            <h3 className='btn-text-gradient font-bold text-[25px] mt-2'>Generate Volume</h3>
                            <div className='flex justify-center items-center gap-2'>
                                <div>
                                    <InputField
                                        id='walletsNumbers'
                                        placeholder='27'
                                        label='Upload Wallets'
                                        subfield='csv file'
                                        required={true}
                                        type="file"
                                        onChange={handleFileUpload}
                                    />
                                </div>

                                <InputField
                                    label={Mode === "RaydiumAMM Volume" ? "Pool ID" : "Token Address"}
                                    subfield='address'
                                    id="mintAddress"
                                    value={formData.tokenMintAddress}
                                    onChange={(e) => handleChange(e, 'tokenMintAddress')}
                                    placeholder="D5bBV....eVK7K"
                                    type="text"
                                    required={false}
                                />
                            </div>
                            <InputField
                                id="solfundingwallet"
                                label="Funding Wallet"
                                subfield='Fund sol to the wallets'
                                value={formData.solfundingwallet}
                                onChange={(e) => handleChange(e, 'solfundingwallet')}
                                placeholder="Keypair to Fund sol to the uploaded wallets in the csv"
                                type="password"
                                required={false}
                            />
                            <div className='flex justify-center items-center gap-2'>
                                <InputField
                                    id="tokenbuyAmount"
                                    label="Funding Amount"
                                    subfield='amount to distribute in csv wallets'
                                    value={formData.tokenbuyAmount}
                                    onChange={(e) => handleChange(e, 'tokenbuyAmount')}
                                    placeholder="10..."
                                    type="number"
                                    required={false}
                                />
                                <button
                                    className='bundler-btn border py-2 font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                                    onClick={walletsfunder}
                                >
                                    Fund Wallets
                                </button>
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
                                            className="block w-full px-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
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
                                    className="text-center hover:shadow-xl hover:shadow-black/50 w-full border border-[#476e34] rounded-md invoke-btn "
                                    onClick={volumeBot}
                                >
                                    Start Generating Volume
                                </button>
                            </div>
                            {/* <div className='justify-center flex gap-2'>
                                <button
                                    className="text-center hover:shadow-xl hover:shadow-black/50 w-1/2 border rounded-2xl font-bold py-2 hover:border-[#ff0000] flex justify-center items-center border-[#70616e71] text-[16px] duration-200 ease-in-out"
                                    onClick={walletsfunder}
                                >
                                    <span className="btn-text-gradient font-bold">
                                        {loop ? count : "Stop Generating Volume"}
                                    </span>
                                </button>
                            </div> */}
                        </div>
                    </div>
                    <div className="min-w-[50px] p-4 bg-[#0c0e11] border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
                        <div>
                            <div>
                                <p className='font-bold text-[25px]'>Predicted Parameters</p>
                                <p className=' text-[12px] text-[#96989c] '>Here are the predicted parameters based on your input.</p>
                            </div>
                            <div className='w-full'>
                                <label className="block mt-5 text-base text-white font-semibold" >
                                    Wallets:
                                </label>
                                <br />
                                <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end">
                                    {balances.map(({ balance, publicKey }, index) => (
                                        <p
                                            key={index}
                                            className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px] max-w-[300px]"
                                        >
                                            {index + 1}: <span className="bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold">{truncate(publicKey, 5, 6)}</span>
                                            <br />
                                            Balance: {balance}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <OutputField
                                id="totalmintaddress"
                                label="Mint Address:"
                                value={formData.coinname}
                                latedisplay={true}
                            />
                            <OutputField
                                id="buyamount"
                                label="Buy Amount"
                                value={`${formData.tokenbuyAmount && formData.tokenbuyAmount !== '0' ? `${formData.tokenbuyAmount} sol` : formData.tokenbuyAmount}`}
                                latedisplay={true}

                            />
                            <OutputField
                                id='bundleError'
                                label='Bundle Error'
                                value={BundleError}
                                latedisplay={true}
                            />


                        </div>
                    </div>
                </div>
            </form >
            <div className='absolute -top-[70px] right-0 h-screen'>
                <WalletsDrawer />
            </div>
        </div >
    );
}
const modeOptions = [
    { id: 0, label: "RaydiumAMM Volume" },
    { id: 1, label: "Pump.Fun Volume" },
];




LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "Volume Generator");

export default LiquidityHandlerRaydium;