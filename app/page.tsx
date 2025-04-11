'use client';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Head from 'next/head';
import { RainbowButton } from "@/components/ui/rainbow-button";

const Home = () => {

  const buttons = [
    {
      id: 1,
      initials: "PF",
      name: "PumpFun",
      color: "bg-orange-500",
      href: "/pump-fun/create",
      available: true
    },
    {
      id: 2,
      initials: "R",
      name: "Raydium",
      color: "bg-blue-500",
      href: "#",
      available: true
    },
    {
      id: 3,
      initials: "LL",
      name: "LaunchLab",
      color: "bg-purple-500",
      href: "#",
      available: false
    },
    {
      id: 4,
      initials: "+",
      name: "More",
      color: "bg-gradient-to-br from-[#6df374] to-[#505050]",
      href: "#",
      available: true
    }
  ];



  return (
    <>
      <Head>
        <title>Bundler.Space - The Ultimate Degen Toolkit for Solana</title>
        <meta name="description" content="Connect all your coins and pools in a few clicks. Start effectively managing your entire portfolio on Solana." />
        <meta name="keywords" content="Pump.Fun, Raydium, Solana, Token Bundler, Crypto Trading, LaunchLab" />
        <meta name="author" content="BundlerdotSpace" />
      </Head>
      <div className="flex flex-col relative min-h-screen">
        <div className="flex flex-col items-center justify-center w-full h-screen">
          <div className="w-full mx-auto flex flex-col gap-6 px-4">
            <h1 className={`text-5xl font-bold text-center transition-opacity duration-500`}>
              <span className="text-[#f5ac41]">The Ultimate</span> <span className="text-white">Degen Toolkit for Solana</span>
            </h1>

            <p className={`text-[18px] md:text-[20px] text-white text-center`}>
              Connect all your coins and pools in a few clicks. Start effectively managing your entire portfolio – solana
            </p>

            <div className={`w-1/2 mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mt-8`}>
              {buttons.map((button) => (
                <div
                  key={button.id}
                  className="group py-4 px-6 border cursor-pointer border-[#232221] rounded-xl bg-[#0f1117] shadow-md shadow-[#101010] flex flex-col items-center transition-all duration-300 hover:border-[#f5ac41] hover:shadow-[#f5ac41]/20 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className={`w-16 h-16 ${button.color} rounded-full mb-2 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <span className="text-white font-bold">{button.initials}</span>
                  </div>
                  <p className="text-white font-medium">{button.name}</p>
                  {button.available ? (
                    <Link href={button.href} className="mt-2 cursor-pointer text-white flex items-center transition-colors duration-300 group-hover:text-[#f5ac41]">
                      Connect <span className="ml-1 group-hover:translate-x-1 transition-transform duration-300">→</span>
                    </Link>
                  ) : (
                    <div className="mt-2 flex flex-col items-center">
                      <p className="text-gray-400 text-sm">(coming soon)</p>
                      <span className="text-gray-400 flex items-center">
                        Launch <span className="ml-1">→</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;