import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KeyIcon, LogInIcon, CopyIcon, CheckIcon, LayoutDashboardIcon, SendHorizontalIcon, ExternalLinkIcon, LogOutIcon, AlertTriangleIcon } from "lucide-react";
import { FC, useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../context/auth-provider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaWallet } from "react-icons/fa";

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
  const { state: authState, logout } = useAuth();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if this is a demo wallet
  const isDemoWallet = authState.user?.walletAddress?.includes('...');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCopyClick = () => {
    if (authState.user?.walletAddress) {
      copyTextToClipboard(authState.user.walletAddress)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 1500);
        })
        .catch(console.error);
    } else if (wallet.publicKey) {
      copyTextToClipboard(wallet.publicKey.toBase58())
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 1500);
        })
        .catch(console.error);
    }
    setShowDropdown(false);
  };

  const handleConnectWallet = () => {
    setShowAuthModal(false);
    setShowModal(true);
    setVisible(true);
  };

  const handleDisconnectWallet = () => {
    if (wallet.disconnect) {
      wallet.disconnect();
    }
    setShowDropdown(false);
  };

  // Format wallet address for display (e.g., "Gk7Si...1bP9")
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  // Get the current wallet info - prioritize auth user's wallet over connected wallet
  const currentWalletAddress = authState.user?.walletAddress || (wallet.publicKey ? wallet.publicKey.toBase58() : "");
  const formattedAddress = formatAddress(currentWalletAddress);
  const balance = authState.user?.balance || 0;

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  return (
    <>
      <div className="relative flex justify-end px-4 text-md">
        <div className="flex items-center gap-3" ref={dropdownRef}>
          {(authState.user || (wallet.connected && wallet.publicKey)) ? (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="font-medium select-none"
              >
                {authState.user ? (
                  // Logged in with auth + wallet info
                  <div className="flex items-center bg-gradient-to-r from-indigo-800 to-indigo-900 text-gray-100 border border-indigo-700 rounded-lg px-4 py-2.5 shadow-lg hover:shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200">
                    <div className="flex items-center">
                      <span className="text-sm mr-2">{formattedAddress}</span>
                      {typeof balance === 'number' && (
                        <>
                          <span className="text-xs text-zinc-400 mx-1">|</span>
                          <span className="text-sm">{balance.toFixed(4)} SOL</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  // Connected with wallet
                  <div className="flex items-center bg-gradient-to-r from-indigo-800 to-indigo-900 text-gray-100 border border-indigo-700 rounded-lg px-3 py-2 shadow-lg hover:shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200">
                    <span className="text-sm flex items-center gap-2">
                      <Image src={wallet.wallet?.adapter?.icon || ""} alt="Wallet Icon" width={25} height={25} />
                      {wallet.publicKey && `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`}
                    </span>
                  </div>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-10">
                  <button
                    onClick={handleCopyClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"
                  >
                    {isCopied ? <CheckIcon className="h-4 w-4 mr-2" /> : <CopyIcon className="h-4 w-4 mr-2" />}
                    {isCopied ? "Copied!" : "Copy Address"}
                  </button>

                  <button
                    onClick={handleDisconnectWallet}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-200 hover:bg-zinc-700"
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className="flex flex-row items-center justify-center gap-2 rounded-sm mx-auto border border-zinc-700 bg-gradient-to-r bg-purple-300 p-2.5 text-black font-medium hover:from-purple-400 
              hover:to-purple-400 duration-200 ease-in-out transition-colors shadow-md hover:shadow-purple-900/20"
            >
              <FaWallet className="h-5 w-5" />
              <span className="text-sm font-medium">Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default WalletButton;