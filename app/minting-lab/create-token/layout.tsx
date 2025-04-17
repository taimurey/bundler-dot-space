import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Create SPL Token | Bundler Space',
    description: 'Create your own SPL token on Solana with Bundler Space',
};

export default function CreateTokenLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
} 