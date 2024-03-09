import React, { useEffect, useState } from 'react';
import 'twin.macro'

import CloseIcon from '../../icons/CloseIcon';
import JupiterLogo from '../../icons/JupiterLogo';
import MenuIcon from '../../icons/MenuIcon';
import HeaderLinks from './HeaderLinks';
import HeaderLinksMobile from './HeaderLinksMobile';
import WalletButton from '../WalletButton';
import { Popover } from '@headlessui/react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import SettingsPanel from '../SettingsPanel';
import { useSerum } from '../../../context';
import { DEX_PROGRAMS } from '../../../utils/constants';
import { prettifyPubkey } from '../../../utils/pubkey';

const AppHeader: React.FC<{}> = () => {
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const handleToggleMenu = () => setOpenMobileMenu(!openMobileMenu);
  const { programID } = useSerum();
  useEffect(() => {
    const body = document.querySelector('body');
    if (openMobileMenu) {
      body!.style.overflow = 'hidden';
    } else {
      body!.style.overflow = '';
    }
  }, [openMobileMenu]);

  return (
    <>
      <div className="relative flex items-center justify-between w-full bg-[#1d2e3c]">
        <div className="flex items-center pr-4 pl-4">
          <button onClick={handleToggleMenu} type="button" className="w-6 mr-3 md:hidden text-white">
            {openMobileMenu ? <CloseIcon /> : <MenuIcon />}
          </button>

          <a href="/">
            <h1 className="flex items-center text-lg font-semibold text-white">
              <JupiterLogo />
              <span className="ml-3">Mevarik Labs</span>
            </h1>
          </a>
        </div>

        <HeaderLinks />
        <div className="hidden md:flex items-center space-x-4 mr-4 z-50">

          <div className="hidden items-center justify-end md:flex space-x-4">
            <Popover className="relative">
              {({ open }) => (
                <>
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end">
                      <p className="text-sm text-white">
                        {DEX_PROGRAMS[programID.toString()]
                          ? DEX_PROGRAMS[programID.toString()]
                          : `${prettifyPubkey(programID)}`}
                      </p>
                    </div>
                    <Popover.Button
                      className={`
                ${open ? "" : "text-opacity-90"}
                group inline-flex items-center solape__connect-btn hover:bg-neutral-700 px-3 py-2 text-sm focus-style transition-colors`}
                    >
                      {/* <span>Settings</span> */}
                      <Cog6ToothIcon
                        className={`${open ? "" : "text-opacity-70"}
                  h-5 w-5 text-white group-hover:text-white transition duration-150 ease-in-out group-hover:text-opacity-80`}
                        aria-hidden="true"
                      />
                    </Popover.Button>
                  </div>
                  <Popover.Panel className="settings__connect-btn shadow-md border border-gray-700 p-3 absolute right-0 mt-2 w-96 transform ">
                    {({ close }) => <SettingsPanel close={close} />}
                  </Popover.Panel>
                </>
              )}
            </Popover>
            <WalletButton />
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