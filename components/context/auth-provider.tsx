"use client"

import {
    createContext,
    ReactNode,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AuthClient, STORAGE_KEY_USER_SESSION } from "@/lib/constants"
import { getStorageValue, setStorageValue, removeStorageValue } from "@/lib/utils/storage"
import { googleLogout } from "@react-oauth/google"
import { jwtDecode } from "jwt-decode"
import { createSolanaWallet as createTurnkeyWallet, getSolanaBalance } from "@/lib/services/solana-wallet"

// Define types
export type User = {
    email: string;
    id: string;
    walletAddress?: string;
    balance?: number;
    session?: {
        authClient: AuthClient;
    };
}

// Google token response type
interface GoogleTokenResponse {
    email: string;
    name?: string;
    picture?: string;
    sub: string;
    iat: number;
    exp: number;
}

export interface AuthState {
    loading: boolean;
    error: string;
    user: User | null;
}

interface AuthContextType {
    state: AuthState;
    loginWithEmail: (email: string) => Promise<void>;
    loginWithGoogle: (credential: string) => Promise<void>;
    logout: () => Promise<void>;
    createSolanaWallet: (userId: string) => Promise<string | undefined>;
    fetchWalletBalance: (address: string) => Promise<void>;
}

const initialState: AuthState = {
    loading: false,
    error: "",
    user: null,
}

const AuthContext = createContext<AuthContextType>({
    state: initialState,
    loginWithEmail: async () => { },
    loginWithGoogle: async () => { },
    logout: async () => { },
    createSolanaWallet: async () => undefined,
    fetchWalletBalance: async () => { },
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AuthState>(initialState)
    const router = useRouter()

    // Check for existing user session on mount
    useEffect(() => {
        const checkUserSession = async () => {
            const userSession = await getStorageValue<User>(STORAGE_KEY_USER_SESSION);
            if (userSession) {
                setState(prev => ({ ...prev, user: userSession }));

                // If user has a wallet, fetch the balance
                if (userSession.walletAddress) {
                    fetchWalletBalance(userSession.walletAddress);
                }
            }
        };

        checkUserSession();
    }, []);

    const setLoading = useCallback((loading: boolean) => {
        setState(prev => ({ ...prev, loading }))
    }, [])

    const setError = useCallback((error: string) => {
        setState(prev => ({ ...prev, error, loading: false }))
        if (error) {
            toast.error(error);
        }
    }, [])

    const fetchWalletBalance = async (address: string) => {
        if (!address || !state.user) return;

        try {
            const balance = await getSolanaBalance(address);
            const updatedUser = { ...state.user, balance };
            await setStorageValue(STORAGE_KEY_USER_SESSION, updatedUser);
            setState(prev => ({ ...prev, user: updatedUser }));
        } catch (error) {
            console.error("Failed to fetch wallet balance:", error);
        }
    };

    const setUser = useCallback(async (user: User | null) => {
        if (user) {
            // Store user in local storage
            await setStorageValue(STORAGE_KEY_USER_SESSION, user);

            // Update state
            setState(prev => ({ ...prev, user, loading: false, error: "" }))

            // If user has no wallet, create one
            if (!user.walletAddress) {
                try {
                    const walletAddress = await createSolanaWallet(user.id);
                    if (walletAddress) {
                        const updatedUser = { ...user, walletAddress };
                        await setStorageValue(STORAGE_KEY_USER_SESSION, updatedUser);
                        setState(prev => ({ ...prev, user: updatedUser }));

                        // Fetch the balance for the new wallet
                        fetchWalletBalance(walletAddress);
                    }
                } catch (error) {
                    console.error("Failed to create wallet:", error);
                }
            } else if (user.walletAddress) {
                // Fetch balance for existing wallet
                fetchWalletBalance(user.walletAddress);
            }
        } else {
            // Remove user from local storage
            await removeStorageValue(STORAGE_KEY_USER_SESSION);
            setState(prev => ({ ...prev, user: null, loading: false }));
        }
    }, [])

    // Create a Solana wallet for the user
    const createSolanaWallet = async (userId: string): Promise<string | undefined> => {
        try {
            setLoading(true);

            // Use the Turnkey service to create a real Solana wallet
            const address = await createTurnkeyWallet(userId);

            toast.success("Created your Solana wallet");
            setLoading(false);
            return address;
        } catch (error: any) {
            setError(error.message || "Failed to create wallet");
            return undefined;
        }
    };

    // Email login flow
    const loginWithEmail = async (email: string) => {
        setLoading(true)
        try {
            // In a real implementation, you would:
            // 1. Call your API to initiate email login
            // 2. Send a verification email to the user
            // 3. Redirect to a waiting page

            // For demo purposes, we'll simulate success
            setTimeout(async () => {
                const userId = `user-${Date.now()}`;
                await setUser({
                    email,
                    id: userId,
                    session: {
                        authClient: AuthClient.Email
                    }
                });
                toast.success("Successfully signed in");
                router.push("/dashboard"); // Redirect after login
            }, 1500)
        } catch (error: any) {
            setError(error.message || "Failed to login with email")
        }
    }

    // Google login
    const loginWithGoogle = async (credential: string) => {
        setLoading(true)
        try {
            // Decode the JWT token from Google
            const decodedToken = jwtDecode<GoogleTokenResponse>(credential);

            // Extract user info from the token
            const { email, sub } = decodedToken;

            if (!email) {
                throw new Error("No email found in Google token");
            }

            // Create the user account with email from Google token
            await setUser({
                email,
                id: `google-${sub}`,
                session: {
                    authClient: AuthClient.Google
                }
            });

            toast.success("Successfully signed in with Google");
            router.push("/dashboard");
        } catch (error: any) {
            console.error("Google login error:", error);
            setError(error.message || "Failed to login with Google");
            setLoading(false);
        }
    }

    // Logout
    const logout = async () => {
        setLoading(true)
        try {
            // If signed in with Google, also log out from Google
            if (state.user?.session?.authClient === AuthClient.Google) {
                googleLogout();
            }

            // Clear user state
            await setUser(null)
            toast.success("Successfully logged out");
            router.push("/")
        } catch (error: any) {
            setError(error.message || "Failed to logout")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthContext.Provider
            value={{
                state,
                loginWithEmail,
                loginWithGoogle,
                logout,
                createSolanaWallet,
                fetchWalletBalance
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext) 