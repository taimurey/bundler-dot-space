import className from 'twin.macro';
import { useState } from 'react';
import SwapIcon from '../../icons/SwapIcon';
import RepoLogo from '../../icons/RepoLogo';
import DiscordIcon from '../../icons/DiscordIcon';
import LiquidityIcon from '../../icons/LiquidityIcon';
import { DetailedHTMLProps, AnchorHTMLAttributes } from 'react';
import { TwStyle } from 'twin.macro';
import Link from 'next/link';
import Router, { useRouter } from 'next/router';

export interface LinkProps extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
  css?: TwStyle[] | undefined;
}

const HeaderLink = ({
  href,
  title,
  icon,
  index,
  external,
  active,
  setActive,
  isActive
}: LinkProps & {
  href: string;
  title: string | React.ReactNode;
  icon: React.ReactNode;
  external?: boolean;
  index: number;
  isActive: boolean
  active: number;
  setActive: (index: number) => void;

}) => {
  const linkProps = {};

  if (external) {
    linkProps.target = '_blank';
    linkProps.rel = 'noopener noreferrer';
  }


  return (
    <Link href={href} passHref 
     >

  <a
    className={`flex items-center font-semibold text-white/50 hover:text-white fill-current h-[60px] px-4 rounded ${active == index ? 'bg-v3-bg !text-v3-primary' : ""
      }`}
    // ${isActive ? 'bg-v3-bg !text-v3-primary' : ""} `
    {...linkProps} // Spread the linkProps to add target and rel attributes for external links
    onClick={() => {
      setActive(index);}} >
        <span className="flex items-center w-5">{icon}</span>
        <span className="ml-2 whitespace-nowrap">{title}</span>
      </a >
    </Link >

  );
    };


    const HeaderLinks= () => {
      const [active, setActive] = useState(0)
      const headerLinks = [
        {
          id: 0,
          href: '/',
          title: 'Minting Lab',
          icon: <SwapIcon width="20" height="20" />,
        },
        {
          id: 1,
          href: '/liquidity',
          title: 'Liquidity',
          icon: <LiquidityIcon width="20" height="20" />,
        },
        {
          id: 2,
          href: '/docs',
          // external: true,
          title: 'Docs',
          icon: <RepoLogo width="20" height="20" />,
        },
        {
          id: 3,
          href: 'https://discord.gg/HGFf7NNHrp',
          external: true,
          title: 'Discord',
          icon: <DiscordIcon width="20" height="20" />,
        },
      ];
      const router = useRouter()
      return (
        <div className="flex-1 justify-center hidden md:!flex text-sm h-full">
          {headerLinks.map((link, index) => (
            <HeaderLink
              key={index}
              href={link.href}
              external={link.external}
              title={link.title}
              icon={link.icon}
              index={index}
              active={active}
              setActive={setActive}
              isActive={router.pathname === link.href}
            />
          ))}
        </div>
      );
    };

export default HeaderLinks;
