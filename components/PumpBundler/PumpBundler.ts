import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { generateBuyIx, generateCreatePumpTokenIx } from "./instructions";
import pumpIdl from "./pump-idl.json";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { getKeypairFromBs58 } from "./misc";
import { GLOBAL_STATE, PUMP_PROGRAM_ID } from './constants';
import { Connection, Keypair } from "@solana/web3.js";

interface PumpTokenCreator {
    buyerPrivateKey: string,
    deployerPrivateKey: string,
    ghostPrivateKey: string,
    tokenbuyAmount: string,
    metadataURI: string,
    tokenName: string,
    tokenSymbol: string,
    description: string,
    devBuyQuote: string,
    twitter?: string,
    telegram?: string,
    website?: string,
    tokenSupply: string,
    BlockEngineSelection: string,
    BundleTip: string,
    TransactionTip: string
}

async function PumpBundler(
    connection: Connection,
    pool_data: PumpTokenCreator
) {
    const TokenKeypair = Keypair.generate();
    const signerKeypair = getKeypairFromBs58(pool_data.deployerPrivateKey);

    if (!signerKeypair) {
        throw new Error("Invalid deployer private key");
    }

    const metadata: any = {
        name: pool_data.tokenName,
        symbol: pool_data.tokenSymbol,
        description: pool_data.description,
    };

    if (pool_data.twitter) {
        metadata.twitter = pool_data.twitter;
    }

    if (pool_data.telegram) {
        metadata.telegram = pool_data.telegram;
    }

    if (pool_data.website) {
        metadata.website = pool_data.website;
    }
    // Assuming pumpIdl is defined somewhere above and it includes the 'address' property
    // Also assuming PUMP_PROGRAM_ID is an instance of Provider
    const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(signerKeypair), AnchorProvider.defaultOptions()));
    const globalStateData = await pumpProgram.account.global.fetch(GLOBAL_STATE);


    const createIx = await generateCreatePumpTokenIx(TokenKeypair, signerKeypair, metadata, pool_data.metadataURI, pumpProgram);
    const tempBondingCurveData = {
        virtualTokenReserves: globalStateData.initialVirtualTokenReserves,
        virtualSolReserves: globalStateData.initialVirtualSolReserves,
        realTokenReserves: globalStateData.initialRealTokenReserves,
    }

    const devBuyIx = await generateBuyIx(TokenKeypair, pool_data.devBuyQuote, 0, pool_data.deployerPrivateKey, pumpProgram);
}