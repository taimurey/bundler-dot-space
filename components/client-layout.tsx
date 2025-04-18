'use client';

import React from 'react';
import { WalletProfileContextProvider } from "@/components/SolanaWallet/wallet-context";
import { SolanaProvider } from "@/components/SolanaWallet/SolanaContext";
import { Toaster } from "sonner";
import { HeaderLayout } from "@/components/header-layout";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/context/auth-provider";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <AuthProvider>
            <WalletProfileContextProvider>
                <SolanaProvider>
                    <div className="flex flex-col h-screen">
                        <HeaderLayout>
                            {children}
                            <Toaster position="top-center" closeButton richColors theme="dark" />
                        </HeaderLayout>
                    </div>
                </SolanaProvider>
            </WalletProfileContextProvider>
        </AuthProvider>
    );
} 