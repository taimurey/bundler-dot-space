import { PublicKey } from "@solana/web3.js"
import { metaplexMetadata } from "./constants"
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8"

export function getBondingCurve(mint: PublicKey, programId: PublicKey,) {
    const [pda] = PublicKey.findProgramAddressSync(
        [
            encode("bonding-curve"),
            mint.toBuffer(),
        ],
        programId,
    )
    return pda
}

export function getMetadataPda(mint: PublicKey) {
    const [metadataPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            new PublicKey(metaplexMetadata).toBuffer(),
            mint.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    )
    return metadataPda
}

