import { Metadata, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import useSWR from "swr";

const fetcher = async ({
  mint,
  connection,
}: {
  mint?: string;
  connection: Connection;
}): Promise<Metadata | null> => {
  if (!mint) return null;

  try {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        PROGRAM_ID.toBuffer(),
        new PublicKey(mint).toBuffer(),
      ],
      PROGRAM_ID
    );

    const metadata = await Metadata.fromAccountAddress(connection, metadataPDA);
    return metadata;
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return null;
  }
};

export const useMetaplexMetadata = (mint?: string) => {
  const { connection } = useConnection();

  const {
    data: metadata,
    error,
    isValidating,
    mutate,
  } = useSWR(
    () => mint && connection && ["metadata", mint, connection.rpcEndpoint],
    () => fetcher({ mint, connection }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      errorRetryCount: 1,
      onError: (err) => {
        console.error("Metadata fetch error:", err);
      },
    }
  );

  const loading = !metadata && !error;

  return {
    metadata,
    loading,
    error,
    isValidating,
    mutate,
  };
};