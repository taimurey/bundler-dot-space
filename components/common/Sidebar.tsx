import { useRouter } from "next/router";
import { FC, } from "react";
import React from 'react';
import TokenIcon from "../icons/TokenIcon";
import MarketIcon from "../icons/MarketIcon";
import Link from "next/link";
import { LinkProps } from "./AppHeader/HeaderLinks";
import FlaskIcon from "../icons/FlaskIcon";
import ManageIcon from "../icons/ManageIcon";
import { useMyContext } from '../../contexts/Maincontext';
import SwapIcon from "../icons/SwapIcon";
import VirusIcon from "../icons/VirusIcon";

const HeaderLink = ({
    href,
    isActive,
    title,
    icon,
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
                    // className={`flex justify-start  font-semibold text-white/50 hover:text-white fill-current   px-6 border-b-2 border-transparent transition-height duration-200 ease-in-out cursor-pointer py-4
                    // ${isActive && `!text-v3-primary bg-[#11171f]  rounded-[35px]`}`}
                    className={`flex justify-start  text-white/50 duration-300 ease-in-out hover:text-white fill-current font-extralight  px-6 border-b-2 border-transparent transition-height cursor-pointer 
                    ${isActive && `!text-[#baf775] duration-300 ease-in-out`}`}
                >
                    <div className="flex justify-start items-center gap-4">
                        <div className={`w-10 h-10 bg-[#343536]  border-[#ffffff] flex items-center justify-center transition-all duration-300 ease-in-out  rounded-xl`}>
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

const Sidebar: FC = () => {
    const router = useRouter();
    type FilterLink = (link: LinkProps) => boolean;

    const links = [
        // {
        //     href: '/dashboard',
        //     isActive: router.pathname === '/dashboard',
        //     title: 'Dashboard',
        //     description: 'View the stats',
        //     icon: <MarketIcon />,

        // },
        {
            href: '/mintinglab/create',
            isActive: router.pathname === '/mintinglab/create',
            title: 'V1 Token Creation',
            description: 'Mint SPL Tokens',
            icon: <TokenIcon />,
        },
        // {
        //     href: '/mintinglab/create',
        //     isActive: router.pathname === '/mintinglab/create',
        //     title: 'V2 Token Creation',
        //     description: 'Mint SPL Tokens',
        //     icon: <TokenIcon />,
        // },
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
            href: '/liquidity/swap',
            isActive: router.pathname === '/liquidity/swap',
            title: 'Token Manager',
            description: 'Swap tokens',
            icon: <TokenIcon />,
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
        } else if (router.pathname === '/liquidity/add' || router.pathname === '/liquidity/manage' || router.pathname === '/liquidity/swap') {
            return link.href === '/liquidity/add' || link.href === '/liquidity/manage' || link.href === '/liquidity/swap';

        }
        return false;
    };

    const filteredLinks = links.filter(filterLinks);
    const showAllPortfolios = router.pathname.includes('/liquidity/');
    const { isProfilesActive, setisProfilesActive } = useMyContext();


    return (
        <>
            <div className="h-screen">
                <div className="flex  justify-start gap-2 items-start w-full max-w-[220px] py-8 flex-col">
                    {showAllPortfolios && (
                        <div className="mx-6 mb-2 py-1 px-2 w-full max-w-[200px] rounded-3xl flex justify-start items-center  text-white/50 hover:text-white fill-current font-extralight   border-b-2 border-transparent transition-height duration-200 ease-in-out cursor-pointer bg-[#1a1a1a] gap-3" onClick={() => setisProfilesActive(!isProfilesActive)}>
                            <div className="bg-[#333333] px-3 py-3  rounded-full">
                                <VirusIcon color="#37db9c" /></div>
                            <div className="flex flex-col">
                                <p className="font-bold text-white/80 ">Wallets</p>
                            </div>
                            <div className="font-bold">
                                {'>'}
                            </div>
                        </div>
                    )}


                    <div className="flex  flex-col gap-2 h-full p-2">
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
                    {/* {router.pathname.includes('/liquidity/') &&
                        <>
                            <hr className=" bg-white  w-full my-4" />
                            <Link href="/liquidity/swap">
                                <div className="mx-6 mb-2 p-2 w-full max-w-[200px] rounded-xl flex justify-center items-center  text-white/50 hover:text-white fill-current font-extralight   border-b-2 border-transparent transition-height duration-200 ease-in-out cursor-pointer bg-[#1a1a1a] gap-3 " onClick={() => setisProfilesActive(true)}>
                                    <div className="flex flex-col justify-center items-center">
                                        <p className="font-bold text-white/80 text-center text-xl ">Swap</p>
                                    </div>
                                </div>
                            </Link>
                        </>
                    } */}
                </div>
            </div>
            {/* } */}

        </>
    );
};

export default Sidebar;