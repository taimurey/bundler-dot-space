'use client';

import React, { ChangeEvent, ReactNode, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { Listbox } from '@headlessui/react';
import { toast } from 'sonner';
import { getHeaderLayout } from '@/components/header-layout';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';
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
    const [isLoading, setIsLoading] = useState(false);
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
        liquidityAmount: string;
        pricePerToken: string;
        deployerPrivateKey: string;
        websiteUrl: string;
        twitterUrl: string;
        telegramUrl: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
        buyerPrivateKey: string;
        tokenKeypairpublicKey: string;
        tokenKeypair: string;
        vanity: string;
        threads: number;
        buyerextraWallets: string[];
        buyerWalletAmounts: string[];
        coinname: string;
        symbol: string;
        BuyertokenbuyAmount: string;
    }>({
        tokenName: '',
        tokenSymbol: '',
        tokenDescription: '',
        tokenDecimals: '9',
        liquidityAmount: '',
        pricePerToken: '',
        deployerPrivateKey: '',
        websiteUrl: '',
        twitterUrl: '',
        telegramUrl: '',
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2],
        buyerPrivateKey: '',
        tokenKeypairpublicKey: '',
        tokenKeypair: '',
        vanity: '',
        threads: 4,
        buyerextraWallets: [],
        buyerWalletAmounts: [],
        coinname: '',
        symbol: '',
        BuyertokenbuyAmount: '0',
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

                // Set the uploading state to true
                setUploading(true);

                try {
                    // Convert image to Uint8Array
                    const imageBlob = await fetch(base64Image).then((res) => res.blob());
                    const imageBuffer = await imageBlob.arrayBuffer();
                    const imageUint8Array = new Uint8Array(imageBuffer);

                    // Convert Uint8Array to an array of numbers
                    const imageArray = Array.from(imageUint8Array);

                    const response = await fetch('https://api.bundler.space/upload-image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        // Send the array of numbers instead of Uint8Array
                        body: JSON.stringify({ image: imageArray })
                    });

                    const responseText = await response.text();
                    console.log("Response", responseText);

                    // Convert the IPFS URL to a HTTP URL
                    const httpUrl = `https://ipfs.io/ipfs/${responseText}`;

                    toast(() => (
                        <LinkToast
                            link={httpUrl}
                            message={"Uploaded Image"}
                        />
                    ));

                    // Set the uploadedImage state variable to the HTTP URL of the uploaded image
                    setUploadedImage(httpUrl);
                    setUploadedImageUrl(httpUrl);
                } catch (error) {
                    console.error('Error uploading file:', error);
                    toast.error('Failed to upload image');
                } finally {
                    // Set the uploading state to false
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
    };

    const vanityAddressGenerator = async (e: any) => {
        e.preventDefault();
        const NUM_WORKERS = formData.threads || 4;
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
            setIsLoading(false);
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
        setIsLoading(true);

        try {
            // Validate form data
            if (!formData.tokenName || !formData.tokenSymbol || !formData.deployerPrivateKey) {
                toast.error('Required fields missing');
                setIsLoading(false);
                return;
            }

            // Create token metadata
            let uri = '';
            if (uploadedImageUrl) {
                // Create metadata JSON
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

                // Upload metadata to IPFS
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
                    platformPublicKey = "7mT5yQadRu11N83ELzyrZ37uygYQBKvJShQXB3ZbQx3F"; // Example, replace with actual platform ID
                    break;
                case 1: // Raydium
                    platformPublicKey = "4Bu96XjU84XjPDSpveTVf6LYGCkfW5FK7SNkREWcEfV4"; // Default Raydium platform
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
                    buyerPrivateKey: formData.buyerPrivateKey || "",
                    buyerextraWallets: formData.buyerextraWallets || [],
                    buyerBuyAmount: formData.BuyertokenbuyAmount || "0",
                    devBuyAmount: formData.liquidityAmount,
                    platform: platformPublicKey,
                    bundleTip: formData.BundleTip,
                    blockEngine: formData.BlockEngineSelection
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
            setIsLoading(false);
        }
    };

    const modeOptions = [
        { value: 0, label: 'LetsBonk.fun', image: LetsBonkLogo }, // Adjusted value to match Mode state
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
        <div className="lg:w-3/4 px-4 mx-auto ">
            <form onSubmit={handleSubmit} className="w-full">
                <div className="flex flex-col md:flex-row h-full gap-6">
                    <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                        <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                            <div>
                                <div className="mb-4 border-b border-neutral-700 pb-2">
                                    <p className="font-bold text-xl">Launch Lab</p>
                                    <p className="text-xs text-[#96989c]">Create your own token liquidity pool with ease</p>
                                </div>
                                {/* Platform Selection */}
                                <label className="block mt-5 text-base text-white font-semibold">
                                    Platform
                                    <span className="pl-5 text-[#FFC107] text-[12px] font-normal">
                                        Select the platform you want to use
                                    </span>
                                </label>
                                <div className="relative mt-1 rounded-md shadow-sm w-full">
                                    <Listbox value={Mode} onChange={(value) => setMode(Number(value))}>
                                        <Listbox.Button className="w-full px-4 rounded-md text-base border gap-2 border-[#404040] text-white bg-input-boxes h-[40px] focus:outline-none focus:border-blue-500 text-left flex items-center">
                                            <Image
                                                src={modeOptions.find((opt) => opt.value === Mode)?.image || '/path/to/fallback/image.png'}
                                                alt={modeOptions.find((opt) => opt.value === Mode)?.label || 'Platform'}
                                                width={20}
                                                height={20}
                                            />
                                            {modeOptions.find((opt) => opt.value === Mode)?.label || 'Platform'}
                                        </Listbox.Button>
                                        <Listbox.Options className="absolute z-10 mt-1 w-full bg-[#0c0e11] border border-[#404040] rounded-md shadow-lg max-h-60 overflow-auto">
                                            {modeOptions.map((option) => (
                                                <Listbox.Option
                                                    key={option.value}
                                                    value={option.value}
                                                    className={({ active }) =>
                                                        `flex items-center gap-2 px-4 py-2 text-white text-[12px] cursor-pointer ${active ? 'bg-blue-500' : ''
                                                        }`
                                                    }
                                                >
                                                    <Image src={option.image} alt={option.label} width={20} height={20} />
                                                    {option.label}
                                                </Listbox.Option>
                                            ))}
                                        </Listbox.Options>
                                    </Listbox>
                                </div>
                            </div>
                            <div className='w-full'>
                                <label className="block text-base text-white font-semibold" >
                                    Bundler Mode
                                </label>


                                <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                    <select
                                        id="BlockEngineSelection"
                                        value={walletMode}
                                        onChange={(e) => setWalletMode(Number(e.target.value))}
                                        required={true}
                                        className="block w-full px-4 rounded-md text-base border  border-[#404040]  text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                    >
                                        <option value="" disabled>
                                            Bundler Mode
                                        </option>
                                        {walletModeOptions.map((option, index) => (
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
                                        {isLoading ? (
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
                            <div className="relative border-t border-dashed border-gray-500">
                                <input
                                    type="file"
                                    id="keypair_file_input"
                                    accept=".json"
                                    onChange={handleKeypairUpload}
                                    className="hidden"
                                />
                                <TooltipProvider>
                                    <Tooltip>
                                        <label
                                            htmlFor="keypair_file_input"
                                            className={`bundler-btn border p-2 w-full font-semibold border-[#3d3d3d] ${isKeypairUploaded ? 'border-green-500 text-green-500' : 'hover:border-[#45ddc4]'} rounded-md duration-300 ease-in-out cursor-pointer flex justify-center items-center text-sm`}
                                        >
                                            <TooltipTrigger>
                                                {isKeypairUploaded ? 'Keypair Loaded' : 'Upload Bytes Keypair'}
                                                <span className="ml-2 text-xs text-gray-500">
                                                    (Optional if local grinded)
                                                </span>
                                            </TooltipTrigger>
                                        </label>
                                        <TooltipContent>
                                            <p>
                                                solana-keygen grind --ends-with pump:1
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
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
                            {Mode === 1 && (
                                <div className='w-full'>
                                    <InputField
                                        id='buyerPrivateKey'
                                        label='Buyer Private Key'
                                        subfield='first buy - 1 wallet'
                                        value={formData.buyerPrivateKey}
                                        onChange={(e) => handleChange(e, 'buyerPrivateKey')}
                                        placeholder='buyer private key'
                                        type='password'
                                        required={true}
                                    />
                                </div>)}
                            <div className="relative rounded-md shadow-sm w-full flex flex-col gap-2 justify-end">
                                {Mode === 4 && (
                                    <WalletInput
                                        wallets={wallets}
                                        setWallets={setWallets}
                                        Mode={Mode}
                                        walletType='privateKeys'
                                        maxWallets={4}
                                        onChange={(walletData) => {
                                            setFormData(prevState => ({
                                                ...prevState,
                                                buyerextraWallets: walletData.map(entry => entry.wallet),
                                                buyerWalletAmounts: walletData.map(entry => entry.solAmount.toString())
                                            }));
                                        }}
                                        onWalletsUpdate={(walletData) => {
                                            // Log the complete wallet data with amounts
                                            console.log('Updated wallet data:', walletData.map(entry => ({
                                                wallet: entry.wallet,
                                                solAmount: entry.solAmount,
                                                lamports: entry.solAmount * LAMPORTS_PER_SOL
                                            })));
                                        }}
                                    />
                                )}
                                {Mode === 20 && (
                                    <div className="space-y-4 w-full border border-zinc-400 border-dashed rounded-xl p-4">
                                        <h3 className="text-lg font-semibold text-white">20 Wallet Mode</h3>
                                        <p className="text-sm text-gray-400">
                                            This mode allows you to use up to 20 wallets with a Look-Up Table (LUT) for efficient transactions.
                                        </p>

                                        <WalletInput
                                            wallets={wallets}
                                            setWallets={setWallets}
                                            Mode={Mode}
                                            maxWallets={20}
                                            onChange={(walletData) => {
                                                setFormData(prevState => ({
                                                    ...prevState,
                                                    buyerextraWallets: walletData.map(entry => entry.wallet),
                                                    buyerWalletAmounts: walletData.map(entry => entry.solAmount.toString())
                                                }));
                                            }}
                                            onWalletsUpdate={(walletData) => {
                                                console.log('Updated 20-wallet data:', walletData.map(entry => ({
                                                    wallet: entry.wallet,
                                                    solAmount: entry.solAmount,
                                                    lamports: entry.solAmount * LAMPORTS_PER_SOL
                                                })));
                                            }}
                                        />

                                        {wallets.length > 0 && !isLutCreated && (
                                            <div className="mt-4">
                                                <button
                                                    type="button"
                                                    className="w-full p-2 font-semibold bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={isCreatingLut || wallets.length === 0}
                                                    onClick={createLUT}
                                                >
                                                    {isCreatingLut ? (
                                                        <div className="flex justify-center items-center gap-2">
                                                            <span>Creating LUT...</span>
                                                            <FaSpinner className="animate-spin" />
                                                        </div>
                                                    ) : (
                                                        "Create Look-Up Table (LUT)"
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {isLutCreated && (
                                            <div className="flex flex-col gap-2 mt-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-green-400 font-medium">✓ LUT Created</span>
                                                    <a
                                                        href={`https://solscan.io/account/${lutAddress}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-400 hover:text-blue-300"
                                                    >
                                                        View on Solscan
                                                    </a>
                                                </div>
                                                <InputField
                                                    id="lutAddress"
                                                    label="LUT Address"
                                                    value={lutAddress}
                                                    onChange={() => { }}
                                                    placeholder="LUT Address"
                                                    type="text"
                                                    disabled={true}
                                                    required={false}
                                                />
                                            </div>
                                        )}

                                        <div className="mt-4 max-h-40 overflow-y-auto bg-[#101010] rounded-md p-2">
                                            <h4 className="text-sm font-medium text-gray-300 mb-2">LUT Creation Logs:</h4>
                                            {lutLogs.length > 0 ? (
                                                <div className="space-y-1 text-xs">
                                                    {lutLogs.map((log, index) => (
                                                        <div key={index} className="text-gray-400">{log}</div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-500 italic">No logs yet. Add wallets and create LUT to see logs here.</div>
                                            )}
                                        </div>
                                        <div className='justify-center'>
                                            <button
                                                className="text-center w-full invoke-btn"
                                                type="submit"
                                                id="formbutton"
                                                onClick={createLUT}

                                            >
                                                <span className="btn-text-gradient font-bold">
                                                    Create LUT
                                                </span>
                                            </button>
                                        </div>
                                    </div>
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
                                        placeholder="Coin Name"
                                        type="text"
                                        required={true}
                                    />
                                    <InputField
                                        label="Symbol"
                                        subfield='ticker'
                                        id="tokenMarketID"
                                        value={formData.symbol}
                                        onChange={(e) => handleChange(e, 'symbol')}
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
                                <JitoBundleSelection
                                    isJitoBundle={isJitoBundle}
                                    setIsJitoBundle={setIsJitoBundle}
                                    formData={formData}
                                    handleChange={handleChange}
                                    handleSelectionChange={handleSelectionChange}
                                />
                                <div className='justify-center'>
                                    <button
                                        className="text-center w-full invoke-btn"
                                        disabled={uploading}
                                        type="submit"
                                        id="formbutton"
                                        onClick={handleSubmission}

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
                                    <p className='font-bold text-[25px]'>Status Panel</p>
                                    <p className=' text-[12px] text-[#96989c] '>Real-time information and logs</p>
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

                                {Mode === 20 && lutAddress && (
                                    <div className='w-full mt-5'>
                                        <label className="block text-base text-white font-semibold">
                                            LUT Status:
                                        </label>
                                        <div className="mt-2 p-2 bg-[#101010] rounded-md">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-300">Address:</span>
                                                <a
                                                    href={`https://solscan.io/account/${lutAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-400 hover:underline"
                                                >
                                                    {truncate(lutAddress, 4, 4)}
                                                </a>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm text-gray-300">Status:</span>
                                                <span className={`text-sm ${isLutCreated ? 'text-green-400' : 'text-yellow-400'}`}>
                                                    {isLutCreated ? 'Active' : 'Not Created'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm text-gray-300">Wallets:</span>
                                                <span className="text-sm text-gray-300">
                                                    {wallets.length} / 20
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm text-gray-300">Last Updated:</span>
                                                <span className="text-sm text-gray-300">
                                                    {new Date().toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm text-gray-300">Note:</span>
                                                <span className="text-xs text-gray-500 italic max-w-[60%] text-right">
                                                    LUT enables efficient transactions with up to 20 wallets
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bundle Status Panel */}
                                {bundleStatus !== 'idle' && (
                                    <div className='w-full mt-5'>
                                        <label className="block text-base text-white font-semibold">
                                            Bundle Status:
                                        </label>
                                        <div className="mt-2 p-2 bg-[#101010] rounded-md">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-300">Status:</span>
                                                <span className={`text-sm font-medium ${bundleStatus === 'sending' ? 'text-yellow-400' :
                                                    bundleStatus === 'confirmed' ? 'text-green-400' :
                                                        bundleStatus === 'rejected' ? 'text-red-400' : 'text-gray-300'
                                                    }`}>
                                                    {bundleStatus === 'sending' ? 'Sending' :
                                                        bundleStatus === 'confirmed' ? 'Confirmed' :
                                                            bundleStatus === 'rejected' ? 'Rejected' : 'Unknown'}
                                                </span>
                                            </div>

                                            {bundleId && (
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-sm text-gray-300">Bundle ID:</span>
                                                    <a
                                                        href={`https://explorer.jito.wtf/bundle/${bundleId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-400 hover:underline"
                                                    >
                                                        {bundleId.substring(0, 8)}...
                                                    </a>
                                                </div>
                                            )}

                                            {bundleResult && bundleResult.confirmed && bundleResult.confirmed.landedInSlot && (
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-sm text-gray-300">Landed in Slot:</span>
                                                    <span className="text-sm text-gray-300">
                                                        {bundleResult.confirmed.landedInSlot}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm text-gray-300">Last Updated:</span>
                                                <span className="text-sm text-gray-300">
                                                    {new Date().toLocaleTimeString()}
                                                </span>
                                            </div>

                                            <div className="mt-2 max-h-60 overflow-y-auto bg-[#0a0a0a] rounded-md p-2">
                                                <h4 className="text-sm font-medium text-gray-300 mb-2">Bundle Logs:</h4>
                                                {bundleLogs.length > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        {bundleLogs.map((log, index) => (
                                                            <div key={index} className="text-gray-400">{log}</div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500 italic">No logs yet.</div>
                                                )}
                                            </div>

                                            {/* Clear logs button */}
                                            {(bundleLogs.length > 0 || bundleStatus === 'sending' || bundleStatus === 'confirmed' || bundleStatus === 'rejected') && (
                                                <div className="mt-2 flex justify-end">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setBundleLogs([]);
                                                            setBundleStatus('idle');
                                                        }}
                                                        className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                                                    >
                                                        Clear logs
                                                    </button>
                                                </div>
                                            )}

                                            {bundleResult && bundleResult.rejected && bundleResult.rejected.simulationFailure && (
                                                <div className="mt-2 p-2 bg-[#1a0000] rounded-md border border-red-900">
                                                    <h4 className="text-sm font-medium text-red-300">Error Details:</h4>
                                                    <div className="mt-1 text-xs text-red-200 opacity-80">
                                                        <div>Transaction: {bundleResult.rejected.simulationFailure.txSignature.substring(0, 12)}...</div>
                                                        <div className="mt-1">{bundleResult.rejected.simulationFailure.msg}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form >
        </div >
    );
};

const walletModeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 4, label: "Wallet Mode" },
    // { value: 20, label: "Wallet Mode" },
];

LaunchLabCreate.getLayout = (page: ReactNode) => getHeaderLayout(page, 'Launch Lab - Create');

export default LaunchLabCreate;