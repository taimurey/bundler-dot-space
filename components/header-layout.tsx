"use client";

import { FC, ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";
import MevLabLogo from "./icons/JupiterLogo";
import Link from "next/link";

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

            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
};

export const getHeaderLayout = (page: React.ReactNode, title?: string) => (
    <HeaderLayout title={title}>{page}</HeaderLayout>
);
