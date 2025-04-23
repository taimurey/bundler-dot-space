"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, User } from "@/components/context/auth-provider"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, ExternalLink, Copy, CheckCircle2, Wallet, AlertTriangle, Plus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TransferDialog from "@/components/Wallet/TransferDialog"
import { useSolana } from "@/components/SolanaWallet/SolanaContext"

export default function Dashboard() {
    const { state, fetchWalletBalance, importWallet, createNewWallet } = useAuth()
    const router = useRouter()
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isCopying, setIsCopying] = useState(false)
    const [transferDialogOpen, setTransferDialogOpen] = useState(false)
    const [selectedSourceWallet, setSelectedSourceWallet] = useState<string | null>(null)
    const [selectedDestWallet, setSelectedDestWallet] = useState<string | null>(null)
    const [privateKey, setPrivateKey] = useState("")
    const [walletName, setWalletName] = useState("")
    const [newWalletAddress, setNewWalletAddress] = useState("")
    const { cluster } = useSolana()

    // Redirect to home if not logged in
    useEffect(() => {
        if (!state.loading && !state.user) {
            router.push('/')
        }
    }, [state.loading, state.user, router])

    // Initialize selected wallet when user data changes
    useEffect(() => {
        if (state.user?.walletAddress && !selectedSourceWallet) {
            setSelectedSourceWallet(state.user.walletAddress)
        }
    }, [state.user, selectedSourceWallet])

    const handleRefreshBalance = async () => {
        if (!selectedSourceWallet || isRefreshing) return

        setIsRefreshing(true)
        try {
            await fetchWalletBalance(selectedSourceWallet)
            toast.success("Balance updated successfully")
        } catch (error) {
            toast.error("Failed to update balance")
        } finally {
            setIsRefreshing(false)
        }
    }

    const copyWalletAddress = (address: string) => {
        if (!address) return

        setIsCopying(true)
        navigator.clipboard.writeText(address)
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

    const handleImportWallet = async () => {
        if (!privateKey.trim()) {
            toast.error("Please enter a private key")
            return
        }

        const result = await importWallet(walletName || "Imported Wallet", privateKey)
        if (result) {
            setPrivateKey("")
            setWalletName("")
        }
    }

    const handleCreateNewWallet = async () => {
        const result = await createNewWallet(walletName || "New Wallet")
        if (result) {
            setNewWalletAddress("")
            setWalletName("")
        }
    }

    // Get the selected wallet's details
    const getSelectedWallet = () => {
        if (!state.user || !selectedSourceWallet) return null

        // Check if it's the main wallet
        if (state.user.walletAddress === selectedSourceWallet) {
            return {
                address: state.user.walletAddress,
                balance: state.user.balance || 0
            }
        }

        // Otherwise check in the wallets array
        const foundWallet = state.user.wallets?.find(w => w.address === selectedSourceWallet)
        if (foundWallet) {
            return {
                address: foundWallet.address,
                balance: foundWallet.balance || 0
            }
        }

        return null
    }

    // Check if we're using a demo wallet (contains '...')
    const isDemoWallet = state.user?.walletAddress?.includes('...');

    const openExplorer = (address: string) => {
        window.open(`https://solscan.io/account/${address}${cluster.network !== 'mainnet-beta' ? `?cluster=${cluster.network}` : ''}`, "_blank")
    }

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

    // At this point, we know state.user is not null
    const user: User = state.user
    const selectedWallet = getSelectedWallet()

    return (
        <div className="container px-4 py-12 mx-auto max-w-6xl">


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
                {/* Left sidebar - Wallet management */}
                <div className="md:col-span-4">
                    <div className="flex gap-3 mb-5">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                                    Import Wallet
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
                                <DialogHeader>
                                    <DialogTitle>Import Wallet</DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Import an existing wallet using private key
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="wallet-name">Wallet Name</Label>
                                        <Input
                                            id="wallet-name"
                                            placeholder="My Wallet"
                                            className="bg-zinc-800 border-zinc-700"
                                            value={walletName}
                                            onChange={(e) => setWalletName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="private-key">Private Key</Label>
                                        <Input
                                            id="private-key"
                                            type="password"
                                            placeholder="Enter your private key"
                                            className="bg-zinc-800 border-zinc-700"
                                            value={privateKey}
                                            onChange={(e) => setPrivateKey(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                                        onClick={handleImportWallet}
                                    >
                                        Import Wallet
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="w-full bg-zinc-800 hover:bg-zinc-700">
                                    Create Wallet
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] bg-zinc-900 text-white border-zinc-800">
                                <DialogHeader>
                                    <DialogTitle>Create New Wallet</DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Create a new Solana wallet
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-wallet-name">Wallet Name</Label>
                                        <Input
                                            id="new-wallet-name"
                                            placeholder="My New Wallet"
                                            className="bg-zinc-800 border-zinc-700"
                                            value={walletName}
                                            onChange={(e) => setWalletName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                                        onClick={handleCreateNewWallet}
                                    >
                                        Create Wallet
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Wallet list */}
                    <div className="space-y-4">
                        {/* Main wallet */}
                        {user.walletAddress && (
                            <Card
                                className={`bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg transition-all duration-200 cursor-pointer ${selectedSourceWallet === user.walletAddress ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : ''}`}
                                onClick={() => setSelectedSourceWallet(user.walletAddress || null)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600/20">
                                            <Wallet className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <h2 className="text-md font-semibold text-white">
                                            Axiom Main
                                        </h2>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (user.walletAddress) {
                                                copyWalletAddress(user.walletAddress);
                                            }
                                        }}
                                    >
                                        {isCopying && selectedSourceWallet === user.walletAddress ? (
                                            <><CheckCircle2 className="mr-1 h-3 w-3" /> Copied</>
                                        ) : (
                                            <><Copy className="mr-1 h-3 w-3" /> Copy</>
                                        )}
                                    </Button>
                                </div>
                                <div className="font-mono text-sm text-white border border-zinc-800 bg-black/20 rounded-md p-2 break-all mb-2">
                                    {user.walletAddress}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-sm">{(user.balance || 0).toFixed(6)} SOL</span>
                                    <span className="text-zinc-500 text-xs">{user.email}</span>
                                </div>
                            </Card>
                        )}

                        {/* Additional wallets */}
                        {user.wallets?.filter(w => w.address !== user.walletAddress).map((wallet) => (
                            <Card
                                key={wallet.id}
                                className={`bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg transition-all duration-200 cursor-pointer ${selectedSourceWallet === wallet.address ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : ''}`}
                                onClick={() => setSelectedSourceWallet(wallet.address)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600/20">
                                            <Wallet className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <h2 className="text-md font-semibold text-white">
                                            {wallet.name}
                                        </h2>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyWalletAddress(wallet.address);
                                        }}
                                    >
                                        {isCopying && selectedSourceWallet === wallet.address ? (
                                            <><CheckCircle2 className="mr-1 h-3 w-3" /> Copied</>
                                        ) : (
                                            <><Copy className="mr-1 h-3 w-3" /> Copy</>
                                        )}
                                    </Button>
                                </div>
                                <div className="font-mono text-sm text-white border border-zinc-800 bg-black/20 rounded-md p-2 break-all mb-2">
                                    {wallet.address}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400 text-sm">{(wallet.balance || 0).toFixed(6)} SOL</span>
                                    <span className="text-zinc-500 text-xs">{user.email}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Main content area */}
                <div className="md:col-span-8">
                    {/* Balance & Source Wallet card */}
                    <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-white">
                                Source Wallet
                                {isDemoWallet && (
                                    <span className="ml-2 text-xs text-yellow-500">(Simulated)</span>
                                )}
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-zinc-700 text-indigo-400 hover:text-indigo-300"
                                onClick={handleRefreshBalance}
                                disabled={isRefreshing || !selectedWallet}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {selectedWallet ? (
                            <div>
                                <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-4">
                                    <span className="text-4xl font-bold text-white">
                                        {selectedWallet.balance.toFixed(6)}
                                    </span>
                                    <span className="text-lg text-zinc-400">SOL</span>
                                </div>

                                <div className="flex items-center mb-4">
                                    <div className="font-mono text-sm text-white border border-zinc-800 bg-black/20 rounded-md p-2 break-all w-full">
                                        {selectedWallet.address}
                                    </div>
                                </div>

                                <div className="border-t border-zinc-800 pt-4">
                                    <Button
                                        variant="default"
                                        className="bg-indigo-600 hover:bg-indigo-700 mr-3"
                                        onClick={() => setTransferDialogOpen(true)}
                                    >
                                        Send SOL
                                    </Button>
                                    {!isDemoWallet && (
                                        <Button
                                            variant="outline"
                                            className="border-zinc-700 text-white"
                                            onClick={() => openExplorer(selectedWallet.address)}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            View on Explorer
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-6">
                                <p className="text-zinc-400">Select a wallet from the sidebar</p>
                            </div>
                        )}
                    </Card>

                    {/* Destination section */}
                    <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg mb-6">
                        <h3 className="text-lg font-medium text-white mb-4">
                            Destination
                        </h3>

                        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-zinc-800 rounded-lg mb-4">
                            <div className="text-center mb-4">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto text-zinc-600">
                                    <path d="M12 4v16m0-16l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <p className="text-zinc-400 mt-2">Drag wallets to distribute SOL</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4">
                            <div className="text-sm font-medium text-zinc-400">Wallet</div>
                            <div className="text-sm font-medium text-zinc-400">Balance</div>
                            <div className="text-sm font-medium text-zinc-400">Holdings</div>
                        </div>
                    </Card>

                    {/* Clear Tip card */}
                    <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-xl shadow-lg mb-6">
                        <Button variant="outline" className="w-full border-zinc-700">
                            Clear Tips
                        </Button>
                    </Card>
                </div>
            </div>

            {/* Transfer Modal */}
            {selectedWallet && (
                <TransferDialog
                    open={transferDialogOpen}
                    onOpenChange={setTransferDialogOpen}
                    walletAddress={selectedWallet.address}
                    balance={selectedWallet.balance}
                />
            )}
        </div>
    )
} 