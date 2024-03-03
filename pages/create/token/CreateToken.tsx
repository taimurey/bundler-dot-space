import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {createImageFromInitials} from "../../../helpers/common/createImage"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faDiscord, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
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
import { FC, useCallback, useState } from "react";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "../../../context/NetworkConfigurationProvider";
import { toast } from "react-toastify";
import { NFTStorage, File } from 'nft.storage';
import { packToBlob } from 'ipfs-car/pack/blob';


// // input component 
interface TokenInputProps {
    label: string;
    value: string | number;
    onChange: (value: string | number | Function ) => void;
    // onChange: SetStateAction<string | number>;

    type?: string;
    placeholder?: string;
}




const TokenInput: FC<TokenInputProps> = ({ label, value, onChange, type = 'text', placeholder = '' }) => {
    return (
        <div className="sm:gap-4  mt-4">
            {label && <div className=" text-[14px] font-normal text-[#9d9dab]">{label}</div>}
            <input
                className="block w-full focus:outline-none px-4 rounded-md py-2 bg-neutral-800 border-neutral-300 sm:text-md font-light"
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
};

interface TagsInputProps {
    selector: string;
    duplicate?: boolean;
    max?: number | null;
}

const TagsInput: FC<TagsInputProps> = ({ selector, duplicate = false, max = null , tags , setTags }) => {
    const [inputValue, setInputValue] = useState<string>('');

    const addTag = (string: string): void => {
        if (anyErrors(string)) return;

        setTags([...tags, string]);
        setInputValue('');
    };

    const deleteTag = (index: number): void => {
        const updatedTags = tags.filter((_, i) => i !== index);
        setTags(updatedTags);
    };

    const anyErrors = (string: string): boolean => {
        if (max !== null && tags.length >= max) {
            console.log('max tags limit reached');
            return true;
        }

        if (!duplicate && tags.includes(string)) {
            console.log('duplicate found "' + string + '"');
            return true;
        }

        return false;
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setInputValue(event.target.value);
    };

    const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
        if ([9, 13, 188].includes(event.keyCode)) {
            event.preventDefault();
            if (inputValue.trim() !== '') {
                addTag(inputValue.trim());
            }
        }
    };

    return (
        <div>
        <div className="tags-input-wrapper bg-transparent p-1  max-w-md  border border-[#dddddd]">
            {tags.map((tag, index) => (
                <span key={index} className="tag bg-white px-2 py-1  m-1 text-[#292b33] text-[12px] cursor-pointer inline-block">
                    {tag}
                    <a
                        href="/"
                        className="ml-2 cursor-pointer "
                        onClick={(e) => {
                            e.preventDefault();
                            deleteTag(index);
                        }}
                    >
                        &times;
                    </a>
                </span>
            ))}
            <input
                type="text"
                id={selector}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                disabled={max !== null && tags.length >= max}
                className="border-none bg-transparent outline-none w-40 ml-2 "
            />
              
        </div>
        <div className="flex  text-[14px] justify-center items-center whitespace-nowrap flex-wrap lg:flex-nowrap"> Suggestions: 
        <span
            className="tag bg-white px-1 py-1 rounded-sm m-1 text-[#292b33] text-[10px] cursor-pointer"
            onClick={() => addTag("Meme")}
          >
            Meme
          </span>
          <span
            className="tag bg-white px-1 py-1 rounded-sm m-1 text-[#292b33] text-[10px] cursor-pointer"
            onClick={() => addTag("AirDrop")}
          >
            Air Drop
          </span>
          <span
            className="tag bg-white px-1 py-1 rounded-sm m-1 text-[#292b33] text-[10px] cursor-pointer"
            onClick={() => addTag("FanToken")}
          >
            FanToken
          </span>
          <span
            className="tag bg-white px-1 py-1 rounded-sm m-1 text-[#292b33] text-[10px] cursor-pointer"
            onClick={() => addTag("Tokeniozation")}
          >
            Tokeniozation
          </span>
          <span
            className="tag bg-white px-1 py-1 rounded-sm m-1 text-[#292b33] text-[10px] cursor-pointer"
            onClick={() => addTag("RWA")}
          >
            RWA
          </span>
          
        </div>
  </div>
    );
};








