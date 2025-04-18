import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Raydium AMM Manager',
    description: 'Powerful tools to manage your Raydium AMM pools, remove liquidity, and execute token sells with bundling capabilities for maximum efficiency.',
    keywords: 'Raydium, AMM, Liquidity Management, Token Selling, Solana, DEX, Bundle',
    openGraph: {
        title: 'Raydium AMM Manager - Bundler.Space',
        description: 'Powerful tools to manage your Raydium AMM pools, remove liquidity, and execute token sells with bundling capabilities for maximum efficiency.',
        url: 'https://bundler.space/raydium/manage-amm',
        images: [
            {
                url: '/og-raydium-manager.jpg',
                width: 1200,
                height: 630,
                alt: 'Raydium AMM Manager on Bundler.Space',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Raydium AMM Manager - Bundler.Space',
        description: 'Powerful tools to manage your Raydium AMM pools, remove liquidity, and execute token sells with bundling capabilities for maximum efficiency.',
        images: ['/og-raydium-manager.jpg'],
    },
};

export default function ManageAmmLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 