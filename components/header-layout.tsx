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

type HeaderLayoutProps = {
    title?: string;
    children: ReactNode;
};

export const HeaderLayout: FC<HeaderLayoutProps> = ({ title, children }) => {
    const pathname = usePathname();
    const displaySidebar = pathname !== "/";

    return (
        <div className="flex flex-1 h-full overflow-hidden">
            {displaySidebar && (
                <div className="relative hidden md:block h-full">
                    <Sidebar />
                </div>
            )}

            <main className="flex-1 overflow-auto">
                <div className="flex items-center justify-end gap-2">
                    <WalletButton />
                </div>
                {children}
            </main>
        </div>
    );
};

export const getHeaderLayout = (page: React.ReactNode, title?: string) => (
    <HeaderLayout title={title}>{page}</HeaderLayout>
);