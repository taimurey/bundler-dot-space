import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { createImageFromInitials } from "../../../helpers/common/createImage"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faDiscord, faWebflow } from '@fortawesome/free-brands-svg-icons';
import React, { FC, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { NFTStorage } from 'nft.storage';
import { packToBlob } from 'ipfs-car/pack/blob';
import { InputField } from '../../../components/FieldComponents/InputField';
import { createToken } from "../../../components/TransactionUtils/token";
import { NFT_STORAGE_TOKEN } from "../../../components/removeLiquidity/config";


const CreateToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const wallet = useWallet();
    const [formData, setFormData] = useState({
        tokenName: "",
        tokenSymbol: "",
        tokenDescription: "",
        iconUrl: "",
        websiteUrl: "",
        twitterUrl: "",
        telegramUrl: "",
        discordUrl: "",
        tokenDecimals: "",
        supply: "",
        uploadedImage: uploadedImage,
        freezeAuthority: false,
        revokeMintAuthority: false,
        revokeMetadataUpdateAuthority: false
    });




    const [tokenMintAddress] = useState("");
    const [isLoading] = useState(false);
    const [tags,] = useState<string[]>([]);
    const [image, setImage] = useState<string>("");
    const client = new NFTStorage({ token: NFT_STORAGE_TOKEN });
    const [uploading, setUploading] = useState(false);
    const [percentComplete, setPercentComplete] = useState(0);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');



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
        console.log(formData, "form data")
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
                            console.log(percentComplete, "percentComplete")  // added this because i think percent complete state may be use latter so to avoid error.
                            setPercentComplete((prevPercentComplete) => prevPercentComplete + size);
                        },
                    });

                    console.log('Uploaded a file to NFT.Storage!');
                    console.log('File available at', cid);
                    console.log(cid)

                    // Convert the IPFS URL to a HTTP URL
                    const httpUrl = `https://nftstorage.link/ipfs/${cid}`;

                    // Set the uploadedImage state variable to the HTTP URL of the uploaded image
                    setUploadedImage(httpUrl);
                    console.log(httpUrl, "ASCsdcasdcs");
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

    const createTokenCallback = async (e: any) => {
        e.preventDefault();
        if (!publicKey) {
            toast.error("Wallet not connected");
            return;
        }
        if (!uploadedImageUrl) {
            toast.error("Please upload an image");
            return;
        }
        const TokenMetadata = {
            "name": formData.tokenName,
            "symbol": formData.tokenSymbol,
            "image": uploadedImageUrl,
            "description": formData.tokenDescription,
            "extensions": {
                "website": formData.websiteUrl,
                "twitter": formData.twitterUrl,
                "telegram": formData.telegramUrl,
                "discord": formData.discordUrl
            },
            "creator": {
                "name": "MEVARIK LABS(Market Manipulation Tool)",
                "site": "https://mevarik.com"
            }
        };
        toast.info("Creating token...");
        createToken(formData, connection, TokenMetadata, publicKey, wallet);
    };


    const setImageandsymbol = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = e.target;
        const icon = createImageFromInitials(value);
        setImage(icon ?? '');
        handleChange(e, "tokenSymbol")
    }

    return (
        <div className="divide-y divide-neutral-700 ">

            {isLoading && (
                <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
                    <ClipLoader />
                </div>
            )}

            {!tokenMintAddress ? (
                <form className="py-4  flex bg-[] gap-8 flex-col lg:flex-row" onSubmit={createTokenCallback}>
                    <div className="lg:w-1/2  ">
                        <p className="text-[20px] uppercase  block  text-base text-white font-bold">Token Information</p>
                        <p className="text-[14px] text-[#8c929d] ">This information is stored on IPFS by + Metaplex Metadata standard.</p>
                        <div className="sm:gap-4  mt-4">
                            {/* <TokenInput label="Token Name (ex. Mevarik)" value={tokenName} onChange={setTokenName} placeholder={"Enter token name"} /> */}
                            <InputField
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

                            />
                            <InputField
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
                            </div>

                            <div className="  block mt-5 text-base text-white font-semibold"> Extensions (Optional)</div>
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

                            />
                            {/* <div className="text-[14px] font-normal mt-4">(Optional) Tags - Max 5 tags
                            </div>
                            <TagsInput selector="tag-input1" duplicate={false} max={5} tags={tags} setTags={setTags} /> */}
                            <div className="flex gap-4 items-center mt-2 ">
                                <input
                                    type="checkbox"
                                    name="freezeAuthority"
                                    id="freezeAuthority"
                                    onChange={(e) => handleChange(e, 'freezeAuthority')}
                                />
                                <label className="text-[12px] " htmlFor="freezeAuthority">Freeze Authority What is Freeze Authority?</label>
                            </div>
                            <div className="flex gap-4 items-center mt-2 ">
                                <input
                                    type="checkbox"
                                    name="revokeMintAuthority"
                                    id="revokeMintAuthority"
                                    onChange={(e) => handleChange(e, 'revokeMintAuthority')}
                                />
                                <label className="text-[12px] " htmlFor="revokeMintAuthority">Revoke Mint Authority(Fixed Supply)</label>
                            </div>
                            <div className="flex gap-4 items-center mt-2 ">
                                <input
                                    type="checkbox"
                                    name="revokeMetadataUpdateAuthority"
                                    id="revokeMetadataUpdateAuthority"
                                    onChange={(e) => handleChange(e, 'revokeMetadataUpdateAuthority')}
                                />
                                <label className="text-[12px] " htmlFor="revokeMetadataUpdateAuthority">Revoke MetaData Update Authority</label>
                            </div>
                            <div className=" text-[14px] font-normal mt-6">
                                <label className=" block mt-5 text-base text-white font-semibold ">   Symbol Image  (ex. Square size 128x128 or larger is recommended.)
                                </label>
                                {/* <InputField
                                    id="iconUrl"
                                    label=""
                                    value={formData.iconUrl}
                                    onChange={(e) => handleChange(e, 'iconUrl')}
                                    placeholder={"Enter or Upload symbol icon url"}
                                    type="url"
                                required = {false}

                                /> */}
                            </div>

                            {/* image upload  */}
                            <div className=" flex items-center justify-center my-6 p-6 border-2 border-white border-dashed rounded-md">
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
                                    <div className="relative flex justify-center border-y-v3-bg rounded-md w-3/4 h-3/4 max-w-[400px]">

                                        <img src={uploadedImage} alt="Uploaded" className="rounded-md w-3/4 h-3/4 object-contain max-w-[400px]" />

                                    </div>
                                )}
                            </div>



                            {/* <div className="pt-2 space-y-2">


                            </div> */}

                        </div>
                    </div>
                    <div className="lg:w-1/2 flex justify-start flex-col ">
                        <p className="text-[16px] uppercase">Preview</p>
                        <div className="bg-[#262626] border px-4 py-2 my-2 rounded-md border-[#404040]">
                            <div className="bg-[#171717] p-4 rounded-md flex justify-between items-center flex-col gap-4 sm:flex-row ">
                                <div className="flex gap-4 justify-center items-center  ">
                                    {uploadedImage || image ?
                                        <img src={uploadedImage ? uploadedImage : image} className="w-[65px] h-[65px] bg-transparent rounded-full flex justify-center items-center" alt="" /> :
                                        <div className="w-[65px] h-[65px] bg-transparent rounded-full flex justify-center items-center">S</div>}
                                    <div className="">
                                        <p className="font-light text-[#c7f285] lg:w-[80px] xl:w-[150px] 2xl:w-[250px] truncate">{formData.tokenName.length > 0 ? `${formData.tokenName}` : "Token Name"}</p>
                                        <p className="font-light lg:w-[80px] xl:w-[150px] 2xl:w-[250px] truncate ">{formData.tokenSymbol.length > 0 ? `${formData.tokenSymbol}` : "Symbol"}</p>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center gap-2 w-1/3">
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
                        <div className="bg-[#262626] px-4 border border-[#404040] py-2 my-2 rounded-md">
                            <p className="text-[16px] capitalize">token Information</p>

                            <div className="overflowhidden">
                                <div className="flex  gap-8 py-4" style={{ width: "200px" }}>
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Name</p>
                                    {/* <div style={{ width: "400px" }}> */}
                                    <p className="text-[14px] font-light lg:w-[200px] xl:w-[300px] 2xl:w-[450px]" style={{ wordWrap: "break-word" }}>
                                        {formData.tokenName}
                                    </p>
                                    {/* </div> */}
                                </div>
                                <div className="flex  gap-8 py-4" style={{ width: "200px" }}>
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Symbol</p>
                                    <p className="text-[14px] font-light lg:w-[200px] xl:w-[300px] 2xl:w-[450px]" style={{ wordWrap: "break-word" }}>{formData.tokenSymbol}</p>
                                </div>
                                <div className="flex  gap-8 py-4">
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Program</p>
                                    <p className="text-[14px] font-light"></p>
                                </div>
                                <div className="flex  gap-8 py-4">
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Mint Authority</p>
                                    <p className="text-[14px] font-light"></p>
                                </div>
                                <div className="flex  gap-8 py-4">
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Update Authority</p>
                                    <p className="text-[14px] font-light"></p>
                                </div>
                                <div className="flex  gap-8 py-4">
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Freeze Authority</p>
                                    <p className="text-[14px] font-light"></p>
                                </div>

                                {formData.tokenDescription.length > 0 && (
                                    <div className="flex  gap-8 py-4">
                                        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Description</p>
                                        <p className="text-[14px] font-light">{formData.tokenDescription}</p>
                                    </div>
                                )}

                                <div>
                                    {formData.websiteUrl && <div className="flex  gap-8 py-2 justify-start items-center">
                                        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Website</p>
                                        <p className="text-[14px] font-light">{formData.websiteUrl}</p>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" /*stroke-width="1.5"*/ stroke="currentColor" aria-hidden="true" className="w-6 h-6">
                                            <path  /*stroke-linecap="round" stroke-linejoin="round"*/ d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path>
                                        </svg>
                                    </div>}
                                    {formData.twitterUrl && <div className="flex  gap-8 py-2 justify-start items-center">
                                        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Twitter</p>
                                        <p className="text-[14px] font-light">{formData.twitterUrl}</p>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" /*stroke-width="1.5"*/ stroke="currentColor" aria-hidden="true" className="w-4 h-4"><path  /*stroke-linecap="round" stroke-linejoin="round"*/ d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                                    </div>}
                                    {formData.telegramUrl && <div className="flex  gap-8 py-2 justify-start items-center">
                                        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Telegram</p>
                                        <p className="text-[14px] font-light">{formData.telegramUrl}</p>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" /*stroke-width="1.5"*/ stroke="currentColor" aria-hidden="true" className="w-4 h-4"><path  /*stroke-linecap="round" stroke-linejoin="round"*/ d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                                    </div>}
                                    {formData.discordUrl && <div className="flex  gap-8 py-2 justify-start items-center ">
                                        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Discord</p>
                                        <p className="text-[14px] font-light">{formData.discordUrl}</p>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" /*stroke-width="1.5"*/ stroke="currentColor" aria-hidden="true" className="w-4 h-4"><path /*stroke-linecap="round" stroke-linejoin="round"*/ d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
                                    </div>}
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex  gap-8 py-4">
                                        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Tags</p>
                                        <div className=" flex gap-2 flex-wrap">
                                            {tags.map((tag, index) => (
                                                <span key={index} className="tag bg-white px-2 py-1   text-[#292b33] text-[12px] cursor-pointer inline-block">
                                                    {tag}

                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex  gap-8 py-4">
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Create Market</p>
                                    <div className="invoke-btn-secondary">
                                        <Link href="/market/create">
                                            <button className="">Create openbook Market</button>
                                        </Link>
                                    </div>

                                </div>
                            </div>

                        </div>
                        <div>
                            <p className="text-[12px] mt-10">  CREATE TOKEN<br />
                                Generate a token. In this process, you can get a token mint address.</p>
                            <button
                                className="invoke-btn w-full custom-button"
                                disabled={uploading}
                                onClick={createTokenCallback}
                            >
                                <span className="btn-text-gradient">
                                    {uploading ? <span className="italic font-i ellipsis">Uploading Metadata</span> : 'Create token'}
                                </span>
                            </button>
                        </div>
                    </div>
                </form>

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
    );



};


export default CreateToken;

