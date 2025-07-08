'use client';

import React, { ChangeEvent, ReactNode, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { toast } from 'sonner';
import { getHeaderLayout } from '@/components/header-layout';
import { InputField } from '@/components/ui/input-field';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import JitoBundleSelection, { BlockEngineLocation } from '@/components/ui/jito-bundle-selection';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Image from 'next/image';
import { BundleToast, LinkToast } from '@/components/bundler-toasts';
import base58 from 'bs58';
import { LaunchLabBundler } from '@/components/LaunchLabSDK/LaunchLabBundler';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { truncate } from '@/components/sidebar-drawer';
import ImageUploadIcon from '@/components/icons/imageuploadIcon';
import { UpdatedInputField } from '@/components/detailed-field';

import LetsBonkLogo from '@/public/bonk_fun.png';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { GiBasket } from 'react-icons/gi';

interface WorkerResult {
    secretKey: Uint8Array;
    publicKey: string;
}


const LaunchLabCreate = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [isJitoBundle, setIsJitoBundle] = useState(true);
    const [Mode, setMode] = useState(0);
    const [walletMode, setWalletMode] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [bundleResult, setBundleResult] = useState<any>(null);
    const [bundleId, setBundleId] = useState<string>('');
    const [isKeypairUploaded, setIsKeypairUploaded] = useState(false);
    const [lutAddress, setLutAddress] = useState<string>('');
    const [isLutCreated, setIsLutCreated] = useState(false);
    const [isCreatingLut, setIsCreatingLut] = useState(false);
    const [lutLogs, setLutLogs] = useState<string[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [bundleStatus, setBundleStatus] = useState<'idle' | 'sending' | 'confirmed' | 'rejected'>('idle');
    const [bundleLogs, setBundleLogs] = useState<string[]>([]);
    const [buyerMaxSolPercentage, setBuyerMaxSolPercentage] = useState<number>(0);

    const [formData, setFormData] = useState<{
        tokenName: string;
        tokenSymbol: string;
        tokenDescription: string;
        tokenDecimals: string;
        InitialBuyAmount: string;
        pricePerToken: string;
        deployerPrivateKey: string;
        websiteUrl: string;
        twitterUrl: string;
        telegramUrl: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
        sniperPrivateKey: string;
        tokenKeypairpublicKey: string;
        tokenKeypair: string;
        vanity: string;
        threads: number;
        buyerextraWallets: string[];
        buyerWalletAmounts: string[];
        snipeEnabled: boolean;
        snipeAmount: string;
    }>({
        tokenName: '',
        tokenSymbol: '',
        tokenDescription: '',
        tokenDecimals: '9',
        InitialBuyAmount: '0.01',
        pricePerToken: '',
        deployerPrivateKey: '',
        websiteUrl: '',
        twitterUrl: '',
        telegramUrl: '',
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[0],
        sniperPrivateKey: '',
        tokenKeypairpublicKey: '',
        tokenKeypair: '',
        vanity: 'bonk',
        threads: 4,
        buyerextraWallets: [],
        buyerWalletAmounts: [],
        snipeEnabled: true,
        snipeAmount: '0.01',
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        field: string
    ) => {
        const { value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result as string;
                setUploadedImage(base64Image);
                setUploading(true);
                try {
                    const imageBlob = await fetch(base64Image).then((res) => res.blob());
                    const imageBuffer = await imageBlob.arrayBuffer();
                    const imageUint8Array = new Uint8Array(imageBuffer);

                    const imageArray = Array.from(imageUint8Array);

                    const response = await fetch('https://api.bundler.space/upload-image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ image: imageArray })
                    });

                    const responseText = await response.text();
                    console.log("Response", responseText);

                    const httpUrl = `https://ipfs.io/ipfs/${responseText}`;

                    toast(() => (
                        <LinkToast
                            link={httpUrl}
                            message={"Uploaded Image"}
                        />
                    ));

                    setUploadedImage(httpUrl);
                    setUploadedImageUrl(httpUrl);
                } catch (error) {
                    console.error('Error uploading file:', error);
                    toast.error('Failed to upload image');
                } finally {
                    setUploading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleKeypairUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    if (event.target && event.target.result) {
                        const keypairData = JSON.parse(event.target.result as string);
                        if (Array.isArray(keypairData)) {
                            setFormData(prevState => ({
                                ...prevState,
                                tokenKeypair: bs58.encode(Buffer.from(keypairData)),
                                tokenKeypairpublicKey: Keypair.fromSecretKey(new Uint8Array(keypairData)).publicKey.toBase58(),
                            }));
                            setIsKeypairUploaded(true);
                            toast.success("Keypair loaded successfully");
                        } else {
                            toast.error("Invalid keypair format");
                        }
                    }
                } catch (error) {
                    console.error('Error parsing keypair file:', error);
                    toast.error("Failed to parse keypair file");
                }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    };

    const vanityAddressGenerator = async (e: any) => {
        e.preventDefault();
        const NUM_WORKERS = formData.threads || 4;
        setIsGenerating(true);

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
            const result = await Promise.race(promises) as WorkerResult;
            setFormData(prevState => ({
                ...prevState,
                tokenKeypair: bs58.encode(Buffer.from(result.secretKey)),
                tokenKeypairpublicKey: result.publicKey,
            }));
        } catch (error) {
            console.error('Error generating vanity address:', error);
        } finally {
            setIsGenerating(false);
        }
    }

    const createLUT = () => {
        setIsCreatingLut(true);
        setLutLogs(prev => [...prev, "Initializing LUT creation..."]);

        setTimeout(() => {
            setLutLogs(prev => [...prev, "Created Look-up Table"]);
            setLutAddress("LUTaddressexample111111111111111111111111111111");
            setIsLutCreated(true);
            setIsCreatingLut(false);
        }, 2000);
    };

    const handleSubmission = (e: React.FormEvent) => {
        e.preventDefault();
        handleSubmit(e);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsDeploying(true);

        try {
            // Validate required fields
            const missingFields = [];

            if (!formData.tokenName) missingFields.push('Token Name');
            if (!formData.tokenSymbol) missingFields.push('Token Symbol');
            if (!formData.deployerPrivateKey) missingFields.push('Deployer Private Key');
            if (!formData.InitialBuyAmount) missingFields.push('Initial Buy Amount');

            if (formData.snipeEnabled) {
                if (!formData.sniperPrivateKey) missingFields.push('Sniper Private Key');
                if (!formData.snipeAmount) missingFields.push('Snipe Amount');
            }

            if (missingFields.length > 0) {
                toast.error(`Required fields missing: ${missingFields.join(', ')}`);
                setIsDeploying(false);
                return;
            }

            let uri = '';
            if (uploadedImageUrl) {
                const metadata = {
                    name: formData.tokenName,
                    symbol: formData.tokenSymbol,
                    description: formData.tokenDescription,
                    image: uploadedImageUrl,
                    show_name: true,
                    createdOn: new Date().toISOString(),
                    website: formData.websiteUrl || undefined,
                    twitter: formData.twitterUrl || undefined,
                    telegram: formData.telegramUrl || undefined,
                };

                const metadataResponse = await fetch('https://api.bundler.space/create-metadata', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(metadata)
                });

                const metadataText = await metadataResponse.text();
                // Convert to HTTP URL
                uri = `https://ipfs.io/ipfs/${metadataText}`;
            }

            // Determine platform based on Mode
            let platformPublicKey: string | undefined;
            switch (Mode) {
                case 0: // LetsBonk.fun
                    platformPublicKey = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";
                    break;
                case 1: // Raydium
                    platformPublicKey = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"; // Default Raydium platform
                    break;
                default:
                    platformPublicKey = undefined;
            }

            // Call LaunchLabBundler
            const result = await LaunchLabBundler(
                connection,
                {
                    tokenName: formData.tokenName,
                    tokenSymbol: formData.tokenSymbol,
                    decimals: parseInt(formData.tokenDecimals),
                    tokenUri: uri,
                    deployerPrivateKey: formData.deployerPrivateKey,
                    sniperPrivateKey: formData.sniperPrivateKey || "",
                    buyerextraWallets: formData.buyerextraWallets || [],
                    buyerWalletAmounts: formData.buyerWalletAmounts || [],
                    initialBuyAmount: formData.InitialBuyAmount || "0.01",
                    platform: platformPublicKey,
                    bundleTip: formData.BundleTip,
                    blockEngine: formData.BlockEngineSelection,
                    snipeEnabled: formData.snipeEnabled,
                    snipeAmount: formData.snipeAmount || "0.01",
                },
                Keypair.fromSecretKey(base58.decode(formData.tokenKeypair))
            );

            // Set bundle results
            setBundleResult(result);
            setBundleId(result.bundleId);

            // Show success toast
            toast(() => (
                <BundleToast
                    txSig={result.bundleId}
                    message={'Launch Lab Bundle ID:'}
                />
            ));

            toast.success(`Token created with mint address: ${result.mintAddress}`);
        } catch (error) {
            console.error('Error creating token:', error);
            toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDeploying(false);
        }
    };

    const removeImage = () => {
        setUploadedImage('');
        setUploadedImageUrl('');
    }

    const modeOptions = [
        { value: 0, label: 'LetsBonk.fun', image: LetsBonkLogo },
    ];

    React.useEffect(() => {
        const tokenMint = Keypair.generate();
        setFormData(prevState => ({
            ...prevState,
            tokenKeypairpublicKey: tokenMint.publicKey.toBase58(),
            tokenKeypair: bs58.encode(tokenMint.secretKey),
        }));
    }, []);

    return (
        <div className="flex py-1 justify-center items-start relative max-w-[100vw]">
            <form className="w-full max-w-[1400px]">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
                    {/* Left Column - Main Form */}
                    <div className="xl:col-span-2 space-y-3 ">
                        {/* Header Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Title */}
                                <div className="md:w-1/3">
                                    <p className='font-bold text-[20px]'>Launch Lab</p>
                                </div>

                                {/* Bundler Mode Selection */}
                                <div className="md:w-1/3">
                                    <select
                                        id="BlockEngineSelection"
                                        value={walletMode}
                                        onChange={(e) => setWalletMode(Number(e.target.value))}
                                        required={true}
                                        className="block w-full px-3 rounded-md text-sm border border-[#404040] text-white bg-input-boxes focus:outline-none h-[35px] focus:border-blue-500"
                                    >
                                        <option value="" disabled>Select Mode</option>
                                        {walletModeOptions.map((option, index) => (
                                            <option key={index} value={option.value}>
                                                {option.value} {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Platform Selection */}
                                <div className="md:w-1/3">
                                    <Listbox value={Mode} onChange={(value) => setMode(Number(value))}>
                                        <div className="relative">
                                            <div>
                                                <ListboxButton className="w-full px-2 rounded-md text-sm border border-[#404040] text-white bg-input-boxes h-[35px] focus:outline-none focus:border-blue-500 text-left flex items-center gap-2">
                                                    <Image
                                                        src={modeOptions.find((opt) => opt.value === Mode)?.image || '/path/to/fallback/image.png'}
                                                        alt={modeOptions.find((opt) => opt.value === Mode)?.label || 'Platform'}
                                                        width={16}
                                                        height={16}
                                                    />
                                                    {modeOptions.find((opt) => opt.value === Mode)?.label || 'Platform'}
                                                </ListboxButton>
                                                <ListboxOptions className="absolute z-10 mt-1 w-full bg-[#0c0e11] border border-[#404040] rounded-md shadow-lg max-h-60 overflow-auto">
                                                    {modeOptions.map((option) => (
                                                        <ListboxOption
                                                            key={option.value}
                                                            value={option.value}
                                                            className={({ focus, selected }) =>
                                                                `flex items-center  px-2 gap-2 py-2 text-white text-xs cursor-pointer ${focus ? 'bg-blue-500' : ''} ${selected ? 'bg-blue-500' : ''}`
                                                            }
                                                        >
                                                            <Image src={option.image} alt={option.label} width={16} height={16} />
                                                            {option.label}
                                                        </ListboxOption>
                                                    ))}
                                                </ListboxOptions>
                                            </div>
                                        </div>
                                    </Listbox>
                                </div>
                            </div>
                        </div>

                        {/* Token Configuration Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Token Configuration</h3>


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
                                            placeholder="bonk.."
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
                                <div className="flex flex-col gap-1 w-1/3">
                                    <button
                                        className='bundler-btn border p-2 w-full font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out'
                                        onClick={vanityAddressGenerator}
                                    >
                                        {isGenerating ? (
                                            <div className='flex justify-center items-center gap-2'>
                                                <span className="italic font-i">Generating</span>
                                                <FaSpinner className='animate-spin' />
                                            </div>
                                        ) : (
                                            'Generate'
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="border-gray-500">
                                <input
                                    type="file"
                                    id="keypair_file_input"
                                    accept=".json"
                                    onChange={handleKeypairUpload}
                                    className="hidden"
                                    form=""
                                />
                                <label
                                    htmlFor="keypair_file_input"
                                    className={`bundler-btn border p-2 w-full font-semibold border-[#3d3d3d] ${isKeypairUploaded ? 'border-green-500 text-green-500' : 'hover:border-[#45ddc4]'} rounded-md duration-300 ease-in-out cursor-pointer flex justify-center items-center text-sm`}
                                >
                                    {isKeypairUploaded ? 'Keypair Loaded' : 'Upload Bytes Keypair'}
                                    <span className="ml-2 text-xs text-gray-500">
                                        (Optional if local grinded)
                                    </span>
                                </label>
                            </div>
                            <InputField
                                id="deployerPrivatekey"
                                label="Deployer Private Key"
                                subfield='Coin Funder and First Buyer'
                                value={formData.deployerPrivateKey}
                                onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                placeholder="deployer private key - coin maker"
                                type="password"
                                required={true}
                            />

                            {(formData.snipeEnabled) && (
                                <InputField
                                    id='sniperPrivateKey'
                                    label='Sniper Private Key'
                                    subfield='Wallet for sniping the token'
                                    value={formData.sniperPrivateKey}
                                    onChange={(e) => handleChange(e, 'sniperPrivateKey')}
                                    placeholder='sniper private key'
                                    type='password'
                                    required={true}
                                />
                            )}
                            <InputField
                                id="InitialBuyAmount"
                                label="Initial Buy Amount"
                                subfield='SOL amount for initial token creation'
                                value={formData.InitialBuyAmount}
                                onChange={(e) => handleChange(e, 'InitialBuyAmount')}
                                placeholder="0.01"
                                type="number"
                                required={true}
                            />
                        </div>

                        {/* Wallet Input Section (Modes 4 & 20) */}
                        {(walletMode >= 2 && walletMode <= 4) && (
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <h3 className="text-[16px] font-semibold text-white mb-3">{walletMode} Wallet Mode</h3>
                                <WalletInput
                                    wallets={wallets}
                                    setWallets={setWallets}
                                    Mode={walletMode}
                                    walletType='privateKeys'
                                    maxWallets={walletMode}
                                    onChange={(walletData) => {
                                        setFormData(prevState => ({
                                            ...prevState,
                                            buyerextraWallets: walletData.map(entry => entry.wallet),
                                            buyerWalletAmounts: walletData.map(entry => entry.solAmount.toString())
                                        }));
                                    }}
                                    onWalletsUpdate={(walletData) => {
                                        console.log('Updated wallet data:', walletData.map(entry => ({
                                            wallet: entry.wallet,
                                            solAmount: entry.solAmount,
                                            lamports: entry.solAmount * LAMPORTS_PER_SOL
                                        })));
                                    }}
                                />
                            </div>
                        )}

                        {/* Metadata Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <div className='flex flex-col gap-2' id="tokeninfo">
                                <h3 className='btn-text-gradient font-bold text-[25px] mt-2'>Coin Metadata</h3>
                                <div className='flex justify-center items-center gap-2'>
                                    <InputField
                                        id="tokenName"
                                        label="Coin"
                                        subfield='name'
                                        value={formData.tokenName}
                                        onChange={(e) => handleChange(e, 'tokenName')}
                                        placeholder="Coin Name"
                                        type="text"
                                        required={true}
                                    />
                                    <InputField
                                        label="Symbol"
                                        subfield='ticker'
                                        id="tokenSymbol"
                                        value={formData.tokenSymbol}
                                        onChange={(e) => handleChange(e, 'tokenSymbol')}
                                        placeholder="Coin Symbol"
                                        type="text"
                                        required={true}
                                    />
                                </div>
                                <textarea
                                    name=""
                                    id="tokenDescription"
                                    value={formData.tokenDescription}
                                    rows={2}
                                    className="mt-1 px-4 bg-[#202020]/20 sm:text-md block w-full p-4 rounded-md border border-[#404040] text-white focus:outline-none text-[13px] placeholder-[#dbd7d7d4]"
                                    onChange={(e) => handleChange(e, 'tokenDescription')}
                                    placeholder="Enter description...">
                                </textarea>

                                <div className="w-full">
                                    <div className="flex gap-4">
                                        <div className="relative flex-grow flex p-4 w-1/4 border-white border-dashed border rounded-md shadow-lg h-full items-start justify-center">
                                            {/* Remove button positioned in top-right corner */}
                                            <div className="absolute top-2 right-2 z-10">
                                                <button
                                                    className="bundler-btn border p-2 font-semibold border-[#3d3d3d] hover:border-[#45ddc4] rounded-md duration-300 ease-in-out"
                                                    onClick={removeImage}
                                                >
                                                    <GiBasket className='text-white' />
                                                </button>
                                            </div>

                                            {!uploadedImage && (
                                                <div>
                                                    <div className="flex justify-center" onClick={() => document.getElementById('file_input')?.click()}>
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
                                                        className="block align-bottom w-full py-1 px-5 text-sm text-white rounded-lg cursor-pointer focus:outline-none opacity-100 backdrop-blur-md"
                                                        htmlFor="file_input"
                                                    >
                                                        Upload an Image
                                                    </label>
                                                </div>
                                            )}

                                            {uploadedImage && (
                                                <div className="relative flex justify-center h-36 border-y-v3-bg rounded-md">
                                                    <img
                                                        src={uploadedImage}
                                                        alt="Uploaded"
                                                        className="rounded-md object-contain"
                                                    />
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


                            </div>
                        </div>
                    </div>

                    {/* Right Column - Jito Bundle Selection, Deployment Button and Status Panel */}
                    <div className="xl:col-span-1 space-y-3">
                        {/* Jito Bundle Selection */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Bundle Configuration</h3>
                            <JitoBundleSelection
                                isJitoBundle={isJitoBundle}
                                setIsJitoBundle={setIsJitoBundle}
                                formData={formData}
                                handleChange={handleChange}
                                handleSelectionChange={handleSelectionChange}
                                snipeEnabled={formData.snipeEnabled}
                                snipeAmount={formData.snipeAmount}
                                setSnipeEnabled={(value) => setFormData(prev => ({ ...prev, snipeEnabled: value }))}
                                setSnipeAmount={(value) => setFormData(prev => ({ ...prev, snipeAmount: value }))}
                            />
                            <button
                                className="text-center w-full invoke-btn"
                                disabled={uploading || isDeploying}
                                type="submit"
                                id="formbutton"
                                onClick={handleSubmission}
                            >
                                <span className="btn-text-gradient font-bold">
                                    {uploading
                                        ? <span className='btn-text-gradient italic font-i ellipsis'>Uploading Image</span>
                                        : isDeploying
                                            ? <span className='btn-text-gradient italic font-i ellipsis'>Deploying Token</span>
                                            : <>
                                                Initiate Deployment
                                                <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(0.25 Bundler Cost)</span>
                                            </>
                                    }
                                </span>
                            </button>
                        </div>

                        {/* Status Panel */}
                        {/* Right Column - Status Panel */}
                        <div className="xl:col-span-1 space-y-3">
                            <div className="p-4 bg-[#0c0e11] border border-neutral-600 rounded-xl shadow-2xl shadow-black sticky top-4">
                                <div className="mb-4">
                                    <p className='font-bold text-[18px]'>Status Panel</p>
                                    <p className='text-[11px] text-[#96989c]'>Real-time information and logs</p>
                                </div>

                                {/* Wallets Section */}
                                <div className='mb-4'>
                                    <label className="block text-sm text-white font-semibold mb-2">
                                        Wallets ({balances.length}):
                                    </label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {balances.map(({ balance, publicKey }, index) => (
                                            <a
                                                key={index}
                                                href={`https://solscan.io/account/${publicKey}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-2 bg-[#101010] rounded-md hover:bg-[#181818] transition-colors"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className='text-[#96989c] text-xs'>#{index + 1}</span>
                                                    <span className='text-xs text-gray-300'>{balance} SOL</span>
                                                </div>
                                                <div className="text-xs text-blue-400 font-mono mt-1">
                                                    {truncate(publicKey, 6, 6)}
                                                </div>
                                            </a>
                                        ))}
                                        {balances.length === 0 && (
                                            <div className="text-xs text-gray-500 italic p-2 text-center">
                                                No wallets added yet
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {Mode === 20 && (
                                    <div className='mb-4 p-3 bg-[#101010] rounded-md'>
                                        <label className="block text-sm text-white font-semibold mb-2">
                                            LUT Status:
                                        </label>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Status:</span>
                                                <span className={isLutCreated ? 'text-green-400' : 'text-yellow-400'}>
                                                    {isLutCreated ? 'Active' : 'Not Created'}
                                                </span>
                                            </div>
                                            {lutAddress && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Address:</span>
                                                    <a
                                                        href={`https://solscan.io/account/${lutAddress}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:underline"
                                                    >
                                                        {truncate(lutAddress, 4, 4)}
                                                    </a>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Wallets:</span>
                                                <span className="text-gray-300">{wallets.length} / 20</span>
                                            </div>
                                        </div>

                                        {/* LUT Logs */}
                                        {lutLogs.length > 0 && (
                                            <div className="mt-3 max-h-32 overflow-y-auto bg-[#0a0a0a] rounded-md p-2">
                                                <h4 className="text-xs font-medium text-gray-300 mb-1">LUT Logs:</h4>
                                                <div className="space-y-1">
                                                    {lutLogs.slice(-5).map((log, index) => (
                                                        <div key={index} className="text-xs text-gray-400">{log}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bundle Status Panel */}
                                {bundleStatus !== 'idle' && (
                                    <div className='p-3 bg-[#101010] rounded-md'>
                                        <label className="block text-sm text-white font-semibold mb-2">
                                            Bundle Status:
                                        </label>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Status:</span>
                                                <span className={`font-medium ${bundleStatus === 'sending' ? 'text-yellow-400' :
                                                    bundleStatus === 'confirmed' ? 'text-green-400' :
                                                        bundleStatus === 'rejected' ? 'text-red-400' : 'text-gray-300'
                                                    }`}>
                                                    {bundleStatus === 'sending' ? 'Sending' :
                                                        bundleStatus === 'confirmed' ? 'Confirmed' :
                                                            bundleStatus === 'rejected' ? 'Rejected' : 'Unknown'}
                                                </span>
                                            </div>

                                            {bundleId && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Bundle ID:</span>
                                                    <a
                                                        href={`https://explorer.jito.wtf/bundle/${bundleId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:underline"
                                                    >
                                                        {bundleId.substring(0, 8)}...
                                                    </a>
                                                </div>
                                            )}

                                            {bundleResult?.confirmed?.landedInSlot && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Slot:</span>
                                                    <span className="text-gray-300">{bundleResult.confirmed.landedInSlot}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bundle Logs */}
                                        <div className="mt-3 max-h-40 overflow-y-auto bg-[#0a0a0a] rounded-md p-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="text-xs font-medium text-gray-300">Bundle Logs:</h4>
                                                {bundleLogs.length > 0 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setBundleLogs([]);
                                                            setBundleStatus('idle');
                                                        }}
                                                        className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                            {bundleLogs.length > 0 ? (
                                                <div className="space-y-1">
                                                    {bundleLogs.slice(-10).map((log, index) => (
                                                        <div key={index} className="text-xs text-gray-400">{log}</div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-500 italic">No logs yet.</div>
                                            )}
                                        </div>

                                        {/* Error Details */}
                                        {bundleResult?.rejected?.simulationFailure && (
                                            <div className="mt-2 p-2 bg-[#1a0000] rounded-md border border-red-900">
                                                <h4 className="text-xs font-medium text-red-300 mb-1">Error Details:</h4>
                                                <div className="text-xs text-red-200 opacity-80">
                                                    <div>TX: {bundleResult.rejected.simulationFailure.txSignature.substring(0, 12)}...</div>
                                                    <div className="mt-1">{bundleResult.rejected.simulationFailure.msg}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div >
            </form >
        </div >
    );
};

const walletModeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 2, label: "Wallet Mode" },
    { value: 3, label: "Wallet Mode" },
    { value: 4, label: "Wallet Mode" },
];

LaunchLabCreate.getLayout = (page: ReactNode) => getHeaderLayout(page, 'Launch Lab - Create');

export default LaunchLabCreate;