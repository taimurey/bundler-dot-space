'use client';

import React, { ChangeEvent, ReactNode, useState } from 'react';
import { BN } from 'bn.js';
import { Keypair, LAMPORTS_PER_SOL, AddressLookupTableProgram } from '@solana/web3.js';
import { Connection, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import base58 from 'bs58';
import axios from 'axios';
import { toast } from "sonner";
import { BundleToast, LinkToast, TransactionToast } from '@/components/bundler-toasts';
import { WalletProfileContext } from '@/components/SolanaWallet/wallet-context';
import ImageUploadIcon from '@/components/icons/imageuploadIcon';
import { randomColor } from '@/components/utils/random-color';
import { PumpBundler } from "@/components/instructions/pump-bundler/PumpBundler";
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { calculateBuyTokensAndNewReserves } from "@/components/instructions/pump-bundler/misc";
import { truncate } from '@/components/sidebar-drawer';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { BalanceType } from "@/components/types/solana-types";
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { UpdatedInputField } from '@/components/detailed-field';
import { PublicKey } from "@solana/web3.js";
import { getHeaderLayout } from "@/components/header-layout";
import { FaSpinner } from "react-icons/fa";
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';
import PumpFunSDK from '@/components/instructions/pump-bundler/pumpfun-interface';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

interface WorkerResult {
    secretKey: Uint8Array;
    publicKey: string;
}

interface TokenMetadata {
    name: string;
    symbol: string;
    description: string;
    image: string;
    show_name: boolean;
    createdOn: string;
    website?: string;
    twitter?: string;
    telegram?: string;
}

const ZERO = new BN(0)
type BN = typeof ZERO


const PumpFunCreator = () => {
    const { cluster } = useSolana();
    const { setDeployerWallets } = WalletProfileContext();
    const connection = new Connection(cluster.endpoint);
    const [uploading, setUploading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isKeypairUploaded, setIsKeypairUploaded] = useState(false);
    const [Mode, setMode] = useState(1);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const walletDependencyString = React.useMemo(() => {
        // Join all wallet strings into a single string to create a stable dependency
        return wallets.map(w => w.wallet).join(',');
    }, [wallets]);

    const [balances, setBalances] = useState<BalanceType[]>([]);
    // const [devMaxSolPercentage, setDevMaxSolPercentage] = React.useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [buyerMaxSolPercentage, setbuyerMaxSolPercentage] = React.useState('');
    const [isJitoBundle, setIsJitoBundle] = useState(true);
    const [setsideWallets, setdeployerwallets] = useState<Array<{ id: number, name: string, wallet: string, color: string }>>([]);
    const [lutAddress, setLutAddress] = useState<string>('');
    const [isLutCreated, setIsLutCreated] = useState(false);
    const [isCreatingLut, setIsCreatingLut] = useState(false);
    const [lutLogs, setLutLogs] = useState<string[]>([]);
    const [bundleResult, setBundleResult] = useState<any>(null);
    const [bundleId, setBundleId] = useState<string>('');
    const [bundleLogs, setBundleLogs] = useState<string[]>([]);
    const [bundleStatus, setBundleStatus] = useState<'idle' | 'sending' | 'confirmed' | 'rejected'>('idle');



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
        lutAddress?: string;
    }>({
        coinname: '',
        symbol: '',
        tokenDescription: '',
        vanity: 'pump',
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
        lutAddress: '',
    });

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }


    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        field: string
    ) => {
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
                } finally {
                    // Set the uploading state to false
                    setUploading(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleKeypairUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];

        if (file) {
            try {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const jsonContent = event.target?.result as string;
                        const keypairData = JSON.parse(jsonContent);

                        // Check if it's a valid keypair format (array of numbers)
                        if (Array.isArray(keypairData) && keypairData.length === 64) {
                            const uint8Array = new Uint8Array(keypairData);
                            const keypair = Keypair.fromSecretKey(uint8Array);

                            setFormData(prevState => ({
                                ...prevState,
                                tokenKeypair: bs58.encode(keypair.secretKey),
                                tokenKeypairpublicKey: keypair.publicKey.toBase58(),
                            }));

                            setIsKeypairUploaded(true);
                            toast.success("Keypair loaded successfully");
                        } else {
                            toast.error("Invalid keypair format. Please upload a valid JSON file containing a 64-byte array");
                        }
                    } catch (error) {
                        console.error("Error parsing keypair JSON:", error);
                        toast.error("Failed to parse keypair file. Make sure it's a valid JSON format");
                    }
                };
                reader.readAsText(file);
            } catch (error) {
                console.error("Error reading keypair file:", error);
                toast.error("Failed to read keypair file");
            }
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
            setIsLoading(false);
        }
    }


    const handleSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeployerWallets([]);
        localStorage.removeItem("deployerwallets");

        // Check if we're in LUT mode and the LUT has been created
        if (Mode === 20 && !isLutCreated) {
            toast.error('You must create a Look-Up Table (LUT) before deploying');
            return;
        }

        const tokenMetadata: TokenMetadata = {
            name: formData.coinname,
            symbol: formData.symbol,
            description: formData.tokenDescription || '',
            image: uploadedImageUrl,
            show_name: true,
            createdOn: new Date().toISOString(),
            ...(formData.websiteUrl && { website: formData.websiteUrl }),
            ...(formData.twitterUrl && { twitter: formData.twitterUrl }),
            ...(formData.telegramUrl && { telegram: formData.telegramUrl })
        };

        setDeployerWallets(setsideWallets);
        localStorage.setItem("deployerwallets", JSON.stringify(setsideWallets));
        toast.info('Please wait, sending bundle directly to Jito...');
        setBundleStatus('sending');
        setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Initiating bundle submission...`]);

        try {
            // Get the token keypair from base58 string
            const tokenKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.tokenKeypair)));

            setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Token mint: ${tokenKeypair.publicKey.toString()}`]);
            setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Building and sending transactions...`]);

            // Call the PumpBundler function which returns a bundle ID string and possibly a result
            const bundleResponse = await PumpBundler(
                connection,
                formData,
                tokenKeypair,
                tokenMetadata,
            );

            const bundleId = bundleResponse.bundleId;
            const result = bundleResponse.bundleResult;

            // Store the bundleId for reference
            const bundleData = bundleId;

            // Store the bundle info in state for the status panel
            setBundleId(bundleId);
            setBundleResult(result);
            setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Bundle sent successfully with ID: ${bundleId.substring(0, 8)}...`]);

            if (result) {
                if (result.rejected) {
                    setBundleStatus('rejected');
                    if (result.rejected.simulationFailure) {
                        const failure = result.rejected.simulationFailure;
                        const txSig = failure.txSignature.substring(0, 8) + '...';
                        const errorMsg = failure.msg.split(': ').pop() || "Unknown error";
                        setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Bundle rejected: Simulation failure`]);
                        setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Transaction ${txSig} failed: ${errorMsg}`]);
                    } else {
                        setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Bundle rejected: ${JSON.stringify(result.rejected)}`]);
                    }
                } else if (result.confirmed) {
                    setBundleStatus('confirmed');
                    setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Bundle confirmed by Jito!`]);
                    if (result.confirmed.landedInSlot) {
                        setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Landed in slot: ${result.confirmed.landedInSlot}`]);
                    }
                }
            }

            // Display toast for the bundle ID
            toast(
                () => (
                    <BundleToast txSig={bundleId} message={'Jito Bundle ID:'} />
                ),
                { duration: 5000 }
            );

            // Display toast for the mint
            toast(
                () => (
                    <TransactionToast txSig={tokenKeypair.publicKey.toString()} message={'Mint:'} />
                ),
                { duration: 5000 }
            );

            // If we have a bundle result, display it
            if (result) {
                if (result.rejected) {
                    // Bundle was rejected - display the error
                    let errorMsg = "Bundle rejected";

                    // Extract simulation failure message if present
                    if (result.rejected.simulationFailure) {
                        const failure = result.rejected.simulationFailure;
                        errorMsg = `Transaction failed: ${failure.msg.split(': ').pop() || "Unknown error"}`;

                        toast.error(errorMsg, { duration: 8000 });
                    } else {
                        toast.error("Bundle rejected by Jito: " + JSON.stringify(result.rejected), { duration: 8000 });
                    }
                } else if (result.confirmed) {
                    // Bundle was confirmed
                    toast.success("Bundle confirmed by Jito!", { duration: 5000 });
                }
            }
        } catch (error) {
            console.log('Error:', error);
            setBundleStatus('rejected');
            setBundleLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Error: ${error instanceof Error ? error.message : String(error)}`]);

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 500) {
                    toast.error(`Server error: ${error.response.data}`);
                } else {
                    toast.error(`API error: ${error.message}`);
                }
            } else if (error instanceof Error) {
                // Properly stringify the full error object for display
                const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
                console.error('Full error details:', errorDetails);

                // Try to extract detailed information from the error message
                const errorMessage = error.message;
                // Check if the message contains JSON
                if (errorMessage.includes('{') && errorMessage.includes('}')) {
                    try {
                        // Find the JSON part of the message
                        const jsonStart = errorMessage.indexOf('{');
                        const jsonEnd = errorMessage.lastIndexOf('}') + 1;
                        const jsonPart = errorMessage.substring(jsonStart, jsonEnd);
                        const errorData = JSON.parse(jsonPart);

                        // Display detailed error from the JSON
                        toast.error(`Error: ${errorData.error || JSON.stringify(errorData)}`);
                    } catch (e) {
                        // If JSON parsing fails, show the original error
                        toast.error(`Error: ${errorMessage}`);
                    }
                } else {
                    toast.error(`Error: ${errorMessage}`);
                }
            } else {
                toast.error(`Unknown error: ${String(error)}`);
            }
        }
    };


    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: BalanceType[] = [];

            if (formData.deployerPrivateKey) {
                const deployerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.deployerPrivateKey)));
                const balance = parseFloat((await connection.getBalance(deployerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                allBalances.push({ balance: balance, publicKey: deployerWallet.publicKey.toString() });
            }

            if (formData.buyerPrivateKey) {
                const buyerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.buyerPrivateKey)));
                const balance = parseFloat((await connection.getBalance(buyerWallet.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                allBalances.push({ balance: balance, publicKey: buyerWallet.publicKey.toString() });
            }

            // Check balances for wallet-input wallets
            const walletBalances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));
                        const balance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));
                        return { balance: balance, publicKey: keypair.publicKey.toString() };
                    } catch (error) {
                        toast.error(`Error fetching balance: ${error}`);
                        return { balance: 0, publicKey: 'Invalid' };
                    }
                })
            );

            allBalances = [...allBalances, ...walletBalances];
            setBalances(allBalances);
        };

        fetchBalances();
    }, [
        formData.deployerPrivateKey,
        formData.buyerPrivateKey,
        walletDependencyString
    ]);

    React.useEffect(() => {
        const amountsCalculation = async () => {
            try {

                const pumpFunSDK = new PumpFunSDK(connection, Keypair.generate());
                // Fetch global state data directly
                const globalStateData = await pumpFunSDK.getGlobalAccount();

                const tempBondingCurveData = {
                    virtualTokenReserves: globalStateData?.initialVirtualTokenReserves,
                    virtualSolReserves: globalStateData?.initialVirtualSolReserves,
                    realTokenReserves: globalStateData?.initialRealTokenReserves,
                };

                const devBuyQuote = calculateBuyTokensAndNewReserves(
                    new BN(Number(formData.BuyertokenbuyAmount) * LAMPORTS_PER_SOL),
                    tempBondingCurveData
                );

                const devMaxSolPercentage =
                    ((devBuyQuote.tokenAmount.toNumber() / 1000000) / 1000000000) * 100;

                setbuyerMaxSolPercentage(devMaxSolPercentage.toFixed(2));
            } catch (error) {
                console.error('Error calculating amounts:', error);
                // Handle error appropriately - maybe set an error state
                setbuyerMaxSolPercentage('0.00');
            }
        };

        if (formData.BuyertokenbuyAmount) {
            amountsCalculation();
        }
    }, [connection, formData.BuyertokenbuyAmount, setbuyerMaxSolPercentage]);


    React.useEffect(() => {
        const tokenMint = Keypair.generate();
        setFormData(prevState => ({
            ...prevState,
            tokenKeypairpublicKey: tokenMint.publicKey.toBase58(),
            tokenKeypair: bs58.encode(tokenMint.secretKey),
        }));
    }, []);

    const createLUT = async () => {
        if (!formData.deployerPrivateKey) {
            toast.error('Deployer private key is required');
            return;
        }

        if (wallets.length === 0) {
            toast.error('Please add wallets before creating a LUT');
            return;
        }

        setIsCreatingLut(true);
        setLutLogs(prev => [...prev, 'Starting LUT creation...']);

        try {
            const deployerKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(formData.deployerPrivateKey)));

            // Get the current slot for LUT creation
            const currentSlot = await connection.getSlot();
            setLutLogs(prev => [...prev, `Current slot: ${currentSlot}`]);

            // Step 1: Create the lookup table
            const [createLutIx, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
                authority: deployerKeypair.publicKey,
                payer: deployerKeypair.publicKey,
                recentSlot: currentSlot
            });

            setLutLogs(prev => [...prev, `Creating LUT with address: ${lookupTableAddress.toString()}`]);

            // Create transaction for LUT creation
            const recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
            const createMessage = new TransactionMessage({
                payerKey: deployerKeypair.publicKey,
                recentBlockhash,
                instructions: [createLutIx]
            }).compileToV0Message();

            const createLutTx = new VersionedTransaction(createMessage);
            createLutTx.sign([deployerKeypair]);

            const createLutTxId = await connection.sendTransaction(createLutTx);
            setLutLogs(prev => [...prev, `LUT creation transaction sent: ${createLutTxId}`]);

            // Wait for confirmation
            await connection.confirmTransaction(createLutTxId);
            setLutLogs(prev => [...prev, 'LUT creation confirmed']);

            // Set LUT address
            setLutAddress(lookupTableAddress.toString());

            // Wait a bit to ensure LUT is available
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 2: Prepare addresses to add to the LUT
            const addresses = wallets.map(entry => {
                try {
                    return Keypair.fromSecretKey(new Uint8Array(base58.decode(entry.wallet))).publicKey;
                } catch (error) {
                    console.error('Invalid wallet private key:', error);
                    throw new Error('Invalid wallet private key');
                }
            });

            // Add deployer address if not included
            if (!addresses.some(addr => addr.equals(deployerKeypair.publicKey))) {
                addresses.unshift(deployerKeypair.publicKey);
            }

            // Add mint address
            const mintKey = new PublicKey(formData.tokenKeypairpublicKey || Keypair.generate().publicKey);
            if (!addresses.some(addr => addr.equals(mintKey))) {
                addresses.push(mintKey);
            }

            setLutLogs(prev => [...prev, `Extending LUT with ${addresses.length} addresses`]);

            // Split addresses into batches (maximum 30 addresses per extension to stay under transaction limits)
            const MAX_ADDRESSES_PER_BATCH = 30;
            const addressBatches = [];
            for (let i = 0; i < addresses.length; i += MAX_ADDRESSES_PER_BATCH) {
                addressBatches.push(addresses.slice(i, i + MAX_ADDRESSES_PER_BATCH));
            }

            // Process each batch
            for (let batchIndex = 0; batchIndex < addressBatches.length; batchIndex++) {
                const batchAddresses = addressBatches[batchIndex];

                // Step 3: Extend the lookup table with addresses
                const extendLutIx = AddressLookupTableProgram.extendLookupTable({
                    payer: deployerKeypair.publicKey,
                    authority: deployerKeypair.publicKey,
                    lookupTable: lookupTableAddress,
                    addresses: batchAddresses
                });

                // Create transaction for LUT extension
                const extendRecentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
                const extendMessage = new TransactionMessage({
                    payerKey: deployerKeypair.publicKey,
                    recentBlockhash: extendRecentBlockhash,
                    instructions: [extendLutIx]
                }).compileToV0Message();

                const extendLutTx = new VersionedTransaction(extendMessage);
                extendLutTx.sign([deployerKeypair]);

                const extendLutTxId = await connection.sendTransaction(extendLutTx);
                setLutLogs(prev => [...prev, `LUT extension batch ${batchIndex + 1}/${addressBatches.length} sent: ${extendLutTxId}`]);

                // Wait for confirmation
                await connection.confirmTransaction(extendLutTxId);
                setLutLogs(prev => [...prev, `LUT extension batch ${batchIndex + 1}/${addressBatches.length} confirmed`]);

                // Small delay between batches
                if (batchIndex < addressBatches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Step 4: Verify the LUT by fetching it
            const lookupTableAccount = await connection.getAddressLookupTable(lookupTableAddress);
            if (!lookupTableAccount.value) {
                throw new Error('Failed to fetch lookup table after creation');
            }

            const addressCount = lookupTableAccount.value.state.addresses.length;
            setLutLogs(prev => [...prev, `LUT verified with ${addressCount} addresses`]);

            setIsLutCreated(true);
            setFormData(prevState => ({
                ...prevState,
                lutAddress: lookupTableAddress.toString()
            }));

            toast.success(`LUT created successfully with ${addressCount} addresses`);

        } catch (error) {
            console.error('Error creating LUT:', error);
            setLutLogs(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
            toast.error(`Failed to create LUT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsCreatingLut(false);
        }
    };

    return (
        <div className=" mb-8 mx-8  flex mt-8 justify-center items-center relative" >
            <form>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>Bundle Mode</p>
                                    <p className=' text-[12px] text-[#96989c] '>Create a pump-fun token and ghost wallet buys in one go</p>
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
                                                    buyerWalletAmounts: walletData.map(entry => entry.solAmount)
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
                                                        buyerWalletAmounts: walletData.map(entry => entry.solAmount)
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
                </div>
            </form >
        </div >
    );
}

const modeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 4, label: "Wallet Mode" },
    { value: 20, label: "Wallet Mode" },
];




PumpFunCreator.getLayout = (page: ReactNode) => getHeaderLayout(page, "Pumpfun Creator");

export default PumpFunCreator;