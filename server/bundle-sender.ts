import { searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { jito_auth_keypair } from "../components/removeLiquidity/config";
import { BundleData } from "./server";
import { onBundleResult } from "../components/TransactionUtils/build-bundle";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";

export async function SendBundle(bundleData: BundleData) {

    const search = searcherClient(bundleData.blockengine, jito_auth_keypair);

    const versionedTxns = bundleData.txns.map(txn => {
        const txnBytes = base58.decode(txn);
        return VersionedTransaction.deserialize(txnBytes);
    });

    versionedTxns.forEach(txn => {
        console.log(txn.signatures.map(sig => base58.encode(sig)));
    });

    const bund = new Bundle([], 5);
    bund.addTransactions(...versionedTxns);

    const responseBundle = await search.sendBundle(bund);
    console.log(responseBundle);

    const bundle_result = await onBundleResult(search)
    if (bundle_result == 1
    ) {
        return responseBundle;
    } else {
        return bundle_result;
    }
}