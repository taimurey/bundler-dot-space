"use client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createImageFromInitials } from "../../../components/helpers/common/createImage";
import React, { FC, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../components/context/NetworkConfigurationProvider";
import { toast } from "sonner";
import { UpdatedInputField } from "../../../components/FieldComponents/UpdatedInputfield";
import { createToken } from "../../../components/TransactionUtils/token";
import { LinkToast, TransactionToast } from "../../../components/common/Toasts/TransactionToast";
import ImageUploadIcon from "../../../components/icons/imageuploadIcon";
import { FaDiscord, FaTelegram, FaTwitter, FaGlobe } from "react-icons/fa";

const CreateToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();
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
    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        console.warn('NFT_STORAGE is not defined');
    }
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

                    const response = await fetch('https://mevarik-deployer.xyz:2791/upload-image', {
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
        toast.info("Creating token...");
        try {
            const { signature, token } = await createToken(formData, connection, TokenMetadata, publicKey, sendTransaction);

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
        <div className="relative w-full container mx-auto px-20 py-10">
            <div className=" bg-[#0c0e11] bg-opacity-70 border border-neutral-500 p-4 rounded-2xl shadow-2xl shadow-black">
                <div className="divide-y divide-neutral-700 w-full ">

                    {isLoading && (
                        <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
                            <ClipLoader />
                        </div>
                    )}

                    {!tokenMintAddress ? (
                        <>
                            <form action="" className="py-4 flex flex-col gap-6">
                                <div className="lg:w-1/2  ">
                                    <p className="text-[20px] uppercase block text-base text-white font-bold">SPL Token Creation</p>
                                    <p className="text-[13px] text-[#8c929d] ">This information is stored on IPFS by + Metaplex Metadata standard.</p>
                                </div>
                                <hr className=" border-[#e8e2e2b8] " />
                                <div className="flex gap-4 ">
                                    <UpdatedInputField id="tokenName *"
                                        label="Token Name "
                                        value={formData.tokenName}
                                        onChange={(e) => handleChange(e, 'tokenName')}
                                        placeholder="Enter Token Name (ex. Mevarik)"
                                        type="text"
                                        required={true} />

                                    <UpdatedInputField id="tokenSymbol"
                                        label="Token Symbol *"
                                        value={formData.tokenSymbol}
                                        onChange={(e) => { handleChange(e, 'tokenSymbol'); setImageandsymbol(e); }}
                                        placeholder="Enter Token Symbol"
                                        type="text"
                                        required={true} />
                                </div>
                                <div className="flex gap-4 ">
                                    <UpdatedInputField id="tokenDecimals"
                                        label="Token Decimals *"
                                        value={formData.tokenDecimals}
                                        onChange={(e) => handleChange(e, 'tokenDecimals')}
                                        placeholder={"Enter token decimals(0-9)"}
                                        type="number"
                                        required={true} />

                                    <UpdatedInputField id="supply"
                                        label="Supply *"
                                        value={formData.supply}
                                        onChange={(e) => handleChange(e, 'supply')}
                                        placeholder={"Quantity of tokens to issue"}
                                        type="number"
                                        required={true} />
                                </div>
                                <div className="">
                                    <label className="font-normal mt-5 text-white "> Description</label>
                                    <textarea
                                        name=""
                                        id="tokenDescription"
                                        value={formData.tokenDescription}
                                        rows={5}
                                        className="mt-1 px-4 bg-[#202020]/20 sm:text-md block w-full p-4 rounded-md border border-[#404040] text-white focus:outline-none text-[13px] placeholder-[#dbd7d7d4]"
                                        onChange={(e) => handleChange(e, 'tokenDescription')}
                                        placeholder="Enter description...">
                                    </textarea>
                                </div>

                                <div className="flex gap-4 w-full">
                                    <div className="w-1/2 flex flex-col gap-4">
                                        <UpdatedInputField
                                            id="websiteUrl"
                                            label="Extensions"
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
                                    <div className="w-1/2 pt-6">
                                        <div className=" flex items-center justify-center p-2 border border-white border-dashed rounded-md shadow-lg h-full">
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
                                                        className="block align-bottom w-full py-1 px-5 text-sm text-white rounded-lg cursor-pointer focus:outline-none opacity-100 backdrop-blur-md"
                                                        htmlFor="file_input"
                                                    >
                                                        Upload an Image
                                                    </label>
                                                </div>
                                            )}
                                            {uploadedImage && (
                                                <div className="relative flex justify-center h-40 border-y-v3-bg rounded-md">
                                                    <img src={uploadedImage} alt="Uploaded" className="rounded-md object-contain" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 ">
                                    <div className="w-1/2 ">
                                        <h1 className=" text-transparent bg-clip-text bg-gradient-to-r from-[#93c453] to-[#2eec83]  ">
                                            Revoke Authorities
                                        </h1>
                                        <div className="border border-[#404040] mt-1 shadow-black rounded-md p-4 flex flex-col gap-2">
                                            <div className="flex gap-4 items-center  ">
                                                <input
                                                    type="checkbox"
                                                    name="freezeAuthority"
                                                    id="freezeAuthority"
                                                    onChange={(e) => handleChange(e, 'freezeAuthority')}
                                                />
                                                <label className="text-[16px] " htmlFor="freezeAuthority">Freeze Authority</label>
                                            </div>
                                            <div className="flex gap-4 items-center  ">
                                                <input
                                                    type="checkbox"
                                                    name="revokeMintAuthority"
                                                    id="revokeMintAuthority"
                                                    onChange={(e) => handleChange(e, 'revokeMintAuthority')}
                                                />
                                                <label className="text-[16px]" htmlFor="revokeMintAuthority">Mint Authority(Fixed Supply)</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-1/2 p-4 border border-[#404040] mt-7 rounded-md flex justify-between items-center flex-col gap-4 sm:flex-row  ">
                                        <div className="flex gap-2 justify-center items-center  ">
                                            {uploadedImage || image ?
                                                <img src={uploadedImage ? uploadedImage : image} className="w-[50px] h-[50px] bg-transparent rounded-full flex justify-center items-center" alt="" /> :
                                                <div className="w-[50px] bg-[#404040] h-[50px] bg-transparent rounded-full flex justify-center items-center">S</div>}
                                            <div className="">
                                                <p className="font-light text-[#c7f285] lg:w-[80px] xl:w-[100px] 2xl:w-[160px] truncate">{formData.tokenName.length > 0 ? `${formData.tokenName}` : "Token Name"}</p>
                                                <p className="font-light lg:w-[80px] xl:w-[100px] 2xl:w-[160px] truncate ">{formData.tokenSymbol.length > 0 ? `${formData.tokenSymbol}` : "Symbol"}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-center items-center gap-2  ">
                                            <a href={formData.twitterUrl} target="_blank" rel="noreferrer">
                                                <FaTwitter size="sm" className="text-white w-6 h-6" />
                                            </a>
                                            <a href={formData.telegramUrl} target="_blank" rel="noreferrer">
                                                <FaTelegram size="sm" className="text-white w-6 h-6" />
                                            </a>
                                            <a href={formData.discordUrl} target="_blank" rel="noreferrer">
                                                <FaDiscord size="sm" className="text-white w-6 h-6" />
                                            </a>
                                            <a href={formData.websiteUrl} target="_blank" rel="noreferrer">
                                                <FaGlobe size="sm" className="text-white w-6 h-6" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center ">
                                    <button
                                        className="text-center hover:shadow-xl hover:shadow-black/50 w-2/3 border border-[#476e34] rounded-md invoke-btn"
                                        disabled={uploading || creatingToken}
                                        type="submit"
                                        id="formbutton"
                                        onClick={createTokenCallback}
                                    >
                                        <span className="btn-text-gradient font-bold">
                                            {uploading ? <span className="italic font-i ellipsis">Uploading Image</span> : 'Create token'}
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="mt-4 break-words">
                            <p className="font-medium">Link to your new token.</p>
                            <a
                                className="cursor-pointer font-medium text-purple-500 hover:text-indigo-500"
                                href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=${networkConfiguration}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {tokenMintAddress}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateToken; 