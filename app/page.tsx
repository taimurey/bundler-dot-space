'use client';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RainbowButton } from "@/components/ui/rainbow-button";
import PumpFunIcon from "@/components/icons/PumpFunIcon";
import { RaydiumIcon, RaydiumIconV2 } from "@/components/icons/RaydiumIcons";
import SolanaIcon from "@/components/icons/SolanaIcon";
import MultiSendIcon from "@/components/icons/MultiSendIcon";
import { Spotlight, GridBackground } from "@/components/blocks/spotlight-new";

const Home = () => {

  const buttons = [
    {
      id: 1,
      icon: PumpFunIcon,
      name: "PumpFun",
      color: "",
      href: "/pump-fun/create",
      available: true
    },
    {
      id: 2,
      icon: RaydiumIcon,
      name: "Raydium",
      color: "",
      href: "/raydium/create-ray-amm",
      available: true
    },
    {
      id: 3,
      icon: RaydiumIconV2,
      name: "LaunchLab",
      color: "",
      href: "/minting-lab/create-token",
      available: false
    },
    {
      id: 4,
      icon: MultiSendIcon,
      name: "More",
      color: "",
      href: "/utilities/distribute-tokens",
      available: true
    }
  ];

  return (
    <div className="flex flex-col relative min-h-screen overflow-hidden">

      <div className="flex flex-col items-center justify-center w-full h-screen relative z-10">
        <div className="w-full mx-auto flex flex-col gap-6 px-4">
          <h1 className={`text-4xl md:text-5xl font-bold text-center transition-opacity duration-500`}>
            <span className="text-[#f5ac41]">The Ultimate</span> <span className="text-white">Degen Toolkit for Solana</span>
          </h1>

          <p className={`text-md md:text-lg text-white text-center`}>
            Connect all your coins and pools in a few clicks. Start effectively managing your entire portfolio
          </p>

          <div className={`w-full lg:w-1/2 mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mt-8`}>
            {buttons.map((button) => (
              <div
                key={button.id}
                className="group py-4 px-6 border cursor-pointer border-[#232221] rounded-xl bg-[#0f1117]/80 backdrop-blur-sm shadow-md shadow-[#101010] flex flex-col items-center transition-all duration-300 hover:border-[#f5ac41] hover:shadow-[#f5ac41]/20 hover:shadow-lg hover:-translate-y-1"
              >
                <div className={`w-16 h-16 ${button.color} rounded-full mb-2 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                  <button.icon className="w-8 h-8" />
                </div>
                <p className="text-white font-medium">{button.name}</p>
                {button.available ? (
                  <Link href={button.href} className="mt-2 cursor-pointer text-white flex items-center transition-colors duration-300 group-hover:text-[#f5ac41]">
                    Launch <span className="ml-1 group-hover:translate-x-1 transition-transform duration-300">→</span>
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
  );
};

export default Home;