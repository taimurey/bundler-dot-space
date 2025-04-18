import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Solana Utilities',
    description: 'Essential utilities for Solana developers and traders, including token distribution, wallet management, and transaction bundling tools.',
    keywords: 'Solana, Utilities, Token Distribution, Wallet Management, Bundler, Developer Tools',
    openGraph: {
        title: 'Solana Utilities - Bundler.Space',
        description: 'Essential utilities for Solana developers and traders, including token distribution, wallet management, and transaction bundling tools.',
        url: 'https://bundler.space/utilities',
        images: [
            {
                url: '/og-utilities.jpg',
                width: 1200,
                height: 630,
                alt: 'Solana Utilities on Bundler.Space',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Solana Utilities - Bundler.Space',
        description: 'Essential utilities for Solana developers and traders, including token distribution, wallet management, and transaction bundling tools.',
        images: ['/og-utilities.jpg'],
    },
};

export default function UtilitiesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 