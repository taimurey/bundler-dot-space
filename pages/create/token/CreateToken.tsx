import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import { createImageFromInitials } from "../../../helpers/common/createImage"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faDiscord, faWebflow } from '@fortawesome/free-brands-svg-icons';
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    createMintToInstruction,
    getAssociatedTokenAddress,
    getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token-2";
import {
    createCreateMetadataAccountV3Instruction,
    PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import React, { FC, useCallback, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { NFTStorage } from 'nft.storage';
import { packToBlob } from 'ipfs-car/pack/blob';
import { InputField } from '../../../components/FieldComponents/InputField';

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
        uploadedImage: uploadedImage

    });


    const [tokenUri] = useState("");
    const [tokenDecimals] = useState(9);
    const [tokenAmount] = useState(1000000000);
    const [tokenMintAddress, setTokenMintAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [tags,] = useState<string[]>([]);
    const [image, setImage] = useState<string>("");
    const client = new NFTStorage({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDIxZTYwQ2VlQjc5YTlmZTFFQzM1NjhBZkEwMDNFM2Q1MmVCODU4YWQiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTcwODc5MTgyMTg2MiwibmFtZSI6Ik1pbnRlclRva2VuIn0.6h3W2Y9X0WYEioBZhA0va-TqYBT95O48hfxT-y6Fi6I' });
    const [uploading, setUploading] = useState(false);
    const [percentComplete, setPercentComplete] = useState(0);

  

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };



    let uploadedImageUrl = '';


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
                    uploadedImageUrl = httpUrl;
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
    const createToken = useCallback(async (event: any) => {
        event.preventDefault();
        console.log(formData, "simple form data")
        console.log(JSON.stringify(formData), "JSON stringified form data")
        if (!publicKey) {
            toast.error("Wallet not connected");
            return;
        }

        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        const mintKeypair = Keypair.generate();
        const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);

        setIsLoading(true);
        try {

            const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
                {
                    metadata: PublicKey.findProgramAddressSync(
                        [
                            Buffer.from("metadata"),
                            PROGRAM_ID.toBuffer(),
                            mintKeypair.publicKey.toBuffer(),
                        ],
                        PROGRAM_ID,
                    )[0],
                    mint: mintKeypair.publicKey,
                    mintAuthority: publicKey,
                    payer: publicKey,
                    updateAuthority: publicKey,
                },
                {
                    createMetadataAccountArgsV3: {
                        data: {
                            name: formData.tokenName,
                            symbol: formData.tokenSymbol,
                            uri: uploadedImageUrl,
                            creators: null,
                            sellerFeeBasisPoints: 0,
                            uses: null,
                            collection: null,
                        },
                        isMutable: false,
                        collectionDetails: null,
                    },
                },
            );
            const tx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),

                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    Number(tokenDecimals),
                    publicKey,
                    publicKey,
                    TOKEN_PROGRAM_ID,
                ),
                createAssociatedTokenAccountInstruction(
                    publicKey,
                    tokenATA,
                    publicKey,
                    mintKeypair.publicKey,
                ),
                createMintToInstruction(
                    mintKeypair.publicKey,
                    tokenATA,
                    publicKey,
                    tokenAmount * Math.pow(10, tokenDecimals),
                ),
                createMetadataInstruction

            );
            const signature = await sendTransaction(tx, connection, {
                signers: [mintKeypair],
            });
            setTokenMintAddress(mintKeypair.publicKey.toString());
            toast.success(`Token created: ${mintKeypair.publicKey.toString()} signature: ${signature}`);
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error(JSON.stringify(error));
            }
        }
        setIsLoading(false);
    }, [
        tokenAmount,
        publicKey,
        connection,
        tokenDecimals,
        formData.tokenName,
        formData.tokenSymbol,
        tokenUri,
        sendTransaction,
    ]);

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
                <div className="py-4  flex bg-[] gap-8 flex-col lg:flex-row">
                    <div className="lg:w-1/2  ">
                        <p className="text-[20px] uppercase  block  text-base text-white font-bold">Token Information</p>
                        <p className="text-[14px] text-[#8c929d] ">This information is stored on IPFS by + Metaplex Metadata standard.</p>
                        <div className="sm:gap-4  mt-4">
                            {/* <TokenInput label="Token Name (ex. Mevarik)" value={tokenName} onChange={setTokenName} placeholder={"Enter token name"} /> */}
                            <InputField
                                id="tokenName"
                                label="Token Name (ex. Mevarik)"
                                value={formData.tokenName}
                                onChange={(e) => handleChange(e, 'tokenName')}
                                placeholder="Enter Token Name"
                                type="text"
                            />
                            <InputField
                                id="tokenSymbol"
                                label="Token Symbol"
                                value={formData.tokenSymbol}
                                onChange={(e) => { handleChange(e, 'tokenSymbol'), setImageandsymbol(e) }}
                                placeholder="Enter Token Symbol"
                                type="text"
                            />
                            <div className="sm:gap-4 mt-4">
                                <label className=" block mt-5 text-base text-white font-semibold "> Description (Optional)</label>
                                <textarea name="" id="tokenDescription" value={formData.tokenDescription} rows={5} className="  mt-1 px-4  py-1  bg-neutral-800   sm:text-md block w-full p-4 rounded-md text-base border  border-[#404040]  text-white bg-transparent focus:outline-none sm:text-base text-[12px]"
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
                            />
                            <InputField
                                id="twitterUrl"
                                label=""
                                value={formData.twitterUrl}
                                onChange={(e) => handleChange(e, 'twitterUrl')}
                                placeholder={"Twitter URL"}
                                type="url"
                            /><InputField
                                id="telegramUrl"
                                label=""
                                value={formData.telegramUrl}
                                onChange={(e) => handleChange(e, 'telegramUrl')}
                                placeholder={"Telegram Group URL"}
                                type="url"
                            /><InputField
                                id="discordUrl"
                                label=""
                                value={formData.discordUrl}
                                onChange={(e) => handleChange(e, 'discordUrl')}
                                placeholder={"Discord URL"}
                                type="url"
                            />
                            {/* <div className="text-[14px] font-normal mt-4">(Optional) Tags - Max 5 tags
                            </div>
                            <TagsInput selector="tag-input1" duplicate={false} max={5} tags={tags} setTags={setTags} /> */}

                            <div className=" text-[14px] font-normal mt-6">
                                <label className=" block mt-5 text-base text-white font-semibold ">   Symbol Image  (ex. Square size 128x128 or larger is recommended.)
                                </label>
                                <InputField
                                    id="iconUrl"
                                    label=""
                                    value={formData.iconUrl}
                                    onChange={(e) => handleChange(e, 'iconUrl')}
                                    placeholder={"Enter or Upload symbol icon url"}
                                    type="url"
                                />
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
                                        <img src={uploadedImage ? uploadedImage : image} className="w-[65px] h-[65px] bg-green-700 rounded-full flex justify-center items-center" alt="" /> :
                                        <div className="w-[65px] h-[65px] bg-green-700 rounded-full flex justify-center items-center">S</div>}
                                    <div className="">
                                        <p className="font-light text-[#c7f285] lg:w-[80px] xl:w-[150px] 2xl:w-[250px] truncate">{formData.tokenName.length > 0 ? `${formData.tokenName}` : "Token Name"}</p>
                                        <p className="font-light ">{formData.tokenSymbol.length > 0 ? `${formData.tokenSymbol}` : "Symbol"}</p>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center gap-2 w-1/3">
                                    <a href={formData.twitterUrl} target="_blank" rel="noreferrer">

                                        <FontAwesomeIcon icon={faTwitter} size="xs" className="bg-white text-black text-[10px] rounded-full p-[3px]" />
                                    </a>
                                    <a href={formData.telegramUrl} target="_blank" rel="noreferrer">

                                        <FontAwesomeIcon icon={faTelegram} size="xs" className="bg-white text-black text-[10px] rounded-full p-[3px]" />
                                    </a>
                                    <a href={formData.discordUrl} target="_blank" rel="noreferrer">

                                        <FontAwesomeIcon icon={faDiscord} size="xs" className="bg-white text-black text-[10px] rounded-full p-[3px]" />
                                    </a>
                                    <a href={formData.twitterUrl} target="_blank" rel="noreferrer">

                                        <FontAwesomeIcon icon={faWebflow} size="xs" className="bg-white text-black text-[10px] rounded-full p-[3px]" />
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
                                <div className="flex  gap-8 py-4">
                                    <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Symbol</p>
                                    <p className="text-[14px] font-light">{formData.tokenSymbol}</p>
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
                                className="invoke-btn w-full"
                                onClick={(event) => createToken(event)}
                                disabled={uploading}
                            >
                                Create token
                            </button>
                        </div>
                    </div>
                </div>

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


