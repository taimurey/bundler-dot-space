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
import { DetailedHTMLProps, AnchorHTMLAttributes } from 'react';
import { TwStyle } from 'twin.macro';
import ManagerIcon from "../icons/ManagerIcon";
import { useState, useEffect } from 'react';
import HomeIcon from '../icons/HomeIcon';
import LiquidityIcon from '../icons/LiquidityIcon';
import CashInflowIcon from "../icons/cashInflowIcon";
import SwapIcon from "../icons/SwapIcon";
import PillIcon from "../icons/PillIcon";
import MultiSenderIcon from "../icons/MultiSendIcon";
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
    const [isRaydiumOpen, setIsRaydiumOpen] = useState<boolean>(false);
    const [isPumpFunOpen, setIsPumpFunOpen] = useState<boolean>(true);

    const toggleRaydium = () => setIsRaydiumOpen(!isRaydiumOpen);
    const togglePumpFun = () => setIsPumpFunOpen(!isPumpFunOpen);

    const [active, setActive] = useState<number>(getActiveLink(router.pathname));

    useEffect(() => {
        setActive(getActiveLink(router.pathname));

    }, [router.pathname]);
    function getActiveLink(pathname: string): number {
        if (pathname === '/') return 0;
        if (pathname.startsWith('/mintinglab') || pathname.startsWith('/market') || pathname.startsWith('/dashboard')) return 1;
        if (pathname.startsWith('')) return 2;
        return -1;
    }

    const headerLinks = [
        {
            id: 0,
            href: '/',
            icon: <HomeIcon />,
        },
        {
            id: 1,
            href: '/mintinglab/tokencreate',
            icon: <SwapIcon width="20" height="20" />,
        },
        {
            id: 2,
            href: '/pumpfun/create',
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
            href: '/pumpfun/create',
            isActive: router.pathname === '/pumpfun/create',
            title: 'Bundler',
            description: 'Create a PumpFun Bundle',
            icon: <PillIcon />,
        },
        // {
        //     href: '/pumpfun/bomber',
        //     isActive: router.pathname === '/pumpfun/bomber',
        //     title: 'Spammer',
        //     description: 'Create a PumpFun Bundle',
        //     icon: <PillIcon />,
        // },
        {
            href: '/pumpfun/seller',
            isActive: router.pathname === '/pumpfun/seller',
            title: 'Seller',
            description: 'Create a PumpFun Bundle',
            icon: <PillIcon rotate={true} />,
        },

        {
            href: '/raydium/create',
            isActive: router.pathname === '/raydium/create',
            title: 'Bundler',
            description: 'Add liquidity to a market',
            icon: <FlaskIcon />,
        },
        {
            href: '/raydium/manage',
            isActive: router.pathname === '/raydium/manage',
            title: 'Remover',
            description: 'Handle liquidity on Raydium',
            icon: <ManageIcon />,
        },
        {
            href: '/volumebot',
            isActive: router.pathname === '/volumebot',
            title: 'Volume Generator',
            description: 'Generate volume on Raydium',
            icon: <CashInflowIcon />,
        },
        {
            href: '/distributor',
            isActive: router.pathname === '/distributor',
            title: 'Token Distributor',
            description: 'Send tokens to multiple wallets',
            icon: <MultiSenderIcon />,
        },
    ];

    const isMintingLabPage = router.pathname.includes('/mintinglab');

    // Filter links based on the current page
    const filteredLinks = sublinks.filter(link => {
        // If on the /mintinglab page, exclude Raydium and PumpFun links
        if (isMintingLabPage) {
            return !link.href.includes('/raydium/') && !link.href.includes('/pumpfun/');
        }
        // Otherwise, include all links
        return true;
    });

    const raydiumLinks = isMintingLabPage ? [] : filteredLinks.filter(link => link.href.includes('/raydium/') && !link.href.includes('volumebot'));
    const pumpFunLinks = isMintingLabPage ? [] : filteredLinks.filter(link => link.href.includes('/pumpfun/') && !link.href.includes('volumebot'));

    const volumeBotLink = filteredLinks.filter(link => link.href.includes('/volumebot'));
    const distributorLink = filteredLinks.filter(link => link.href.includes('/distributor'));

    // Filter other links excluding Raydium and PumpFun links
    const otherLinks = filteredLinks.filter(link => !link.href.includes('/raydium/') && !link.href.includes('/pumpfun/') && !link.href.includes('/volumebot'));
    const showAllPortfolios = router.pathname.includes('/');
    const { isProfilesActive, setisProfilesActive } = useMyContext();
    return (
        <>
            <div className=" min-h-screen h-full flex bg-[#0c1118]">
                <div className="bg-black h-full py-4 px-2" >
                    {headerLinks.map((link, index) => (
                        <HeaderLink
                            key={index}
                            href={link.href}
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
                        {!isMintingLabPage && (
                            <div className="accordion-item cursor-pointer select-none">
                                <div className="accordion-title flex items-center " onClick={toggleRaydium}>
                                    <div className="flex justify-start items-center gap-4 w-56 bg-slate-600/5 hover:bg-slate-600/15  px-6 py-2 rounded-xl ease-in-out duration-300 mb-3"
                                    >
                                        <h2>Raydium</h2>
                                        <span className={`ease-in-out duration-300 cursor-pointer ml-2 ${isRaydiumOpen ? 'rotate-90' : 'rotate-0'}`}
                                        >➤</span>
                                    </div>
                                </div>
                                {isRaydiumOpen && (
                                    <div className="accordion-content">
                                        {raydiumLinks.map((link, index) => (
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
                                )}
                            </div>
                        )}
                        {!isMintingLabPage && (
                            <div className="accordion-item cursor-pointer">
                                <div className="accordion-title flex items-center " onClick={togglePumpFun}>
                                    <div className="flex justify-start items-center select-none gap-4 w-full bg-slate-600/5 hover:bg-slate-600/15  px-6 py-2 rounded-xl ease-in-out duration-300 mb-3"
                                    >
                                        <h2>PumpFun</h2>
                                        <span className={`ease-in-out duration-300 cursor-pointer  ${isPumpFunOpen ? 'rotate-90' : 'rotate-0'}`}
                                        >➤</span>
                                    </div>
                                </div>
                                {isPumpFunOpen && (
                                    <div className="accordion-content">
                                        {pumpFunLinks.map((link, index) => (
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
                                )}
                            </div>
                        )}
                        {isMintingLabPage && otherLinks.map((link, index) => (
                            <SidebarSublinks
                                key={index}
                                href={link.href}
                                isActive={link.isActive}
                                title={link.title}
                                description={link.description}
                                icon={link.icon}
                            />
                        ))}
                        {volumeBotLink.map((link, index) => (
                            <SidebarSublinks
                                key={index}
                                href={link.href}
                                isActive={link.isActive}
                                title={link.title}
                                description={link.description}
                                icon={link.icon}
                            />
                        ))}
                        {distributorLink.map((link, index) => (
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
            </div >
        </>
    )
};

export default Sidebar;