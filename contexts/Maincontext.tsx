// contexts/MyContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define types for context values
interface MyContextProps {
    isProfilesActive: boolean;
    setisProfilesActive: (value: boolean) => void;
    DeployerWallets: any;
    setDeployerWallets: (value: any) => void;
    activeWallet: any;
    setActiveWallet: (value: any) => void;
}

// Create the context
const MyContext = createContext<MyContextProps | undefined>(undefined);



// Create a provider component
export const MyContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isProfilesActive, setisProfilesActive] = useState(false);
    const [DeployerWallets, setDeployerWallets] = useState([]);
    const [activeWallet, setActiveWallet] = useState(DeployerWallets.length > 0 ? DeployerWallets[0] : null);

    useEffect(() => {
        let wallets = localStorage.getItem("deployerwallets")
        setDeployerWallets(wallets ? JSON.parse(wallets) : []);
        wallets ? setActiveWallet(JSON.parse(wallets)[0]) : null;
    }, []);
    return (
        <MyContext.Provider value={{ isProfilesActive, setisProfilesActive, DeployerWallets, setDeployerWallets, activeWallet, setActiveWallet }}>
            {children}
        </MyContext.Provider>
    );
};

// Custom hook for using MyContext
export const useMyContext = () => {
    const context = useContext(MyContext);
    if (!context) {
        throw new Error('useMyContext must be used within a MyContextProvider');
    }
    return context;
};
