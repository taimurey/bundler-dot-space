"use client"
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import bs58 from 'bs58';

// Define types for context values
interface WalletProfileContextProps {
    isProfilesActive: boolean;
    setisProfilesActive: (value: boolean) => void;
    DeployerWallets: any[];
    setDeployerWallets: (value: any[]) => void;
    activeWallet: any;
    setActiveWallet: (value: any) => void;
    saveWallet: (walletData: any) => void;
}

// Create the context
const WalletProfileContextProps = createContext<WalletProfileContextProps | undefined>(undefined);

// Create a provider component
export const WalletProfileContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isProfilesActive, setisProfilesActive] = useState(false);
    const [DeployerWallets, setDeployerWallets] = useState<any[]>([]);
    const [activeWallet, setActiveWallet] = useState<any>(null);

    useEffect(() => {
        try {
            const walletsStr = localStorage.getItem("deployerwallets");
            const wallets = walletsStr ? JSON.parse(walletsStr) : [];
            setDeployerWallets(wallets);
            setActiveWallet(wallets.length > 0 ? wallets[0] : null);
        } catch (error) {
            console.error("Error loading wallets:", error);
            setDeployerWallets([]);
        }
    }, []);

    // Function to save wallet data in bs58 format
    const saveWallet = (walletData: any) => {
        try {
            if (!walletData || !walletData.secretKey) {
                throw new Error("Invalid wallet data");
            }

            // Convert secretKey to bs58 if not already
            let bs58Key;
            if (typeof walletData.secretKey === 'string') {
                bs58Key = walletData.secretKey;
            } else if (walletData.secretKey instanceof Uint8Array) {
                bs58Key = bs58.encode(walletData.secretKey);
            } else {
                throw new Error("Unsupported secretKey format");
            }

            const walletToSave = {
                ...walletData,
                secretKey: bs58Key
            };

            const updatedWallets = [...DeployerWallets, walletToSave];
            setDeployerWallets(updatedWallets);
            localStorage.setItem("deployerwallets", JSON.stringify(updatedWallets));

            // Set as active if it's the first wallet
            if (DeployerWallets.length === 0) {
                setActiveWallet(walletToSave);
            }
        } catch (error) {
            console.error("Error saving wallet:", error);
        }
    };

    return (
        <WalletProfileContextProps.Provider value={{
            isProfilesActive,
            setisProfilesActive,
            DeployerWallets,
            setDeployerWallets,
            activeWallet,
            setActiveWallet,
            saveWallet
        }}>
            {children}
        </WalletProfileContextProps.Provider>
    );
};

// Custom hook for using MyContext
export const WalletProfileContext = () => {
    const context = useContext(WalletProfileContextProps);
    if (!context) {
        throw new Error('WalletProfileContext must be used within a WalletProfileContextProvider');
    }
    return context;
};
