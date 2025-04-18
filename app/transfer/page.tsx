"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/context/auth-provider"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { transferSOL } from "@/lib/services/solana-wallet"

export default function TransferPage() {
    const { state, fetchWalletBalance } = useAuth()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [recipient, setRecipient] = useState("")
    const [amount, setAmount] = useState("")
    const [recipientError, setRecipientError] = useState("")
    const [amountError, setAmountError] = useState("")
    const [txId, setTxId] = useState<string | null>(null)

    // Check if we're using a demo wallet
    const isDemoWallet = state.user?.walletAddress?.includes('...');

    // Redirect to dashboard if not logged in
    useEffect(() => {
        if (!state.loading && !state.user) {
            router.push('/dashboard')
        }
    }, [state.loading, state.user, router])

    const validateInputs = () => {
        let isValid = true;
        setRecipientError("");
        setAmountError("");

        if (!recipient) {
            setRecipientError("Recipient address is required");
            isValid = false;
        }

        if (!amount) {
            setAmountError("Amount is required");
            isValid = false;
        } else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            setAmountError("Amount must be a valid number greater than 0");
            isValid = false;
        } else if (state.user?.balance && parseFloat(amount) > state.user.balance) {
            setAmountError("Amount exceeds your balance");
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateInputs() || !state.user?.walletAddress) return;

        setIsLoading(true);

        try {
            // Use the real transfer function from our service
            const transactionId = await transferSOL(
                state.user.walletAddress,
                recipient,
                parseFloat(amount)
            );

            toast.success("Transaction successfully sent to the Solana network");

            // Update the balance after transfer
            await fetchWalletBalance(state.user.walletAddress);

            // Store transaction ID for explorer link
            setTxId(transactionId);

            // Clear form
            setRecipient("");
            setAmount("");
        } catch (error) {
            console.error("Transfer error:", error);
            toast.error("There was an error processing your transaction. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (state.loading || !state.user) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-center">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-indigo-600 rounded-full"
                        role="status" aria-label="loading">
                        <span className="sr-only">Loading...</span>
                    </div>
                    <p className="mt-2 text-zinc-400">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container px-4 py-12 mx-auto max-w-xl">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="text-zinc-400 hover:text-white"
                    onClick={() => router.push('/dashboard')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>
            </div>

            {isDemoWallet && !txId && (
                <div className="mb-6 p-4 border border-yellow-600/30 bg-yellow-600/10 rounded-lg flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-yellow-300 font-medium">Demo Wallet Transfer</p>
                        <p className="text-yellow-300/70 text-sm">
                            You're using a simulated wallet. Transfers will be simulated and no real SOL will be moved.
                            Any recipient address will work for testing purposes.
                        </p>
                    </div>
                </div>
            )}

            <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-xl shadow-lg">
                <h1 className="text-2xl font-bold text-white mb-6">
                    Send SOL
                    {isDemoWallet && (
                        <span className="ml-2 text-xs text-yellow-500">(Demo Mode)</span>
                    )}
                </h1>

                {txId ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-medium text-white mb-2">Transaction Successful</h2>
                        <p className="text-zinc-400 mb-6">
                            {isDemoWallet
                                ? "Your simulated transaction has been processed"
                                : "Your transaction has been sent to the Solana network"}
                        </p>

                        <div className="flex flex-col space-y-3">
                            {!isDemoWallet && txId && !txId.startsWith('demo-') && (
                                <Button
                                    variant="outline"
                                    className="border-zinc-700 text-white"
                                    onClick={() => window.open(`https://explorer.solana.com/tx/${txId}?cluster=devnet`, "_blank")}
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Transaction on Explorer
                                </Button>
                            )}

                            <Button
                                variant="default"
                                className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => {
                                    setTxId(null);
                                    setRecipient("");
                                    setAmount("");
                                }}
                            >
                                Send Another Transaction
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label className="text-zinc-300">Available Balance</Label>
                                <span className="text-white font-medium">
                                    {typeof state.user.balance === 'number'
                                        ? `${state.user.balance.toFixed(6)} SOL`
                                        : 'Loading...'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <Label className="text-zinc-300">Recipient Address</Label>
                            <Input
                                placeholder={isDemoWallet ? "Enter any address (demo mode)" : "Enter Solana address"}
                                className="bg-zinc-800 border-zinc-700 mt-1"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                            />
                            {recipientError && (
                                <p className="text-red-500 text-sm mt-1">{recipientError}</p>
                            )}
                        </div>

                        <div>
                            <Label className="text-zinc-300">Amount (SOL)</Label>
                            <div className="relative mt-1">
                                <Input
                                    placeholder="0.0"
                                    className="bg-zinc-800 border-zinc-700 pr-16"
                                    type="number"
                                    step="0.000001"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center">
                                    <span className="text-zinc-400">SOL</span>
                                </div>
                            </div>
                            {amountError && (
                                <p className="text-red-500 text-sm mt-1">{amountError}</p>
                            )}
                        </div>

                        <div className="flex justify-between items-center text-sm text-zinc-400">
                            <span>Transaction Fee</span>
                            <span>~0.000005 SOL</span>
                        </div>

                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            disabled={isLoading || !state.user.walletAddress}
                            onClick={handleSubmit}
                        >
                            {isLoading ? "Processing..." : isDemoWallet ? "Send SOL (Demo)" : "Send SOL"}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    )
} 