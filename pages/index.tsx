'use client';
import React, { useEffect, useState } from "react";
import { ReactNode } from "react";
// import Clock from "../components/icons/Clock";
// import TickIcon from "../components/icons/TickIcon";
// import PencilScale from "../components/icons/PencilScale";
import Link from "next/link";
import MevLabLogo from "../components/icons/JupiterLogo";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faDiscord, } from '@fortawesome/free-brands-svg-icons';
import { getHeaderLayout } from "../components/layouts/HeaderLayout";


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


const features: Feature[] = [
  {
    title: "POOL SNIPING",
    description:
      "Sniping made easy. Provide a mint address and Investment details, bot will handle the rest. You don't have to have extensive any knowledge to successfully snipe."
  },
  {
    title: "LIMIT ORDERS",
    description:
      "Automate your trading with ease. Set up multiple take profit levels, stop loss or trailing stop loss levels seamlessly. Automate dip buying at the market cap / price you would like, with state of the art precision."
  },
  {
    title: "PROFIT MONITOR",
    description:
      "Track your investments with ease. Monitor your portfolio, track your trades, and get insights on your trading performance. Our platform provides you with all the tools you need to make informed decisions."
  },
  {
    title: "FAST & SECURE SWAPS",
    description:
      "Our swaps are designed to be resistant to MEV, providing protection against sandwich attacks or frontruns. With lightning-fast execution, our secure swaps guarantee a more favorable buy-in price for you."
  },
  {
    title: "PUMP.FUN SNIPER",
    description:
      "Our market-leading built-in simulations ensure protection against tokens that are scams from the start. If Banana Simulator cannot simulate a successful sell, your transaction will not go through. All handled seamlessly by the bot."
  }
];


const pages = [
  // {
  //   name: "About",
  //   url: "/about",
  // },
  // {
  //   name: "Support",
  //   url: "/support",
  // },
  // {
  //   name: "Terms & Privacy Policy",
  //   url: "/privacypolicy",
  // },
  // {
  //   name: "Contact us",
  //   url: "/contactus",
  // },
  {
    name: "Bundler",
    url: "/pumpfun/create",
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
  // const [activepage, setActivePage] = useState("About");



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
    <div className="flex flex-col   relative ">
      <div className="flex flex-col gap-12 justify-start  lg:justify-center lg:items-center  w-full h-full lg:flex-row my-12 max-h-[1000px]">


        <div className="max-w-[350px] lg:max-w-[700px] flex flex-col gap-6 h-full">
          <p className={`text-[42px] lg:text-[126px]  leading-[126px] text-center font-[HeliukBrave]  uppercase transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            Bundler for the
            <span className="text-[#f5ac41] mx-4 relative">Apes & Degens</span>
          </p>
          <p className={`text-[42px] lg:text-[25px] leading-[126px] text-center font-bold transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <br />
            <h1 className="font-normal font-heliukBrave text-[50px] tracking-wide uppercase bg-gradient-to-br from-[#6df374] to-[#505050] bg-clip-text text-transparent animate-typing">
              for traders, by THE traders
            </h1>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 max-w-[90vw] mx-auto sm:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-6  justify-around items-center  w-full h-full  my-8  bg-[#0e1117] shadow-lg shadow-gray/5 rounded-xl p-8 border border-[#232221]">
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
          <p className="text-[#7f8083] font-light text-[14px]">Pools Launched
          </p>
        </div>
      </div>
      <div className="p-20">
        <p className={`text-[42px] lg:text-[72px] leading-[126px] text-start px-* 
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

      <div className="p-20">
        <div>
          <div className=" flex justify-center items-center h-screen">
            <div className="font-normal font-heliukBrave text-[90px] tracking-wide uppercase bg-gradient-to-br from-[#f3986d] to-[#b3c420] bg-clip-text text-transparent animate-typing">
              <h1>WHAT ARE YOU WAITING FOR?</h1>
              <h1 className="flex justify-center items-center text-[#ffffff]">Get STARTED</h1>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col lg:flex-row gap-4 relative w-full justify-between
items-center lg:justify-between lg:items-center px-4 pb-4 pt-8  md:py-4   z-20  "
      >
        <Link href="/" className="w-full">
          <h1 className="flex items-center justify-center text-lg font-semibold text-white cursor-pointer">
            <MevLabLogo />

            <span className='font-bold font-[heliukBrave] ml-1 text-4xl text-yellow-500'>.</span>
          </h1>
        </Link>

        <ul className="flex justify-center items-center   w-full  -mb-[12px] lg:gap-4  z-40     ">
          {pages?.map((item, index) => {
            return (
              <>
                <Link href={item?.url} passHref>
                  <a >
                    <li
                      key={index}
                      className={` p-2 relative    group text-[12px] lg:text-[14px]   cursor-pointer  hover:text-[#f5ac40] transition-all duration-500 ease-in-out 
                        `}
                    >
                      <div className="relative group z-40 ">
                        <div className="flex justify-center items-center   ">
                          <p
                            className=" tracking-wide whitespace-nowrap text-[#d0d1d3] "
                          // onClick={() => setActivePage(item.name)}
                          >
                            {item.name}
                          </p>

                        </div>

                      </div>
                    </li>
                  </a>
                </Link >
              </>
            );
          })}
        </ul>
        <div className="z-50">
          <ul className="wrapper flex  ">

            <a
              href="https://www.telegram.com"
              target="_blank"
              rel="noreferrer"
            >
              <li className="icon telegram">
                <span className="tooltip">Telegram</span>
                <FontAwesomeIcon icon={faTelegram} size="sm" className="bg-white  text-black text-[12px] rounded-full p-[3px]" />
              </li>
            </a>
            <a
              href="https://www.twiiter.com
"rel="noreferrer"
              target="_blank"
            >
              <li className="icon twitter ">
                <span className="tooltip ">
                  Twitter
                </span>
                <FontAwesomeIcon icon={faTwitter} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
              </li>
            </a>
            <a
              href="https://www.discord.com"
              target="_blank"
              rel="noreferrer"
            >
              <li className="icon discord">
                <span className="tooltip">Discord</span>
                <FontAwesomeIcon icon={faDiscord} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />

              </li>
            </a>
          </ul>

        </div>
      </div>
      <p className="text-[#d0d1d3] text-[14px] text-center bg-[#02040a] py-4 w-full">
        © 2024 Bundler. All Rights Reserved.
      </p>
    </div>
  );
};


Home.getLayout = (page: ReactNode) => getHeaderLayout(page, "Home");

export default Home;