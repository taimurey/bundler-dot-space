'use client';

import pumpIdl from "../pump-idl.json";
import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import { packToBlob } from 'ipfs-car/pack/blob';
import { getHeaderLayout } from '../../../components/layouts/HeaderLayout';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { BlockEngineLocation, InputField } from '../../../components/FieldComponents/InputField';
import { useSolana } from '../../../components/context';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BundleToast, TransactionToast } from '../../../components/common/Toasts/TransactionToast';
import { useMyContext } from '../../../contexts/Maincontext';
import { NFTStorage } from 'nft.storage';
import { UpdatedInputField } from '../../../components/FieldComponents/UpdatedInputfield';
import ImageUploadIcon from '../../../components/icons/imageuploadIcon';
import Papa from 'papaparse';
import { randomColor } from '../../raydium/create';
import { PumpBundler } from '../../../components/PumpBundler/PumpBundler';
import { BalanceType } from "../../volumebot";
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { AnchorProvider, Idl, Program } from '@coral-xyz/anchor';
import { GLOBAL_STATE, PUMP_PROGRAM_ID } from '../../../components/PumpBundler/constants';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { calculateBuyTokensAndNewReserves } from "../../../components/PumpBundler/misc";
import WalletsDrawer, { truncate } from "../../../components/common/SideBarDrawer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface WorkerResult {
    secretKey: Uint8Array;
    publicKey: string;
}

const ZERO = new BN(0)
type BN = typeof ZERO

export const PROGRAMIDS = MAINNET_PROGRAM_ID;

