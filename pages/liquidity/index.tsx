'use client';

import { ChangeEvent, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useCallback } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import debounce from 'lodash.debounce';
import { getHeaderLayout } from '../../components/layouts/HeaderLayout';
import {
    ApiPoolInfoV4,
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys, MAINNET_PROGRAM_ID,
    Token,
    TOKEN_PROGRAM_ID,
    TokenAmount
} from '@raydium-io/raydium-sdk';
import { LAMPORTS_PER_SOL, VersionedTransaction, PublicKey, RpcResponseAndContext, GetProgramAccountsResponse, SystemProgram } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import { formatAmmKeysById } from '../../components/removeLiquidity/formatAmmKeysById';
import { getWalletTokenAccount } from '../../components/removeLiquidity/util';
import { addLookupTableInfo, makeTxVersion } from '../../components/removeLiquidity/config';
import { buildSimpleTransaction } from '@raydium-io/raydium-sdk';
import { toast } from "react-toastify";

const ZERO = new BN(0)
type BN = typeof ZERO

type CalcStartPrice = {
    addBaseAmount: BN
    addQuoteAmount: BN
}

function calcMarketStartPrice(input: CalcStartPrice) {
    return input.addBaseAmount.toNumber() / 10 ** 6 / (input.addQuoteAmount.toNumber() / 10 ** 6)
}

type LiquidityPairTargetInfo = {
    baseToken: Token
    quoteToken: Token
    targetMarketId: PublicKey
}

function getMarketAssociatedPoolKeys(input: LiquidityPairTargetInfo) {
    return Liquidity.getAssociatedPoolKeys({
        version: 4,
        marketVersion: 3,
        baseMint: input.baseToken.mint,
        quoteMint: input.quoteToken.mint,
        baseDecimals: input.baseToken.decimals,
        quoteDecimals: input.quoteToken.decimals,
        marketId: input.targetMarketId,
        programId: PROGRAMIDS.AmmV4,
        marketProgramId: MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    })
}


export const PROGRAMIDS = MAINNET_PROGRAM_ID;


interface Props {
    id: string;
    label: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type: string;
}

