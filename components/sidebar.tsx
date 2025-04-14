"use client"
import { usePathname, useRouter } from "next/navigation";
import { FC, useState, useEffect } from "react";
import React from 'react';
import TokenIcon from "@/components/icons/TokenIcon";
import MarketIcon from "@/components/icons/MarketIcon";
import Link from "next/link";
import FlaskIcon from "@/components/icons/FlaskIcon";
import ManageIcon from "@/components/icons/ManageIcon";
import { WalletProfileContext } from '@/components/SolanaWallet/wallet-context';
import VirusIcon from "@/components/icons/VirusIcon";
import { DetailedHTMLProps, AnchorHTMLAttributes } from 'react';
import ManagerIcon from "@/components/icons/ManagerIcon";
import { TbPillFilled } from "react-icons/tb";
import CashInflowIcon from "@/components/icons/cashInflowIcon";
import MultiSenderIcon from "@/components/icons/MultiSendIcon";
import { MdSevereCold, MdToken } from "react-icons/md";
import ToolsIcon from "@/components/icons/ToolsIcon";
import { FaCoins, FaFire, FaStickyNote } from "react-icons/fa";
import { GiBrainFreeze } from "react-icons/gi";
import { RiMenuFold2Line, RiMenuFoldLine } from "react-icons/ri";
import MevLabLogo from "./icons/JupiterLogo";
import { GiBubblingFlask } from "react-icons/gi";
import { LockIcon } from "lucide-react";
import { LiaFlaskSolid } from "react-icons/lia";

export interface LinkProps extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
    className?: string;
}

// Direct navigation link with icon
const SidebarLink = ({
    href,
    isActive,
    title,
    icon,
    isMainLink = false,
    isCollapsed = false,
    gradientFrom,
    gradientTo
}: {
    href: string;
    isActive: boolean;
    title: string;
    icon: React.ReactNode;
    isMainLink?: boolean;
    isCollapsed?: boolean;
    gradientFrom?: string;
    gradientTo?: string;
}) => {
    // Create gradient text class based on active state and provided colors
    const getTextColorClass = () => {
        if (isActive) {
            if (gradientFrom === mintingLabGradient.from) return "text-blue-500";
            if (gradientFrom === pumpFunGradient.from) return "text-emerald-400";
            if (gradientFrom === raydiumGradient.from) return "text-purple-500";
            if (gradientFrom === utilitiesGradient.from) return "text-amber-500";
            return "text-[#ffac40]"; // Default active color
        }
        return ""; // Use default text color for inactive
    };

    return (
        <Link
            href={href}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 py-2 
                ${isMainLink ? 'px-3' : (isCollapsed ? 'px-3' : 'pl-8 pr-4')} 
                rounded-lg cursor-pointer transition-all duration-300 
                ${isActive
                    ? 'bg-[#0d1117]'
                    : 'text-white/70 hover:text-white hover:bg-slate-600/15'}`}
            title={isCollapsed ? title : undefined}
        >
            <div className={`${isMainLink ? 'w-8 h-8' : 'w-6 h-6'} flex items-center justify-center ${getTextColorClass()}`}>
                {icon}
            </div>
            {!isCollapsed && (
                <span className={`text-sm ${isMainLink ? 'font-medium' : 'font-normal'} whitespace-nowrap transition-all duration-300 ${getTextColorClass()} ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                    {title}
                </span>
            )}
        </Link>
    );
};

// Define gradient colors at the top level
const mintingLabGradient = { from: "#3b82f6", to: "#1e40af" };   // Blue gradient
const pumpFunGradient = { from: "#10b981", to: "#047857" };      // Green gradient
const raydiumGradient = { from: "#8b5cf6", to: "#6d28d9" };      // Purple gradient
const utilitiesGradient = { from: "#f59e0b", to: "#d97706" };        // Amber/orange gradient

// Divider component for visual separation
const Divider = ({ label, isCollapsed, group }: { label: string; isCollapsed: boolean; group?: string }) => {
    // Get appropriate text color class based on group
    const getTextColorClass = () => {
        if (group === 'minting-lab') return "text-blue-500";
        if (group === 'pump-fun') return "text-green-500";
        if (group === 'raydium') return "text-purple-500";
        if (group === 'utilities') return "text-amber-500";
        return "text-white/40"; // Default
    };

    return (
        <div className="px-4 py-2 mt-2">
            {!isCollapsed && (
                <div className="flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out">
                    <div className="h-px bg-white/10 flex-grow"></div>
                    <span className={`text-xs ${getTextColorClass()} uppercase font-semibold tracking-wider transition-opacity duration-300 ease-in-out`}>{label}</span>
                    <div className="h-px bg-white/10 flex-grow"></div>
                </div>
            )}
            {isCollapsed && <div className="h-px bg-white/10 w-full"></div>}
        </div>
    );
};

