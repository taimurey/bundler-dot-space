"use client"

import { useState } from "react"
import { useAuth } from "../context/auth-provider"
import { Send, Loader2 } from "lucide-react"

export default function EmailAuth() {
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { loginWithEmail, state } = useAuth()

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (email.trim() && !isSubmitting && !state.loading) {
            setIsSubmitting(true)
            loginWithEmail(email)
                .finally(() => {
                    setTimeout(() => setIsSubmitting(false), 2000)
                })
        }
    }

    const isLoading = state.loading || isSubmitting

    return (
        <form onSubmit={handleEmailSubmit} className="flex w-full flex-col gap-3">
            <div className="relative">
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 transition-all"
                    required
                    disabled={isLoading}
                />
            </div>
            <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white hover:from-green-500 hover:to-green-600 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-green-800/30"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                    </>
                ) : (
                    <>
                        <Send className="h-4 w-4" />
                        <span>Continue with email</span>
                    </>
                )}
            </button>
        </form>
    )
} 