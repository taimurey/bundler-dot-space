import { Popover, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import { FC, Fragment, useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import SettingsPanel from "./SettingsPanel";
import React from 'react';
import className from 'twin.macro';
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
    isExpanded,
}: LinkProps & {
    href: string;
    isActive: boolean;
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    icon: React.ReactNode;
    external?: boolean;
    isExpanded?: boolean;
}) => {
    const [isExpandedState, setIsExpanded] = useState(isExpanded);

    React.useEffect(() => {
        setIsExpanded(isExpanded);
    }, [isExpanded]);

    const styles = [
        `flex items-center font-semibold text-white/50 hover:text-white fill-current  min-w-[230px] px-4 border-b-2 border-transparent transition-height duration-200 ease-in-out cursor-pointer`,
        isActive && `!text-v3-primary border-v3-primary`,
        isExpandedState ? `h-[80px]` : `h-0`,
    ].join(' ');

    const textStyles = [
        `transition-opacity ease-in-out `,
        isExpandedState ? `duration-300 opacity-100` : `duration-300 opacity-0`,
    ].join(' ');

    const iconStyles = [
        `w-10 h-10 bg-v3-bg border-[#ffffff] flex items-center justify-center transition-all duration-300 ease-in-out`,
        isExpandedState ? `mt-0 mr-2 rounded-xl` : `mt-10 ml-4 rounded-b-xl`,
    ].join(' ');

    return (
        <div>
            <Link href={href}>
                <div
                    className={styles}
                    {...(external
                        ? {
                            target: '_blank',
                            rel: 'noopener noreferrer',
                        }
                        : {})}
                >
                    {isExpandedState || isActive ? (
                        <>
                            <div className={`${iconStyles}`}>
                                {icon}
                            </div>
                            <div className={`${textStyles} flex flex-col `}>
                                <span className="text-sm font-bold">{title}</span>
                                <span className="text-xs font-light">{description}</span>
                            </div>
                        </>
                    ) : null}
                </div>
            </Link>
        </div>
    );
};
// Rest of the code remains the same

const Dashboard: FC<{ isExpanded: boolean }> = ({ isExpanded }) => {
    const router = useRouter();
    return (
        <Popover className="relative ">
            <div className="flex justify-center items-center w-full bg-[#151620]  border-b border-gray-700">
                <div className="grid grid-cols-4 gap-8 place-items-center">
                    <HeaderLink
                        href="/create"
                        isActive={router.pathname === "/create"}
                        title="Create Token"
                        description="Mint SPL Tokens"
                        icon={<TokenIcon />}

                        isExpanded={isExpanded}
                    />
                    <HeaderLink
                        href="/market/create"
                        isActive={router.pathname === "/market/create"}
                        title="Create Market"
                        description="Openbook Market Creation"
                        icon={<MarketIcon />}
                        isExpanded={isExpanded}

                    />
                    <HeaderLink
                        href="/liquidity/add"
                        isActive={router.pathname === "/liquidity/add"}
                        title="Add Liquidity"
                        description="Add liquidity to a market"
                        icon={<FlaskIcon />}
                        isExpanded={isExpanded}

                    />
                    <HeaderLink
                        href="/liquidity/manage"
                        isActive={router.pathname === "/liquidity/manage"}
                        title="Manage Liquidity"
                        description="Handle liquidity on Raydium"
                        icon={<ManageIcon />}
                        isExpanded={isExpanded}

                    />
                </div>
            </div>
            <Transition
                as={Fragment}
                enter="duration-200 ease-out"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="duration-100 ease-in"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <Popover.Panel
                    focus
                    className="absolute w-full top-full origin-top transform transition md:hidden mt-2"
                >
                    {({ close }) => (
                        <div className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-4 shadow-2xl mx-2">
                            <SettingsPanel close={close} />
                        </div>
                    )}
                </Popover.Panel>
            </Transition>
        </Popover>
    );
};

export default Dashboard;