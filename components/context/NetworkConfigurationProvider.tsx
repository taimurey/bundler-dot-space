"use client"
import { createContext, useContext, ReactNode, useState } from 'react';

export interface NetworkConfigurationContextState {
    networkConfiguration: string;
    setNetworkConfiguration: (networkConfiguration: string) => void;
}

const NetworkConfigurationContext = createContext<NetworkConfigurationContextState>({} as NetworkConfigurationContextState);

export function useNetworkConfiguration(): NetworkConfigurationContextState {
    return useContext(NetworkConfigurationContext);
}

export const NetworkConfigurationProvider = ({ children }: { children: ReactNode }) => {
    const [networkConfiguration, setNetworkConfiguration] = useState<string>('mainnet-beta');

    return (
        <NetworkConfigurationContext.Provider value={{ networkConfiguration, setNetworkConfiguration }}>
            {children}
        </NetworkConfigurationContext.Provider>
    );
}; 