const CreateToken: FC = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { networkConfiguration } = useNetworkConfiguration();
    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [tokenUri, setTokenUri] = useState("");
    const [tokenDecimals, setTokenDecimals] = useState(9);
    const [tokenAmount, setTokenAmount] = useState(1000000000);
    const [tokenDescription, settokenDescription] = useState("");
    const [tokenMintAddress, setTokenMintAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [image, setImage] = useState<string>("");
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [iconUrl, setIconurl] = useState("");
    const client = new NFTStorage({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDIxZTYwQ2VlQjc5YTlmZTFFQzM1NjhBZkEwMDNFM2Q1MmVCODU4YWQiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTcwODc5MTgyMTg2MiwibmFtZSI6Ik1pbnRlclRva2VuIn0.6h3W2Y9X0WYEioBZhA0va-TqYBT95O48hfxT-y6Fi6I' });
    const [uploading, setUploading] = useState(false);
    const [percentComplete, setPercentComplete] = useState(0);
    const [urls, setUrls] = useState<string[]>(["", "", "", ""]);

    const handleChange = (index: number, newValue: string): void => {
            const updatedUrls = [...urls];
            updatedUrls[index] = newValue;
            setUrls(updatedUrls);
    };
    let uploadedImageUrl = '';


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
                    // Pack the image into a CAR file
                    const { car } = await packToBlob({
                        input: [file],
                        wrapWithDirectory: false,
                    });

                    // Upload the CAR file to NFT.Storage
                    const cid = await client.storeCar(car, {
                        onStoredChunk: (size) => {
                            // Update the upload progress
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
                            name: tokenName,
                            symbol: tokenSymbol,
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
        tokenName,
        tokenSymbol,
        tokenUri,
        sendTransaction,
    ]);

    const setImageandsymbol =  (value) => {
        const icon = createImageFromInitials(value);
        setImage(icon);
        setTokenSymbol(value)
    }

    return (
        <div className="divide-y divide-neutral-700">
            
            {isLoading && (
                <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
                    <ClipLoader />
                </div>
            )}

            {!tokenMintAddress ? (
                <div className="p-4  flex bg-[] gap-8 flex-col md:flex-row">
                    <div className="lg:w-1/2  ">
                    <p className="text-[16px] uppercase pl-4">Token Information</p>
                    <p className="text-[14px] pl-4">This information is stored on IPFS by + Metaplex Metadata standard.</p>
                    <div className="sm:gap-4 pl-4 mt-4">
                            <TokenInput label="Token Name (ex. Dexlab)" value={tokenName} onChange={setTokenName} placeholder = {"Enter token name"} />
                            <TokenInput label="Token symbol" value={tokenSymbol} onChange={setImageandsymbol} placeholder = {"Enter token symbol"}  />
                            <div className="sm:gap-4 mt-4">
                            <div className=" text-[14px] text-[#9d9dab] font-normal ">(Optional) Description</div>
                            <textarea name="" id=""  value={tokenDescription}  rows={5} className="block w-full px-4 rounded-md py-1 focus:outline-none bg-neutral-800 border-neutral-300  sm:text-md "
                                onChange={(e) => settokenDescription(e.target.value)}
                                placeholder="Enter description..."></textarea>
                        </div>
                         <div className=" text-[14px] font-normal">(Optional) Extensions</div>
                         <TokenInput value={urls[0]} onChange={(newValue) => handleChange(0, newValue)} type="url" placeholder={"Website URL"} />
            <TokenInput value={urls[1]} onChange={(newValue) => handleChange(1, newValue)} type="url" placeholder={"Twitter URL"} />
            <TokenInput value={urls[2]} onChange={(newValue) => handleChange(2, newValue)} type="url" placeholder={"Telegram Group URL"} />
            <TokenInput value={urls[3]} onChange={(newValue) => handleChange(3, newValue)} type="url" placeholder={"Discord URL"} />

                        <div className="text-[14px] font-normal mt-4">(Optional) Tags - Max 5 tags
</div>                        <TagsInput selector="tag-input1" duplicate={false} max={5}  tags = {tags} setTags  = {setTags}/>

                        <div className=" text-[14px] font-normal mt-6">
                        Symbol Image (ex. Square size 128x128 or larger is recommended.)
                        <TokenInput  value={iconUrl} onChange={setIconurl} type="url" placeholder = {"Enter or Upload symbol icon url"} /> 
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
                        {uploadedImage && <img src={uploadedImage} alt="Uploaded" className="mt-4 border-b-2 border-y-v3-bg rounded-md w-3/4 h-3/4 object-contain" />}
                        
                    </div>
                    <div className="pt-2 space-y-2">
                        <div>
                <button
                    className="w-full  rounded-lg p-2 m-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500 float-right"
                    onClick={(event) => createToken(event)}
                    disabled={uploading}
                >
                    Create token
                </button>

                  <p className="text-[12px]">  CREATE TOKEN<br/>
                    Generate a token. In this process, you can get a token mint address.</p>
                    </div>

            </div>
                        </div>
                    </div>
        <div className="lg:w-1/2 flex justify-start flex-col ">
        <p className="text-[16px] uppercase">Preview</p>
        <div className="bg-[#262626] px-4 py-2 my-2 rounded-md">
            <div className="bg-[#171717] p-4 rounded-md flex justify-between items-center flex-col gap-4 sm:flex-row ">
                <div className="flex gap-4 justify-center items-center">
                     {image ? 
                     <img src={image} className="w-[65px] h-[65px] bg-green-700 rounded-full flex justify-center items-center" alt="" />:
                    <div className="w-[65px] h-[65px] bg-green-700 rounded-full flex justify-center items-center">S</div> }
                     <div>
                        <p className="font-light text-[#c7f285] ">{tokenName.length > 0 ? `${tokenName}` : "Token Name"}</p>
                        <p className="font-light ">{tokenSymbol.length  > 0 ? `${tokenSymbol}` : "Symbol"}</p>
                    </div>   
                </div>
                    <div className="flex justify-center items-center gap-2">
                    <a href={urls[0]} target="_blank">

      <FontAwesomeIcon icon={faTwitter} size="xs" className="bg-white text-black text-[10px] rounded-full p-[3px]" />
      </a>
      <a href={urls[1]} target="_blank">

      <FontAwesomeIcon icon={faTelegram} size="xs" className="bg-white text-black text-[10px] rounded-full p-[3px]" />
        </a>
        <a href={urls[2]} target="_blank">

      <FontAwesomeIcon icon={faDiscord} size="xs"  className="bg-white text-black text-[10px] rounded-full p-[3px]"/>
        </a>
        <a href={urls[3]} target="_blank">

      <FontAwesomeIcon icon={faWhatsapp} size="xs"  className="bg-white text-black text-[10px] rounded-full p-[3px]"/>
      </a>
    </div>

            </div>

        </div>
        <div className="bg-[#262626] px-4 py-2 my-2 rounded-md">
        <p className="text-[16px] capitalize">token Information</p>

<div>
    <div className="flex  gap-8 py-4">
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Name</p>
        <p className="text-[14px] font-light">{tokenName}</p>
    </div>
    <div className="flex  gap-8 py-4">
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Symbol</p>
        <p className="text-[14px] font-light">{tokenSymbol}</p>
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
   
    {tokenDescription.length > 0 && (
    <div className="flex  gap-8 py-4">
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Description</p>
        <p className="text-[14px] font-light">{tokenDescription}</p>
    </div>
    )}
     
        <div>
        {urls[0] && <div className="flex  gap-8 py-2 justify-start items-center">
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Website</p>
        <p className="text-[14px] font-light">{urls[0]}</p>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" className="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
        </div>}
        {urls[1] && <div className="flex  gap-8 py-2 justify-start items-center">
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Twitter</p>
        <p className="text-[14px] font-light">{urls[1]}</p>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" className="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
        </div>}
        {urls[2] && <div className="flex  gap-8 py-2 justify-start items-center">
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Telegram</p>
        <p className="text-[14px] font-light">{urls[2]}</p>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" className="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
        </div>}
        {urls[3] && <div className="flex  gap-8 py-2 justify-start items-center ">
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Discord</p>
        <p className="text-[14px] font-light">{urls[3]}</p>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" className="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>
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
        <p className="text-[14px] font-normal text-[#9d9dab] max-w-[100px] w-full">Recommend Integration</p>
        <div className="flex justify-start border-[#4be099]/10 border px-2 gap-2 font-light flex-col sm:flex-row"><button className=" max-w-[100px] truncate ">OpenBook Market</button><button className="max-w-[100px] truncate ">Go to Tools</button></div>
    </div>
</div>

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




