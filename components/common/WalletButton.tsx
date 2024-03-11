import { KeyIcon } from "@heroicons/react/24/outline";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { FC, useRef, useState } from "react";
import { useOutsideAlerter } from "../../hooks/useOutsideAlerter";
import { copyTextToClipboard } from "../../utils/general";

const WalletButton: FC = () => {
  const wallet = useWallet();
  const { visible, setVisible } = useWalletModal();

  const [showDropdown, setShowDropdown] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  useOutsideAlerter(dropdownRef, showDropdown, () => setShowDropdown(false));

  const handleCopyClick = () => {
    if (!wallet.publicKey) return;

    // Asynchronously call copyTextToClipboard
    copyTextToClipboard(wallet.publicKey.toBase58())
      .then(() => {
        // If successful, update the isCopied state value
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1500);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="relative flex justify-end z-auto" ref={dropdownRef}>
      <button
        onClick={
          wallet.connected
            ? () => {
              setShowDropdown(!showDropdown);
            }
            : () => setVisible(!visible)
        }
        className="solape__connect-btn font-mono"
      >
        <div className="md:block hidden py-2 px-4 text-sm text-white group-hover:text-slate-300">
          {wallet.connected && wallet.publicKey
            ? `${wallet.publicKey.toString().slice(0, 9)}...`
            : <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgba(199,242,132,1)] to-[rgba(0,190,240,1)] font-semibold font-mono hover:animate-hue">Connect Wallet</span>}
        </div>
        <div className="md:hidden p-1.5">
          <KeyIcon className="h-5 w-5" />
        </div>
      </button>
      <ul
        className={`${showDropdown ? "block" : "hidden"
          } absolute top-full w-64 my-2 settings__connect-btn  flex flex-col space-y-1 `}
      >
        <li
          className="hover:bg-gradient-to-r from-[#3d5046] font-mono rounded-t-lg to-[#535353] py-2 px-5 cursor-pointer"
          onClick={handleCopyClick}
        >
          <div>
            <p className="text-sm text-white ">
              {isCopied ? "Copied!" : "Copy Address"}
            </p>
          </div>
        </li>
        <li
          className={`hover:bg-gradient-to-r from-[#3d5046] font-mono rounded-b-lg to-[#535353] py-2 px-5 cursor-pointer"`}
          onClick={() => {
            wallet.disconnect();
            setShowDropdown(false);
          }}
        >
          <div>
            <h2 className="text-sm text-white">Disconnect</h2>
          </div>
        </li>
      </ul>
    </div>
  );
};

export default WalletButton;