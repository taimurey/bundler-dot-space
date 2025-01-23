'use client';
import React, { useEffect, useState } from "react";
import { ReactNode } from "react";
import Link from "next/link";
import Head from 'next/head'; // Import the Head component
import MevLabLogo from "../components/icons/JupiterLogo";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter, faTelegram, faDiscord } from '@fortawesome/free-brands-svg-icons';
import { getHeaderLayout } from "../components/layouts/HeaderLayout";
import { RainbowButton } from "@/components/ui/rainbow-button";

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
      "Sniping made simple with BundlerdotSpace. Just provide a mint address and investment details—our advanced bot handles the rest. No prior experience needed to snipe tokens like a pro."
  },
  {
    title: "LIMIT ORDERS",
    description:
      "Take control of your trades with BundlerdotSpace. Automate take profit, stop loss, and trailing stop loss strategies with precision. Set up dip buying at your preferred market cap or price effortlessly."
  },
  {
    title: "PROFIT MONITOR",
    description:
      "Stay on top of your investments with BundlerdotSpace. Monitor your portfolio, analyze trade performance, and gain actionable insights—all in one place. Make smarter decisions with real-time data."
  },
  {
    title: "FAST & SECURE SWAPS",
    description:
      "Trade with confidence using BundlerdotSpace's MEV-resistant swaps. Avoid sandwich attacks and frontruns while enjoying lightning-fast execution for the best possible prices."
  },
  {
    title: "PUMP.FUN SNIPER",
    description:
      "Protect your investments with BundlerdotSpace's built-in simulations. Our Banana Simulator ensures you only snipe tokens with a proven sell path. If a token fails the simulation, your transaction is canceled automatically."
  }
];

const pages = [
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      animateValue('stat1', 0, 18, 0);
      animateValue('stat2', 0, 2123, 100);
      animateValue('stat3', 0, 1123, 100);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Pump.Fun Bundler - Ultimate Launch Bundler for Pump.Fun</title>
        <meta name="description" content="The ultimate bundler tool for Pump.Fun and Raydium by BundlerdotSpace. Manage tokens, wallets, and launches with ease. Bundle transactions, snipe tokens, and automate trading on Solana." />
        <meta name="keywords" content="Pump.Fun, Raydium, Solana, Token Bundler, Crypto Trading, Token Launch, Snipe Tokens, Wallet Management, Automated Trading, BundlerdotSpace" />
        <meta name="author" content="BundlerdotSpace" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Pump.Fun Bundler - Ultimate Launch Bundler for Pump.Fun" />
        <meta property="og:description" content="The ultimate bundler tool for Pump.Fun and Raydium by BundlerdotSpace. Manage tokens, wallets, and launches with ease. Bundle transactions, snipe tokens, and automate trading on Solana." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bundler.space" />
        <meta property="og:image" content="https://bundler.space/images/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pump.Fun Bundler - Ultimate Launch Bundler for Pump.Fun" />
        <meta name="twitter:description" content="The ultimate bundler tool for Pump.Fun and Raydium by BundlerdotSpace. Manage tokens, wallets, and launches with ease. Bundle transactions, snipe tokens, and automate trading on Solana." />
        <meta name="twitter:image" content="https://bundler.space/images/twitter-image.jpg" />
        <link rel="canonical" href="https://bundler.space/pumpfun-bundler" />
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Pump.Fun Bundler",
              "description": "The ultimate bundler tool for Pump.Fun and Raydium by BundlerdotSpace. Manage tokens, wallets, and launches with ease. Bundle transactions, snipe tokens, and automate trading on Solana.",
              "brand": {
                "@type": "Brand",
                "name": "BundlerdotSpace"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "1234"
              }
            }
          `}
        </script>
      </Head>

      <div className="flex flex-col relative -mb-[100px]">
        <div className="flex flex-col gap-12 justify-start lg:justify-center lg:items-center w-full lg:flex-row h-screen">
          <div className="max-w-[350px] w-full mx-auto md:max-w-[500px] lg:max-w-[700px] flex flex-col gap-6 h-full justify-center items-center">
            <p className={`text-[56px] md:text-[80px] lg:text-[126px] leading-[50px] md:leading-[80px] lg:leading-[126px] select-none text-center font-[HeliukBrave] uppercase transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
              Bundler for the
              <span className="text-[#f5ac41] mx-4 relative">Apes & Degens</span>
            </p>

            <h1 className={`font-normal font-heliukBrave text-[50px] tracking-wide uppercase select-none bg-gradient-to-br from-[#6df374] to-[#505050] bg-clip-text text-transparent animate-typing transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
              For Traders, By the Traders
            </h1>
            <div>
              <Link href={"/pumpfun/create"}>
                <RainbowButton >Get Started</RainbowButton>
              </Link>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 max-w-[90vw] mx-auto select-none sm:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-6 justify-around items-center w-full h-full my-8 bg-[#0e1117] shadow-lg shadow-gray/5 rounded-xl p-8 border border-[#232221]">
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
            <p className="text-[#7f8083] font-light text-[14px]">Pools Launched</p>
          </div>

        </div>
        <div className="p-20">
          <div>
            <div className="lg:p-8">
              <p className={`text-[42px] lg:text-[72px] leading-[126px] text-center lg:text-start px-* font-[HeliukBrave]`}>
                FEATURES
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {features.map((feature, index) => (
                  <FeatureComponent key={index} {...feature} />
                ))}
              </div>
            </div>
            <div className=" flex justify-center items-center h-screen">

              <div className="font-normal font-heliukBrave text-[56px] md:text-[80px]  leading-[60px] md:leading-[80px]  lg:leading-[126px] lg:text-[90px] tracking-wide uppercase bg-gradient-to-br from-[#f3986d] to-[#b3c420] bg-clip-text text-transparent animate-typing">
                <h1 className="text-center">WHAT ARE YOU WAITING FOR?</h1>
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

          <ul className="flex justify-center items-center w-full -mb-[12px] lg:gap-4 z-40">
            {pages?.map((item) => (
              <li
                key={item.name}
                className={`p-2 relative group text-[12px] lg:text-[14px] cursor-pointer hover:text-[#f5ac40] transition-all duration-500 ease-in-out`}
              >
                <Link href={item?.url} className="relative group z-40">
                  <div className="flex justify-center items-center">
                    <p className="tracking-wide whitespace-nowrap text-[#d0d1d3]">
                      {item.name}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="z-50">
            <ul className="wrapper flex">
              <a href="https://www.telegram.com" target="_blank" rel="noreferrer">
                <li className="icon telegram">
                  <span className="tooltip">Telegram</span>
                  <FontAwesomeIcon icon={faTelegram} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                </li>
              </a>
              <a href="https://www.twiiter.com" rel="noreferrer" target="_blank">
                <li className="icon twitter">
                  <span className="tooltip">Twitter</span>
                  <FontAwesomeIcon icon={faTwitter} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                </li>
              </a>
              <a href="https://www.discord.com" target="_blank" rel="noreferrer">
                <li className="icon discord">
                  <span className="tooltip">Discord</span>
                  <FontAwesomeIcon icon={faDiscord} size="sm" className="bg-white text-black text-[12px] rounded-full p-[3px]" />
                </li>
              </a>
            </ul>
          </div>
        </div>
        <p className="text-[#d0d1d3] text-[14px] text-center bg-[#02040a] py-4 w-full">
          © 2024 BundlerdotSpace. All Rights Reserved.
        </p>
      </div >
    </>
  );
};

Home.getLayout = (page: ReactNode) => getHeaderLayout(page, "Home");

export default Home;