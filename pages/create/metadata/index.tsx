import { FC, useState } from "react";
import {
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  createSetAuthorityInstruction,
} from '@solana/spl-token-2';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { InputField } from "../../../components/FieldComponents/InputField";
import { toast } from "react-toastify";

const RevokeAuthorities: FC = () => {
  const { connection } = useConnection();
  const [status, setStatus] = useState<string>('');
  const [mintAddress, setMintAddress] = useState<string>('');
  const { publicKey, sendTransaction } = useWallet();

  const revokeFreeze = async () => {
    if (!publicKey) {
      setStatus('Please connect your wallet first');
      return;
    }

    try {
      const mintPublicKey = new PublicKey(mintAddress);


      const revokeFreeze = createSetAuthorityInstruction(
        mintPublicKey, // mint acocunt || token account
        publicKey, // current auth
        AuthorityType.FreezeAccount, // authority type
        null
      );

      const iTx = new Transaction().add(revokeFreeze);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const signature = await sendTransaction(iTx, connection, { minContextSlot });
      toast.info(`Transaction sent: ${signature}`);
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
      toast.success(`Transaction successful! ${signature}`);

      setStatus('Freeze authority revoked successfully');
    } catch (error) {
      console.error('Error revoking freeze authority:', error);
      setStatus('Error revoking freeze authority');
    }
  };

  const revokeMint = async () => {
    if (!publicKey) {
      setStatus('Please connect your wallet first');
      return;
    }

    try {
      const mintPublicKey = new PublicKey(mintAddress);



      const revokeMint = createSetAuthorityInstruction(
        mintPublicKey, // mint acocunt || token account
        publicKey, // current auth
        AuthorityType.MintTokens, // authority type
        null
      );

      const transaction = new Transaction().add(revokeMint);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      const signature = await sendTransaction(transaction, connection, { minContextSlot });
      toast.info(`Transaction sent: ${signature}`);
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
      toast.success(`Transaction successful! ${signature}`);

      setStatus('Mint authority revoked successfully');
    } catch (error) {
      console.error('Error revoking mint authority:', error);
      setStatus('Error revoking mint authority');
    }
  };

  return (
    <div className="p-4 md:hero">

      <div className="flex flex-col md:hero-content">

        <div>
          <h1 className="bg-gradient-to-r mt-10 from-[#5be2a3] to-[#ff9a03] bg-clip-text text-left text-2xl font-semibold text-transparent">
            Revoke Token Authorities
          </h1>
          <div className="relative rounded-md shadow-sm flex gap-2 justify-center">
            <InputField
              label="Mint Address"
              type="text"
              id="mintAddress"
              value={mintAddress}
              placeholder="Mint Address"
              onChange={(e) => setMintAddress(e.target.value)}
            />
            <button
              className="invoke-btn"
              onClick={() => setMintAddress('')}
              disabled={!mintAddress}
            >
              Load
            </button>
          </div>

          <div className="relative mt-1 rounded-md shadow-sm w-full flex gap-2">
            <button
              className="invoke-btn w-1/2"
              onClick={revokeFreeze}
              disabled={!mintAddress}
            >
              Revoke Freeze Authority
            </button>
            <button
              className="invoke-btn w-1/2"
              onClick={revokeMint}
              disabled={!mintAddress}
            >
              Revoke Mint Authority
            </button>
          </div>
          <div className="mt-3">
            <p>{status}</p>
          </div>
        </div>
      </div>
    </div>
  );

};

export default RevokeAuthorities;