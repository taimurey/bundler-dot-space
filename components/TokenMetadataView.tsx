'use client';

import React from 'react';
import Image from 'next/image';
import { FaDiscord, FaTelegram, FaTwitter, FaGlobe } from 'react-icons/fa';
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

interface TokenMetadataViewProps {
    tokenMetadata: TokenMetadata;
    tokenMintAddress: string;
    network: string;
    isToken2022?: boolean;
}

const TokenMetadataView: React.FC<TokenMetadataViewProps> = ({
    tokenMetadata,
    tokenMintAddress,
    network,
    isToken2022 = false
}) => {
    const explorerBase = network === 'devnet'
        ? 'https://explorer.solana.com/address'
        : 'https://solscan.io/account';

    const explorerUrl = `${explorerBase}/${tokenMintAddress}?cluster=${network === 'mainnet-beta' ? '' : network}`;

    const displayNetwork = network === 'mainnet-beta'
        ? 'Mainnet'
        : network === 'custom'
            ? 'Custom RPC'
            : network.charAt(0).toUpperCase() + network.slice(1);

    return (
        <div className="p-6 bg-[#0f1217] rounded-lg border border-[#2a2e39] shadow-lg max-w-lg w-full mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Token Created Successfully!</h2>
                <div className="text-xs font-medium px-2 py-1 rounded bg-[#2a2e39] text-emerald-400">
                    {isToken2022 ? 'Token-2022' : 'Token'}
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#2a2e39]">
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
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
                        {tokenMetadata.symbol ? tokenMetadata.symbol.charAt(0).toUpperCase() : '?'}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-white">{tokenMetadata.name}</h3>
                    <p className="text-sm text-gray-400">{tokenMetadata.symbol}</p>
                </div>
            </div>

            {tokenMetadata.description && (
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
                    <p className="text-sm text-white">{tokenMetadata.description}</p>
                </div>
            )}

            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Token Address</h4>
                <div className="flex items-center gap-2">
                    <code className="text-xs bg-[#2a2e39] rounded px-2 py-1 text-white flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
                        {tokenMintAddress}
                    </code>
                    <Link
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                    >
                        View on Explorer
                    </Link>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Network</h4>
                <p className="text-sm text-white">{displayNetwork}</p>
            </div>

            {/* Social Links */}
            {(tokenMetadata.website || tokenMetadata.twitter || tokenMetadata.telegram || tokenMetadata.discord) && (
                <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Links</h4>
                    <div className="flex gap-3">
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
    );
};

export default TokenMetadataView; 