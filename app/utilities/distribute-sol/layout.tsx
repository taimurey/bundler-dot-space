import { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: 'SOL Distributor - Bundler.space',
    description: 'Securely distribute SOL to multiple wallets with server-side transaction bundling.',
    keywords: 'Solana, SOL, Distribution, Wallet, Bundler, Jito, MEV',
};

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <main className="relative min-h-screen">
            {children}
        </main>
    );
} 