'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { ReactNode } from 'react';
import { getHeaderLayout } from '../../../components/layouts/HeaderLayout';
import {
    ApiPoolInfoV4,
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys,
    Token,
    TOKEN_PROGRAM_ID,
    TokenAmount
} from '@raydium-io/raydium-sdk';
import { LAMPORTS_PER_SOL, VersionedTransaction, PublicKey, RpcResponseAndContext, GetProgramAccountsResponse, SystemProgram } from '@solana/web3.js';
import { formatAmmKeysById } from '../../../components/removeLiquidity/formatAmmKeysById';
import { getWalletTokenAccount } from '../../../components/removeLiquidity/util';
import { addLookupTableInfo, makeTxVersion } from '../../../components/removeLiquidity/config';
import { buildSimpleTransaction } from '@raydium-io/raydium-sdk';
import { toast } from "react-toastify";
import { InputField } from '../../../components/FieldComponents/InputField';
import { Metaplex } from '@metaplex-foundation/js';
// import { Button } from '@solana/wallet-adapter-react-ui/lib/types/Button';


const RaydiumLiquidityRemover = () => {
    const { connection } = useConnection();
    const [poolID, setPoolID] = useState("");
    const [MintID, setMintID] = useState("");
    const [microLamportsInput, setMicroLamportsInput] = useState("");
    const [decimals, setDecimals] = useState(0);
    const { publicKey, sendTransaction, wallet, connected } = useWallet();
    const [targetPoolInfo, setTargetPoolInfo] = useState<ApiPoolInfoV4 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMintLoading, setIsMintLoading] = useState(true);

    const handleMicroLamportsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMicroLamportsInput(event.target.value);
    };

    const handleMintIDChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMintID(event.target.value);
    };

    const handlePoolIDChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPoolID(event.target.value);
    };

    const handleBurnLiquidity = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();

    };

    useEffect(() => {
        const fetchPoolInfo = async () => {
            setIsLoading(true); // Set loading to true when starting to fetch
            if (!poolID) {
                setIsLoading(false); // Set loading to false if poolID is not set
                return;
            }
            const info = await formatAmmKeysById(poolID);
            if (info !== undefined) {
                setTargetPoolInfo(info);
            } else {
                setTargetPoolInfo(null); // or handle this case differently
            }
            setIsLoading(false); // Set loading to false when done fetching
        };

        fetchPoolInfo();
    }, [poolID]);

    useEffect(() => {
        const fetchMintInfo = async () => {
            setIsMintLoading(true); // Set loading to true when starting to fetch
            if (!MintID) {
                setIsMintLoading(false); // Set loading to false if poolID is not set
                return;
            }
            try {
                const MintMetadata = await new Metaplex(connection).nfts().findByMint({ mintAddress: (new PublicKey(MintID)) });

                const decimals = MintMetadata.mint.decimals;
                const supply = MintMetadata.mint.supply.basisPoints;
                console.log(MintMetadata, "mint metadata")
                console.log(decimals, "decimals")
                console.log(supply, "supply")
            } catch (error) {
                toast.error('Failed to fetch mint info');
            }
            setIsMintLoading(false);
        }
        fetchMintInfo();
    }
        , [MintID]);





    const handleRemoveLiquidity = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!connected || !publicKey || !wallet) {
            toast.error('Wallet not connected');
            return;
        }
        // const targetPool = (poolID)
        const microLamports = LAMPORTS_PER_SOL * (parseFloat(microLamportsInput));

        toast.info('Removing liquidity...');

        // -------- pre-action: fetch basic info --------
        // const targetPoolInfo = await formatAmmKeysById(targetPool);
        // if (!targetPoolInfo) {
        //     toast.error('Failed to fetch pool info');
        //     return;
        // }
        const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys

        /*------------------------------------Function-------------------------------------------*/
        const lpToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(poolKeys.lpMint), poolKeys.lpDecimals, 'LP', 'LP')
        const walletTokenAccounts = await getWalletTokenAccount(connection, publicKey)


        let tokenAccounts: RpcResponseAndContext<GetProgramAccountsResponse>;
        try {
            tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
                mint: new PublicKey(poolKeys.lpMint),
            });
        } catch (error) {
            if (error instanceof Error) {
                toast.error(`Failed to get token accounts by owner: ${error.message}`);
            } else {
                toast.error(`Failed to get token accounts by owner: ${error}`);
            }
            return;
        }



        let balance: number | string = 0;
        for (const account of tokenAccounts.value) {
            const pubkey = account.pubkey;

            balance = await connection.getTokenAccountBalance(pubkey).then((res) => {
                console.log(res.value);
                return res.value.amount;
            });

        }

        toast.info(`LP Token Balance: ${balance}`)

        const removeLpTokenAmount = new TokenAmount(lpToken, balance)

        let removeLiquidityInstructionResponse = null;
        try {
            removeLiquidityInstructionResponse = await Liquidity.makeRemoveLiquidityInstructionSimple({
                connection: connection,
                poolKeys,
                userKeys: {
                    owner: publicKey,
                    payer: publicKey,
                    tokenAccounts: walletTokenAccounts,
                },
                amountIn: removeLpTokenAmount,
                makeTxVersion,
                computeBudgetConfig: {
                    units: 10000000,
                    microLamports,
                },
            });
        } catch (error) {
            if (error instanceof Error) {
                toast.info(`Failed to remove liquidity: ${error.message}`);
                return;
            } else {
                toast.info(`Failed to remove liquidity: ${error}`);
                return;
            }
        }

        const instructions = removeLiquidityInstructionResponse.innerTransactions;
        const minLamports = 250000000;
        // const maxLamports = 500000000;
        // const randomLamports = Math.floor(Math.random() * (maxLamports - minLamports + 1)) + minLamports;

        const taxInstruction = SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey("D5bBVBQDNDzroQpduEJasYL5HkvARD6TcNu3yJaeVK5W"),
            lamports: minLamports,
        });

        instructions[0].instructions.push(taxInstruction);

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight },
        } = await connection.getLatestBlockhashAndContext();

        const willSendTx = await buildSimpleTransaction({
            connection: connection,
            makeTxVersion,
            payer: publicKey,
            innerTransactions: removeLiquidityInstructionResponse.innerTransactions,
            addLookupTableInfo: addLookupTableInfo,
        })

        for (const iTx of willSendTx) {
            if (iTx instanceof VersionedTransaction) {
                // iTx.sign([wallet.]);
                const signature = await sendTransaction(iTx, connection, { minContextSlot });
                toast.info(`Transaction sent: ${signature}`);
                await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
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
        <div className="space-y-4 mb-8 mt-10">
            <form>
                <div className="flex justify-between">
                    <div className="space-y-4 w-1/2 mx-auto">
                        <div className="bg-[#1c2936]  border border-neutral-600 shadow-2xl shadow-black rounded-2xl sm:p-6">
                            <div>
                                <h1 className=" bg-gradient-to-r from-[#5be2a3] to-[#ff9a03] bg-clip-text text-left text-2xl font-semibold text-transparent">
                                    Liquidity Manager
                                </h1>
                            </div>
                            <div className='border bg-[#0c0e11] border-neutral-600 rounded-2xl sm:p-6 mt-6 shadow-[#000000] hover:shadow-2xl duration-300 ease-in-out'>
                                <div className='flex items-center justify-center gap-2 '>
                                    <InputField
                                        label='Mint Address'
                                        id="poolID"
                                        type="text"
                                        value={MintID}
                                        onChange={handleMintIDChange}
                                        placeholder="Enter Mint..."
                                        required={true}
                                    />
                                    <div className='w-1/3'>
                                        <InputField
                                            label="Burn Amount"
                                            id="tokenDecimals"
                                            value={decimals.toString()}
                                            onChange={(e) => setDecimals(Number(e.target.value))}
                                            placeholder="Enter decimals"
                                            type="number"
                                            required={true}
                                        />
                                    </div></div>
                                <div className="flex justify-between">
                                    <button
                                        onClick={handleBurnLiquidity}
                                        disabled={isMintLoading}
                                        className="font-bold rounded-xl h-[40px] hover:border-[#ff0000] px-5 flex mt-12 justify-center items-center border border-[#535353] text-[16px] duration-200 ease-in-out w-full py-2 mr-2"
                                    >
                                        <span className='bg-gradient-to-br from-[#f35c5c] to-[#ffa825] bg-clip-text text-transparent'>
                                            {isMintLoading ? 'Loading Mint...' : 'Burn Liquidity'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                            <div className='border bg-[#0c0e11]  border-neutral-600 rounded-2xl sm:p-6 mt-6 shadow-[#000000] hover:shadow-2xl duration-300 ease-in-out'>
                                <div className="flex items-center justify-center gap-2 ">
                                    {/* <div className="space-y-4  mt-20">
                                <div className="relative mt-1 rounded-md shadow-sm"> */}

                                    <InputField
                                        label='Pool ID'
                                        id="poolID"
                                        type="text"
                                        value={poolID}
                                        onChange={handlePoolIDChange}
                                        placeholder="Enter Pool ID..."
                                        required={true}
                                    />


                                    <div className='w-2/3'>
                                        <InputField
                                            label='Priotiy Fee(Sol)'
                                            id="microLamports"
                                            type="text"
                                            value={microLamportsInput}
                                            onChange={handleMicroLamportsInputChange}
                                            placeholder="Enter 0.001 etc..."
                                            required={true}
                                        />
                                    </div>

                                </div>
                                <button
                                    onClick={handleRemoveLiquidity}
                                    disabled={isLoading}
                                    className="invoke-btn w-full font-bold py-2 px-4 rounded-lg ml-2"
                                >
                                    <span className='btn-text-gradient'>  {isLoading ? 'Loading Pool...' : 'Remove Liquidity'}</span>
                                </button>
                            </div>
                            <br />

                        </div>
                        <div>
                            <h1 className=' bg-gradient-to-r from-[#e2c95b] to-[#03ff03] bg-clip-text text-left text-xl font-semibold text-transparent'>
                                Pool Data Logger:
                            </h1>
                            <div className='bg-[#1a232e] border border-neutral-400 shadow rounded-2xl sm:p-6 align-baseline mt-2'>
                                {targetPoolInfo && (
                                    <div className="mt-4 text-white">
                                        <h2>Fetched Keys:</h2>
                                        <pre>{JSON.stringify(targetPoolInfo, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </form>
        </div>
    );
}


RaydiumLiquidityRemover.getLayout = (page: ReactNode) => getHeaderLayout(page, "Liquidity Manager");

export default RaydiumLiquidityRemover;