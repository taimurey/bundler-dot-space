import { Popover, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { FC, Fragment } from "react";
import WalletButton from "./WalletButton";
import { Bars3Icon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import SettingsPanel from "./SettingsPanel";
import { useSerum } from "../../context";
import { DEX_PROGRAMS } from "../../utils/constants";
import { prettifyPubkey } from "../../utils/pubkey";
import Link from "next/link";
import Image from "next/image";
import React from 'react';
import AppHeader from "./AppHeader/AppHeader";
import Dashboard from "./Dashboard";
const Header: FC = () => {
  const router = useRouter();

  const { programID } = useSerum();

  // const { serumMarkets, loading } = useSerumMarkets();

  const sanitizeQuery = (query: ParsedUrlQuery) => {
    if (query.address) {
      delete query.address;
    }
    return { ...query };
  };

  // return (
  //   <Popover className="relative z-50">
  //     <div className="h-16 w-16 absolute">
  //       <Image
  //         src="/logo.png"
  //         width={1}
  //         height={1}
  //         layout="responsive"
  //         alt="Arcane Logo"
  //       ></Image>
  //     </div>
  //     <div className="flex items-center justify-between px-4 py-3 sm:px-6 md:space-x-6 space-x-2 solapenav">
  //       <div className="flex justify-start items-center space-x-8">
  //         <button
  //           className="text-lg text-white no-underline text-left flex space-x-2 items-center ml-12 focus-visible:outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:border-none"
  //           onClick={() =>
  //             router.push({ pathname: "/", query: sanitizeQuery(router.query) })
  //           }
  //         >
  //           <p className="text-transparent bg-clip-text text-orange-200">
  //             Arcane
  //           </p>
  //         </button>
  //         <div className="space-x-4 hidden md:flex items-center">
  //           <Link
  //             passHref
  //             href={{
  //               pathname: `/create`,
  //               query: router.query,
  //             }}
  //           >
  //             <a className="focus-style px-1 rounded">
  //               <p className="text-sm text-gray-200 hover:bg-teal-700 hover:text-white focus-visible:outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-none px-4 py-2">
  //                 Create Token
  //               </p>
  //             </a>
  //           </Link>
  //         </div>
  //         <div className="space-x-4 hidden md:flex items-center">
  //           <Link
  //             passHref
  //             href={{
  //               pathname: `/market/create`,
  //               query: router.query,
  //             }}
  //           >
  //             <a className="focus-style rounded">
  //               <p className="text-sm text-gray-200 hover:bg-teal-700 hover:text-white focus-visible:outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-none px-4 py-2">
  //                 Create Market
  //               </p>
  //             </a>
  //           </Link>
  //         </div>
  //         <div className="space-x-4 hidden md:flex items-center">
  //           <Link
  //             passHref
  //             href={{
  //               pathname: `/raydium`,
  //               query: router.query,
  //             }}
  //           >
  //             <a className="focus-style rounded">
  //               <p className="text-sm text-gray-200 hover:bg-teal-700 hover:text-white focus-visible:outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-none px-4 py-2">
  //                 Raydium Liquidity
  //               </p>
  //             </a>
  //           </Link>
  //         </div>
  //         <div className="space-x-4 hidden md:flex items-center">
  //           <Link
  //             passHref
  //             href={{
  //               pathname: `/liquidity`,
  //               query: router.query,
  //             }}
  //           >
  //             <a className="focus-style rounded">
  //               <p className="text-sm text-gray-200 hover:bg-teal-700 hover:text-white focus-visible:outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-none px-4 py-2">
  //                 Add Liquidity
  //               </p>
  //             </a>
  //           </Link>
  //         </div>

  //       </div>
  //       <div className="md:hidden">
  //         <Popover.Button className="inline-flex items-center justify-center rounded-md p-1 md:p-2 text-gray-200 hover:bg-gray-800 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500">
  //           <span className="sr-only">Open menu</span>
  //           <Bars3Icon className="h-6 w-6" aria-hidden="true" />
  //         </Popover.Button>
  //       </div>
  //       <div className="hidden items-center justify-end md:flex space-x-4">
  //         <Popover className="relative">
  //           {({ open }) => (
  //             <>
  //               <div className="flex items-center space-x-4">
  //                 <div className="flex flex-col items-end">
  //                   <p className="text-xs text-transparent bg-clip-text text-orange-200">
  //                     Program ID
  //                   </p>
  //                   <p className="text-sm text-white">
  //                     {DEX_PROGRAMS[programID.toString()]
  //                       ? DEX_PROGRAMS[programID.toString()]
  //                       : `${prettifyPubkey(programID)}`}
  //                   </p>
  //                 </div>
  //                 <Popover.Button
  //                   className={`
  //               ${open ? "" : "text-opacity-90"}
  //               group inline-flex items-center rounded-md solape__connect-btn hover:bg-neutral-700 px-3 py-2 text-sm focus-style transition-colors`}
  //                 >
  //                   {/* <span>Settings</span> */}
  //                   <Cog6ToothIcon
  //                     className={`${open ? "" : "text-opacity-70"}
  //                 h-5 w-5 text-white group-hover:text-white transition duration-150 ease-in-out group-hover:text-opacity-80`}
  //                     aria-hidden="true"
  //                   />
  //                 </Popover.Button>
  //               </div>
  //               <Popover.Panel className="solape__connect-btn rounded-md shadow-md border border-gray-700 p-3 absolute right-0 z-10 mt-2 w-96 transform ">
  //                 {({ close }) => <SettingsPanel close={close} />}
  //               </Popover.Panel>
  //             </>
  //           )}
  //         </Popover>
  //         <WalletButton />
  //       </div>
  //     </div>
  //     <Transition
  //       as={Fragment}
  //       enter="duration-200 ease-out"
  //       enterFrom="opacity-0 scale-95"
  //       enterTo="opacity-100 scale-100"
  //       leave="duration-100 ease-in"
  //       leaveFrom="opacity-100 scale-100"
  //       leaveTo="opacity-0 scale-95"
  //     >
  //       <Popover.Panel
  //         focus
  //         className="absolute w-full top-full origin-top transform transition md:hidden mt-2"
  //       >
  //         {({ close }) => (
  //           <div className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-4 shadow-2xl mx-2">
  //             <SettingsPanel close={close} />
  //           </div>
  //         )}
  //       </Popover.Panel>
  //     </Transition>
  //   </Popover>
  // );
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < 150) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      tw="bg-v3-bg h-screen w-screen max-w-[100vw] overflow-x-hidden flex flex-col justify-between"
    >
      <AppHeader

      />
      <Dashboard isExpanded={isExpanded} />
    </div>
  );
};

export default Header;
