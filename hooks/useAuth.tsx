"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

interface User {
    walletAddress: string
    displayName?: string
    publicKey: PublicKey
}

interface AuthContextType {
    isAuthenticated: boolean
    isLoading: boolean
    currentUser: User | null
    signIn: () => Promise<void>
    signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isLoading: true,
    currentUser: null,
    signIn: async () => { },
    signOut: () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const { select, publicKey, disconnect, connected, connecting, wallets } = useWallet()

    // Check for existing auth state on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                if (connected && publicKey) {
                    setCurrentUser({
                        walletAddress: publicKey.toBase58(),
                        publicKey,
                    })
                }
            } catch (error) {
                console.error("Authentication check failed:", error)
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [connected, publicKey])

    // Update user state when wallet connection changes
    useEffect(() => {
        if (connected && publicKey) {
            setCurrentUser({
                walletAddress: publicKey.toBase58(),
                publicKey,
            })
        } else if (!connected) {
            setCurrentUser(null)
        }
    }, [connected, publicKey])

    const signIn = async () => {
        try {
            setIsLoading(true)
            // If wallets are available, select the first one (usually Phantom)
            const availableWallet = wallets.length > 0 ? wallets[0].adapter : null

            if (availableWallet) {
                await select(availableWallet.name)
            } else {
                throw new Error("No wallet found. Please install a Solana wallet extension.")
            }
        } catch (error) {
            console.error("Sign in failed:", error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const signOut = () => {
        disconnect()
        setCurrentUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: !!currentUser,
                isLoading,
                currentUser,
                signIn,
                signOut
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
} 