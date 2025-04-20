'use client';

import React from 'react';
import { WalletProfileContextProvider } from "@/components/SolanaWallet/wallet-context";
import { SolanaProvider } from "@/components/SolanaWallet/SolanaContext";
import { Toaster } from "sonner";
import { HeaderLayout } from "@/components/header-layout";
import { AuthProvider } from "@/components/context/auth-provider";
import WalletsDrawer from '@/components/sidebar-drawer';
import BottomBar from '@/components/bottom-bar';
export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    return (
        <AuthProvider>
            <WalletProfileContextProvider>
                <SolanaProvider>
                    <div className="flex flex-col h-screen pb-8">
                        <HeaderLayout>
                            {children}
                            <Toaster position="top-center" closeButton richColors theme="dark" />
                        </HeaderLayout>
                        <WalletsDrawer />
                        <BottomBar />
                    </div>
                </SolanaProvider>
            </WalletProfileContextProvider>
        </AuthProvider>
    );
} 