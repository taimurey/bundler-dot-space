import { Metadata } from "next";

export const metadata: Metadata = {
    title: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
    description: 'The fastest and most comprehensive Solana toolkit providing bundlers for all DEXes, wallet management without downloads, and the fastest transaction fills.',
    keywords: 'Solana, Bundler, Pump.Fun, Raydium, DEX, Crypto, Wallet Management, Token Launch, AMM',
    openGraph: {
        title: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
        description: 'The fastest and most comprehensive Solana toolkit providing bundlers for all DEXes, wallet management without downloads, and the fastest transaction fills.',
        url: 'https://bundler.space',
        siteName: 'Bundler.Space',
        images: [
            {
                url: '/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
        description: 'The fastest and most comprehensive Solana toolkit providing bundlers for all DEXes, wallet management without downloads, and the fastest transaction fills.',
        images: ['/og-image.jpg'],
    },
}; 