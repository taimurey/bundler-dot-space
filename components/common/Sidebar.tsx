import { useRouter } from "next/router";
import { FC, Fragment, useState } from "react";
import React from 'react';
import TokenIcon from "../icons/TokenIcon";
import MarketIcon from "../icons/MarketIcon";
import Link from "next/link";
import { LinkProps } from "./AppHeader/HeaderLinks";
import FlaskIcon from "../icons/FlaskIcon";
import ManageIcon from "../icons/ManageIcon";

const HeaderLink = ({
    href,
    isActive,
    title,
    description,
    icon,
    external = false,
}: LinkProps & {
    href: string;
    isActive: boolean;
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    icon: React.ReactNode;
    external?: boolean;
    isExpanded?: boolean;
}) => {





    return (
        <div>
            <Link href={href}>
                <div
                    className={`flex justify-start  font-semibold text-white/50 hover:text-white fill-current   px-6 border-b-2 border-transparent transition-height duration-200 ease-in-out cursor-pointer py-4
                    ${isActive && `!text-v3-primary bg-[#11171f]  rounded-[35px]`}`}
                >
                    <div className="flex justify-start items-center gap-4">
                        <div className={`w-10 h-10 bg-v3-bg border-[#ffffff] flex items-center justify-center transition-all duration-300 ease-in-out  rounded-b-xl`}>
                            {icon}
                        </div>
                        <div className={`flex flex-col transition-opacity ease-in-out`}>
                            <span className="text-sm font-bold whitespace-nowrap">{title}</span>
                            {/* <span className="text-xs font-light">{description}</span> */}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};

const Sidebar: FC<{}> = ({ }) => {
    const router = useRouter();
    type FilterLink = (link: LinkProps) => boolean;

    const links = [
        {
            href: '/dashboard',
            isActive: router.pathname === '/dashboard',
            title: 'Dashboard',
            description: 'View the stats',
            icon: <MarketIcon />,

        },
        {
            href: '/mintinglab/create',
            isActive: router.pathname === '/mintinglab/create',
            title: 'Create Token',
            description: 'Mint SPL Tokens',
            icon: <TokenIcon />,
        },
        {
            href: '/market/create',
            isActive: router.pathname === '/market/create',
            title: 'Create Market',
            description: 'Openbook Market Creation',
            icon: <MarketIcon />,
        },
        {
            href: '/liquidity/add',
            isActive: router.pathname === '/liquidity/add',
            title: 'Add Liquidity',
            description: 'Add liquidity to a market',
            icon: <FlaskIcon />,
        },
        {
            href: '/liquidity/manage',
            isActive: router.pathname === '/liquidity/manage',
            title: 'Manage Liquidity',
            description: 'Handle liquidity on Raydium',
            icon: <ManageIcon />,
        },
    ];

    // Filter links based on the current route
    const filterLinks: FilterLink = (link) => {
        if (router.pathname === '/mintinglab/create' || router.pathname === '/market/create' || router.pathname === '/dashboard') {
            return link.href === '/mintinglab/create' || link.href === '/market/create' || link.href === '/dashboard';
        } else if (router.pathname === '/liquidity/add' || router.pathname === '/liquidity/manage') {
            return link.href === '/liquidity/add' || link.href === '/liquidity/manage'

        }
        return false;
    };

    const filteredLinks = links.filter(filterLinks);

    return (
        <>
            <div className="h-full">
                <div className="flex  justify-start items-start w-full  max-w-[220px] h-full py-8">
                    <div className="flex  flex-col gap-2 h-full px-4">
                        {filteredLinks.map((link, index) => (
                            <HeaderLink
                                key={index}
                                href={link.href}
                                isActive={link.isActive}
                                title={link.title}
                                description={link.description}
                                icon={link.icon}
                            />
                        ))}
                    </div>
                </div>
            </div>
            {/* } */}

        </>
    );
};

export default Sidebar;