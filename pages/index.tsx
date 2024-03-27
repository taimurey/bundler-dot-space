import { ReactNode } from "react";
import { getSearchLayout } from "../components/layouts/SearchLayout";
const Home = () => {

  return (
    <div className="flex flex-col max-w-[80vw] mx-auto">

      <div className="flex flex-col gap-12 justify-start  lg:justify-center lg:items-center  w-full h-full lg:flex-row my-12 max-h-[1000px]">
        <div className="max-w-[350px] lg:max-w-[700px] flex flex-col gap-6 h-full">

          <p className="text-[42px] lg:text-[126px]  leading-[126px] text-center font-[HeliukBrave]  uppercase ">Mevarik Sniper for<span className="text-[#f5ac41] mx-4 relative">Apes & Degens

          </span></p>
          <p className="text-[25px] text-center font-bold leading-[25px] tracking-wide ">Mevarik
            <br />
            <span className="font-normal text-[18px]">Snipe upcoming launches or safely trade tokens that are already live</span>
          </p>
        </div>
      </div>
    </div >
  );
};

Home.getLayout = (page: ReactNode) => getSearchLayout(page, "Home");

export default Home;
