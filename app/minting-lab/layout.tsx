import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Minting Lab | Bundler Space',
    description: 'Create and manage tokens on Solana with Bundler Space',
};

export default function MintingLabLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
} 