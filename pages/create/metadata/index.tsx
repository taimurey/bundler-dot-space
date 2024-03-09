import { FC, useState } from "react";
import { PublicKey } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  Mint,
  setAuthority,
  AuthorityType,
} from '@solana/spl-token-2';
import { MintCloseAuthority } from "@solana/spl-token-2";
import { useWallet } from '@solana/wallet-adapter-react';
import { InputField } from "../../liquidity/add";

const RevokeAuthorities: FC = () => {
  const [status, setStatus] = useState<string>('');
  const [mintAddress, setMintAddress] = useState<string>('');
  const [freezeAuthorityAddress, setFreezeAuthorityAddress] = useState<string>('');
  const wallet = useWallet();

  const revokeFreeze = async () => {
    if (!wallet.publicKey) {
      setStatus('Please connect your wallet first');
      return;
    }

    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const freezeAuthorityPublicKey = new PublicKey(freezeAuthorityAddress);

      const mintInfo = await Mint.fromAccountAddress(
        wallet.connection,
        mintPublicKey
      );

      const transaction = await setAuthority(
        wallet.connection,
        wallet.publicKey,
        mintPublicKey,
        freezeAuthorityPublicKey,
        AuthorityType.FreezeAccount,
        null,
        [],
        'Revoke freeze authority'
      );

      const signature = await wallet.sendTransaction(transaction, wallet.connection);
      await wallet.connection.confirmTransaction(signature, 'confirmed');

      setStatus('Freeze authority revoked successfully');
    } catch (error) {
      console.error('Error revoking freeze authority:', error);
      setStatus('Error revoking freeze authority');
    }
  };

  const revokeMint = async () => {
    if (!wallet.publicKey) {
      setStatus('Please connect your wallet first');
      return;
    }

    try {
      const mintPublicKey = new PublicKey(mintAddress);

      const mintInfo = await Mint.fromAccountAddress(
        wallet.connection,
        mintPublicKey
      );

      const transaction = await setAuthority(
        wallet.connection,
        wallet.publicKey,
        mintPublicKey,
        wallet.publicKey,
        AuthorityType.MintTokens,
        null,
        [],
        'Revoke mint authority'
      );

      const signature = await wallet.sendTransaction(transaction, wallet.connection);
      await wallet.connection.confirmTransaction(signature, 'confirmed');

      setStatus('Mint authority revoked successfully');
    } catch (error) {
      console.error('Error revoking mint authority:', error);
      setStatus('Error revoking mint authority');
    }
  };

  return (
    <div className="mx-auto min-w-full p-4 md:hero">
      <div className="flex flex-col md:hero-content">
        <h1 className="bg-gradient-to-tr from-[#9945FF] to-[#14F195] bg-clip-text text-left text-2xl font-bold text-transparent">
          Revoke Token Authorities
        </h1>
        <div>
          <div>
            <div className="relative mt-1 rounded-md shadow-sm w-full flex gap-2">
              <InputField
                label="Mint Address"
                type="text"
                id="mintAddress"
                value={mintAddress}
                placeholder="Mint Address"
                onChange={(e) => setMintAddress(e.target.value)}
              />
            </div>
            <div>
              <InputField
                label="Freeze Authority Address"
                type="text"
                id="freezeAuthorityAddress"
                value={freezeAuthorityAddress}
                placeholder="Freeze Authority Address"
                onChange={(e) => setFreezeAuthorityAddress(e.target.value)}
              />
            </div>
          </div>
          <div className="relative mt-1 rounded-md shadow-sm w-full flex gap-2">
            <button
              className="hover:bg-[#0094d8] bg-[#00b4d8] font-semibold h-[50px] rounded-md px-5 flex font-mono justify-center items-center w-full text-[#ffffff] text-[16px] mt-4"
              onClick={revokeFreeze}
              disabled={!wallet.publicKey || !mintAddress || !freezeAuthorityAddress}
            >
              Revoke Freeze Authority
            </button>
            <button
              className="hover:bg-[#0094d8] bg-[#00b4d8] font-semibold h-[50px] rounded-md px-5 flex font-mono justify-center items-center w-full text-[#ffffff] text-[16px] mt-4"
              onClick={revokeMint}
              disabled={!wallet.publicKey || !mintAddress}
            >
              Revoke Mint Authority
            </button>
          </div>
          {status && <p className="text-left">{status}</p>}
        </div>
      </div>
    </div>
  );

};

export default RevokeAuthorities;