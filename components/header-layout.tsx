"use client";

import { FC, ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/app-header";

type HeaderLayoutProps = {
    title?: string;
    children: ReactNode;
};

export const HeaderLayout: FC<HeaderLayoutProps> = ({ title, children }) => {
    const pathname = usePathname();

    const displaySidebar = pathname !== "/";

    return (
        <>
            <AppHeader />
            <div className="flex h-screen">
                {displaySidebar && (
                    <div className="hidden md:flex min-w-[300px] h-full bg-[#0d1117] border-r border-gray-700">
                        <Sidebar />
                    </div>
                )}
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
        </>
    );
};

export const getHeaderLayout = (page: React.ReactNode, title?: string) => (
    <HeaderLayout title={title}>{page}</HeaderLayout>
);
