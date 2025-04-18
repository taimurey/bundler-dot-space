import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KeyIcon } from "lucide-react";
import { FC, useState, useCallback } from "react";
import SettingsPanel from "./SettingsPanel";
import { PiGearBold } from "react-icons/pi";

// Utility
const copyTextToClipboard = async (text: string) => {
  if ("clipboard" in navigator) {
    return await navigator.clipboard.writeText(text);
  } else {
    return document.execCommand("copy", true, text);
  }
};

const WalletButton: FC = () => {
  const wallet = useWallet();
  const { visible, setVisible } = useWalletModal();

  const [showModal, setShowModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleConnectClick = useCallback(() => {
    if (wallet.connected) {
      setShowModal(true);
    } else {
      setVisible(true);
    }
  }, [wallet.connected, setVisible]);

  const handleCopyClick = () => {
    if (!wallet.publicKey) return;
    copyTextToClipboard(wallet.publicKey.toBase58())
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500);
      })
      .catch(console.error);
  };

  return (
    <>
      <div className="relative flex justify-end px-4 text-md">
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center text-gray-200 text-sm font-medium rounded-lg w-10 h-10 transition-colors duration-200 border border-zinc-700 shadow-md">
                <PiGearBold className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <SettingsPanel />
            </DialogContent>
          </Dialog>

          <button
            onClick={handleConnectClick}
            className="solape__connect-btn font-medium select-none"
          >
            {wallet.connected && wallet.publicKey ? (
              <div className="flex items-center bg-gradient-to-r from-emerald-900 to-zinc-800 text-gray-100 border border-emerald-800 rounded-lg px-4 py-2.5 shadow-lg hover:shadow-emerald-900/20 transition-all duration-200">
                <span className="text-sm">
                  {`${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`}
                </span>
              </div>
            ) : (
              <div className="flex items-center bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg px-5 py-2.5 shadow-lg hover:shadow-emerald-600/30 hover:from-emerald-500 hover:to-emerald-600 transition-all duration-200">
                <KeyIcon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Connect Wallet</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 shadow-2xl">
          <DialogHeader>
            {/* Keep existing DialogTitle since it's visible */}
            <DialogTitle className="text-gray-100 font-medium text-lg">
              Wallet Options
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 mt-2">
            <button
              className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 text-gray-200 rounded-lg py-3 px-4 transition-colors duration-200 border border-zinc-700"
              onClick={handleCopyClick}
            >
              <span className="text-sm font-medium">
                {isCopied ? "Address Copied!" : "Copy Address"}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
              </svg>
            </button>

            <button
              className="flex items-center justify-between bg-zinc-800 hover:bg-red-900/40 text-gray-200 rounded-lg py-3 px-4 transition-colors duration-200 border border-zinc-700"
              onClick={() => {
                wallet.disconnect();
                setShowModal(false);
              }}
            >
              <span className="text-sm font-medium">Disconnect</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletButton;