import { NextPage } from "next";
import { AppProps } from "next/app";
import { FC } from "react";
import "react-toastify/dist/ReactToastify.css";
import { SerumProvider } from "../components/context/SerumContext";
import { SolanaProvider } from "../components/context/SolanaContext";
import GlobalStyles from "../styles/GlobalStyles";
import { ToastContainer, toast } from "react-toastify";
import { MyContextProvider } from "../contexts/Maincontext";
import { HeroPattern } from '../components/HeroPattern';
// Use require instead of import  since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
require("../styles/globals.css");
require("react-toastify/dist/ReactToastify.css");


type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactNode) => React.ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const App: FC<AppPropsWithLayout> = ({
  Component,
  pageProps,
}: AppPropsWithLayout) => {
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <MyContextProvider>
      <SolanaProvider>
        <SerumProvider>
          <HeroPattern />
          <GlobalStyles />
          <ToastContainer position={toast.POSITION.BOTTOM_RIGHT} className="toast-container" />
          {getLayout(<Component {...pageProps} />)}
        </SerumProvider>
      </SolanaProvider>
    </MyContextProvider>
  );
};



export default App;
