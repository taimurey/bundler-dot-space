"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/context/auth-provider"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ExternalLink, Copy, CheckCircle2, Wallet, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function Dashboard() {
    const { state, fetchWalletBalance } = useAuth()
    const router = useRouter()
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isCopying, setIsCopying] = useState(false)

    // Redirect to home if not logged in
    useEffect(() => {
        if (!state.loading && !state.user) {
            router.push('/')
        }
    }, [state.loading, state.user, router])

    const handleRefreshBalance = async () => {
        if (!state.user?.walletAddress || isRefreshing) return

        setIsRefreshing(true)
        try {
            await fetchWalletBalance(state.user.walletAddress)
            toast.success("Balance updated successfully")
        } catch (error) {
            toast.error("Failed to update balance")
        } finally {
            setIsRefreshing(false)
        }
    }

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

    // Check if we're using a demo wallet (contains '...')
    const isDemoWallet = state.user?.walletAddress?.includes('...');

    if (state.loading || !state.user) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-center">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-indigo-600 rounded-full"
                        role="status" aria-label="loading">
                        <span className="sr-only">Loading...</span>
                    </div>
                    <p className="mt-2 text-zinc-400">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container px-4 py-12 mx-auto max-w-6xl">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-white">Your Wallet Dashboard</h1>
                <p className="text-zinc-400 mt-2">Manage your Solana wallet and assets</p>
            </div>

            {isDemoWallet && (
                <div className="mb-6 p-4 border border-yellow-600/30 bg-yellow-600/10 rounded-lg flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                    <div>
                        <p className="text-yellow-300 font-medium">Demo Mode Active</p>
                        <p className="text-yellow-300/70 text-sm">
                            You're using a simulated wallet. To use a real Turnkey wallet,
                            <Link href="https://docs.turnkey.com/concepts/policies/quickstart" target="_blank" className="ml-1 underline">
                                configure API permissions in Turnkey dashboard
                            </Link>.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-12 gap-8">
                {/* Left sidebar - User info */}
                <div className="md:col-span-4">
                    <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-indigo-600/20 mb-4">
                                <Wallet className="w-10 h-10 text-indigo-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-1">
                                {state.user.email}
                            </h2>
                            <p className="text-sm text-zinc-400 mb-5">
                                {state.user.session?.authClient || "User"}
                            </p>

                            {state.user.walletAddress ? (
                                <div className="flex flex-col w-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-zinc-400 text-sm">
                                            Wallet Address
                                            {isDemoWallet && (
                                                <span className="ml-2 text-xs text-yellow-500">(Demo)</span>
                                            )}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800"
                                            onClick={copyWalletAddress}
                                            disabled={isCopying}
                                        >
                                            {isCopying ? (
                                                <><CheckCircle2 className="mr-1 h-3 w-3" /> Copied</>
                                            ) : (
                                                <><Copy className="mr-1 h-3 w-3" /> Copy</>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="font-mono text-sm text-white border border-zinc-800 bg-black/20 rounded-md p-2 break-all">
                                        {state.user.walletAddress}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-4 border border-dashed border-zinc-700 rounded-md">
                                    <p className="text-zinc-400">Creating your wallet...</p>
                                    <div className="mt-2 animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-indigo-400 rounded-full"></div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Main content area */}
                <div className="md:col-span-8">
                    {/* Balance card */}
                    <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-white">
                                Wallet Balance
                                {isDemoWallet && (
                                    <span className="ml-2 text-xs text-yellow-500">(Simulated)</span>
                                )}
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-zinc-700 text-indigo-400 hover:text-indigo-300"
                                onClick={handleRefreshBalance}
                                disabled={isRefreshing || !state.user.walletAddress}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {state.user.walletAddress ? (
                            <div>
                                <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-6">
                                    <span className="text-4xl font-bold text-white">
                                        {typeof state.user.balance === 'number'
                                            ? state.user.balance.toFixed(6)
                                            : '0.000000'}
                                    </span>
                                    <span className="text-lg text-zinc-400">SOL</span>
                                </div>

                                <div className="border-t border-zinc-800 pt-4">
                                    <Button
                                        variant="default"
                                        className="bg-indigo-600 hover:bg-indigo-700 mr-3"
                                        onClick={() => router.push('/transfer')}
                                    >
                                        Send SOL
                                    </Button>
                                    {!isDemoWallet && (
                                        <Button
                                            variant="outline"
                                            className="border-zinc-700 text-white"
                                            onClick={() => {
                                                if (state.user && state.user.walletAddress) {
                                                    window.open(`https://explorer.solana.com/address/${state.user.walletAddress}?cluster=devnet`, "_blank")
                                                }
                                            }}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View on Explorer
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-6">
                                <p className="text-zinc-400">Waiting for wallet creation...</p>
                            </div>
                        )}
                    </Card>

                    {/* Transaction history card */}
                    <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg">
                        <h3 className="text-lg font-medium text-white mb-4">Recent Transactions</h3>

                        {state.user.walletAddress ? (
                            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-md">
                                <p className="text-zinc-400 mb-2">No transactions found</p>
                                <p className="text-sm text-zinc-500">
                                    Transactions will appear here once you start using your wallet
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-md">
                                <p className="text-zinc-400">
                                    Waiting for wallet creation to view transactions
                                </p>
                            </div>
                        )}
                    </Card>

                    {isDemoWallet && (
                        <div className="mt-6">
                            <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg">
                                <h3 className="text-lg font-medium text-white mb-4">Configure Turnkey</h3>
                                <p className="text-zinc-400 mb-4">
                                    You're currently using a simulated wallet because the necessary Turnkey API permissions aren't set up.
                                </p>
                                <div className="space-y-2 text-sm text-zinc-300">
                                    <p>To use real Turnkey wallets:</p>
                                    <ol className="list-decimal pl-4 space-y-2 text-zinc-400">
                                        <li>Go to your <a href="https://app.turnkey.com" target="_blank" className="text-indigo-400 hover:underline">Turnkey Dashboard</a></li>
                                        <li>Configure proper API permissions for wallet creation and signing</li>
                                        <li>Update your API keys in the application settings</li>
                                    </ol>
                                </div>
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        className="border-zinc-700 text-white"
                                        onClick={() => window.open('https://docs.turnkey.com/concepts/policies/quickstart', '_blank')}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View Turnkey Documentation
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
} 