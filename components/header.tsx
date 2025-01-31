import { useState, useEffect } from 'react';
import SwapIcon from '@/components/icons/SwapIcon';
import { DetailedHTMLProps, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export interface LinkProps extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
    className?: string;
}

const HeaderLink = ({
    href,
    title,
    icon,
    index,
    external,
    active,
    setActive,
}: LinkProps & {
    href: string;
    title: string | React.ReactNode;
    icon?: React.ReactNode;
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

    const iconClasses = icon
        ? `flex items-center text-white/50 hover:text-white font-[Roboto] fill-current h-10 my-2.5 mt-2 px-4 rounded-xl ${isActive ? 'bg-[#0d1117] text-[#ffac40]' : ''
        }`
        : `flex items-center justify-center font-[Roboto] h-10 my-2.5 px-4 mb-2 ${!icon ? 'bg-gray-500/30 rounded-2xl' : ''
        }`;

    return (
        <Link href={href} passHref>
            <a
                className={`${iconClasses} ${isActive && !icon
                    ? 'neon-text'
                    : 'text-slate-200/60 transition-colors duration-200 ease-in-out hover:text-white'
                    }`}
                {...linkProps}
                onClick={() => {
                    setActive(index);
                }}
            >
                {icon && <span className="flex items-center w-5 mr-2">{icon}</span>}
                <span className="whitespace-nowrap relative">
                    {title}
                    {isActive && icon && (
                        <span className="absolute -bottom-5 left-0 w-full h-[3px] bg-[#ffac40]"></span>
                    )}
                </span>
            </a>
        </Link>
    );
};

const HeaderLinks = () => {
    const router = useRouter();
    const [active, setActive] = useState<number>(getActiveLink(router.pathname));

    useEffect(() => {
        setActive(getActiveLink(router.pathname));
    }, [router.pathname]);

    function getActiveLink(pathname: string): number {
        switch (pathname) {
            case '/':
                return -1;
            case '/pumpfun/create':
                return 0;
            case '/mintinglab/create-spl':
                return 1;
            default:
                return -1;
        }
    }

    const headerLinks = [
        {
            id: 0,
            href: '/pumpfun/create',
            title: 'Bundler Lab',
        },
        {
            id: 1,
            href: '/mintinglab/create-spl',
            title: 'Minting Lab',
            icon: <SwapIcon width="20" height="20" />,
        }
    ];

    return (
        <div className="ml-5 flex-1 justify-center hidden md:flex text-sm h-full select-none">
            {headerLinks.map((link, index) => (
                link && (
                    <HeaderLink
                        key={index}
                        href={link.href}
                        title={link.title}
                        icon={link.icon}
                        index={index}
                        active={active}
                        setActive={setActive}
                    />
                )
            ))}
        </div>
    );
};

export default HeaderLinks;