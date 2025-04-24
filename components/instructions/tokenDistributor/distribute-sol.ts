import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { toast } from "sonner";
import base58 from "bs58";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { tipAccounts } from "../pump-bundler/constants";
import { distributeRandomly } from '../randomgen';

interface SOLMultisenderFormData {
    addresses: string[];
    amounts: number[];
    distribution: string;
    minAmount?: number;
    maxAmount?: number;
    totalAmount?: number;
    BlockEngineSelection: string;
    BundleTip: string;
}

/**
 * Prepares transaction objects for SOL distribution without signing them
 * @param connection Solana connection
 * @param fromPubkey Sender's public key
 * @param formData Distribution form data
 * @returns Array of unsigned VersionedTransaction objects
 */
export async function prepareDistributeSolTransactions(
    connection: Connection,
    fromPubkey: PublicKey,
    formData: SOLMultisenderFormData
): Promise<VersionedTransaction[]> {
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const transactions: VersionedTransaction[] = [];

    // Create transactions
    for (let i = 0; i < formData.addresses.length; i++) {
        try {
            const receiverAddress = new PublicKey(formData.addresses[i]);
            const amount = formData.amounts[i] * LAMPORTS_PER_SOL;

            const transferIx = SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: receiverAddress,
                lamports: amount
            });

            const messageV0 = new TransactionMessage({
                payerKey: fromPubkey,
                recentBlockhash,
                instructions: [transferIx]
            }).compileToV0Message();

            const tx = new VersionedTransaction(messageV0);
            transactions.push(tx);
        } catch (error) {
            console.error(`Error creating transaction for ${formData.addresses[i]}:`, error);
            throw error;
        }
    }

    // Add a tip transaction at the end
    if (parseFloat(formData.BundleTip) > 0) {
        try {
            const tipAmount = parseFloat(formData.BundleTip) * LAMPORTS_PER_SOL;
            const tipIx = SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: new PublicKey(tipAccounts[0]),
                lamports: tipAmount
            });

            const messageV0 = new TransactionMessage({
                payerKey: fromPubkey,
                recentBlockhash,
                instructions: [tipIx]
            }).compileToV0Message();

            const tipTx = new VersionedTransaction(messageV0);
            transactions.push(tipTx);
        } catch (error) {
            console.error("Error creating tip transaction:", error);
            // Continue without the tip transaction
        }
    }

    return transactions;
}

/**
 * Distributes SOL to multiple addresses using client-side transaction signing
 * @param connection Solana connection
 * @param wallet Wallet context for signing
 * @param formData Distribution form data
 * @returns Array of bundle IDs
 */
export async function distributeSol(
    connection: Connection,
    wallet: WalletContextState,
    formData: SOLMultisenderFormData
): Promise<string[]> {
    if (!wallet.publicKey || !wallet.signAllTransactions) {
        throw new Error("Wallet not connected or doesn't support signing");
    }

    const bundleIds: string[] = [];
    const transactions = await prepareDistributeSolTransactions(connection, wallet.publicKey, formData);

    // Sign all transactions
    try {
        const signedTransactions = await wallet.signAllTransactions(transactions);

        // Encode transactions
        const encodedTxns = signedTransactions.map(tx => base58.encode(tx.serialize()));

        // Send transactions in batches of 5
        for (let i = 0; i < encodedTxns.length; i += 5) {
            const batch = encodedTxns.slice(i, i + 5);

            try {
                // Get the current window.location.origin for absolute URL
                const origin = typeof window !== 'undefined' ? window.location.origin : '';

                // Make a request to the server-side API with absolute URL
                const response = await fetch(`${origin}/api/jito-bundle`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        blockEngineUrl: `https://${formData.BlockEngineSelection}`,
                        rpcEndpoint: connection.rpcEndpoint,
                        transactions: batch,
                        tipAmount: parseFloat(formData.BundleTip || "0.01") * LAMPORTS_PER_SOL
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to send Jito bundle');
                }

                // Show success message
                toast.success(`SOL distribution bundle sent! ID: ${data.bundleId.slice(0, 8)}...`);
                bundleIds.push(data.bundleId);

            } catch (error) {
                console.error("Error in sendBundle:", error);
                toast.error(`Failed to send bundle: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        }
    } catch (error) {
        console.error("Error signing transactions:", error);
        toast.error(`Failed to sign transactions: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }

    return bundleIds;
}