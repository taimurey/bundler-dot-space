"use client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createImageFromInitials } from "@/components/helpers/common/createImage";
import React, { FC, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useSolana } from "@/components/SolanaWallet/SolanaContext";
import { toast } from "sonner";
import { InputField } from "@/components/ui/input-field";
import { createToken } from "@/components/TransactionUtils/token";
import { LinkToast, TransactionToast } from "@/components/common/Toasts/TransactionToast";
import ImageUploadIcon from "@/components/icons/imageuploadIcon";
import { FaDiscord, FaTelegram, FaTwitter, FaGlobe } from "react-icons/fa";
import TokenMetadataView, { TokenMetadata } from "@/components/TokenMetadataView";

const CreateToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { cluster } = useSolana();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        tokenName: "",
        tokenSymbol: "",
        tokenDescription: "",
        iconUrl: "",
        websiteUrl: "",
        twitterUrl: "",
        telegramUrl: "",
        discordUrl: "",
        tokenDecimals: "6",
        supply: "1000000000",
        uploadedImage: uploadedImage,
        freezeAuthority: false,
        revokeMintAuthority: false,
        revokeMetadataUpdateAuthority: false
    });

    const [tokenMintAddress, setTokenMintAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [image, setImage] = useState<string>("");
    const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);

    const [uploading, setUploading] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [creatingToken, setCreatingToken] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        const { value, checked } = e.target as HTMLInputElement;
        if (e.target.type === 'checkbox') {
            setFormData(prevState => ({
                ...prevState,
                [field]: checked,
            }));
        } else {
            // For other input types (e.g., text, textarea), update the formData with the value
            setFormData(prevState => ({
                ...prevState,
                [field]: value,
            }));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        handleChange(e as any, "uploadedImage");

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
        const TokenMetadata: TokenMetadata = {
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
        if (formData.discordUrl) {
            TokenMetadata.discord = formData.discordUrl;
        }

        console.log(TokenMetadata, "TokenMetadata")
        toast.info("Creating token...");
        try {
            const { signature, token } = await createToken(formData, connection, TokenMetadata, publicKey, sendTransaction);

            setTokenMintAddress(token);
            setTokenMetadata(TokenMetadata);

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
                            href={`https://solscan.io/account/${token}${cluster.network !== 'mainnet-beta' ? `?cluster=${cluster.network}` : ''}`}
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
            console.error(error);
            // Check if it's a user rejection error
            if (error.message && error.message.includes('User rejected')) {
                toast.error("Transaction was rejected by the user");
            } else if (error.message) {
                toast.error(`Error: ${error.message}`);
            } else {
                toast.error("Error creating the token");
            }
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
        <div className="flex py-1 justify-center items-start relative max-w-[100vw]">
            {isLoading && (
                <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
                    <ClipLoader />
                </div>
            )}

            {tokenMintAddress && tokenMetadata ? (
                <div className="w-full max-w-[1400px] p-4">
                    <div className="p-6 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                        <TokenMetadataView
                            tokenMetadata={tokenMetadata}
                            tokenMintAddress={tokenMintAddress}
                            network={cluster.network}
                            isToken2022={false}
                        />
                    </div>
                </div>
            ) : (
                <form className="w-full max-w-[1400px]">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
                        {/* Left Column - Main Form */}
                        <div className="xl:col-span-2 space-y-3">
                            {/* Header Section */}
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <div>
                                    <p className='font-bold text-[20px]'>SPL Token Creation</p>
                                    <p className='text-[11px] text-[#96989c]'>This information is stored on IPFS by + Metaplex Metadata standard</p>
                                </div>
                            </div>

                            {/* Token Configuration Section */}
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <h3 className='font-bold text-[16px] mb-3 text-white'>Token Configuration</h3>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <InputField
                                        id="tokenName"
                                        label="Token Name"
                                        subfield="required"
                                        value={formData.tokenName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, 'tokenName')}
                                        placeholder="Enter Token Name (ex. Mevarik)"
                                        type="text"
                                        required={true} />

                                    <InputField
                                        id="tokenSymbol"
                                        label="Token Symbol"
                                        subfield="required"
                                        value={formData.tokenSymbol}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { handleChange(e, 'tokenSymbol'); setImageandsymbol(e); }}
                                        placeholder="Enter Token Symbol"
                                        type="text"
                                        required={true} />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <InputField
                                        id="tokenDecimals"
                                        label="Token Decimals"
                                        subfield="0-9"
                                        value={formData.tokenDecimals}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, 'tokenDecimals')}
                                        placeholder="Enter token decimals(0-9)"
                                        type="number"
                                        required={true} />

                                    <InputField
                                        id="supply"
                                        label="Supply"
                                        subfield="total tokens"
                                        value={formData.supply}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, 'supply')}
                                        placeholder="Quantity of tokens to issue"
                                        type="number"
                                        required={true} />
                                </div>
                            </div>

                            {/* Metadata Section */}
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <h3 className='font-bold text-[16px] mb-3 text-white'>Token Metadata</h3>
                                <div className="">
                                    <label className="font-normal text-sm text-white"> Description</label>
                                    <textarea
                                        name=""
                                        id="tokenDescription"
                                        value={formData.tokenDescription}
                                        rows={3}
                                        className="mt-1 px-4 bg-[#202020]/20 text-sm block w-full p-2 rounded-md border border-[#404040] text-white focus:outline-none placeholder-[#dbd7d7d4]"
                                        onChange={(e) => handleChange(e, 'tokenDescription')}
                                        placeholder="Enter description...">
                                    </textarea>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 w-full mt-4">
                                    <div className="w-full md:w-1/2 flex flex-col gap-2">
                                        <p className="text-xs text-white font-medium">Extensions</p>
                                        <InputField
                                            id="websiteUrl"
                                            label="Website"
                                            subfield="optional"
                                            value={formData.websiteUrl}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, 'websiteUrl')}
                                            placeholder="Website URL"
                                            type="url"
                                            required={false}
                                        />
                                        <InputField
                                            id="twitterUrl"
                                            label="Twitter"
                                            subfield="optional"
                                            value={formData.twitterUrl}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, 'twitterUrl')}
                                            placeholder="Twitter URL"
                                            type="url"
                                            required={false}
                                        />
                                        <InputField
                                            id="telegramUrl"
                                            label="Telegram"
                                            subfield="optional"
                                            value={formData.telegramUrl}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, 'telegramUrl')}
                                            placeholder="Telegram Group URL"
                                            type="url"
                                            required={false}
                                        />
                                        <InputField
                                            id="discordUrl"
                                            label="Discord"
                                            subfield="optional"
                                            value={formData.discordUrl}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, 'discordUrl')}
                                            placeholder="Discord URL"
                                            type="url"
                                            required={false}
                                        />
                                    </div>
                                    <div className="w-full md:w-1/2">
                                        <p className="text-xs text-white font-medium mb-2">Token Image</p>
                                        <div className="flex items-center justify-center p-2 border border-white border-dashed rounded-md h-[200px]">
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
                                                        className="block text-center w-full py-1 px-5 text-xs text-white rounded-lg cursor-pointer focus:outline-none opacity-100 backdrop-blur-md"
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

                            {/* Authorities Section */}
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <h3 className='font-bold text-[16px] mb-3 text-white'>Token Authorities</h3>
                                <div className="w-full">
                                    <h1 className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-[#93c453] to-[#2eec83] mb-2">
                                        Revoke Authorities
                                    </h1>
                                    <div className="border border-[#404040] shadow-black rounded-md p-3 flex flex-col gap-2">
                                        <div
                                            className={`p-3 border rounded-md cursor-pointer flex items-center ${formData.freezeAuthority ? 'bg-[#93c45320] border-[#93c453]' : 'border-[#404040]'}`}
                                            onClick={() => setFormData(prev => ({ ...prev, freezeAuthority: !prev.freezeAuthority }))}
                                        >
                                            <div className={`w-5 h-5 rounded-md border mr-2 flex items-center justify-center ${formData.freezeAuthority ? 'border-[#93c453] bg-[#93c45320]' : 'border-[#404040]'}`}>
                                                {formData.freezeAuthority && <span className="text-[#93c453]">✓</span>}
                                            </div>
                                            <label className="text-sm cursor-pointer">Freeze Authority</label>
                                        </div>
                                        <div
                                            className={`p-3 border rounded-md cursor-pointer flex items-center ${formData.revokeMintAuthority ? 'bg-[#93c45320] border-[#93c453]' : 'border-[#404040]'}`}
                                            onClick={() => setFormData(prev => ({ ...prev, revokeMintAuthority: !prev.revokeMintAuthority }))}
                                        >
                                            <div className={`w-5 h-5 rounded-md border mr-2 flex items-center justify-center ${formData.revokeMintAuthority ? 'border-[#93c453] bg-[#93c45320]' : 'border-[#404040]'}`}>
                                                {formData.revokeMintAuthority && <span className="text-[#93c453]">✓</span>}
                                            </div>
                                            <label className="text-sm cursor-pointer">Mint Authority (Fixed Supply)</label>
                                        </div>
                                        <div
                                            className={`p-3 border rounded-md cursor-pointer flex items-center ${formData.revokeMetadataUpdateAuthority ? 'bg-[#93c45320] border-[#93c453]' : 'border-[#404040]'}`}
                                            onClick={() => setFormData(prev => ({ ...prev, revokeMetadataUpdateAuthority: !prev.revokeMetadataUpdateAuthority }))}
                                        >
                                            <div className={`w-5 h-5 rounded-md border mr-2 flex items-center justify-center ${formData.revokeMetadataUpdateAuthority ? 'border-[#93c453] bg-[#93c45320]' : 'border-[#404040]'}`}>
                                                {formData.revokeMetadataUpdateAuthority && <span className="text-[#93c453]">✓</span>}
                                            </div>
                                            <label className="text-sm cursor-pointer">Metadata Update Authority</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Token Preview and Create Button */}
                        <div className="xl:col-span-1 space-y-3">
                            {/* Token Preview */}
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <h3 className='font-bold text-[16px] mb-3 text-white'>Token Preview</h3>
                                <div className="p-3 border border-[#404040] rounded-md flex justify-between items-center flex-col gap-2 sm:flex-row">
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
                                                <FaTwitter size="sm" className="text-white w-4 h-4" />
                                            </a>
                                        )}
                                        {formData.telegramUrl && (
                                            <a href={formData.telegramUrl} target="_blank" rel="noreferrer">
                                                <FaTelegram size="sm" className="text-white w-4 h-4" />
                                            </a>
                                        )}
                                        {formData.discordUrl && (
                                            <a href={formData.discordUrl} target="_blank" rel="noreferrer">
                                                <FaDiscord size="sm" className="text-white w-4 h-4" />
                                            </a>
                                        )}
                                        {formData.websiteUrl && (
                                            <a href={formData.websiteUrl} target="_blank" rel="noreferrer">
                                                <FaGlobe size="sm" className="text-white w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Create Button */}
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <div className="flex justify-center items-center">
                                    <button
                                        className="text-center w-full invoke-btn"
                                        disabled={uploading || creatingToken}
                                        type="submit"
                                        id="formbutton"
                                        onClick={createTokenCallback}
                                    >
                                        <span className="btn-text-gradient font-bold">
                                            {uploading ? <span className="italic font-i ellipsis">Uploading Image</span> :
                                                creatingToken ? <span className="italic font-i ellipsis">Creating Token</span> :
                                                    'Create Token'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CreateToken; 