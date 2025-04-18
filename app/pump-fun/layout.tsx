import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pump.Fun Tools',
    description: 'Advanced tools for managing and interacting with Pump.Fun tokens, launching new projects, and executing trades with Solana bundling capabilities.',
    keywords: 'Pump.Fun, Solana, Memecoin, Token Launch, Bundle, Trading, DeFi',
    openGraph: {
        title: 'Pump.Fun Tools - Bundler.Space',
        description: 'Advanced tools for managing and interacting with Pump.Fun tokens, launching new projects, and executing trades with Solana bundling capabilities.',
        url: 'https://bundler.space/pump-fun',
        images: [
            {
                url: '/og-pumpfun.jpg',
                width: 1200,
                height: 630,
                alt: 'Pump.Fun Tools on Bundler.Space',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Pump.Fun Tools - Bundler.Space',
        description: 'Advanced tools for managing and interacting with Pump.Fun tokens, launching new projects, and executing trades with Solana bundling capabilities.',
        images: ['/og-pumpfun.jpg'],
    },
};

export default function PumpFunLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
} 