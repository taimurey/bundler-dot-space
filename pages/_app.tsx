import { NextPage } from "next";
import { AppProps } from "next/app";
import { FC } from "react";
import "react-toastify/dist/ReactToastify.css";
import { SerumProvider } from "../context/SerumContext";
import { SolanaProvider } from "../context/SolanaContext";
import GlobalStyles from "../styles/GlobalStyles";
import { ToastContainer, toast } from "react-toastify";

// Use require instead of import since order matters
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
    <SolanaProvider>
      <SerumProvider>
        <GlobalStyles />
        <ToastContainer position={toast.POSITION.BOTTOM_RIGHT} className="toast-container" />
        {getLayout(<Component {...pageProps} />)}
      </SerumProvider>
    </SolanaProvider>
  );
};



export default App;
