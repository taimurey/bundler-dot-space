import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KeyIcon } from "lucide-react";
import { FC, useState, useCallback } from "react";
import SettingsPanel from "./SettingsPanel";
import { PiGearBold } from "react-icons/pi";

// Utility
const copyTextToClipboard = async (text: string) => {
  if ('clipboard' in navigator) {
    return await navigator.clipboard.writeText(text);
  } else {
    return document.execCommand('copy', true, text);
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
      <div className="relative flex justify-end pt-4 px-4 text-md">
        <div>
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center p-2 rounded-full text-white/70 hover:text-white">
                <PiGearBold className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <SettingsPanel />
            </DialogContent>
          </Dialog>
        </div>
        <div>
          <button
            onClick={handleConnectClick}
            className="solape__connect-btn font-mono select-none"
          >
            <div className={
              wallet.connected && wallet.publicKey
                ? "bg-emerald-600 hover:bg-emerald-700 text-clip font-mono rounded-md px-2 py-1"
                : "bg-emerald-100 text-black px-2 py-1 rounded-md"
            }>
              {wallet.connected && wallet.publicKey
                ? `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`
                : (
                  <span className={
                    wallet.connected && wallet.publicKey
                      ? "bg-emerald-100 text-black py-1 rounded-md"
                      : "bg-emerald-100 text-black py-1 rounded-md"
                  }>
                    Connect Wallet
                  </span>
                )}
            </div>
            <div className="md:hidden p-1.5">
              <KeyIcon className="h-5 w-5" />
            </div>
          </button>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[#1f1f1f] border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white font-mono">Wallet Options</DialogTitle>
          </DialogHeader>

          <div
            className="hover:bg-gradient-to-r from-[#3d5046] to-[#535353] font-mono rounded-lg py-2 px-5 cursor-pointer"
            onClick={handleCopyClick}
          >
            <p className="text-sm text-white">
              {isCopied ? "Copied!" : "Copy Address"}
            </p>
          </div>

          <div
            className="hover:bg-gradient-to-r from-[#3d5046] to-[#535353] font-mono rounded-lg py-2 px-5 cursor-pointer"
            onClick={() => {
              wallet.disconnect();
              setShowModal(false);
            }}
          >
            <h2 className="text-sm text-white">Disconnect</h2>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletButton;
