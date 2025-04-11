import { Keypair } from "@solana/web3.js";
import base58 from "bs58";

export function getKeypairFromBs58(bs58String: string): Keypair | null {
    try {
        const privateKeyObject = base58.decode(bs58String);
        const privateKey = Uint8Array.from(privateKeyObject);
        const keypair = Keypair.fromSecretKey(privateKey);
        return keypair;
    } catch (e) {
        return null;
    }
}
