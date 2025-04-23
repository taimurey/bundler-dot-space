"use client"

import { useState } from "react"
import { ChevronDown, Wallet, RefreshCw, ExternalLink, Copy, CheckCircle2, LayoutDashboard, SendHorizontal, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSolana } from "@/components/SolanaWallet/SolanaContext"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { TransferDialog } from "./TransferDialog"
import { useAuth } from "@/components/context/auth-provider"
import { toast } from "sonner"

interface WalletButtonProps {
    className?: string
}

export function WalletButton({ className }: WalletButtonProps) {
    const router = useRouter()
    const { state, logout, fetchWalletBalance } = useAuth()
    const { cluster } = useSolana()
    const [showTransferDialog, setShowTransferDialog] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isCopying, setIsCopying] = useState(false)

    // Format wallet address for display (e.g., "Gk7Si...1bP9")
    const formatAddress = (address: string) => {
        if (!address) return ""
        return `${address.slice(0, 5)}...${address.slice(-4)}`
    }

    // Handle refreshing the wallet balance
    const handleRefreshBalance = async () => {
        if (!state.user?.walletAddress || isRefreshing) return

        setIsRefreshing(true)
        try {
            await fetchWalletBalance(state.user.walletAddress)
            toast.success("Balance updated")
        } catch (error) {
            toast.error("Failed to update balance")
        } finally {
            setIsRefreshing(false)
        }
    }

    // Copy wallet address to clipboard
    const copyWalletAddress = () => {
        if (!state.user?.walletAddress) return

        setIsCopying(true)
        navigator.clipboard.writeText(state.user.walletAddress)
            .then(() => {
                toast.success("Wallet address copied to clipboard")
            })
            .catch(() => {
                toast.error("Failed to copy wallet address")
            })
            .finally(() => {
                setTimeout(() => setIsCopying(false), 2000)
            })
    }

    // Check if this is a demo wallet
    const isDemoWallet = state.user?.walletAddress?.includes('...');

    if (!state.user?.walletAddress) {
        return (
            <Button
                variant="outline"
                className={`border-indigo-600 text-indigo-500 hover:bg-indigo-600/10 ${className}`}
                disabled={state.loading}
            >
                <Wallet className="mr-2 h-4 w-4" />
                {state.loading ? "Creating Wallet..." : "Wallet Not Connected"}
            </Button>
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={`border-indigo-600 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 ${className}`}
                    >
                        <Wallet className="mr-2 h-4 w-4" />
                        <div className="flex items-center">
                            <span>{formatAddress(state.user?.walletAddress || "")}</span>
                            <span className="mx-1 text-zinc-500">|</span>
                            <span>{state.user?.balance?.toFixed(4) || "0.0000"} SOL</span>
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-zinc-900 border-zinc-800 text-white">
                    <div className="p-3">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-zinc-400">Wallet Address</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-zinc-800"
                                onClick={copyWalletAddress}
                                disabled={isCopying}
                            >
                                {isCopying ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                        <p className="font-mono text-xs break-all text-zinc-300">
                            {state.user?.walletAddress || ""}
                            {isDemoWallet && (
                                <span className="ml-1 text-yellow-500 text-xs">(Demo)</span>
                            )}
                        </p>
                    </div>

                    <DropdownMenuSeparator className="bg-zinc-800" />

                    <div className="p-3">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-zinc-400">Balance</p>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-zinc-800"
                                onClick={handleRefreshBalance}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        <p className="font-medium">{state.user?.balance?.toFixed(6) || "0.000000"} SOL</p>
                    </div>

                    <DropdownMenuSeparator className="bg-zinc-800" />

                    <DropdownMenuItem
                        className="cursor-pointer hover:bg-zinc-800 py-2.5"
                        onClick={() => router.push('/dashboard')}
                    >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                    </DropdownMenuItem>

                    {!isDemoWallet && (
                        <DropdownMenuItem
                            className="cursor-pointer hover:bg-zinc-800 py-2.5"
                            onClick={() => window.open(`https://solscan.io/account/${state.user?.walletAddress}${cluster.network !== 'mainnet-beta' ? `?cluster=${cluster.network}` : ''}`, "_blank")}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Solscan
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-zinc-800" />

                    <div className="px-3 py-2">
                        <p className="text-xs text-zinc-400">Connected as</p>
                        <p className="text-xs truncate text-zinc-300">{state.user?.email || "Unnamed User"}</p>
                    </div>

                    <DropdownMenuSeparator className="bg-zinc-800" />

                    <DropdownMenuItem
                        className="cursor-pointer text-red-400 hover:bg-zinc-800 hover:text-red-400 py-2.5"
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Disconnect
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <TransferDialog
                open={showTransferDialog}
                onOpenChange={setShowTransferDialog}
                walletAddress={state.user?.walletAddress}
                balance={state.user?.balance}
            />
        </>
    )
} 