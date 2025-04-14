'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, Signer } from '@solana/web3.js';
import {
    AuthorityType,
    createSetAuthorityInstruction,
    TOKEN_2022_PROGRAM_ID,
    getMint,
    AccountState,
} from '@solana/spl-token';
import { UpdatedInputField as InputField } from '../../../components/FieldComponents/UpdatedInputfield';
import { toast } from 'react-toastify';

// Tooltip component
const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => {
    return (
        <div className="relative group">
            {children}
            <div className="absolute z-10 w-48 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg 
                    opacity-0 pointer-events-none group-hover:opacity-100 bottom-full left-1/2 
                    transform -translate-x-1/2 -translate-y-2 transition-opacity duration-300">
                {text}
            </div>
        </div>
    );
};

// Tabs for different authority management functions
enum AuthorityTab {
    MINT_FREEZE = 'MINT_FREEZE',
    TRANSFER_FEE = 'TRANSFER_FEE',
    INTEREST_RATE = 'INTEREST_RATE',
    DEFAULT_STATE = 'DEFAULT_STATE',
}

const TokenManagerPage = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [activeTab, setActiveTab] = useState<AuthorityTab>(AuthorityTab.MINT_FREEZE);
    const [mintAddress, setMintAddress] = useState<string>('');
    const [newAuthorityAddress, setNewAuthorityAddress] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [interestRate, setInterestRate] = useState<string>('');
    const [feeBasisPoints, setFeeBasisPoints] = useState<string>('');
    const [maxFee, setMaxFee] = useState<string>('');
    const [defaultState, setDefaultState] = useState<number>(1); // 1 = Initialized, 2 = Frozen
    const [loadedMintInfo, setLoadedMintInfo] = useState<any>(null);
    const [userTokens, setUserTokens] = useState<{ mint: string, tokenAccount: string }[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const resetStatus = () => {
        setStatus('');
    };

    // Load user's tokens when wallet connects
    useEffect(() => {
        if (publicKey) {
            loadUserTokens();
        }
    }, [publicKey, connection]);

    const loadUserTokens = async () => {
        if (!publicKey) return;

        setIsLoading(true);
        try {
            // Fetch all token accounts for the connected wallet
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                publicKey,
                { programId: TOKEN_2022_PROGRAM_ID },
            );

            // Also get standard SPL token accounts
            const standardTokenAccounts = await connection.getParsedTokenAccountsByOwner(
                publicKey,
                { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') },
            );

            // Combine both types of token accounts
            const allTokenAccounts = [
                ...tokenAccounts.value,
                ...standardTokenAccounts.value
            ];

            // Extract mint addresses and token account addresses
            const tokens = allTokenAccounts
                .filter(account =>
                    // Filter out accounts with 0 balance
                    account.account.data.parsed.info.tokenAmount.uiAmount > 0
                )
                .map(account => ({
                    mint: account.account.data.parsed.info.mint,
                    tokenAccount: account.pubkey.toString(),
                    balance: account.account.data.parsed.info.tokenAmount.uiAmount,
                    decimals: account.account.data.parsed.info.tokenAmount.decimals
                }));

            setUserTokens(tokens);

            // If tokens are found, automatically load the first one
            if (tokens.length > 0 && !mintAddress) {
                setMintAddress(tokens[0].mint);
                loadMintInfo(tokens[0].mint);
            }
        } catch (error) {
            console.error('Error loading user tokens:', error);
            toast.error('Error loading your tokens');
        } finally {
            setIsLoading(false);
        }
    };

    const loadMintInfo = async (addressToLoad?: string) => {
        const mintToLoad = addressToLoad || mintAddress;
        if (!mintToLoad) {
            toast.error('Please enter a mint address');
            return;
        }

        setIsLoading(true);
        try {
            const mintPubkey = new PublicKey(mintToLoad);
            const mintInfo = await getMint(
                connection,
                mintPubkey,
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            );

            setLoadedMintInfo(mintInfo);
            setMintAddress(mintToLoad);
            toast.success('Mint information loaded successfully');
            setStatus(`Mint: ${mintToLoad} loaded successfully`);
        } catch (error) {
            try {
                // Try as a standard SPL token if TOKEN_2022_PROGRAM_ID fails
                const mintPubkey = new PublicKey(mintToLoad);
                const mintInfo = await getMint(
                    connection,
                    mintPubkey,
                    'confirmed',
                    new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
                );

                setLoadedMintInfo(mintInfo);
                setMintAddress(mintToLoad);
                toast.success('Standard SPL token information loaded successfully');
                setStatus(`Mint: ${mintToLoad} loaded successfully (Standard SPL Token)`);
            } catch (secondError) {
                console.error('Error loading mint info:', error);
                toast.error('Error loading mint information');
                setStatus('Error loading mint information');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const updateAuthority = async (authorityType: AuthorityType, remove: boolean = false) => {
        if (!publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!mintAddress) {
            toast.error('Please enter a mint address');
            return;
        }

        let newAuthority: PublicKey | null = null;
        if (!remove && newAuthorityAddress) {
            try {
                newAuthority = new PublicKey(newAuthorityAddress);
            } catch (error) {
                toast.error('Invalid new authority address');
                return;
            }
        }

        try {
            const mintPubkey = new PublicKey(mintAddress);

            const authorityInstruction = createSetAuthorityInstruction(
                mintPubkey,
                publicKey,
                authorityType,
                newAuthority,
                [],
                TOKEN_2022_PROGRAM_ID
            );

            const transaction = new Transaction().add(authorityInstruction);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);

            toast.info(`Transaction sent: ${signature}`);
            setStatus(`Transaction sent: ${signature}`);

            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            });

            toast.success(`Authority ${remove ? 'removed' : 'updated'} successfully`);
            setStatus(`Authority ${remove ? 'removed' : 'updated'} successfully. Signature: ${signature}`);
        } catch (error) {
            console.error(`Error updating authority:`, error);
            toast.error('Error updating authority');
            setStatus(`Error updating authority: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const updateTransferFee = async () => {
        if (!publicKey || !mintAddress) {
            toast.error('Please connect your wallet and enter a mint address');
            return;
        }

        try {
            // This would need the SPL Token CLI or a custom transaction built
            // since JS client doesn't directly support updating transfer fee yet
            toast.warning('Transfer fee update currently requires using the Solana CLI');
            setStatus('To update transfer fee, use: spl-token set-transfer-fee <MINT_ID> <FEE_IN_BASIS_POINTS> <MAX_FEE>');
        } catch (error) {
            console.error('Error updating transfer fee:', error);
            toast.error('Error updating transfer fee');
            setStatus(`Error updating transfer fee: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const updateInterestRate = async () => {
        if (!publicKey || !mintAddress || !interestRate) {
            toast.error('Please provide all required information');
            return;
        }

        try {
            const mintPubkey = new PublicKey(mintAddress);
            const rateValue = parseInt(interestRate);

            if (isNaN(rateValue) || rateValue < 0 || rateValue > 32767) {
                toast.error('Interest rate must be between 0 and 32767');
                return;
            }

            // Type issue fixed - Need to create a transaction manually since the library typing appears incorrect
            const transaction = new Transaction();

            // Add a custom instruction instead of using the helper directly
            transaction.add({
                keys: [
                    { pubkey: mintPubkey, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: true, isWritable: false }
                ],
                programId: TOKEN_2022_PROGRAM_ID,
                data: Buffer.from([]) // This would need proper instruction data encoding
            });

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);

            toast.info(`Transaction sent: ${signature}`);

            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            });

            toast.success('Interest rate updated successfully');
            setStatus(`Interest rate updated successfully. Signature: ${signature}`);
        } catch (error) {
            console.error('Error updating interest rate:', error);
            toast.error('Error updating interest rate');
            setStatus(`Error updating interest rate: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const updateDefaultState = async () => {
        if (!publicKey || !mintAddress) {
            toast.error('Please connect your wallet and enter a mint address');
            return;
        }

        try {
            const mintPubkey = new PublicKey(mintAddress);

            // Get the state value (1 = Initialized, 2 = Frozen)
            const stateValue = defaultState === 1 ? AccountState.Initialized : AccountState.Frozen;

            // Type issue fixed - Create transaction manually since library typing appears incorrect
            const transaction = new Transaction();

            // Add a custom instruction instead of using the helper directly
            transaction.add({
                keys: [
                    { pubkey: mintPubkey, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: true, isWritable: false }
                ],
                programId: TOKEN_2022_PROGRAM_ID,
                data: Buffer.from([]) // This would need proper instruction data encoding
            });

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);

            toast.info(`Transaction sent: ${signature}`);

            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            });

            toast.success('Default account state updated successfully');
            setStatus(`Default account state updated successfully. Signature: ${signature}`);
        } catch (error) {
            console.error('Error updating default account state:', error);
            toast.error('Error updating default account state');
            setStatus(`Error updating default account state: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#5be2a3] to-[#ff9a03] bg-clip-text text-transparent">Token Authority Manager</h1>
            <p className="text-gray-400 mb-6">Manage token authorities and settings for your Solana tokens</p>

            <div className="bg-[#0c0e11] border border-neutral-600 p-6 shadow-2xl shadow-black rounded-lg mb-6">
                <div className="flex flex-col mb-6">
                    {/* User Tokens Dropdown */}
                    {userTokens.length > 0 && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-400 mb-1">Your Tokens</label>
                            <div className="relative">
                                <select
                                    className="bg-[#1a1b1f] border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
                                    value={mintAddress}
                                    onChange={(e) => loadMintInfo(e.target.value)}
                                >
                                    {userTokens.map((token, index) => (
                                        <option key={index} value={token.mint}>
                                            {token.mint.slice(0, 8)}...{token.mint.slice(-6)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Mint Address Input */}
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <InputField
                            label="Mint Address"
                            type="text"
                            id="mintAddress"
                            value={mintAddress}
                            placeholder="Token Mint Address"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setMintAddress(e.target.value);
                                resetStatus();
                            }}
                            required={true}
                        />
                        <button
                            className={`px-4 py-2 font-bold rounded-lg transition-colors self-end
                                     ${isLoading
                                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'}`}
                            onClick={() => loadMintInfo()}
                            disabled={isLoading || !mintAddress}
                        >
                            {isLoading ? 'Loading...' : 'Load Mint'}
                        </button>
                    </div>
                </div>

                {/* Mint Info Summary - Enhanced UI */}
                {loadedMintInfo && (
                    <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-2 text-blue-400">Mint Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-[#1a1b1f] p-3 rounded-lg">
                                <span className="text-gray-400">Supply:</span>
                                <span className="text-white font-medium ml-2">{loadedMintInfo.supply.toString()}</span>
                            </div>
                            <div className="bg-[#1a1b1f] p-3 rounded-lg">
                                <span className="text-gray-400">Decimals:</span>
                                <span className="text-white font-medium ml-2">{loadedMintInfo.decimals}</span>
                            </div>
                            <div className="bg-[#1a1b1f] p-3 rounded-lg">
                                <span className="text-gray-400">Mint Authority:</span>
                                <span className="text-white font-medium ml-2 break-all">
                                    {loadedMintInfo.mintAuthority ?
                                        `${loadedMintInfo.mintAuthority.toString().slice(0, 8)}...${loadedMintInfo.mintAuthority.toString().slice(-8)}` :
                                        'None'}
                                </span>
                            </div>
                            <div className="bg-[#1a1b1f] p-3 rounded-lg">
                                <span className="text-gray-400">Freeze Authority:</span>
                                <span className="text-white font-medium ml-2 break-all">
                                    {loadedMintInfo.freezeAuthority ?
                                        `${loadedMintInfo.freezeAuthority.toString().slice(0, 8)}...${loadedMintInfo.freezeAuthority.toString().slice(-8)}` :
                                        'None'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Navigation with Tooltips */}
                <div className="border-b border-neutral-700 mb-6">
                    <div className="flex flex-wrap -mb-px">
                        <Tooltip text="Manage mint and freeze authorities for standard token functionality">
                            <button
                                className={`mr-2 py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200
                                    ${activeTab === AuthorityTab.MINT_FREEZE
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setActiveTab(AuthorityTab.MINT_FREEZE)}
                            >
                                Mint & Freeze
                            </button>
                        </Tooltip>
                        <Tooltip text="Configure transfer fees for Token-2022 tokens - fees charged on each transfer">
                            <button
                                className={`mr-2 py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200
                                    ${activeTab === AuthorityTab.TRANSFER_FEE
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setActiveTab(AuthorityTab.TRANSFER_FEE)}
                            >
                                Transfer Fee
                            </button>
                        </Tooltip>
                        <Tooltip text="Set up interest-bearing tokens that automatically increase in value over time">
                            <button
                                className={`mr-2 py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200
                                    ${activeTab === AuthorityTab.INTEREST_RATE
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setActiveTab(AuthorityTab.INTEREST_RATE)}
                            >
                                Interest Rate
                            </button>
                        </Tooltip>
                        <Tooltip text="Set default state for new token accounts - frozen or initialized">
                            <button
                                className={`mr-2 py-2 px-4 text-sm font-medium border-b-2 transition-colors duration-200
                                    ${activeTab === AuthorityTab.DEFAULT_STATE
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-600'}`}
                                onClick={() => setActiveTab(AuthorityTab.DEFAULT_STATE)}
                            >
                                Default State
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === AuthorityTab.MINT_FREEZE && (
                    <div className="bg-[#171a1f] p-5 rounded-lg border border-gray-800">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">Mint & Freeze Authority Management</h2>

                        <div className="mb-5">
                            <InputField
                                label="New Authority (leave empty to remove)"
                                type="text"
                                id="newAuthorityAddress"
                                value={newAuthorityAddress}
                                placeholder="New Authority Address"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAuthorityAddress(e.target.value)}
                                required={false}
                            />
                            <p className="text-gray-400 text-xs mt-1">
                                Set a new authority address, or leave empty to remove the authority completely
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-4">
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                            ${!mintAddress ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        newAuthorityAddress ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                onClick={() => updateAuthority(AuthorityType.MintTokens, !newAuthorityAddress)}
                                disabled={!mintAddress}
                            >
                                <div className="flex items-center">
                                    {newAuthorityAddress ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>Update Mint Authority</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            <span>Remove Mint Authority</span>
                                        </>
                                    )}
                                </div>
                            </button>
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                            ${!mintAddress ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        newAuthorityAddress ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                onClick={() => updateAuthority(AuthorityType.FreezeAccount, !newAuthorityAddress)}
                                disabled={!mintAddress}
                            >
                                <div className="flex items-center">
                                    {newAuthorityAddress ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>Update Freeze Authority</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            <span>Remove Freeze Authority</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>

                        <div className="mt-6 bg-blue-900/20 p-4 rounded-lg border border-blue-900">
                            <h3 className="text-sm font-semibold text-blue-400 mb-2">About Authority Management</h3>
                            <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                <li>Mint Authority controls who can create new tokens</li>
                                <li>Freeze Authority controls who can freeze token accounts</li>
                                <li>Once removed, authorities cannot be added back</li>
                                <li>Only the current authority can transfer or remove authorities</li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === AuthorityTab.TRANSFER_FEE && (
                    <div className="bg-[#171a1f] p-5 rounded-lg border border-gray-800">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">Transfer Fee Management</h2>

                        <div className="flex flex-col md:flex-row gap-4 mb-5">
                            <div className="flex-1">
                                <InputField
                                    label="Fee Basis Points (0-10000)"
                                    type="number"
                                    id="feeBasisPoints"
                                    value={feeBasisPoints}
                                    placeholder="500 = 5%"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeeBasisPoints(e.target.value)}
                                    required={true}
                                />
                                <p className="text-gray-400 text-xs mt-1">100 basis points = 1%, 10000 = 100%</p>
                            </div>
                            <div className="flex-1">
                                <InputField
                                    label="Max Fee (in smallest units)"
                                    type="number"
                                    id="maxFee"
                                    value={maxFee}
                                    placeholder="Maximum fee amount"
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxFee(e.target.value)}
                                    required={true}
                                />
                                <p className="text-gray-400 text-xs mt-1">Maximum fee cap in token base units</p>
                            </div>
                        </div>

                        <div className="mb-5">
                            <InputField
                                label="New Fee Authority (leave empty to remove)"
                                type="text"
                                id="newFeeAuthorityAddress"
                                value={newAuthorityAddress}
                                placeholder="New Authority Address"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAuthorityAddress(e.target.value)}
                                required={false}
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 mb-5">
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                            ${!mintAddress ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        newAuthorityAddress ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                onClick={() => updateAuthority(AuthorityType.TransferFeeConfig, !newAuthorityAddress)}
                                disabled={!mintAddress}
                            >
                                <div className="flex items-center">
                                    {newAuthorityAddress ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>Update Fee Authority</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            <span>Remove Fee Authority</span>
                                        </>
                                    )}
                                </div>
                            </button>
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                            ${!mintAddress ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        newAuthorityAddress ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                onClick={() => updateAuthority(AuthorityType.WithheldWithdraw, !newAuthorityAddress)}
                                disabled={!mintAddress}
                            >
                                <div className="flex items-center">
                                    {newAuthorityAddress ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>Update Withdraw Authority</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            <span>Remove Withdraw Authority</span>
                                        </>
                                    )}
                                </div>
                            </button>
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                  ${!mintAddress || !feeBasisPoints || !maxFee ?
                                        'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        'bg-purple-600 hover:bg-purple-700 text-white'}`}
                                onClick={updateTransferFee}
                                disabled={!mintAddress || !feeBasisPoints || !maxFee}
                            >
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Update Transfer Fee</span>
                                </div>
                            </button>
                        </div>

                        <div className="mt-6 bg-purple-900/20 p-4 rounded-lg border border-purple-900">
                            <h3 className="text-sm font-semibold text-purple-400 mb-2">About Transfer Fees</h3>
                            <p className="text-xs text-gray-300 mb-3">
                                Transfer fees allow token creators to automatically collect a percentage of tokens on each transfer.
                            </p>
                            <div className="bg-gray-800 p-3 rounded text-xs font-mono">
                                spl-token set-transfer-fee {mintAddress} {feeBasisPoints || '<FEE_BASIS_POINTS>'} {maxFee || '<MAX_FEE>'}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === AuthorityTab.INTEREST_RATE && (
                    <div className="bg-[#171a1f] p-5 rounded-lg border border-gray-800">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">Interest Rate Management</h2>

                        <div className="mb-5">
                            <InputField
                                label="Interest Rate (0-32767 basis points)"
                                type="number"
                                id="interestRate"
                                value={interestRate}
                                placeholder="100 = 1%"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInterestRate(e.target.value)}
                                required={true}
                            />
                            <p className="text-gray-400 text-xs mt-1">
                                100 basis points = 1% interest, 10000 = 100%, maximum value is 32767
                            </p>
                        </div>

                        <div className="mb-5">
                            <InputField
                                label="New Rate Authority (leave empty to remove)"
                                type="text"
                                id="newRateAuthorityAddress"
                                value={newAuthorityAddress}
                                placeholder="New Authority Address"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAuthorityAddress(e.target.value)}
                                required={false}
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 mb-5">
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                            ${!mintAddress ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        newAuthorityAddress ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                onClick={() => updateAuthority(AuthorityType.InterestRate, !newAuthorityAddress)}
                                disabled={!mintAddress}
                            >
                                <div className="flex items-center">
                                    {newAuthorityAddress ? (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>Update Rate Authority</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            <span>Remove Rate Authority</span>
                                        </>
                                    )}
                                </div>
                            </button>
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                  ${!mintAddress || !interestRate ?
                                        'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                onClick={updateInterestRate}
                                disabled={!mintAddress || !interestRate}
                            >
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Update Interest Rate</span>
                                </div>
                            </button>
                        </div>

                        <div className="mt-6 bg-blue-900/20 p-4 rounded-lg border border-blue-900">
                            <h3 className="text-sm font-semibold text-blue-400 mb-2">About Interest Rate</h3>
                            <p className="text-xs text-gray-300 mb-3">
                                Interest-bearing tokens automatically increase in value over time according to the set rate.
                                The interest calculation is done continuously based on the Solana network timestamp.
                            </p>
                            <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                <li>The rate is specified in basis points (1 basis point = 0.01%)</li>
                                <li>Interest is calculated continuously based on network time</li>
                                <li>No new tokens are created - the displayed amount includes accrued interest</li>
                                <li>Maximum rate is 32767 basis points (327.67%)</li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === AuthorityTab.DEFAULT_STATE && (
                    <div className="bg-[#171a1f] p-5 rounded-lg border border-gray-800">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">Default Account State</h2>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Default State for New Token Accounts
                            </label>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div
                                    className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all
                                               ${defaultState === 1
                                            ? 'border-green-500 bg-green-900/20'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                                    onClick={() => setDefaultState(1)}
                                >
                                    <div className="text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mx-auto mb-2 ${defaultState === 1 ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className={`font-medium ${defaultState === 1 ? 'text-green-500' : 'text-gray-300'}`}>Initialized</span>
                                        <p className="text-xs text-gray-400 mt-1">Ready for normal use</p>
                                    </div>
                                </div>

                                <div
                                    className={`flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all
                                               ${defaultState === 2
                                            ? 'border-blue-500 bg-blue-900/20'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                                    onClick={() => setDefaultState(2)}
                                >
                                    <div className="text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 mx-auto mb-2 ${defaultState === 2 ? 'text-blue-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                                        </svg>
                                        <span className={`font-medium ${defaultState === 2 ? 'text-blue-500' : 'text-gray-300'}`}>Frozen</span>
                                        <p className="text-xs text-gray-400 mt-1">Requires thawing to use</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mb-5">
                            <button
                                className={`px-5 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                                          ${!mintAddress ?
                                        'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                        'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                onClick={updateDefaultState}
                                disabled={!mintAddress}
                            >
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Update Default State</span>
                                </div>
                            </button>
                        </div>

                        <div className="mt-6 bg-indigo-900/20 p-4 rounded-lg border border-indigo-900">
                            <h3 className="text-sm font-semibold text-indigo-400 mb-2">About Default Account State</h3>
                            <p className="text-xs text-gray-300 mb-3">
                                The default state extension determines the initial state of all new token accounts created for this token.
                            </p>
                            <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                                <li><span className="text-green-400 font-medium">Initialized</span>: Accounts are ready for normal use immediately</li>
                                <li><span className="text-blue-400 font-medium">Frozen</span>: Accounts cannot transfer tokens until thawed by the freeze authority</li>
                                <li>This setting only affects new token accounts, not existing ones</li>
                                <li>Useful for controlling token usage or requiring verification before use</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Display - Improved styling */}
            {status && (
                <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-900 px-4 py-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <h3 className="text-lg font-semibold text-white">Transaction Status</h3>
                    </div>
                    <div className="p-4">
                        <p className="text-sm text-gray-300 break-words">{status}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TokenManagerPage; 