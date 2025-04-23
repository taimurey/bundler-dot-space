"use client"

import { useState } from "react"
import { useAuth } from "@/components/context/auth-provider"
import { Button } from "@/components/ui/button"
import { SearchIcon, PlusIcon, ArrowDownIcon, DownloadIcon } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"

// Wallet type definition
interface WalletItem {
    id: string
    name: string
    address: string
    balance: number
    type: "main" | "regular"
}

export function EmbeddedWallet() {
    const { state } = useAuth()
    const { user } = state

    // Mock wallets - in a real app, this would come from your wallet provider
    const [wallets, setWallets] = useState<WalletItem[]>([
        {
            id: "1",
            name: "Axiom Main",
            address: "5aTU...pnfm",
            balance: 0,
            type: "main"
        },
        {
            id: "2",
            name: "Wallet",
            address: "3RE2...cRQ",
            balance: 0,
            type: "regular"
        }
    ])

    const [showArchived, setShowArchived] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Filter wallets based on search query
    const filteredWallets = wallets.filter(wallet =>
        wallet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet.address.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!user) {
        return (
            <div className="p-6 text-center text-gray-400">
                Please sign in to view your wallet
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        className="pl-9 pr-4 py-2 h-10 bg-zinc-800 border-zinc-700 text-sm w-[300px]"
                        placeholder="Search by name or address"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 text-sm text-gray-400">
                        <input
                            type="checkbox"
                            checked={showArchived}
                            onChange={() => setShowArchived(!showArchived)}
                            className="rounded bg-zinc-800 border-zinc-700"
                        />
                        <span>Show Archived</span>
                    </label>

                    <Button variant="outline" className="text-sm border-zinc-700 bg-zinc-800">
                        Import
                    </Button>

                    <Button className="text-sm bg-indigo-600 hover:bg-indigo-700">
                        Create Wallet
                    </Button>
                </div>
            </div>

            <div className="w-full">
                <div className="grid grid-cols-2 divide-x divide-zinc-800">
                    <div>
                        <div className="grid grid-cols-4 px-4 py-3 text-xs text-gray-400 border-b border-zinc-800">
                            <div className="col-span-2">Wallet</div>
                            <div>Balance</div>
                            <div>Holdings</div>
                            <div className="text-right">Actions</div>
                        </div>

                        {/* Source wallets list */}
                        <div className="divide-y divide-zinc-800/50">
                            {filteredWallets.map(wallet => (
                                <div key={wallet.id} className="grid grid-cols-4 px-4 py-3 hover:bg-zinc-800/30">
                                    <div className="col-span-2 flex items-center">
                                        <div className={`w-5 h-5 rounded-sm mr-3 ${wallet.type === 'main' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{wallet.name}</div>
                                            <div className="text-xs text-gray-500">{wallet.address}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center text-gray-300">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1 text-indigo-400">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                            <path d="M8 13.5L12 9.5L16 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {wallet.balance}
                                    </div>
                                    <div className="flex items-center">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1 text-gray-600">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                            <path d="M8 13.5L12 9.5L16 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        0
                                    </div>
                                    <div className="flex items-center justify-end space-x-2">
                                        <button className="p-1 text-gray-400 hover:text-gray-300">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                        <button className="p-1 text-gray-400 hover:text-gray-300">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Destination section */}
                    <div>
                        <div className="h-full flex flex-col">
                            <div className="grid grid-cols-4 px-4 py-3 text-xs text-gray-400 border-b border-zinc-800">
                                <div className="col-span-2">Wallet</div>
                                <div>Balance</div>
                                <div>Holdings</div>
                                <div className="text-right">Actions</div>
                            </div>

                            <div className="flex-grow flex flex-col items-center justify-center p-10 text-center">
                                <ArrowDownIcon className="h-10 w-10 text-gray-700 mb-4" />
                                <p className="text-sm text-gray-500">Drag wallets to distribute SOL</p>
                            </div>

                            <div className="border-t border-zinc-800 px-4 py-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-gray-300 font-medium">Destination</h3>
                                    <Button size="sm" variant="outline" className="text-xs border-zinc-700 bg-zinc-800">
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 