import { Popover, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import { FC, Fragment } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import SettingsPanel from "./SettingsPanel";
import React from 'react';
import className from 'twin.macro';
import TokenIcon from "../icons/TokenIcon";
import MarketIcon from "../icons/MarketIcon";
import Link from "next/link";
const HeaderLink = ({
    href,
    isActive,
    title,
    description,
    icon,
    external = false,
}: {
    href: string;
    isActive: boolean;
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    icon: React.ReactNode;
    external?: boolean;
}) => {
    return (
        <Link
            href={href}
        >
            <div css={[
                className`flex items-center font-semibold text-white/50 hover:text-white fill-current h-[80px] min-w-[230px] px-4 border-b-2 border-transparent`,
                isActive && className`!text-v3-primary border-v3-primary`,
            ]}
                {...(external
                    ? {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                    }
                    : {})}>

                <>
                    <div className="w-8 h-8 bg-v3-bg rounded-md flex items-center justify-center mr-2">
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">{title}</span>
                        <span className="text-xs font-light">{description}</span>
                    </div>
                </>
            </div>
        </Link>
    );
};


const Dashboard: FC = () => {
    const router = useRouter();
    return (
        <Popover className="relative z-50">
            <div className="flex justify-center items-center w-full bg-gray-800 border-b border-gray-700">
                <div className="grid grid-cols-4 gap-8 place-items-center mt-2">
                    <HeaderLink
                        href="/create"
                        isActive={router.pathname === "/create"}
                        title="Create Token"
                        description="Mint SPL Tokens"
                        icon={<TokenIcon />}
                    />
                    <HeaderLink
                        href="/market/create"
                        isActive={router.pathname === "/market/create"}
                        title="Create Market"
                        description="Openbook Market Creation"
                        icon={<MarketIcon />}
                    />
                    <HeaderLink
                        href="/raydium"
                        isActive={router.pathname === "/raydium"}
                        title="Raydium Liquidity"
                        description="Provide liquidity on Raydium"
                        icon={<Bars3Icon />}
                    />
                    <HeaderLink
                        href="/liquidity"
                        isActive={router.pathname === "/liquidity"}
                        title="Add Liquidity"
                        description="Add liquidity to a market"
                        icon={<Bars3Icon />}
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