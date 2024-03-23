import Image from "next/image";
import { ReactNode } from "react";
import { getSearchLayout } from "../components/layouts/SearchLayout";
import RightArrowIcon from "../components/icons/RightArrowIcon";
const Home = () => {

  return (
    <div className="flex flex-col max-w-[80vw] mx-auto">

      <div className="flex flex-col gap-12 justify-start  lg:justify-center lg:items-center  w-full min-h-[80vh] h-full lg:flex-row my-12 max-h-[1000px]">
        <div className=" max-w-[500px] flex flex-col gap-6 h-full">
          <p className="text-[42px] font-extrabold lg:text-[58px] lg:font-bold leading-[60px]  ">DEX Tooling for <span className="text-[#f5ac41]">Apes  & Degens</span></p>
          <p className="text-[18px] leading-[28px]">GitBook brings all your technical knowledge together in a single, centralized knowledge base. So you can access and add to it in the tools you use every day — using code, text or even your voice.</p>
          <div className="flex justify-start items-center gap-4 group cursor-pointer my-2">
            <button className="flex justify-center items-center w-[45px] h-[45px] rounded-full bg-[#f5ac41] group-hover:bg-[#808285]  transition-all ease-in-out duration-300">

              <RightArrowIcon width={20} height={20} />
            </button>
            <p className="uppercase font-semibold">Start For free</p>
          </div>
        </div>
        <div className="w-full min-w-[350px] border border-white  min-h-[80vh] max-h-[1000px] max-w-[1000px] bg-transparent flex justify-center items-center">
          <Image
            src="/heroimage.png"
            width={400}
            height={200}
            alt="Arcane Text"
            className="w-full"
          />
        </div>
      </div>

      <div className="my-12 flex flex-col gap-8">
        <p className="text-[28px] opacity-60 font-bold text-center">Trusted by technical teams at companies of all sizes
        </p>

      </div>
    </div>
  );
};

Home.getLayout = (page: ReactNode) => getSearchLayout(page, "Home");

export default Home;
