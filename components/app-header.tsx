"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import CloseIcon from '@/components/icons/CloseIcon';
import MevLabLogo from '@/components/icons/JupiterLogo';
import MenuIcon from '@/components/icons/MenuIcon';
import HeaderLinksMobile from './mobile-header';
// import WalletButton from '../WalletButton';
import DiscordIcon from '@/components/icons/DiscordIcon';
import SwapIcon from '@/components/icons/SwapIcon';
import LiquidityIcon from '@/components/icons/LiquidityIcon';
import { usePathname } from 'next/navigation';
import HeaderLinks from './HeaderLinks';
import { WalletButton } from './Wallet/WalletButton';

export const headerLinks = [
  {
    id: 1,
    href: '/minting-lab/create-token',
    icon: <SwapIcon width="20" height="20" />,
  },
  {
    id: 2,
    href: '/pumpfun/create',
    icon: <LiquidityIcon width="20" height="20" />,
  }
];

const AppHeader: React.FC = () => {
  const route = usePathname();
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleToggleMenu = () => setOpenMobileMenu(!openMobileMenu);
  const handleToggleSidebar = () => {
    // We'll emit a custom event that the sidebar component will listen for
    const event = new CustomEvent('toggle-sidebar');
    window.dispatchEvent(event);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

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
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 z-50">
        <div className="flex items-center px-2 gap-1">
          {/* <div className="flex items-center">
            <button onClick={handleToggleMenu} type="button" className="w-6 mr-3 md:hidden text-white">
              {openMobileMenu ? <CloseIcon /> : <MenuIcon />}
            </button> */}

          {/* Sidebar toggle button (visible on desktop) */}
          {/* {route !== '/' && (
              <button
                onClick={handleToggleSidebar}
                type="button"
                className="hidden md:flex w-8 h-8 mr-3 text-white items-center justify-center hover:bg-gray-700 rounded-md transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-white transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            )}

            <Link href="/">
              <h1 className="flex items-center text-lg font-semibold text-white cursor-pointer select-none">
                <MevLabLogo />
                <span className="text-lg font-bold text-center ml-1 mt-1">BUNDLER
                  <span className='font-md ml-1 mb-4 relative text-xs text-red-500 border border-[#535353] bg-black px-2 rounded-2xl'>BETA</span>
                </span>
              </h1>
            </Link>
          </div> */}
          <HeaderLinks />
        </div>

        <div className="flex items-center justify-end gap-2">
          <a href='https://discord.gg/HGFf7NNHrp' target='_blank' rel='noreferrer' className=''>
            <DiscordIcon width="40" height="40" />
          </a>
          <WalletButton />
        </div>
      </div>

      {openMobileMenu && (
        <div
          style={{
            height: 'calc(100vh - 70px)',
          }}
          className="z-[60] md:hidden top-[60px] left-0 w-full bg-[rgba(62,62,69,0.85)] backdrop-blur-[20px]"
          onClick={handleToggleMenu}
        >
          <HeaderLinksMobile />
        </div>
      )}
    </>
  );
};

export default AppHeader;