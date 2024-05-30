import { Keypair, TransactionInstruction } from "@solana/web3.js"

//types
export interface bundleWalletEntry {
    privateKey: string,
    sol: number,
}

export interface Metadata {
    name: string,
    symbol: string,
    description: string,
    twitter?: string,
    telegram?: string,
    website?: string
}

export interface TransactionSeeds {
    ixs: TransactionInstruction[],
    signers: Keypair[]
}

