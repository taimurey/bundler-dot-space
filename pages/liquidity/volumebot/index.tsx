'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { packToBlob } from 'ipfs-car/pack/blob';
import { getHeaderLayout } from '../../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { Keypair } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { BlockEngineLocation, InputField } from '../../../components/FieldComponents/InputField';
import { OutputField } from '../../../components/FieldComponents/OutputField';
import { useSolana } from '../../../components/context';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BundleToast, TransactionToast } from '../../../components/common/Toasts/TransactionToast';
import { useMyContext } from '../../../contexts/Maincontext';
import Allprofiles from '../../../components/common/Allprofiles';
import { NFTStorage } from 'nft.storage';
import { UpdatedInputField } from '../../../components/FieldComponents/UpdatedInputfield';
import ImageUploadIcon from '../../../components/icons/imageuploadIcon';
import Papa from 'papaparse';
import { randomColor } from '../add';
import { getBundleStatuses, PumpBundler } from '../../../components/PumpBundler/PumpBundler';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { set } from 'lodash';
import { distributeRandomly } from '../../../components/randomgen';
import { solDistribution } from '../../../components/SolDistribution';
import { ApibundleSend } from '../../../components/DistributeTokens/bundler';

const ZERO = new BN(0)
type BN = typeof ZERO

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [uploading, setUploading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [airdropChecked, setAirdropChecked] = useState(false);
    const [percentComplete, setPercentComplete] = useState(0);
    const [Mode, setMode] = useState(5);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [confirmationstatus, setconfirmationstatus] = useState(`Pending`);
    const { setDeployerWallets } = useMyContext();
    const [BundleError, setBundleError] = useState(`Not Available`);
    const [wallets, setWallets] = useState<string[]>([]);
    const [setsideWallets, setdeployerwallets] = useState<Array<{ id: number, name: string, wallet: string, color: string }>>([]);

    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        throw new Error('NFT_STORAGE is not defined');
    }
    const client = new NFTStorage({ token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN });


    const [formData, setFormData] = useState({
        coinname: '',
        tokenMintAddress: '',
        solfundingwallet: '',
        walletcount: '',
        buyerextraWallets: [],
        tokenbuyAmount: '',
        uri: uploadedImageUrl,
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
            const wallet = (Keypair.fromSecretKey(base58.decode(value)));
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
        let wallets = [];
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


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        handleChange(e, "uploadedImage")
        console.log(file, "filee");

        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result as string;
                setUploadedImage(base64Image);

                // Set the uploading state to true
                setUploading(true);

                try {
                    // Pack the image into a CAR file
                    const { car } = await packToBlob({
                        input: [file],
                        wrapWithDirectory: false,
                    });

                    // Upload the CAR file to NFT.Storage
                    const cid = await client.storeCar(car, {
                        onStoredChunk: (size) => {
                            // Update the upload progress
                            setPercentComplete((prevPercentComplete) => prevPercentComplete + size);
                        },
                    });


                    // Convert the IPFS URL to a HTTP URL
                    const httpUrl = `https://nftstorage.link/ipfs/${cid}`;

                    // Set the uploadedImage state variable to the HTTP URL of the uploaded image
                    setUploadedImage(httpUrl);
                    console.log(httpUrl);
                    setUploadedImageUrl(httpUrl);
                } catch (error) {
                    console.error('Error uploading file:', error);
                } finally {
                    // Set the uploading state to false
                    setUploading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) {
            return;
        }
        const file = event.target.files[0];

        Papa.parse<string[]>(file, {
            complete: function (results) {
                const wallets = results.data.map(row => row[1]);
                wallets.forEach((element: string) => {
                    if (element === '') {
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
                console.log(wallets);
            }
        });
    }

    const walletsfunder = async (e: any) => {
        const csvwallets = wallets;

        const randomAmount = distributeRandomly(Number(formData.tokenbuyAmount), csvwallets.length, 0.01, 10);
        const keypairs = csvwallets.map(wallet => Keypair.fromSecretKey(base58.decode(wallet)));
        const solbundle = await solDistribution(connection, Keypair.fromSecretKey(base58.decode(formData.solfundingwallet)), keypairs, randomAmount, Number(formData.BundleTip));

        const EncodedbundledTxns = solbundle.map(txn => base58.encode(txn.serialize()));
        const bundledata = {
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [EncodedbundledTxns]
        };

        try {
            const response = await ApibundleSend(bundledata, formData.BlockEngineSelection);
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




    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative">
            <form>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>Raydium AMM Volume</p>
                                    <p className=' text-[12px] text-[#96989c] '>Generate volume on the token using csv wallets
                                    </p>
                                </div>
                                <div className="relative rounded-md shadow-sm w-full flex gap-2 justify-end">
                                    <div className={Mode === 5 ? 'w-4/5' : 'w-full'}>
                                        <InputField
                                            id='walletcount'
                                            label='Wallet Count'
                                            subfield={'Generate Wallets and download in CSV format'}
                                            value={formData.walletcount}
                                            onChange={(e) => handleChange(e, 'walletcount')}
                                            placeholder='40...'
                                            type='string'
                                            required={true}
                                        />
                                    </div>
                                    {Mode === 5 && (
                                        <button
                                            className='bundler-btn border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                                            onClick={generatewallets}
                                        >
                                            Download Generated Wallets
                                        </button>
                                    )}
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
                                            label="Pool ID"
                                            subfield='address'
                                            id="mintAddress"
                                            value={formData.tokenMintAddress}
                                            onChange={(e) => handleChange(e, 'mintAddress')}
                                            placeholder="D5bBV....eVK7K"
                                            type="text"
                                            required={true}
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
                                        required={true}
                                    />
                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="tokenbuyAmount"
                                            label="Buy Amount"
                                            subfield='sol'
                                            value={formData.tokenbuyAmount}
                                            onChange={(e) => handleChange(e, 'tokenbuyAmount')}
                                            placeholder="First Buy Amount"
                                            type="number"
                                            required={true}
                                        />
                                        <button
                                            className='bundler-btn border py-2 font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
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
                                            disabled={uploading}
                                            type="submit"
                                            id="formbutton"

                                        >
                                            <span className="btn-text-gradient font-bold">
                                                {uploading
                                                    ? <span className='btn-text-gradient italic font-i ellipsis'>Uploading Image</span>
                                                    : <>
                                                        Start Generating Volume
                                                        <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(0.25 Bundler Cost)</span>
                                                    </>
                                                }
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="min-w-[44px] p-4 bg-[#0c0e11] border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
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
                                            {Object.entries(wallets).map(([key, value], index) => {
                                                const truncatedValue = value.length > 10
                                                    ? value.slice(0, 6) + '...' + value.slice(-10)
                                                    : value;
                                                return (
                                                    <p
                                                        key={index}
                                                        className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px] max-w-[300px]"
                                                    >
                                                        {key}: <span className="bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold">{truncatedValue}</span>
                                                    </p>
                                                );
                                            })}
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
                                        id='bundlestatus'
                                        label='Bundle Status'
                                        value={confirmationstatus}
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
                    </div>
                </div>
            </form >
            <div className='absolute -top-[70px] right-0 h-screen'>
                <Allprofiles />
            </div>
        </div >
    );
}

const modeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 5, label: "Wallet Mode" },
];




LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "Manage Liquidity");

export default LiquidityHandlerRaydium;