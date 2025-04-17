import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createImageFromInitials } from "@/components/helpers/common/createImage"
import React, { FC, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "@/components/context/NetworkConfigurationProvider";
import { toast } from "sonner";
import { UpdatedInputField } from "@/components/FieldComponents/UpdatedInputfield";
import { createToken2022 } from "@/components/TransactionUtils/token2022";
import { LinkToast, TransactionToast } from "@/components/common/Toasts/TransactionToast";
import ImageUploadIcon from "@/components/icons/imageuploadIcon";
import TwitterIcon from "@/components/icons/TwitterIcon";
import { FaDiscord, FaGlobe, FaTelegram, FaInfoCircle } from "react-icons/fa";

// Tooltip component for extension descriptions
const ExtensionTooltip: FC<{ title: string; description: string }> = ({ title, description }) => {
    return (
        <div className="group relative flex items-center">
            <FaInfoCircle className="ml-2 text-gray-400 cursor-pointer" />
            <div className="absolute left-full ml-2 w-64 p-2 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <p className="font-semibold mb-1">{title}</p>
                <p>{description}</p>
            </div>
        </div>
    );
};

const CreateToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        // Basic token info
        tokenName: "",
        tokenSymbol: "",
        tokenDescription: "",
        iconUrl: "",
        websiteUrl: "",
        twitterUrl: "",
        telegramUrl: "",
        discordUrl: "",
        tokenDecimals: "9",
        supply: "1000000000",
        uploadedImage: uploadedImage,

        // Token-2022 Extensions
        transferFeeEnabled: false,
        transferFeeBasisPoints: 100, // 1%
        maxTransferFee: "1000", // 1000 tokens

        memoTransferEnabled: false,

        metadataPointerEnabled: false,

        permanentDelegateEnabled: false,
        permanentDelegateAddress: "",

        interestBearingEnabled: false,
        interestRate: 500, // 5%

        defaultAccountStateEnabled: false,
        defaultAccountState: "initialized", // or "frozen"
    });

    const [tokenMintAddress, setTokenMintAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [image, setImage] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [creatingToken, setCreatingToken] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, field: string) => {
        const { value, checked, type } = e.target as HTMLInputElement;

        if (type === 'checkbox') {
            setFormData(prevState => ({
                ...prevState,
                [field]: checked,
            }));
        } else if (type === 'number') {
            // Handle numeric fields
            setFormData(prevState => ({
                ...prevState,
                [field]: value,
            }));
        } else {
            // For other input types (e.g., text, textarea, select), update the formData with the value
            setFormData(prevState => ({
                ...prevState,
                [field]: value,
                // Automatically enable metadataPointer if tokenName field has a value
                ...(field === 'tokenName' && value ? { metadataPointerEnabled: true } : {})
            }));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        handleChange(e as any, "uploadedImage")

        if (file) {
            // Automatically enable metadataPointer when an image is uploaded
            setFormData(prevState => ({
                ...prevState,
                metadataPointerEnabled: true
            }));

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

                    const response = await fetch('https://mevarik-deployer.xyz:2791/upload-json', {
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

    const createTokenCallback = async (e: any) => {
        e.preventDefault();
        setCreatingToken(true);
        if (!publicKey) {
            toast.error("Wallet not connected");
            setCreatingToken(false);
            return;
        }
        if (!uploadedImageUrl) {
            toast.error("Please upload an image");
            setCreatingToken(false);
            return;
        }

        // Validate extension-specific fields
        if (formData.transferFeeEnabled) {
            if (formData.transferFeeBasisPoints <= 0 || formData.transferFeeBasisPoints > 10000) {
                toast.error("Transfer fee basis points must be between 1 and 10000");
                setCreatingToken(false);
                return;
            }
            if (parseFloat(formData.maxTransferFee) <= 0) {
                toast.error("Maximum transfer fee must be greater than 0");
                setCreatingToken(false);
                return;
            }
        }

        if (formData.interestBearingEnabled) {
            if (formData.interestRate <= 0 || formData.interestRate > 10000) {
                toast.error("Interest rate must be between 1 and 10000");
                setCreatingToken(false);
                return;
            }
        }

        if (formData.permanentDelegateEnabled && formData.permanentDelegateAddress) {
            try {
                // This would validate the public key format
                if (formData.permanentDelegateAddress.length !== 44) {
                    throw new Error("Invalid public key length");
                }
            } catch (error) {
                toast.error("Invalid permanent delegate address");
                setCreatingToken(false);
                return;
            }
        }

        const TokenMetadata: any = {
            "name": formData.tokenName,
            "symbol": formData.tokenSymbol,
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

        console.log(TokenMetadata, "TokenMetadata")
        toast.info("Creating Token-2022 token...");
        try {
            const { signature, token } = await createToken2022(formData, connection, TokenMetadata, publicKey, sendTransaction);

            setTokenMintAddress(token);

            toast(
                () => (<TransactionToast
                    txSig={signature}
                    message={"Token created successfully!"}
                />
                ),
                { duration: 5000 }
            );

            toast(
                () => (
                    <div className="flex justify-between items-center">
                        <p className="text-white">Mint Address</p>
                        <a
                            href={`https://solscan.io/account/${token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500"
                        >
                            View on Solana Explorer
                        </a>
                    </div>
                ),
                { duration: 5000 }
            );

        }
        catch (error: any) {
            toast.error("Error creating the token");
            console.error(error);
        } finally {
            // Set the creatingToken state to false
            setCreatingToken(false);
        }
    };

    const setImageandsymbol = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = e.target;
        const icon = createImageFromInitials(value);
        setImage(icon ?? '');
        handleChange(e, "tokenSymbol")
    }

    return (
        <div className="p-4">
            {isLoading && (
                <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
                    <ClipLoader />
                </div>
            )}

            {!tokenMintAddress ? (
                <form onSubmit={createTokenCallback} className="flex flex-col gap-4">
                    <div>
                        <p className="text-base uppercase text-white font-medium">SPL Token 2022 Creation</p>
                        <p className="text-xs text-[#8c929d]">This information is stored on IPFS by + Metaplex Metadata standard.</p>
                    </div>
                    <hr className="border-[#e8e2e2b8]" />

                    {/* Basic Token Info Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="md:w-1/2">
                                <UpdatedInputField
                                    id="tokenName"
                                    label="Token Name *"
                                    value={formData.tokenName}
                                    onChange={(e) => handleChange(e, 'tokenName')}
                                    placeholder="Enter Token Name (e.g., Solana Token)"
                                    type="text"
                                    required={true}
                                />
                            </div>
                            <div className="md:w-1/2">
                                <UpdatedInputField
                                    id="tokenSymbol"
                                    label="Token Symbol *"
                                    value={formData.tokenSymbol}
                                    onChange={(e) => { handleChange(e, 'tokenSymbol'); setImageandsymbol(e); }}
                                    placeholder="Enter Token Symbol (e.g., SOL)"
                                    type="text"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="md:w-1/2">
                                <UpdatedInputField
                                    id="tokenDecimals"
                                    label="Token Decimals *"
                                    value={formData.tokenDecimals}
                                    onChange={(e) => handleChange(e, 'tokenDecimals')}
                                    placeholder="Enter token decimals (0-9)"
                                    type="number"
                                    required={true}
                                />
                            </div>
                            <div className="md:w-1/2">
                                <UpdatedInputField
                                    id="supply"
                                    label="Initial Supply *"
                                    value={formData.supply}
                                    onChange={(e) => handleChange(e, 'supply')}
                                    placeholder="Enter token supply"
                                    type="text"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-white text-sm font-medium">Description</label>
                            <textarea
                                name=""
                                id="tokenDescription"
                                value={formData.tokenDescription}
                                rows={3}
                                className="mt-1 px-3 bg-[#202020]/20 text-sm block w-full p-2 rounded-md border border-[#404040] text-white focus:outline-none placeholder-[#dbd7d7d4]"
                                onChange={(e) => handleChange(e, 'tokenDescription')}
                                placeholder="Enter description..."
                            ></textarea>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 w-full">
                            <div className="w-full md:w-1/2 flex flex-col gap-2">
                                <p className="text-xs text-white font-medium">Extensions</p>
                                <UpdatedInputField
                                    id="websiteUrl"
                                    label=""
                                    value={formData.websiteUrl}
                                    onChange={(e) => handleChange(e, 'websiteUrl')}
                                    placeholder={"Website URL"}
                                    type="url"
                                    required={false}
                                />
                                <UpdatedInputField
                                    id="twitterUrl"
                                    label=""
                                    value={formData.twitterUrl}
                                    onChange={(e) => handleChange(e, 'twitterUrl')}
                                    placeholder={"Twitter URL"}
                                    type="url"
                                    required={false}
                                />
                                <UpdatedInputField
                                    id="telegramUrl"
                                    label=""
                                    value={formData.telegramUrl}
                                    onChange={(e) => handleChange(e, 'telegramUrl')}
                                    placeholder={"Telegram Group URL"}
                                    type="url"
                                    required={false}
                                />
                                <UpdatedInputField
                                    id="discordUrl"
                                    label=""
                                    value={formData.discordUrl}
                                    onChange={(e) => handleChange(e, 'discordUrl')}
                                    placeholder={"Discord URL"}
                                    type="url"
                                    required={false}
                                />
                            </div>
                            <div className="w-full md:w-1/2">
                                <p className="text-xs text-white font-medium mb-2">Token Image</p>
                                <div className="flex items-center justify-center p-2 border border-white border-dashed rounded-md h-[180px]">
                                    {!uploadedImage && (
                                        <div>
                                            <div className="flex justify-center mb-2" onClick={() => document.getElementById('file_input')?.click()}>
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
                                                className="block text-center w-full py-1 px-3 text-xs text-white rounded-lg cursor-pointer focus:outline-none opacity-100 backdrop-blur-md"
                                                htmlFor="file_input"
                                            >
                                                Upload an Image
                                            </label>
                                        </div>
                                    )}
                                    {uploadedImage && (
                                        <div className="relative flex justify-center h-full w-full">
                                            <img src={uploadedImage} alt="Uploaded" className="rounded-md object-contain max-h-full" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Token Info Section */}
                    <div className="w-full md:w-1/2 p-3 border border-[#404040] rounded-md flex justify-between items-center flex-col gap-2 sm:flex-row">
                        <div className="flex gap-2 justify-center items-center">
                            {uploadedImage || image ?
                                <img src={uploadedImage ? uploadedImage : image} className="w-[40px] h-[40px] bg-transparent rounded-full flex justify-center items-center" alt="" /> :
                                <div className="w-[40px] bg-[#404040] h-[40px] bg-transparent rounded-full flex justify-center items-center">S</div>}
                            <div className="">
                                <p className="font-light text-[#c7f285] text-xs truncate">{formData.tokenName.length > 0 ? `${formData.tokenName}` : "Token Name"}</p>
                                <p className="font-light text-xs truncate">{formData.tokenSymbol.length > 0 ? `${formData.tokenSymbol}` : "Symbol"}</p>
                            </div>
                        </div>
                        <div className="flex justify-center items-center gap-2">
                            {formData.twitterUrl && (
                                <a href={formData.twitterUrl} target="_blank" rel="noreferrer">
                                    <TwitterIcon className="text-white w-4 h-4" />
                                </a>
                            )}
                            {formData.telegramUrl && (
                                <a href={formData.telegramUrl} target="_blank" rel="noreferrer">
                                    <FaTelegram className="text-white w-4 h-4" />
                                </a>
                            )}
                            {formData.discordUrl && (
                                <a href={formData.discordUrl} target="_blank" rel="noreferrer">
                                    <FaDiscord className="text-white w-4 h-4" />
                                </a>
                            )}
                            {formData.websiteUrl && (
                                <a href={formData.websiteUrl} target="_blank" rel="noreferrer">
                                    <FaGlobe className="text-white w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Token Extensions Section */}
                    <h2 className="text-base font-medium text-white mt-4 mb-2">Token-2022 Extensions</h2>
                    <div className="space-y-4">
                        {/* Transfer Fee Extension */}
                        <div className="p-3 bg-neutral-800 rounded-lg">
                            <div className="flex items-center mb-2">
                                <input
                                    type="checkbox"
                                    id="transferFeeEnabled"
                                    checked={formData.transferFeeEnabled}
                                    onChange={(e) => handleChange(e, 'transferFeeEnabled')}
                                    className="mr-2 h-4 w-4"
                                />
                                <label htmlFor="transferFeeEnabled" className="text-white text-sm font-medium">Transfer Fee</label>
                                <ExtensionTooltip
                                    title="Transfer Fee"
                                    description="Collect a fee on each token transfer. The fee is a percentage of the transfer amount, capped at a maximum value."
                                />
                            </div>

                            {formData.transferFeeEnabled && (
                                <div className="ml-6 space-y-2">
                                    <div className="flex flex-col">
                                        <label className="text-xs text-gray-300 mb-1">Fee Basis Points (1% = 100)</label>
                                        <input
                                            type="number"
                                            value={formData.transferFeeBasisPoints}
                                            onChange={(e) => handleChange(e, 'transferFeeBasisPoints')}
                                            className="px-3 py-1 text-sm bg-neutral-700 border border-neutral-600 rounded-md text-white"
                                            min="1"
                                            max="10000"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            This equals {(formData.transferFeeBasisPoints / 100).toFixed(2)}% fee per transfer
                                        </p>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs text-gray-300 mb-1">Maximum Transfer Fee</label>
                                        <input
                                            type="text"
                                            value={formData.maxTransferFee}
                                            onChange={(e) => handleChange(e, 'maxTransferFee')}
                                            className="px-3 py-1 text-sm bg-neutral-700 border border-neutral-600 rounded-md text-white"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            Maximum amount of tokens that can be charged as a fee per transfer
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Memo Transfer Extension */}
                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="memoTransferEnabled"
                                        checked={formData.memoTransferEnabled}
                                        onChange={(e) => handleChange(e, 'memoTransferEnabled')}
                                        className="mr-2 h-4 w-4"
                                    />
                                    <label htmlFor="memoTransferEnabled" className="text-white text-sm font-medium">Required Memo Transfer</label>
                                    <ExtensionTooltip
                                        title="Required Memo Transfer"
                                        description="Require a memo instruction when tokens are transferred to this account."
                                    />
                                </div>
                            </div>

                            {/* Metadata Pointer Extension */}
                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="metadataPointerEnabled"
                                        checked={formData.metadataPointerEnabled}
                                        onChange={(e) => handleChange(e, 'metadataPointerEnabled')}
                                        className="mr-2 h-4 w-4"
                                    />
                                    <label htmlFor="metadataPointerEnabled" className="text-white text-sm font-medium">Metadata Pointer</label>
                                    <ExtensionTooltip
                                        title="Metadata Pointer"
                                        description="Enables pointing to token metadata stored in an external account."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Permanent Delegate Extension */}
                        <div className="p-3 bg-neutral-800 rounded-lg">
                            <div className="flex items-center mb-2">
                                <input
                                    type="checkbox"
                                    id="permanentDelegateEnabled"
                                    checked={formData.permanentDelegateEnabled}
                                    onChange={(e) => handleChange(e, 'permanentDelegateEnabled')}
                                    className="mr-2 h-4 w-4"
                                />
                                <label htmlFor="permanentDelegateEnabled" className="text-white text-sm font-medium">Permanent Delegate</label>
                                <ExtensionTooltip
                                    title="Permanent Delegate"
                                    description="Configure a permanent delegate that can transfer tokens from any account."
                                />
                            </div>

                            {formData.permanentDelegateEnabled && (
                                <div className="ml-6">
                                    <div className="flex flex-col">
                                        <label className="text-xs text-gray-300 mb-1">Delegate Address (optional)</label>
                                        <input
                                            type="text"
                                            value={formData.permanentDelegateAddress}
                                            onChange={(e) => handleChange(e, 'permanentDelegateAddress')}
                                            className="px-3 py-1 text-sm bg-neutral-700 border border-neutral-600 rounded-md text-white"
                                            placeholder="Enter public key (leave empty to use your wallet)"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Interest Bearing Extension */}
                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <input
                                        type="checkbox"
                                        id="interestBearingEnabled"
                                        checked={formData.interestBearingEnabled}
                                        onChange={(e) => handleChange(e, 'interestBearingEnabled')}
                                        className="mr-2 h-4 w-4"
                                    />
                                    <label htmlFor="interestBearingEnabled" className="text-white text-sm font-medium">Interest Bearing</label>
                                    <ExtensionTooltip
                                        title="Interest Bearing"
                                        description="Make your token accrue interest over time."
                                    />
                                </div>

                                {formData.interestBearingEnabled && (
                                    <div className="ml-6">
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-300 mb-1">Interest Rate (basis points)</label>
                                            <input
                                                type="number"
                                                value={formData.interestRate}
                                                onChange={(e) => handleChange(e, 'interestRate')}
                                                className="px-3 py-1 text-sm bg-neutral-700 border border-neutral-600 rounded-md text-white"
                                                min="1"
                                                max="10000"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">
                                                This equals {(formData.interestRate / 100).toFixed(2)}% interest rate
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Default Account State Extension */}
                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <div className="flex items-center mb-2">
                                    <input
                                        type="checkbox"
                                        id="defaultAccountStateEnabled"
                                        checked={formData.defaultAccountStateEnabled}
                                        onChange={(e) => handleChange(e, 'defaultAccountStateEnabled')}
                                        className="mr-2 h-4 w-4"
                                    />
                                    <label htmlFor="defaultAccountStateEnabled" className="text-white text-sm font-medium">Default Account State</label>
                                    <ExtensionTooltip
                                        title="Default Account State"
                                        description="Set the default state of new token accounts."
                                    />
                                </div>

                                {formData.defaultAccountStateEnabled && (
                                    <div className="ml-6">
                                        <div className="flex flex-col">
                                            <label className="text-xs text-gray-300 mb-1">Default State</label>
                                            <select
                                                value={formData.defaultAccountState}
                                                onChange={(e) => handleChange(e, 'defaultAccountState')}
                                                className="px-3 py-1 text-sm bg-neutral-700 border border-neutral-600 rounded-md text-white"
                                            >
                                                <option value="initialized">Initialized (normal)</option>
                                                <option value="frozen">Frozen (restricted)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center items-center mt-4">
                        <button
                            className="text-center w-full sm:w-2/3 border border-[#476e34] rounded-md invoke-btn py-2"
                            disabled={uploading || creatingToken}
                            type="submit"
                            id="formbutton"
                        >
                            <span className="btn-text-gradient font-bold text-sm">
                                {uploading ? <span className="italic font-i ellipsis">Uploading Image</span> : creatingToken ? "Creating Token..." : "Create Token-2022"}
                            </span>
                        </button>
                    </div>
                </form>
            ) : (
                <div className="mt-4 break-words">
                    <p className="font-medium text-sm">Link to your new token.</p>
                    <a
                        className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500 text-xs break-all"
                        href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {tokenMintAddress}
                    </a>
                </div>
            )}
        </div>
    );
};

export default CreateToken;