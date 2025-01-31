"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import CloseIcon from '@/components/icons/CloseIcon';
import MevLabLogo from '@/components/icons/JupiterLogo';
import MenuIcon from '@/components/icons/MenuIcon';
import HeaderLinksMobile from './mobile-header';
// import WalletButton from '../WalletButton';
import DiscordIcon from '@/components/icons/DiscordIcon';
import HomeIcon from '@/components/icons/HomeIcon';
import SwapIcon from '@/components/icons/SwapIcon';
import LiquidityIcon from '@/components/icons/LiquidityIcon';
import { usePathname } from 'next/navigation';

export const headerLinks = [
  {
    id: 0,
    href: '/',
    icon: <HomeIcon />,
  },
  {
    id: 1,
    href: '/mintinglab/create-spl',
    icon: <SwapIcon width="20" height="20" />,
  },
  {
    id: 2,
    href: '/pumpfun/create',
    icon: <LiquidityIcon width="20" height="20" />,
  }
];

export const HeaderLinks = () => {
  const router = usePathname();
  const [active, setActive] = useState<number>(getActiveLink(router));

  useEffect(() => {
    setActive(getActiveLink(router));
  }, [router]);

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
}


const AppHeader: React.FC = () => {
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const handleToggleMenu = () => setOpenMobileMenu(!openMobileMenu);
  useEffect(() => {
    const body = document.querySelector('body');
    if (body) {
      if (openMobileMenu) {
        body.style.overflow = 'hidden';
      } else {
        body.style.overflow = '';
      }
    }
  }, [openMobileMenu]);

  return (
    <>
      <div className="relative flex items-center justify-between w-full bg-[#010409] bg-opacity-50 border-b-2 border-[#333333] backdrop-blur-3xl">
        <div className="flex items-center px-2 gap-1">
          <div className="flex items-center  ">
            <button onClick={handleToggleMenu} type="button" className="w-6 mr-3 md:hidden text-white">
              {openMobileMenu ? <CloseIcon /> : <MenuIcon />}
            </button>

            <Link href="/">
              <h1 className="flex items-center text-lg font-semibold text-white cursor-pointer select-none">
                <MevLabLogo />
                <span className="text-[29px] font-normal text-center font-[kanit-medium] ml-1 mt-1">Bundler
                  <span className='font-bold font-sans  ml-1 mb-4 relative text-xs text-red-500 border border-[#535353] bg-black px-2 rounded-2xl'>BETA</span>
                </span>
              </h1>
            </Link>
          </div>
          {/* <HeaderLinks /> */}
        </div>

        <div className="hidden md:flex items-center space-x-4 mr-4 z-50">

          <div className="hidden items-center justify-end md:flex space-x-4">
            <a href='https://discord.gg/HGFf7NNHrp' target='_blank' rel='noreferrer' className=''>
              <DiscordIcon width="40" height="40" />
            </a>
            {/* <WalletButton /> */}

          </div>
        </div>
      </div>

      {openMobileMenu && (
        <div
          style={{
            height: 'calc(100vh - 70px)',
          }}
          className="z-[60] md:hidden fixed top-[60px] left-0 w-full bg-[rgba(62,62,69,0.85)] backdrop-blur-[20px]"
          onClick={handleToggleMenu}
        >
          <HeaderLinksMobile />

        </div>
      )}

    </>
  );
};

export default AppHeader;