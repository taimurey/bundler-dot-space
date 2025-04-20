"use client";

import { FC, ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";
import WalletButton from "./SolanaWallet/WalletButton";
import DiscordIcon from '@/components/icons/DiscordIcon';
import HeaderLinks from "./HeaderLinks";
import { GridBackground } from "./blocks/spotlight-new";
import { Spotlight } from "./blocks/spotlight-new";
import { HeroPattern } from "@/components/ui/HeroPattern";

export interface PageMetadata {
    title: string;
    description?: string;
    section?: string;
    keywords?: string;
    imageUrl?: string;
}

type HeaderLayoutProps = {
    metadata?: PageMetadata | string;
    children: ReactNode;
};
export const HeaderLayout: FC<HeaderLayoutProps> = ({ metadata, children }) => {
    const pathname = usePathname();
    const isHomePage = pathname === "/";

    // Handle both string and PageMetadata for backward compatibility
    let pageTitle = "Bundler Space";
    let pageDescription = "Solana tools and utilities";

    if (metadata) {
        if (typeof metadata === 'string') {
            pageTitle = `${metadata} | Bundler Space`;
        } else {
            pageTitle = metadata.title ? `${metadata.title} | Bundler Space` : "Bundler Space";
            pageDescription = metadata.description || "Solana tools and utilities";
        }
    }

    return (
        <div className="flex flex-1 h-full overflow-hidden relative">
            {/* Sidebar - highest z-index to stay above background */}
            <div className="relative hidden md:block h-full z-20">
                <Sidebar />
            </div>

            {/* Main content area with its own stacking context */}
            <div className="flex-1 relative overflow-hidden">
                {/* Background elements - positioned within the main content area only */}
                <div className='absolute inset-0 z-0'>
                    {isHomePage ? (
                        <GridBackground
                            className="bg-gradient-to-br from-[#6df374] to-[#505050]"
                            width={100}
                            height={100}
                        />
                    ) : (
                        <HeroPattern />
                    )}
                    <Spotlight
                        width={720}
                        height={1680}
                        xOffset={200}
                    />
                </div>
                {/* Actual content - above background */}
                <main className="flex-1 overflow-auto relative z-10 h-full pb-10 custom-scrollbar">
                    {/* Header section */}
                    <div className={`flex items-center justify-end px-4 py-2 `}>
                        {/* Show title if we have metadata and not on homepage */}
                        {!isHomePage && metadata && (
                            <h1 className="text-xl font-semibold text-white mr-auto">
                                {typeof metadata === 'string' ? metadata : metadata.title}
                            </h1>
                        )}
                        {/* Show HeaderLinks on homepage */}
                        {isHomePage && (
                            <div className="mr-auto">
                                <HeaderLinks />
                            </div>
                        )}
                        {/* Always show wallet button and discord link */}
                        <div className="flex items-center gap-2">
                            <a href='https://discord.gg/HGFf7NNHrp' target='_blank' rel='noreferrer' className=''>
                                <DiscordIcon width="40" height="40" />
                            </a>
                            <WalletButton />
                        </div>
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
};

// Support both new PageMetadata objects and legacy string titles
export const getHeaderLayout = (page: React.ReactNode, metadata?: PageMetadata | string) => (
    <HeaderLayout metadata={metadata}>{page}</HeaderLayout>
);