"use client"
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { Connection } from "@solana/web3.js";
import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

export type ClusterType = "mainnet-beta" | "testnet" | "devnet" | "custom";

export type SolanaCluster = {
  label: string;
  network: ClusterType;
  endpoint: string;
};

type SolanaContextType = {
  cluster: SolanaCluster;
  setCluster: (cluster: SolanaCluster) => void;
  customEndpoint: string;
  setCustomEndpoint: (endpoint: string) => void;
  isActiveCluster: (selectedCluster: SolanaCluster) => boolean;
};

type SolanaProviderProps = {
  children: ReactNode;
};

const SolanaContext = createContext<SolanaContextType | null>(null);

export const CLUSTER_LOCAL_STORAGE_KEY = "cluster-serum-explorer";

export const LOCALNET_URL = "http://localhost:8899/";

export const CLUSTERS: SolanaCluster[] = [
  {
    label: "Mainnet Beta",
    network: "mainnet-beta",
    endpoint: process.env.NEXT_PUBLIC_MAINNET_URL ? process.env.NEXT_PUBLIC_MAINNET_URL : (() => { throw new Error("NEXT_PUBLIC_MAINNET_URL is not set") })()
  },
  //{
  //  label: "Testnet",
  //  network: "testnet",
  //  endpoint: clusterApiUrl("testnet"),
  //},
  {
    label: "Devnet",
    network: "devnet",
    endpoint: process.env.NEXT_PUBLIC_DEVNET_URL ? process.env.NEXT_PUBLIC_DEVNET_URL : (() => { throw new Error("NEXT_PUBLIC_DEVNET_URL is not set") })()
  },
  {
    label: "Custom RPC",
    network: "custom",
    endpoint: LOCALNET_URL,
  },
];

export const CUSTOM_RPC_CLUSTER = CLUSTERS[CLUSTERS.length - 1];

export const SolanaProvider = ({ children }: SolanaProviderProps) => {
  const [cluster, _setCluster] = useState(CLUSTERS[0]);
  const [customEndpoint, _setCustomEndpoint] = useState(LOCALNET_URL);

  // const handleCustomRPCSubmit = (userInput: string) => {
  //   if (cluster.network === "custom") {
  //     setCustomEndpoint(userInput);
  //   }
  // };

  const endpoint = useMemo(() => {
    if (cluster.network === "custom") {
      return customEndpoint;
    }
    return cluster.endpoint;
  }, [cluster, customEndpoint]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new TorusWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const isActiveCluster = (selectedCluster: SolanaCluster): boolean => {
    return selectedCluster.label === cluster.label;
  };

  const setCluster = (selectedCluster: SolanaCluster) => {
    if (selectedCluster.network === "custom") {
      const customEndpoint = localStorage.getItem(CLUSTER_LOCAL_STORAGE_KEY);
      if (customEndpoint) {
        _setCustomEndpoint(customEndpoint);
      } else {
        _setCustomEndpoint(LOCALNET_URL);
      }
    }

    _setCluster(selectedCluster);
  };

  const setCustomEndpoint = async (newEndpoint: string) => {
    if (cluster.network !== "custom") return;
    console.log("newEndpoint", newEndpoint);

    // Create a new Connection object with the custom RPC URL
    const connection = new Connection(newEndpoint);

    try {
      // Fetch a new slot to validate the custom RPC URL
      await connection.getSlot();

      // If the fetch is successful, update the custom RPC URL
      _setCustomEndpoint(newEndpoint);
    } catch (error) {
      // If the fetch fails, show an error toast
      toast.error("Invalid custom RPC URL");
    }
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaContext.Provider
            value={{
              cluster,
              setCluster,
              customEndpoint,
              setCustomEndpoint,
              isActiveCluster,
            }}
          >
            {children}
          </SolanaContext.Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export const useSolana = () => {
  const solana = useContext(SolanaContext);

  if (!solana)
    throw new Error("Make sure you wrap your component with SolanaProvider");

  return solana;
};
