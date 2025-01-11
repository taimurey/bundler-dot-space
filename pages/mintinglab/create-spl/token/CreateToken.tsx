import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createImageFromInitials } from "../../../../components/helpers/common/createImage"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faDiscord, faWebflow } from '@fortawesome/free-brands-svg-icons';
import React, { FC, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../../components/context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { UpdatedInputField } from "../../../../components/FieldComponents/UpdatedInputfield";
import { createToken } from "../../../../components/TransactionUtils/token";
import { LinkToast, TransactionToast } from "../../../../components/common/Toasts/TransactionToast";
import ImageUploadIcon from "../../../../components/icons/imageuploadIcon";

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




    const [tokenMintAddress] = useState("");
    const [isLoading] = useState(false);
    // const [tags,] = useState<string[]>([]);
    const [image, setImage] = useState<string>("");
    if (!process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN) {
        throw new Error('NFT_STORAGE is not defined');
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

                    const response = await fetch('https://mevarik-deployer.xyz:8080/upload-image', {
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

            // router.push("/market/create");
            // router.push({
            //     pathname: "/market/create",
            //     query: { token }
            // });
            toast(
                () => (<TransactionToast
                    txSig={signature}
                    message={"Token created successfully!"}
                />
                ),
                { autoClose: 5000 }
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
                { autoClose: 5000 }
            );

        }
        catch (error: any) {
            toast.error("Error creating the token");
        } finally {
            // Set the creatingToken state to false
            setCreatingToken(false);
        }
        setCreatingToken(false);
    };


    const setImageandsymbol = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = e.target;
        const icon = createImageFromInitials(value);
        setImage(icon ?? '');
        handleChange(e, "tokenSymbol")
    }



    return (
        <div className="relative divide-y divide-neutral-700 w-full">
            {creatingToken && (
                <div className="absolute inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white"></div>
                </div>
            )}
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
                                <p className="text-[20px] uppercase  block  text-base text-white font-bold">SPL Token Creation</p>
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
                                    onChange={(e) => { handleChange(e, 'tokenSymbol'), setImageandsymbol(e) }}
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

                                    /><UpdatedInputField
                                        id="telegramUrl"
                                        label=""
                                        value={formData.telegramUrl}
                                        onChange={(e) => handleChange(e, 'telegramUrl')}
                                        placeholder={"Telegram Group URL"}
                                        type="url"
                                        required={false}

                                    /><UpdatedInputField
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
                                    <div className=" flex items-center justify-center  p-2 border border-white border-dashed rounded-md shadow-lg h-full">
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
                                                // required
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
                                    <div className="border  border-[#404040] mt-1 shadow-black  rounded-md p-4 flex flex-col gap-2">
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



                                <div className="w-1/2 p-4 border  border-[#404040] mt-7 rounded-md flex justify-between items-center flex-col gap-4 sm:flex-row  ">

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

                                            <FontAwesomeIcon icon={faTwitter} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                        </a>
                                        <a href={formData.telegramUrl} target="_blank" rel="noreferrer">

                                            <FontAwesomeIcon icon={faTelegram} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                        </a>
                                        <a href={formData.discordUrl} target="_blank" rel="noreferrer">

                                            <FontAwesomeIcon icon={faDiscord} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                        </a>
                                        <a href={formData.twitterUrl} target="_blank" rel="noreferrer">
                                            <FontAwesomeIcon icon={faWebflow} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                        </a>
                                    </div>

                                </div>


                            </div>
                            <div className="flex justify-center items-center ">

                                <button
                                    className="text-center  hover:shadow-xl hover:shadow-black/50 w-2/3  border border-[#476e34] rounded-md  invoke-btn"
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
                        {/* <form className="py-4 flex bg-[] gap-8 flex-col lg:flex-row w-full" onSubmit={createTokenCallback} id="form">
                            <div className="lg:w-1/2  ">
                                <p className="text-[20px] uppercase  block  text-base text-white font-bold">Token Information</p>
                                <p className="text-[14px] text-[#8c929d] ">This information is stored on IPFS by + Metaplex Metadata standard.</p>
                                <div className="sm:gap-4  mt-4"> */}
                        {/* <TokenInput label="Token Name (ex. Mevarik)" value={tokenName} onChange={setTokenName} placeholder={"Enter token name"} /> */}
                        {/* <InputField
                                        id="tokenName*"
                                        label="Token Name (ex. Mevarik)"
                                        value={formData.tokenName}
                                        onChange={(e) => handleChange(e, 'tokenName')}
                                        placeholder="Enter Token Name"
                                        type="text"
                                        required={true}
                                    />
                                    <InputField
                                        id="tokenSymbol"
                                        label="Token Symbol*"
                                        value={formData.tokenSymbol}
                                        onChange={(e) => { handleChange(e, 'tokenSymbol'), setImageandsymbol(e) }}
                                        placeholder="Enter Token Symbol"
                                        type="text"
                                        required={true}

                                    />
                                    <InputField
                                        id="tokenDecimals"
                                        label="Token Decimals*"
                                        value={formData.tokenDecimals}
                                        onChange={(e) => handleChange(e, 'tokenDecimals')}
                                        placeholder={"Enter token decimals(0-9)"}
                                        type="number"
                                        required={true}

                                    /> */}
                        {/* <InputField
                                        id="supply"
                                        label="Supply*"
                                        value={formData.supply}
                                        onChange={(e) => handleChange(e, 'supply')}
                                        placeholder={"Quantity of tokens to issue"}
                                        type="number"
                                        required={true}

                                    />
                                    <div className="sm:gap-4 mt-4">
                                        <label className=" block mt-5 text-base text-white font-semibold "> Description (Optional)</label>
                                        <textarea name="" id="tokenDescription" value={formData.tokenDescription} rows={5} className="  mt-1 px-4  py-1  bg-[#202020]   sm:text-md block w-full p-4 rounded-md text-base border  border-[#404040]  text-white bg-transparent focus:outline-none sm:text-base text-[12px]"
                                            onChange={(e) => handleChange(e, 'tokenDescription')}
                                            placeholder="Enter description..."></textarea>
                                    </div> */}
                        {/* <div className="border border-[#444444] shadow-black shadow-lg rounded-lg mt-5">
                                        <h1 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-[#93c453] to-[#2eec83] p-2 rounded-md">
                                            Revoke Authorities
                                        </h1>
                                        <div className="p-4">
                                            <div className="flex gap-4 items-center mt-2 ">
                                                <input
                                                    type="checkbox"
                                                    name="freezeAuthority"
                                                    id="freezeAuthority"
                                                    onChange={(e) => handleChange(e, 'freezeAuthority')}
                                                />
                                                <label className="text-[15px] font-mono" htmlFor="freezeAuthority">Freeze Authority</label>
                                            </div>
                                            <div className="flex gap-4 items-center mt-2 ">
                                                <input
                                                    type="checkbox"
                                                    name="revokeMintAuthority"
                                                    id="revokeMintAuthority"
                                                    onChange={(e) => handleChange(e, 'revokeMintAuthority')}
                                                />
                                                <label className="text-[15px] font-mono" htmlFor="revokeMintAuthority">Mint Authority(Fixed Supply)</label>
                                            </div>
                                        </div>
                                    </div> */}
                        {/* <div className="  block mt-5 text-base text-white font-semibold"> Extensions (Optional)</div>
                                    <InputField
                                        id="websiteUrl"
                                        label=""
                                        value={formData.websiteUrl}
                                        onChange={(e) => handleChange(e, 'websiteUrl')}
                                        placeholder={"Website URL"}
                                        type="url"
                                        required={false}

                                    />
                                    <InputField
                                        id="twitterUrl"
                                        label=""
                                        value={formData.twitterUrl}
                                        onChange={(e) => handleChange(e, 'twitterUrl')}
                                        placeholder={"Twitter URL"}
                                        type="url"
                                        required={false}

                                    /><InputField
                                        id="telegramUrl"
                                        label=""
                                        value={formData.telegramUrl}
                                        onChange={(e) => handleChange(e, 'telegramUrl')}
                                        placeholder={"Telegram Group URL"}
                                        type="url"
                                        required={false}

                                    /><InputField
                                        id="discordUrl"
                                        label=""
                                        value={formData.discordUrl}
                                        onChange={(e) => handleChange(e, 'discordUrl')}
                                        placeholder={"Discord URL"}
                                        type="url"
                                        required={false}

                                    /> */}

                        {/* <div className="text-[14px] font-normal mt-4">(Optional) Tags - Max 5 tags
                            </div>
                            <TagsInput selector="tag-input1" duplicate={false} max={5} tags={tags} setTags={setTags} /> */}





                        {/* <div className="pt-2 space-y-2">


                            </div> */}

                        {/* </div> */}
                        {/* </div> */}
                        {/* <div className="lg:w-1/2 flex justify-start flex-col ">
                                <div className=" text-[14px] font-normal">
                                    <label className=" block text-base text-white font-semibold ">
                                    </label> */}
                        {/* <InputField
                                    id="iconUrl"
                                    label=""
                                    value={formData.iconUrl}
                                    onChange={(e) => handleChange(e, 'iconUrl')}
                                    placeholder={"Enter or Upload symbol icon url"}
                                    type="url"
                                required = {false}

                                /> */}
                        {/* </div> */}

                        {/* image upload  */}
                        {/* <div className=" flex items-center justify-center my-6 p-2 h-1/3 border-2 border-white border-dashed rounded-md shadow-black shadow-lg">
                                    {!uploadedImage && (
                                        <div>
                                            <div className="flex justify-center " onClick={() => document.getElementById('file_input')?.click()}>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-12 w-12 text-gray-400 cursor-pointer"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    viewBox="0 0 48 48"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                            <input
                                                className="hidden cursor-pointer"
                                                aria-describedby="file_input_help"
                                                id="file_input"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            // required
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
                                        <div className="relative flex justify-center h-4/5 border-y-v3-bg rounded-md">
                                            <img src={uploadedImage} alt="Uploaded" className="rounded-md object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className="bg-[#262626] border px-4 py-2 my-2 rounded-md border-[#404040]">

                                    <div className="bg-[#171717] p-4 rounded-md flex justify-between items-center flex-col gap-4 sm:flex-row  ">

                                        <div className="flex gap-2 justify-center items-center  ">
                                            {uploadedImage || image ?
                                                <img src={uploadedImage ? uploadedImage : image} className="w-[65px] h-[65px] bg-transparent rounded-full flex justify-center items-center" alt="" /> :
                                                <div className="w-[50px] h-[50px] bg-transparent rounded-full flex justify-center items-center">S</div>}
                                            <div className="">
                                                <p className="font-light text-[#c7f285] lg:w-[80px] xl:w-[100px] 2xl:w-[160px] truncate">{formData.tokenName.length > 0 ? `${formData.tokenName}` : "Token Name"}</p>
                                                <p className="font-light lg:w-[80px] xl:w-[100px] 2xl:w-[160px] truncate ">{formData.tokenSymbol.length > 0 ? `${formData.tokenSymbol}` : "Symbol"}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-center items-center gap-2  ">
                                            <a href={formData.twitterUrl} target="_blank" rel="noreferrer">

                                                <FontAwesomeIcon icon={faTwitter} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                            </a>
                                            <a href={formData.telegramUrl} target="_blank" rel="noreferrer">

                                                <FontAwesomeIcon icon={faTelegram} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                            </a>
                                            <a href={formData.discordUrl} target="_blank" rel="noreferrer">

                                                <FontAwesomeIcon icon={faDiscord} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                            </a>
                                            <a href={formData.twitterUrl} target="_blank" rel="noreferrer">
                                                <FontAwesomeIcon icon={faWebflow} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                                            </a>
                                        </div>

                                    </div>

                                </div> */}

                        {/* <div className="flex gap-4 items-center mt-2 ">
                            <input
                                type="checkbox"
                                name="revokeMetadataUpdateAuthority"
                                id="revokeMetadataUpdateAuthority"
                                onChange={(e) => handleChange(e, 'revokeMetadataUpdateAuthority')}
                            />
                            <label className="text-[12px] " htmlFor="revokeMetadataUpdateAuthority">Revoke MetaData Update Authority</label>
                        </div> */}
                        {/* <div> */}
                        {/* <p className="text-[12px] mt-10">  CREATE TOKEN<br />
                                Generate a token. In this process, you can get a token mint address.</p> */}
                        {/* <button
                                        className="invoke-btn w-full custom-button"
                                        disabled={uploading || creatingToken}
                                        type="submit"
                                        id="formbutton"
                                        onClick={createTokenCallback}

                                    >
                                        <span className="btn-text-gradient">
                                            {uploading ? <span className="italic font-i ellipsis">Uploading Image</span> : 'Create token'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </form> */}
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

                )
                }

            </div >
        </div >
    );



};


export default CreateToken;
