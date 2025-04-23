"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import EmailAuth from "./EmailAuth"
import GoogleAuth from "./GoogleAuth"
import { useAuth } from "../context/auth-provider"
import BundlerLogo from "./BundlerLogo"
import { KeyIcon } from "lucide-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { FaWallet } from "react-icons/fa"

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { state } = useAuth()
    const { setVisible } = useWalletModal()

    const handleConnectWallet = () => {
        onClose()
        // Small delay to avoid UI glitches with overlapping modals
        setTimeout(() => setVisible(true), 100)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border border-zinc-800 shadow-2xl max-w-md">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-gray-100 font-medium text-xl">
                        <BundlerLogo className="mb-4" />
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 mt-2 px-1">
                    <div>
                        <h2 className="text-center text-lg font-medium text-white mb-4">Sign in or create account</h2>
                        <EmailAuth />
                    </div>

                    <div className="relative flex items-center justify-center my-1">
                        <div className="absolute w-full border-t border-zinc-700"></div>
                        <span className="relative bg-zinc-900 px-4 text-xs text-gray-400">
                            or continue with
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <GoogleAuth />

                        <button
                            onClick={handleConnectWallet}
                            className="flex w-3/4 items-center justify-center gap-2 rounded-sm mx-auto border border-zinc-700 bg-gradient-to-r bg-purple-300 p-2.5 text-black font-medium hover:from-purple-400 
                            hover:to-purple-400 duration-200 ease-in-out transition-colors shadow-md hover:shadow-purple-900/20"
                        >
                            <FaWallet className="h-5 w-5" />
                            <span className="text-sm font-medium">Connect Wallet</span>
                        </button>
                    </div>

                    {state.error && (
                        <div className="text-red-500 text-sm text-center mt-2">{state.error}</div>
                    )}
                </div>

                <div className="mt-4 text-center text-xs text-gray-500">
                    By continuing, you agree to Bundler.Space's Terms of Service and Privacy Policy
                </div>
            </DialogContent>
        </Dialog>
    )
} 