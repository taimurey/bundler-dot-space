import { useState, useEffect } from 'react';
import SwapIcon from '@/components/icons/SwapIcon';
import { DetailedHTMLProps, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { usePathname } from 'next/navigation';

export interface LinkProps extends DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> {
  css?: string;
}

// Define these arrays first
const PumpFunString = ['/pump-fun', '/raydium'];
const MintingLabString = ['/minting-lab', '/minting-lab/create-token', '/minting-lab/create-token-2022'];

// Then define the function that uses them
function getActiveLink(pathname: string): number {
  if (pathname === '/') {
    return -1;
  }
  if (PumpFunString.includes(pathname)) {
    return 0;
  }
  if (MintingLabString.includes(pathname)) {
    return 1;
  }
  return -1;
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
    `flex items-center text-white/50 hover:text-white fill-current h-[40px] my-[10px] mt-2 px-4 rounded-xl ${isActive ? ' bg-[#0d1117] !text-[#ffac40] ' : ""}` :
    `flex items-center justify-center h-[40px] my-[10px] px-4 mb-2 ${!icon ? 'bg-gray-500/30 rounded-2xl ' : ''}`;

  return (
    <Link href={href} passHref>
      <div
        className={`${linkStyle} ${isActive && !icon ? 'neon-text' : 'text-slate-200/60 duration-200 ease-in-out hover:text-white'}`}
        {...linkProps}
        onClick={() => {
          setActive(index);
        }}
      >
        {icon && <span className="flex items-center w-5 mr-2">{icon}</span>}
        <span className={`whitespace-nowrap relative`}>
          {title}
          {isActive && icon && <span className="absolute -bottom-5 left-0 w-full h-[3px] bg-[#ffac40]"></span>}
        </span>
      </div>
    </Link>
  );
};

const HeaderLinks = () => {
  const router = usePathname();
  const [active, setActive] = useState<number>(getActiveLink(router));

  useEffect(() => {
    setActive(getActiveLink(router));
  }, [router]);



  const headerLinks = [
    {
      id: 0,
      href: '/pump-fun/create',
      title: 'Bundler Lab',
    },
    {
      id: 1,
      href: '/minting-lab/create-token',
      title: 'Minting Lab',
      icon: <SwapIcon width="20" height="20" />,
    }
  ];

  return (
    <div className="ml-5 flex-1 justify-center hidden md:!flex text-sm h-full select-none">
      {headerLinks.map((link, index) => (
        link && <HeaderLink
          key={index}
          href={link.href}
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