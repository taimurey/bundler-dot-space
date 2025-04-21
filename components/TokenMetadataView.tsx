'use client';

import React from 'react';
import Image from 'next/image';
import { FaDiscord, FaTelegram, FaTwitter, FaGlobe, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import Link from 'next/link';

// Interface for token metadata 
export interface TokenMetadata {
    name: string;
    symbol: string;
    image: string;
    description?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    creator?: {
        name: string;
        site: string;
    };
}

// Interface for token extensions data
export interface TokenExtensions {
    transferFeeEnabled?: boolean;
    transferFeeBasisPoints?: number;
    maxTransferFee?: string;
    memoTransferEnabled?: boolean;
    metadataPointerEnabled?: boolean;
    permanentDelegateEnabled?: boolean;
    permanentDelegateAddress?: string;
    interestBearingEnabled?: boolean;
    interestRate?: number;
    defaultAccountStateEnabled?: boolean;
    defaultAccountState?: string;
}

interface TokenMetadataViewProps {
    tokenMetadata: TokenMetadata;
    tokenMintAddress: string;
    network: string;
    isToken2022?: boolean;
    tokenExtensions?: TokenExtensions;
    onBack?: () => void;
}

const TokenMetadataView: React.FC<TokenMetadataViewProps> = ({
    tokenMetadata,
    tokenMintAddress,
    network,
    isToken2022 = false,
    tokenExtensions,
    onBack
}) => {
    const explorerBase = 'https://solscan.io/token';
    const explorerUrl = `${explorerBase}/${tokenMintAddress}${network !== 'mainnet-beta' ? `?cluster=${network}` : ''}`;

    const displayNetwork = network === 'mainnet-beta'
        ? 'Mainnet'
        : network === 'custom'
            ? 'Custom RPC'
            : network.charAt(0).toUpperCase() + network.slice(1);

    return (
        <div className="p-6 bg-[#0f1217] rounded-lg border border-[#2a2e39] shadow-lg max-w-3xl w-full mx-auto">
            {onBack && (
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <FaArrowLeft className="w-3.5 h-3.5" />
                    <span className="text-sm">Back to form</span>
                </button>
            )}

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    Token Created Successfully!
                    <FaCheckCircle className="text-green-500 w-5 h-5" />
                </h2>
                <div className="text-xs font-medium px-2 py-1 rounded bg-gradient-to-r from-purple-600 to-blue-500 text-white">
                    {isToken2022 ? 'Token-2022' : 'Token'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <div className="flex flex-col items-center bg-[#1a1e27] rounded-lg p-4 shadow-md">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#2a2e39] mb-4 border-2 border-[#3a3f4c]">
                            {tokenMetadata.image && (
                                <Image
                                    src={tokenMetadata.image}
                                    alt={tokenMetadata.name}
                                    fill
                                    unoptimized={!tokenMetadata.image.startsWith('https://ipfs.io')}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                    className="object-cover"
                                />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">
                                {tokenMetadata.symbol ? tokenMetadata.symbol.charAt(0).toUpperCase() : '?'}
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-white text-center">{tokenMetadata.name}</h3>
                        <p className="text-sm text-gray-400 text-center">{tokenMetadata.symbol}</p>

                        {/* Social Links */}
                        {(tokenMetadata.website || tokenMetadata.twitter || tokenMetadata.telegram || tokenMetadata.discord) && (
                            <div className="mt-4 w-full">
                                <div className="flex justify-center gap-4">
                                    {tokenMetadata.website && (
                                        <Link
                                            href={tokenMetadata.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-white transition-colors"
                                        >
                                            <FaGlobe className="w-5 h-5" />
                                        </Link>
                                    )}
                                    {tokenMetadata.twitter && (
                                        <Link
                                            href={tokenMetadata.twitter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-white transition-colors"
                                        >
                                            <FaTwitter className="w-5 h-5" />
                                        </Link>
                                    )}
                                    {tokenMetadata.telegram && (
                                        <Link
                                            href={tokenMetadata.telegram}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-white transition-colors"
                                        >
                                            <FaTelegram className="w-5 h-5" />
                                        </Link>
                                    )}
                                    {tokenMetadata.discord && (
                                        <Link
                                            href={tokenMetadata.discord}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-white transition-colors"
                                        >
                                            <FaDiscord className="w-5 h-5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-[#1a1e27] rounded-lg p-4 shadow-md mb-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Token Address</h4>
                        <div className="flex items-center gap-2">
                            <code className="text-xs bg-[#2a2e39] rounded px-2 py-1.5 text-white flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
                                {tokenMintAddress}
                            </code>
                            <Link
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded whitespace-nowrap transition-colors"
                            >
                                View on Solscan
                            </Link>
                        </div>
                    </div>

                    {tokenMetadata.description && (
                        <div className="bg-[#1a1e27] rounded-lg p-4 shadow-md mb-4">
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                            <p className="text-sm text-white">{tokenMetadata.description}</p>
                        </div>
                    )}

                    <div className="bg-[#1a1e27] rounded-lg p-4 shadow-md mb-4">
                        <h4 className="text-sm font-medium text-gray-400 mb-1">Network</h4>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                            <p className="text-sm text-white">{displayNetwork}</p>
                        </div>
                    </div>

                    {isToken2022 && tokenExtensions && (
                        <div className="bg-[#1a1e27] rounded-lg p-4 shadow-md">
                            <h4 className="text-sm font-medium text-white mb-3">Token-2022 Extensions</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {tokenExtensions.transferFeeEnabled && (
                                    <div className="bg-[#2a2e39] p-3 rounded">
                                        <h5 className="text-xs font-medium text-blue-400 mb-1">Transfer Fee</h5>
                                        <p className="text-xs text-white">
                                            {(tokenExtensions.transferFeeBasisPoints! / 100).toFixed(2)}% fee
                                            {tokenExtensions.maxTransferFee && ` (Max: ${tokenExtensions.maxTransferFee})`}
                                        </p>
                                    </div>
                                )}

                                {tokenExtensions.memoTransferEnabled && (
                                    <div className="bg-[#2a2e39] p-3 rounded">
                                        <h5 className="text-xs font-medium text-blue-400">Required Memo Transfer</h5>
                                        <p className="text-xs text-white">Enabled</p>
                                    </div>
                                )}

                                {tokenExtensions.metadataPointerEnabled && (
                                    <div className="bg-[#2a2e39] p-3 rounded">
                                        <h5 className="text-xs font-medium text-blue-400">Metadata Pointer</h5>
                                        <p className="text-xs text-white">Enabled</p>
                                    </div>
                                )}

                                {tokenExtensions.permanentDelegateEnabled && (
                                    <div className="bg-[#2a2e39] p-3 rounded">
                                        <h5 className="text-xs font-medium text-blue-400">Permanent Delegate</h5>
                                        <p className="text-xs text-white truncate">
                                            {tokenExtensions.permanentDelegateAddress || "Owner's wallet"}
                                        </p>
                                    </div>
                                )}

                                {tokenExtensions.interestBearingEnabled && (
                                    <div className="bg-[#2a2e39] p-3 rounded">
                                        <h5 className="text-xs font-medium text-blue-400">Interest Bearing</h5>
                                        <p className="text-xs text-white">
                                            {(tokenExtensions.interestRate! / 100).toFixed(2)}% rate
                                        </p>
                                    </div>
                                )}

                                {tokenExtensions.defaultAccountStateEnabled && (
                                    <div className="bg-[#2a2e39] p-3 rounded">
                                        <h5 className="text-xs font-medium text-blue-400">Default Account State</h5>
                                        <p className="text-xs text-white capitalize">
                                            {tokenExtensions.defaultAccountState}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TokenMetadataView; 