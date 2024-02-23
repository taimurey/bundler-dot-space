'use client';

import { useState } from 'react';
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

    const handleMicroLamportsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMicroLamportsInput(event.target.value);
    };

    const handleRpcAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRpcAddress(event.target.value);
    };

    let rpcconnection: any;
    const checkRpcAddress = useCallback(debounce(async () => {
        if (rpcAddress === '' || !rpcAddress.startsWith('http')) {
            toast.error('RPC Address is incorrect or does not start with http');
            return;
        }

        rpcconnection = rpcAddress ? new Connection(rpcAddress) : new Connection('https://mainnet.helius-rpc.com/?api-key=d9e80c44-bc75-4139-8cc7-084cefe506c7');

        try {
            await rpcconnection.getSlot();
            toast.info('RPC Address is correct');
        } catch (error) {
            toast.error('RPC Address is incorrect');
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
        <div className="space-y-4 mb-8">
            <div>
                <h1 className="text-2xl text-white">Liquidity Remover</h1>
            </div>
            <form>
                <div className="space-y-4">
                    <div className="bg-neutral-900 border border-neutral-700 shadow rounded-2xl sm:p-6">
                        <div className="flex items-center justify-center">
                            <div className="space-y-4 md:w-1/2 mt-20">
                                <div className="text-base text-white">
                                    {/* <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="microLamports">
                                            Private Key <span className='opacity-50'>(Optional)</span> <span className="opacity-30">-- Fast Method</span>
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="privateKey"
                                                type="text"
                                                value={privateKey}
                                                onChange={handlePrivateKeyChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="4DMMc34V..."
                                            />
                                        </div>
                                    </div> */}
                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="rpcAddress">
                                            RPC Address
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="rpcAddress"
                                                type="text"
                                                value={rpcAddress}
                                                onChange={handleRpcAddressChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter RPC Address..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="baseToken">
                                            Market ID
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="MarketID"
                                                type="text"
                                                value={MarketId}
                                                onChange={handleMarketIDChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter token address..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="baseToken">
                                            Base Token
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="baseToken"
                                                type="text"
                                                value={baseToken}
                                                onChange={handlebaseTokenChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter token address..."
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="baseToken">
                                            Quote Token
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="QuoteToken"
                                                type="text"
                                                value={QuoteToken}
                                                onChange={handleQuoteTokenChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter token address..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="baseToken">
                                            Add BaseToken Amount
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id='addBaseAmount'
                                                type="text"
                                                value={baseTokenAmount}
                                                onChange={handleBaseTokenAmountChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter token address..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="baseToken">
                                            Add Quote Token Amount
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id='addBaseAmount'
                                                type="text"
                                                value={QuoteTokenAmount}
                                                onChange={handleQuoteTokenAmountChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter token address..."
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="baseToken">
                                            Pool Open Time
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="OpenTime"
                                                type="text"
                                                value={OpenTime}
                                                onChange={handleOpenTimeChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter token address..."
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mt-5 text-base text-white" htmlFor="microLamports">
                                            Priority Fee
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="microLamports"
                                                type="text"
                                                value={microLamportsInput}
                                                onChange={handleMicroLamportsInputChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter 0.001 etc..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleRemoveLiquidity}
                                        disabled={isLoading}
                                        className="w-full m-16 mt-10 md:max-w-xs rounded-lg p-2 animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] px-8 hover:from-pink-500 hover:to-yellow-500 float-middle"
                                    >
                                        {isLoading ? 'Loading Pool...' : 'Remove Liquidity'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='bg-neutral-900 border border-neutral-700 shadow rounded-2xl sm:p-6 align-baseline'>
                        {targetPoolInfo && (
                            <div className="mt-4 text-white">
                                <h2>Fetched Keys:</h2>
                                <pre>{JSON.stringify(targetPoolInfo, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}



RaydiumLiquidityRemover.getLayout = (page: ReactNode) => getHeaderLayout(page, "Raydium Liquidity Remover");

export default RaydiumLiquidityRemover;
