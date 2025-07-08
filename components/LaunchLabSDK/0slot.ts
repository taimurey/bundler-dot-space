import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, VersionedTransaction } from "@solana/web3.js";

export const get0SlotTipInstruction = (fromPubkey: PublicKey, lamports: number) => {
    if (lamports < 1000000) throw new Error("Tip amount < 0.001 SOL");

    return SystemProgram.transfer({
        fromPubkey: fromPubkey,
        toPubkey: new PublicKey("4HiwLEP2Bzqj3hM2ENxJuzhcPCdsafwiet3oGkMkuQY4"),
        lamports: lamports,
    });
};
