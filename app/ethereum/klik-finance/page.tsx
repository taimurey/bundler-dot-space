'use client';

import React, { ChangeEvent, useState } from 'react';
import { OutputField } from '@/components/OutputField';
import { toast } from "sonner";
import { InputField } from '@/components/ui/input-field';
import { randomColor } from '@/components/utils/random-color';
import { deployKlikCoin, validatePrivateKey, getWalletBalance, connectWallet, isWalletAvailable, KlikFinanceDeployer } from './components/KlikFinanceDeployer';
import EthereumWalletInput, { EthereumWalletEntry } from './components/EthereumWalletInput';
import { BundleToast, LinkToast, TransactionToast } from '@/components/bundler-toasts';
import ImageUploadIcon from '@/components/icons/imageuploadIcon';

const KlikFinanceHandler = () => {
    const [wallets, setWallets] = useState<EthereumWalletEntry[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [Mode, setMode] = useState(1);
    const [uploadedImage, setUploadedImage] = useState<string>('');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState<{
        deployerPrivateKey: string;
        buyerPrivateKey: string;
        buyerextraWallets: string[];
        buyerWalletAmounts: string[];
        walletsNumbers: string;
        tokenContractAddress: string;
        tokenName: string;
        tokenSymbol: string;
        tokenDecimals: string;
        totalSupply: string;
        tokenbuyAmount: string;
        tokenLiquidityAmount: string;
        tokenLiquidityAddPercent: string;
        networkSelection: string;
        gasFee: string;
        priorityFee: string;
    }>(
        {
            deployerPrivateKey: '',
            buyerPrivateKey: '',
            buyerextraWallets: [],
            buyerWalletAmounts: [],
            walletsNumbers: '',
            tokenContractAddress: '',
            tokenName: '',
            tokenSymbol: '',
            tokenDecimals: '',
            totalSupply: '',
            tokenbuyAmount: '',
            tokenLiquidityAmount: '',
            tokenLiquidityAddPercent: '',
            networkSelection: 'ethereum',
            gasFee: '0.001',
            priorityFee: '0.0001',
        }
    );

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }

    const [setsideWallets, setdeployerwallets] = useState<Array<{ id: number, name: string, wallet: string, color: string }>>([]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));

        if (field === 'deployerPrivateKey') {
            try {
                // Validate Ethereum private key
                if (!validatePrivateKey(value)) {
                    toast.error('Invalid Private Key');
                    return;
                }

                setdeployerwallets(prevProfiles => [...prevProfiles, {
                    id: prevProfiles.length,
                    name: 'Deployer',
                    wallet: value,
                    color: randomColor(),
                }]);
                setFormData(prevState => ({
                    ...prevState,
                    deployerPrivateKey: value,
                }));
            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }
        }

        if (field === 'buyerPrivateKey') {
            try {
                // Validate Ethereum private key
                if (!validatePrivateKey(value)) {
                    toast.error('Invalid Private Key');
                    return;
                }

                setFormData(prevState => ({
                    ...prevState,
                    buyerPrivateKey: value,
                }));

                setdeployerwallets(prevProfiles => [...prevProfiles, {
                    id: prevProfiles.length,
                    name: 'Buyer',
                    wallet: value,
                    color: randomColor(),
                }]);
            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }
        }
    };

    const [firstLoad, setFirstLoad] = useState(true);

    React.useEffect(() => {
        if (firstLoad) {
            setFirstLoad(false);
            return;
        }
        if (!formData.tokenContractAddress) {
            toast.error('No contract address provided');
            return;
        }

        const fetchData = async () => {
            // Ethereum token metadata fetching logic would go here
            console.log('Fetching token metadata for:', formData.tokenContractAddress);
        };
        fetchData();
    }, [formData.tokenContractAddress]);

    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: any[] = [];

            // For now, we'll use placeholder balances
            // In a real implementation, you would fetch balances using Web3 calls
            if (formData.deployerPrivateKey && validatePrivateKey(formData.deployerPrivateKey)) {
                try {
                    // Check if wallet is available first
                    if (isWalletAvailable()) {
                        const account = await connectWallet();
                        if (account) {
                            const balance = await getWalletBalance(account);
                            allBalances.push({ balance: parseFloat(balance), publicKey: account });
                        }
                    } else {
                        // Placeholder balance when no wallet is connected
                        allBalances.push({ balance: 0, publicKey: 'deployer-address' });
                    }
                } catch (error) {
                    console.error('Error fetching deployer balance:', error);
                    allBalances.push({ balance: 0, publicKey: 'deployer-address' });
                }
            }

            setFormData(prevState => ({
                ...prevState,
                buyerextraWallets: wallets.map(wallet => wallet.wallet),
                buyerWalletAmounts: wallets.map(wallet => wallet.ethAmount || '0'),
            }));

            setBalances(allBalances);
        };

        fetchBalances();
    }, [wallets, formData.deployerPrivateKey, formData.buyerPrivateKey, formData.networkSelection]);

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

    const handlesubmission = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (
            !formData.deployerPrivateKey ||
            !formData.tokenName ||
            !formData.tokenSymbol ||
            !formData.networkSelection
        ) {
            toast.error('Please fill all required fields: Deployer Private Key, Token Name, Symbol, and Network');
            return;
        }

        // Validate buy amount for Mode 1
        if (Mode === 1 && (!formData.tokenbuyAmount || parseFloat(formData.tokenbuyAmount) <= 0)) {
            toast.error('Please enter a valid buy amount for initial purchase');
            return;
        }

        // Validate image upload
        if (!uploadedImageUrl) {
            toast.error('Please upload an image for your token');
            return;
        }

        // Validate private key
        if (!validatePrivateKey(formData.deployerPrivateKey)) {
            toast.error('Invalid deployer private key');
            return;
        }

        // Validate deployer wallet balance for deployment + buy amount
        if (Mode === 1) {
            const buyAmount = parseFloat(formData.tokenbuyAmount || '0');
            const gasEstimate = parseFloat(formData.gasFee || '0.001');

            // Calculate total buy amount (main buy + additional wallets)
            let totalBuyAmount = buyAmount;
            if (wallets.length > 0) {
                const additionalBuyAmount = wallets.reduce((sum, wallet) => sum + parseFloat(wallet.ethAmount || '0'), 0);
                totalBuyAmount += additionalBuyAmount;
                console.log(`💰 Total buy amount: ${buyAmount} (main) + ${additionalBuyAmount} (additional wallets) = ${totalBuyAmount} ETH`);
            }

            const totalRequired = totalBuyAmount + gasEstimate + 0.01; // Add buffer

            // Check balance (placeholder - in real implementation you'd fetch actual balance)
            const deployerBalance = parseFloat(balances.find(b => b.publicKey.includes('deployer'))?.balance || '0');
            if (deployerBalance < totalRequired) {
                toast.error(`Insufficient balance. Required: ${totalRequired.toFixed(4)} ETH (${totalBuyAmount} buy + ${gasEstimate} gas + buffer), Available: ${deployerBalance} ETH`);
                return;
            }
        }

        try {
            toast.info('Please wait, deploying token may take a few seconds...');

            // Log deployment parameters
            console.log('Sending to deployer:', {
                name: formData.tokenName,
                symbol: formData.tokenSymbol,
                network: formData.networkSelection,
                imageUrl: uploadedImageUrl,
                cdnUrl: uploadedImageUrl,
                hasImage: !!uploadedImageUrl
            });

            // Prepare metadata with uploaded image
            const metadata = JSON.stringify({
                name: formData.tokenName,
                symbol: formData.tokenSymbol,
                description: `${formData.tokenName} (${formData.tokenSymbol}) token deployed via Klik Finance`,
                image: uploadedImageUrl || '',
                external_url: '',
                attributes: [
                    {
                        trait_type: "Deployment Method",
                        value: "Klik Finance Bundler"
                    },
                    {
                        trait_type: "Network",
                        value: formData.networkSelection
                    },
                    {
                        trait_type: "Token Name",
                        value: formData.tokenName
                    },
                    {
                        trait_type: "Token Symbol",
                        value: formData.tokenSymbol
                    }
                ]
            });

            // Calculate the total ETH to send (main buy amount + additional wallets)
            const mainBuyAmount = Mode === 1 ? parseFloat(formData.tokenbuyAmount || '0') : 0;
            let totalBuyAmount = mainBuyAmount;

            // Add amounts from additional wallets (CSV uploads)
            if (wallets.length > 0) {
                const additionalBuyAmount = wallets.reduce((sum, wallet) => sum + parseFloat(wallet.ethAmount || '0'), 0);
                totalBuyAmount += additionalBuyAmount;
                console.log(`💰 Total buy calculation: ${mainBuyAmount} (main) + ${additionalBuyAmount} (additional) = ${totalBuyAmount} ETH`);
            }

            const deploymentFee = totalBuyAmount.toString(); // Use total buy amount as deployment fee for auto-buy

            console.log(`🚀 Deploying with total buy amount: ${totalBuyAmount} ETH`);

            if (wallets.length > 0) {
                console.log(`📝 Note: All ${totalBuyAmount} ETH will be used for initial token purchase by deployer wallet. Additional wallets will need separate transactions for token transfers.`);
            }

            // Deploy the coin with all required parameters
            const result = await deployKlikCoin({
                name: formData.tokenName,
                symbol: formData.tokenSymbol,
                metadata: metadata,
                network: formData.networkSelection as any,
                privateKey: formData.deployerPrivateKey,
                deploymentFee: deploymentFee, // This ETH will be used for automatic token purchase
                // Additional parameters for deployment
                imageUrl: uploadedImageUrl,
                cdnUrl: uploadedImageUrl, // CDN URL (same as image URL)
                tokenName: formData.tokenName,
                tokenSymbol: formData.tokenSymbol
            });

            if (result.success) {
                // Update form data with deployed token address
                if (result.tokenAddress) {
                    setFormData(prevState => ({
                        ...prevState,
                        tokenContractAddress: result.tokenAddress || ''
                    }));
                }

                // Show success messages
                if (Mode === 1 && totalBuyAmount > 0) {
                    toast.success(`Token deployed and ${totalBuyAmount} ETH automatically used to buy tokens!`);
                } else {
                    toast.success(`Token deployed successfully!`);
                }

                if (result.transactionHash) {
                    toast(
                        () => (
                            <TransactionToast
                                txSig={result.transactionHash || ''}
                                message={'Transaction Hash:'}
                            />
                        ),
                        { duration: 8000 }
                    );
                }

                if (result.tokenAddress) {
                    toast(
                        () => (
                            <TransactionToast
                                txSig={result.tokenAddress || ''}
                                message={'Token Address:'}
                            />
                        ),
                        { duration: 8000 }
                    );
                }

                console.log('Deployment successful:', result);
            } else {
                throw new Error(result.message);
            }

        } catch (error: any) {
            console.error('Deployment error:', error);

            if (error.message.includes('Insufficient funds')) {
                toast.error('Insufficient funds for deployment');
            } else if (error.message.includes('Contract address not configured')) {
                toast.error('Network not supported yet. Please contact support.');
            } else if (error.message.includes('Unsupported network')) {
                toast.error('Please select a supported network');
            } else {
                toast.error(`Deployment failed: ${error.message}`);
            }
        }
    };

    const truncate = (str: string, startChars: number, endChars: number) => {
        if (str.length <= startChars + endChars) return str;
        return str.slice(0, startChars) + '...' + str.slice(-endChars);
    };

    return (
        <div className="w-full p-2">
            <form className="w-full">
                <div className="w-full">
                    <div className="w-full">
                        <div className="flex flex-col lg:flex-row h-full gap-4 w-full">
                            <div className="flex-1 space-y-4 p-4 border border-neutral-500 rounded-md bg-background/80 shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[25px]'>
                                        Klik Finance Bundler
                                        <span className='text-[#ff3535] text-[12px] ml-6 font-bold'>(Report Any Errors in the Discord)</span>
                                    </p>
                                    <p className='text-[12px] text-[#96989c]'>Deploy ERC-20 tokens and automatically create liquidity pools with initial token purchases.</p>
                                </div>
                                <div className='w-full'>
                                    <label className="block mt-5 text-base text-white font-semibold">
                                        Bundler Mode
                                        <span className="pl-5 text-[#FFC107] text-[12px] font-normal">
                                            Multi wallet mode available
                                        </span>
                                    </label>
                                    <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                        <select
                                            id="modeSelection"
                                            value={Mode}
                                            onChange={(e) => setMode(Number(e.target.value))}
                                            required={true}
                                            className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
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
                                    <div className="gap-y-2">
                                        <InputField
                                            id="deployerPrivatekey"
                                            label="Deployer Private Key"
                                            subfield='Coin Deployer'
                                            value={formData.deployerPrivateKey}
                                            onChange={(e) => handleChange(e, 'deployerPrivateKey')}
                                            placeholder="Enter deployer private key"
                                            type="password"
                                            required={true}
                                        />
                                        {Mode === 1 && (
                                            <div className='w-full mt-5'>
                                                <InputField
                                                    id='buyerPrivateKey'
                                                    label='Buyer Private Key (Optional)'
                                                    subfield='leave empty to use deployer wallet for buying'
                                                    value={formData.buyerPrivateKey}
                                                    onChange={(e) => handleChange(e, 'buyerPrivateKey')}
                                                    placeholder='optional - deployer will buy if empty'
                                                    type='password'
                                                    required={false}
                                                />
                                            </div>
                                        )}
                                        <div className="relative rounded-md shadow-sm w-full flex flex-col gap-2 justify-end">
                                            {(Mode === 1 || Mode === 5) && (
                                                <div className="mt-5">
                                                    <label className="block text-base text-white font-semibold mb-2">
                                                        {Mode === 1 ? 'Additional Buyer Wallets (Optional)' : 'Buyer Wallets'}
                                                        <span className="pl-3 text-[#FFC107] text-[12px] font-normal">
                                                            {Mode === 1 ? 'Upload CSV for multiple buyers - ETH amounts will be combined for initial purchase' : 'CSV upload required'}
                                                        </span>
                                                    </label>
                                                    {Mode === 1 && wallets.length > 0 && (
                                                        <div className="mb-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-md">
                                                            <p className="text-xs text-blue-300">
                                                                ℹ️ <strong>Note:</strong> All ETH amounts ({wallets.reduce((sum, wallet) => sum + parseFloat(wallet.ethAmount || '0'), 0).toFixed(4)} ETH from {wallets.length} wallets) will be combined with your main buy amount for the initial token purchase by the deployer wallet.
                                                            </p>
                                                        </div>
                                                    )}
                                                    <EthereumWalletInput
                                                        wallets={wallets}
                                                        setWallets={setWallets}
                                                        Mode={Mode}
                                                        maxWallets={Mode === 1 ? 10 : 4}
                                                        walletType="privateKeys"
                                                        onChange={(walletData) => {
                                                            setFormData(prevState => ({
                                                                ...prevState,
                                                                buyerextraWallets: walletData.map(entry => entry.wallet),
                                                                buyerWalletAmounts: walletData.map(entry => entry.ethAmount.toString())
                                                            }));
                                                        }}
                                                        onWalletsUpdate={(walletData) => {
                                                            // Log the complete wallet data with amounts
                                                            console.log('Updated Ethereum wallet data:', walletData.map(entry => ({
                                                                wallet: entry.wallet,
                                                                ethAmount: entry.ethAmount,
                                                                wei: entry.ethAmount * Math.pow(10, 18)
                                                            })));
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className='flex flex-col gap-2' id="tokeninfo">
                                    {/* <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="tokenContractAddress"
                                            label="Contract"
                                            subfield='token address'
                                            value={formData.tokenContractAddress}
                                            onChange={(e) => handleChange(e, 'tokenContractAddress')}
                                            placeholder="Enter Contract Address"
                                            type="text"
                                            required={true}
                                        />
                                    </div> */}

                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            label="Token Name"
                                            id="tokenName"
                                            value={formData.tokenName}
                                            onChange={(e) => handleChange(e, 'tokenName')}
                                            placeholder="Enter Token Name"
                                            type="text"
                                            required={true}
                                        />
                                        <InputField
                                            label="Token Symbol"
                                            id="tokenSymbol"
                                            value={formData.tokenSymbol}
                                            onChange={(e) => handleChange(e, 'tokenSymbol')}
                                            placeholder="Enter Token Symbol"
                                            type="text"
                                            required={true}
                                        />
                                    </div>
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
                                    {/* 
                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            label="Decimals"
                                            id="tokenDecimals"
                                            value={formData.tokenDecimals}
                                            onChange={(e) => handleChange(e, 'tokenDecimals')}
                                            placeholder="Enter decimals"
                                            type="number"
                                            required={true}
                                        />
                                        <InputField
                                            label="Total Supply"
                                            id="totalSupply"
                                            value={formData.totalSupply}
                                            onChange={(e) => handleChange(e, 'totalSupply')}
                                            placeholder="Enter total supply"
                                            type="number"
                                            required={true}
                                        />
                                    </div> */}

                                    {Mode === 1 && (
                                        <InputField
                                            id="tokenbuyAmount"
                                            label="Initial Buy Amount"
                                            subfield='ETH - automatically buys tokens after deployment'
                                            value={formData.tokenbuyAmount}
                                            onChange={(e) => handleChange(e, 'tokenbuyAmount')}
                                            placeholder="0.1"
                                            type="number"
                                            required={true}
                                        />
                                    )}

                                    {/* <div className='flex justify-end items-end gap-2'>
                                        <InputField
                                            id="tokenLiquidityAmount"
                                            label="Liquidity Amount"
                                            subfield='ETH'
                                            value={formData.tokenLiquidityAmount}
                                            onChange={(e) => handleChange(e, 'tokenLiquidityAmount')}
                                            placeholder="Enter Liquidity Amount"
                                            type="number"
                                            required={true}
                                        />
                                        <InputField
                                            id="tokenLiquidityAddPercent"
                                            subfield='%'
                                            value={formData.tokenLiquidityAddPercent}
                                            onChange={(e) => handleChange(e, 'tokenLiquidityAddPercent')}
                                            placeholder="% of tokens (1-100)"
                                            type="number"
                                            label="Amount Percentage"
                                            required={true}
                                        />
                                    </div> */}

                                    <div className='w-full'>
                                        <label className="block mt-5 text-base text-white font-semibold">
                                            Network Selection
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                                            <select
                                                id="networkSelection"
                                                value={formData.networkSelection}
                                                onChange={(e) => handleSelectionChange(e, 'networkSelection')}
                                                required={true}
                                                className="block w-full px-4 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none sm:text-base text-[12px] h-[40px] focus:border-blue-500"
                                            >
                                                <option value="ethereum">Ethereum Mainnet</option>
                                                <option value="sepolia">Sepolia Testnet</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="gasFee"
                                            label="Gas Fee"
                                            subfield='ETH'
                                            value={formData.gasFee}
                                            onChange={(e) => handleChange(e, 'gasFee')}
                                            placeholder="Gas Fee"
                                            type="number"
                                            required={true}
                                        />
                                        <InputField
                                            id="priorityFee"
                                            label="Priority Fee"
                                            subfield='ETH'
                                            value={formData.priorityFee}
                                            onChange={(e) => handleChange(e, 'priorityFee')}
                                            placeholder="Priority Fee"
                                            type="number"
                                            required={true}
                                        />
                                    </div>

                                    <button
                                        onClick={handlesubmission}
                                        className='invoke-btn w-full'
                                        type='button'
                                    >
                                        <span className='btn-text-gradient'>
                                            {Mode === 1 && (parseFloat(formData.tokenbuyAmount || '0') > 0 || wallets.length > 0)
                                                ? `Deploy & Buy with ${(
                                                    parseFloat(formData.tokenbuyAmount || '0') +
                                                    wallets.reduce((sum, wallet) => sum + parseFloat(wallet.ethAmount || '0'), 0)
                                                ).toFixed(4)} ETH`
                                                : 'Deploy Token'
                                            }
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 lg:max-w-md p-4 border border-neutral-600 shadow rounded-md bg-background/60 flex flex-col justify-start items-start">
                                <div>
                                    <div>
                                        <p className='font-bold text-[25px]'>Predicted Parameters</p>
                                        <p className='text-[12px] text-[#96989c]'>Here are the predicted parameters based on your input.</p>
                                    </div>
                                    <div className='w-full'>
                                        <label className="block mt-5 text-base text-white font-semibold">
                                            Wallets:
                                        </label>
                                        <br />
                                        <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end">
                                            {balances.map(({ balance, publicKey }, index) => (
                                                <a
                                                    key={index}
                                                    href={`https://etherscan.io/address/${publicKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base max-w-[300px] bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[10px] select-text"
                                                    style={{ userSelect: 'text' }}
                                                >
                                                    <p>
                                                        <span className='text-[#96989c] text-[15px] font-normal'>{index + 1}: </span>
                                                        {truncate(publicKey, 6, 7)}
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>Balance: {balance}</span>
                                                        <br />
                                                    </p>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                    <OutputField
                                        id="totalcontractaddress"
                                        label="Contract Address:"
                                        value={formData.tokenContractAddress}
                                        latedisplay={true}
                                    />
                                    <OutputField
                                        id="tokenName"
                                        label="Token Name"
                                        value={formData.tokenName}
                                        latedisplay={true}
                                    />
                                    <OutputField
                                        id="buyamount"
                                        label="Total Buy Amount"
                                        value={`${(() => {
                                            const mainAmount = parseFloat(formData.tokenbuyAmount || '0');
                                            const additionalAmount = wallets.reduce((sum, wallet) => sum + parseFloat(wallet.ethAmount || '0'), 0);
                                            const total = mainAmount + additionalAmount;
                                            return total > 0 ? `${total.toFixed(4)} ETH` + (additionalAmount > 0 ? ` (${mainAmount} main + ${additionalAmount.toFixed(4)} additional)` : '') : '0';
                                        })()}`}
                                        latedisplay={true}
                                    />
                                    <OutputField
                                        id="liquidityamount"
                                        label="Liquidity Amount"
                                        value={`${formData.tokenLiquidityAmount && formData.tokenLiquidityAmount !== '0' ? `${formData.tokenLiquidityAmount} ETH` : formData.tokenLiquidityAmount}`}
                                        latedisplay={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

const modeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 5, label: "Wallet Mode" },
];

export default KlikFinanceHandler;
