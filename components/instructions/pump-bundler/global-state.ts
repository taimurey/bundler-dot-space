import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export async function getGlobalStateData(
    connection: Connection,
    globalStateAddress: PublicKey
): Promise<{
    initialVirtualTokenReserves: BN;
    initialVirtualSolReserves: BN;
    initialRealTokenReserves: BN;
}> {
    const accountInfo = await connection.getAccountInfo(globalStateAddress);
    if (!accountInfo) {
        throw new Error('Global state account not found');
    }

    // Skip 8 bytes discriminator
    const data = accountInfo.data.slice(8);

    // Skip 1 byte for initialized (bool)
    // Skip 32 bytes for authority
    // Skip 32 bytes for fee_recipient
    const offset = 1 + 32 + 32;

    // Read the u64 values directly from buffer
    const initialVirtualTokenReserves = new BN(data.slice(offset, offset + 8), 'le');
    const initialVirtualSolReserves = new BN(data.slice(offset + 8, offset + 16), 'le');
    const initialRealTokenReserves = new BN(data.slice(offset + 16, offset + 24), 'le');

    return {
        initialVirtualTokenReserves,
        initialVirtualSolReserves,
        initialRealTokenReserves,
    };
}

// Usage in your PumpBundler:
/*
const globalStateData = await getGlobalStateData(connection, new PublicKey(GLOBAL_STATE));

const tempBondingCurveData = {
    virtualTokenReserves: globalStateData.initialVirtualTokenReserves,
    virtualSolReserves: globalStateData.initialVirtualSolReserves,
    realTokenReserves: globalStateData.initialRealTokenReserves,
};
*/