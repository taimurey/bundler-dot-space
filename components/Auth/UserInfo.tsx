"use client"

import { useState } from "react"
import { Loader2, Copy, CheckCircle2, RefreshCw } from "lucide-react"
import { useAuth } from "../context/auth-provider"
import { toast } from "sonner"
import { Button } from "../ui/button"

export default function UserInfo() {
    const { state, fetchWalletBalance } = useAuth()
    const { user } = state
    const [isCopying, setIsCopying] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                <p className="text-white">Loading user information...</p>
            </div>
        )
    }

    const copyWalletAddress = () => {
        if (!user.walletAddress) return

        setIsCopying(true)
        navigator.clipboard.writeText(user.walletAddress)
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

    const handleRefreshBalance = async () => {
        if (!user.walletAddress || isRefreshing) return

        setIsRefreshing(true)
        try {
            await fetchWalletBalance(user.walletAddress)
            toast.success("Balance updated successfully")
        } catch (error) {
            toast.error("Failed to update balance")
        } finally {
            setIsRefreshing(false)
        }
    }

    return (
        <div className="flex flex-col space-y-6 p-4 md:p-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-4 text-lg font-medium text-white">Account Information</h2>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-zinc-400">Email</p>
                        <p className="text-white">{user.email}</p>
                    </div>

                    <div>
                        <p className="text-sm text-zinc-400">User ID</p>
                        <p className="text-white">{user.id}</p>
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">Wallet Address</p>
                            {user.walletAddress && (
                                <button
                                    onClick={copyWalletAddress}
                                    className="flex items-center text-xs text-green-500 hover:text-green-400"
                                    disabled={isCopying}
                                >
                                    {isCopying ? (
                                        <>
                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-1 h-3 w-3" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        {user.walletAddress ? (
                            <p className="font-mono text-sm text-white">{user.walletAddress}</p>
                        ) : (
                            <div className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin text-green-500" />
                                <p className="text-sm text-zinc-400">Creating wallet...</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">SOL Balance</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRefreshBalance}
                                disabled={isRefreshing || !user.walletAddress}
                                className="flex h-6 items-center px-2 text-xs text-green-500 hover:bg-zinc-800 hover:text-green-400"
                            >
                                <RefreshCw className={`mr-1 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </Button>
                        </div>
                        {user.walletAddress ? (
                            <p className="font-mono text-sm text-white">
                                {typeof user.balance === 'number'
                                    ? `${user.balance.toFixed(6)} SOL`
                                    : 'Loading...'}
                            </p>
                        ) : (
                            <p className="text-sm text-zinc-400">
                                Waiting for wallet creation...
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-4 text-lg font-medium text-white">Authentication Method</h2>
                <div className="space-y-2">
                    <p className="text-sm text-zinc-400">Signed in with</p>
                    <p className="text-white">{user.session?.authClient || "Unknown"}</p>
                </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-4 text-lg font-medium text-white">Explorer Links</h2>
                <div className="space-y-2">
                    {user.walletAddress && (
                        <a
                            href={`https://explorer.solana.com/address/${user.walletAddress}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-md bg-zinc-800 p-2 text-center text-sm text-white hover:bg-zinc-700"
                        >
                            View Wallet on Solana Explorer
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
} 