'use client';

import Head from 'next/head';
import { usePathname } from 'next/navigation';

export interface SeoProps {
    title?: string;
    description?: string;
    keywords?: string;
    imageUrl?: string;
    canonical?: string;
    type?: string;
    siteUrl?: string;
}

/**
 * SEO component for adding metadata to pages
 */
const Seo = ({
    title = 'Bundler.Space - The Ultimate Degen Toolkit for Solana',
    description = 'The fastest and most comprehensive Solana toolkit providing bundlers for all DEXes, wallet management without downloads, and the fastest transaction fills.',
    keywords = 'Solana, Bundler, Pump.Fun, Raydium, DEX, Crypto, Wallet Management, Token Launch, AMM',
    imageUrl = '/og-image.jpg', // Default OG image path (create this if it doesn't exist)
    canonical,
    type = 'website',
    siteUrl = 'https://bundler.space',
}: SeoProps) => {
    const pathname = usePathname();
    const url = canonical || `${siteUrl}${pathname}`;

    return (
        <Head>
            {/* Primary Meta Tags */}
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Canonical */}
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={`${siteUrl}${imageUrl}`} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={`${siteUrl}${imageUrl}`} />
        </Head>
    );
};

export default Seo; 