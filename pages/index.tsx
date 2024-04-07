import React, { useEffect, useState } from "react";
import { getSearchLayout } from "../components/layouts/SearchLayout";
import { ReactNode } from "react";
import TokenIcon from "../components/icons/TokenIcon";
import Clock from "../components/icons/Clock";
import TickIcon from "../components/icons/TickIcon";
import PencilScale from "../components/icons/PencilScale";

function animateValue(id: string, start: number, end: number, duration: number) {
  if (start === end) return;
  const range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.max(Math.abs(Math.floor(duration / range)), 1);
  const obj = document.getElementById(id);
  if (!obj) { return; }
  const timer = setInterval(function () {
    current += increment;
    if (obj) {
      if (id === 'stat1') {
        obj.innerHTML = `$${current.toLocaleString()} M+`;
      } else {
        obj.innerHTML = current.toLocaleString();
      }
    }
    if (current == end) {
      clearInterval(timer);
    }
  }, stepTime);
}

interface Feature {
  title: string;
  description: string;
}

interface RoadmapData {
  heading: string;
  titles: string[];
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: "AUTO SNIPING",
    description:
      "Sniping made easy. Provide a contract address and Investment details, we will handle the rest. Our automated system handles Tax calculations, maxTx, methodID, first safe block detection. You don't have to have extensive solidity knowledge to successfully snipe."
  },
  {
    title: "LIMIT ORDERS",
    description:
      "Automate your trading with ease. Set up multiple take profit levels, stop loss or trailing stop loss levels seamlessly. Automate dip buying at the market cap / price you would like, with state of the art precision."
  },
  {
    title: "COPYTRADE",
    description:
      "Let others do the heavy lifting. Copytrade a profitable trader, or multiple traders simultaneously, while enjoying the same safety features as you would whe trading with Banana Gun."
  },
  {
    title: "FAST & SECURE SWAPS",
    description:
      "All our swaps are MEV-resistant, safeguarding against potential sandwich attacks or frontruns. Paired with blazing-fast execution, our safe swaps ensure a better buy-in price for you."
  },
  {
    title: "ANTI RUG & REORG PROTECTION",
    description:
      "Our top-performing anti-rug system ensures safer trading with an 85% success rate, providing maximum security. Reorg protection is in place in case of a block fork."
  },
  {
    title: "SCAM & HONEYPOT PROTECTION",
    description:
      "Our market-leading built-in simulations ensure protection against tokens that are scams from the start. If Banana Simulator cannot simulate a successful sell, your transaction will not go through. All handled seamlessly by the bot."
  }
];

const roadmapData: RoadmapData[] = [
  {
    heading: "Now",
    titles: ["WEB DAPP BETA", "COPYTRADE", "PNL CARDS", "SOLANA CARDS"],
    icon: <TickIcon />
  },
  {
    heading: "Next",
    titles: ["BANANA ECOSYSTEM", "BANANA ACADEMY", "TRADE OVERVIEW", "WEB DAPP PUBLIC"],
    icon: <PencilScale />
  },
  {
    heading: "Letter",
    titles: ["MULTI PLATFORM", "WALLET TRACKER", "MULTICHAIN", "TRADE HISTORY"],
    icon: <Clock />
  }
];


const FeatureComponent: React.FC<Feature> = ({ title, description }) => (
  <div className="py-4 px-6 border border-[#232221] rounded-xl bg-[#0f1117] shadow-md shadow-[#101010]" >
    <h2 className="text-[36px] font-[HeliukBrave]">{title}</h2>
    <p className="text-[18px] font-thin leading-[27px] text-white py-2 ">{description}</p>
  </div>
);

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Trigger number increase animation for each statistic
      animateValue('stat1', 0, 18, 0);
      animateValue('stat2', 0, 2123, 100);
      animateValue('stat3', 0, 1123, 100);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col max-w-[90vw] mx-auto">
      <div className="flex flex-col gap-12 justify-start  lg:justify-center lg:items-center  w-full h-full lg:flex-row my-12 max-h-[1000px]">
        <div className="max-w-[350px] lg:max-w-[700px] flex flex-col gap-6 h-full">
          <p className={`text-[42px] lg:text-[126px]  leading-[126px] text-center font-[HeliukBrave]  uppercase transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            Mevarik Sniper for
            <span className="text-[#f5ac41] mx-4 relative">Apes & Degens</span>
          </p>
          <p className={`text-[42px] lg:text-[25px] leading-[126px] text-center font-mono font-bold transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            Mevarik
            <br />
            <span className="font-normal text-[18px]">
              Snipe upcoming launches or safely trade tokens that are already live
            </span>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-6  justify-around items-center  w-full h-full  my-8  bg-[#0e1117] shadow-lg shadow-gray/5 rounded-xl p-8 border border-[#232221]">
        {/* Counting Statistics */}
        <div className="flex justify-center items-center flex-col">
          <p id="stat1" className="font-semibold text-[25px]">0</p>
          <p className="text-[#7f8083] font-light text-[14px]">Tokens Volume</p>
        </div>
        <div className="flex justify-center items-center flex-col">
          <p id="stat2" className="font-semibold text-[25px]">0</p>
          <p className="text-[#7f8083] font-light text-[14px]">Tokens Minted</p>
        </div>
        <div className="flex justify-center items-center flex-col">
          <p id="stat3" className="font-semibold text-[25px]">0</p>
          <p className="text-[#7f8083] font-light text-[14px]">Liquidity Launched
          </p>
        </div>
      </div>

      <div className="py-20">
        <p className={`text-[42px] lg:text-[72px] leading-[126px] text-start px-2
         font-[HeliukBrave] `}>
          FEATURES
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 ">
          {features.map((feature, index) => (
            <FeatureComponent key={index} {...feature} />
          ))}
        </div>
        <div>

        </div>
      </div>
      <div className="py-20">
        <p className={`text-[42px] lg:text-[72px] leading-[50px] text-start px-2
         font-[HeliukBrave] `}>
          ROADMAP
        </p>
        <p className="  max-w-[600px] py-12 px-2 text-[18px] font-thin leading-[27px] text-white">
          We're continually working on innovations to enhance the trading experience and empower users with a competitive edge. Instead of a traditional roadmap with deadlines, we present our plans through a 'now/next/later' approach.
        </p>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {roadmapData.map(({ heading, titles, icon }, index) => (
            <div key={index} className="w-full p-6 border bg-[#0f1117] border-[#232221] rounded-xl shadow-lg shadow-[#1a1919]">
              <div className="flex justify-start items-center mb-2 px-2 gap-4">
                <div className="bg-[#f5ac40] p-2 rounded-md text-black">{icon}</div>
                <h2 className="text-xl font-light">{heading}</h2>
              </div>
              <div className="flex flex-col gap-4 py-2">
                {titles.map((title, index) => (
                  <p key={index} className="p-6 border border-[#232221] font-[HeliukBrave] text-[32px] rounded-xl shadow-md shadow-[#1a1919] bg-[#0f1117] cursor-pointer">
                    {title}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>

        </div>
      </div>
    </div>
  );
};


Home.getLayout = (page: ReactNode) => getSearchLayout(page, "Home");

export default Home;