import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Minting Lab',
    description: 'Tools for creating, launching, and managing Solana tokens, NFTs, and minting projects with advanced features and bundling capabilities.',
    keywords: 'Solana, Token Creation, NFT, Minting, Token Launch, Bundle, SPL Token',
    openGraph: {
        title: 'Minting Lab - Bundler.Space',
        description: 'Tools for creating, launching, and managing Solana tokens, NFTs, and minting projects with advanced features and bundling capabilities.',
        url: 'https://bundler.space/minting-lab',
        images: [
            {
                url: '/og-minting-lab.jpg',
                width: 1200,
                height: 630,
                alt: 'Minting Lab on Bundler.Space',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Minting Lab - Bundler.Space',
        description: 'Tools for creating, launching, and managing Solana tokens, NFTs, and minting projects with advanced features and bundling capabilities.',
        images: ['/og-minting-lab.jpg'],
    },
};

export default function MintingLabLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
} 