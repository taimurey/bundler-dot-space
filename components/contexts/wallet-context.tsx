"use client"
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define types for context values
interface WalletProfileContextProps {
    isProfilesActive: boolean;
    setisProfilesActive: (value: boolean) => void;
    DeployerWallets: any;
    setDeployerWallets: (value: any) => void;
    activeWallet: any;
    setActiveWallet: (value: any) => void;
}

// Create the context
const WalletProfileContextProps = createContext<WalletProfileContextProps | undefined>(undefined);



// Create a provider component
export const WalletProfileContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isProfilesActive, setisProfilesActive] = useState(false);
    const [DeployerWallets, setDeployerWallets] = useState([]);
    const [activeWallet, setActiveWallet] = useState(DeployerWallets.length > 0 ? DeployerWallets[0] : null);

    useEffect(() => {
        let wallets = localStorage.getItem("deployerwallets")
        setDeployerWallets(wallets ? JSON.parse(wallets) : []);
        wallets ? setActiveWallet(JSON.parse(wallets)[0]) : null;
    }, []);
    return (
        <WalletProfileContextProps.Provider value={{ isProfilesActive, setisProfilesActive, DeployerWallets, setDeployerWallets, activeWallet, setActiveWallet }}>
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
