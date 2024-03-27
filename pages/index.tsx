import React, { ReactNode } from "react";
import { getSearchLayout } from "../components/layouts/SearchLayout";

const Home = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col max-w-[80vw] mx-auto">
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
    </div>
  );
};

Home.getLayout = (page: ReactNode) => getSearchLayout(page, "Home");

export default Home;