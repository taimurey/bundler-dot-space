import className from 'twin.macro';
import { useState, useEffect } from 'react';
import SwapIcon from '../../icons/SwapIcon';
import RepoLogo from '../../icons/RepoLogo';
import DiscordIcon from '../../icons/DiscordIcon';
import LiquidityIcon from '../../icons/LiquidityIcon';
import { DetailedHTMLProps, AnchorHTMLAttributes } from 'react';
import { TwStyle } from 'twin.macro';
import Link from 'next/link';
import { useRouter } from 'next/router';

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
}: LinkProps & {
  href: string;
  title: string | React.ReactNode;
  icon: React.ReactNode;
  external?: boolean;
  index: number;
  active: number;
  setActive: (index: number) => void;
}) => {

  const router = useRouter();
  const isActive = active === index;

  const linkProps: { target?: string; rel?: string } = {};

  if (external) {
    linkProps.target = '_blank';
    linkProps.rel = 'noopener noreferrer';
  }

  return (
    <Link href={href} passHref>
      <a
        className={`flex items-center font-semibold text-white/50 hover:text-white fill-current h-[60px] px-4 rounded-t-xl ${isActive ? ' bg-[#151620] !text-v3-primary' : ""}`}
        {...linkProps}
        onClick={() => {
          setActive(index);
        }}
      >
        <span className="flex items-center w-5">{icon}</span>
        <span className="ml-2 whitespace-nowrap">{title}</span>
      </a>
    </Link>
  );
};

const HeaderLinks = () => {
  const router = useRouter();
  const [active, setActive] = useState(router.pathname.startsWith('/liquidity') ? 1 : 0);

  useEffect(() => {
    setActive(router.pathname.startsWith('/liquidity') ? 1 : 0);
  }, [router.pathname]);

  const headerLinks = [
    {
      id: 0,
      href: '/',
      title: 'Minting Lab',
      icon: <SwapIcon width="20" height="20" />,
    },
    {
      id: 1,
      href: '/liquidity/add',
      title: 'Liquidity',
      icon: <LiquidityIcon width="20" height="20" />,
    },
    {
      id: 2,
      href: '/docs',
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
        />
      ))}
    </div>
  );
};

export default HeaderLinks;