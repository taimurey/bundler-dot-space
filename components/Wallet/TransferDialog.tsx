"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { transferSOL } from "@/lib/services/solana-wallet";
import { useAuth } from "@/components/context/auth-provider";

interface TransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    walletAddress?: string;
    balance?: number;
}

export function TransferDialog({
    open,
    onOpenChange,
    walletAddress = "",
    balance = 0,
}: TransferDialogProps) {
    const { fetchWalletBalance } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("send");
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [recipientError, setRecipientError] = useState("");
    const [amountError, setAmountError] = useState("");

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
        } else if (parseFloat(amount) > balance) {
            setAmountError("Amount exceeds your balance");
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateInputs() || !walletAddress) return;

        setIsLoading(true);

        try {
            // Use the real transfer function from our service
            const txId = await transferSOL(walletAddress, recipient, parseFloat(amount));

            toast.success("Transaction successfully sent to the Solana network");

            // Update the balance after transfer
            await fetchWalletBalance(walletAddress);

            // Close dialog and reset form
            onOpenChange(false);
            setRecipient("");
            setAmount("");

            // Open the transaction in explorer
            window.open(`https://explorer.solana.com/tx/${txId}?cluster=devnet`, "_blank");
        } catch (error) {
            console.error("Transfer error:", error);
            toast.error("There was an error processing your transaction. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Transfer SOL</DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogDescription className="text-zinc-400">
                        Send or receive SOL from your wallet
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="send" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                        <TabsTrigger value="send">Send</TabsTrigger>
                        <TabsTrigger value="receive">Receive</TabsTrigger>
                    </TabsList>

                    <TabsContent value="send">
                        <div className="space-y-6 pt-4">
                            <div>
                                <Label className="text-zinc-300">Recipient Address</Label>
                                <Input
                                    placeholder="Enter Solana address"
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

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Available Balance</span>
                                <span className="font-medium">{balance.toFixed(6)} SOL</span>
                            </div>

                            <div className="flex justify-between items-center text-sm text-zinc-400">
                                <span>Transaction Fee</span>
                                <span>~0.000005 SOL</span>
                            </div>

                            <DialogFooter>
                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isLoading}
                                    onClick={handleSubmit}
                                >
                                    {isLoading ? "Processing..." : "Send SOL"}
                                </Button>
                            </DialogFooter>
                        </div>
                    </TabsContent>

                    <TabsContent value="receive">
                        <div className="pt-4 space-y-6">
                            <div className="text-center">
                                <div className="bg-zinc-800 p-4 rounded-lg mx-auto w-56 h-56 flex items-center justify-center mb-4">
                                    {walletAddress ? (
                                        <div className="text-center">
                                            <div className="border-2 border-dashed border-zinc-700 w-40 h-40 mx-auto flex items-center justify-center mb-2">
                                                <span className="text-xs text-zinc-500">QR Code</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-zinc-500 text-sm">
                                            Connect your wallet to generate a QR code
                                        </p>
                                    )}
                                </div>

                                {walletAddress && (
                                    <div className="space-y-4">
                                        <div className="bg-zinc-800 p-2 rounded text-xs text-zinc-300 break-all">
                                            {walletAddress}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-zinc-700 bg-zinc-800 text-xs"
                                            onClick={() => {
                                                if (walletAddress) {
                                                    navigator.clipboard.writeText(walletAddress);
                                                    toast.success("Wallet address copied to clipboard");
                                                }
                                            }}
                                        >
                                            Copy Address
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// Export the component for ease of use
export default TransferDialog;