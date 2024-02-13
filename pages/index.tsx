import Image from "next/image";
import { ReactNode } from "react";
import { getSearchLayout } from "../components/layouts/SearchLayout";

const Home = () => {

  return (
    <div className="flex flex-col">
      <Image
        src="/hometext.svg"
        width={10}
        height={400}
        alt="Arcane Text"
        className=""
      />
    </div>
  );
};

Home.getLayout = (page: ReactNode) => getSearchLayout(page, "Home");

export default Home;
