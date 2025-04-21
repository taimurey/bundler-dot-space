// import { PublicKey } from "@solana/web3.js";
// import Link from "next/link";
import {
  ChangeEvent,
  // MutableRefObject,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CLUSTERS,
  CUSTOM_RPC_CLUSTER,
  // useSerum,
  useSolana,
} from "@/components/SolanaWallet/SolanaContext";
// import { DEX_PROGRAMS } from "../../utils/constants";
// import { BookmarkIcon as BookmarkIconSolid } from "@heroicons/react/24/solid";
// import {
//   BookmarkIcon,
//   TrashIcon,
//   PencilIcon,
// } from "@heroicons/react/24/outline";
// import useProgramStore from "../../stores/programStore";
import { toast } from "sonner";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import debounce from "lodash.debounce";
import { truncate } from "../sidebar-drawer";

// type SettingPanelProps = {
//   close: (
//     focusableElement?:
//       | HTMLElement
//       | MutableRefObject<HTMLElement | null>
//       | undefined
//   ) => void;
// };
// { close }: SettingPanelProps
const SettingsPanel = () => {
  // const router = useRouter();

  const wallet = useWallet();
  // const { programID, setProgramID } = useSerum();
  const { setCluster, isActiveCluster, setCustomEndpoint, cluster } =
    useSolana();
  const { setVisible } = useWalletModal();

  // const [isProgramChanging, setIsProgramChanging] = useState(false);
  // const [customProgramID, setCustomProgramID] = useState(programID.toBase58());
  const [endpoint, setEndpoint] = useState(CUSTOM_RPC_CLUSTER.endpoint);

  // const { pinProgram, pinnedPrograms, unpinProgram, isPinned } =
  //   useProgramStore((s) => ({
  //     pinnedPrograms: s.pinnedPrograms,
  //     pinProgram: s.pinProgram,
  //     unpinProgram: s.unpinProgram,
  //     isPinned: s.isPinned,
  //   }));

  // const handleProgramChange = (programId: string) => {
  //   setProgramID(programId);
  //   setIsProgramChanging(false);
  // };

  // const handlePin = (programID: PublicKey) => {
  //   if (DEX_PROGRAMS[programID.toString()]) return;

  //   if (isPinned(programID.toString())) {
  //     unpinProgram(programID.toString());
  //   } else pinProgram(programID.toString());
  // };

  const customEndpointChangeHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setEndpoint(e.target.value);
  };

  const debouncedEndpointChangeHandler = useMemo(
    () => debounce(customEndpointChangeHandler, 1000),
    []
  );

  useEffect(() => {
    if (cluster.network === "custom") {
      try {
        const endpointURL = new URL(endpoint);
        if (endpointURL.toString() !== cluster.endpoint) {
          setCustomEndpoint(endpointURL.toString());
          toast.success("RPC endpoint updated!", {
            duration: 1000,
          });
        }
      } catch (e) {
        console.error(e);
        toast.error("Invalid RPC endpoint");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster, endpoint]);

  return (
    <div>
      <div className="mb-4 relative z-50">
        <div className="space-y-1.5">
          <h3 className="text-transparent bg-clip-text serum-gradient text-custom-green text-xs">
            Connection
          </h3>
          <ul className="space-y-1.5">
            {CLUSTERS.map((cluster) => {
              if (cluster.label !== "Custom RPC")
                return (
                  <li
                    key={cluster.endpoint}
                    onClick={() => setCluster(cluster)}
                    className={`${isActiveCluster(cluster) ? "bg-[#161a1b]" : ""
                      } hover:border-custom-green-300 grid grid-cols-2 border p-2 border-[#7a7a7a] cursor-pointer rounded-md`}
                  >
                    <div>
                      <h2 className="text-sm font-medium text-white">
                        {cluster.label}
                      </h2>
                    </div>
                  </li>
                );
            })}
            <li
              className={`${isActiveCluster(CUSTOM_RPC_CLUSTER)
                ? "bg-[#161a1b] py-2 "
                : ""
                } hover:border-custom-green-300 border p-2 border-[#7a7a7a] cursor-pointer rounded-md`}
              onClick={() => setCluster(CUSTOM_RPC_CLUSTER)}
            >
              <div>
                <h2 className="font-medium text-sm text-white">
                  Custom RPC
                </h2>
                {cluster.label === "Custom RPC" && (
                  <input
                    type="text"
                    defaultValue={CUSTOM_RPC_CLUSTER.endpoint}
                    onChange={debouncedEndpointChangeHandler}
                    className="border border-neutral-500 p-2 text-white text-sm font-normal font-mono rounded mt-1 w-full bg-neutral-700 focus:outline-none"
                  />
                )}
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div className="md:hidden">
        {wallet.connected ? (
          <div>
            <p className="text-xs text-transparent bg-clip-text text-custom-green">
              Wallet address{" "}
            </p>
            <span className="text-white mb-2 text-sm flex items-center gap-2">
              {truncate(wallet.publicKey?.toString() ?? "", 4, 4)}
            </span>
          </div>
        ) : null}
        <button
          onClick={() =>
            wallet.connected ? wallet.disconnect() : setVisible(true)
          }
          className="bg-custom-green-500 hover:bg-custom-green-300 transition-colors text-white rounded-md w-full py-2 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-custom-green-400 focus-visible:border-none"
        >
          {wallet.connected ? "Disconnect Wallet" : "Connect"}
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