const LiquidityHandlerRaydium = () => {
    const { cluster } = useSolana();
    const { setDeployerWallets } = useMyContext();
    const connection = new Connection(cluster.endpoint);
    const [uploading, setUploading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [Mode, setMode] = useState(1);
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [wallets, setWallets] = useState<string[]>([]);
    const [devMaxSolPercentage, setDevMaxSolPercentage] = React.useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [buyerMaxSolPercentage, setbuyerMaxSolPercentage] = React.useState('');

    const [setsideWallets, setdeployerwallets] = useState<Array<{ id: number, name: string, wallet: string, color: string }>>([]);

    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        throw new Error('NFT_STORAGE is not defined');
    }
    const client = new NFTStorage({ token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN });


    const [formData, setFormData] = useState<{
        coinname: string;
        symbol: string;
        tokenDescription: string;
        vanity: string;
        threads: number;
        tokenKeypair: string;
        tokenKeypairpublicKey: string;
        deployerPrivateKey: string;
        buyerPrivateKey: string;
        buyerextraWallets: string[];
        BuyertokenbuyAmount: string;
        DevtokenbuyAmount: string;
        websiteUrl: string;
        twitterUrl: string;
        telegramUrl: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
    }>({
        coinname: '',
        symbol: '',
        tokenDescription: '',
        vanity: '',
        threads: 4,
        tokenKeypair: '',
        tokenKeypairpublicKey: '',
        deployerPrivateKey: '',
        buyerPrivateKey: '',
        buyerextraWallets: [],
        BuyertokenbuyAmount: '',
        DevtokenbuyAmount: '',
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

        if (field === 'deployerPrivateKey') {
            let wallet: Keypair;
            try {
                wallet = (Keypair.fromSecretKey(new Uint8Array(base58.decode(value))));

            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }


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
            const wallet = ((Keypair.fromSecretKey(new Uint8Array(base58.decode(value)))));
            // setWallets([value]);

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
                            console.log('Stored', size);
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
    const NUM_WORKERS = formData.threads;

    const vanityAddressGenerator = async (e: any) => {
        e.preventDefault();

        setIsLoading(true); // Start showing the loading SVG

        const workers = Array.from({ length: NUM_WORKERS }, () =>
            new Worker(new URL('../../../components/vanityWorker', import.meta.url))
        );

        const promises = workers.map((worker) =>
            new Promise((resolve, reject) => {
                worker.onmessage = (event) => {
                    resolve(event.data);
                    worker.terminate();
                };
                worker.onerror = reject;
                worker.postMessage(formData.vanity);
            })
        );

        try {
            const result = await Promise.race(promises) as WorkerResult; // Wait for the fastest worker
            setFormData(prevState => ({
                ...prevState,
                tokenKeypair: bs58.encode(Buffer.from(result.secretKey)),
                tokenKeypairpublicKey: result.publicKey,
            }));
        } catch (error) {
            console.error('Error generating vanity address:', error);
        } finally {
            setIsLoading(false); // Stop showing the loading SVG
        }
    }


    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) {
            toast.error('No file selected');
            return;
        }
        const file = event.target.files[0];

        Papa.parse<string[]>(file, {
            complete: function (results) {
                //skip the first row
                const wallets = results.data.slice(1).map(row => row[1]);

                const walletset: string[] = [];
                wallets.forEach((element: string) => {
                    if (element === '' || element === 'wallet' || element === undefined) {
                        return;
                    }
                    try {
                        Keypair.fromSecretKey(new Uint8Array(bs58.decode(element)));
                        walletset.push(element);
                    } catch (err) {
                        toast.error(`Invalid wallet address: ${element}`);
                    }
                });
                if (walletset.length > 0) {
                    toast.success('Wallets Loaded Successfully')
                    setWallets(walletset);
                    setFormData(prevState => ({
                        ...prevState,
                        Wallets: walletset,
                    }));
                }
            },
            error: function (err) {
                toast.error(`An error occurred while parsing the file: ${err.message}`);
            }
        });
    }

    const handlesubmission = async (e: any) => {
        e.preventDefault();
        setDeployerWallets([])
        localStorage.removeItem("deployerwallets")

        const TokenMetadata: any = {
            "name": formData.coinname,
            "symbol": formData.symbol,
            "image": uploadedImageUrl,
            "creator": {
                "name": "Bundler Space",
                "site": "https://bundler.space"
            }
        };
        // Conditionally add description if it exists
        if (formData.tokenDescription) {
            TokenMetadata.description = formData.tokenDescription;
        }

        // Directly add website, twitter, and telegram if they exist
        if (formData.websiteUrl) {
            TokenMetadata.website = formData.websiteUrl;
        }
        if (formData.twitterUrl) {
            TokenMetadata.twitter = formData.twitterUrl;
        }
        if (formData.telegramUrl) {
            TokenMetadata.telegram = formData.telegramUrl;
        }

        setDeployerWallets(setsideWallets)
        localStorage.setItem("deployerwallets", JSON.stringify(setsideWallets))
        toast.info('Please wait, bundle acceptance may take a few seconds');

        const TokenKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.tokenKeypair)));
        let bundler = '';
        try {
            bundler = await PumpBundler(connection, formData, TokenKeypair, TokenMetadata);

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
                        message={'Mint:'}
                    />
                ),
                { autoClose: 5000 }
            );
        } catch (error) {
            console.log('Error:', error);
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 500) {
                    toast.error(`${error.response.data}`);
                } else {
                    toast.error('Unknown error occurred');
                }
            } else if (error instanceof Error) {
                const errorMessage = error.message;
                const jsonStart = errorMessage.indexOf('{');
                if (jsonStart !== -1) {
                    const errorJsonStr = errorMessage.slice(jsonStart);
                    try {
                        const errorData = JSON.parse(errorJsonStr);
                        toast.error(errorData.error);
                    } catch (e) {
                        toast.error(errorMessage);
                    }
                } else {
                    toast.error(errorMessage);
                }
            } else {
                toast.error('An unknown error occurred');
            }
        }
    }

    const DownloadSample = () => {
        const file = ("/sample_wallets.csv")
        const link = document.createElement('a');
        link.href = file;
        link.download = 'sample_wallets.csv';
        link.click();

    }

    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: BalanceType[] = [];

            if (formData.deployerPrivateKey) {
                const deployerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.deployerPrivateKey)));
                const balance = parseFloat((await connection.getBalance(deployerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                allBalances.push({ balance, publicKey: deployerWallet.publicKey.toString() });
            }

            if (formData.buyerPrivateKey) {
                const buyerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.buyerPrivateKey)));
                const balance = parseFloat((await connection.getBalance(buyerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                allBalances.push({ balance, publicKey: buyerWallet.publicKey.toString() });
            }

            const balances = await Promise.all(
                Object.entries(wallets).map(async ([key, value]) => {
                    try {
                        console.log('value:', key);
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(value)));
                        const balance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                        return { balance, publicKey: keypair.publicKey.toString() };

                    }
                    catch (error) {
                        toast.error(`Error fetching balance: ${error}`);
                        return { balance: 0, publicKey: 'Invalid' };
                    }
                })
            );

            setFormData(prevState => ({
                ...prevState,
                buyerextraWallets: wallets,
            }));

            allBalances = [...allBalances, ...balances];
            setBalances(allBalances);
        };

        fetchBalances();
    }, [wallets, formData.deployerPrivateKey, formData.buyerPrivateKey]);

    React.useEffect(() => {
        const amountsCalculation = async () => {
            const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(Keypair.generate()), AnchorProvider.defaultOptions()));

            const globalStateData = await pumpProgram.account.global.fetch(GLOBAL_STATE);
            const tempBondingCurveData = {
                virtualTokenReserves: globalStateData.initialVirtualTokenReserves,
                virtualSolReserves: globalStateData.initialVirtualSolReserves,
                realTokenReserves: globalStateData.initialRealTokenReserves,
            }
            const devBuyQuote = calculateBuyTokensAndNewReserves(new BN(Number(formData.DevtokenbuyAmount) * (LAMPORTS_PER_SOL)), tempBondingCurveData);
            const devMaxSolPercentage = ((devBuyQuote.tokenAmount.toNumber() / 1000000) / 1000000000) * 100;

            setDevMaxSolPercentage(devMaxSolPercentage.toFixed(2));
        }

        amountsCalculation();

    }, [formData.DevtokenbuyAmount]);

    React.useEffect(() => {
        const amountsCalculation = async () => {
            const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(Keypair.generate()), AnchorProvider.defaultOptions()));

            const globalStateData = await pumpProgram.account.global.fetch(GLOBAL_STATE);
            const tempBondingCurveData = {
                virtualTokenReserves: globalStateData.initialVirtualTokenReserves,
                virtualSolReserves: globalStateData.initialVirtualSolReserves,
                realTokenReserves: globalStateData.initialRealTokenReserves,
            }
            const devBuyQuote = calculateBuyTokensAndNewReserves(new BN(Number(formData.BuyertokenbuyAmount) * (LAMPORTS_PER_SOL)), tempBondingCurveData);

            const devMaxSolPercentage = ((devBuyQuote.tokenAmount.toNumber() / 1000000) / 1000000000) * 100;

            setbuyerMaxSolPercentage(devMaxSolPercentage.toFixed(2));
        }

        amountsCalculation();
    }, [formData.BuyertokenbuyAmount]);


    React.useEffect(() => {
        const tokenMint = Keypair.generate();
        setFormData(prevState => ({
            ...prevState,
            tokenKeypairpublicKey: tokenMint.publicKey.toBase58(),
            tokenKeypair: bs58.encode(tokenMint.secretKey),
        }));
    }, []);

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative">
            <form>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] bg-opacity-70 border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
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
                                <div className='flex justify-center items-center gap-2'>
                                    <InputField
                                        id="tokenmintKeypair"
                                        label="Token Address"
                                        subfield='token Address to be deployed'
                                        value={formData.tokenKeypairpublicKey}
                                        onChange={(e) => handleChange(e, 'tokenKeypairpublicKey')}
                                        placeholder="Mint Token Address"
                                        type="text"
                                        disabled={true}
                                        required={false}
                                    />
                                    <div className="w-4/12 flex">
                                        <div>
                                            <InputField
                                                id="vanity"
                                                label="Prefix"
                                                value={formData.vanity}
                                                onChange={(e) => handleChange(e, 'vanity')}
                                                placeholder="pump.."
                                                type="text"
                                                required={false}
                                            />
                                        </div>
                                        <div className="w-1/2 pl-2">
                                            <InputField
                                                id="threads"
                                                label="Threads"
                                                value={formData.threads.toString()}
                                                onChange={(e) => handleChange(e, 'threads')}
                                                placeholder="4"
                                                type="number"
                                                required={false}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        className='bundler-btn border p-2 w-1/3 font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out'
                                        onClick={vanityAddressGenerator}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="italic font-i ellipsis">Generating..</span>
                                                <FontAwesomeIcon icon="spinner" />
                                            </>
                                        ) : (
                                            'Generate'
                                        )}
                                    </button>
                                </div>
                                <InputField
                                    id="deployerPrivatekey"
                                    label="Deployer Private Key"
                                    subfield='Coin Funder and First Buyer'
                                    value={formData.deployerPrivateKey}
                                    onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                    placeholder="deployer private key - coin maker + dev buy"
                                    type="password"
                                    required={true}
                                />
                                {Mode === 1 && (
                                    <div className='w-full'>
                                        <InputField
                                            id='buyerPrivateKey'
                                            label='Buyer Private Key'
                                            subfield='Ghost Bundler'
                                            value={formData.buyerPrivateKey}
                                            onChange={(e) => handleChange(e, 'buyerPrivateKey')}
                                            placeholder='ghost bundler - buyer private key'
                                            type='password'
                                            required={true}
                                        />
                                    </div>)}
                                <div className="relative rounded-md shadow-sm w-full flex gap-2 justify-end">
                                    {Mode === 5 && (
                                        <div>
                                            <InputField
                                                id='walletsNumbers'
                                                placeholder='27'
                                                label='Upload Wallets'
                                                subfield='csv file - Max 4'
                                                required={true}
                                                type="file"
                                                onChange={handleFileUpload}
                                            />
                                        </div>
                                    )}
                                    {Mode === 5 && (
                                        <button
                                            className='bundler-btn border font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out w-4/12'
                                            onClick={() => DownloadSample()}>
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
                                            onChange={(e) => handleChange(e, 'symbol')}
                                            placeholder="FLOKI..."
                                            type="text"
                                            required={true}
                                        />
                                    </div>
                                    <InputField
                                        id="tokendescription"
                                        label="Description"
                                        subfield='bla bla bla...'
                                        value={formData.tokenDescription}
                                        onChange={(e) => handleChange(e, 'tokenDescription')}
                                        placeholder="..."
                                        type="text"
                                        required={false}
                                    />

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
                                        id="DevtokenbuyAmount"
                                        label={`Dev Buy Amount`}
                                        subfield={`${formData.DevtokenbuyAmount} Supply: ${devMaxSolPercentage}%`}
                                        value={formData.DevtokenbuyAmount}
                                        onChange={(e) => handleChange(e, 'DevtokenbuyAmount')}
                                        placeholder="First Buy Amount"
                                        type="number"
                                        required={true}
                                    />
                                    {Mode === 1 && (
                                        <div className='flex justify-end items-end gap-2'>
                                            <InputField
                                                id="BuyertokenbuyAmount"
                                                label="Buy Amount"
                                                subfield={`${formData.BuyertokenbuyAmount} Supply: ${buyerMaxSolPercentage}%`}
                                                value={formData.BuyertokenbuyAmount}
                                                onChange={(e) => handleChange(e, 'BuyertokenbuyAmount')}
                                                placeholder="First Buy Amount"
                                                type="number"
                                                required={true}
                                            />
                                        </div>
                                    )}
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
                                            className="text-center w-full invoke-btn"
                                            disabled={uploading}
                                            type="submit"
                                            id="formbutton"
                                            onClick={handlesubmission}

                                        >
                                            <span className="btn-text-gradient font-bold">
                                                {uploading
                                                    ? <span className='btn-text-gradient italic font-i ellipsis'>Uploading Image</span>
                                                    : <>
                                                        Initiate Deployment
                                                        <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(0.25 Bundler Cost)</span>
                                                    </>
                                                }
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="min-w-[44px] p-4 bg-[#0c0e11] bg-opacity-70 border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
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
                                                <a
                                                    key={index}
                                                    href={`https://solscan.io/account/${publicKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base max-w-[300px] bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[10px] select-text"
                                                    style={{ userSelect: 'text' }}
                                                >
                                                    <p>
                                                        <span className='text-[#96989c] text-[15px] font-normal'>{index + 1}: </span>
                                                        {truncate(publicKey, 6, 7)!}
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>Balance: {balance}</span>
                                                        <br />
                                                    </p>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                    {/* <OutputField
                                        id="totalmintaddress"
                                        label="Mint Address:"
                                        value={formData.coinname}
                                        latedisplay={true}
                                    /> */}
                                    {/* <OutputField
                                        id='bundleError'
                                        label='Bundle Error'
                                        value={BundleError}
                                        latedisplay={true}
                                    /> */}
                                </div>
                            </div>
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
    { value: 1, label: "Wallet Mode" },
    { value: 5, label: "Wallet Mode" },
];




LiquidityHandlerRaydium.getLayout = (page: ReactNode) => getHeaderLayout(page, "PumpDotFun");

export default LiquidityHandlerRaydium;