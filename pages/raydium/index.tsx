'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useCallback } from 'react';
import { ReactNode } from 'react';
import { getHeaderLayout } from '../../components/layouts/HeaderLayout';
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
import { Connection } from '@solana/web3.js';
import { formatAmmKeysById } from '../../components/removeLiquidity/formatAmmKeysById';
import { getWalletTokenAccount } from '../../components/removeLiquidity/util';
import { addLookupTableInfo, makeTxVersion } from '../../components/removeLiquidity/config';
import { buildSimpleTransaction } from '@raydium-io/raydium-sdk';
import { toast } from "react-toastify";





const RaydiumLiquidityRemover = () => {
    const { connection } = useConnection();
    const [poolID, setPoolID] = useState("");
    const [microLamportsInput, setMicroLamportsInput] = useState("");
    // const [privateKey, setPrivateKey] = useState("");
    const { publicKey, sendTransaction, wallet, connected } = useWallet();
    const [targetPoolInfo, setTargetPoolInfo] = useState<ApiPoolInfoV4 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [rpcAddress, setRpcAddress] = useState("");

    const handleMicroLamportsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMicroLamportsInput(event.target.value);
    };

    const handleRpcAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRpcAddress(event.target.value);
    };

    const rpcconnection = rpcAddress ? new Connection(rpcAddress) : new Connection('https://mainnet.helius-rpc.com/?api-key=d9e80c44-bc75-4139-8cc7-084cefe506c7');

    const checkRpcAddress = useCallback(async () => {
        if (rpcAddress === '') {
            return;
        }

        const rpcconnection = rpcAddress ? new Connection(rpcAddress) : new Connection('https://mainnet.helius-rpc.com/?api-key=d9e80c44-bc75-4139-8cc7-084cefe506c7');

        try {
            await rpcconnection.getSlot();
            toast.info('RPC Address is correct');
        } catch (error) {
            toast.error('RPC Address is incorrect');
        }
    }, [rpcAddress]);

    useEffect(() => {
        checkRpcAddress();
    }, [checkRpcAddress]);

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


    const handlePoolIDChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPoolID(event.target.value);
    };

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
        const walletTokenAccounts = await getWalletTokenAccount(rpcconnection, publicKey)


        let tokenAccounts: RpcResponseAndContext<GetProgramAccountsResponse>;
        try {
            tokenAccounts = await rpcconnection.getTokenAccountsByOwner(publicKey, {
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

            balance = await rpcconnection.getTokenAccountBalance(pubkey).then((res) => {
                console.log(res.value);
                return res.value.amount;
            });

        }

        toast.info(`LP Token Balance: ${balance}`)

        const removeLpTokenAmount = new TokenAmount(lpToken, balance)

        let removeLiquidityInstructionResponse = null;
        try {
            removeLiquidityInstructionResponse = await Liquidity.makeRemoveLiquidityInstructionSimple({
                connection: rpcconnection,
                poolKeys,
                userKeys: {
                    owner: publicKey,
                    payer: publicKey,
                    tokenAccounts: walletTokenAccounts,
                },
                amountIn: removeLpTokenAmount,
                makeTxVersion,
                computeBudgetConfig: {
                    units: 200000,
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

        const taxInstruction = SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey("D5bBVBQDNDzroQpduEJasYL5HkvARD6TcNu3yJaeVK5W"),
            lamports: 150000000,
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
            innerTransactions: removeLiquidityInstructionResponse.innerTransactions,
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
                                        <label className="block mt-5 text-base text-white" htmlFor="poolID">
                                            Pool ID
                                        </label>
                                        <div className="relative mt-1 rounded-md shadow-sm">
                                            <input
                                                id="poolID"
                                                type="text"
                                                value={poolID}
                                                onChange={handlePoolIDChange}
                                                className="block w-full p-3 rounded-md text-base text-white bg-black focus:outline-none sm:text-base"
                                                placeholder="Enter Pool ID..."
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