const Sidebar: FC = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { isProfilesActive, setisProfilesActive } = WalletProfileContext();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    // Track text visibility separately
    const [textVisible, setTextVisible] = useState(true);

    // Listen for toggle event from header
    useEffect(() => {
        const handleToggleSidebar = () => {
            if (!isLocked) {
                handleCollapse(!isCollapsed);
            }
        };

        window.addEventListener('toggle-sidebar', handleToggleSidebar);
        return () => {
            window.removeEventListener('toggle-sidebar', handleToggleSidebar);
        };
    }, [isLocked, isCollapsed]);

    // Handle collapse with smooth text transitions
    const handleCollapse = (collapse: boolean) => {
        if (collapse) {
            // Hide text first, then collapse sidebar
            setTextVisible(false);
            setTimeout(() => {
                setIsCollapsed(true);
            }, 150);
        } else {
            // Expand sidebar first, then show text
            setIsCollapsed(false);
            setTimeout(() => {
                setTextVisible(true);
            }, 150);
        }
    };

    // Handle hover effects
    useEffect(() => {
        if (!isLocked) {
            if (isHovering) {
                setIsCollapsed(false);
                setTimeout(() => {
                    setTextVisible(true);
                }, 150);
            } else {
                setTextVisible(false);
                setTimeout(() => {
                    setIsCollapsed(true);
                }, 150);
            }
        }
    }, [isHovering, isLocked]);

    // Check if window is available (client-side)
    useEffect(() => {
        const handleResize = () => {
            const isMobileSize = window.innerWidth < 768;
            setIsMobile(isMobileSize);
            if (isMobileSize) {
                handleCollapse(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Determine if sidebar should be expanded based on hover and lock state
    const isExpanded = isLocked ? !isCollapsed : (isHovering || !isCollapsed);

    // Main navigation links (shown at the top level)
    const mainLinks = [
        {
            href: '/minting-lab/create-token',
            title: 'Minting Lab',
            icon: <MdToken className="w-6 h-6" />,
        },
        {
            href: '/pump-fun/create',
            title: 'PumpFun',
            icon: <TbPillFilled className="w-6 h-6" />,
        },
        {
            href: '/raydium/create',
            title: 'Raydium',
            icon: <FlaskIcon className="w-6 h-6" />,
        },
        {
            href: '/utilities/distribute-tokens',
            title: 'Utilities',
            icon: <ToolsIcon width="25" height="25" />,
        }
    ];

    // Sub-navigation links
    const subLinks = [
        // MintingLab links
        {
            href: '/minting-lab/create-token',
            title: 'SPL Token',
            icon: <TokenIcon />,
            group: 'minting-lab'
        },
        {
            href: '/minting-lab/create-token-2022',
            title: 'SPL Token 2022',
            icon: <FaCoins className="w-6 h-6" />,
            group: 'minting-lab'
        },

        {
            href: '/minting-lab/burn-token',
            title: 'Burn Tokens',
            icon: <FaFire className="w-6 h-6" />,
            group: 'minting-lab'
        },

        {
            href: '/minting-lab/freeze-token',
            title: 'Freeze Accounts',
            icon: <GiBrainFreeze className="w-6 h-6" />,
            group: 'minting-lab'
        },
        {
            href: '/minting-lab/unfreeze-token',
            title: 'Unfreeze Accounts',
            icon: <MdSevereCold className="w-6 h-6" />,
            group: 'minting-lab'
        },

        {
            href: '/minting-lab/tokenmanager',
            title: 'Permission Manager',
            icon: <ManagerIcon />,
            group: 'minting-lab'
        },
        // Raydium links
        {
            href: '/raydium/openbook',
            title: 'Create OpenBook',
            icon: <FaStickyNote className="w-5 h-5" />,
            group: 'raydium'
        },
        {
            href: '/raydium/create-ray-amm',
            title: 'Raydium AMM Bundler',
            icon: <FlaskIcon className="w-5 h-5" />,
            group: 'raydium'
        },
        {
            href: '/raydium/manage-amm',
            title: 'RayAMM Manager',
            icon: <ManageIcon className="w-7 h-7" />,
            group: 'raydium'
        },
        {
            href: '/raydium/create-ray-cpmm',
            title: 'RayCPMM Bundler',
            icon: <GiBubblingFlask className="w-6 h-6" />,
            group: 'raydium'
        },
        {
            href: '/raydium/manage-cpmm',
            title: 'RayCPMM Manager',
            icon: <GiBubblingFlask className="w-6 h-6" />,
            group: 'raydium'
        },
        // PumpFun links
        {
            href: '/pump-fun/create',
            title: 'PumpFun Bundler',
            icon: <TbPillFilled className="w-6 h-6 rotate-180" />,
            group: 'pump-fun'
        },
        {
            href: '/pump-fun/manage-tokens',
            title: 'PumpFun Manager',
            icon: <TbPillFilled className="w-6 h-6" />,
            group: 'pump-fun'
        },
        // Utility links
        {
            href: '/utilities/distribute-tokens',
            title: 'Token Distributor',
            icon: <MultiSenderIcon />,
            group: 'utils'
        },
        {
            href: '/utilities/volume-generator',
            title: 'Volume Generator',
            icon: <CashInflowIcon />,
            group: 'utils'
        }
    ];

    const isMintingLabPage = pathname.includes('/minting-lab');
    const isPumpFunPage = pathname.includes('/pump-fun');
    const isRaydiumPage = pathname.includes('/raydium');
    const isUtilsPage = pathname.includes('/utilities/distribute-tokens') || pathname.includes('/utilities/volume-generator');
    const isHomePage = pathname === '/';

    // Determine which sub-links to show based on active section
    let visibleSubLinks = subLinks;

    if (isMintingLabPage) {
        visibleSubLinks = subLinks.filter(link => link.group === 'minting-lab');
    } else if (isPumpFunPage) {
        visibleSubLinks = subLinks.filter(link => link.group === 'pump-fun');
    } else if (isRaydiumPage) {
        visibleSubLinks = subLinks.filter(link => link.group === 'raydium');
    } else if (isUtilsPage || pathname.includes('/utils')) {
        visibleSubLinks = subLinks.filter(link => link.group === 'utils');
    } else {
        // On homepage, don't show any sublinks
        visibleSubLinks = [];
    }

    const showAllPortfolios = pathname.includes('/');

    return (
        <div
            className="border-r border-white/10"
            onMouseEnter={() => !isLocked && setIsHovering(true)}
            onMouseLeave={() => !isLocked && setIsHovering(false)}
        >
            <div className="flex justify-end">
                {pathname !== '/' && (
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => setIsLocked(!isLocked)}
                            type="button"
                            className="hidden md:flex w-8 h-8 mr-1 text-white/50 duration-300 ease-in-out items-center justify-center hover:text-white rounded-md transition-colors"
                            aria-label={isLocked ? "Unlock sidebar" : "Lock sidebar"}
                        >
                            <LockIcon className={`w-3 h-3 ${isLocked ? 'text-blue-400' : ''}`} />
                        </button>
                        <button
                            onClick={() => handleCollapse(!isCollapsed)}
                            type="button"
                            className="hidden md:flex w-8 h-8 mr-3 text-white/50 duration-300 ease-in-out items-center justify-center hover:text-white rounded-md transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            {isCollapsed ? <RiMenuFold2Line /> : <RiMenuFoldLine />}
                        </button>
                    </div>
                )}
            </div>
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center">
                    <Link href="/">
                        <h1 className="flex items-center text-lg font-semibold text-white cursor-pointer select-none">
                            <MevLabLogo />
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                {textVisible && (
                                    <span className="text-lg font-bold text-center ml-1 mt-1">BUNDLER
                                        <span className='font-md ml-1 mb-4 relative text-xs text-red-500 border border-[#535353] bg-black px-2 rounded-2xl'>BETA</span>
                                    </span>
                                )}
                            </div>
                        </h1>
                    </Link>
                </div>
            </div>
            <div className={`min-h-screen h-full relative transition-all duration-300 ease-in-out py-6 flex flex-col ${isExpanded ? 'w-64' : 'w-16'}`}>
                <div className="flex items-center justify-center px-2 space-y-4">
                </div>
                {/* Main navigation */}
                <div className="flex flex-col gap-1 mb-4 px-2">
                    {mainLinks.map((link, index) => {
                        let gradientFrom, gradientTo;

                        if (link.href.includes('/minting-lab')) {
                            gradientFrom = mintingLabGradient.from;
                            gradientTo = mintingLabGradient.to;
                        } else if (link.href.includes('/pump-fun')) {
                            gradientFrom = pumpFunGradient.from;
                            gradientTo = pumpFunGradient.to;
                        } else if (link.href.includes('/raydium')) {
                            gradientFrom = raydiumGradient.from;
                            gradientTo = raydiumGradient.to;
                        } else if (link.title === '/utilities') {
                            gradientFrom = utilitiesGradient.from;
                            gradientTo = utilitiesGradient.to;
                        }

                        return (
                            <SidebarLink
                                key={index}
                                href={link.href}
                                isActive={
                                    link.href === '/' ? isHomePage :
                                        (link.href.includes('/minting-lab') && isMintingLabPage) ||
                                        (link.href.includes('/pump-fun') && isPumpFunPage) ||
                                        (link.href.includes('/raydium') && isRaydiumPage) ||
                                        (link.title === '/utilities' && isUtilsPage)
                                }
                                title={link.title}
                                icon={link.icon}
                                isMainLink={true}
                                isCollapsed={!isExpanded || !textVisible}
                                gradientFrom={gradientFrom}
                                gradientTo={gradientTo}
                            />
                        );
                    })}
                </div>

                {/* Wallet section (maintained as original) */}
                {showAllPortfolios && !pathname.startsWith('/minting-lab') && isExpanded && textVisible && (
                    <div className="mb-4 px-2 overflow-hidden transition-all duration-300 ease-in-out">
                        <div
                            className="mx-1 mb-2 py-1 px-3 rounded-xl flex justify-start items-center 
                            text-white/50 hover:text-white fill-current font-extralight 
                            border-b-2 border-transparent transition-height duration-200 
                            ease-in-out cursor-pointer bg-[#252427] gap-3"
                            onClick={() => setisProfilesActive(!isProfilesActive)}>
                            <div className="bg-[#3b3939] px-3 py-3 rounded-full">
                                <VirusIcon color="#37db9c" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <p className="font-bold text-white/80 whitespace-nowrap">Wallets</p>
                            </div>
                            <div className="font-bold">
                                {'➤'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Collapsed wallet button */}
                {showAllPortfolios && !pathname.startsWith('/minting-lab') && (!isExpanded || !textVisible) && (
                    <div className="mb-4 px-2 flex justify-center">
                        <div
                            className="p-2 rounded-xl flex justify-center items-center 
                            text-white/50 hover:text-white cursor-pointer bg-[#1a1a1a]"
                            onClick={() => setisProfilesActive(!isProfilesActive)}
                            title="Wallets">
                            <div className="bg-[#333333] p-2 rounded-full">
                                <VirusIcon color="#37db9c" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Contextual sub-navigation */}
                {visibleSubLinks.length > 0 && (
                    <>
                        <Divider
                            label={
                                isMintingLabPage ? "Minting Lab" :
                                    isPumpFunPage ? "PumpFun" :
                                        isRaydiumPage ? "Raydium" :
                                            isUtilsPage ? "Utilities" : "Tools"
                            }
                            isCollapsed={!isExpanded || !textVisible}
                            group={
                                isMintingLabPage ? "minting-lab" :
                                    isPumpFunPage ? "pump-fun" :
                                        isRaydiumPage ? "raydium" :
                                            isUtilsPage ? "utilities" : undefined
                            }
                        />

                        <div className="flex flex-col gap-1 mt-2 px-2 overflow-hidden">
                            {visibleSubLinks.map((link, index) => {
                                let gradientFrom, gradientTo;

                                if (link.group === 'minting-lab') {
                                    gradientFrom = mintingLabGradient.from;
                                    gradientTo = mintingLabGradient.to;
                                } else if (link.group === 'pump-fun') {
                                    gradientFrom = pumpFunGradient.from;
                                    gradientTo = pumpFunGradient.to;
                                } else if (link.group === 'raydium') {
                                    gradientFrom = raydiumGradient.from;
                                    gradientTo = raydiumGradient.to;
                                } else if (link.group === 'utilities') {
                                    gradientFrom = utilitiesGradient.from;
                                    gradientTo = utilitiesGradient.to;
                                }

                                return (
                                    <SidebarLink
                                        key={index}
                                        href={link.href}
                                        isActive={pathname === link.href}
                                        title={link.title}
                                        icon={link.icon}
                                        isCollapsed={!isExpanded || !textVisible}
                                        gradientFrom={gradientFrom}
                                        gradientTo={gradientTo}
                                    />
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Sidebar;