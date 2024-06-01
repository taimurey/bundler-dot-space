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
    const [BundleError, setBundleError] = useState(`Not Available`);
    const [setsideWallets, setdeployerwallets] = useState<Array<{ id: number, name: string, wallet: string, color: string }>>([]);

    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        throw new Error('NFT_STORAGE is not defined');
    }
    const client = new NFTStorage({ token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN });
    const [wallets, setWallets] = useState({
        Wallet1: "",
        Wallet2: "",
    });

    const [formData, setFormData] = useState({
        coinname: '',
        symbol: '',
        deployerPrivateKey: '',
        buyerPrivateKey: '',
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

        if (field === 'deployerPrivateKey') {
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
                deployerPrivateKey: value,
            }));
        }

        if (field === 'buyerPrivateKey') {
            const wallet = (Keypair.fromSecretKey(base58.decode(value)));
            setWallets(prevState => ({
                ...prevState,
                Wallet1: wallet.publicKey.toString(),
            }));

            // Add new wallet to setsideWallets
            setdeployerwallets(prevProfiles => [...prevProfiles, {
                id: prevProfiles.length,
                name: 'Buyer',
                wallet: wallet.toString(),
                color: randomColor(),
            }]);
        }
    };

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

                console.log(wallets);
            }
        });
    }

    const handlesubmission = async (e: any) => {
        e.preventDefault();
        setDeployerWallets([])
        localStorage.removeItem("deployerwallets")

        try {
            setDeployerWallets(setsideWallets)
            localStorage.setItem("deployerwallets", JSON.stringify(setsideWallets))
            toast.info('Please wait, bundle acceptance may take a few seconds');
            const TokenKeypair = Keypair.generate();
            const bundler = await PumpBundler(connection, formData, TokenKeypair);

            toast(
                () => (
                    <BundleToast
                        txSig={bundler}
                        message={'Bundle ID:'}
                    />
                ),
                { autoClose: 5000 }
            );
            toast(
                () => (
                    <TransactionToast
                        txSig={TokenKeypair.publicKey.toString()}
                        message={'AMM ID:'}
                    />
                ),
                { autoClose: 5000 }
            );
            const result = await getBundleStatuses(bundler, formData);
            const confirmationStatus = result.value[0].confirmation_status;
            const err = result.value[0].err;
            setconfirmationstatus(confirmationStatus);
            setBundleError(err);


        } catch (error) {
            console.log('Error:', error);
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 500) {
                    toast.error(`${error.response.data}`);
                } else {
                    toast.error('Error occurred: Please Fill in all the fields');
                }
            } else {
                toast.error('An unknown error occurred');
            }
        }
    };

    const { setDeployerWallets } = useMyContext();

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative">
            <form>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>Pump.Fun Bundle</p>
                                    <p className=' text-[12px] text-[#96989c] '>Create a pumpfun token and ghost wallet buys in one go</p>
                                </div>
                                <div className='w-full'>
                                    <label className="block text-base text-white font-semibold" >
                                        Bundler Mode
                                    </label>


                                    <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                        <select
                                            id="BlockEngineSelection"
                                            value={Mode}
                                            onChange={(e) => setMode(Number(e.target.value))}
                                            required={true}
                                            className="block w-full px-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                        >
                                            <option value="" disabled>
                                                Bundler Mode
                                            </option>
                                            {modeOptions.map((option, index) => (
                                                <option key={index} value={option.value}>
                                                    {option.value} {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                </div>

                                <InputField
                                    id="deployerPrivatekey"
                                    label="Deployer Private Key"
                                    subfield='Coin Funder and First Buyer'
                                    value={formData.deployerPrivateKey}
                                    onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                    placeholder="coin maker - deployer private key + dev buy"
                                    type="password"
                                    required={true}
                                />
                                <div className="relative rounded-md shadow-sm w-full flex gap-2 justify-end">
                                    <div className={Mode === 5 ? 'w-4/5' : 'w-full'}>
                                        <InputField
                                            id='buyerPrivateKey'
                                            label='Buyer Private Key'
                                            subfield={Mode === 5 ? '3 in csv + 1 buyer (🔻) -- or -- 4 in csv' : 'Ghost Bundler'}
                                            value={formData.buyerPrivateKey}
                                            onChange={(e) => handleChange(e, 'buyerPrivateKey')}
                                            placeholder='ghost bundler - buyer private key'
                                            type='password'
                                            required={true}
                                        />
                                    </div>
                                    {Mode === 5 && (
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
                                    )}

                                    {Mode === 5 && (
                                        <button
                                            className='bundler-btn border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                                        >
                                            Download Sample
                                        </button>
                                    )}
                                </div>
                                <div className='flex flex-col gap-2' id="tokeninfo">
                                    <h3 className='btn-text-gradient font-bold text-[25px] mt-2'>Coin Metadata</h3>
                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="coinname"
                                            label="Coin"
                                            subfield='name'
                                            value={formData.coinname}
                                            onChange={(e) => handleChange(e, 'coinname')}
                                            placeholder="Floki..."
                                            type="text"
                                            required={true}
                                        />
                                        <InputField
                                            label="Symbol"
                                            subfield='ticker'
                                            id="tokenMarketID"
                                            value={formData.symbol}
                                            onChange={(e) => handleChange(e, 'tokenMarketID')}
                                            placeholder="FLOKI..."
                                            type="text"
                                            required={true}
                                        />
                                    </div>


                                    <div className="w-full pt-6">
                                        <div className="flex">
                                            <div className="flex-grow flex mt-8  border-white border-dashed border  rounded-md shadow-lg h-full mr-14 items-start justify-center">
                                                {!uploadedImage && (
                                                    <div>
                                                        <div className="flex justify-center " onClick={() => document.getElementById('file_input')?.click()}>
                                                            <ImageUploadIcon />
                                                        </div>
                                                        <input
                                                            className="hidden cursor-pointer"
                                                            aria-describedby="file_input_help"
                                                            id="file_input"
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                        />
                                                        <label
                                                            className="block align-bottom w-full py-1 px-5 text-sm text-white  rounded-lg  cursor-pointer focus:outline-none opacity-100 backdrop-blur-md"
                                                            htmlFor="file_input"
                                                        >
                                                            Upload an Image
                                                        </label>

                                                    </div>
                                                )}
                                                {uploadedImage && (
                                                    <div className="relative flex justify-center h-36 border-y-v3-bg rounded-md">
                                                        <img src={uploadedImage} alt="Uploaded" className="rounded-md object-contain" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex gap-4 w-full">
                                                    <div className="w-full flex flex-col gap-4">
                                                        <UpdatedInputField
                                                            id="websiteUrl"
                                                            label="Extensions"
                                                            subfield='Optional'
                                                            value={formData.websiteUrl}
                                                            onChange={(e) => handleChange(e, 'websiteUrl')}
                                                            placeholder={"website.com..."}
                                                            type="url"
                                                            required={false}
                                                        />
                                                        <UpdatedInputField
                                                            id="twitterUrl"
                                                            label=""
                                                            value={formData.twitterUrl}
                                                            onChange={(e) => handleChange(e, 'twitterUrl')}
                                                            placeholder={"x.com/project..."}
                                                            type="url"
                                                            required={false}
                                                        />
                                                        <UpdatedInputField
                                                            id="telegramUrl"
                                                            label=""
                                                            value={formData.telegramUrl}
                                                            onChange={(e) => handleChange(e, 'telegramUrl')}
                                                            placeholder={"t.me/project..."}
                                                            type="url"
                                                            required={false}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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


                                    <div className='flex justify-end items-end gap-2 border rounded-lg p-4 mt-4 border-gray-600'>

                                        <div className="w-full">
                                            <label className="block mt-5 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                                Block Engine
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
                                            onClick={handlesubmission}

                                        >
                                            <span className="btn-text-gradient font-bold">
                                                {uploading
                                                    ? <span className='btn-text-gradient italic font-i ellipsis'>Uploading Image</span>
                                                    : <>
                                                        Initiate Deployment Sequence
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