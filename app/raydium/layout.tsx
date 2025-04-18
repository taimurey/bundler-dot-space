import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Raydium Tools',
    description: 'Advanced tools for managing Raydium AMMs, removing liquidity, and executing trades with Solana bundling capabilities.',
    keywords: 'Raydium, Solana, AMM, Liquidity, DEX, Bundle, Trading, DeFi',
    openGraph: {
        title: 'Raydium Tools - Bundler.Space',
        description: 'Advanced tools for managing Raydium AMMs, removing liquidity, and executing trades with Solana bundling capabilities.',
        url: 'https://bundler.space/raydium',
        images: [
            {
                url: '/og-raydium.jpg',
                width: 1200,
                height: 630,
                alt: 'Raydium Tools on Bundler.Space',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Raydium Tools - Bundler.Space',
        description: 'Advanced tools for managing Raydium AMMs, removing liquidity, and executing trades with Solana bundling capabilities.',
        images: ['/og-raydium.jpg'],
    },
};

export default function RaydiumLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 