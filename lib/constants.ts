// Auth storage constants
export const STORAGE_KEY_USER_SESSION = "bundler-user-session";
export const STORAGE_KEY_PREFERRED_WALLET = "bundler-preferred-wallet";

// Wallet types
export enum WalletType {
    Solana = "SOLANA",
    Ethereum = "ETHEREUM"
}

// Auth client types
export enum AuthClient {
    Email = "EMAIL",
    Google = "GOOGLE",
    Wallet = "WALLET"
} 