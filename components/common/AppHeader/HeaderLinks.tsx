import { useState, useEffect } from 'react';
import SwapIcon from '../../icons/SwapIcon';
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
    `flex items-center text-white/50 hover:text-white font-[Roboto] fill-current h-[40px] my-[10px] mt-2 px-4 rounded-xl ${isActive ? ' bg-[#0d1117] !text-[#ffac40] ' : ""}` :
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
        <span className={` whitespace-nowrap relative ${isActive && !icon ? 'border-[#ffac40]' : ''}`}>
          {title}
          {isActive && !icon && <span className="absolute -bottom-5 left-0 w-full h-[3px]  bg-[#ffac40]"></span>}
        </span>

      </a>

    </Link>
  );
};

const HeaderLinks = () => {
  const router = useRouter();
  // const [active, setActive] = useState(router.pathname.startsWith('/raydium') ? 2 : 1);
  const [active, setActive] = useState<number>(getActiveLink(router.pathname));

  useEffect(() => {
    // setActive(router.pathname.startsWith('/raydium') ? 2 : 1);
    setActive(getActiveLink(router.pathname));

  }, [router.pathname]);
  function getActiveLink(pathname: string): number {
    if (pathname === '/swap') return 1; // Home link
    if (pathname.startsWith('/mintinglab') || pathname.startsWith('/market') || pathname.startsWith('/dashboard')) return 0; // Minting Lab link
    if (pathname.startsWith('/raydium')) return 2; // Liquidity link
    return -1; // None of the above
  }

  const headerLinks = [
    {
      id: 0,
      href: '/pumpfun/create',
      title: 'Bundler Lab',
      icon: <SwapIcon width="20" height="20" />,
    }
  ];

  return (
    <div className="ml-5 flex-1 justify-center hidden md:!flex text-sm h-full">
      {headerLinks.map((link, index) => (
        link && <HeaderLink
          key={index}
          href={link.href}
          title={link.title}
          index={index}
          active={active}
          setActive={setActive}
        />
      ))}
    </div>
  );
};

export default HeaderLinks;