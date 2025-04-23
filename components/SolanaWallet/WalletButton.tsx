import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KeyIcon, LogInIcon, CopyIcon, CheckIcon, LayoutDashboardIcon, SendHorizontalIcon, ExternalLinkIcon, LogOutIcon, AlertTriangleIcon } from "lucide-react";
import { FC, useState, useCallback } from "react";
import { useAuth } from "../context/auth-provider";
import AuthModal from "../Auth/AuthModal";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

  // Check if this is a demo wallet
  const isDemoWallet = authState.user?.walletAddress?.includes('...');

  const handleConnectClick = useCallback(() => {
    if (authState.user) {
      // User is logged in with email/Google
      setShowModal(true);
    } else if (wallet.connected) {
      // User is connected with wallet
      setShowModal(true);
    } else {
      // Show auth options modal
      setShowAuthModal(true);
    }
  }, [wallet.connected, authState.user]);

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
  };

  const handleConnectWallet = () => {
    setShowAuthModal(false);
    setVisible(true);
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

  return (
    <>
      <div className="relative flex justify-end px-4 text-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleConnectClick}
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
            ) : wallet.connected && wallet.publicKey ? (
              // Connected with wallet
              <div className="flex items-center bg-gradient-to-r from-indigo-800 to-indigo-900 text-gray-100 border border-indigo-700 rounded-lg px-3 py-2 shadow-lg hover:shadow-indigo-900/20 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200">
                <span className="text-sm flex items-center gap-2">
                  <Image src={wallet.wallet?.adapter?.icon || ""} alt="Wallet Icon" width={25} height={25} />
                  {`${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`}
                </span>
              </div>
            ) : (
              // Not connected
              <div className="flex items-center bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg px-5 py-2.5 shadow-lg hover:shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-600 transition-all duration-200">
                <LogInIcon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Sign In</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Wallet Connected Options Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 shadow-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-100 font-medium text-lg">
              Account Options
            </DialogTitle>
          </DialogHeader>

          {isDemoWallet && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-600/10 border border-yellow-600/30 mb-3">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 text-sm font-medium">Demo Wallet</p>
                <p className="text-yellow-300/70 text-xs">You're using a simulated wallet for demonstration purposes.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-2">
            {/* Wallet Address */}
            {currentWalletAddress && (
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-400">Wallet Address</span>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    {isDemoWallet && <span className="text-yellow-500">(Demo)</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-300 font-mono break-all">
                    {currentWalletAddress}
                  </p>
                  <button
                    onClick={handleCopyClick}
                    className="ml-2 p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400"
                  >
                    {isCopied ? (
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Balance (for auth user) */}
            {authState.user?.walletAddress && (
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-zinc-400">Balance</span>
                </div>
                <p className="text-lg font-medium text-white">
                  {typeof authState.user.balance === 'number'
                    ? `${authState.user.balance.toFixed(6)} SOL`
                    : '0.000000 SOL'}
                </p>
              </div>
            )}

            {/* Navigation buttons */}
            {authState.user && (
              <>
                <button
                  className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 text-gray-200 rounded-lg py-3 px-4 transition-colors duration-200 border border-zinc-700"
                  onClick={() => {
                    router.push('/dashboard');
                    setShowModal(false);
                  }}
                >
                  <span className="text-sm font-medium flex items-center">
                    <LayoutDashboardIcon className="h-4 w-4 mr-2" />
                    Dashboard
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
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </>
            )}

            {/* Wallet-specific buttons */}
            {wallet.connected && wallet.publicKey && !authState.user && (
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
            )}

            {/* Disconnect/Sign Out buttons */}
            {wallet.connected && (
              <button
                className="flex items-center justify-between bg-zinc-800 hover:bg-red-900/40 text-gray-200 rounded-lg py-3 px-4 transition-colors duration-200 border border-zinc-700"
                onClick={() => {
                  wallet.disconnect();
                  setShowModal(false);
                }}
              >
                <span className="text-sm font-medium">Disconnect Wallet</span>
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
            )}

            {authState.user && (
              <button
                className="flex items-center justify-between bg-zinc-800 hover:bg-red-900/40 text-gray-200 rounded-lg py-3 px-4 transition-colors duration-200 border border-zinc-700"
                onClick={() => {
                  logout();
                  setShowModal(false);
                }}
              >
                <span className="text-sm font-medium flex items-center">
                  <LogOutIcon className="h-4 w-4 mr-2" />
                  Sign Out
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
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            )}

            {/* Connect Wallet button when not connected */}
            {!wallet.connected && !authState.user && (
              <button
                className="flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 text-gray-200 rounded-lg py-3 px-4 transition-colors duration-200 border border-zinc-700"
                onClick={handleConnectWallet}
              >
                <span className="text-sm font-medium">Connect Wallet</span>
                <KeyIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletButton;