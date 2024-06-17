import { useRouter } from "next/router";
import { FC, } from "react";
import React from 'react';
import TokenIcon from "../icons/TokenIcon";
import MarketIcon from "../icons/MarketIcon";
import Link from "next/link";
import FlaskIcon from "../icons/FlaskIcon";
import ManageIcon from "../icons/ManageIcon";
import { useMyContext } from '../../contexts/Maincontext';
import VirusIcon from "../icons/VirusIcon";
// import SenderIcon from "../icons/SenderIcon";
import { DetailedHTMLProps, AnchorHTMLAttributes } from 'react';
import { TwStyle } from 'twin.macro';
import ManagerIcon from "../icons/ManagerIcon";
import { useState, useEffect } from 'react';
// import SwapIcon from "../icons/SwapIcon";
// import RepoLogo from '../../icons/RepoLogo';
import HomeIcon from '../icons/HomeIcon';
import LiquidityIcon from '../icons/LiquidityIcon';
import Capsule from "../icons/capsule";
import CashInflowIcon from "../icons/cashInflowIcon";
export interface LinkProps extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
    css?: TwStyle[] | undefined;
}
const SidebarSublinks = ({
    href,
    isActive,
    title,
    icon,
}: LinkProps & {
    href: string;
    isActive: boolean;
    title: string;
    description: string;
    icon: React.ReactNode;
    external?: boolean;
    isExpanded?: boolean;
}) => {
    const router = useRouter();
    const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault(); // Prevent default behavior
        event.stopPropagation(); // Prevent event propagation
        router.push(href); // Redirect to the specified href on click
    };

    return (
        <div
            className={`flex justify-start text-white/50 duration-300 ease-in-out hover:text-white fill-current font-extralight px-6 border-b-2 border-transparent transition-height cursor-pointer 
            ${isActive && `!text-[#baf775] duration-300 ease-in-out`}`}
            onClick={handleClick}
        >
            <div className="flex justify-start items-center gap-4">
                <div className={`w-10 h-10 bg-[#343536]  border-[#ffffff] flex items-center justify-center transition-all duration-300 ease-in-out  rounded-xl`}>
                    {icon}
                </div>
                <div className={`flex flex-col transition-opacity ease-in-out`}>
                    <span className="text-sm font-normal whitespace-nowrap">{title}</span>
                </div>
            </div>
        </div>
    );
};

const HeaderLink = ({
    href,
    icon,
    index,
    external,
    active,
    setActive,
}: LinkProps & {
    href: string;
    icon?: React.ReactNode; // icon is now optional
    external?: boolean;
    index: number;
    active: number;
    setActive: (index: number) => void;
}) => {

    const isActive = active === index;

    const linkProps: { target?: string; rel?: string } = {};

    if (external) {
        linkProps.target = '_blank';
        linkProps.rel = 'noopener noreferrer';
    }

    const linkStyle = icon ?
        `flex items-center text-white/50 hover:text-white font-[Roboto] fill-current h-[40px] my-[10px] mt-2 px-3 rounded-xl ${isActive ? ' bg-[#0d1117] !text-[#ffac40] ' : ""}` :
        `flex items-center justify-center font-[Roboto] text-white/50 hover:text-white fill-current h-[40px] my-[10px] px-4`;

    return (
        <Link href={href} passHref>
            <a
                className={linkStyle}
                {...linkProps}
                onClick={() => {
                    setActive(index);
                }}
            >
                {icon && <span className="flex items-center w-5">{icon}</span>}
            </a>
        </Link>
    );
};







const Sidebar: FC = () => {
    const router = useRouter();
    type FilterLink = (link: LinkProps) => boolean;

    const [active, setActive] = useState<number>(getActiveLink(router.pathname));

    useEffect(() => {
        // setActive(router.pathname.startsWith('/liquidity') ? 2 : 1);
        setActive(getActiveLink(router.pathname));

    }, [router.pathname]);
    function getActiveLink(pathname: string): number {
        if (pathname === '/') return 0; // Home link
        if (pathname.startsWith('/mintinglab') || pathname.startsWith('/market') || pathname.startsWith('/dashboard')) return 1; // Minting Lab link
        if (pathname.startsWith('/liquidity')) return 2; // Liquidity link
        return -1; // None of the above
    }

    const headerLinks = [
        {
            id: 0,
            href: '/',
            icon: <HomeIcon />,
        },
        // {
        //     id: 1,
        //     href: '/mintinglab/tokencreate',
        //     icon: <SwapIcon width="20" height="20" />,
        // },

        {
            id: 2,
            href: '/liquidity/pumpfun',
            icon: <LiquidityIcon width="20" height="20" />,
        }
    ];


    const sublinks = [
        {
            href: '/mintinglab/tokencreate',
            isActive: router.pathname === '/mintinglab/tokencreate',
            title: 'Token Program',
            description: 'Mint SPL Tokens',
            icon: <TokenIcon />,
        },
        // {
        //     href: '/mintinglab/token2022create',
        //     isActive: router.pathname === '/mintinglab/token2022create',
        //     title: 'Token-2022 Program',
        //     description: 'Mint SPL Tokens',
        //     icon: <TokenIcon />,
        // },
        {
            href: '/market/create',
            isActive: router.pathname === '/market/create',
            title: 'Create OpenBook',
            description: 'Openbook Market Creation',
            icon: <MarketIcon />,
        },
        {
            href: '/mintinglab/tokenmanager',
            isActive: router.pathname === '/mintinglab/tokenmanager',
            title: 'Authority Manager',
            description: 'Manage SPL Tokens',
            icon: <ManagerIcon />,
        },
        {
            href: '/liquidity/pumpfun',
            isActive: router.pathname === '/liquidity/pumpfun',
            title: 'PumpFun Bundler',
            description: 'Create a PumpFun Bundle',
            icon: <Capsule />,
        },
        {
            href: '/liquidity/pumpfunSeller',
            isActive: router.pathname === '/liquidity/pumpfunSeller',
            title: 'PumpFun Seller',
            description: 'Create a PumpFun Bundle',
            icon: <Capsule />,
        },

        {
            href: '/liquidity/add',
            isActive: router.pathname === '/liquidity/add',
            title: 'Raydium Bundler',
            description: 'Add liquidity to a market',
            icon: <FlaskIcon />,
        },
        // {
        //     href: '/liquidity/swap',
        //     isActive: router.pathname === '/liquidity/swap',
        //     title: 'Token Manager',
        //     description: 'Swap tokens',
        //     icon: <TokenIcon />,
        // },
        {
            href: '/liquidity/manage',
            isActive: router.pathname === '/liquidity/manage',
            title: 'Remove Liquidity',
            description: 'Handle liquidity on Raydium',
            icon: <ManageIcon />,
        },
        {
            href: '/liquidity/volumebot',
            isActive: router.pathname === '/liquidity/volumebot',
            title: 'Volume Generator',
            description: 'Generate volume on Raydium',
            icon: <CashInflowIcon />,
        },
    ];
    // Simplified the filter function as 'link' parameter is unused
    const filterLinks: FilterLink = () => true;

    const filteredLinks = sublinks.filter(filterLinks);
    const showAllPortfolios = router.pathname.includes('/liquidity/');
    const { isProfilesActive, setisProfilesActive } = useMyContext();

    return (
        <>
            <div className=" min-h-screen h-full flex bg-[#0c1118]">
                <div className="bg-black h-full py-4 px-2" >
                    {headerLinks.map((link, index) => (
                        <HeaderLink
                            key={index}
                            href={link.href}
                            // external={link.external}
                            icon={link.icon}
                            index={index}
                            active={active}
                            setActive={setActive}
                        />
                    ))}
                </div>
                <div className="flex  justify-start gap-2 items-start w-full max-w-[220px] py-8 flex-col">
                    {showAllPortfolios && (
                        <div className="mx-6 mb-2 py-1 px-2 w-full max-w-[200px] rounded-3xl flex justify-start items-center  text-white/50 hover:text-white fill-current font-extralight   border-b-2 border-transparent transition-height duration-200 ease-in-out cursor-pointer bg-[#1a1a1a] gap-3" onClick={() => setisProfilesActive(!isProfilesActive)}>
                            <div className="bg-[#333333] px-3 py-3  rounded-full">
                                <VirusIcon color="#37db9c" /></div>
                            <div className="flex flex-col">
                                <p className="font-bold text-white/80 ">Wallets</p>
                            </div>
                            <div className="font-bold">
                                {'➤'}
                            </div>
                        </div>
                    )}


                    <div className="flex  flex-col gap-2 h-full p-2">
                        {filteredLinks.map((link, index) => (
                            <SidebarSublinks
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