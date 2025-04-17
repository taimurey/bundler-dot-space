"use client";

import { FC, ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";
import MevLabLogo from "./icons/JupiterLogo";
import Link from "next/link";
import WalletButton from "./SolanaWallet/WalletButton";
import SettingsPanel from "./SolanaWallet/SettingsPanel";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PiGearBold } from "react-icons/pi";
import { Metadata } from "next";

// Page metadata interface
export interface PageMetadata {
    title: string;
    description?: string;
    section?: string; // e.g. "Minting Lab", "Bundler Lab"
}

type HeaderLayoutProps = {
    metadata?: PageMetadata | string; // Accept string for backward compatibility
    children: ReactNode;
};

export const HeaderLayout: FC<HeaderLayoutProps> = ({ metadata, children }) => {
    const pathname = usePathname();
    const displaySidebar = pathname !== "/";

    // Handle both string and PageMetadata for backward compatibility
    let pageTitle = "Bundler Space";
    let pageDescription = "Solana tools and utilities";

    if (metadata) {
        if (typeof metadata === 'string') {
            // Legacy: if metadata is just a string title
            pageTitle = `${metadata} | Bundler Space`;
        } else {
            // New approach: metadata is a PageMetadata object
            pageTitle = metadata.title ? `${metadata.title} | Bundler Space` : "Bundler Space";
            pageDescription = metadata.description || "Solana tools and utilities";
        }
    }

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            {displaySidebar && (
                <div className="relative hidden md:block h-full">
                    <Sidebar />
                </div>
            )}

            <main className="flex-1 overflow-auto">
                {displaySidebar && (
                    <div className="flex items-center justify-end px-4 py-2">
                        {metadata && (
                            <h1 className="text-xl font-semibold text-white mr-auto">
                                {typeof metadata === 'string' ? metadata : metadata.title}
                            </h1>
                        )}
                        <div className="flex items-center gap-2">
                            <WalletButton />
                        </div>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
};

// Support both new PageMetadata objects and legacy string titles
export const getHeaderLayout = (page: React.ReactNode, metadata?: PageMetadata | string) => (
    <HeaderLayout metadata={metadata}>{page}</HeaderLayout>
);