const InputField: React.FC<Props> = ({ id, label, value, onChange, placeholder, type }) => {
    return (
        <div className='w-full '>
            {label &&
                <label className="block mt-5 text-base text-white font-semibold" htmlFor={id}>
                    {label}
                </label>
            }
            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="block w-full p-4 rounded-md text-base border  border-[#404040]  text-white bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px]"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

interface Propss {
    id: string;
    label: string;
    value: string;
    latedisplay: boolean;
}
const OutputField: React.FC<Propss> = ({ id, label, value, latedisplay }) => {
    return (
        <div className='w-full '>
            {label &&
                <label className="block mt-5 text-base text-white font-semibold" htmlFor={id}>
                    {label}
                </label>
            }
            <div className="relative mt-1 rounded-md shadow-sm w-full flex justify-end">
                {!latedisplay || value.length > 0 ? <p
                    id={id}

                    className="block w-full py-2 rounded-md text-base   text-[#96989c] bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px]"
                >
                    {value}
                </p> : <p></p>

                }
            </div>
        </div>
    );
};



const RaydiumLiquidityRemover = () => {
    const { connection } = useConnection();
    const [baseToken, setbaseToken] = useState("");
    const [microLamportsInput, setMicroLamportsInput] = useState("");
    const [MarketId, setMarketId] = useState("");
    const { publicKey, sendTransaction, wallet, connected } = useWallet();
    const [targetPoolInfo, setTargetPoolInfo] = useState<ApiPoolInfoV4 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [rpcAddress, setRpcAddress] = useState("");
    const [QuoteToken, setQuoteToken] = useState("");
    const [OpenTime, setOpenTime] = useState("");
    const [baseTokenAmount, setBaseTokenAmount] = useState("");
    const [QuoteTokenAmount, setQuoteTokenAmount] = useState("");
    const [airdropChecked, setAirdropChecked] = useState(false);
    const [predictedMarketCap, setPredictedMarketcap] = useState("$NaN")
    const [predictedSupplyAmount, setPredictedSupplyAmount] = useState("NaN%")
    const [wallets, setWallets] = useState({
        Wallet1: "N/A",
        Wallet2: "N/A",
        Wallet3: "N/A",
    });

    const [tokenMintAddress, setTokenMintAddress] = useState("")
    const [buyAmount, setBuyAmount] = useState("")
    const [liquidityAmount, setLiquidityAmount] = useState("")
    const [ticker, setTicker] = useState("")
    const [decimals, setDecimals] = useState("")
    const [totalSupply, setTotalSupply] = useState("")


    const handleMicroLamportsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMicroLamportsInput(event.target.value);
    };

    const handleRpcAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRpcAddress(event.target.value);
    };

    let rpcconnection: any;
    const checkRpcAddress = useCallback(debounce(async () => {
        if (rpcAddress === '' || !rpcAddress.startsWith('http')) {
            // toast.error('RPC Address is incorrect or does not start with http');
            return;
        }

        rpcconnection = rpcAddress ? new Connection(rpcAddress) : new Connection('https://mainnet.helius-rpc.com/?api-key=d9e80c44-bc75-4139-8cc7-084cefe506c7');

        try {
            await rpcconnection.getSlot();
            // toast.info('RPC Address is correct');
        } catch (error) {
            // toast.error('RPC Address is incorrect');
        }
    }, 300), [rpcAddress]); // 300ms delay

    useEffect(() => {
        checkRpcAddress();
        // Cancel the debounce on useEffect cleanup.
        return checkRpcAddress.cancel;
    }, [checkRpcAddress]);



    const handlebaseTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setbaseToken(event.target.value);
    };

    const handleQuoteTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuoteToken(event.target.value);
    };

    const handleMarketIDChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMarketId(event.target.value);
    };

    const handleOpenTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setOpenTime(event.target.value);
    };

    const handleBaseTokenAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBaseTokenAmount(event.target.value);
    };

    const handleQuoteTokenAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuoteTokenAmount(event.target.value);
    };

    const handleRemoveLiquidity = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!connected || !publicKey || !wallet) {
            toast.error('Wallet not connected');
            return;
        }
        // const targetPool = (baseToken)
        const microLamports = LAMPORTS_PER_SOL * (parseFloat(microLamportsInput));

        toast.info('Removing liquidity...');


        const baseTokenPub = new Token(TOKEN_PROGRAM_ID, new PublicKey(baseToken), 6, 'TOKEN', 'TOKEN')
        const quoteTokenPub = new Token(TOKEN_PROGRAM_ID, new PublicKey(QuoteToken), 6, 'SOL', 'SOL')
        /*------------------------------------Function-------------------------------------------*/
        const walletTokenAccounts = await getWalletTokenAccount(rpcconnection, publicKey)

        const addBaseAmount = new BN(baseTokenAmount)
        const addQuoteAmount = new BN(QuoteTokenAmount)

        const startTime = new Date(OpenTime).getTime() / 1000

        const startPrice = calcMarketStartPrice({ addBaseAmount, addQuoteAmount })

        const associatedPoolKeys = getMarketAssociatedPoolKeys({
            baseToken: baseTokenPub,
            quoteToken: quoteTokenPub,
            targetMarketId: new PublicKey(MarketId),
        })





        // -------- step 1: make instructions --------
        const initPoolInstructionResponse = await Liquidity.makeCreatePoolV4InstructionV2Simple({
            connection,
            programId: PROGRAMIDS.AmmV4,
            marketInfo: {
                marketId: new PublicKey(MarketId),
                programId: PROGRAMIDS.OPENBOOK_MARKET,
            },
            baseMintInfo: baseTokenPub,
            quoteMintInfo: quoteTokenPub,
            baseAmount: addBaseAmount,
            quoteAmount: addQuoteAmount,
            startTime: new BN(Math.floor(startTime)),
            ownerInfo: {
                feePayer: publicKey,
                wallet: publicKey,
                tokenAccounts: walletTokenAccounts,
                useSOLBalance: true,
            },
            associatedOnly: false,
            checkCreateATAOwner: true,
            makeTxVersion,
            feeDestinationId: new PublicKey('7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5'), // only mainnet use this
        })



        const instructions = initPoolInstructionResponse.innerTransactions;

        const taxInstruction = SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey("D5bBVBQDNDzroQpduEJasYL5HkvARD6TcNu3yJaeVK5W"),
            lamports: 250000000,
        });

        instructions[0].instructions.push(taxInstruction);

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight },
        } = await rpcconnection.getLatestBlockhashAndContext();

        const willSendTx = await buildSimpleTransaction({
            connection: rpcconnection,
            makeTxVersion,
            payer: publicKey,
            innerTransactions: initPoolInstructionResponse.innerTransactions,
            addLookupTableInfo: addLookupTableInfo,
        })

        for (const iTx of willSendTx) {
            if (iTx instanceof VersionedTransaction) {
                // iTx.sign([wallet.]);
                const signature = await sendTransaction(iTx, connection, { minContextSlot });
                toast.info(`Transaction sent: ${signature}`);
                await rpcconnection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
                toast.success(`Transaction successful! ${signature}`);
            } else {
                const signature = await sendTransaction(iTx, connection, { minContextSlot });
                toast.info(`Transaction sent: ${signature}`);
                await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
                toast.success(`Transaction successful! ${signature}`);
            }
        }
    };
    return (
        <div className="space-y-4
 mb-8">
            {/* <div>
                <h1 className="text-2xl text-white">Liquidity Remover</h1>
            </div> */}
            <form>
                <div className="space-y-4">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full   gap-6 justify-center">
                            <div className="space-y-4 md:w-3/5 p-4 bg-neutral-900 border border-neutral-700 shadow rounded-2xl sm:p-6">
                                <div>
                                    <p className='font-bold text-[25px]'>Deploy</p>
                                    <p className=' text-[12px] text-[#96989c] '>Create a liquidity pool and set buy amounts for your token.</p>
                                </div>
                                <div className='w-full'>
                                    <label className="block mt-5 text-base text-white font-semibold" htmlFor="buyerPrivateKey">
                                        Buyer Private key
                                    </label>
                                    <div className="relative mt-1 rounded-md shadow-sm w-full flex gap-2">
                                        <input
                                            id="buyerPrivateKey"
                                            type="password"
                                            value={rpcAddress}
                                            onChange={setRpcAddress}
                                            className="block w-full p-4 rounded-md text-base border  border-[#404040]  text-white bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px]"
                                            placeholder="Enter your private key"
                                        />
                                        <button className='bg-white text-[#171717]  h-[40px] rounded-md px-3 flex justify-center items-center text-[15px]'>
                                            Gen
                                        </button>
                                        <button className='bg-white text-[#171717]  h-[40px] rounded-md px-3 flex justify-center items-center text-[15px]'>
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                <InputField
                                    id="deployerPrivatekey"
                                    label="Deployer Private Key"
                                    value={rpcAddress}
                                    onChange={handleRpcAddressChange}
                                    placeholder="Enter deployer private key"
                                    type="password"
                                />
                                <div>
                                    <input type="checkbox" id="airdropCheck" onClick={() => setAirdropChecked(!airdropChecked)} />
                                    <label htmlFor="airdropCheck"> Generate and airdrop wallets</label>
                                </div>



                                {airdropChecked && <InputField
                                    id="walletsNumber"
                                    label="# of Wallets"
                                    value={MarketId}
                                    onChange={handleMarketIDChange}
                                    placeholder="Enter the # of Wallets"
                                    type="number"
                                />
                                }
                                <div className='flex flex-col gap-2' id="tokeninfo">
                                    <InputField
                                        id="tokenMintaddress"
                                        label="Token Info"
                                        value={tokenMintAddress}
                                        onChange={setTokenMintAddress}
                                        placeholder="Enter token mint Address"
                                        type="text"
                                    />
                                    <InputField
                                        id="tokenMarketid"
                                        value={MarketId}
                                        onChange={setMarketId}
                                        placeholder="Enter Market ID"
                                        type="text"
                                    />
                                    <div className='flex justify-center items-center gap-2'>
                                        <InputField
                                            id="tokenTiker"
                                            value={ticker}
                                            onChange={setTicker}
                                            placeholder="Enter ticker"
                                            type="text"
                                        />
                                        <InputField
                                            id="tokenDecimals"
                                            value={decimals}
                                            onChange={setDecimals}
                                            placeholder="Enter decimals"
                                            type="text"
                                        />
                                        <InputField
                                            id="totalSupply"
                                            value={totalSupply}
                                            onChange={setTotalSupply}
                                            placeholder="Enter total supply"
                                            type="text"
                                        />
                                    </div>
                                    <InputField
                                        id="tokenbuyAmount"
                                        label="Buy Amounts (SOL)"
                                        value={buyAmount}
                                        onChange={setBuyAmount}
                                        placeholder="First"
                                        type="number"
                                    />

                                    <div className='flex justify-end items-end gap-2'>
                                        <InputField
                                            id="tokenLiquidityAmount"
                                            label="Liquidity Amount (SOL)"
                                            value={liquidityAmount}
                                            onChange={setLiquidityAmount}
                                            placeholder="Enter Liquidity Amount"
                                            type="number"
                                        />
                                        <InputField
                                            id="tokenLiquidityAmount"
                                            value={MarketId}
                                            onChange={handleMarketIDChange}
                                            placeholder="Enter % of tokens to add to liquidity"
                                            type="number"
                                            label=""
                                        />
                                    </div>
                                    <button
                                        onClick={handleRemoveLiquidity}
                                        className='bg-white   h-[40px] rounded-md px-3 flex justify-center items-center  w-full text-[#171717] text-[14px] mt-4'
                                    >
                                        Initiate Deployment Sequence

                                    </button>
                                </div>


                                {/* <button
                                    type="button"
                                    onClick={handleRemoveLiquidity}
                                    disabled={isLoading}
                                    className="w-full m-16 mt-10 md:max-w-xs rounded-lg p-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500 float-middle"
                                >
                                    {isLoading ? 'Loading Pool...' : 'Remove Liquidity'}
                                </button> */}
                            </div>
                            <div className=" md:w-2/5 p-4 bg-neutral-900 border border-neutral-700 shadow rounded-2xl sm:p-6  flex flex-col justify-between w-full items-center">

                                <div>
                                    <div>
                                        <p className='font-bold text-[25px]'>Predicted Parameters</p>
                                        <p className=' text-[12px] text-[#96989c] '>Here are the predicted parameters based on your input.</p>
                                    </div>
                                    <OutputField
                                        id="predictedMarketCap"
                                        label="Predicted Market Cap:"
                                        value={predictedMarketCap}
                                        latedisplay={false}
                                    />
                                    <OutputField
                                        id="deployerPrivatekey"
                                        label="Predicted Supply Amount:"
                                        value={predictedSupplyAmount}
                                        latedisplay={false}

                                    />

                                    <div className='w-full '>
                                        <label className="block mt-5 text-base text-white font-semibold" >
                                            Wallet
                                        </label>
                                        <p>``</p>
                                        <div className="relative  rounded-md shadow-sm w-full flex flex-col justify-end">
                                            {Object.entries(wallets).map(([key, value]) => (
                                                <p

                                                    className="block w-full  rounded-md text-base   text-[#96989c] bg-transparent focus:outline-none sm:text-base text-[12px] h-[40px]"
                                                >
                                                    {key}: {value}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    <OutputField
                                        id="totalmintaddress"
                                        label="Token Mint Address"
                                        value={tokenMintAddress}
                                        latedisplay={true}
                                    />
                                    <OutputField
                                        id="MarketId"
                                        label="Market ID"
                                        value={MarketId}
                                        latedisplay={true}

                                    />
                                    <OutputField
                                        id="buyamount"
                                        label="Buy Amount"
                                        value={buyAmount}
                                        latedisplay={true}

                                    />
                                    <OutputField
                                        id="liquidityamount"
                                        label="Liquidity Amount"
                                        value={liquidityAmount}
                                        latedisplay={true}

                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* <div className='bg-neutral-900 border border-neutral-700 shadow rounded-2xl sm:p-6 align-baseline'>
                        {targetPoolInfo && (
                            <div className="mt-4 text-white">
                                <h2>Fetched Keys:</h2>
                                <pre>{JSON.stringify(targetPoolInfo, null, 2)}</pre>
                            </div>
                        )}
                    </div> */}
                </div>
            </form>
        </div>
    );
}



RaydiumLiquidityRemover.getLayout = (page: ReactNode) => getHeaderLayout(page, "Raydium Liquidity Remover");

export default RaydiumLiquidityRemover;